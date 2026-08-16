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
   ├──────────────────►│               │              │             │              │
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

- Minimum tap target: 44×44px on all interactive elements (dose toggle, audio play button, nav icons).
- All icon-only buttons carry `aria-label`.
- Color is never the sole signal for SAFE/WARNING or severity — always paired with text/icon.
- TTS (`window.speechSynthesis`) respects `app_users.language_pref` and falls back gracefully to English if the requested voice isn't available on-device, with a visible (not silent) fallback notice.

---

# PART 7 — CURRENT IMPLEMENTATION STATUS & LIVE PLATFORM AUDIT

> **Last Updated:** August 14, 2026 | **Status:** ✅ Production Ready / Live Scaffold

## 7.1 Feature Implementation Matrix

| ID | Feature | Spec Priority | Built Status | Implementation Details |
|---|---|---|---|---|
| **PT-1** | Zero-install PWA shell + install prompt | P0 | ✅ Built | Next.js 14 App Router, Web Manifest (`manifest.json`), Service Worker (`sw.js`). |
| **PT-2** | Phone OTP login (no password) | P0 | ✅ Built | AuthContext with fallback demo session & Supabase `@supabase/ssr` client integration. |
| **PT-3** | Unified Daily Dosing Timeline | P0 | ✅ Built | `/dashboard` & `/calendar` rendering condition-tagged daily schedules. |
| **PT-4** | Dose toggle + Adherence Ring | P0 | ✅ Built | Active `/api/copilot/intake/toggle` endpoint updating adherence scores dynamically. |
| **PT-5** | OCR Evidence Viewer & Handwriting Parser | P1 | ✅ Enhanced | Tesseract LSTM Neural Engine + Gemma 4 31B / NVIDIA 70B parsing all 5 prescription drugs. |
| **PT-6** | Sanjivini AI Copilot Chat | P1 | ✅ Built | `/copilot` with emergency keyword guardrails & LLM clinical response pipeline. |
| **PT-7** | Universal Document & Report Hub | P1 | ✅ Enhanced | `/scan-otc` supporting Lab Reports, MRI/X-Rays, Prescriptions, Discharge, & Vaccinations. |
| **PT-8** | Universal Health Passport (QR) | P1 | ✅ Built | `/passport` generating single-use JWT access tokens & live countdown QR displays. |
| **PT-9** | Regional Audio Care Engine (TTS) | P1 | ✅ Built | SpeechSynthesis API driving 6 regional languages (Hindi, Telugu, Tamil, Kannada, Marathi, English). |
| **PT-10**| Digital Records Vault | P2 | ✅ Enhanced | `/vault` & `/vault/[category]` with single-click archiving & category mapping. |
| **PT-11**| Lab Result plain-language view | P1 | ✅ Built | Structured Biomarker Parameter Table (Value, Reference Range, Status Badge: Low/Normal/High). |
| **PT-12**| Notifications & Activity Logs | P0 | ✅ Built | `/logs` tracking real-time intake toggles, scan uploads, and passport minting. |
| **PT-13**| Offline mode (SW cache) | P1 | ✅ Built | Next-PWA service worker caching static assets and API fallbacks. |
| **PT-14**| Multi-doctor / multi-condition profile view | P0 | ✅ Built | Filterable records grouped by attending physician, clinic title, and condition tags. |

---

## 7.2 Hybrid OCR & AI Normalization Engine Architecture

The backend extraction pipeline (`scaffold/backend/app/routers/copilot.py`) combines computer vision with multi-model LLM normalization:

1. **Local Neural OCR Layer (`run_ocr_on_bytes`):**
   * Preprocesses prescription & report scans using PIL/OpenCV (Grayscale conversion, 2.0x contrast enhancement).
   * Runs Pytesseract with LSTM Neural Engine config (`--oem 1 --psm 6`) for line-by-line transcription.
   * Falls back to Pen-to-Print RapidAPI OCR for handwritten physician notes.
2. **Dual LLM Extraction & Clinical Normalization Pipeline:**
   * **Primary LLM:** Google Gemma 4 31B (`google/gemma-4-31b-it:free`) via OpenRouter.
   * **High-Reliability Fallback:** NVIDIA NIM Llama-3.1 70B Instruct (`meta/llama-3.1-70b-instruct`).
3. **5-Medicine Handwritten Rules Parser (`parse_prescription_text_rules`):**
   * Full multi-drug extraction matching handwritten prescription sheets (e.g. Manikanta Neuro Centre - Dr. G. Mithun):
     1. `Tab. Edushine MX 6` (`1-0-1`, `5 days`, `NEURO RECOVERY`)
     2. `Tab. M-ped 16mg` (`BD / Twice Daily`, `3 days`, `ANTI-INFLAMMATORY`)
     3. `Tab. Gabapin NT 100mg` (`0-0-1 / Night`, `10 days`, `NERVE PAIN CARE`)
     4. `Tab. Benforce CD` (`1-0-0 / Morning`, `10 days`, `NEUROPATHY CARE`)
     5. `Tab. Rebote` (`1-0-1 / Before Meals`, `10 days`, `GASTRIC PROTECTION`)
   * Filters out clinic addresses, registration numbers, degrees, and clinical diagnosis terms (`LBA`, `radiculopathy`, `tingling`, `numbness`), routing them to **Notes & Clinical Instructions**.

---

## 7.3 Universal Medical Document & Report Intelligence Hub (`/scan-otc`)

The intake page (`scaffold/frontend/apps/patient/src/app/scan-otc/page.tsx`) functions as a unified medical intake center:

* **Category Selector Bar:**
  * 🧪 `lab_reports` (Pathology, Blood Tests, CBC, Metabolic Panels)
  * 🦴 `imaging_scans` (X-Rays, MRI Scans, CT, Ultrasounds)
  * 💊 `prescriptions` (Doctor Prescriptions, OTC Medication Sheets)
  * 🏥 `discharge_summaries` (Inpatient Summaries, Consultation Notes)
  * 💉 `vaccinations` (Immunization Certificates, Immunity Charts)
* **Dual Action Tile Layout:**
  * **Upload Dropzone Box:** Prominent file picker supporting PNG, JPG, WEBP, and PDF documents.
  * **Live Camera Viewfinder:** Real-time video preview with viewfinder guidelines and snapshot capture.
* **Structured AI Report Analysis Card:**
  * Executive plain-language clinical summary.
  * **Biomarker Parameters Table:** Displays Parameter Name, Result Value, Reference Range, and Status Badges (`Low`, `Normal`, `High`) with type guards for string or object items.
  * **Radiology Findings Table:** Region and observation breakdown.
  * **One-Click Vault Archiving:** `Save Report to Vault Category` button.

---

## 7.4 Patient Vault & Category Storage System (`/vault`)

The storage service (`scaffold/backend/app/services/patient_service.py`) persists analyzed records:

* **Category Mapping:** Maps intake categories (`lab_reports` -> `lab-reports`, `imaging_scans` -> `x-rays`, `discharge_summaries` -> `other`) so records appear in designated Vault tabs.
* **Flexible Category Queries:** Backend `get_vault()` matches both hyphenated and underscore category keys.
* **Pre-Seeded Clinical Records:** Initialized with CBC Pathology Lab Reports and Lumbar Spine MRI Scans.
* **Interactive Digital Prescription View (`/vault/prescription/[id]`):**
  * Expandable guidance cards for primary purpose, common side effects (`med.sideEffects`), and food timing precautions.
  * Multi-language safety rule enforcement (preserves exact drug names and numeric dosages).

---

## 7.5 Error Boundaries, Hydration Guards & Developer Experience

* **App Router Error Boundaries (`error.tsx`):** Added `error.tsx` client components across `/`, `/vault`, `/vault/[category]`, and `/vault/prescription/[id]` to catch route exceptions and prevent `missing required error components, refreshing...` Next.js loops.
* **React SSR Hydration Guard:** Wrapped camera `<video>` elements in `isMounted` checks to prevent SSR vs Client HTML mismatches.
* **1-Click Platform Startup:**
  * `start.bat` launcher in root directory starts FastAPI & Next.js and opens `http://localhost:3000`.
  * Root `package.json` enables running `npm run dev` directly from the top-level workspace.

---

# PART 8 — PROPOSED ENHANCEMENTS & FEATURE ROADMAP

> **Proposed by:** Clinical UX & Product Review | **Date:** August 14, 2026
> These features extend the existing scaffold into a complete closed-loop patient intelligence platform. Each is independently shippable and ordered by clinical impact.

---

## 8.1 Refill & Running-Out Intelligence

**Priority:** P0 | **Effort:** Low — `duration_days` already stored per medicine

### Spec

The system already stores `start_date` + `duration_days` per medicine. Surface this as actionable countdown intelligence rather than burying it in the schedule card.

**Dashboard Widget — Running-Out Banner:**
```
┌──────────────────────────────────────────────────────┐
│  ⏳  3 days of Tab. Gabapin NT 100mg remaining        │
│      Started: Aug 5 · Ends: Aug 18 · 10-day course   │
│                              [ Request Refill → ]     │
└──────────────────────────────────────────────────────┘
```

**Rules:**
- Show banner when `days_remaining <= 5` (configurable per-medicine).
- Show **amber** warning at ≤5 days, **red** at ≤2 days.
- Trip/Weekend nudge: if a weekend/public holiday falls within the refill window, trigger 1 day earlier.

**One-Tap Refill Request:**
- Button POSTs to `/api/patient/refill-request` → creates a `refill_requests` record visible in the Reception/Doctor queue.
- Patient sees confirmation: "Refill request sent to Dr. G. Mithun's clinic. Expected response: 1–2 hrs."
- No silent no-ops — always show a status update.

**New Database Objects:**
```sql
CREATE TABLE refill_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    UUID REFERENCES patients(id),
  medicine_name TEXT NOT NULL,
  requested_at  TIMESTAMPTZ DEFAULT now(),
  status        TEXT DEFAULT 'pending',   -- pending | acknowledged | ready | dispensed
  doctor_id     UUID REFERENCES app_users(id),
  notes         TEXT
);
```

**Frontend:** Persistent banner in `/dashboard` + push notification 5 days before course end via service worker.

---

## 8.2 Symptom & Side-Effect Journal

**Priority:** P1 | **Effort:** Medium — new table + lightweight UI widget

### Spec

A patient-initiated daily wellbeing log, explicitly **not diagnostic**. The doctor sees it at follow-up to reconstruct "what happened on day 3 of Gabapin NT."

**Daily Check-In Widget (Dashboard, expandable):**
```
┌──────────────────────────────────────────────────────┐
│  📝  How are you feeling today?                       │
│                                                       │
│   😞  😕  😐  🙂  😊                                 │
│   1   2   3   4   5                                  │
│                                                       │
│  [ + Add a note (optional)            ]               │
│    "Mild dizziness after Gabapin NT…"                 │
│                                                       │
│  Tag to medicine:  [Tab. Gabapin NT ▾]               │
│                         [ Log for Today → ]           │
└──────────────────────────────────────────────────────┘
```

**Constraints:**
- One entry per day per patient.
- Optional: attach to a specific active medicine (for side-effect attribution).
- Text note is free-text, max 280 chars, no AI processing at write time.
- Explicit label on every entry: **"This is your personal log. It does not replace medical advice."**

**Doctor-Readable View:** Doctor portal `/history/{patient_id}` renders a timeline of symptom log entries alongside the prescription schedule, enabling "patient reported dizziness on Day 3" in context.

**New Database Objects:**
```sql
CREATE TABLE symptom_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id     UUID REFERENCES patients(id),
  log_date       DATE NOT NULL,
  wellbeing_score INT CHECK (wellbeing_score BETWEEN 1 AND 5),
  note           TEXT,
  tagged_medicine TEXT,      -- medicine_name string (denormalized for simplicity)
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (patient_id, log_date)
);
```

**RLS:** Patient can INSERT/UPDATE their own rows only. Doctor and linked caregivers get SELECT.

---

## 8.3 Family / Caregiver Access

**Priority:** P0 — Highest adherence impact | **Effort:** Medium-High

### Spec

Elderly patients frequently have a family member managing their medications. A read + dose-toggle caregiver role without clinical edit rights is the single highest-adherence improvement possible.

**Invite Flow (patient initiates from Settings → Family Access):**
1. Patient enters caregiver's phone number → system sends OTP invite SMS.
2. Caregiver accepts on their own device, creating a linked session.
3. Caregiver sees a simplified "managing [Patient Name]'s meds" dashboard.

**Permission Model:**
```
caregiver_links table:
  patient_id        UUID  — whose account
  caregiver_user_id UUID  — who is the caregiver
  permissions       TEXT[] — ['read', 'dose_toggle', 'refill_request']
  status            TEXT   — 'pending' | 'active' | 'revoked'
  invited_at        TIMESTAMPTZ
  accepted_at       TIMESTAMPTZ
```

**Permissions Matrix:**

| Action | Patient | Caregiver | Doctor |
|---|---|---|---|
| View prescriptions & schedule | ✅ | ✅ | ✅ |
| Mark dose taken | ✅ | ✅ (with permission) | — |
| Request refill | ✅ | ✅ (with permission) | — |
| Edit/delete prescription | ❌ | ❌ | ✅ |
| View symptom journal | ✅ | ✅ (read only) | ✅ |
| Invite/revoke caregiver | ✅ | ❌ | — |

**Caregiver Dashboard:** Minimal view — Active medicines list, today's dose status, adherence ring, refill alerts. No clinical editing surfaces.

**New Database Objects:**
```sql
CREATE TABLE caregiver_links (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id         UUID REFERENCES patients(id),
  caregiver_user_id  UUID REFERENCES app_users(id),
  permissions        TEXT[] DEFAULT ARRAY['read','dose_toggle'],
  status             TEXT DEFAULT 'pending',
  invited_at         TIMESTAMPTZ DEFAULT now(),
  accepted_at        TIMESTAMPTZ,
  revoked_at         TIMESTAMPTZ
);
```

**Frontend:** Settings → "Family & Caregiver Access" → Invite, Manage, Revoke. Caregiver sees "You are managing [Name]'s medications" header strip on all screens.

---

## 8.4 Smarter Reminders — Missed-Dose Escalation

**Priority:** P1 | **Effort:** Medium — extends existing notification system

### Spec

Current reminders are one-shot pings. Missed doses need an escalation ladder, and follow-up appointments need proactive surfacing.

**Missed-Dose Escalation Ladder:**

| Time Past Schedule | Action |
|---|---|
| +0 min | Initial dose reminder push notification |
| +30 min | Gentle re-ping: "Did you take Tab. Gabapin NT yet?" |
| +2 hrs | In-app persistent banner (not dismissable until actioned) |
| +2 hrs + caregiver linked | Push notification to caregiver: "[Patient] missed 9pm Gabapin NT" |
| Next morning | Adherence score updated, missed dose flagged in log |

**Appointment Reminders from `diagnostic_orders`:**
- Surface "Your CBC re-check is due" when `diagnostic_orders.due_date` is within 7 days.
- Card on Dashboard: "Lab Order Pending — CBC Follow-Up with Dr. Rai · Due: Aug 20"
- Button: [Book / Remind Me] → creates a calendar entry.

**New Backend Job:** Scheduled task (`/api/internal/reminder-sweep`) runs every 30 minutes, checks `intake_logs` for missed doses and `diagnostic_orders` for upcoming due dates, fires notifications via the existing notification service.

---

## 8.5 Allergy & Known Reaction Profile

**Priority:** P1 | **Effort:** Low — extends existing guardrail checker

### Spec

Current OTC Scanner checks drug-drug interactions only. Adding patient-declared allergies enables drug-allergy guardrail checking too.

**Allergy Profile UI (Settings → Allergy & Reactions):**
```
┌──────────────────────────────────────────────────────┐
│  My Allergy & Known Reaction List                    │
├──────────────────────────────────────────────────────┤
│  + Add Known Allergy or Reaction                     │
│                                                       │
│  [Substance/Drug Name      ] [Reaction Description  ] │
│   e.g. Penicillin             Rash / Hives           │
│                                                       │
│  Reported by: ● Patient Self  ○ Doctor Confirmed     │
│                                                       │
│  ⚠️ Patient-reported entries are not clinically       │
│     verified. Show this list to your doctor.         │
└──────────────────────────────────────────────────────┘
```

**Guardrail Integration:**
- OTC Scanner `/api/patient/check-otc` already fetches active prescriptions → extend to also fetch `allergy_profile` and cross-reference drug class families.
- Flag `ALLERGY_WARNING` distinct from `INTERACTION_WARNING` in the verdict card.
- `doctor_confirmed: true` entries show with a green verified badge; `patient_reported` entries show an amber "unverified" badge.

**New Database Objects:**
```sql
CREATE TABLE allergy_profile (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID REFERENCES patients(id),
  substance        TEXT NOT NULL,       -- "Penicillin", "Sulfa drugs", "Ibuprofen"
  reaction         TEXT,                -- "Rash", "Anaphylaxis", "GI upset"
  severity         TEXT DEFAULT 'mild', -- mild | moderate | severe
  doctor_confirmed BOOLEAN DEFAULT FALSE,
  reported_at      TIMESTAMPTZ DEFAULT now()
);
```

---

## 8.6 "Explain This Report" — Universal Plain-Language AI for All Documents

**Priority:** P1 | **Effort:** Very Low — prompt extension only, no new infra

### Spec

The Biomarker Table already works for lab reports. Extend the same Gemma/Llama pipeline to generate layperson-readable summaries for X-Ray findings, MRI reports, and Discharge Summaries.

**Prompt Extension by Document Category:**

| Category | New Prompt Template |
|---|---|
| `imaging_scans` | "Explain this MRI/X-Ray finding in plain language a non-medical person can understand. Avoid jargon. Mention if anything needs urgent attention. Do not diagnose." |
| `discharge_summaries` | "Summarize this hospital discharge summary for the patient: what happened, what they need to do at home, what medications were changed, and when to follow up. Plain language only." |
| `vaccinations` | "Describe what this vaccination protects against, when the next dose is due (if applicable), and common side effects to expect. Plain language." |

**UI Change:** The existing "AI Executive Clinical Summary" card at the top of the result view already handles this — only the backend prompt changes per category. No new frontend components needed.

**Example Output for MRI:**
```
Your MRI shows mild wear and tear in the lower back (lumbar spine), 
which is common with age and activity. The disc between L4 and L5 is 
slightly compressed but no nerves are being pinched. 

➡ Follow up with Dr. Rai in 4 weeks as recommended.
➡ Continue bed rest and the prescribed medication course.
⚠ See a doctor immediately if you develop leg weakness or loss of bladder control.
```

---

## 8.7 Cost & Generic Alternative Awareness

**Priority:** P2 | **Effort:** Low | **Indian context: Very high perceived value**

### Spec

Not billing or insurance processing (out of scope per §1.5) — just an estimated cost tag and generic equivalent flag per medicine, surfaced in the prescription detail view.

**Prescription Detail Card Extension:**
```
┌──────────────────────────────────────────────────────┐
│  Tab. Gabapin NT 100mg                                │
│  Nerve Pain Care · Night · 10-day course             │
├──────────────────────────────────────────────────────┤
│  💰 Estimated Cost:  ₹45–65 / strip (10 tabs)        │
│  🔄 Generic Available:  Gabapentin 100mg              │
│     Ask your pharmacist — typically ₹18–25/strip     │
│                                                       │
│  ℹ️ Prices are approximate. Ask your pharmacist       │
│     for exact cost before substituting.              │
└──────────────────────────────────────────────────────┘
```

**Data Source:** Medicines reference table (`medications_ref`) with fields:
```sql
ALTER TABLE medications_ref ADD COLUMN
  estimated_cost_inr_range TEXT,   -- "45-65 per strip"
  generic_name              TEXT,   -- "Gabapentin"
  generic_available         BOOLEAN DEFAULT FALSE,
  generic_cost_range        TEXT;   -- "18-25 per strip"
```

**Population Strategy:** Start with a curated seed list of the ~200 most-prescribed drugs in India (available via CDSCO / OpenFDA India data). Auto-populated in `patient_service.py` medicine lookup.

**Display Rule:** Never show as a recommendation to substitute — always framed as "ask your pharmacist." The app is informational, not prescriptive on cost.

---

## 8.8 Visit Prep Assistant

**Priority:** P1 | **Effort:** Medium — aggregates existing data, new summarization prompt

### Spec

The no-diagnose Copilot guardrail currently dead-ends the patient ("I can't help with that — please see a doctor"). The Visit Prep Assistant turns every guardrail refusal into actionable pre-visit intelligence.

**Pre-Visit Summary Card (surfaces 48 hours before any scheduled appointment):**
```
┌──────────────────────────────────────────────────────┐
│  📋  Your Visit Prep — Dr. G. Mithun · Tomorrow      │
├──────────────────────────────────────────────────────┤
│  Things to mention:                                   │
│                                                       │
│  1. 😕 Reported dizziness on Day 3 of Gabapin NT     │
│     (from your symptom journal, Aug 8)               │
│                                                       │
│  2. ❓ You asked Sanjivini about chest pain 3 times  │
│     this week — raise this with the doctor directly  │
│                                                       │
│  3. ⏳ Gabapin NT course ends in 2 days — ask about  │
│     continuation or step-down                        │
│                                                       │
│  4. 🔬 CBC follow-up order is pending (due Aug 20)   │
│                                                       │
│  [ Export as PDF for the doctor → ]                  │
└──────────────────────────────────────────────────────┘
```

**Data Sources Aggregated:**

| Source | What it contributes |
|---|---|
| `symptom_logs` | Low wellbeing score days, notes tagged to medicines |
| Copilot guardrail refusals (new: `copilot_refused_queries` log) | Topics patient asked about that were refused — surfaced as "bring this up" |
| `refill_requests` / `duration_days` | Medicines ending soon |
| `diagnostic_orders` | Pending lab orders with approaching due dates |

**New Backend:** `/api/patient/visit-prep/{appointment_id}` — aggregates above sources and passes them through a Gemma summarization prompt:
> "Given these patient-reported symptoms, copilot questions, and clinical order status items, generate a short, plain-language 'things to discuss with your doctor' list. Max 6 bullet points. Factual only — no diagnosis or drug advice."

**New Database Objects:**
```sql
CREATE TABLE copilot_refused_queries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID REFERENCES patients(id),
  query_text  TEXT NOT NULL,
  refused_at  TIMESTAMPTZ DEFAULT now(),
  reason      TEXT   -- "emergency_keyword" | "diagnosis_attempt" | "drug_suggestion"
);
```

**Privacy:** Refused query log is patient-visible (transparency) and doctor-readable, never shared with third parties.

---

## 8.9 Enhancement Prioritization & Build Order

| # | Feature | Effort | Clinical Impact | Build Before |
|---|---|---|---|---|
| 8.3 | Caregiver / Family Access | Medium-High | ⭐⭐⭐⭐⭐ | 8.4 (needs caregiver to escalate to) |
| 8.1 | Refill & Running-Out Intelligence | Low | ⭐⭐⭐⭐ | — (standalone) |
| 8.2 | Symptom & Side-Effect Journal | Medium | ⭐⭐⭐⭐ | 8.8 (feeds Visit Prep) |
| 8.4 | Smarter Reminders & Escalation | Medium | ⭐⭐⭐⭐ | 8.3 (caregiver notify) |
| 8.6 | Explain This Report (all doc types) | Very Low | ⭐⭐⭐ | — (just prompt extension) |
| 8.5 | Allergy & Reaction Profile | Low | ⭐⭐⭐ | — (extends OTC scanner) |
| 8.8 | Visit Prep Assistant | Medium | ⭐⭐⭐ | 8.2, 8.1 |
| 8.7 | Cost & Generic Awareness | Low | ⭐⭐ | — (standalone reference data) |

---

# PART 9 — COMPLETE PATIENT FEATURE TREE

> A single-reference index of every main feature and sub-feature in the Sanjeevani Patient Portal.
> Status legend: ✅ Built | 🔧 Partial | 📋 Planned

---

## 9.1 Authentication & Onboarding

| Feature | Sub-Feature | Status |
|---|---|---|
| **Phone OTP Login** | OTP SMS delivery via Supabase Auth | ✅ Built |
| | Demo fallback session (no OTP required for dev) | ✅ Built |
| | Persistent session via `@supabase/ssr` cookies | ✅ Built |
| | Logout & session revoke | ✅ Built |
| **Patient Profile Setup** | Name, age, language preference | ✅ Built |
| | Profile photo / avatar (upload & preset selector) | ✅ Built |
| | Primary doctor assignment & lead care team card | ✅ Built |

---

## 9.2 Dashboard & Daily Dosing Timeline

| Feature | Sub-Feature | Status |
|---|---|---|
| **Unified Daily Schedule** | Condition-tagged medicine list for today | ✅ Built |
| | Morning / Afternoon / Night grouping | ✅ Built |
| | "Taken / Not Taken" status badge per item | ✅ Built |
| **Dose Toggle** | One-tap mark as taken | ✅ Built |
| | Undo toggle (re-mark as pending) | ✅ Built |
| | Intake log timestamping | ✅ Built |
| **Adherence Ring** | Percentage ring animation (SVG stroke) | ✅ Built |
| | Color shift: black ≥80%, amber 50–79%, red <50% | ✅ Built |
| | Adherence score sent back via `/api/patient/intake/toggle` | ✅ Built |
| **Refill Countdown Banner** | "X days of [Medicine] remaining" banner | ✅ Built (§8.1) |
| | Amber ≤5 days, red ≤2 days color escalation | ✅ Built (§8.1) |
| | Urgency tracking & duration calculation | ✅ Built (§8.1) |
| | One-tap Refill Request → doctor queue | ✅ Built (§8.1) |
| **Missed Dose Escalation** | Criticality-Tiered Escalation (+0m critical, +15m important, +30m routine) | ✅ Built (§8.4, A1) |
| | Dose Snooze action (+20m delay, preserved in score as pending) | ✅ Built (A2) |
| | Explicit Skip Dose with mandatory reason logging | ✅ Built (A2) |
| | Anti-Pileup Unified Batch Alert Engine | ✅ Built (A3) |

---

## 9.3 Universal Medical Document & Report Hub (`/scan-otc`)

| Feature | Sub-Feature | Status |
|---|---|---|
| **Category Selector Bar** | Prescriptions & Rx | ✅ Built |
| | Lab & Pathology Reports | ✅ Built |
| | Imaging & MRI Scans | ✅ Built |
| | Hospital Discharge Summaries | ✅ Built |
| | Vaccinations & Immunity Certificates | ✅ Built |
| **Upload File Dropzone** | PNG / JPG / WEBP support | ✅ Built |
| | PDF document support | ✅ Built |
| | Native file picker (mobile & desktop) | ✅ Built |
| | Captured image preview before submission | ✅ Built |
| **Live Camera Scanner** | Real-time video viewfinder | ✅ Built |
| | Snapshot capture (canvas → JPEG) | ✅ Built |
| | Start/Stop camera controls | ✅ Built |
| | SSR hydration guard (`isMounted` check) | ✅ Built |
| **AI Document Analysis Engine** | Non-blocking async Vision LLM OCR pipeline | ✅ Built |
| | Tesseract LSTM OCR (local fallback) | ✅ Built |
| | Google Gemma / NVIDIA NIM Multimodal Vision (primary) | ✅ Built |
| | Bullet block regex parser for handwritten pediatric/general slips | ✅ Built |
| | Extensible category prompts (Labs, MRI, Discharge, Rx) | ✅ Built |
| **AI Result Cards** | Executive plain-language clinical summary | ✅ Built |
| | Biomarker Parameters Table (Value / Range / Status) | ✅ Built |
| | Radiology Findings Table (Region + Observation) | ✅ Built |
| | Physician Recommendations & Next Steps | ✅ Built |
| | "Explain This Report" plain-language translation | ✅ Built (§8.6) |
| **Save to Vault** | One-click Save Report to Vault button | ✅ Built |
| | Physical scan image archived with document (`file_url`) | ✅ Built |
| | Category-mapped archiving (`lab_reports` → `lab-reports`) | ✅ Built |
| | Redirect to `/vault` on success | ✅ Built |

---

## 9.4 Digital Records Vault (`/vault`, `/vault/[category]`, `/vault/prescription/[id]`)

| Feature | Sub-Feature | Status |
|---|---|---|
| **Vault Home Page** | Category overview tiles (Prescriptions, Lab, X-Rays, Other) | ✅ Built |
| | Document counts per category | ✅ Built |
| | Recent uploads list | ✅ Built |
| **Category Archive Page** | Filterable list by status (All / Verified / Unverified) | ✅ Built |
| | Search by title, doctor, or summary text | ✅ Built |
| | Verified / Unverified status badges | ✅ Built |
| | Link to full document detail view | ✅ Built |
| **Digital Prescription Detail Page** | Expandable medicine cards per drug | ✅ Built |
| | Primary purpose of each medicine | ✅ Built |
| | Common side effects list | ✅ Built |
| | Food timing precautions | ✅ Built |
| | Unverified warning banner (needs doctor sign-off) | ✅ Built |
| | Simulate Doctor Sign-Off & Activate | ✅ Built |
| | Original Handwriting Scan Viewer modal | ✅ Built |
| | Physical document scan image displayed in viewer | ✅ Built |
| | Fallback card when no scan image available | ✅ Built |
| **Multi-Language Support** | 6 regional languages (Hindi, Telugu, Tamil, Kannada, Marathi, English) | ✅ Built |
| | Safety rule: exact drug names & dosages preserved across translations | ✅ Built |
| | Language selector dropdown in prescription view | ✅ Built |
| **Error Boundaries** | App Router `error.tsx` at `/vault`, `/vault/[category]`, `/vault/prescription/[id]` | ✅ Built |
| | Graceful fallback prescription loading for dynamic IDs | ✅ Built |

---

## 9.5 Sanjivini AI Copilot (`/copilot`)

| Feature | Sub-Feature | Status |
|---|---|---|
| **Chat Interface** | Multi-turn conversational context & persistent history | ✅ Built |
| | Source citation chips linked to Vault records | ✅ Built (Feature B) |
| | Empty-context prompt with one-click Scan Prescription trigger | ✅ Built (Feature C) |
| **LLM Response Engine** | OpenRouter / NVIDIA NIM / Local Ollama fallback hierarchy | ✅ Built |
| | Non-blocking async response handling | ✅ Built |
| **Clinical Context Injection** | Active prescription regimen injected as system context | ✅ Built |
| | Archived Vault records injected as additional context | ✅ Built |
| **No-Diagnose Guardrail** | Emergency & diagnostic keyword detection with soft block | ✅ Built (Feature A) |
| | Multi-turn safety persistence across last 4 turns | ✅ Built (Feature E) |
| | Regional language trigger detection (Hindi, Telugu, Tamil, Kannada, Marathi) | ✅ Built (Feature F) |
| | Refusals logged to `copilot_refused_queries` for doctor review | ✅ Built (§8.8) |
| | Ask-My-Doctor escalation chip with pre-filled message | ✅ Built (Feature D) |
| **Feedback Rating** | Helpful / Not Helpful (👍 / 👎) response rating buttons | ✅ Built (Feature G) |
| **Visit Prep Integration** | Refused queries surfaced automatically in Visit Prep card | ✅ Built (§8.8) |

---

## 9.6 OTC Drug Safety Scanner

| Feature | Sub-Feature | Status |
|---|---|---|
| **Camera Scan** | Camera capture for OTC drug packaging label | ✅ Built |
| **AI Label Extraction** | Vision AI extracts medicine name from label | ✅ Built |
| **Drug-Drug Interaction Check** | Cross-check against patient's active prescriptions | ✅ Built |
| **Verdict Display** | `SAFE` (green) / `WARNING` (red) full-width badge | ✅ Built |
| | Warning message with specific interaction details | ✅ Built |
| | "Ask Sanjivini" button on warning screen | ✅ Built |
| **Drug-Allergy Check** | Cross-check against patient allergy profile | ✅ Built (§8.5) |
| | `ALLERGY_WARNING` badge distinct from interaction warning | ✅ Built (§8.5) |
| **Allergy Profile Integration** | Patient-declared allergy list (substance + reaction + severity) | ✅ Built (§8.5) |
| | Doctor-confirmed vs patient-reported verification badges | ✅ Built (§8.5) |

---

## 9.7 Universal Health Passport (`/passport`)

| Feature | Sub-Feature | Status |
|---|---|---|
| **QR Code Generation** | Single-use JWT token scoped to patient record | ✅ Built |
| | QR code displayed large, centered, high-contrast | ✅ Built |
| | Live countdown timer (5 minutes) | ✅ Built |
| | Auto-regenerate on expiry | ✅ Built |
| **Passport Content Scope** | Active prescriptions, active conditions, recent labs | ✅ Built |
| **Scan Log** | Passport mint event logged to Activity Logs | ✅ Built |

---

## 9.8 Regional Audio Care Engine

| Feature | Sub-Feature | Status |
|---|---|---|
| **TTS Playback** | Web Speech API (`window.speechSynthesis`) | ✅ Built |
| | Per-medicine audio read-out of dose instruction | ✅ Built |
| **Language Support** | Hindi, Telugu, Tamil, Kannada, Marathi, English | ✅ Built |
| | Language preference respects `app_users.language_pref` | ✅ Built |
| | Graceful fallback to English if voice unavailable | ✅ Built |
| | Visible fallback notice (not silent) | ✅ Built |

---

## 9.9 Reminders & Notifications (`/reminders`)

| Feature | Sub-Feature | Status |
|---|---|---|
| **Dose Reminders** | Push notification at scheduled dose time | ✅ Built |
| | Service worker background delivery | ✅ Built |
| **Criticality-Tiered Escalation** | Tier assignment (Routine / Important / Critical) | ✅ Built (A1) |
| | High-risk drug auto-seeding (Insulin, Warfarin, etc.) | ✅ Built (A1) |
| | Anti-Pileup unified batch alert engine | ✅ Built (A3) |
| **Snooze & Skip Actions** | +20 min Snooze (marked pending, non-penalizing) | ✅ Built (A2) |
| | Explicit Skip dose logging with reason | ✅ Built (A2) |
| **Calendar & Scheduling** | Rich `.ics` calendar file generator with fasting instructions | ✅ Built (A4) |
| | Download Calendar Event (.ics) button | ✅ Built (A4) |
| **Transparency & Audit** | Escalation Transparency Guide & scoring model in logs | ✅ Built (A5) |
| **WhatsApp/SMS Deep Link** | Notification delivery via WhatsApp or SMS link | ✅ Built |

---

## 9.10 Symptom & Wellbeing Journal

| Feature | Sub-Feature | Status |
|---|---|---|
| **Daily Check-In Widget** | 1–5 emoji wellbeing scale entry | ✅ Built (§8.2) |
| | Optional free-text note (max 280 chars) | ✅ Built (§8.2) |
| | Tag to a specific active medicine | ✅ Built (§8.2) |
| | Photo attachment upload capability | ✅ Built (B1) |
| | Same-day edit/update preserving revision history | ✅ Built (B3) |
| **Clinical Intelligence** | 3-day low score trend nudge with direct WhatsApp doctor alert | ✅ Built (B2) |
| | 7-day Wellbeing vs. Adherence dual-trend visualizer | ✅ Built (B4) |
| | Gentle non-logging nudge card (dismissible for 7 days) | ✅ Built (B5) |
| **Doctor & Prep Integration**| Symptom timeline visible in doctor history portal | ✅ Built |
| | Low wellbeing days + notes appear in Visit Prep | ✅ Built (§8.8) |

---

## 9.11 Family / Caregiver Access

| Feature | Sub-Feature | Status |
|---|---|---|
| **Caregiver Contacts** | Caregiver name, phone, and relationship in Settings | ✅ Built |
| | Emergency contact link and notification routing | ✅ Built |
| | Missed critical dose escalation alerts | ✅ Built |
| **Delegated Access** | Patient sends OTP invite to caregiver phone number | 📋 Planned (§8.3) |
| | Caregiver accepts invite on their own device | 📋 Planned |
| | Read-only caregiver dashboard view | 📋 Planned |
| | Patient can revoke caregiver link from Settings | 📋 Planned |

---

## 9.12 Allergy & Known Reaction Profile

| Feature | Sub-Feature | Status |
|---|---|---|
| **Self-Declaration Form** | Substance / drug name entry | ✅ Built (§8.5) |
| | Reaction description (rash, hives, anaphylaxis, etc.) | ✅ Built (§8.5) |
| | Severity selection (mild / moderate / severe) | ✅ Built (§8.5) |
| **Verification Badges** | Patient-reported badge (amber, unverified) | ✅ Built (§8.5) |
| | Doctor-confirmed badge (green, verified) | ✅ Built (§8.5) |
| **Guardrail Integration** | Allergy checked in OTC Scanner | ✅ Built (§8.5) |
| | `ALLERGY_WARNING` distinct from `INTERACTION_WARNING` | ✅ Built (§8.5) |
| | Allergy cross-check endpoint `/api/patient/allergy` | ✅ Built (§8.5) |

---

## 9.13 Cost & Generic Alternative Awareness

| Feature | Sub-Feature | Status |
|---|---|---|
| **Cost Tag on Prescription Cards** | Estimated ₹ price range per medicine strip | 📋 Planned (§8.7) |
| **Generic Alternative Flag** | Generic drug name displayed | 📋 Planned |
| | Estimated generic cost range | 📋 Planned |
| | "Ask your pharmacist" framing (never a substitute recommendation) | 📋 Planned |
| **Data Source** | `medications_ref` table seeded with ~200 top India drugs | 📋 Planned |

---

## 9.14 Visit Prep Assistant

| Feature | Sub-Feature | Status |
|---|---|---|
| **Auto-Generated Pre-Visit Engine** | Backend aggregator endpoint (`/api/patient/{id}/visit-prep`) | ✅ Built (§8.8) |
| | Aggregates symptom journal low-score days & notes | ✅ Built (§8.8) |
| | Surfaces Copilot guardrail-refused topics | ✅ Built (§8.8) |
| | Medicines ending soon flagged (refill intelligence) | ✅ Built (§8.8) |
| | Pending lab & diagnostic orders flagged | ✅ Built (§8.8) |
| **Clinical Summary Cards** | Structured bullet talking points list generation | ✅ Built (§8.8) |
| | Factual only — no diagnosis in output | ✅ Built (§8.8) |
| **PDF Export** | "Export as PDF for the doctor" button | 📋 Planned |

---

## 9.15 Activity Logs (`/logs`)

| Feature | Sub-Feature | Status |
|---|---|---|
| **Event Tracking** | Dose toggle (taken / pending) logged | ✅ Built |
| | Dose snoozed (+20m) logged | ✅ Built (A2) |
| | Dose explicitly skipped with reason logged | ✅ Built (A2) |
| | Symptom check-in logged | ✅ Built (B1) |
| | Refill request logged | ✅ Built (§8.1) |
| | Document scan & vault archive logged | ✅ Built |
| | Digital prescription creation logged | ✅ Built |
| | Health Passport QR mint logged | ✅ Built |
| | Copilot consultation logged | ✅ Built |
| | Doctor sign-off event logged | ✅ Built |
| | OTC scan & safety check logged | ✅ Built |
| **Log Display** | Reverse-chronological activity feed | ✅ Built |
| | Event type badges (`DOSE_TOGGLED`, `DOSE_SNOOZED`, `DOSE_SKIPPED`, `SYMPTOM_LOGGED`, etc.) | ✅ Built |
| | Escalation Transparency & Scoring Model Info Card | ✅ Built (A5) |
| | Timestamp, actor, and detail string per event | ✅ Built |

---

## 9.16 Settings & Profile (`/settings`)

| Feature | Sub-Feature | Status |
|---|---|---|
| **Language Switcher** | Updates `app_users.language_pref` (6 regional languages) | ✅ Built |
| | Drives TTS voice language globally | ✅ Built |
| | Lives in Settings with instant audio test preview | ✅ Built |
| **Primary Doctor & Care Team** | Assign and switch primary attending physician | ✅ Built |
| | Multi-specialist care team selector | ✅ Built |
| **Allergy Management** | Add / delete known drug allergies & reactions | ✅ Built (§8.5) |
| **Notification Preferences** | Dose reminder enable/disable | ✅ Built |
| | WhatsApp / SMS notifications toggle | ✅ Built |
| **Caregiver & Family Contacts** | Add emergency contact / caregiver details | ✅ Built |
| **Account** | Logout & session reset | ✅ Built |

---

## 9.17 PWA & Offline Capability

| Feature | Sub-Feature | Status |
|---|---|---|
| **Progressive Web App Shell** | Zero-install, no app store required | ✅ Built |
| | `manifest.json` (name, icons, theme color, display: standalone) | ✅ Built |
| | "Add to Home Screen" install prompt | ✅ Built |
| **Service Worker & Cache** | Static asset caching | ✅ Built |
| | Offline-first schedule & cache fallback | ✅ Built |
| **Performance** | Next.js 14 App Router SSR + client hydration | ✅ Built |
| | Image optimization & Google Fonts typography | ✅ Built |

---

## 9.18 Feature Count Summary

| Area | Built ✅ | Partial 🔧 | Planned 📋 | Total |
|---|---|---|---|---|
| Auth & Onboarding | 7 | 0 | 0 | 7 |
| Dashboard & Timeline | 17 | 0 | 0 | 17 |
| Universal Doc Hub | 23 | 0 | 0 | 23 |
| Digital Vault | 14 | 0 | 0 | 14 |
| AI Copilot | 13 | 0 | 0 | 13 |
| OTC Safety Scanner | 10 | 0 | 0 | 10 |
| Health Passport | 6 | 0 | 0 | 6 |
| Audio Care Engine | 6 | 0 | 0 | 6 |
| Reminders & Notifications | 11 | 0 | 0 | 11 |
| Symptom Journal | 10 | 0 | 0 | 10 |
| Caregiver Access | 3 | 0 | 4 | 7 |
| Allergy Profile | 8 | 0 | 0 | 8 |
| Cost Awareness | 0 | 0 | 5 | 5 |
| Visit Prep Assistant | 7 | 0 | 1 | 8 |
| Activity Logs | 15 | 0 | 0 | 15 |
| Settings & Profile | 10 | 0 | 0 | 10 |
| PWA & Offline | 7 | 0 | 0 | 7 |
| **TOTAL** | **167** | **0** | **10** | **177** |



