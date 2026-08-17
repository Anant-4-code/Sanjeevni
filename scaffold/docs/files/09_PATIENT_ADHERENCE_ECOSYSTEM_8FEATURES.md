# Sanjeevani — Patient Adherence & Safety Ecosystem: 8 Game-Changing Features
### Ultra-Detailed PRD · TRD · Architecture · Database · Cross-Role Flow · UI Spec

**Version:** 2.0 | **Status:** Next-Phase Enhancement for Patient Portal
**Scope:** Extends `06_PATIENT_ROLE_COMPLETE_SPEC.md`, `08_PATIENT_VAULT_REMINDERS_SPEC.md` with production-ready implementations for the 4 highest-impact features + lighter versions of 4 supporting features.

---

# EXECUTIVE SUMMARY

These 8 features transform the Patient Portal from a "read-only record + dose log" into an **active adherence partner** that:
- Stops patients from running out of meds mid-treatment.
- Gives caregivers remote visibility & control (the #1 real-world blocker to adherence, especially for elderly patients).
- Turns "don't diagnose" refusals into actionable visit prep.
- Flags allergies & interactions proactively, not just reactively.
- Explains medical reports in plain language, removing the "what does this even mean?" barrier.

**Impact projection:** These 4 features alone (Refill, Caregivers, Symptoms, Smarter Reminders) could move adherence from ~60% (baseline) to ~80%+ based on similar deployments (Pillsy, Medisafe, etc.), and would cut "patient called receptionist asking if they forgot a dose" calls by ~40%.

---

# FEATURE 1: REFILL & RUNNING-OUT INTELLIGENCE

## 1.1 PRD

### Purpose
A patient on a 10-day course of medicine should never discover on day 9 that they have no refills left, or have to guess when to call their doctor. The system calculates remaining medication days in real time and proactively surfaces refill requests.

### User Stories
- **As a patient**, I want to see "3 days of Tab. Gabapin NT left" on my dashboard so I can request a refill before I run out.
- **As a patient**, I want to tap "Request Refill" and have it automatically notify my doctor, not spend 20 minutes on hold at the clinic.
- **As a patient**, I want a nudge if I'm going on a 5-day trip next week but only have 3 days of my heart medication left.
- **As a caregiver**, I want an alert that the elderly patient I'm helping has only 2 days of insulin left, so I can coordinate a pickup.
- **As a doctor**, I want to see refill requests from all my patients in my queue, prioritized by urgency (i.e., "runs out tomorrow" before "runs out in a week").
- **As a receptionist**, I want a dedicated "Refill Requests" panel so I'm not pulling patients' histories manually.

### Feature Matrix

| ID | Feature | Priority | Depends on |
|---|---|---|---|
| RF-1 | Remaining-days calculation on dashboard | P0 | Existing `intake_logs` + `duration_days` |
| RF-2 | Low-stock warning banner (< 3 days) | P0 | Simple threshold logic |
| RF-3 | "Request Refill" button → creates a refill request | P0 | New `refill_requests` table + FastAPI endpoint |
| RF-4 | Doctor/Receptionist "Refill Requests" queue | P0 | New table + WebSocket push |
| RF-5 | Trip/Event-aware nudge (calendar context) | P1 | Optional user travel planning feature |
| RF-6 | Automatic refill request if running out during weekend/holiday | P2 | Schedule-aware background job |
| RF-7 | Refill request history & status tracking (Approved/Pending/Denied) | P1 | `refill_requests` table status field |

### Success Metrics
- % of patients who avoid stock-outs (target: >95%).
- Average time from refill request to pharmacy pickup (target: <24h).
- Caregiver engagement with refill alerts (if caregivers enabled).
- Reduction in "patient requesting refill via phone" calls to reception (target: -60%).

---

## 1.2 TRD

### Data Model

**Calculation (client-side, instant, no server hop):**
```
remaining_days = duration_days - (days_elapsed)
               = duration_days - (TODAY - prescription.verified_at).days()

Example:
- Prescription: Tab. Gabapin NT, duration_days = 10, verified on Aug 12
- Today: Aug 15 (3 days elapsed)
- Remaining: 10 - 3 = 7 days

If remaining_days <= 3 → show red banner "3 days left — Request Refill"
```

**Remaining doses (alternative, more precise for variable frequency):**
```
taken_doses = COUNT(*) from intake_logs where prescription_id = X AND taken = true
total_doses = SUM(frequency_multiplier) * duration_days
remaining_doses = total_doses - taken_doses

Example:
- Metformin "1-0-1" = 2 doses/day
- 10-day course = 20 total doses
- Patient took 14 doses (7 days in)
- Remaining: 20 - 14 = 6 doses = ~3 days at current pace
```

**Backend should use the second method** (it's more accurate when patients miss doses), but the first is fast for a first-pass check.

### Performance Targets
- Dashboard load time with refill badge: < 1.2s (no extra queries, badge calc is pure math on existing data).
- Refill request submit → doctor sees it in queue: < 2s end-to-end.

### Security & Privacy
- Refill requests are **not** new prescriptions — they carry no clinical content, only "patient asks for more of this already-prescribed medicine."
- Only the prescribing doctor (or a delegated receptionist from their clinic) can approve/deny a refill request; refill cannot bypass a doctor.
- A patient can see their own refill request history; a caregiver (if linked) can see pending refills for the patient they manage.

---

## 1.3 Architecture & Database

### New Tables

```sql
create table refill_requests (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  prescription_id uuid references prescriptions(id) on delete cascade,
  prescribing_doctor_id uuid references app_users(id),  -- who wrote the original Rx
  requested_by_patient_id uuid,  -- patient requesting, or caregiver_id if caregiver initiated
  requested_by_role text,  -- 'patient' | 'caregiver'
  status text default 'pending',  -- pending | approved | dispensed | denied | expired
  refill_quantity int,  -- how many days/doses to refill (default: same as original duration)
  request_notes text,  -- patient optional note: "going on trip, need sooner"
  doctor_response_notes text,  -- doctor's denial reason, if applicable
  requested_at timestamptz default now(),
  approved_at timestamptz,
  approved_by uuid references app_users(id),  -- which staff member approved
  dispensed_at timestamptz,
  expires_at timestamptz,  -- request auto-expires after 30 days if not acted on
  
  check (status in ('pending','approved','dispensed','denied','expired')),
  check (refill_quantity > 0)
);

-- Track refill request history per prescription (for analytics & audit)
create table refill_request_history (
  id uuid primary key default uuid_generate_v4(),
  refill_request_id uuid references refill_requests(id) on delete cascade,
  status_change_from text,
  status_change_to text,
  changed_by uuid references app_users(id),
  changed_at timestamptz default now()
);

-- Extend prescriptions table with a refillable flag (default true, set false if doctor says "no refills")
alter table prescriptions add column is_refillable boolean default true;
alter table prescriptions add column max_refills_allowed int default 3;  -- max refill requests for this Rx
alter table prescriptions add column refills_issued int default 0;  -- count of approved refills so far
```

### Indexes & Queries

```sql
create index idx_refill_requests_patient_status on refill_requests(patient_id, status);
create index idx_refill_requests_doctor_id on refill_requests(prescribing_doctor_id, status);
create index idx_refill_requests_expires_at on refill_requests(expires_at);

-- Query: Check if a patient is running low on a prescription
select 
  p.id,
  pi.medication_id,
  m.name as medicine_name,
  p.duration_days,
  p.verified_at,
  (p.duration_days - (current_date - p.verified_at::date)) as remaining_days
from prescriptions p
join prescription_items pi on p.id = pi.prescription_id
join medications m on pi.medication_id = m.id
where p.patient_id = :patient_id
  and p.status in ('verified', 'dispensed')
  and (p.duration_days - (current_date - p.verified_at::date)) <= 3
order by remaining_days asc;

-- Query: Refill requests awaiting doctor approval (for doctor's queue)
select 
  r.id,
  r.patient_id,
  pt.full_name as patient_name,
  pi.medication_id,
  m.name as medicine_name,
  r.requested_at,
  current_date - r.requested_at::date as days_pending
from refill_requests r
join patients pt on r.patient_id = pt.id
join prescriptions p on r.prescription_id = p.id
join prescription_items pi on p.id = pi.prescription_id
join medications m on pi.medication_id = m.id
where r.prescribing_doctor_id = :doctor_id
  and r.status = 'pending'
order by r.requested_at asc;
```

### RLS Policies

```sql
alter table refill_requests enable row level security;

-- Patients see their own refill requests
create policy "refill_requests_patient_read" on refill_requests
  for select using (
    patient_id in (select id from patients where portal_user_id = auth.uid())
  );

-- Patients can create new refill requests for their own prescriptions
create policy "refill_requests_patient_insert" on refill_requests
  for insert with check (
    patient_id in (select id from patients where portal_user_id = auth.uid())
  );

-- Doctors see refill requests for prescriptions they wrote (via service-role, not direct RLS)
-- (This is handled in FastAPI, not RLS, since the rule is "prescribing_doctor_id matches session user"
--  which is application-level, not pure row-ownership.)
```

---

## 1.4 API & Endpoints

```
GET  /api/patient/{id}/prescriptions/refill-status
     Returns: {prescriptions: [{id, medicine_name, remaining_days, refillable, pending_refill_id}]}

POST /api/patient/{id}/refill-requests
     Body: {prescription_id, refill_quantity?, notes?}
     Returns: {refill_request_id, status: "pending", request_created_at}

GET  /api/patient/{id}/refill-requests
     Returns: [refill_request, status, approved_at, ...]

GET  /api/doctor/{id}/queue/refill-requests?status=pending
     (FastAPI, service-role, doctor-scoped)
     Returns: refill requests for all this doctor's patients

POST /api/doctor/refill-requests/{id}/approve
     Body: {refill_quantity?, approved_by_id}
     Returns: {status: "approved", creates pharmacy order}

POST /api/doctor/refill-requests/{id}/deny
     Body: {reason_notes}
     Returns: {status: "denied"}

GET  /api/reception/refill-requests/queue
     (FastAPI, receptionist/admin-scoped)
     Returns: all pending & approved refills across all doctors in this clinic
```

---

## 1.5 Cross-Role Data Flow

```
PATIENT SIDE:
Patient opens dashboard
  ↓
GET /api/patient/{id}/prescriptions/refill-status (direct Supabase read on prescriptions table)
  ↓
Frontend calc: for each prescription, days_remaining = duration_days - (today - verified_at).days()
  ↓
If days_remaining <= 3: show red banner "3 days of [medicine] left"
  ↓
Patient taps "Request Refill"
  ↓
POST /api/patient/{id}/refill-requests {prescription_id, refill_quantity: 10, notes: ""}
  ↓
Supabase inserts refill_requests row, status = 'pending'
  ↓
WebSocket push to Doctor's "/doctor/queue/refill-requests" shows new item
  ├─→ WhatsApp notification to prescribing doctor: "Patient [Name] requesting refill of Gabapin NT"
  │
  └─→ Patient sees "Refill request sent" confirmation badge on that medicine card

DOCTOR SIDE:
Doctor sees refill request in their queue
  ↓
Reviews patient history, confirms prescription is still valid
  ↓
POST /api/doctor/refill-requests/{id}/approve {refill_quantity: 10}
  ↓
Backend:
  1. Updates refill_requests.status = 'approved', approved_by = doctor_id, approved_at = now()
  2. Inserts pharmacy_dispense_log row (or creates a temporary "pending approval" dispense)
  3. Increments prescriptions.refills_issued counter
  4. Checks if refills_issued < max_refills_allowed; if exceeded, flags for manual review
  ↓
WebSocket push to Pharmacy: "New dispense ready — Refill of Gabapin NT"
  ↓
Patient sees "Refill approved, ready for pickup" status

PHARMACY SIDE:
Pharmacist sees refill in queue
  ↓
Packages the medicine
  ↓
POST /api/pharmacy/dispense {refill_request_id}
  ↓
refill_requests.status = 'dispensed', dispensed_at = now()
  ↓
Patient notified: "Your Gabapin NT refill is ready for pickup at [Pharmacy Name]"
```

---

## 1.6 UI Specification

### Dashboard Low-Stock Badge (Refill-Aware)

```
┌─────────────────────────────────────┐
│  TODAY                    [92%] ◐    │
│  Your Dosing Schedule                │
├─────────────────────────────────────┤
│  ⚠️ RUNNING LOW                      │  ← new warning banner (red border)
│  You have 3 days of Gabapin NT left  │
│  [Request Refill →]                  │
├─────────────────────────────────────┤
│  08:00 AM                            │
│  ┌─────────────────────────────────┐ │
│  │ Noveron 500mg [HEART CARE]      │ │
│  │ Dr. Sharma                       │ │
│  │ Stock: 10 days left  (▶) [Taken] │ │  ← inline stock badge
│  └─────────────────────────────────┘ │
│  ┌─────────────────────────────────┐ │
│  │ Gabapin NT 100mg [NERVE CARE]   │ │
│  │ Dr. Rai                          │ │
│  │ 🔴 Stock: 3 days left ⚠          │ │  ← red dot + warning
│  │          (▶)  [Refill Pending]   │ │  ← toggle shows refill state
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Refill Request Modal

```
┌─────────────────────────────────────┐
│  Request Refill         [✕]          │
│  Gabapin NT 100mg                    │
├─────────────────────────────────────┤
│  Current Prescription                │
│  Prescribed by Dr. Rai · Aug 12      │
│  Duration: 10 days · Verified        │
│                                       │
│  Days Remaining: 3                   │
│  Quantity to Request:                │
│  ┌─────────────────────────────────┐ │
│  │ 10 days [default, same as orig]  │ │
│  │  ☐ 20 days (2x)                  │
│  │  ☐ 30 days (3x)                  │
│  └─────────────────────────────────┘ │
│                                       │
│  Optional Note:                       │
│  ┌─────────────────────────────────┐ │
│  │ Going on a 2-week trip, need more │ │
│  └─────────────────────────────────┘ │
│                                       │
│  Refills Available: 2 of 3            │
│  (Dr. Rai allows up to 3 refills)     │
│                                       │
│  [ Request Refill ] [ Cancel ]        │
└─────────────────────────────────────┘
```

### Refill Status Timeline (Patient Side)

```
┌─────────────────────────────────────┐
│  Refill Requests                     │
├─────────────────────────────────────┤
│  Gabapin NT 100mg                    │
│  ●────────●──────────○               │
│  Requested  Approved  (today)        │
│  3 hrs ago  2 hrs ago                │
│  Status: Ready for Pickup            │
│  [View Details]                      │
│                                       │
│  ────────────────────────────────    │
│  Noveron 500mg (Previous Refill)     │
│  ●────────●────────●                 │
│  Requested Approved Picked Up        │
│  Jul 20    Jul 20    Jul 21          │
│  Status: Completed                   │
│  [View Receipt]                      │
└─────────────────────────────────────┘
```

### Doctor's Refill Request Queue (Doctor Portal Addition)

```
┌─────────────────────────────────────┐
│  Refill Requests      [5 Pending]    │
├─────────────────────────────────────┤
│  URGENT (running out today/tomorrow) │
│  ┌─────────────────────────────────┐ │
│  │ 🔴 Ramesh Kumar                  │ │
│  │    Metformin 500mg — 1 day left  │ │
│  │    Requested 2 hrs ago           │ │
│  │    [Approve] [Deny]              │ │
│  └─────────────────────────────────┘ │
│                                       │
│  NORMAL (3-7 days left)              │
│  ┌─────────────────────────────────┐ │
│  │ ○ Sita Devi                      │ │
│  │   Aspirin 100mg — 5 days left    │ │
│  │   Requested yesterday            │ │
│  │   [Approve] [Deny]               │ │
│  └─────────────────────────────────┘ │
│  ┌─────────────────────────────────┐ │
│  │ ○ Anil Patel                     │ │
│  │   Noveron 500mg — 4 days left    │ │
│  │   Requested 1 day ago            │ │
│  │   [Approve] [Deny]               │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

When doctor taps [Approve]:

```
┌─────────────────────────────────────┐
│  Approve Refill?                     │
├─────────────────────────────────────┤
│  Patient: Ramesh Kumar               │
│  Medicine: Metformin 500mg           │
│  Refill Qty: 10 days (original)      │
│  Refills remaining: 2 of 3           │
│                                       │
│  Notes from patient: (none)          │
│                                       │
│  Clinical Notes (your previous):     │
│  "Good adherence, stable condition"  │
│                                       │
│  Your response (optional):           │
│  [ Continue same, monitor... ]       │
│                                       │
│  [ Approve Refill ] [ Deny ] [Skip]  │
└─────────────────────────────────────┘
```

---

## 1.7 Caregiver Integration (if Caregivers are enabled — see Feature #3)

**Caregiver also sees low-stock alerts:**
```
Patient: Elderly mother
Caregiver (you): Adult son

Notification: "Your mother's Insulin is running low (2 days left). 
She hasn't requested a refill yet. Request on her behalf? 
[Yes, request for 10 days] [Remind her to request]"
```

When caregiver taps "request on her behalf":
```
refill_requests.requested_by_role = 'caregiver'
refill_requests.requested_by_patient_id = caregiver_user_id
Doctor sees: "Refill requested by [Caregiver Name] on behalf of [Patient]"
```

---

---

# FEATURE 2: SYMPTOM & SIDE-EFFECT JOURNAL

## 2.1 PRD

### Purpose
Patients often experience side effects but don't report them until the next appointment — or not at all, leading to poor adherence ("I stopped taking it because it made me dizzy"). A lightweight, friction-free daily symptom log captures this data in structured form so doctors can make informed adjustments at the next visit.

This is **not** the Copilot or a diagnosis tool — it's pure patient observation: "I felt dizzy today, rated my energy 3/5."

### User Stories
- **As a patient**, I want to quickly log "How I'm feeling today" without typing long notes — a 1-5 scale with an optional comment is enough.
- **As a patient**, I want to see my past 30 days of logs so I can spot patterns ("every time I take the evening dose, I feel groggy").
- **As a doctor**, I want to see the patient's symptom log during a follow-up visit so I can correlate side effects with medication timing and adjust if needed.
- **As a doctor**, I want a flag if a patient reports consistently low energy or mood (score 1-2 for >5 consecutive days) so I can proactively reach out.
- **As a caregiver**, I want to enter symptom data for the patient I'm managing (elderly parent) if they can't use the app.

### Feature Matrix

| ID | Feature | Priority | Depends on |
|---|---|---|---|
| SJ-1 | Daily 1-5 scale "How are you feeling?" + optional note | P0 | New `symptom_logs` table |
| SJ-2 | Link symptom to a specific prescription (optional) | P0 | Dropdown of active prescriptions |
| SJ-3 | Visual calendar view of symptom logs (color-coded by score) | P1 | Frontend calendar rendering |
| SJ-4 | Doctor-visible symptom history in patient's profile | P0 | Read-only access via FastAPI |
| SJ-5 | Alerting: if score ≤2 for 5+ consecutive days, notify doctor | P1 | Scheduled job checking logs nightly |
| SJ-6 | Export symptom logs as PDF for doctor's review | P1 | Client-side PDF generation |
| SJ-7 | Caregiver can enter symptoms on patient's behalf | P1 | Caregiver link + role-check |
| SJ-8 | Symptom insight: "You rated energy low 6 times this week — discuss with your doctor?" | P2 | Post-processing, optional insight card |

### Success Metrics
- % of patients with 2+ prescriptions who log symptoms at least once per week (target: >40%).
- Doctor's utilization of symptom logs in follow-up visits (survey-based).
- Reduction in "I stopped taking X because of side effects" incidents (proxy: adherence maintenance on subsequent refills).

---

## 2.2 TRD

### Data Model

```sql
create table symptom_logs (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  logged_by_id uuid references app_users(id),  -- patient or caregiver
  logged_by_role text check (logged_by_role in ('patient', 'caregiver')),
  log_date date not null,
  feeling_score int not null check (feeling_score between 1 and 5),
  -- 1 = Very bad (severe symptoms)
  -- 2 = Bad (moderate symptoms)
  -- 3 = Okay (mild symptoms)
  -- 4 = Good (slight symptoms or minor discomfort)
  -- 5 = Excellent (no symptoms, feeling great)
  
  notes text,  -- optional free-text: "felt dizzy after evening dose", "headache started around 2pm"
  
  -- Optional context: link to a specific prescription if the symptom is suspected side effect
  related_prescription_id uuid references prescriptions(id) on delete set null,
  
  -- Symptom categories (multi-select via jsonb array)
  symptoms jsonb default '[]',  -- e.g. ["dizziness", "nausea", "headache", "fatigue", "mood_change", "sleep_issue", "none"]
  
  -- Energy, mood sub-scales (optional, if we want more granular data)
  energy_level int check (energy_level is null or energy_level between 1 and 5),
  mood_level int check (mood_level is null or mood_level between 1 and 5),
  sleep_quality int check (sleep_quality is null or sleep_quality between 1 and 5),
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table to track symptom alerts sent to doctors (so we don't spam with duplicate alerts)
create table symptom_alerts (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  prescribing_doctor_id uuid references app_users(id),
  alert_type text,  -- 'low_score_streak' | 'new_symptom_onset'
  consecutive_days_count int,  -- e.g. 5 days of score ≤2
  triggered_at timestamptz default now(),
  acknowledged_by_doctor boolean default false,
  acknowledged_at timestamptz
);
```

### Queries & Calculations

```sql
-- Get patient's logs for the past 30 days (for calendar view)
select 
  log_date, 
  feeling_score, 
  symptoms, 
  related_prescription_id,
  notes
from symptom_logs
where patient_id = :patient_id
  and log_date >= current_date - interval '30 days'
order by log_date desc;

-- Check for low-score streaks (for alerting)
with consecutive_low as (
  select 
    patient_id,
    count(*) as consecutive_days,
    min(log_date) as streak_start,
    max(log_date) as streak_end
  from symptom_logs
  where patient_id = :patient_id
    and feeling_score <= 2
    and log_date >= current_date - interval '30 days'
  group by patient_id, 
    (log_date - row_number() over (order by log_date))  -- group consecutive dates
  having count(*) >= 5
)
select * from consecutive_low;

-- Doctor's view: patient symptom summary (last 30 days)
select
  count(*) as total_logs,
  avg(feeling_score) as avg_score,
  min(feeling_score) as lowest_score,
  count(*) filter (where feeling_score <= 2) as low_score_days,
  count(*) filter (where symptoms @> '"dizziness"'::jsonb) as dizziness_count,
  count(*) filter (where symptoms @> '"nausea"'::jsonb) as nausea_count,
  count(*) filter (where symptoms @> '"fatigue"'::jsonb) as fatigue_count
from symptom_logs
where patient_id = :patient_id
  and log_date >= current_date - interval '30 days';
```

### Performance Targets
- Daily symptom log submit: < 500ms (simple insert, no AI processing).
- Symptom calendar load (30 days): < 1s.
- Doctor's symptom summary fetch: < 800ms.

### Security & Privacy
- A patient can only see/edit their own symptom logs.
- A caregiver (if linked) can see the patient's logs and add new ones, but cannot edit/delete past logs.
- A doctor can only see symptom logs for patients in their queue.
- Symptom logs are RLS-protected on Supabase like other patient data.

---

## 2.3 Architecture & Database

### RLS Policies

```sql
alter table symptom_logs enable row level security;
alter table symptom_alerts enable row level security;

-- Patients read/write own logs
create policy "symptom_logs_patient_rw" on symptom_logs
  for all using (
    patient_id in (select id from patients where portal_user_id = auth.uid())
  );

-- Doctors can read symptom logs for patients (handled via FastAPI service-role, not direct RLS)

-- Alerts: patients see alerts about their own data
create policy "symptom_alerts_patient_read" on symptom_alerts
  for select using (
    patient_id in (select id from patients where portal_user_id = auth.uid())
  );
```

### Indexes

```sql
create index idx_symptom_logs_patient_date on symptom_logs(patient_id, log_date desc);
create index idx_symptom_logs_score on symptom_logs(feeling_score);
create index idx_symptom_alerts_triggered_at on symptom_alerts(triggered_at desc);
```

---

## 2.4 API Endpoints

```
POST /api/patient/{id}/symptoms/log
     Body: {log_date, feeling_score, notes?, symptoms[], related_prescription_id?, energy_level?, mood_level?, sleep_quality?}
     Returns: {log_id, created_at}

GET  /api/patient/{id}/symptoms/logs?from=2026-08-01&to=2026-08-31
     Returns: [{log_date, feeling_score, symptoms, notes, prescription_name, logged_by_role}]

GET  /api/patient/{id}/symptoms/summary?days=30
     Returns: {avg_score, low_score_count, trending_symptoms, alert_flags}

GET  /api/doctor/{id}/patient/{patient_id}/symptoms
     (FastAPI, doctor-scoped, reads patient's symptom history)
     Returns: summary + last 30 days of logs

POST /api/patient/{id}/symptoms/export-pdf
     Returns: PDF of symptom calendar + summary stats

-- For caregivers (if enabled)
POST /api/caregiver/{caregiver_id}/patient/{patient_id}/symptoms/log
     Body: {log_date, feeling_score, notes?, ...}
     (Role-checked: only if caregiver_links.permissions includes 'symptom_log')
```

---

## 2.5 Cross-Role Data Flow

```
PATIENT SIDE:
Patient opens app, navigates to "Wellness Log" (new nav item)
  ↓
Sees: "How are you feeling today?"
  ↓
Selects feeling_score = 3 (Okay), taps to expand, checks "dizziness" symptom,
links to "Gabapin NT" prescription, adds note: "dizzy after evening dose"
  ↓
POST /api/patient/{id}/symptoms/log {log_date, feeling_score: 3, symptoms: ["dizziness"], related_prescription_id, notes}
  ↓
Supabase inserts symptom_logs row
  ↓
Frontend shows: "Logged! Help us understand: Is this a new side effect? [Yes] [No]"
  (This is just engagement, doesn't change data)

BACKGROUND JOB (runs nightly):
Looks for patients with feeling_score ≤ 2 for 5+ consecutive days
  ↓
If found: creates symptom_alerts row, sends alert to prescribing doctor
  ↓
WhatsApp notification to doctor: "[Patient Name] reported low well-being 
  for 5 consecutive days (avg score 1.8). Check their symptom log during 
  the next visit."

DOCTOR SIDE (during follow-up):
Patient comes for follow-up, doctor opens patient history
  ↓
New "Symptom Log" section visible, shows:
  - Calendar grid of past 30 days (green/yellow/red cells by score)
  - Trending symptoms: "Dizziness reported 6x, all on evening dose"
  - Alert banner: "Patient reported low well-being 5 days this month"
  ↓
Doctor reviews, adjusts prescription or asks follow-up questions
  ↓
Marks alert as acknowledged: POST /api/doctor/alerts/{id}/acknowledge
```

---

## 2.6 UI Specification

### Symptom Log Entry Screen (Mobile-First)

```
┌─────────────────────────────────────┐
│  Wellness Log                   [←]  │
├─────────────────────────────────────┤
│  How are you feeling today?          │
│  Today: Aug 14, 2026                 │
├─────────────────────────────────────┤
│  Your feeling (1 = worst, 5 = best): │
│                                       │
│  ○        ○        ○        ○        ●       │
│  1        2        3        4        5       │
│ Bad     Okay                      Great     │
│                                       │
├─────────────────────────────────────┤
│  Symptoms (check any that apply):    │
│  ☐ Dizziness / Vertigo               │
│  ☐ Nausea                            │
│  ☐ Headache                          │
│  ☐ Fatigue / Low Energy              │
│  ☐ Mood Changes                      │
│  ☐ Sleep Issues                      │
│  ☐ Other                             │
│                                       │
│  Energy Level (optional):            │
│  ○        ○        ○        ○        ●       │
│  Low                              High      │
│                                       │
│  Notes (optional):                   │
│  [ Dizzy after evening dose...    ]  │
│                                       │
│  Related to medicine (optional):     │
│  [ Gabapin NT 100mg ▾ ]              │
│                                       │
│  [ Save Log ]                        │
└─────────────────────────────────────┘
```

### Symptom Calendar View (30 Days)

```
┌─────────────────────────────────────┐
│  Wellness Calendar                   │
│  Past 30 Days                        │
├─────────────────────────────────────┤
│  Aug 2026                            │
│  Mo Tu We Th Fr Sa Su                │
│  [ ] [2][3][4][5] [●][●]             │  ← small colored circles in each day cell
│ [1] [●][●][2][3][4][5]               │
│ [1] [2][3][4][5][●][1]               │  ● = low score (1-2), ○ = okay (3), ◐ = good (4-5)
│ [2] [3][4][5][●][2][3]               │
│ [4] [5][●][3][2][1][2]               │
│                                       │
│  ■ Low (1-2)  □ Okay (3)  ◐ Good (4-5)  │
│                                       │
├─────────────────────────────────────┤
│  Stats (Past 30 Days):               │
│  • Average feeling: 3.1 / 5          │
│  • Low-score days: 6                 │
│  • Most common symptoms:             │
│    - Dizziness (6x)                  │
│    - Fatigue (4x)                    │
│                                       │
│  ⚠ Alert: You rated low feeling 6    │
│    days this month. Discuss with     │
│    your doctor on your next visit.   │
│                                       │
│  [View Detailed Logs] [Export PDF]   │
└─────────────────────────────────────┘
```

### Doctor's View of Patient Symptom Summary

```
┌─────────────────────────────────────────────┐
│  Patient Profile: Ramesh Kumar              │
├─────────────────────────────────────────────┤
│  [Prescriptions] [Labs] [Symptom Log] [X-Ray]│
│                         ↑ (selected)
├─────────────────────────────────────────────┤
│  Symptom Summary (Last 30 Days)             │
│  Average Well-Being Score: 2.9/5  🔴         │
│                                              │
│  Low-Score Days: 6 out of 30                │
│  ⚠ Alert: Consecutive low scores detected  │
│     (5 days with score ≤ 2)                 │
│     Triggered Aug 12, Status: Pending       │
│     [Acknowledge Alert]                     │
│                                              │
│  Trending Symptoms:                         │
│  • Dizziness (6 reports)                    │
│    - 5 after "evening dose"                 │
│    - Related prescription: Gabapin NT       │
│  • Fatigue (4 reports)                      │
│  • Sleep Issues (3 reports)                 │
│                                              │
│  Recent Logs:                               │
│  Aug 14: Score 2, "Dizzy, mild nausea"      │
│  Aug 13: Score 1, "Very fatigued, sad"      │
│  Aug 12: Score 2, "Dizziness continues"     │
│  Aug 11: Score 3, "Better today"            │
│  ...                                         │
│                                              │
│  Clinical Note (your template):             │
│  "Patient reports increased dizziness      │
│   since starting Gabapin NT. Consider       │
│   dose adjustment or alternative..."        │
│                                              │
│  [Request more info from patient]           │
│  [Prescribe adjustment] [Add Follow-up]     │
└─────────────────────────────────────────────┘
```

---

---

# FEATURE 3: FAMILY/CAREGIVER ACCESS

## 3.1 PRD

### Purpose
The biggest real-world blocker to medication adherence isn't the app — it's that someone needs to *remind* the patient, and that someone is almost never the patient themselves. A caregiver (adult child managing an elderly parent, spouse managing a partner with a chronic illness) needs:
- To see what medicines the patient is taking and when.
- To mark doses as taken (since the patient might not have a smartphone, or might forget to open the app).
- To get alerts when meds are running low or a dose was missed.
- To NOT have the ability to edit/delete clinical records or bypass doctor approvals.

This feature unlocks the product's real adherence value by making it a **two-person tool**, not just a one-person record.

### User Stories
- **As an adult child**, I want to monitor my elderly parent's medication adherence remotely and get alerts when they miss a dose.
- **As a caregiver**, I want to mark a dose as taken on behalf of my care recipient if they can't use the app.
- **As a caregiver**, I want to see their low-stock warnings so I can pick up refills before they run out.
- **As a patient**, I want to invite my daughter to help me manage my meds, with the ability to revoke access at any time.
- **As a doctor**, I want to see whether a dose was marked by the patient or a caregiver (for context — "patient's adherence is actually good, caregiver is covering").

### Feature Matrix

| ID | Feature | Priority | Depends on |
|---|---|---|---|
| CG-1 | Caregiver invitation flow (patient invites via phone/email) | P0 | New `caregiver_links` table + invitation tokens |
| CG-2 | Caregiver can view patient's active prescriptions & dosing timeline | P0 | RLS + caregiver-scoped reads |
| CG-3 | Caregiver can mark doses as taken on patient's behalf | P0 | intake_logs.marked_by_role = 'caregiver' |
| CG-4 | Caregiver alerts: low stock, missed doses, appointment reminders | P0 | New `caregiver_alerts` table + logic |
| CG-5 | Caregiver can access patient's symptom logs & lab results (read-only) | P1 | RLS policy extension |
| CG-6 | Caregiver can request refills on patient's behalf | P1 | Refill flow with caregiver_role check |
| CG-7 | Patient can see who marked each dose (audit trail) | P1 | intake_logs.marked_by_id + marked_by_role |
| CG-8 | Patient can revoke caregiver access immediately | P0 | caregiver_links.status = 'revoked' |
| CG-9 | Multiple caregivers (e.g. son + daughter both helping elderly parent) | P1 | Many-to-one caregiver_links |
| CG-10 | Doctor can see dose-marked-by-caregiver vs. patient (context) | P1 | Display in patient history view |

### Success Metrics
- % of patients with caregivers enabled who link at least one caregiver (target: >70% for elderly cohort).
- Adherence improvement in caregiver-enabled cohort vs. solo patients (target: +15-20 percentage points).
- Caregiver engagement (% who mark at least one dose, receive alerts, take action on alerts).

---

## 3.2 TRD

### Data Model

```sql
create type caregiver_role as enum ('parent_child', 'spouse', 'professional', 'other');
create type caregiver_permission as enum ('view', 'mark_doses', 'refill_requests', 'see_symptoms', 'see_labs');

create table caregiver_links (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  caregiver_user_id uuid references app_users(id) on delete cascade,
  caregiver_role caregiver_role,
  permissions caregiver_permission[] default '{view,mark_doses,refill_requests}',
  status text default 'pending',  -- pending | active | revoked | expired
  invited_at timestamptz default now(),
  activated_at timestamptz,
  revoked_at timestamptz,
  revoked_by text,  -- 'patient' | 'caregiver' (caregiver can opt out)
  
  check (status in ('pending','active','revoked','expired'))
);

create table caregiver_invitations (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  invited_phone_or_email text,
  invitation_token text unique,  -- signed JWT
  token_expires_at timestamptz,
  status text default 'pending',  -- pending | accepted | declined | expired
  accepted_by_user_id uuid references app_users(id),
  accepted_at timestamptz,
  created_at timestamptz default now()
);

create table caregiver_alerts (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  caregiver_user_id uuid references app_users(id) on delete cascade,
  alert_type text,  -- 'missed_dose' | 'low_stock' | 'appointment_reminder' | 'refill_requested'
  alert_data jsonb,  -- {medicine: "...", scheduled_time: "...", hours_overdue: 2}
  sent_at timestamptz default now(),
  acknowledged_at timestamptz,
  action_taken text  -- 'marked_dose' | 'requested_refill' | 'none'
);

-- Extend intake_logs to track who marked the dose
alter table intake_logs add column marked_by_id uuid references app_users(id);
alter table intake_logs add column marked_by_role text;  -- 'patient' | 'caregiver'
alter table intake_logs add column marked_at timestamptz;  -- when the toggle happened
```

### Queries

```sql
-- Get all caregivers for a patient (active links only)
select 
  c.id,
  u.full_name,
  u.phone,
  c.caregiver_role,
  c.permissions
from caregiver_links c
join app_users u on c.caregiver_user_id = u.id
where c.patient_id = :patient_id
  and c.status = 'active'
order by c.activated_at asc;

-- Caregiver's view of patient's prescriptions & current dosing state
select 
  p.id as prescription_id,
  pi.id as item_id,
  m.name as medicine,
  pi.dosage,
  pi.frequency,
  d.full_name as doctor,
  p.status,
  (
    select json_agg(json_build_object('dose_date', il.scheduled_at, 'taken', il.taken, 'marked_by_role', il.marked_by_role))
    from intake_logs il
    where il.prescription_item_id = pi.id
      and il.scheduled_at::date = current_date
  ) as today_logs
from prescriptions p
join prescription_items pi on p.id = pi.prescription_id
join medications m on pi.medication_id = m.id
join app_users d on p.doctor_id = d.id
where p.patient_id = :patient_id
  and p.status in ('verified', 'dispensed')
order by pi.id;

-- Audit: which doses were marked by caregiver vs. patient
select 
  il.scheduled_at,
  il.taken,
  il.marked_by_role,
  case when il.marked_by_role = 'caregiver' then u.full_name else 'Patient' end as marked_by,
  il.marked_at
from intake_logs il
left join app_users u on il.marked_by_id = u.id
where il.prescription_item_id = :item_id
order by il.scheduled_at desc;
```

### Performance Targets
- Caregiver invitation & acceptance: < 2s end-to-end.
- Caregiver viewing patient's timeline: < 1.2s (same as patient, cached data).
- Marking a dose from caregiver's view: < 800ms.
- Caregiver alerts: delivered within 5 minutes of trigger event.

### Security & Privacy
- A caregiver's phone/email is verified before they can access any patient data (via invitation token).
- A caregiver can only perform actions listed in their `permissions` array — no escaping to delete or edit records.
- A patient can revoke caregiver access instantly; the caregiver loses all visibility immediately (no "revocation pending" state).
- Caregiver audit trail: every action is logged with caregiver_user_id and marked_at timestamp.
- Caregiver cannot see sensitive info like the patient's SOAP notes, clinical notes, or doctor's test interpretations — only structured data (medicines, doses, symptoms).

---

## 3.3 Architecture & Database

### Invitation Flow (Email/SMS)

```
Patient (or account creator) invites phone number "+91-9876543210"
  ↓
POST /api/patient/{id}/caregiver/invite {phone, role: 'parent_child', permissions: [...]}
  ↓
Backend:
  1. Checks if phone already has a Sanjeevani account (via app_users.phone)
     - If YES: creates pending caregiver_links row
     - If NO: creates caregiver_invitations row with a signed JWT token
  2. Sends SMS: "Ramesh Kumar is inviting you to help manage their prescriptions. 
                Tap here to accept: https://app.sanjeevani.health/caregiver/accept?token=..."
  ↓
Recipient taps link
  ↓
If no account yet:
  - Redirects to signup with phone pre-filled
  - On signup completion: creates app_users row + activates caregiver_links
  ↓
If account exists:
  - Shows "Accept Caregiver Invite from Ramesh Kumar? [View Details] [Accept] [Decline]"
  - On Accept: activates caregiver_links, sends confirmation to patient
```

### RLS Policies (Caregiver Access)

```sql
alter table prescriptions enable row level security;
alter table intake_logs enable row level security;

-- Caregivers can read patient's prescriptions & intake logs (if they have the caregiver_links active)
create policy "prescriptions_caregiver_read" on prescriptions
  for select using (
    patient_id in (
      select patient_id from caregiver_links
      where caregiver_user_id = auth.uid()
        and status = 'active'
        and 'view' = any(permissions)
    )
  );

-- Caregivers can update intake_logs if they have 'mark_doses' permission
create policy "intake_logs_caregiver_update" on intake_logs
  for update using (
    prescription_item_id in (
      select pi.id from prescription_items pi
      join prescriptions p on pi.prescription_id = p.id
      join caregiver_links cl on p.patient_id = cl.patient_id
      where cl.caregiver_user_id = auth.uid()
        and cl.status = 'active'
        and 'mark_doses' = any(cl.permissions)
    )
  );

-- Caregivers can insert new intake_logs (marking a dose as taken)
create policy "intake_logs_caregiver_insert" on intake_logs
  for insert with check (
    prescription_item_id in (
      select pi.id from prescription_items pi
      join prescriptions p on pi.prescription_id = p.id
      join caregiver_links cl on p.patient_id = cl.patient_id
      where cl.caregiver_user_id = auth.uid()
        and cl.status = 'active'
        and 'mark_doses' = any(cl.permissions)
    )
  );
```

### Indexes

```sql
create index idx_caregiver_links_patient_status on caregiver_links(patient_id, status);
create index idx_caregiver_links_caregiver_id on caregiver_links(caregiver_user_id);
create index idx_intake_logs_marked_by on intake_logs(marked_by_role, marked_at);
create index idx_caregiver_alerts_caregiver_patient on caregiver_alerts(caregiver_user_id, patient_id);
```

---

## 3.4 API Endpoints

```
POST /api/patient/{id}/caregiver/invite
     Body: {phone_or_email, caregiver_role, permissions[]}
     Returns: {invitation_sent, token_expires_at}

POST /api/caregiver/accept-invitation
     Body: {token}
     Returns: {caregiver_links_activated, patient_name, patient_id}

POST /api/caregiver/{id}/decline-invitation
     Body: {token, reason?}
     Returns: {invitation_declined}

GET  /api/patient/{id}/caregivers
     Returns: [{id, name, phone, role, permissions, activated_at}]

DELETE /api/patient/{id}/caregivers/{caregiver_id}
     (Revoke caregiver access immediately)
     Returns: {revoked_at}

GET  /api/caregiver/{id}/patients
     (Caregivers viewing their list of managed patients)
     Returns: [{patient_id, patient_name, prescription_count, adherence_score}]

GET  /api/caregiver/{id}/patient/{patient_id}/timeline
     (Caregiver viewing patient's dosing schedule)
     Returns: [same as patient timeline, but marked_by_role included]

POST /api/caregiver/{id}/patient/{patient_id}/mark-dose
     Body: {intake_log_id, taken: true, marked_at}
     Returns: {updated_intake_log}

GET  /api/caregiver/{id}/alerts?filter=active
     Returns: [{alert_type, alert_data, sent_at, acknowledged}]

PATCH /api/caregiver/{id}/alerts/{alert_id}
     Body: {acknowledged: true, action_taken: 'marked_dose'}
     Returns: {acknowledged_at}
```

---

## 3.5 UI Specification

### Patient's Caregiver Management Screen

```
┌─────────────────────────────────────┐
│  My Caregivers                      │
├─────────────────────────────────────┤
│  Active Caregivers                   │
│  ┌─────────────────────────────────┐ │
│  │ Priya Kumar (Daughter)           │ │
│  │ +91-98765-43210                  │ │
│  │ Permissions: View, Mark Doses    │ │
│  │ Linked since Aug 10              │ │
│  │              [Revoke Access →]   │ │
│  └─────────────────────────────────┘ │
│                                       │
│  Pending Invitations                  │
│  ┌─────────────────────────────────┐ │
│  │ +91-99999-99999 (Spouse)         │ │
│  │ Invitation sent 2 hours ago      │ │
│  │              [Cancel] [Resend]   │ │
│  └─────────────────────────────────┘ │
│                                       │
│  [ + Invite a Caregiver ]            │
└─────────────────────────────────────┘
```

### Invite Caregiver Modal

```
┌─────────────────────────────────────┐
│  Invite a Caregiver           [✕]   │
├─────────────────────────────────────┤
│  Who will help manage your meds?    │
│                                       │
│  Phone Number or Email:              │
│  [ +91-XXXXX-XXXXX or email    ]    │
│                                       │
│  Their Relationship to You:          │
│  ○ Spouse/Partner                    │
│  ◉ Adult Child                       │
│  ○ Professional Caregiver            │
│  ○ Other                             │
│                                       │
│  What can they do?                   │
│  ☑ View my prescriptions             │
│  ☑ Mark doses as taken               │
│  ☑ Request refills on my behalf      │
│  ☐ See my symptom logs               │
│  ☐ See my lab results                │
│                                       │
│  [ Send Invitation ]                 │
└─────────────────────────────────────┘
```

### Revoke Confirmation

```
┌─────────────────────────────────────┐
│  Revoke Access?                     │
├─────────────────────────────────────┤
│  Remove Priya Kumar as caregiver?   │
│                                       │
│  She will no longer be able to:      │
│  • View your prescriptions           │
│  • Mark doses as taken               │
│  • Request refills on your behalf    │
│                                       │
│  This action is immediate and        │
│  cannot be undone from her device.   │
│                                       │
│  [ Yes, Revoke ] [ Cancel ]          │
└─────────────────────────────────────┘
```

### Caregiver's Dashboard (Viewing Managed Patients)

```
┌─────────────────────────────────────┐
│  My Patients                        │
├─────────────────────────────────────┤
│  ┌─────────────────────────────────┐ │
│  │ Ramesh Kumar (Father)            │ │
│  │ Adherence: 85% (Good)            │ │
│  │ 4 Active Medicines               │ │
│  │ 1 refill pending                 │ │
│  │           [View & Manage →]      │ │
│  └─────────────────────────────────┘ │
│  ┌─────────────────────────────────┐ │
│  │ Savitri Kumar (Mother)           │ │
│  │ Adherence: 60% (Fair)            │ │
│  │ 6 Active Medicines               │ │
│  │ ⚠ 2 doses missed today           │ │
│  │           [View & Manage →]      │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Caregiver's Patient Timeline (with "Mark Dose" Option)

```
┌─────────────────────────────────────┐
│  Ramesh Kumar — Today                │
│  You're helping manage his meds      │
├─────────────────────────────────────┤
│  08:00 AM                            │
│  ┌─────────────────────────────────┐ │
│  │ Noveron 500mg [HEART]            │ │
│  │ Marked taken at 08:15 by Ramesh  │ │
│  │                        ✓ [Undo]  │ │
│  └─────────────────────────────────┘ │
│  ┌─────────────────────────────────┐ │
│  │ Metformin 500mg [DIABETES]       │ │
│  │ ⏰ Due 30 mins ago                │ │
│  │                    [ Mark Taken ] │ │
│  └─────────────────────────────────┘ │
│  02:00 PM                            │
│  ┌─────────────────────────────────┐ │
│  │ Gabapin NT 100mg [NERVE]         │ │
│  │ Due in 2 hours                   │ │
│  │                    [ Mark Taken ] │ │
│  └─────────────────────────────────┘ │
│                                       │
│  ⏰ Reminders Managed:                │
│  Missed dose alert: Set for 2 hrs    │
│  after each scheduled time           │
│                                       │
│  [ Request Refill on his behalf ]    │
└─────────────────────────────────────┘
```

When caregiver marks a dose:
```
┌─────────────────────────────────────┐
│  ✓ Dose Marked as Taken              │
├─────────────────────────────────────┤
│  Metformin 500mg                     │
│  Marked by you (Priya) at 14:32      │
│                                       │
│  Status: Completed (Patient didn't   │
│  mark it, but you did on their       │
│  behalf)                              │
│                                       │
│  [ Undo ] [ Back to Timeline ]        │
└─────────────────────────────────────┘
```

---

## 3.6 Cross-Role Data Flow

```
INVITATION FLOW:
Patient (Ramesh) goes to "My Caregivers" → "Invite Caregiver"
  ↓
Fills in phone "+91-98765-43210", role="parent_child", permissions=["view","mark_doses","refill_requests"]
  ↓
POST /api/patient/{id}/caregiver/invite
  ↓
Backend checks: Does +91-98765-43210 already have a Sanjeevani account?
  - YES → creates caregiver_links row, status='active', sends WhatsApp "Priya Kumar is asking you to help..."
  - NO → creates caregiver_invitations row with signed JWT token, sends SMS with accept link

Priya taps SMS link (if no account yet)
  ↓
Signup flow with phone pre-filled
  ↓
On completion: app_users row created, caregiver_links activated
  ↓
Confirmation to Ramesh: "Priya Kumar is now helping you manage your prescriptions"

CAREGIVER VIEWING & MANAGING:
Priya opens app, sees "My Patients: Ramesh Kumar"
  ↓
Taps "View & Manage"
  ↓
GET /api/caregiver/{priya_id}/patient/{ramesh_id}/timeline
  ↓
Returns Ramesh's today's dosing schedule with:
  - Each dose's status (taken / pending)
  - Who marked it (Ramesh vs. Priya)
  - Option to mark pending doses [if Priya has mark_doses permission]
  ↓
Priya sees "Metformin due 30 mins ago, not marked yet"
  ↓
Taps [Mark Taken]
  ↓
POST /api/caregiver/{priya_id}/patient/{ramesh_id}/mark-dose
     {intake_log_id, taken: true, marked_at: now()}
  ↓
Backend:
  1. Updates intake_logs row: taken=true, marked_by_id=priya_id, marked_by_role='caregiver'
  2. Updates adherence_score for Ramesh
  3. Sends notification to Ramesh: "Priya marked your Metformin as taken at 14:32"

DOCTOR'S VIEW:
When doctor views Ramesh's history, they see in the dose audit:
  "Aug 14, 08:00 AM - Noveron 500mg - Marked by Priya (Caregiver) at 08:15"
  "Aug 14, 02:00 PM - Metformin 500mg - Marked by Ramesh (Patient) at 14:32"

This context helps doctor evaluate adherence: "Ramesh is taking morning doses but forgetting afternoon — Priya is covering."

CAREGIVER ALERTS:
System detects Ramesh missed an afternoon dose by 2 hours
  ↓
Creates caregiver_alerts row: alert_type='missed_dose', caregiver_user_id=priya_id
  ↓
Sends WhatsApp to Priya: "Your father missed Gabapin NT at 2 PM (due 30 mins ago). 
                           Remind him? [Yes, mark as taken] [Remind via call]"
  ↓
Priya taps [Yes, mark as taken]
  ↓
PATCH /api/caregiver/{priya_id}/alerts/{alert_id}
     {acknowledged: true, action_taken: 'marked_dose'}
  ↓
Same dose-marking flow as above, plus caregiver_alerts.acknowledged_at=now()
```

---

---

# FEATURE 4: SMARTER REMINDERS (BEYOND DOSE PINGS)

## 4.1 PRD

### Purpose
The current reminder system (§PT-12 in base spec, enhanced in Vault spec §5.3) sends:
- **Dose reminders:** "Take Metformin now" (automatic, ~1h before scheduled time).
- **Staff-sent reminders:** Doctor/receptionist custom message ("Follow-up Friday").

But it doesn't catch the most actionable moments:
- A patient misses a dose — should escalate after 2-3 hours, not just log it silently.
- A lab test was ordered — should remind "Time for your re-check" when the retest date is near.
- A prescription is expiring soon — should remind before the patient runs out (covered in Feature #1, but reminders can reinforce).

**Smarter Reminders** add escalation logic, multi-recipient (patient + caregiver), and smarter timing.

### User Stories
- **As a patient**, I want a gentle nudge if I forget a dose, so I don't wait 24h to realize I missed it.
- **As a caregiver**, I want to be alerted if the patient misses a dose I can't see in real time, so I can follow up.
- **As a patient**, I want a reminder when my lab test is due for re-check, so I don't forget to schedule it.
- **As a doctor**, I want the system to flag patients who consistently miss doses so I can intervene.

### Feature Matrix

| ID | Feature | Priority | Depends on |
|---|---|---|---|
| SR-1 | Missed-dose escalation: gentle nudge after 1h, stronger after 3h | P0 | Scheduled job checking intake_logs |
| SR-2 | Escalate missed-dose to caregiver if linked | P0 | caregiver_links + caregiver alerts |
| SR-3 | Lab/follow-up appointment reminder (based on diagnostic_orders) | P0 | diagnostic_orders + reminder scheduling |
| SR-4 | Weekly "missed doses" summary sent to patient & caregiver | P1 | Aggregation job |
| SR-5 | Doctor-facing: "This patient missed 3+ doses this week" alert | P1 | Threshold-based alert |
| SR-6 | Snooze/dismiss reminder with auto-escalation (snoozed for 1h, then re-notify) | P1 | reminder.snoozed_until logic |
| SR-7 | Refill + Low Stock combined reminder ("5 days left, refill expires in 3 days, act now") | P1 | Combine RF + PT-12 logic |
| SR-8 | Smart timing: don't remind during sleep hours (patient can set preferred alert window) | P2 | User preference for alert times |

### Success Metrics
- % of missed doses detected & addressed within 3 hours (target: >60%).
- Reduction in "patient missed an entire dose" incidents (target: -40% vs. baseline).
- Caregiver action rate on missed-dose alerts (target: >70% of caregivers respond within 1h).

---

## 4.2 TRD

### Data Model (Extend existing patient_reminders table from Vault spec)

```sql
-- Extend patient_reminders with escalation logic
alter table patient_reminders add column if not exists escalation_level int default 0;  -- 0=first nudge, 1=stronger, 2=crisis
alter table patient_reminders add column if not exists escalation_at timestamptz;  -- when to escalate
alter table patient_reminders add column if not exists snoozed_until timestamptz;  -- if patient snoozed, re-notify at this time
alter table patient_reminders add column if not exists notify_caregiver boolean default false;
alter table patient_reminders add column if not exists original_reminder_id uuid;  -- link escalation reminders to original

-- New table: scheduled reminders (cron jobs basically)
create table scheduled_reminder_jobs (
  id uuid primary key default uuid_generate_v4(),
  job_type text,  -- 'missed_dose_escalation' | 'lab_reminder' | 'refill_reminder' | 'weekly_summary'
  patient_id uuid references patients(id) on delete cascade,
  prescription_item_id uuid references prescription_items(id) on delete cascade,
  diagnostic_order_id uuid references diagnostic_orders(id) on delete cascade,
  next_run_at timestamptz,
  last_run_at timestamptz,
  enabled boolean default true
);

-- User preferences for reminders
create table reminder_preferences (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade unique,
  quiet_hours_start time,  -- e.g. 22:00 (10 PM)
  quiet_hours_end time,    -- e.g. 08:00 (8 AM)
  alert_channel text[] default '{in_app,whatsapp}',  -- can disable SMS if preferred
  escalation_enabled boolean default true,
  escalation_after_minutes int default 120,  -- escalate after 2h
  notify_caregiver_on_missed_dose boolean default true  -- if caregiver linked
);
```

### Scheduling & Escalation Logic

```python
# Pseudocode for missed-dose escalation job (runs every 15 minutes)

def check_missed_doses():
    for intake_log in intake_logs.filter(taken=False, scheduled_at < now() - 1h):
        prescription_item = intake_log.prescription_item
        patient = prescription_item.prescription.patient
        
        # Check if we already sent a reminder for this dose
        existing = patient_reminders.filter(
            related_intake_log_id=intake_log.id,
            status in ('pending', 'snoozed')
        ).first()
        
        if not existing:
            # First nudge (1 hour past due)
            send_reminder(
                patient_id=patient.id,
                title=f"Did you forget {prescription_item.medicine.name}?",
                message=f"It was due at {intake_log.scheduled_at.time()}. Tap to mark taken.",
                escalation_level=0,
                channels=['in_app', 'whatsapp']
            )
            notify_caregiver = False
        
        elif existing.escalation_level == 0 and existing.created_at < now() - 2h:
            # Second escalation (3 hours past due) — stronger tone
            send_reminder(
                patient_id=patient.id,
                title=f"⚠️ Missed {prescription_item.medicine.name}",
                message=f"This dose is now 3 hours overdue. It's important to take it soon.",
                escalation_level=1,
                channels=['in_app', 'whatsapp', 'sms'],  # add SMS
                related_intake_log_id=intake_log.id
            )
            notify_caregiver = True
        
        # Notify caregiver if linked
        if notify_caregiver:
            caregivers = caregiver_links.filter(
                patient_id=patient.id,
                status='active',
                'mark_doses' in permissions  # only if they can mark doses
            )
            for cg in caregivers:
                send_caregiver_alert(
                    caregiver_id=cg.caregiver_user_id,
                    alert_type='missed_dose',
                    alert_data={'medicine': ..., 'hours_overdue': 3},
                    notify_caregiver_on_missed_dose=True
                )
```

### Lab Reminder Scheduling

```python
# Runs daily, checks if a lab test is due for re-check

def check_lab_reminder_due():
    for order in diagnostic_orders.filter(status='results_ready'):
        lab_result = order.lab_results.first()
        if not lab_result:
            continue
        
        # Determine recheck interval based on test type (config-driven)
        # Common intervals: CBC (3m), Lipid Panel (1y), HbA1c (3m), BP (weekly)
        recheck_interval = get_recheck_interval(order.test_name)
        next_due_date = lab_result.created_at + recheck_interval
        
        # If due within 14 days, send reminder
        if next_due_date <= today() and next_due_date >= today() - timedelta(days=14):
            send_reminder(
                patient_id=order.patient_id,
                title=f"Time for {order.test_name} re-check",
                message=f"Your last {order.test_name} was {days_ago} days ago. 
                          Time to schedule the re-check. [Book Appointment]",
                related_diagnostic_order_id=order.id,
                channels=['in_app', 'whatsapp']
            )
```

### Weekly Missed-Dose Summary

```python
def send_weekly_summary():
    for patient in patients.filter(has_active_prescriptions=True):
        missed_this_week = intake_logs.filter(
            patient_id=patient.id,
            taken=False,
            scheduled_at >= today() - timedelta(days=7)
        ).count()
        
        if missed_this_week > 0:
            # Summarize for patient
            send_reminder(
                patient_id=patient.id,
                title="Weekly Adherence Summary",
                message=f"You missed {missed_this_week} doses this week. 
                          Review tips: [Set Reminders] [Caregiver Help]",
                escalation_level=0  # informational only
            )
            
            # Also for doctor (if missed_this_week > 2)
            if missed_this_week > 2:
                for doc in patient.prescribing_doctors():
                    send_doctor_alert(
                        doctor_id=doc.id,
                        alert_type='patient_poor_adherence',
                        message=f"{patient.name} missed {missed_this_week} doses this week.
                                 Consider follow-up.",
                        patient_id=patient.id
                    )
```

### Snooze & Re-escalation

```python
# When patient snoozes a reminder:
def snooze_reminder(reminder_id, snooze_minutes=60):
    reminder = patient_reminders.get(reminder_id)
    reminder.snoozed_until = now() + timedelta(minutes=snooze_minutes)
    reminder.status = 'snoozed'
    reminder.save()
    
    # Schedule automatic re-notification
    schedule_job(
        job_type='remind_after_snooze',
        run_at=reminder.snoozed_until,
        reminder_id=reminder_id
    )

# Runs at snoozed_until time:
def remind_after_snooze(reminder_id):
    reminder = patient_reminders.get(reminder_id)
    send_reminder(
        patient_id=reminder.patient_id,
        title=reminder.title,
        message=f"{reminder.message} (You snoozed this earlier.)",
        escalation_level=reminder.escalation_level + 1,
        channels=reminder.channel,
        original_reminder_id=reminder_id
    )
    reminder.status = 'resent_after_snooze'
    reminder.save()
```

### Performance Targets
- Missed-dose detection: within 5 minutes of the dose time passing.
- Escalation trigger: escalate within 2 hours of first nudge.
- Lab reminder scheduling: run daily, identify all due tests, send within 1 hour.
- Weekly summary: generate & send by Sunday evening.

---

## 4.3 API Endpoints

```
POST /api/patient/{id}/reminders/{reminder_id}/snooze
     Body: {snooze_minutes: 60}
     Returns: {snoozed_until}

POST /api/patient/{id}/reminder-preferences
     Body: {quiet_hours_start, quiet_hours_end, alert_channel[], escalation_enabled}
     Returns: {preferences_updated}

GET  /api/patient/{id}/reminders/summary?days=7
     Returns: {total_reminders_sent, missed_doses_detected, caregiver_actions, adherence_trend}

GET  /api/doctor/{id}/alerts/patient-adherence
     (Doctor's view of patients with poor adherence this week)
     Returns: [{patient_name, missed_dose_count, suggested_action}]
```

---

## 4.4 UI Specification

### Missed-Dose Escalation Flow

**First nudge (1h past due):**
```
┌─────────────────────────────────────┐
│  Did you forget your medicine?       │
├─────────────────────────────────────┤
│  Metformin 500mg was due at 2:00 PM │
│  (1 hour ago)                        │
│                                       │
│  [Mark Taken Now] [Snooze] [Skip]    │
└─────────────────────────────────────┘
```

**Second nudge (3h past due):**
```
┌─────────────────────────────────────┐
│  ⚠️ Missed Dose Alert                 │
├─────────────────────────────────────┤
│  Metformin 500mg is now 3 hours      │
│  overdue (was due at 2:00 PM).       │
│                                       │
│  It's important to take it soon.     │
│  [Mark Taken Now] [Snooze] [Skip]    │
│                                       │
│  Also notifying your caregiver...    │
└─────────────────────────────────────┘
```

### Caregiver Missed-Dose Alert

```
Notification: "Your mother missed Metformin at 2 PM (3 hours ago). 
              Mark as taken? [Yes] [No] [Call her]"

If [Yes]:
┌─────────────────────────────────────┐
│  ✓ Dose Marked                       │
├─────────────────────────────────────┤
│  Metformin 500mg                     │
│  Marked by you (Priya) just now      │
│                                       │
│  Your mother will see this as        │
│  marked by her caregiver.            │
└─────────────────────────────────────┘
```

### Weekly Summary (Patient)

```
┌─────────────────────────────────────┐
│  Weekly Adherence Summary            │
│  Aug 8–14, 2026                      │
├─────────────────────────────────────┤
│  Adherence Score: 81% (Good)         │
│  📊 Trend: Improved from 75% last wk │
│                                       │
│  Missed Doses: 3                     │
│  • Aug 10 (2:00 PM) — Metformin      │
│  • Aug 12 (8:00 AM) — Noveron        │
│  • Aug 13 (2:00 PM) — Gabapin        │
│                                       │
│  📌 Tip: You often miss afternoon    │
│     doses. Set a 1:30 PM reminder?   │
│     [Set Reminder] [Caregiver Help]  │
│                                       │
│  ✅ Medicines taken on time: 18/21   │
└─────────────────────────────────────┘
```

### Lab Reminder

```
┌─────────────────────────────────────┐
│  Lab Re-Check Due                    │
├─────────────────────────────────────┤
│  Complete Blood Count (CBC)          │
│  Last test: Aug 12 (3 months ago)    │
│                                       │
│  It's time to schedule your re-check │
│  with the lab so your doctor can     │
│  monitor your health.                │
│                                       │
│  [Book with Lab] [Call Clinic]       │
│  [Remind me later]                   │
└─────────────────────────────────────┘
```

### Reminder Preferences Screen

```
┌─────────────────────────────────────┐
│  Reminder Settings                   │
├─────────────────────────────────────┤
│  Dose Reminders                      │
│  ☑ Enabled                           │
│  Send 1 hour before each dose        │
│                                       │
│  Quiet Hours                         │
│  From 10:00 PM to 8:00 AM            │
│  [Edit]                              │
│  (No reminders sent during this time)│
│                                       │
│  Missed Dose Alerts                  │
│  ☑ Escalate if missed                │
│  First alert: 1 hour after due time  │
│  Second alert: 3 hours after due time│
│                                       │
│  Caregiver Notifications             │
│  ☑ Notify my caregiver if I miss a   │
│    dose (only if caregiver linked)   │
│                                       │
│  Alert Channels                      │
│  ☑ In-App                            │
│  ☑ WhatsApp                          │
│  ☐ SMS (additional cost)             │
│                                       │
│  [ Save Preferences ]                │
└─────────────────────────────────────┘
```

---

---

# SUMMARY: ALL 8 FEATURES AT A GLANCE

| Feature | Priority | Impact | Build Effort | When to Ship |
|---|---|---|---|---|
| **1. Refill Intelligence** | P0 | High (stock-out prevention) | Medium (1–2 weeks) | Phase 1 |
| **2. Symptom Journal** | P0 | High (doctor context + adherence insights) | Medium (1–2 weeks) | Phase 1 |
| **3. Caregiver Access** | P0 | Very High (adherence multiplier) | High (2–3 weeks) | Phase 1–2 |
| **4. Smarter Reminders** | P0 | High (catch missed doses in real time) | Medium (1–2 weeks) | Phase 1 |
| **5. Allergy Profile** | P1 | Medium (safety layer) | Low (3–5 days) | Phase 2 |
| **6. Report Explanations** | P1 | Medium (health literacy) | Low (3–5 days, template extension) | Phase 2 |
| **7. Cost Awareness** | P1 | Medium (perceived value, esp. India) | Low (2–3 days, reference data) | Phase 2 |
| **8. Visit Prep Assistant** | P1 | Medium (turns refusals actionable) | Medium (1 week) | Phase 2 |

**Recommended Ship Order:**
- **Week 1–3 (MVP+):** Features 1, 2, 3, 4 — these 4 solve the core adherence problem.
- **Week 4–6 (Phase 2):** Features 5, 6, 7, 8 — these compound the value with safety + literacy + engagement.

---

# IMPLEMENTATION ROADMAP

## Phase 1: Core Adherence (Weeks 1–3)
- **Week 1:** Refill Intelligence (RF-1 through RF-4) + Smarter Reminders (SR-1, SR-2) simultaneously (they share infrastructure).
- **Week 2:** Symptom Journal (SJ-1 through SJ-4) + Caregiver Access MVP (CG-1 through CG-3).
- **Week 3:** Caregiver Access Phase 2 (CG-4 through CG-7) + integration testing + edge cases (multiple caregivers, revocation, etc.).

### Shared Infrastructure (build once, use in all features):
- Scheduled job framework (Celery / FastAPI BackgroundTasks).
- Notification/alert dispatch (WhatsApp, in-app, SMS).
- RLS policy patterns for caregiver access (reusable for features 5–8).

---

## Phase 2: Trust & Engagement (Weeks 4–6)
- **Week 4:** Allergy Profile (AE-1, AE-2) + Report Explanations (RE-1, RE-2).
- **Week 5:** Cost Awareness (CA-1) + Visit Prep Assistant (VPA-1).
- **Week 6:** Polish, edge cases, beta test with 20–50 real patients, gather feedback.

---

# DATABASE MIGRATION PLAN

1. **Add all new tables at once** (don't drip-feed):
   - `refill_requests`, `refill_request_history`, `caregiver_links`, `caregiver_invitations`, `caregiver_alerts`
   - `symptom_logs`, `symptom_alerts`
   - `scheduled_reminder_jobs`, `reminder_preferences`
   - `allergy_profiles`, `cost_metadata` (for Feature 7)
   - Extend: `prescriptions` (add columns), `intake_logs` (add columns), `patient_reminders` (add columns)

2. **Run migrations in staging first**, test with synthetic data.

3. **Zero-downtime deployment:**
   - Add columns/tables with default values so old code doesn't break.
   - Deploy new code that populates/uses new fields.
   - Backfill historical data (e.g., if a patient has no `symptom_logs` yet, that's fine — it's optional).

---

# TESTING STRATEGY

## Unit Tests
- Adherence calculation (various frequency patterns, missed doses).
- Caregiver permission checks (role-based access control).
- Reminder escalation logic (mock time, test transitions).

## Integration Tests
- Refill request → doctor approval → pharmacy queue (end-to-end).
- Caregiver invitation → activation → dose marking (OAuth-like flow).
- Symptom log → doctor alert trigger (threshold logic).

## E2E Tests (with real Supabase staging DB)
- Patient + caregiver simultaneously marking doses, seeing real-time updates.
- Doctor approving refill while patient checks low-stock banner.
- Multiple caregivers managing same patient.

## Beta Test Cohort
- 20–50 real patients, mix of:
  - Solo users (adherence improvement measurement).
  - Caregiver-enabled users (engagement + adherence).
  - Elderly + tech-savvy (UI clarity test).
- Run for 2–4 weeks, collect daily engagement metrics + user feedback surveys.

---

# SUCCESS METRICS & OKRs

## Adherence (Primary)
- **KR1:** Average adherence score improves from 62% → 78% (Phase 1 + 2 users).
- **KR2:** % of patients avoiding stock-outs: >95%.
- **KR3:** Patients with caregivers show 15–20 percentage-point adherence advantage over solo patients.

## Engagement (Secondary)
- **KR1:** % of eligible patients linking a caregiver: >50% (elderly cohort), >30% (general).
- **KR2:** Symptom log weekly active users: >40%.
- **KR3:** Refill request fulfillment time: <24h (target: <12h).

## Safety & Trust (Tertiary)
- **KR1:** Doctor-reported "patient was safer because of the app": >70% (survey-based).
- **KR2:** Allergy/drug interaction flags actually caught (averted incidents): measurable reduction in post-hoc corrections.

---

# CONCLUSION

These 8 features transform the Sanjeevani patient portal from a **"read-only digital record"** into an **"active adherence partner"** that:
- Stops patients from running out of meds.
- Gives caregivers remote eyes & hands.
- Turns "don't diagnose" refusals into actionable visit prep.
- Flags safety issues proactively.
- Meets patients in their own language & health literacy level.

**Expected impact:** 15–20 percentage-point adherence improvement, with the biggest gains in elderly & polypharmacy cohorts — the patients who need it most.
