-- Sanjeevani — Supabase schema
-- Run in Supabase SQL Editor, or via `supabase db push` with this as a migration.

create extension if not exists "uuid-ossp";

-- ========== ENUM TYPES ==========
create type user_role as enum ('receptionist','doctor','pharmacist','lab_tech','patient','admin');
create type scan_category as enum ('outside_prescription','xray','lab_report','other');
create type ocr_status as enum ('pending','processing','done','failed');
create type prescription_status as enum ('draft','verified','dispensed');
create type interaction_severity as enum ('moderate','severe');
create type order_status as enum ('pending_draw','analyzing','results_ready');
create type queue_status as enum ('waiting','in_consult','completed');

-- ========== CORE TABLES ==========

-- app_users mirrors auth.users (Supabase Auth) with role/profile data.
create table app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  hospital_id uuid not null default uuid_generate_v4(),
  role user_role not null,
  full_name text not null,
  phone text unique,
  language_pref text default 'en',
  is_active boolean default true,
  created_at timestamptz default now()
);

create table patients (
  id uuid primary key default uuid_generate_v4(),
  hospital_id uuid not null,
  full_name text not null,
  age int,
  gender text,
  phone text,
  emergency_contact_name text,
  emergency_contact_phone text,
  portal_user_id uuid references app_users(id),
  registered_by uuid references app_users(id),
  created_at timestamptz default now()
);

create table chief_complaints (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  text text not null,
  severity_level int not null check (severity_level between 1 and 3),
  severity_source text default 'nlp_model',
  created_at timestamptz default now()
);

create table doctor_queues (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid references app_users(id),
  chief_complaint_id uuid references chief_complaints(id),
  token_number int,
  status queue_status default 'waiting',
  queued_at timestamptz default now()
);

create table scans (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  uploaded_by uuid references app_users(id),
  category scan_category not null,
  file_url text not null,
  ocr_status ocr_status default 'pending',
  ocr_raw_json jsonb,
  xray_analysis_json jsonb,
  created_at timestamptz default now()
);

create table medications (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  generic_name text,
  category text,
  interaction_tags text[] default '{}'
);

create table prescriptions (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid references app_users(id),
  doctor_queue_id uuid references doctor_queues(id),
  source_scan_id uuid references scans(id),
  status prescription_status default 'draft',
  soap_note_json jsonb,
  icd10_codes text[] default '{}',
  cpt_codes text[] default '{}',
  created_at timestamptz default now(),
  verified_at timestamptz
);

create table prescription_items (
  id uuid primary key default uuid_generate_v4(),
  prescription_id uuid references prescriptions(id) on delete cascade,
  medication_id uuid references medications(id),
  dosage text,
  frequency text,
  duration_days int,
  condition_tag text,
  ocr_bounding_box jsonb,
  doctor_edited boolean default false
);

-- Append-only: no update/delete grants issued to app roles (see policies below).
create table verification_logs (
  id uuid primary key default uuid_generate_v4(),
  prescription_id uuid references prescriptions(id),
  doctor_id uuid references app_users(id),
  protocol_hash text not null,
  signed_at timestamptz default now()
);

create table interaction_flags (
  id uuid primary key default uuid_generate_v4(),
  prescription_id uuid references prescriptions(id) on delete cascade,
  conflicting_medication_id uuid references medications(id),
  severity interaction_severity not null,
  message text,
  acknowledged_by_doctor boolean default false
);

create table pharmacy_dispense_log (
  id uuid primary key default uuid_generate_v4(),
  prescription_id uuid references prescriptions(id) on delete cascade,
  pharmacist_id uuid references app_users(id),
  dispensed boolean default false,
  dispensed_at timestamptz,
  pill_verification_result jsonb
);

create table diagnostic_orders (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid references app_users(id),
  test_name text not null,
  status order_status default 'pending_draw',
  ordered_at timestamptz default now()
);

create table lab_results (
  id uuid primary key default uuid_generate_v4(),
  diagnostic_order_id uuid references diagnostic_orders(id) on delete cascade,
  lab_tech_id uuid references app_users(id),
  raw_values_json jsonb,
  patient_summary_text text,
  created_at timestamptz default now()
);

create table intake_logs (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  prescription_item_id uuid references prescription_items(id),
  scheduled_at timestamptz not null,
  taken boolean default false,
  taken_at timestamptz
);

create table copilot_messages (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  role text check (role in ('user','assistant')),
  content text,
  flagged_diagnostic_attempt boolean default false,
  created_at timestamptz default now()
);

create table inventory_stock (
  id uuid primary key default uuid_generate_v4(),
  medication_id uuid references medications(id),
  quantity_on_hand int default 0,
  projected_zero_date date,
  updated_at timestamptz default now()
);

-- ========== INDEXES ==========
create index idx_patients_phone on patients(phone);
create index idx_patients_name_trgm on patients using gin (full_name gin_trgm_ops);
create index idx_prescriptions_patient_status on prescriptions(patient_id, status);
create index idx_intake_logs_patient_time on intake_logs(patient_id, scheduled_at);
create extension if not exists pg_trgm;

-- ========== ROW LEVEL SECURITY ==========
alter table patients enable row level security;
alter table prescriptions enable row level security;
alter table prescription_items enable row level security;
alter table intake_logs enable row level security;
alter table copilot_messages enable row level security;
alter table verification_logs enable row level security;
alter table scans enable row level security;

-- Patients can only read/write their own records (matched via portal_user_id / patient_id chain).
create policy "patients_select_own" on patients
  for select using (portal_user_id = auth.uid());

create policy "prescriptions_patient_read_own" on prescriptions
  for select using (
    patient_id in (select id from patients where portal_user_id = auth.uid())
  );

create policy "intake_logs_patient_read_write_own" on intake_logs
  for all using (
    patient_id in (select id from patients where portal_user_id = auth.uid())
  );

create policy "copilot_messages_patient_own" on copilot_messages
  for all using (
    patient_id in (select id from patients where portal_user_id = auth.uid())
  );

-- Staff (doctor/receptionist/pharmacist/lab_tech/admin) access is brokered through the
-- FastAPI backend using the SERVICE ROLE key, which bypasses RLS — the backend enforces
-- role-based scoping itself (e.g. a doctor only queries their own doctor_queues rows).

-- verification_logs: append-only. Revoke update/delete from all non-superuser roles.
revoke update, delete on verification_logs from public, authenticated, anon;
create policy "verification_logs_insert_only" on verification_logs
  for insert with check (true);
create policy "verification_logs_no_public_select" on verification_logs
  for select using (false); -- backend (service role) reads via bypass; no direct client reads

-- scans: patients can view scans linked to their own record.
create policy "scans_patient_read_own" on scans
  for select using (
    patient_id in (select id from patients where portal_user_id = auth.uid())
  );

-- ========== VAULT, FOLDERS & AUDIT LOGS ADDENDUM ==========

alter table scans add column if not exists doctor_name text default 'Unassigned Doctor';
alter table scans add column if not exists status text default 'unverified';
alter table prescriptions add column if not exists patient_facing_notes text;

create table if not exists prescription_folders (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  name text not null,
  description text,
  auto_suggested boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists prescription_folder_items (
  id uuid primary key default uuid_generate_v4(),
  folder_id uuid references prescription_folders(id) on delete cascade,
  prescription_id uuid references prescriptions(id) on delete cascade,
  added_at timestamptz default now(),
  unique (folder_id, prescription_id)
);

create table if not exists prescription_translations (
  id uuid primary key default uuid_generate_v4(),
  prescription_id uuid references prescriptions(id) on delete cascade,
  language_code text not null,
  translated_instructions jsonb,
  translated_notes text,
  generated_at timestamptz default now(),
  unique (prescription_id, language_code)
);

create table if not exists medication_info (
  id uuid primary key default uuid_generate_v4(),
  medication_id uuid references medications(id) on delete cascade,
  uses_summary text,
  common_side_effects text[],
  precautions text,
  age_notes text,
  source text default 'ai_generated',
  language_code text default 'en',
  unique (medication_id, language_code)
);

create table if not exists patient_reminders (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  created_by uuid references app_users(id),
  title text not null,
  message text,
  remind_at timestamptz not null,
  channel text[] default '{in_app,whatsapp}',
  status text default 'pending',
  snoozed_to timestamptz,
  related_prescription_id uuid references prescriptions(id),
  created_at timestamptz default now()
);

create table if not exists patient_audit_logs (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  event_type text not null,
  title text not null,
  details text,
  actor text not null,
  created_at timestamptz default now()
);

alter table prescription_folders enable row level security;
alter table prescription_folder_items enable row level security;
alter table prescription_translations enable row level security;
alter table patient_reminders enable row level security;
alter table patient_audit_logs enable row level security;

create policy "folders_patient_own" on prescription_folders
  for all using (patient_id in (select id from patients where portal_user_id = auth.uid()));

create policy "folder_items_patient_own" on prescription_folder_items
  for all using (
    folder_id in (
      select id from prescription_folders
      where patient_id in (select id from patients where portal_user_id = auth.uid())
    )
  );

create policy "translations_patient_read" on prescription_translations
  for select using (
    prescription_id in (
      select p.id from prescriptions p
      join patients pt on pt.id = p.patient_id
      where pt.portal_user_id = auth.uid()
    )
  );

create policy "reminders_patient_read" on patient_reminders
  for select using (patient_id in (select id from patients where portal_user_id = auth.uid()));

create policy "reminders_patient_update_status_only" on patient_reminders
  for update using (patient_id in (select id from patients where portal_user_id = auth.uid()))
  with check (patient_id in (select id from patients where portal_user_id = auth.uid()));

create policy "audit_logs_patient_read" on patient_audit_logs
  for select using (patient_id in (select id from patients where portal_user_id = auth.uid()));

-- ========== SPEC 15: NEW AI FEATURES, SETTINGS & PROFILES ==========

create table if not exists user_settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references app_users(id) on delete cascade unique,

  -- notifications
  notify_channels text[] default '{in_app,whatsapp}',
  quiet_hours_start time,
  quiet_hours_end time,

  -- language
  ui_language text default 'en',
  regional_language text default 'en',

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
  clinic_address text,
  created_at timestamptz default now()
);

create table if not exists staff_availability (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references app_users(id) on delete cascade,
  day_of_week int check (day_of_week between 0 and 6),
  start_time time,
  end_time time,
  is_available boolean default true,
  created_at timestamptz default now()
);

create table if not exists patient_risk_scores (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid references app_users(id),
  score int check (score between 0 and 100),
  reason text,
  contributing_factors jsonb,
  computed_at timestamptz default now(),
  doctor_action text, -- 'reviewed' | 'contacted_patient' | 'dismissed' | null
  doctor_action_at timestamptz
);
create index if not exists idx_risk_scores_doctor_score on patient_risk_scores(doctor_id, score desc, computed_at desc);

create table if not exists inventory_forecasts (
  id uuid primary key default uuid_generate_v4(),
  medication_id uuid references medications(id),
  current_stock int,
  avg_daily_dispense numeric,
  days_until_stockout int,
  suggested_reorder_qty int,
  computed_at timestamptz default now()
);
create index if not exists idx_inventory_forecasts_med on inventory_forecasts(medication_id, computed_at desc);

alter table user_settings enable row level security;
alter table doctor_credentials enable row level security;
alter table staff_availability enable row level security;
alter table patient_risk_scores enable row level security;
alter table inventory_forecasts enable row level security;

create policy "settings_user_own" on user_settings
  for all using (user_id = auth.uid());

create policy "credentials_doctor_own" on doctor_credentials
  for all using (doctor_id = auth.uid());

create policy "availability_staff_own" on staff_availability
  for all using (user_id = auth.uid());

create policy "risk_scores_doctor_read" on patient_risk_scores
  for select using (doctor_id = auth.uid() or auth.uid() in (select id from app_users where role = 'doctor'));

create policy "risk_scores_doctor_update" on patient_risk_scores
  for update using (doctor_id = auth.uid() or auth.uid() in (select id from app_users where role = 'doctor'));

-- ========== DOCTOR CRM LAYER ==========

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

create table if not exists crm_saved_segments (
  id uuid primary key default uuid_generate_v4(),
  doctor_id uuid references app_users(id) on delete cascade,
  name text not null,
  filter_json jsonb not null,
  created_at timestamptz default now()
);

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

create table if not exists crm_automation_run_log (
  id uuid primary key default uuid_generate_v4(),
  rule_id uuid references crm_automation_rules(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  action_taken text,
  ran_at timestamptz default now()
);

-- ========== VAULT ARCHIVE & AI EXTENSIONS ==========
create table if not exists vault_document_links (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  source_document_id uuid references patient_documents(id) on delete cascade,
  target_document_id uuid references patient_documents(id) on delete cascade,
  link_type text not null check (link_type in ('prescribed_for_scan', 'ordered_lab', 'discharge_treatment', 'repeat_scan', 'related_condition')),
  confidence_score numeric(4,2) default 90.0,
  created_at timestamptz default now()
);

create table if not exists vault_ai_insights (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  insight_type text not null check (insight_type in ('duplicate_warning', 'prescription_comparison', 'expiry_decay', 'scan_trend', 'visit_bundle')),
  title text not null,
  body text not null,
  severity text default 'info' check (severity in ('info', 'warning', 'critical', 'notice')),
  related_document_ids uuid[] default '{}',
  action_cta text,
  action_href text,
  created_at timestamptz default now()
);

create table if not exists vault_search_log (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  search_query text not null,
  results_count int default 0,
  searched_at timestamptz default now()
);

-- ========== LAB DIAGNOSTIC REPORTS & AI EXTENSIONS (LR-1 to LR-8) ==========
create table if not exists lab_critical_escalations (
  id uuid primary key default uuid_generate_v4(),
  lab_result_id uuid references lab_results(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  ordering_doctor_id uuid references app_users(id),
  critical_parameter text not null,
  critical_value text not null,
  reference_threshold text not null,
  escalated_at timestamptz default now(),
  acknowledged_by_doctor boolean default false,
  acknowledged_at timestamptz
);

create table if not exists lab_pattern_insights_log (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid references app_users(id),
  insight_title text not null,
  insight_body text not null,
  involved_parameters text[] default '{}',
  doctor_action text check (doctor_action in ('pending', 'reviewed', 'dismissed', 'action_taken')),
  action_note text,
  action_timestamp timestamptz
);

