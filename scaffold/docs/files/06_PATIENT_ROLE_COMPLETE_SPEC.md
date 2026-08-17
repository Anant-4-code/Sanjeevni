# Sanjeevani — Patient Role: Complete Specification
### PRD · TRD · Architecture · Database · Cross-Role Data Flow · UI Spec

**Version:** 1.0 | **Scope:** `/patient` PWA only (all other portals treated as upstream/downstream systems)

---

# PART 1 — PRODUCT REQUIREMENTS (PRD)

## 1.1 Purpose

The Patient Portal is the only Sanjeevani surface a non-medical person touches directly. Its job: take a verified clinical protocol — written by a doctor, checked by AI, safety-locked by pharmacology guardrails — and turn it into something a patient can **understand, trust, and actually follow**, in their own language, on a phone they already own, with zero app-store friction.

Everything the patient sees here is **read-only relative to clinical truth** (they cannot edit a prescription) but **fully interactive relative to their own behavior** (they can log doses, ask questions, scan OTC drugs, share records).

## 1.2 Target Users

| Sub-persona | Characteristics | Design implication |
|---|---|---|
| Elderly / low-literacy patient | May not read complex drug names, may prefer speech | Audio playback, big touch targets, icon-first UI |
| Chronic/polypharmacy patient | 4–10+ daily medications, multiple doctors | Condition-tagging, merged timeline is critical |
| Tech-savvy younger patient/caregiver | Manages an elderly relative's care remotely | Records vault, QR sharing, copilot chat |
| First-time/acute patient | Single short-course prescription (e.g. antibiotics) | Simple checklist, no clutter |

## 1.3 Jobs to Be Done

1. "Tell me what to take, when, and why — without me having to decode a doctor's handwriting."
2. "Warn me before I accidentally hurt myself with a new pill or an OTC drug."
3. "Let me prove what I'm on, instantly, to any new doctor — without me remembering names."
4. "Let me ask a quick question at 11pm without calling the clinic."
5. "Work even when my signal is bad."

## 1.4 Feature List (Patient Portal)

| ID | Feature | Priority | Depends on other role |
|---|---|---|---|
| PT-1 | Zero-install PWA shell + install prompt | P0 | — |
| PT-2 | Phone OTP login (no password) | P0 | Reception (creates the underlying patient record) |
| PT-3 | Unified, condition-tagged Daily Dosing Timeline | P0 | Doctor (verified prescriptions) |
| PT-4 | Dose toggle + Adherence Score ring | P0 | — (writes back to `intake_logs`) |
| PT-5 | OCR Evidence Viewer (tap medicine → zoom into doctor's handwriting) | P1 | Doctor/Reception (OCR + bounding box data) |
| PT-6 | Sanjivini AI Copilot (RAG chat, no-diagnose guardrail) | P1 | Doctor (verified med list as context) |
| PT-7 | OTC Safety Scanner (camera → interaction check) | P1 | Doctor (active prescriptions), Pharmacy (drug DB) |
| PT-8 | Universal Health Passport (QR sharing) | P1 | Any future doctor (scans the QR) |
| PT-9 | Regional Audio Care Engine (TTS) | P1 | — |
| PT-10 | Digital Records Vault (client-side PDF export) | P2 | Doctor, Lab (source records) |
| PT-11 | Lab Result plain-language view | P1 | Lab (translated summary) |
| PT-12 | Notifications (WhatsApp/SMS deep link) | P0 | Doctor (triggers on sign-off) |
| PT-13 | Offline mode (Service Worker cache + sync) | P1 | — |
| PT-14 | Multi-doctor / multi-condition profile view | P0 | All prescribing doctors |

## 1.5 Explicit Non-Goals for Patient Role

- Patient can **never** edit a medication, dosage, or frequency — only mark it "taken."
- Copilot can **never** diagnose a new symptom or suggest a new drug.
- Patient cannot see another patient's data, even family members, without a formal caregiver-linking feature (not in v1).
- No payment/billing functionality in the patient portal in v1.

## 1.6 Success Metrics (Patient-specific)

- % of patients who install the PWA (Add to Home Screen) within 24h of first SMS link.
- 30/60/90-day adherence score trend.
- Copilot guardrail trigger rate vs. total questions (signal for how often patients try to get diagnoses — should decline over time as trust in "ask your doctor" flow builds).
- OTC scanner usage → warnings surfaced → averted interactions (proxy safety metric).
- QR Health Passport scans by receiving doctors (proxy for cross-doctor safety value delivered).

---

# PART 2 — TECHNICAL REQUIREMENTS (TRD)

## 2.1 Platform & Delivery

- **Framework:** Next.js 14 (App Router), deployed as a PWA — `manifest.json` + `sw.js` service worker.
- **Distribution:** No app store. Patient receives a Twilio/WhatsApp deep link (`https://app.sanjeevani.health/dashboard?token=...`) after a doctor's sign-off. Tapping it authenticates via a short-lived magic-link/OTP flow, then prompts "Add to Home Screen."
- **Styling:** TailwindCSS with the shared design tokens (`05_DESIGN_SYSTEM.md`), light theme (`--bg:#F7F5F0`) as default for patient-facing surfaces.
- **State:** Local React state + `useSWR`/`TanStack Query` for server cache; **no browser localStorage/sessionStorage** for PHI — Service Worker Cache API only, per Sanjeevani's data-handling rules, and even that is limited to the current schedule payload, not full medical history.

## 2.2 Auth (Patient-Specific)

- **Identity provider:** Supabase Auth, phone-based OTP (no passwords for patients — this population skews toward low password-hygiene and forgotten credentials).
- **Session:** Supabase issues a JWT; stored in an httpOnly cookie set by a Next.js route handler (not exposed to client JS) to reduce XSS/token-theft risk.
- **First-time activation flow:**
  1. Reception creates `patients` row (no `portal_user_id` yet) at intake.
  2. On doctor sign-off, backend sends WhatsApp/SMS with a magic link containing a signed, single-use activation token tied to `patient_id`.
  3. Patient taps link → enters phone number → OTP sent → Supabase creates an `auth.users` row → backend links `patients.portal_user_id = auth.uid()`.
  4. All subsequent logins are pure OTP against the now-linked account.

## 2.3 Data Access Pattern

The Patient app talks to the backend in **two ways**, chosen per endpoint:

| Path | Used for | Why |
|---|---|---|
| **Direct Supabase client (RLS-protected)** | Reading own `patients`, `prescriptions`, `intake_logs`, `copilot_messages`, `scans` rows | Fast, no extra hop, RLS guarantees `portal_user_id = auth.uid()` scoping (see `supabase/schema.sql`) |
| **FastAPI backend (service-role, business logic)** | Adherence score calculation, guardrail-aware copilot answers, OTC scan CV, QR token issuance, PDF data assembly | These require server-side AI inference, cross-table aggregation, or logic that must never be spoofable from the client |

Rule of thumb: **plain reads → Supabase directly; anything computed, AI-touched, or security-sensitive → FastAPI.**

## 2.4 Realtime Requirements

- Patient app subscribes to a Supabase Realtime channel on `intake_logs` (own rows) and `prescriptions` (own rows) so that:
  - A new doctor sign-off appears in the timeline without a manual refresh.
  - A dose toggle made on one device (e.g. caregiver's phone) reflects instantly on the patient's own device.
- No WebSocket to FastAPI needed for the patient app specifically — Supabase Realtime (Postgres logical replication under the hood) covers this more cheaply than a custom WS hub.

## 2.5 Offline Requirements

- Service Worker caches: app shell, current day's schedule payload, last-fetched adherence score.
- Dose toggles made offline are queued in IndexedDB (via Workbox `BackgroundSync` or a hand-rolled queue) and flushed to `PATCH /api/intake/toggle` on reconnect.
- Copilot, OTC scanner, and QR generation require connectivity and show a clear "Needs internet" state offline — these are not safe to fake locally since they depend on live AI inference and fresh data.

## 2.6 Performance Targets

| Interaction | Target |
|---|---|
| Cold load (first paint, cached shell) | < 1.5s on 3G-equivalent |
| Dose toggle → UI feedback | Instant (optimistic UI), server confirm < 800ms |
| Copilot answer | < 3s p95 (local LLM) / < 5s p95 (API fallback) |
| OTC scan → verdict | < 4s (CV extraction + RAG check) |
| QR generation | < 1s |

## 2.7 Security & Privacy (Patient-Specific)

- QR Health Passport token: JWT, `exp` = 5 minutes, single-use (backend marks it consumed on first `/api/passport/{token}` read), scoped to read-only consolidated view — never contains a reusable credential.
- Copilot conversation history (`copilot_messages`) is stored per-patient, RLS-protected, and excluded from any analytics export without explicit consent.
- All PHI-bearing AI calls (copilot, OCR evidence, OTC scan) prefer the **local BioMistral/Ollama route**; the OpenRouter fallback is only used for non-PHI or after a signed data processing agreement.
- No third-party analytics SDK gets patient-identifiable data — only anonymized/aggregated usage metrics.

---

# PART 3 — ARCHITECTURE (Patient Portal in Context)

## 3.1 Component Diagram

```
                         ┌───────────────────────────────────────────┐
                         │        PATIENT PWA (Next.js, patient's     │
                         │              own phone browser)             │
                         │                                             │
                         │  Landing → OTP Login → Dashboard            │
                         │    ├─ Dosing Timeline + Adherence Ring      │
                         │    ├─ OCR Evidence Viewer                   │
                         │    ├─ Sanjivini Copilot (chat)              │
                         │    ├─ OTC Safety Scanner (camera)           │
                         │    ├─ Health Passport (QR generator)        │
                         │    ├─ Records Vault (client-side PDF)       │
                         │    └─ Lab Results (plain-language)          │
                         └───────────────┬─────────────┬───────────────┘
                                          │             │
                     Direct Supabase     │             │  FastAPI (business logic + AI)
                  (RLS-scoped reads)     │             │
                                          ▼             ▼
                         ┌──────────────────┐   ┌─────────────────────────┐
                         │   SUPABASE        │   │      FASTAPI CORE        │
                         │  - Postgres        │   │  /api/patient/*          │
                         │  - Auth (OTP)      │   │  /api/intake/toggle      │
                         │  - Storage (scans) │   │  /api/patient/copilot    │
                         │  - Realtime        │   │  /api/patient/otc-scan   │
                         │                    │   │  /api/patient/health-    │
                         │                    │   │      passport            │
                         └────────┬───────────┘   └───────────┬─────────────┘
                                  │                            │
                                  │            ┌───────────────┴───────────────┐
                                  │            │        AI INFERENCE LAYER      │
                                  │            │  ChromaDB + BioMistral (RAG)   │
                                  │            │  CV model (OTC label reading)  │
                                  │            └────────────────────────────────┘
                                  │
              ┌───────────────────┴────────────────────────────────────┐
              │      UPSTREAM WRITERS (other roles, not the patient)     │
              │  Reception → patients, chief_complaints                  │
              │  Doctor    → prescriptions, prescription_items,          │
              │              verification_logs, scans (xray/OCR)         │
              │  Pharmacy  → pharmacy_dispense_log                       │
              │  Lab       → diagnostic_orders, lab_results               │
              └────────────────────────────────────────────────────────┘
```

## 3.2 Why This Split (Design Rationale)

- **Supabase direct reads** keep the patient app fast and cheap for the 90% case (just show me my schedule) — no need to round-trip through FastAPI for a plain `SELECT`.
- **FastAPI owns anything AI or safety-critical** because: (a) local LLM/CV inference needs a Python runtime, not the edge; (b) the guardrail logic (no-diagnose fallback, adherence math, QR token minting) must be server-controlled so a modified client can't bypass it.
- **Supabase Realtime** replaces a custom WebSocket layer for the patient app specifically — it's the cheapest way to get "your dashboard updates the moment a doctor signs off" without maintaining a bespoke pub/sub hub just for this one surface.

---

# PART 4 — DATABASE (Patient-Relevant Tables & Access)

Reusing tables from `03_DATABASE_SCHEMA.md` / `supabase/schema.sql`, annotated for patient access.

| Table | Patient can... | RLS policy shape |
|---|---|---|
| `patients` | Read own row only | `portal_user_id = auth.uid()` |
| `prescriptions` | Read own, `status IN ('verified','dispensed')` only — never `draft` | `patient_id IN (SELECT id FROM patients WHERE portal_user_id = auth.uid())` |
| `prescription_items` | Read own, joined via `prescriptions.patient_id` | same pattern, via join |
| `intake_logs` | Read + **insert/update own** (toggle taken/not-taken) | full CRUD scoped to own `patient_id` |
| `scans` | Read own (for OCR evidence viewer, X-ray view if relevant) | `patient_id` scoped |
| `copilot_messages` | Read + write own conversation | `patient_id` scoped |
| `diagnostic_orders` / `lab_results` | Read own | `patient_id` scoped |
| `verification_logs` | **No direct access** (append-only, backend-only) | `select using (false)` for clients |
| `medications` | Read (reference/lookup table, not patient-specific) | public read, no PII |

### Patient-facing aggregate view (recommended addition)

To avoid the client stitching multiple joins itself, add a Postgres view:

```sql
create view patient_dosing_timeline as
select
  pi.id as prescription_item_id,
  p.patient_id,
  pi.condition_tag,
  m.name as medicine_name,
  pi.dosage,
  pi.frequency,
  d.full_name as doctor_name,
  p.status
from prescription_items pi
join prescriptions p on p.id = pi.prescription_id
join medications m on m.id = pi.medication_id
join app_users d on d.id = p.doctor_id
where p.status in ('verified', 'dispensed');
```
The patient app (or FastAPI's `/timeline` endpoint) queries this view, then cross-references `intake_logs` for today's taken/not-taken state and computes the adherence percentage.

### Adherence Score Query (used by FastAPI `/api/patient/{id}/timeline`)

```sql
select
  count(*) filter (where taken) as doses_taken,
  count(*) as doses_scheduled
from intake_logs
where patient_id = :patient_id
  and scheduled_at <= now();
-- adherence = doses_taken / doses_scheduled * 100
```

---

# PART 5 — CROSS-ROLE DATA FLOW (Patient's View of the Ecosystem)

This section traces exactly what triggers what, from the patient's perspective — i.e., **what does another role do that changes what the patient sees.**

## 5.1 Flow: Reception → Patient (Account Creation)

```
Receptionist registers patient (name, phone, complaint)
        │
        ▼
patients row created (portal_user_id = NULL)
        │
        ▼
Patient portal: NOT YET ACCESSIBLE (no auth link yet)
```
The patient has no visibility into the system until a doctor actually verifies something — this is intentional: nothing gets sent to the patient until there's a real, signed-off care plan to show them.

## 5.2 Flow: Doctor → Patient (The Core Trigger)

```
Doctor reviews OCR / X-ray, edits medication list,
guardrail-check passes, clicks "Verify & Activate"
        │
        ▼
POST /api/doctor/verify
        │
        ├──► prescriptions.status = 'verified'
        ├──► verification_logs row (immutable, hashed, timestamped)
        │
        ├──► Twilio/WhatsApp dispatch: "Your protocol from Dr. Rai is ready. Tap here."
        │         │
        │         ▼
        │    Patient taps link → OTP login → portal_user_id linked
        │         │
        │         ▼
        │    Patient Dashboard now shows:
        │      - New medicine(s) added to Dosing Timeline, tagged with condition + doctor name
        │      - If this doctor also ordered labs → will appear once Lab role completes them
        │      - If OCR evidence exists → tappable to view the doctor's original handwriting crop
        │
        └──► pharmacy_queue insert (parallel branch, not patient-visible directly,
              but affects PT-indirectly: patient later sees "Ready for pickup" status
              once Pharmacy marks dispensed = true)
```

**Patient-visible effect of a second doctor prescribing later (polypharmacy case):**
```
Doctor B (different specialty) verifies a NEW prescription for the SAME patient
        │
        ▼
Guardrail check ran against Doctor A's active meds during Doctor B's review
(this already happened server-side, invisible to patient, BEFORE sign-off was allowed)
        │
        ▼
Patient's Dosing Timeline auto-merges Doctor B's medicine into the SAME daily schedule,
condition-tagged separately: e.g.
  08:00 AM — Metformin 500mg [DIABETES] (Dr. Patel)
  08:00 AM — Noveron 500mg [HEART CARE] (Dr. Sharma)
No manual action needed from the patient — the merge is automatic via the
patient_dosing_timeline view keyed on patient_id, not per-doctor.
```

## 5.3 Flow: Pharmacy → Patient

```
Pharmacist clicks "Dispensed" on a verified prescription
        │
        ▼
pharmacy_dispense_log.dispensed = true
        │
        ▼
prescriptions.status = 'dispensed' (optional status bump)
        │
        ▼
Patient dashboard: dosing item's implicit "ready" state updates
(no blocking effect on the timeline itself — the patient could technically
 start a dose-tracking cycle even before physically collecting the medicine,
 since the clinical clock starts at doctor sign-off, not pickup)
```
If a `severe` interaction flag was raised and acknowledged during doctor review, the pharmacist's screen shows a safety-lock badge — **this is not surfaced to the patient directly** (avoids alarming them post-hoc about something the doctor already reviewed and accepted); it remains a clinician-facing signal only.

## 5.4 Flow: Lab → Patient

```
Doctor orders a test during consult → diagnostic_orders row (status: pending_draw)
        │
        ▼
Lab technician moves Kanban card: pending_draw → analyzing → results_ready
        │
        ▼
Lab tech enters raw values → LLM generates 2-sentence plain-language summary
        │
        ▼
lab_results row: { raw_values_json (doctor-only), patient_summary_text (patient-visible) }
        │
        ▼
Patient portal: new card appears under "Lab Results" —
shows ONLY patient_summary_text, never raw clinical values,
with explicit non-diagnostic framing ("this is not a diagnosis — discuss with your doctor")
```

## 5.5 Flow: Patient → Copilot (Self-Contained, but Context-Pulled from Doctor Data)

```
Patient asks Sanjivini: "Can I drink milk with my morning pill?"
        │
        ▼
POST /api/patient/copilot { patient_id, question }
        │
        ▼
FastAPI pulls patient's CURRENT verified prescriptions (read from `prescriptions`
+ `prescription_items`, same tables Doctor writes to) as hidden system context
        │
        ▼
ChromaDB similarity search against pharmacological guideline vectors
        │
        ▼
LLM answers strictly from that context + explicit no-diagnose system prompt
        │
        ▼
copilot_messages row saved (both user question + assistant answer),
flagged_diagnostic_attempt = true if the guardrail fallback fired
```
This is the one flow where the patient is "pulling" from doctor-owned data live, rather than a doctor "pushing" an update — important because it means the copilot is always as current as the doctor's last sign-off, with no caching lag.

## 5.6 Flow: Patient → Any New Doctor (Health Passport, Patient-Initiated)

```
Patient taps "Share My Records" → POST /api/patient/health-passport
        │
        ▼
Backend mints a signed, single-use JWT (5 min expiry) scoped to
a read-only consolidated view of: active prescriptions across ALL doctors,
existing conditions, recent lab summaries
        │
        ▼
QR code rendered on patient's screen
        │
        ▼
NEW doctor (Doctor C, who has never seen this patient before) scans it
        │
        ▼
GET /api/passport/{qr_token} → returns consolidated record →
token is marked consumed → Doctor C's own guardrail-check for any NEW
prescription they write will now correctly include what they just saw,
same as if it came through the normal cross-doctor query
```
This is the one flow where the **patient is the active data broker** — everywhere else, data flows to them; here, they choose to push it outward.

## 5.7 Full Round-Trip Sequence Diagram (Text Form)

```
Reception          Doctor A         Doctor B        Pharmacy        Lab           Patient
   │                   │                │              │             │              │
   │ register patient  │                │              │             │              │
   ├──────────────────►│                │              │             │              │
   │                   │ review + sign  │              │             │              │
   │                   ├────────────────┼──────────────┼─────────────┼─────────────►│ (WhatsApp link)
   │                   │                │              │             │              │ activates account
   │                   │                │              │             │              │ sees Rx #1 on timeline
   │                   │                │ new complaint│             │              │
   │                   │                │ (same patient)              │              │
   │                   │                │ guardrail-check pulls Rx#1  │              │
   │                   │                │ sign off Rx#2│              │             ►│ Rx#2 merges into
   │                   │                │              │             │              │ SAME timeline, tagged
   │                   │                │              │ dispense Rx#1              │
   │                   │                │              ├─────────────┼─────────────►│ (status updates,
   │                   │                │              │             │              │  no patient action)
   │                   │                │              │             │ result ready │
   │                   │                │              │             ├─────────────►│ plain-language
   │                   │                │              │             │              │ lab card appears
   │                   │                │              │             │              │ patient asks copilot
   │                   │                │              │             │              │ (pulls Rx#1+#2 live)
   │                   │                │              │             │              │ patient shares QR
   │                   │                │              │             │              │ → new Doctor C scans
```

---

# PART 6 — UI SPECIFICATION (Patient Portal)

Design tokens and motifs per `05_DESIGN_SYSTEM.md` — light theme, warm off-white background, brutalist-editorial type, thin hairline borders, no drop shadows, `rounded-full` reserved for buttons/toggles only.

## 6.1 Screen Inventory

| Screen | Route | Primary Component |
|---|---|---|
| Landing / Marketing | `/` | Hero + role cards (already built) |
| OTP Login | `/login` | Phone input → OTP input, two-step |
| Dashboard (Home) | `/dashboard` | Dosing Timeline + Adherence Ring |
| Medicine Detail / OCR Evidence | `/dashboard/medicine/[id]` | Modal or full-screen zoom-pan viewer |
| Sanjivini Copilot | `/copilot` | Chat interface, floating-icon entry point |
| OTC Scanner | `/scan-otc` | Camera capture → verdict screen |
| Health Passport | `/passport` | QR code full-screen display, auto-refresh countdown |
| Records Vault | `/records` | List + "Export PDF" |
| Lab Results | `/labs` | Card list, plain-language only |
| Settings | `/settings` | Language preference, notification toggle, logout |

## 6.2 Screen: Dashboard (Home) — Detailed Spec

**Layout (mobile-first, max-w-lg centered even on desktop browsers):**

```
┌─────────────────────────────────────┐
│  TODAY                    [92%] ◐    │  ← eyebrow label + adherence ring, top-right
│  Your Dosing Schedule                │  ← font-display text-2xl font-bold
├─────────────────────────────────────┤
│  08:00 AM                            │
│  ┌─────────────────────────────────┐ │
│  │ Noveron 500mg [HEART CARE]      │ │  ← condition tag, uppercase, muted
│  │ Dr. Sharma                       │ │
│  │                    (▶)  [Taken]  │ │  ← audio icon + toggle button, right-aligned
│  └─────────────────────────────────┘ │
│  ┌─────────────────────────────────┐ │
│  │ Metformin 500mg [DIABETES]      │ │
│  │ Dr. Patel                        │ │
│  │                    (▶)  [Mark]   │ │
│  └─────────────────────────────────┘ │
│  02:00 PM                            │
│  ┌─────────────────────────────────┐ │
│  │ Cough Syrup 10ml [GENERAL]      │ │
│  │ Dr. Khan                         │ │
│  │                    (▶)  [Mark]   │ │
│  └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ [Copilot] [OTC Scan] [Passport] [PDF]│  ← bottom quick-action row, icon + label
└─────────────────────────────────────┘
```

- **Taken state:** button fills solid (`bg-[--fg] text-[--bg]`), label changes to "Taken", tap again to undo (some patients mis-tap).
- **Time grouping:** items grouped by `time` with a small uppercase label header, matching the reference screenshot's condition-tag pattern exactly (`08:00 AM — Metformin 500mg [DIABETES] (Dr. Patel)`).
- **Empty state:** if no verified prescriptions yet, show a calm message: "No active prescriptions yet. Once your doctor signs off, it'll appear here automatically" — never a broken/empty-looking screen.
- **Realtime:** new items fade in (150ms opacity transition) when a Supabase Realtime event fires for a newly verified prescription — no manual refresh needed.

## 6.3 Screen: OCR Evidence Viewer

**Interaction:** Tap any medicine card → modal opens.

```
┌─────────────────────────────────────┐
│  STATUS: CLINICALLY VERIFIED         │  ← stark badge, uppercase, bordered
│  DR. RAI                             │
├─────────────────────────────────────┤
│                                       │
│      [raw scanned prescription        │
│       image, zoomed + panned to       │
│       the exact bounding box for      │
│       "Noveron" via CSS transform]    │
│                                       │
├─────────────────────────────────────┤
│  Noveron 500mg — 1-0-1 — 10 days     │  ← structured, doctor-verified text below
│  [Close]                             │
└─────────────────────────────────────┘
```
- Animation: `transform: translate()/scale()` over 300–400ms ease-out (the one exception to the app's otherwise minimal motion, per design system §9), zooming precisely into `ocr_bounding_box` coordinates stored in `prescription_items`.

## 6.4 Screen: Sanjivini Copilot

```
┌─────────────────────────────────────┐
│  Sanjivini                     [✕]   │
├─────────────────────────────────────┤
│                                       │
│  You: Can I drink milk with my       │
│       morning pill?                  │
│                                       │
│  Sanjivini: Because you're taking    │
│  Getx 20mg, avoid dairy for 2 hours  │
│  before/after your dose — calcium    │
│  can stop it from working.           │
│                                       │
│  You: My chest hurts, is it the pill?│
│                                       │
│  Sanjivini: I can't diagnose new     │
│  symptoms. Please contact Dr. Rai    │
│  immediately or visit the ER if      │
│  this feels urgent.                  │
│                                       │
├─────────────────────────────────────┤
│  [Type a question...]        [Send]  │
└─────────────────────────────────────┘
```
- The refusal message is **visually identical in styling** to a normal answer (no alarming red banner) — calm, clear, consistent tone, but it always includes a concrete next action (contact doctor / ER).
- A persistent small-print line under the input: "Sanjivini answers based on your verified prescriptions only and does not diagnose."

## 6.5 Screen: OTC Safety Scanner

```
┌─────────────────────────────────────┐
│  Check New Medicine                  │
├─────────────────────────────────────┤
│         [camera viewfinder]          │
│                                       │
│         [ Capture ]                  │
└─────────────────────────────────────┘

        ↓ after capture

┌─────────────────────────────────────┐
│                                       │
│           [ WARNING ]                │  ← red, full-width, high-contrast
│                                       │
│  This cold medicine contains a       │
│  decongestant that may interact      │
│  with your blood pressure medication │
│  prescribed by Dr. Rai.              │
│                                       │
│  [Scan Another]  [Ask Sanjivini]     │
└─────────────────────────────────────┘
```
Verdict states: `[ SAFE ]` in `--safe` green, `[ WARNING ]` in `--warn` red — always full-width badge, never subtle, since this is the single highest-stakes screen in the patient app.

## 6.6 Screen: Health Passport (QR)

```
┌─────────────────────────────────────┐
│  Universal Health Passport           │
├─────────────────────────────────────┤
│                                       │
│         [ QR CODE, large,             │
│           centered, high-contrast ]   │
│                                       │
│  Expires in 04:32                    │  ← live countdown, regenerates on expiry
│                                       │
│  Show this to any doctor to share    │
│  your active prescriptions,          │
│  conditions, and recent labs.        │
└─────────────────────────────────────┘
```

## 6.7 Component-Level Notes (extending `05_DESIGN_SYSTEM.md`)

- **Adherence Ring:** SVG stroke-only circle, no fill — matches the "no gradients, no decorative shadows" rule. Color shifts subtly: black stroke ≥80%, amber 50–79%, red <50% (functional color use, not decorative).
- **Toggle button:** `rounded-none` rectangular button, not an iOS-style pill switch — consistent with the brutalist "everything sharp except primary CTAs" rule.
- **Bottom quick-action row:** icon-first (Lucide icons), label beneath, equal-width flex items, `border-t` separator, sticky to viewport bottom for one-thumb reachability.
- **Language switcher:** lives in Settings, not the main nav — changing it updates `app_users.language_pref`, which drives both UI copy (i18n) and the default TTS voice/language in the Audio Care Engine.

## 6.8 Accessibility Requirements

- Minimum tap target: 44×44px on all interactive elements (dose toggle, audio play button, nav icons).
- All icon-only buttons carry `aria-label`.
- Color is never the sole signal for SAFE/WARNING or severity — always paired with text/icon.
- TTS (`window.speechSynthesis`) respects `app_users.language_pref` and falls back gracefully to English if the requested voice isn't available on-device, with a visible (not silent) fallback notice.
