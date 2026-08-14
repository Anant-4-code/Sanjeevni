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

