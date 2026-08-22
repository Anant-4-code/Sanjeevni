# Sanjeevani — Doctor CRM Layer
### PRD · TRD · DB · API · UI — CRM Features Layered on Top of the Clinical Workspace

**Fits into:** the single Next.js app (`/doctor/*`) from doc 14. This is an ADDITIVE layer — nothing here replaces the clinical tabs (Timeline, Vault, OCR, Prescribe, SOAP, Refills); it adds a CRM shell around them: pipeline view, tasks, notes timeline, tags, segments, analytics.

---

# PART A — PRD: What "CRM for a Doctor" Actually Means Here

A sales CRM tracks leads through a pipeline, logs every touchpoint, lets you tag/segment contacts, assign follow-up tasks, and gives a funnel/analytics view. Mapped to a doctor's real workflow, each of those has a direct clinical equivalent:

| CRM Concept | Doctor's Equivalent |
|---|---|
| Contact/Lead | Patient |
| Pipeline stage | Patient's care-journey stage (Intake → Active Treatment → Follow-Up → Stable/Discharged) |
| Deal value | (Optional) treatment priority/complexity weight — not billing |
| Task/Follow-up | "Call patient about test results," "Review refill request," "Schedule follow-up" |
| Notes/Activity timeline | Free-form doctor notes + auto-logged system events, one continuous feed per patient |
| Tags/Labels | "High Risk," "VIP," "Insurance Pending," "Non-Compliant," custom doctor-defined tags |
| Segments/Saved Views | "All diabetic patients with adherence < 70%," saved as a one-click filter |
| Funnel/Pipeline analytics | How many patients are in each stage, average time-in-stage, stage conversion |
| Automation rules | "If adherence drops below 50%, auto-tag High Risk and create a follow-up task" |
| Communication log | Every call/WhatsApp/SMS touchpoint logged against the patient, not just clinical events |

## Feature List

| ID | Feature | Priority |
|---|---|---|
| CRM-1 | Kanban pipeline view of all patients by care stage | P0 |
| CRM-2 | Drag-and-drop / dropdown stage transitions, logged with timestamp + reason | P0 |
| CRM-3 | Tasks & follow-ups — create, assign (self or staff), due date, priority, reminders | P0 |
| CRM-4 | Patient activity timeline — unified feed of notes, stage changes, prescriptions, calls, tasks | P0 |
| CRM-5 | Tags — custom, color-coded, multi-tag per patient, filterable | P0 |
| CRM-6 | Saved segments/views — save a filter combination (tag + stage + adherence range etc.) | P1 |
| CRM-7 | Pipeline analytics dashboard — counts per stage, average time-in-stage, overdue tasks | P1 |
| CRM-8 | Communication log — manually log a call/message touchpoint against a patient | P1 |
| CRM-9 | Automation rules (simple trigger → action) | P2 |
| CRM-10 | Bulk actions — select multiple patients in pipeline, bulk-tag or bulk-message | P2 |

---

# PART B — DATABASE MIGRATION (Supabase)

This is a complete, ready-to-run migration file. Save it as:

```
scaffold/supabase/migrations/20260822120000_doctor_crm_layer.sql
```

```sql
-- ============================================================================
-- Sanjeevani — Doctor CRM Layer Migration
-- Adds: pipeline stages, patient pipeline state, tasks, notes/activity timeline,
--       tags, saved segments, communication log, automation rules.
-- Safe to run multiple times (idempotent create-if-not-exists / guarded inserts).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PIPELINE STAGES (per-doctor customizable, seeded with sane defaults)
-- ----------------------------------------------------------------------------
create table if not exists crm_pipeline_stages (
  id uuid primary key default uuid_generate_v4(),
  doctor_id uuid references app_users(id) on delete cascade,
  name text not null,                      -- "Intake", "Active Treatment", "Follow-Up", "Stable"
  sort_order int not null default 0,
  color text default '#111111',            -- hex, used for kanban column header + badges
  is_terminal boolean default false,       -- true for "Discharged"/"Inactive" style end-states
  created_at timestamptz default now(),
  unique (doctor_id, name)
);

create index if not exists idx_crm_pipeline_stages_doctor on crm_pipeline_stages(doctor_id, sort_order);

-- ----------------------------------------------------------------------------
-- 2. PATIENT PIPELINE STATE (which stage each patient is in, per doctor)
-- ----------------------------------------------------------------------------
create table if not exists crm_patient_pipeline (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid references app_users(id) on delete cascade,
  stage_id uuid references crm_pipeline_stages(id),
  entered_stage_at timestamptz default now(),
  priority_weight int default 0,           -- optional "deal value" equivalent: care complexity/priority score
  source text,                             -- "walk-in", "referral", "online-booking"
  referred_by text,                        -- free text or another doctor's name
  updated_at timestamptz default now(),
  unique (patient_id, doctor_id)
);

create index if not exists idx_crm_patient_pipeline_doctor_stage on crm_patient_pipeline(doctor_id, stage_id);
create index if not exists idx_crm_patient_pipeline_patient on crm_patient_pipeline(patient_id);

-- Log every stage transition (for funnel/time-in-stage analytics)
create table if not exists crm_pipeline_stage_history (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid references app_users(id) on delete cascade,
  from_stage_id uuid references crm_pipeline_stages(id),
  to_stage_id uuid references crm_pipeline_stages(id),
  reason text,
  changed_by uuid references app_users(id),
  changed_at timestamptz default now()
);

create index if not exists idx_crm_stage_history_patient on crm_pipeline_stage_history(patient_id, changed_at desc);
create index if not exists idx_crm_stage_history_doctor on crm_pipeline_stage_history(doctor_id, changed_at desc);

-- ----------------------------------------------------------------------------
-- 3. TASKS & FOLLOW-UPS
-- ----------------------------------------------------------------------------
create table if not exists crm_tasks (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid references app_users(id) on delete cascade,   -- owning doctor's panel
  assigned_to_id uuid references app_users(id),                -- who must do it (doctor or staff)
  title text not null,
  description text,
  due_at timestamptz,
  priority text default 'normal' check (priority in ('low','normal','high','urgent')),
  status text default 'open' check (status in ('open','in_progress','done','cancelled')),
  completed_at timestamptz,
  created_by uuid references app_users(id),
  created_at timestamptz default now()
);

create index if not exists idx_crm_tasks_assigned_status on crm_tasks(assigned_to_id, status, due_at);
create index if not exists idx_crm_tasks_patient on crm_tasks(patient_id, status);
create index if not exists idx_crm_tasks_doctor_due on crm_tasks(doctor_id, due_at) where status = 'open';

-- ----------------------------------------------------------------------------
-- 4. NOTES / UNIFIED ACTIVITY TIMELINE
-- ----------------------------------------------------------------------------
-- Free-form CRM notes (distinct from clinical SOAP notes / verification_logs)
create table if not exists crm_patient_notes (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid references app_users(id) on delete cascade,
  author_id uuid references app_users(id),
  body text not null,
  pinned boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_crm_notes_patient on crm_patient_notes(patient_id, created_at desc);

-- Unified activity feed: a single append-only log that aggregates note/task/stage/
-- prescription/communication events so the UI can render one continuous timeline
-- without joining 5 tables client-side. Populated by triggers (below) + explicit inserts.
create table if not exists crm_activity_log (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid references app_users(id) on delete cascade,
  event_type text not null,   -- 'note' | 'task_created' | 'task_completed' | 'stage_changed'
                               -- | 'prescription_verified' | 'communication' | 'tag_added'
  event_summary text not null,        -- short human-readable line for the feed
  event_data jsonb default '{}',      -- structured payload (task_id, stage ids, etc.)
  actor_id uuid references app_users(id),
  occurred_at timestamptz default now()
);

create index if not exists idx_crm_activity_patient_time on crm_activity_log(patient_id, occurred_at desc);
create index if not exists idx_crm_activity_doctor_time on crm_activity_log(doctor_id, occurred_at desc);

-- ----------------------------------------------------------------------------
-- 5. TAGS
-- ----------------------------------------------------------------------------
create table if not exists crm_tags (
  id uuid primary key default uuid_generate_v4(),
  doctor_id uuid references app_users(id) on delete cascade,
  name text not null,
  color text default '#6b7280',
  created_at timestamptz default now(),
  unique (doctor_id, name)
);

create table if not exists crm_patient_tags (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  tag_id uuid references crm_tags(id) on delete cascade,
  applied_by uuid references app_users(id),
  applied_at timestamptz default now(),
  unique (patient_id, tag_id)
);

create index if not exists idx_crm_patient_tags_patient on crm_patient_tags(patient_id);
create index if not exists idx_crm_patient_tags_tag on crm_patient_tags(tag_id);

-- ----------------------------------------------------------------------------
-- 6. SAVED SEGMENTS / VIEWS
-- ----------------------------------------------------------------------------
create table if not exists crm_saved_segments (
  id uuid primary key default uuid_generate_v4(),
  doctor_id uuid references app_users(id) on delete cascade,
  name text not null,
  filter_json jsonb not null,   -- {"tags": ["high-risk"], "stage": "active-treatment",
                                 --  "adherence_max": 70, "condition_tag": "DIABETES"}
  created_at timestamptz default now()
);

create index if not exists idx_crm_saved_segments_doctor on crm_saved_segments(doctor_id);

-- ----------------------------------------------------------------------------
-- 7. COMMUNICATION LOG (manual touchpoint logging)
-- ----------------------------------------------------------------------------
create table if not exists crm_communication_log (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid references app_users(id) on delete cascade,
  channel text check (channel in ('call','whatsapp','sms','email','in_person')),
  direction text check (direction in ('outbound','inbound')),
  summary text not null,
  logged_by uuid references app_users(id),
  occurred_at timestamptz default now()
);

create index if not exists idx_crm_comm_log_patient on crm_communication_log(patient_id, occurred_at desc);

-- ----------------------------------------------------------------------------
-- 8. AUTOMATION RULES (simple trigger -> action, evaluated by a background job)
-- ----------------------------------------------------------------------------
create table if not exists crm_automation_rules (
  id uuid primary key default uuid_generate_v4(),
  doctor_id uuid references app_users(id) on delete cascade,
  name text not null,
  trigger_type text not null,    -- 'adherence_below' | 'missed_dose_count' | 'stage_stale_days' | 'symptom_alert'
  trigger_params jsonb default '{}',   -- {"threshold": 50} or {"days": 14}
  action_type text not null,     -- 'add_tag' | 'create_task' | 'move_stage' | 'notify_doctor'
  action_params jsonb default '{}',    -- {"tag_name": "High Risk"} or {"task_title": "..."}
  is_active boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_crm_automation_doctor_active on crm_automation_rules(doctor_id, is_active);

create table if not exists crm_automation_run_log (
  id uuid primary key default uuid_generate_v4(),
  rule_id uuid references crm_automation_rules(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  action_taken text,
  ran_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 9. SEED DEFAULT PIPELINE STAGES FOR EVERY EXISTING DOCTOR
-- ----------------------------------------------------------------------------
insert into crm_pipeline_stages (doctor_id, name, sort_order, color, is_terminal)
select
  au.id,
  stage.name,
  stage.sort_order,
  stage.color,
  stage.is_terminal
from app_users au
cross join (
  values
    ('New Intake',        0, '#6b7280', false),
    ('Consultation',       1, '#3b82f6', false),
    ('Active Treatment',   2, '#f59e0b', false),
    ('Follow-Up',          3, '#8b5cf6', false),
    ('Stable / Discharged',4, '#2ea876', true)
) as stage(name, sort_order, color, is_terminal)
where au.role = 'doctor'
on conflict (doctor_id, name) do nothing;

-- ----------------------------------------------------------------------------
-- 10. TRIGGERS: auto-populate crm_activity_log from the tables above
-- ----------------------------------------------------------------------------
create or replace function crm_log_note_activity() returns trigger as $$
begin
  insert into crm_activity_log (patient_id, doctor_id, event_type, event_summary, event_data, actor_id)
  values (
    new.patient_id, new.doctor_id, 'note',
    left(new.body, 140),
    jsonb_build_object('note_id', new.id),
    new.author_id
  );
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_crm_log_note on crm_patient_notes;
create trigger trg_crm_log_note
after insert on crm_patient_notes
for each row execute function crm_log_note_activity();


create or replace function crm_log_task_activity() returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    insert into crm_activity_log (patient_id, doctor_id, event_type, event_summary, event_data, actor_id)
    values (new.patient_id, new.doctor_id, 'task_created', new.title,
            jsonb_build_object('task_id', new.id), new.created_by);
  elsif TG_OP = 'UPDATE' and new.status = 'done' and old.status <> 'done' then
    insert into crm_activity_log (patient_id, doctor_id, event_type, event_summary, event_data, actor_id)
    values (new.patient_id, new.doctor_id, 'task_completed', new.title,
            jsonb_build_object('task_id', new.id), new.assigned_to_id);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_crm_log_task on crm_tasks;
create trigger trg_crm_log_task
after insert or update on crm_tasks
for each row execute function crm_log_task_activity();


create or replace function crm_log_stage_change() returns trigger as $$
begin
  insert into crm_pipeline_stage_history (patient_id, doctor_id, from_stage_id, to_stage_id, changed_by)
  values (new.patient_id, new.doctor_id, old.stage_id, new.stage_id, null);

  insert into crm_activity_log (patient_id, doctor_id, event_type, event_summary, event_data)
  values (
    new.patient_id, new.doctor_id, 'stage_changed',
    'Moved to a new pipeline stage',
    jsonb_build_object('from_stage_id', old.stage_id, 'to_stage_id', new.stage_id)
  );
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_crm_log_stage_change on crm_patient_pipeline;
create trigger trg_crm_log_stage_change
after update of stage_id on crm_patient_pipeline
for each row
when (old.stage_id is distinct from new.stage_id)
execute function crm_log_stage_change();

-- ----------------------------------------------------------------------------
-- 11. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
alter table crm_pipeline_stages       enable row level security;
alter table crm_patient_pipeline      enable row level security;
alter table crm_pipeline_stage_history enable row level security;
alter table crm_tasks                 enable row level security;
alter table crm_patient_notes         enable row level security;
alter table crm_activity_log          enable row level security;
alter table crm_tags                  enable row level security;
alter table crm_patient_tags          enable row level security;
alter table crm_saved_segments        enable row level security;
alter table crm_communication_log     enable row level security;
alter table crm_automation_rules      enable row level security;
alter table crm_automation_run_log    enable row level security;

-- Default posture: deny all direct client access. Every doctor CRM read/write goes
-- through FastAPI (service-role), consistent with the rest of the doctor data-access
-- pattern established in doc 10 §2.1 — these policies are a defense-in-depth backstop,
-- not the primary access control mechanism.
create policy "crm_pipeline_stages_service_only" on crm_pipeline_stages for all using (false);
create policy "crm_patient_pipeline_service_only" on crm_patient_pipeline for all using (false);
create policy "crm_stage_history_service_only" on crm_pipeline_stage_history for all using (false);
create policy "crm_tasks_service_only" on crm_tasks for all using (false);
create policy "crm_notes_service_only" on crm_patient_notes for all using (false);
create policy "crm_activity_log_service_only" on crm_activity_log for all using (false);
create policy "crm_tags_service_only" on crm_tags for all using (false);
create policy "crm_patient_tags_service_only" on crm_patient_tags for all using (false);
create policy "crm_saved_segments_service_only" on crm_saved_segments for all using (false);
create policy "crm_communication_log_service_only" on crm_communication_log for all using (false);
create policy "crm_automation_rules_service_only" on crm_automation_rules for all using (false);
create policy "crm_automation_run_log_service_only" on crm_automation_run_log for all using (false);

-- ============================================================================
-- END MIGRATION
-- ============================================================================
```

---

# PART C — API SPECIFICATION

```
-- Pipeline
GET   /api/doctor/crm/pipeline                      → all stages + patients grouped by stage
PATCH /api/doctor/crm/patient/{id}/stage             { stage_id, reason? }
GET   /api/doctor/crm/stages
POST  /api/doctor/crm/stages                         { name, color, sort_order }
PATCH /api/doctor/crm/stages/{id}
DELETE /api/doctor/crm/stages/{id}

-- Tasks
GET   /api/doctor/crm/tasks?status=open&assigned_to=me
POST  /api/doctor/crm/tasks                          { patient_id, title, due_at, priority, assigned_to_id? }
PATCH /api/doctor/crm/tasks/{id}                      { status?, due_at?, ... }

-- Notes & Activity
GET   /api/doctor/crm/patient/{id}/activity           → unified feed (notes+tasks+stage+clinical events)
POST  /api/doctor/crm/patient/{id}/notes              { body, pinned? }

-- Tags
GET   /api/doctor/crm/tags
POST  /api/doctor/crm/tags                            { name, color }
POST  /api/doctor/crm/patient/{id}/tags               { tag_id }
DELETE /api/doctor/crm/patient/{id}/tags/{tag_id}

-- Segments
GET   /api/doctor/crm/segments
POST  /api/doctor/crm/segments                        { name, filter_json }
GET   /api/doctor/crm/segments/{id}/patients

-- Communication log
POST  /api/doctor/crm/patient/{id}/communications      { channel, direction, summary }

-- Analytics
GET   /api/doctor/crm/analytics/funnel                 → count per stage, avg time-in-stage
GET   /api/doctor/crm/analytics/tasks-overdue

-- Automation
GET   /api/doctor/crm/automations
POST  /api/doctor/crm/automations                      { name, trigger_type, trigger_params, action_type, action_params }
PATCH /api/doctor/crm/automations/{id}                 { is_active }
```

---

# PART D — UI

## D.1 Pipeline (Kanban) View — `/doctor/crm`

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Patient Pipeline                          [+ New Task] [Segments ▾] [⚙]  │
├───────────┬───────────────┬────────────────┬─────────────┬──────────────┤
│ NEW INTAKE│ CONSULTATION  │ ACTIVE TREATMENT│ FOLLOW-UP   │ STABLE/DISCH.│
│    (3)    │     (2)       │      (5)        │    (4)      │    (12)      │
├───────────┼───────────────┼────────────────┼─────────────┼──────────────┤
│ ┌───────┐ │ ┌───────────┐ │ ┌────────────┐ │ ┌─────────┐ │ ┌──────────┐ │
│ │Sita D.│ │ │Anil Patel │ │ │Ramesh Kumar│ │ │Priya S. │ │ │...        │ │
│ │URGENT │ │ │ROUTINE    │ │ │🏷 High Risk│ │ │2d overdue│ │ └──────────┘ │
│ │       │ │ │           │ │ │task        │ │ │task     │ │              │
│ └───────┘ │ └───────────┘ │ └────────────┘ │ └─────────┘ │              │
│           │               │                │             │              │
│ [+ Card]  │               │                │             │              │
└───────────┴───────────────┴────────────────┴─────────────┴──────────────┘
```
Each card: patient name, severity/tag chips, an overdue-task indicator if applicable. Drag between columns → `PATCH /crm/patient/{id}/stage`, prompts an optional one-line reason.

## D.2 Patient Activity Timeline (inside patient detail, new "CRM" tab alongside Timeline/Vault/OCR/etc.)

```
┌─────────────────────────────────────────────┐
│  🏷 High Risk  🏷 Diabetic          [+ Tag]  │
│  Stage: Active Treatment  [Move Stage ▾]     │
├─────────────────────────────────────────────┤
│  + Add a note...                              │
├─────────────────────────────────────────────┤
│  Today, 2:15 PM — Note (Dr. Rai)              │
│  "Discussed dizziness, will monitor 2 weeks." │
│                                                │
│  Today, 11:00 AM — ✓ Task completed           │
│  "Call patient about lab results"              │
│                                                │
│  Yesterday — Prescription Verified             │
│  Gabapin NT 100mg, 10 days                    │
│                                                │
│  Aug 12 — Stage changed                        │
│  Consultation → Active Treatment               │
│                                                │
│  Aug 10 — 📞 Call logged (outbound)            │
│  "Reminded about upcoming appointment"          │
└─────────────────────────────────────────────┘
```

## D.3 Tasks Panel (Doctor's own task list, across all patients)

```
┌─────────────────────────────────────────────┐
│  My Tasks                    [+ New Task]     │
├─────────────────────────────────────────────┤
│  🔴 OVERDUE                                   │
│  ☐ Call Priya Sharma re: headache follow-up  │
│    Patient · Due Aug 15 (2 days ago)          │
│                                                │
│  TODAY                                        │
│  ☐ Review Ramesh Kumar's refill request       │
│    Due today, 5:00 PM                          │
│                                                │
│  UPCOMING                                     │
│  ☐ Schedule Anil Patel's annual checkup       │
│    Due Aug 25                                 │
└─────────────────────────────────────────────┘
```

## D.4 Analytics Dashboard

```
┌─────────────────────────────────────────────┐
│  Pipeline Analytics                           │
├─────────────────────────────────────────────┤
│  Patients per Stage                           │
│  New Intake ████ 3     Consultation ██ 2     │
│  Active Tx ███████ 5   Follow-Up █████ 4     │
│  Stable ████████████ 12                       │
│                                                │
│  Avg Time in Stage: Active Treatment — 18 days│
│  Overdue Tasks: 3                             │
│  Patients tagged "High Risk": 4               │
└─────────────────────────────────────────────┘
```

---

# PART E — BUILD PROMPT

```
1. Run the migration file exactly as written in Part B against your Supabase project
   (`supabase db push` or apply via the SQL editor) — it is idempotent and safe to
   re-run.

2. Add a new top-level nav item "Pipeline" in the doctor app (from doc 14's
   consolidated single-app structure) at `/doctor/crm`, plus a new "CRM" tab inside
   the existing `/doctor/patient/[patientId]/...` tab strip alongside Timeline,
   Vault, OCR, Prescribe, SOAP, Refills.

3. Build the Kanban board (Part D.1) using simple HTML5 drag-and-drop or a lightweight
   library (dnd-kit) — on drop, call `PATCH /crm/patient/{id}/stage` and optimistically
   move the card, rolling back on error.

4. Build the unified activity timeline (Part D.2) as a single component that renders
   `crm_activity_log` rows differently by `event_type` (icon + color per type), fed
   entirely by the triggers already defined in the migration — do not hand-assemble
   this feed by querying 5 separate tables client-side.

5. Wire tags as a multi-select chip input on the patient CRM tab; wire saved segments
   as a simple filter-builder (tag picker + stage picker + adherence range slider)
   that serializes to `filter_json` exactly as shown in the migration's example.

6. Automation rules (CRM-9) are Phase 2 — build the CRUD UI for defining rules first,
   then a nightly job that evaluates `crm_automation_rules` against current patient
   data and writes to `crm_automation_run_log` + performs the action (add_tag /
   create_task / move_stage / notify_doctor). Do not let an automation rule silently
   perform an action with no log row — every automated action must be traceable back
   to the rule that caused it.
```












-- ============================================================================
-- Sanjeevani — Doctor CRM Layer Migration
-- Adds: pipeline stages, patient pipeline state, tasks, notes/activity timeline,
--       tags, saved segments, communication log, automation rules.
-- Safe to run multiple times (idempotent create-if-not-exists / guarded inserts).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PIPELINE STAGES (per-doctor customizable, seeded with sane defaults)
-- ----------------------------------------------------------------------------
create table if not exists crm_pipeline_stages (
  id uuid primary key default uuid_generate_v4(),
  doctor_id uuid references app_users(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  color text default '#111111',
  is_terminal boolean default false,
  created_at timestamptz default now(),
  unique (doctor_id, name)
);

create index if not exists idx_crm_pipeline_stages_doctor on crm_pipeline_stages(doctor_id, sort_order);

-- ----------------------------------------------------------------------------
-- 2. PATIENT PIPELINE STATE
-- ----------------------------------------------------------------------------
create table if not exists crm_patient_pipeline (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid references app_users(id) on delete cascade,
  stage_id uuid references crm_pipeline_stages(id),
  entered_stage_at timestamptz default now(),
  priority_weight int default 0,
  source text,
  referred_by text,
  updated_at timestamptz default now(),
  unique (patient_id, doctor_id)
);

create index if not exists idx_crm_patient_pipeline_doctor_stage on crm_patient_pipeline(doctor_id, stage_id);
create index if not exists idx_crm_patient_pipeline_patient on crm_patient_pipeline(patient_id);

create table if not exists crm_pipeline_stage_history (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid references app_users(id) on delete cascade,
  from_stage_id uuid references crm_pipeline_stages(id),
  to_stage_id uuid references crm_pipeline_stages(id),
  reason text,
  changed_by uuid references app_users(id),
  changed_at timestamptz default now()
);

create index if not exists idx_crm_stage_history_patient on crm_pipeline_stage_history(patient_id, changed_at desc);
create index if not exists idx_crm_stage_history_doctor on crm_pipeline_stage_history(doctor_id, changed_at desc);

-- ----------------------------------------------------------------------------
-- 3. TASKS & FOLLOW-UPS
-- ----------------------------------------------------------------------------
create table if not exists crm_tasks (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid references app_users(id) on delete cascade,
  assigned_to_id uuid references app_users(id),
  title text not null,
  description text,
  due_at timestamptz,
  priority text default 'normal' check (priority in ('low','normal','high','urgent')),
  status text default 'open' check (status in ('open','in_progress','done','cancelled')),
  completed_at timestamptz,
  created_by uuid references app_users(id),
  created_at timestamptz default now()
);

create index if not exists idx_crm_tasks_assigned_status on crm_tasks(assigned_to_id, status, due_at);
create index if not exists idx_crm_tasks_patient on crm_tasks(patient_id, status);
create index if not exists idx_crm_tasks_doctor_due on crm_tasks(doctor_id, due_at) where status = 'open';

-- ----------------------------------------------------------------------------
-- 4. NOTES / UNIFIED ACTIVITY TIMELINE
-- ----------------------------------------------------------------------------
create table if not exists crm_patient_notes (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid references app_users(id) on delete cascade,
  author_id uuid references app_users(id),
  body text not null,
  pinned boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_crm_notes_patient on crm_patient_notes(patient_id, created_at desc);

create table if not exists crm_activity_log (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid references app_users(id) on delete cascade,
  event_type text not null,
  event_summary text not null,
  event_data jsonb default '{}',
  actor_id uuid references app_users(id),
  occurred_at timestamptz default now()
);

create index if not exists idx_crm_activity_patient_time on crm_activity_log(patient_id, occurred_at desc);
create index if not exists idx_crm_activity_doctor_time on crm_activity_log(doctor_id, occurred_at desc);

-- ----------------------------------------------------------------------------
-- 5. TAGS
-- ----------------------------------------------------------------------------
create table if not exists crm_tags (
  id uuid primary key default uuid_generate_v4(),
  doctor_id uuid references app_users(id) on delete cascade,
  name text not null,
  color text default '#6b7280',
  created_at timestamptz default now(),
  unique (doctor_id, name)
);

create table if not exists crm_patient_tags (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  tag_id uuid references crm_tags(id) on delete cascade,
  applied_by uuid references app_users(id),
  applied_at timestamptz default now(),
  unique (patient_id, tag_id)
);

create index if not exists idx_crm_patient_tags_patient on crm_patient_tags(patient_id);
create index if not exists idx_crm_patient_tags_tag on crm_patient_tags(tag_id);

-- ----------------------------------------------------------------------------
-- 6. SAVED SEGMENTS / VIEWS
-- ----------------------------------------------------------------------------
create table if not exists crm_saved_segments (
  id uuid primary key default uuid_generate_v4(),
  doctor_id uuid references app_users(id) on delete cascade,
  name text not null,
  filter_json jsonb not null,
  created_at timestamptz default now()
);

create index if not exists idx_crm_saved_segments_doctor on crm_saved_segments(doctor_id);

-- ----------------------------------------------------------------------------
-- 7. COMMUNICATION LOG
-- ----------------------------------------------------------------------------
create table if not exists crm_communication_log (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid references app_users(id) on delete cascade,
  channel text check (channel in ('call','whatsapp','sms','email','in_person')),
  direction text check (direction in ('outbound','inbound')),
  summary text not null,
  logged_by uuid references app_users(id),
  occurred_at timestamptz default now()
);

create index if not exists idx_crm_comm_log_patient on crm_communication_log(patient_id, occurred_at desc);

-- ----------------------------------------------------------------------------
-- 8. AUTOMATION RULES
-- ----------------------------------------------------------------------------
create table if not exists crm_automation_rules (
  id uuid primary key default uuid_generate_v4(),
  doctor_id uuid references app_users(id) on delete cascade,
  name text not null,
  trigger_type text not null,
  trigger_params jsonb default '{}',
  action_type text not null,
  action_params jsonb default '{}',
  is_active boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_crm_automation_doctor_active on crm_automation_rules(doctor_id, is_active);

create table if not exists crm_automation_run_log (
  id uuid primary key default uuid_generate_v4(),
  rule_id uuid references crm_automation_rules(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  action_taken text,
  ran_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 9. SEED DEFAULT PIPELINE STAGES FOR EVERY EXISTING DOCTOR
-- ----------------------------------------------------------------------------
insert into crm_pipeline_stages (doctor_id, name, sort_order, color, is_terminal)
select
  au.id,
  stage.name,
  stage.sort_order,
  stage.color,
  stage.is_terminal
from app_users au
cross join (
  values
    ('New Intake',         0, '#6b7280', false),
    ('Consultation',       1, '#3b82f6', false),
    ('Active Treatment',   2, '#f59e0b', false),
    ('Follow-Up',          3, '#8b5cf6', false),
    ('Stable / Discharged',4, '#2ea876', true)
) as stage(name, sort_order, color, is_terminal)
where au.role = 'doctor'
on conflict (doctor_id, name) do nothing;

-- ----------------------------------------------------------------------------
-- 10. TRIGGERS: auto-populate crm_activity_log
-- ----------------------------------------------------------------------------
create or replace function crm_log_note_activity() returns trigger as $$
begin
  insert into crm_activity_log (patient_id, doctor_id, event_type, event_summary, event_data, actor_id)
  values (
    new.patient_id, new.doctor_id, 'note',
    left(new.body, 140),
    jsonb_build_object('note_id', new.id),
    new.author_id
  );
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_crm_log_note on crm_patient_notes;
create trigger trg_crm_log_note
after insert on crm_patient_notes
for each row execute function crm_log_note_activity();


create or replace function crm_log_task_activity() returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    insert into crm_activity_log (patient_id, doctor_id, event_type, event_summary, event_data, actor_id)
    values (new.patient_id, new.doctor_id, 'task_created', new.title,
            jsonb_build_object('task_id', new.id), new.created_by);
  elsif TG_OP = 'UPDATE' and new.status = 'done' and old.status <> 'done' then
    insert into crm_activity_log (patient_id, doctor_id, event_type, event_summary, event_data, actor_id)
    values (new.patient_id, new.doctor_id, 'task_completed', new.title,
            jsonb_build_object('task_id', new.id), new.assigned_to_id);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_crm_log_task on crm_tasks;
create trigger trg_crm_log_task
after insert or update on crm_tasks
for each row execute function crm_log_task_activity();


create or replace function crm_log_stage_change() returns trigger as $$
begin
  insert into crm_pipeline_stage_history (patient_id, doctor_id, from_stage_id, to_stage_id, changed_by)
  values (new.patient_id, new.doctor_id, old.stage_id, new.stage_id, null);

  insert into crm_activity_log (patient_id, doctor_id, event_type, event_summary, event_data)
  values (
    new.patient_id, new.doctor_id, 'stage_changed',
    'Moved to a new pipeline stage',
    jsonb_build_object('from_stage_id', old.stage_id, 'to_stage_id', new.stage_id)
  );
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_crm_log_stage_change on crm_patient_pipeline;
create trigger trg_crm_log_stage_change
after update of stage_id on crm_patient_pipeline
for each row
when (old.stage_id is distinct from new.stage_id)
execute function crm_log_stage_change();

-- ----------------------------------------------------------------------------
-- 11. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
alter table crm_pipeline_stages        enable row level security;
alter table crm_patient_pipeline       enable row level security;
alter table crm_pipeline_stage_history enable row level security;
alter table crm_tasks                  enable row level security;
alter table crm_patient_notes          enable row level security;
alter table crm_activity_log           enable row level security;
alter table crm_tags                   enable row level security;
alter table crm_patient_tags           enable row level security;
alter table crm_saved_segments         enable row level security;
alter table crm_communication_log      enable row level security;
alter table crm_automation_rules       enable row level security;
alter table crm_automation_run_log     enable row level security;

create policy "crm_pipeline_stages_service_only" on crm_pipeline_stages for all using (false);
create policy "crm_patient_pipeline_service_only" on crm_patient_pipeline for all using (false);
create policy "crm_stage_history_service_only" on crm_pipeline_stage_history for all using (false);
create policy "crm_tasks_service_only" on crm_tasks for all using (false);
create policy "crm_notes_service_only" on crm_patient_notes for all using (false);
create policy "crm_activity_log_service_only" on crm_activity_log for all using (false);
create policy "crm_tags_service_only" on crm_tags for all using (false);
create policy "crm_patient_tags_service_only" on crm_patient_tags for all using (false);
create policy "crm_saved_segments_service_only" on crm_saved_segments for all using (false);
create policy "crm_communication_log_service_only" on crm_communication_log for all using (false);
create policy "crm_automation_rules_service_only" on crm_automation_rules for all using (false);
create policy "crm_automation_run_log_service_only" on crm_automation_run_log for all using (false);

-- ============================================================================
-- END MIGRATION
-- ============================================================================