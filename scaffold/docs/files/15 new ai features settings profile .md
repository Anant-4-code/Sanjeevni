# Sanjeevani — New AI Features + Settings & Profile (All Roles)
### Ultra-Detailed PRD · TRD · DB · API · UI — Consolidated Single-App Version

**Fits into:** the single Next.js app from doc 14 (`/patient`, `/doctor`, `/reception`, `/pharmacy`, `/lab`), same light theme, same shared component library.

---

# PART A — NEW AI FEATURES (Per Role)

## A.1 Why These, Specifically

Everything already built (Copilot, OCR, X-ray, guardrail, symptom/refill/caregiver features) covers "understand and act on existing data." The gap is **AI that looks ahead** — predicting problems before they happen — and **AI that saves staff time** on the repetitive parts of their job that aren't yet touched (discharge summaries, lab interpretation drafts, inventory forecasting). The features below are picked because each one reuses AI infrastructure you already have (the same LLM pipeline, the same OCR pipeline, the same embedding/RAG store) rather than requiring new infra.

## A.2 Feature Matrix (New AI Features)

| ID | Feature | Role(s) | Reuses |
|---|---|---|---|
| AI-1 | **Risk Forecast Card** — predicts which patients in a doctor's panel are likely to have declining adherence or a complication in the next 7 days, based on symptom trend + adherence + vitals pattern | Doctor | Existing symptom_logs + intake_logs + LLM |
| AI-2 | **AI Draft Discharge / Referral Letter** — doctor dictates or types a short summary, LLM drafts a full structured discharge/referral letter for doctor to edit and sign | Doctor | Existing Whisper + LLM pipeline from SOAP notes |
| AI-3 | **Smart Differential Suggestions (non-diagnostic, doctor-only)** — given chief complaint + vitals + history, LLM suggests a checklist of things to rule out — explicitly a checklist aid, never a diagnosis, never patient-visible | Doctor | Existing LLM + RAG guideline store |
| AI-4 | **Auto-Triage Severity Suggestion** — as receptionist types the chief complaint, an AI suggests a severity level in real time (receptionist can always override) | Reception | Existing LLM, new lightweight classifier prompt |
| AI-5 | **Inventory Forecast & Reorder Suggestion** — predicts which medicines will run low based on dispensing velocity + pending refill requests, suggests reorder quantities | Pharmacy | New: simple time-series forecast, no new infra |
| AI-6 | **Drug Interaction Explainer for Pharmacists** — when a safety-lock badge appears (doctor-acknowledged interaction), pharmacist can tap "Explain" for a plain-language reason, not just a badge | Pharmacy | Existing guardrail + LLM |
| AI-7 | **Abnormal Result Flagging & Plain Summary Draft** — lab tech enters raw values, AI flags abnormal ones and drafts the plain-language patient summary (lab tech reviews/edits before it's visible to patient) | Lab | Existing plain-language pipeline (already built for patient reports) |
| AI-8 | **Patient-Facing Daily Health Tip** — one short, personalized tip on the patient dashboard based on their actual active conditions/meds (e.g., "Since you're on Metformin, try to keep meals consistent in timing") | Patient | Existing LLM, patient's own med list as context |
| AI-9 | **Smart Search Across Everything ("Ask about this patient")** — doctor/reception can type a natural-language question about a patient ("when was their last HbA1c and what was the trend?") and get an answer pulled from the full record, instead of manually digging through tabs | Doctor, Reception (limited) | Existing full-record endpoint (doc 12) + RAG over that patient's documents |
| AI-10 | **Voice Command Navigation (hands-free for doctor)** — "Show me Ramesh Kumar's X-ray" or "Open refill requests" navigates via voice, useful mid-examination | Doctor | Existing Whisper, new intent-routing layer |

None of these are diagnostic — AI-3 and AI-1 are explicitly framed as internal aids for a licensed doctor's own judgment, never shown to patients, and always logged as "AI-suggested, doctor confirmed/dismissed" so there's an audit trail of whether a doctor acted on or ignored a suggestion.

## A.3 Detail: AI-1 Risk Forecast Card (Doctor)

### PRD
- **Problem:** A doctor with 40+ patients has no way to know which 3 of them are quietly trending toward a bad outcome until they show up in crisis.
- **What it does:** Nightly job scores every patient using: adherence trend (declining?), symptom score trend (declining?), missed-dose frequency (increasing?), days since last visit vs. their condition's typical recheck interval. Produces a 0–100 "attention score" and a one-line reason.
- **Where it shows:** A small card at the top of the doctor's queue: "3 patients need attention this week" → expandable list.
- **Non-goals:** Never a diagnosis, never shown to the patient, never auto-messages the patient without doctor action.

### DB
```sql
create table if not exists patient_risk_scores (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid references app_users(id),
  score int check (score between 0 and 100),
  reason text,                      -- "Adherence dropped 20pp in 2 weeks + 2 low symptom scores"
  contributing_factors jsonb,       -- {"adherence_trend": -20, "symptom_trend": -1.1, "missed_doses_7d": 3}
  computed_at timestamptz default now(),
  doctor_action text,               -- 'reviewed' | 'contacted_patient' | 'dismissed' | null
  doctor_action_at timestamptz
);
create index idx_risk_scores_doctor_score on patient_risk_scores(doctor_id, score desc, computed_at desc);
```

### API
```
GET  /api/doctor/risk-scores?min_score=60
POST /api/doctor/risk-scores/{id}/action   { action: "contacted_patient" | "dismissed" | "reviewed" }
```

### UI
```
┌─────────────────────────────────────────────┐
│  ⚠ 3 Patients Need Attention This Week        │
│  ┌───────────────────────────────────────┐   │
│  │ Savitri Kumar          Risk: 78/100    │   │
│  │ Adherence dropped 20pp in 2 weeks +    │   │
│  │ 2 low well-being scores                │   │
│  │ [Review] [Mark Contacted] [Dismiss]    │   │
│  └───────────────────────────────────────┘   │
│  [Show all 3 →]                              │
└─────────────────────────────────────────────┘
```

## A.4 Detail: AI-9 Smart Search ("Ask about this patient")

### PRD
Doctor types a question in a search box on the patient's full-record screen: *"When was their last HbA1c and how has it trended?"* — gets a direct answer with a citation back to the source document, instead of manually opening the lab-trends chart and reading it themselves.

### API
```
POST /api/doctor/patient/{id}/ask
     { question: "When was their last HbA1c and how has it trended?" }
Returns:
{
  answer: "Last HbA1c was 6.9% on Aug 14, 2026, down from 7.8% six months ago — an improving trend.",
  sources: [{document_id, title, document_date}]
}
```
Implementation: pull the patient's `full-record` payload (doc 12), embed the relevant structured fields (labs, prescriptions, symptom summaries) into the prompt as context, answer strictly from that context, refuse ("I don't have that in this patient's record") if the answer isn't present rather than guessing.

### UI
```
┌─────────────────────────────────────────────┐
│  🔍 Ask about this patient...                │
│  [When was their last HbA1c?              ]  │
├─────────────────────────────────────────────┤
│  Last HbA1c was 6.9% on Aug 14, 2026, down   │
│  from 7.8% six months ago — improving.        │
│  Source: CBC Lab Report, Aug 14, 2026 [View] │
└─────────────────────────────────────────────┘
```

## A.5 Detail: AI-5 Inventory Forecast (Pharmacy)

### DB
```sql
create table if not exists inventory_forecasts (
  id uuid primary key default uuid_generate_v4(),
  medication_id uuid references medications(id),
  current_stock int,
  avg_daily_dispense numeric,
  days_until_stockout int,
  suggested_reorder_qty int,
  computed_at timestamptz default now()
);
```

### UI
```
┌─────────────────────────────────────────────┐
│  📦 Reorder Suggestions                       │
│  ┌───────────────────────────────────────┐   │
│  │ Metformin 500mg                        │   │
│  │ Stock: 340 · ~11 days left at current  │   │
│  │ dispensing rate                        │   │
│  │ Suggested reorder: 1,000 units          │   │
│  │ [Create Purchase Order] [Dismiss]      │   │
│  └───────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

## A.6 Detail: AI-8 Patient Daily Health Tip

Simple, low-risk, high perceived-value. One line, cached per day per patient (regenerate only once every 24h, not per page load), generated from the patient's own active medication/condition tags only — never generic filler.

```
┌─────────────────────────────────────────────┐
│  💡 Today's Tip                               │
│  Since you're on Metformin, try to keep your │
│  mealtimes consistent — it helps the medicine│
│  work steadily through the day.               │
└─────────────────────────────────────────────┘
```

---

# PART B — UNIFIED SETTINGS (All Roles, Shared Structure)

## B.1 Design Principle

One shared `<SettingsLayout>` component with a left-hand section list, reused at `/patient/settings`, `/doctor/settings`, `/reception/settings`, `/pharmacy/settings`, `/lab/settings` — the sections shown differ per role, but the visual shell, spacing, and interaction pattern (toggle, save-on-change vs. explicit save) are identical everywhere, matching the existing card/thin-border theme.

## B.2 Settings Sections Per Role

| Section | Patient | Doctor | Reception | Pharmacy | Lab |
|---|---|---|---|---|---|
| Profile (name, phone, email, photo) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Password & Security (change password, 2FA) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Notification Preferences (channels, quiet hours) | ✅ (full, per doc 09 §4) | ✅ (alert types) | ✅ | ✅ | ✅ |
| Language Preference | ✅ (regional languages) | ✅ (UI language) | ✅ | ✅ | ✅ |
| Caregiver Management | ✅ | — | — | — | — |
| Clinic/Department Info | — | ✅ | ✅ | ✅ | ✅ |
| Signature / Credentials (license no., specialty) | — | ✅ | — | — | — |
| Working Hours / Availability | — | ✅ | ✅ | ✅ | ✅ |
| Data & Privacy (export, delete account, consent log) | ✅ | ✅ | ✅ | ✅ | ✅ |
| AI Feature Toggles (per doc's new AI-1..10) | Tip on/off | Risk forecast, smart search, differential suggestions on/off | Auto-triage suggestion on/off | Inventory forecast on/off | Abnormal flagging on/off |
| Theme (light only for v1, per doc 14) | — | — | — | — | — |

## B.3 Database

```sql
create table if not exists user_settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references app_users(id) on delete cascade unique,

  -- notifications
  notify_channels text[] default '{in_app,whatsapp}',
  quiet_hours_start time,
  quiet_hours_end time,

  -- language
  ui_language text default 'en',
  regional_language text default 'en',   -- patient-facing content language

  -- ai feature toggles (role-relevant subset used per role)
  ai_risk_forecast_enabled boolean default true,
  ai_smart_search_enabled boolean default true,
  ai_differential_suggestions_enabled boolean default true,
  ai_daily_tip_enabled boolean default true,
  ai_auto_triage_enabled boolean default true,
  ai_inventory_forecast_enabled boolean default true,
  ai_abnormal_flagging_enabled boolean default true,

  updated_at timestamptz default now()
);

create table if not exists doctor_credentials (
  id uuid primary key default uuid_generate_v4(),
  doctor_id uuid references app_users(id) on delete cascade unique,
  license_number text,
  specialty text,
  qualifications text,
  signature_image_url text,
  clinic_name text,
  clinic_address text
);

create table if not exists staff_availability (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references app_users(id) on delete cascade,
  day_of_week int check (day_of_week between 0 and 6),
  start_time time,
  end_time time,
  is_available boolean default true
);
```

RLS: every row keyed to `user_id = auth.uid()`; a person only ever reads/writes their own settings — straightforward `for all using (user_id in (select id from app_users where portal_user_id = auth.uid()))` policy on each table.

## B.4 API

```
GET  /api/settings                     → current user's full settings object
PATCH /api/settings                    → partial update (notifications, language, ai toggles)
POST /api/settings/change-password     → { old_password, new_password }
POST /api/settings/profile-photo       → multipart upload, returns file_url

-- doctor only
GET  /api/settings/credentials
PATCH /api/settings/credentials

-- staff roles
GET  /api/settings/availability
PATCH /api/settings/availability       → [{day_of_week, start_time, end_time, is_available}]

-- all roles
GET  /api/settings/data-export         → triggers full personal-data export job
POST /api/settings/delete-account      → soft-delete request, requires confirmation
```

## B.5 UI — Shared Settings Shell

```
┌───────────────────────────────────────────────────────────┐
│  Settings                                                  │
├──────────────────┬──────────────────────────────────────────┤
│ ● Profile          │  PROFILE                                │
│   Password & Security │  ┌───────────┐                       │
│   Notifications    │  │  [Avatar]  │  [Change Photo]        │
│   Language          │  └───────────┘                       │
│   AI Features        │                                       │
│   Data & Privacy     │  Full Name                            │
│   (role-specific:     │  [ Dr. Ramesh Rai              ]    │
│    Credentials,       │                                       │
│    Availability,      │  Email                                │
│    Caregivers)        │  [ rai@sanjeevani.clinic        ]    │
│                     │                                       │
│                     │  Phone                                │
│                     │  [ +91-98765-43210             ]    │
│                     │                                       │
│                     │  [ Save Changes ]                     │
└──────────────────┴──────────────────────────────────────────┘
```

## B.6 UI — AI Features Section (Doctor Example)

```
┌───────────────────────────────────────────────────────────┐
│  AI FEATURES                                                │
├───────────────────────────────────────────────────────────┤
│  Risk Forecast Card                                         │
│  Highlights patients who may need extra attention           │
│  ●  On                                                       │
│                                                              │
│  Smart Search ("Ask about this patient")                    │
│  Natural-language search across a patient's full record     │
│  ●  On                                                       │
│                                                              │
│  Differential Suggestions                                    │
│  Non-diagnostic checklist aid shown only to you              │
│  ●  On                                                       │
│  ⓘ These suggestions are never shown to patients and never   │
│     replace your own clinical judgment.                      │
│                                                              │
│  [ Save Preferences ]                                        │
└───────────────────────────────────────────────────────────┘
```

## B.7 UI — Doctor Credentials Section

```
┌───────────────────────────────────────────────────────────┐
│  CREDENTIALS & CLINIC INFO                                   │
├───────────────────────────────────────────────────────────┤
│  Medical License Number                                      │
│  [ MH-12345-2018                                        ]   │
│                                                              │
│  Specialty                                                   │
│  [ Cardiology ▾ ]                                            │
│                                                              │
│  Qualifications                                               │
│  [ MBBS, MD (Cardiology)                                 ]   │
│                                                              │
│  Clinic Name                                                 │
│  [ Manikanta Neuro Centre                                ]   │
│                                                              │
│  Signature (used on prescriptions/discharge letters)         │
│  [Upload Signature Image]                                    │
│                                                              │
│  [ Save ]                                                     │
└───────────────────────────────────────────────────────────┘
```

---

# PART C — UNIFIED PROFILE (Public-Facing Card, Different From Settings)

## C.1 Distinction From Settings

**Settings** = private controls only the account owner sees. **Profile** = a lighter, glanceable identity card shown to *other* people in context — e.g., a patient sees their doctor's profile card (name, specialty, clinic) in the Care Team section; a doctor sees a patient's profile header at the top of every tab.

## C.2 Profile Card Variants

```
PATIENT'S OWN PROFILE HEADER (top of /patient/settings and /patient/vault):
┌─────────────────────────────────────────────┐
│  [Avatar]  Ramesh Kumar                       │
│            58 years · Male · +91-98765-43210 │
│            Patient ID: PT-00482               │
└─────────────────────────────────────────────┘

DOCTOR'S PROFILE CARD (shown to patients in "Care Team"):
┌─────────────────────────────────────────────┐
│  [Avatar]  Dr. V. K. Rai                LEAD  │
│            Consultant Cardiologist            │
│            Manikanta Neuro Centre              │
│            MH-12345-2018 · MBBS, MD           │
│            📞 +91-99899-85777                 │
└─────────────────────────────────────────────┘

PATIENT HEADER SHOWN TO DOCTOR (top of every patient-detail tab):
┌─────────────────────────────────────────────┐
│  Ramesh Kumar  ·  58y  ·  Male  ·  Token #14  │
│  PT-00482 · Registered Aug 10, 2026            │
└─────────────────────────────────────────────┘
```

## C.3 API

```
GET /api/profile/{user_id}          → public-safe subset (no password, no raw phone
                                       unless the requester has a legitimate reason —
                                       doctor viewing their own patient, patient viewing
                                       their own care-team doctor)
```

---

# PART D — BUILD PROMPT ADDENDUM

```
Add these on top of the consolidated single-app structure from doc 14:

1. Create `user_settings`, `doctor_credentials`, `staff_availability`,
   `patient_risk_scores`, `inventory_forecasts` tables + RLS (see Part B.3 / A.3 / A.5).

2. Build ONE shared `<SettingsLayout>` component at
   `components/settings/SettingsLayout.tsx`, reused at
   `/patient/settings`, `/doctor/settings`, `/reception/settings`,
   `/pharmacy/settings`, `/lab/settings` — role-specific sections are passed in as
   props/children, the shell (left nav, card style, save button) is identical
   everywhere per Part B.5.

3. Build ONE shared `<ProfileCard>` component with size variants ("full" for the
   owner's own settings header, "compact" for care-team / patient-header contexts)
   per Part C.2 — do not build three different profile card components per role.

4. Implement AI-1 (Risk Forecast) and AI-9 (Smart Search) first — highest doctor
   value, both reuse existing data you already compute (adherence, symptoms,
   full-record). Implement AI-8 (Daily Tip) next — lowest effort, immediate patient-
   facing value. AI-4, AI-5, AI-6, AI-7 follow in Phase 2 once the settings shell and
   the doctor AI features are stable.

5. Every AI feature must respect its `user_settings.ai_*_enabled` toggle — check it
   server-side before running the feature, not just client-side before rendering it,
   so a disabled feature costs zero LLM calls, not just zero UI.

6. Every AI suggestion that a professional (doctor/pharmacist/lab tech) can act on
   must log the action (`doctor_action`, `doctor_action_at` or equivalent) so there is
   always an audit trail of whether an AI suggestion was reviewed, acted on, or
   dismissed — never silently disappear a suggestion.
```