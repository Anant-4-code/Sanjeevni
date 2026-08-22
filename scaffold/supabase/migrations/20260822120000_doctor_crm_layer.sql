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
