# Sanjeevani — Doctor Role: Complete Specification
### PRD · TRD · Architecture · Database · Cross-Role Data Flow · UI Spec

**Version:** 1.0 | **Scope:** `/doctor` (Physician Command Workspace) only — other portals treated as upstream/downstream systems

---

# PART 1 — PRODUCT REQUIREMENTS (PRD)

## 1.1 Purpose

The Doctor Workspace is where every other role's work either gets validated or gets stopped. Reception's triage, the OCR engine's transcription, the X-ray model's detections, the guardrail engine's warnings — none of it reaches a patient or a pharmacy until a licensed doctor explicitly signs off. The product's entire safety model rests on this portal being **fast enough that doctors actually use the AI assistance, and strict enough that they can never accidentally bypass a safety check.**

The design tension to hold throughout: **augment speed, never remove authority.** The doctor is always the last line of defense, never a rubber stamp.

## 1.2 Target Users

| Sub-persona | Characteristics | Design implication |
|---|---|---|
| High-volume OPD doctor | 40–60 patients/day, seconds matter per screen | Queue must load instantly, X-ray/OCR review must be single-glance |
| Specialist (Cardiology, Endocrinology, etc.) | Sees patients already on complex multi-drug regimens from other doctors | Cross-doctor guardrail visibility is critical, not optional |
| General Physician / first point of contact | Frequently the one who "discovers" a dangerous interaction from a specialist's earlier prescription | Guardrail must proactively surface, not require the doctor to go looking |
| Doctor dictating notes between patients | Wants hands-free documentation | Ambient Voice Documentation must be low-friction (one tap to start/stop) |

## 1.3 Jobs to Be Done

1. "Show me who needs me most right now, not just who arrived first."
2. "Read this patient's outside prescription and X-ray for me, but let me correct anything wrong before it becomes official."
3. "Stop me — actively block me — if I'm about to prescribe something dangerous given everything else this patient is on, even from doctors I've never met."
4. "Let me sign off with total confidence that this record is locked, timestamped, and mine."
5. "Let me talk instead of type when I can."

## 1.4 Feature List (Doctor Portal)

| ID | Feature | Priority | Depends on other role |
|---|---|---|---|
| DR-1 | Interactive, acuity-sorted Consultation Queue | P0 | Reception (patient intake + triage) |
| DR-2 | X-Ray Canvas Overlay (bounding boxes on scanned image) | P0 | Reception (scan upload) → AI (X-ray model) |
| DR-3 | Side-by-Side OCR Verification (raw scan vs. editable structured fields) | P0 | Reception (scan upload) → AI (OCR pipeline) |
| DR-4 | Pharmacological Guardrails (live, blocking interaction check) | P0 | Every other doctor's prior verified prescriptions for this patient |
| DR-5 | One-Click Protocol Sign-Off (hash + immutable log + fan-out) | P0 | Triggers Pharmacy, Patient, Lab downstream |
| DR-6 | Ambient Voice Documentation (Whisper → SOAP note) | P1 | — |
| DR-7 | Automated ICD-10/CPT Coding from SOAP note | P2 | Feeds Reception's billing/claims step |
| DR-8 | Diagnostic Order placement (labs) | P0 | Feeds Lab role directly |
| DR-9 | Patient history view (past visits, past prescriptions, all doctors) | P0 | Reception, all prior doctors, Lab |
| DR-10 | Doctor's own queue/session management (login, active patient state) | P0 | — |

## 1.5 Explicit Non-Goals for Doctor Role

- The doctor's UI never silently auto-applies an AI suggestion — every OCR field, X-ray label, and SOAP note is presented as a **draft the doctor must actively confirm**, never a fait accompli.
- A `severe` guardrail flag can never be silently dismissed — it requires an explicit acknowledgment action, logged separately from the sign-off itself.
- Doctors cannot edit or delete a previously signed-off (`verified`) prescription — corrections require issuing a new, versioned prescription, preserving the original for audit.
- No cross-hospital patient search in v1 (multi-tenancy is schema-ready per `hospital_id`, but doctor search is scoped to their own hospital only).

## 1.6 Success Metrics (Doctor-specific)

- Average time from "patient opened" to "sign-off" (target: materially faster than pre-digital baseline, without skipping guardrail review).
- % of OCR-extracted fields edited by the doctor before sign-off (signals model accuracy / trust calibration — too low might mean doctors aren't actually reading it).
- % of prescriptions with zero post-sign-off correction needed.
- Guardrail flags raised → acknowledged vs. → changed prescription (shows whether the safety net actually changes clinical decisions, not just adds friction).
- Ambient Voice Documentation adoption rate and post-generation edit rate (SOAP note quality proxy).

---

# PART 2 — TECHNICAL REQUIREMENTS (TRD)

## 2.1 Platform & Delivery

- **Framework:** React 18 + Vite + TypeScript + TailwindCSS (internal staff tool — no PWA/offline requirement, always used on a hospital network with a desktop/tablet form factor in mind, though responsive down to tablet width).
- **Styling:** Shared `@sanjeevani/ui` package, but the doctor portal defaults to the **dark theme** (`data-theme="dark"`) per the design system — appropriate for a clinical, focused, low-glare workspace, distinct from the patient portal's warm light theme.
- **State:** TanStack Query for server cache + a lightweight local store (Zustand or React context) for the currently-open patient's in-progress draft state (OCR edits, medication list edits) before sign-off — this draft state must **never** be silently persisted as if verified; it lives client-side (or as a `status='draft'` DB row) until the doctor explicitly signs.

## 2.2 Auth (Doctor-Specific)

- **Identity provider:** Supabase Auth, email + password (unlike patients, doctors are staff with managed credentials, MFA-eligible).
- **Session:** JWT in httpOnly cookie, short-lived access token (~15 min) + refresh token, auto-refreshed silently by the app shell.
- **RBAC scope:** `app_users.role = 'doctor'`. Every doctor-portal API call is additionally scoped by `doctor_id` server-side — a doctor can only query/act on `doctor_queues` rows assigned to them, never another doctor's queue, even within the same hospital.
- **Session timeout:** Auto-lock/re-auth after a period of inactivity (clinical workstations are often shared/unattended) — recommend 10–15 min idle timeout with a quick PIN or biometric re-entry rather than full re-login, configurable per hospital policy.

## 2.3 Data Access Pattern

Unlike the Patient app (which reads plenty directly from Supabase), the **Doctor app routes almost everything through FastAPI**, because nearly every doctor-facing read is either:
- Cross-table and computed (queue sorted by joined severity, not stored pre-sorted),
- Safety-critical (guardrail check must run server-side, never trust a client-computed "safe"), or
- Write-adjacent to an immutable/audit-sensitive table (`verification_logs`).

| Path | Used for | Why |
|---|---|---|
| **FastAPI backend** | Queue fetch, OCR/X-ray fetch, guardrail check, sign-off, dictation, patient history | Business logic, AI inference, immutability guarantees |
| **Direct Supabase Realtime (subscribe-only, no writes)** | Live queue reordering, "scan ready" notification | Cheap push channel; the doctor app never writes to Supabase directly — even a "mark as taken" equivalent doesn't exist for doctors, everything is a POST to FastAPI |

This is a deliberate architectural asymmetry from the Patient role: **patients read directly and write narrowly (dose toggles only); doctors never read/write Supabase directly at all — everything is mediated by FastAPI**, because the doctor surface carries the highest-stakes write path in the whole system (the sign-off).

## 2.4 Realtime Requirements

- **Queue updates:** WebSocket to `/ws/doctor/{doctor_id}` (FastAPI-managed, not Supabase Realtime) — chosen over Supabase Realtime here specifically because the queue ordering logic (acuity + wait time) is computed server-side and pushed as a ready-to-render payload, not a raw table diff the client would need to re-sort itself.
- **Scan-ready events:** Same WebSocket channel, `{"type": "scan_ready", "scan_id": ..., "patient_id": ...}` — fires when Reception's uploaded scan finishes async OCR/X-ray processing, so the doctor doesn't have to manually refresh mid-consult.
- **Guardrail check:** Synchronous REST call (`POST /api/doctor/guardrail-check`), not realtime — must return in the same request/response cycle since it gates a UI action (typing a new medication).

## 2.5 Performance Targets

| Interaction | Target |
|---|---|
| Queue load (login → first render) | < 1s |
| Queue reorder on new triage event | < 2s end-to-end (Reception submit → Doctor UI update) |
| OCR/X-ray fetch for an opened patient | < 1s (data already processed async by the time doctor opens; this is just a read) |
| Guardrail check per medication edit | < 500ms p95 |
| Sign-off (hash + write + fan-out trigger) | < 1s to doctor-visible confirmation (fan-out to pharmacy/patient can complete slightly after, async) |
| Ambient dictation → transcript+SOAP | < 8s for a 2-minute recording (async, non-blocking — doctor can move to next patient while it processes) |

## 2.6 Security & Compliance (Doctor-Specific)

- **Sign-off integrity:** `POST /api/doctor/verify` computes `SHA-256` over the canonicalized (sorted-keys) final prescription JSON, writes it alongside `doctor_id` and a server-generated timestamp to `verification_logs`, which has `UPDATE`/`DELETE` **revoked at the database role level** — not just application-level enforcement, so even a compromised backend credential can't quietly rewrite history.
- **Guardrail bypass prevention:** The `/verify` endpoint independently re-runs the guardrail check server-side before committing — it does **not** trust a "safe: true" flag the client might have cached from an earlier, now-stale edit. Any unacknowledged `severe` flag at time of sign-off blocks the write and returns `GUARDRAIL_BLOCKED`.
- **Draft isolation:** In-progress prescription edits are either kept in ephemeral client state or written as `status='draft'` rows — drafts are never visible to Reception, Pharmacy, Lab, or the Patient; only `verified`/`dispensed` rows cross those boundaries.
- **Audit trail:** Every guardrail flag raised (even ones later acknowledged and overridden) is retained in `interaction_flags`, not deleted — this is deliberately asymmetric with drafts: safety-relevant events are always kept, UI drafts are not.
- **Dictation audio:** Raw audio blobs are stored transiently (processed by Whisper, then either discarded or archived per hospital retention policy — configurable, not hardcoded) since audio is a higher-sensitivity artifact than structured text.

---

# PART 3 — ARCHITECTURE (Doctor Portal in Context)

## 3.1 Component Diagram

```
                          ┌─────────────────────────────────────────────┐
                          │      DOCTOR WORKSPACE (React + Vite,          │
                          │        hospital workstation/tablet)           │
                          │                                               │
                          │  Login → Queue → Patient Detail                │
                          │    ├─ Consultation Queue (acuity-sorted)      │
                          │    ├─ X-Ray Canvas Overlay                    │
                          │    ├─ Side-by-Side OCR Verification           │
                          │    ├─ Pharmacological Guardrails (live)       │
                          │    ├─ Ambient Voice Documentation             │
                          │    ├─ Diagnostic Order placement              │
                          │    └─ One-Click Sign-Off                      │
                          └───────────────┬───────────┬───────────────────┘
                                           │           │
                          WebSocket        │           │  REST (all business logic)
                       /ws/doctor/{id}     │           │
                                           ▼           ▼
                          ┌─────────────────────────────────────────────┐
                          │              FASTAPI CORE                    │
                          │  /api/doctor/queue                           │
                          │  /api/doctor/patients/{id}/scan/{scan_id}    │
                          │  /api/doctor/patients/{id}/xray/{scan_id}    │
                          │  /api/doctor/guardrail-check                 │
                          │  /api/doctor/verify                          │
                          │  /api/doctor/dictation                       │
                          │  /api/doctor/orders (labs)                   │
                          │  WebSocket connection manager                │
                          └───────┬───────────────────┬───────────────────┘
                                  │                   │
                    ┌─────────────┘                   └──────────────┐
                    ▼                                                ▼
      ┌───────────────────────────┐                  ┌───────────────────────────────┐
      │    AI INFERENCE LAYER      │                  │        SUPABASE (service        │
      │  • X-ray ONNX model        │                  │        role, bypasses RLS)      │
      │  • TrOCR + YOLO (OCR)      │                  │  patients, prescriptions,       │
      │  • Whisper (dictation)     │                  │  prescription_items,            │
      │  • LLM (SOAP note, coding) │                  │  verification_logs (append-only)│
      │  • Guardrail interaction   │                  │  interaction_flags,             │
      │    matching logic          │                  │  diagnostic_orders,             │
      └────────────────────────────┘                  │  doctor_queues                  │
                                                        └───────────────────────────────┘
                                  │
                                  ▼
              ┌────────────────────────────────────────────────────────┐
              │           DOWNSTREAM CONSUMERS OF SIGN-OFF               │
              │  Pharmacy → pharmacy_dispense_log (new queue entry)      │
              │  Patient  → WhatsApp/SMS notification + Realtime push    │
              │  Lab      → diagnostic_orders (if labs ordered)          │
              └────────────────────────────────────────────────────────┘
```

## 3.2 Why This Split (Design Rationale)

- **No direct Supabase access from the doctor client at all** — this is the key architectural difference from the Patient role. The doctor surface is where the highest-consequence write in the entire system happens (sign-off), so every read and write is forced through a single, auditable, server-controlled choke point (FastAPI). This also means the guardrail-check logic lives in exactly one place, server-side, and can never be duplicated or drift out of sync with what `/verify` actually enforces.
- **Custom WebSocket over Supabase Realtime for the queue** — the queue's ordering (acuity level + wait time, joined across three tables) is nontrivial business logic; pushing a raw table-change event would just move that sorting problem to the client, and worse, the client would need read access to `chief_complaints` and `doctor_queues` directly, reopening the "should doctors read Supabase directly" question we deliberately closed off above.
- **Async AI pipeline decoupled from the request/response cycle** — OCR, X-ray, and dictation are all Celery-queued so the doctor's UI is never blocked waiting on a model; only the guardrail check (which must gate a UI action) is synchronous, and it's kept fast by design (a lightweight tag-overlap/rule check today, upgradeable to a real interaction API without changing this contract).

---

# PART 4 — DATABASE (Doctor-Relevant Tables & Access)

Reusing tables from `03_DATABASE_SCHEMA.md` / `supabase/schema.sql`, annotated for doctor access. Note: **no RLS policies are defined for doctor-facing tables** in the current schema because the doctor app never talks to Supabase directly — all access-scoping (a doctor only sees their own queue/patients) is enforced in FastAPI application code using the service-role key. This is called out explicitly as a design decision, not an oversight — see §4.3.

| Table | Doctor can... | Enforced by |
|---|---|---|
| `doctor_queues` | Read/update rows where `doctor_id = self` | FastAPI query filter, not RLS |
| `patients` | Read any patient in their queue or history; cannot create/delete | FastAPI |
| `chief_complaints` | Read (joined into queue) | FastAPI |
| `scans` | Read (OCR/X-ray results); cannot upload directly (Reception's job) — though may re-trigger analysis | FastAPI |
| `medications` | Read (reference data) | FastAPI |
| `prescriptions` | Create (`draft`), update own drafts, transition own `draft → verified`; **cannot** edit a `verified` row | FastAPI, with a DB constraint recommended (see below) |
| `prescription_items` | Create/edit while parent `prescriptions.status = 'draft'` only | FastAPI |
| `verification_logs` | Insert only (via `/verify`); **no read access even for the authoring doctor** through the client — the doctor sees their own confirmation via the API response, not by querying this table | FastAPI insert; Supabase `select using (false)` |
| `interaction_flags` | Create (guardrail engine writes these), update `acknowledged_by_doctor` | FastAPI |
| `diagnostic_orders` | Create, read own patients' orders | FastAPI |
| `lab_results` | Read (once Lab role produces them) — raw values, not just the patient-facing summary | FastAPI |

### 4.1 Recommended DB Constraint — Immutability of Verified Prescriptions

```sql
-- Prevent any UPDATE to prescription_items once the parent prescription is verified/dispensed.
create or replace function prevent_verified_item_edits()
returns trigger as $$
begin
  if (select status from prescriptions where id = old.prescription_id) in ('verified', 'dispensed') then
    raise exception 'Cannot modify items of a verified/dispensed prescription. Issue a new prescription instead.';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_prevent_verified_item_edits
before update on prescription_items
for each row execute function prevent_verified_item_edits();
```
This backs the "no editing signed-off records" rule at the database layer, not just in application code — defense in depth.

### 4.2 Cross-Doctor Guardrail Query (the query that makes polypharmacy safety work)

```sql
select pi.*, m.name, m.interaction_tags, p.doctor_id, du.full_name as prescribing_doctor
from prescription_items pi
join prescriptions p on pi.prescription_id = p.id
join medications m on pi.medication_id = m.id
join app_users du on p.doctor_id = du.id
where p.patient_id = :patient_id
  and p.status in ('verified', 'dispensed')
  and p.id != :current_draft_prescription_id;
```
Run by `/api/doctor/guardrail-check` on every medication-list edit — this is what lets Doctor B see and be blocked by Doctor A's prescription, and is exactly why doctor writes cannot be scoped by simple per-user RLS: the check inherently requires cross-doctor visibility into other doctors' verified data for the same patient, which is a business rule, not a row-ownership rule, and belongs in application logic rather than a client-facing RLS policy.

### 4.3 Why No RLS for Doctors (Design Note)

RLS is well-suited to "a user can only see their own rows" (the Patient role fits this perfectly). The Doctor role's actual rule is closer to "a doctor can see their own queue, but must also see *other doctors'* verified prescriptions for a shared patient for safety purposes, but must never see other doctors' unverified drafts or unrelated patients." That's a conditional, multi-table business rule, not a static row-ownership predicate — better expressed and unit-tested as FastAPI application logic than encoded as a complex RLS policy. RLS remains active on the underlying tables to protect against any misuse of the anon key, but the doctor app is never issued the anon key at all — only backend, service-role-authenticated requests touch these tables.

---

# PART 5 — CROSS-ROLE DATA FLOW (Doctor's View of the Ecosystem)

## 5.1 Flow: Reception → Doctor (Queue Population)

```
Receptionist registers patient + chief complaint
        │
        ▼
Triage classifier scores severity (1-3) synchronously
        │
        ▼
doctor_queues row created, assigned to a doctor_id
(assignment logic: department/specialty routing — v1 can be simple
 round-robin or a fixed department queue; smarter routing is a later phase)
        │
        ▼
WebSocket push to /ws/doctor/{doctor_id}: {"type": "queue_update", ...}
        │
        ▼
Doctor's queue re-sorts instantly — Level 3 patient jumps to position 1
regardless of arrival order, with a visible red SeverityBadge
```

If Reception also uploads a scan (outside prescription or X-ray) during intake:
```
Scan uploaded → async Celery job (OCR or X-ray model) → result written to scans row
        │
        ▼
WebSocket push: {"type": "scan_ready", "scan_id": ..., "patient_id": ...}
        │
        ▼
Doctor's patient-detail view, if already open, shows a "New scan ready" indicator
without requiring a manual refresh; if not yet open, it's simply ready when they click in
```

## 5.2 Flow: Doctor ⇄ AI Inference Layer (Within a Consult)

```
Doctor opens patient → GET /api/doctor/patients/{id}/scan/{scan_id}
        │                       and/or /xray/{scan_id}
        ▼
Returns pre-computed structured JSON (OCR fields + bounding boxes,
or X-ray detections + bounding boxes) — this was already processed
asynchronously when Reception uploaded it, so this call is a fast read,
not a live inference call
        │
        ▼
Doctor reviews Canvas overlay (X-ray) and split-screen editable fields (OCR),
corrects any misread text — each correction sets prescription_items.doctor_edited = true
```

Ambient documentation is the one AI call initiated live, mid-consult:
```
Doctor taps mic → MediaRecorder captures audio → POST /api/doctor/dictation
        │
        ▼
Async: Whisper transcribes → LLM structures into SOAP note
        │
        ▼
Structured note returned, inserted into prescriptions.soap_note_json as a draft
for doctor review — never auto-finalized
```

## 5.3 Flow: Doctor → Guardrail Engine → Doctor (The Safety Loop)

```
Doctor adds/edits a medication in the draft prescription
        │
        ▼
POST /api/doctor/guardrail-check (fires on every meaningful edit, debounced ~300ms)
        │
        ▼
Server queries ALL other verified/dispensed prescriptions for this patient
across every doctor who has ever treated them (see §4.2 query)
        │
        ▼
If severe flag: blocking red banner appears immediately in the UI,
sign-off button becomes disabled until the flag is either:
  (a) the conflicting medication is removed/changed, or
  (b) an explicit "Acknowledge & Override" action is taken
      (this writes interaction_flags.acknowledged_by_doctor = true,
       permanently retained for audit — this is NOT the same as
       clearing the flag; it stays visible to Pharmacy as a safety-lock badge)
```

## 5.4 Flow: Doctor → Sign-Off → Fan-Out to Every Other Role

This is the single most important cross-role trigger in the entire system.

```
Doctor clicks "Verify & Activate"
        │
        ▼
POST /api/doctor/verify
        │
        ├─ Server re-runs guardrail-check independently (never trusts client state)
        │   → if unacknowledged severe flag exists: reject with GUARDRAIL_BLOCKED, no write occurs
        │
        ├─ prescriptions.status = 'draft' → 'verified', verified_at = now()
        ├─ verification_logs insert: {prescription_id, doctor_id, protocol_hash, signed_at}
        │   (append-only, immutable)
        │
        ├──────────────────────────────► PHARMACY
        │    New row visible in pharmacy queue query
        │    (status='verified' AND dispensed=false) — pushed via SSE
        │    If any acknowledged severe flag exists, pharmacy sees a safety-lock badge
        │
        ├──────────────────────────────► PATIENT
        │    WhatsApp/SMS dispatched with activation/deep-link
        │    Patient's dosing timeline updates (directly, or after first-time activation)
        │    OCR bounding boxes carry over so patient's Evidence Viewer works identically
        │
        └──────────────────────────────► LAB (conditional)
             If diagnostic_orders were placed in the same consult (§5.5),
             they become visible on the Lab Kanban board at this same moment
```

## 5.5 Flow: Doctor → Lab (Diagnostic Orders)

```
During consult, doctor selects a test (e.g. "Complete Blood Count") from a dropdown
        │
        ▼
POST /api/doctor/orders → diagnostic_orders row created, status='pending_draw',
linked to doctor_id and patient_id
        │
        ▼
Lab technician's Kanban board picks this up immediately (independent of whether
the prescription itself has been signed off yet — an order can be placed even if
the doctor is still finalizing medications)
        │
        ▼
[... Lab role does its work: pending_draw → analyzing → results_ready ...]
        │
        ▼
lab_results row appears; Doctor's patient history view (DR-9) surfaces BOTH
raw_values_json (clinical, for the doctor) and patient_summary_text (for reference,
so the doctor knows exactly what plain-language explanation the patient already
received) — this dual visibility is intentional so the doctor is never surprised
by what a patient thinks their results mean
```

## 5.6 Flow: Doctor (Doctor C) → Patient's Health Passport (Patient-Initiated, Doctor-Consumed)

```
A NEW doctor (never treated this patient before) needs their history
        │
        ▼
Patient generates a QR (see Patient Role spec §5.6/6.6)
        │
        ▼
Doctor C scans it → GET /api/passport/{qr_token}
        │
        ▼
Returns read-only consolidated view: active prescriptions across ALL
prior doctors, conditions, recent lab summaries
        │
        ▼
Doctor C now has this context BEFORE writing any new prescription —
when they do, their own guardrail-check (§5.3) will independently
re-verify against the real prescriptions table anyway; the QR passport
is a convenience/trust-building view, never the source of truth the
guardrail engine itself relies on
```

## 5.7 Full Round-Trip Sequence Diagram (Doctor-Centered)

```
Reception        Doctor            AI Layer         Guardrail Engine    Pharmacy   Patient   Lab
    │               │                   │                    │              │          │       │
    │ register+scan │                   │                    │              │          │       │
    ├──────────────►│                   │                    │              │          │       │
    │               │  (async) OCR/Xray │                    │              │          │       │
    │               │◄──────────────────┤                    │              │          │       │
    │               │ "scan_ready" WS   │                    │              │          │       │
    │               │ open patient      │                    │              │          │       │
    │               │ review OCR/Xray   │                    │              │          │       │
    │               │ edit medication ──┼────────────────────►              │          │       │
    │               │                   │       flags (if any)              │          │       │
    │               │◄──────────────────┼────────────────────┤              │          │       │
    │               │ acknowledge/fix   │                    │              │          │       │
    │               │ order lab test ───┼────────────────────┼──────────────┼──────────┼──────►│
    │               │ dictate note ─────►                    │              │          │       │
    │               │◄──────────────────┤ SOAP note draft    │              │          │       │
    │               │ VERIFY & ACTIVATE │                    │              │          │       │
    │               │ (re-check server-side) ────────────────►              │          │       │
    │               ├───────────────────┼────────────────────┼─────────────►│          │       │
    │               ├───────────────────┼────────────────────┼──────────────┼─────────►│       │
    │               │                   │                    │              │          │  results ready
    │               │◄──────────────────┼────────────────────┼──────────────┼──────────┼───────┤
    │               │ (visible in patient history view)       │              │          │       │
```

---

# PART 6 — UI SPECIFICATION (Doctor Portal)

Design tokens per `05_DESIGN_SYSTEM.md` — **dark theme** (`data-theme="dark"`), stark, utilitarian, zero decorative motion, optimized for speed of scanning over aesthetic warmth (inverse priority from the Patient portal).

## 6.1 Screen Inventory

| Screen | Route | Primary Component |
|---|---|---|
| Login | `/login` | Email/password, MFA if enabled |
| Queue (Home) | `/doctor` | Acuity-sorted list, left rail |
| Patient Detail | `/doctor/patient/[id]` | Multi-section workspace (main focus of this spec) |
| Patient History | `/doctor/patient/[id]/history` | Timeline of past visits/prescriptions across all doctors |
| Session/Settings | `/doctor/settings` | Profile, notification prefs, logout |

## 6.2 Screen: Queue + Patient Detail (Combined Layout — matches scaffold's two-pane structure)

```
┌───────────────┬─────────────────────────────────────────────────┐
│  02 // QUEUE   │  03 // PHYSICIAN WORKSPACE                        │
│  Waiting Room  │                                                    │
│                │  Ramesh Kumar                                     │
│ ┌────────────┐ │  ─────────────────────────────────────            │
│ │Ramesh Kumar│ │  X-RAY CANVAS OVERLAY                             │
│ │ ● Critical │ │  ┌─────────────────────────────────┐              │
│ │Chest pain..│ │  │  [X-ray image with red bounding   │              │
│ │  Token #14 │ │  │   box: "fracture — 92%"]           │              │
│ └────────────┘ │  └─────────────────────────────────┘              │
│ ┌────────────┐ │                                                    │
│ │Sita Devi   │ │  SIDE-BY-SIDE OCR VERIFICATION                    │
│ │ ● Urgent   │ │  ┌───────────────┬───────────────────┐            │
│ │Fever, cough│ │  │ [raw scan,     │ Drug: Noveron      │            │
│ │  Token #12 │ │  │  pan/zoom]     │ Dosage: 500mg       │            │
│ └────────────┘ │  │                │ Freq: 1-0-1          │            │
│ ┌────────────┐ │  │                │ [Doctor-editable]     │            │
│ │Anil Patel  │ │  └───────────────┴───────────────────┘            │
│ │ ○ Routine  │ │                                                    │
│ │Checkup     │ │  ⚠ GUARDRAIL WARNING (if any)                     │
│ │  Token #9  │ │  ┌─────────────────────────────────┐              │
│ └────────────┘ │  │ Severe interaction with Warfarin  │              │
│                │  │ (Dr. Sharma, Cardiology)           │              │
│                │  │ [Acknowledge & Override]            │              │
│                │  └─────────────────────────────────┘              │
│                │                                                    │
│                │  [🎙 Dictate]      [Order Lab Test ▾]              │
│                │                                                    │
│                │  [ Verify & Activate Protocol → ]                 │
└───────────────┴─────────────────────────────────────────────────┘
```

### Queue panel behavior
- Cards sorted by `severity_level DESC, queued_at ASC` — sort order re-renders live on WebSocket `queue_update` events, with a brief highlight flash (150ms) on any card that just moved position, so the doctor notices a reprioritization without a jarring reflow.
- Critical patients: red `SeverityBadge`, and the card itself gets a subtle left-border accent in `--warn` for at-a-glance scanning even before reading the badge text.

### Patient detail — section order is deliberate
1. **X-Ray Canvas Overlay** first (if present) — visual, fastest to parse.
2. **OCR Verification** second — requires more active reading/correction.
3. **Guardrail Warning** — only rendered when active, but when present it sits directly above the action row so it's the last thing seen before sign-off, not buried above the fold.
4. **Dictate / Order Lab** — secondary actions, smaller buttons, same row.
5. **Verify & Activate** — always the final, most visually dominant element (`PrimaryButton`, full-width or prominent), disabled state clearly styled (reduced opacity + a small inline reason: "Resolve guardrail warning to continue").

## 6.3 Component: Guardrail Warning Banner

```
┌───────────────────────────────────────────────────┐
│  ⚠  SEVERE INTERACTION DETECTED                    │
│                                                     │
│  Noveron 500mg conflicts with Warfarin 5mg          │
│  (prescribed by Dr. Sharma, Cardiology, active)     │
│                                                     │
│  [ Remove Medication ]   [ Acknowledge & Override ] │
└───────────────────────────────────────────────────┘
```
- Full-width, `border` in `--warn`, background a very subtle warn-tinted fill (not full red-fill — stays within the brutalist "borders not blocks" language, but this is the one screen where a slightly heavier visual weight than a plain hairline border is justified given the stakes).
- "Acknowledge & Override" requires a second confirmation (small inline modal: "This will be permanently logged. Continue?") — deliberate friction, matching the PRD's "never silently dismissed" rule.
- Once acknowledged, banner collapses to a persistent small tag: `⚠ 1 interaction acknowledged` — still visible, not hidden, for the remainder of the session.

## 6.4 Component: Side-by-Side OCR Verification

```
┌─────────────────────┬─────────────────────────────┐
│                       │  DRUG NAME                    │
│   [raw scan image,    │  ┌───────────────────────┐    │
│    pinch/scroll        │  │ Noveron                │    │
│    zoomable]           │  └───────────────────────┘    │
│                       │  (confidence: 88%)             │
│                       │                                │
│                       │  DOSAGE                        │
│                       │  ┌───────────────────────┐    │
│                       │  │ 500mg                  │    │
│                       │  └───────────────────────┘    │
│                       │                                │
│                       │  FREQUENCY                     │
│                       │  ┌───────────────────────┐    │
│                       │  │ 1-0-1                  │    │
│                       │  └───────────────────────┘    │
│                       │                                │
│                       │  CONDITION TAG (patient-facing) │
│                       │  ┌───────────────────────┐    │
│                       │  │ Heart Care              │    │
│                       │  └───────────────────────┘    │
└─────────────────────┴─────────────────────────────┘
```
- Each field shows the OCR model's confidence score as a small muted percentage — low-confidence fields (<70%) get a subtle amber outline to draw the doctor's eye without being alarmist (this is a transcription-quality signal, not a clinical warning, so it must be visually distinct from the guardrail banner's red).
- Editing any field sets `doctor_edited = true` silently in the background (no extra UI needed — it's an audit field, not something the doctor needs to manage).
- **Condition Tag field** is the one OCR-adjacent field that's doctor-authored rather than transcribed — this is what powers the Patient portal's `[DIABETES]` / `[HEART CARE]` labels, so it's presented as a required field, not optional metadata.

## 6.5 Component: X-Ray Canvas Overlay

- Canvas renders the raw image plus bounding boxes drawn client-side from the stored `xray_analysis_json` (see scaffold's `XrayCanvas` component) — colors: `fracture` in `--warn` red, other classes (boneanomaly, foreignbody, etc.) in amber, each labeled with class name + confidence %.
- Doctor can toggle detection visibility per class (small legend with checkboxes) if multiple classes clutter a single image — not required for MVP but noted as a natural P1 enhancement.
- No click-to-edit on the bounding boxes themselves in v1 — the doctor's clinical judgment is captured in the SOAP note / prescription, not by directly annotating the AI's output; this keeps the imaging review read-only and fast.

## 6.6 Component: Ambient Voice Documentation Control

```
[ 🎙 Dictate ]   →  [ ⏺ Recording... 00:47 ]   →  [ Processing transcript... ]  →  SOAP note appears below as an editable draft
```
- Single toggle button, three visual states (idle / recording / processing), no modal interruption — doctor can keep working (e.g., reviewing OCR fields) while dictation state persists in a small fixed-position indicator.
- Generated SOAP note renders as four labeled, individually editable text blocks (Subjective / Objective / Assessment / Plan) — never auto-inserted into the prescription without the doctor seeing and being able to edit it first.

## 6.7 Accessibility & Efficiency Requirements

- Full keyboard navigation for queue selection and field editing — high-volume doctors should be able to work primarily via keyboard/tab-order during a busy clinic session.
- Guardrail warnings are never conveyed by color alone — always paired with the ⚠ icon and explicit text.
- Sign-off button always shows its disabled-reason inline (never a silently greyed-out button with no explanation) — e.g., "Resolve guardrail warning to continue" or "Complete required fields: Condition Tag."
- Session idle-timeout warning appears 60 seconds before auto-lock, non-blocking, so an in-progress draft is never lost without warning.