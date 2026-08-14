-- Sanjeevani — Migration: Patient Vault, Folders, Translations, Reminders & Audit Logs
-- Migration timestamp: 20260813000000
-- Applies addendum tables, RLS policies, triggers, and demo seed data.

create extension if not exists "uuid-ossp";

-- ========== ALTER EXISTING TABLES ==========

-- 1. Add doctor_name & verification status to scans table for Vault integration
alter table scans add column if not exists doctor_name text default 'Unassigned Doctor';
alter table scans add column if not exists status text default 'unverified'; -- 'unverified' | 'verified'

-- 2. Add patient_facing_notes to prescriptions table (distinct from clinical soap_note_json)
alter table prescriptions add column if not exists patient_facing_notes text;


-- ========== NEW TABLES ==========

-- 3. Prescription Folders (Collections)
create table if not exists prescription_folders (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  name text not null,
  description text,
  auto_suggested boolean default false,  -- true if system-proposed via condition_tag matching
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

-- 4. Cached Regional Language Translations
create table if not exists prescription_translations (
  id uuid primary key default uuid_generate_v4(),
  prescription_id uuid references prescriptions(id) on delete cascade,
  language_code text not null,  -- e.g. 'hi', 'mr', 'ta', 'te', 'kn', 'bn'
  translated_instructions jsonb,   -- per prescription_item: {item_id: translated_text}
  translated_notes text,           -- translated patient_facing_notes
  generated_at timestamptz default now(),
  unique (prescription_id, language_code)
);

-- 5. Reference Data: Uses, Side Effects & Precautions
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

-- 6. Staff-to-Patient Reminders
create table if not exists patient_reminders (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  created_by uuid references app_users(id),   -- doctor, receptionist, admin, or NULL for system
  title text not null,
  message text,
  remind_at timestamptz not null,
  channel text[] default '{in_app,whatsapp}',
  status text default 'pending',   -- pending | sent | dismissed | snoozed
  snoozed_to timestamptz,
  related_prescription_id uuid references prescriptions(id),
  created_at timestamptz default now()
);

-- 7. Patient Audit & Activity Logging System
create table if not exists patient_audit_logs (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  event_type text not null, -- PRESCRIPTION_SCANNED | OCR_EXTRACTED | DOCTOR_VERIFIED | DOSE_TOGGLED | OTC_CHECKED | PASSPORT_MINTED
  title text not null,
  details text,
  actor text not null,
  created_at timestamptz default now()
);


-- ========== INDEXES ==========

create index if not exists idx_folder_items_folder on prescription_folder_items(folder_id);
create index if not exists idx_folder_items_prescription on prescription_folder_items(prescription_id);
create index if not exists idx_translations_lookup on prescription_translations(prescription_id, language_code);
create index if not exists idx_reminders_patient_time on patient_reminders(patient_id, remind_at);
create index if not exists idx_reminders_status on patient_reminders(status);
create index if not exists idx_audit_logs_patient_time on patient_audit_logs(patient_id, created_at desc);


-- ========== ROW LEVEL SECURITY & POLICIES ==========

alter table prescription_folders enable row level security;
alter table prescription_folder_items enable row level security;
alter table prescription_translations enable row level security;
alter table patient_reminders enable row level security;
alter table patient_audit_logs enable row level security;

-- Patients manage their own folders
create policy "folders_patient_own" on prescription_folders
  for all using (patient_id in (select id from patients where portal_user_id = auth.uid()));

create policy "folder_items_patient_own" on prescription_folder_items
  for all using (
    folder_id in (
      select id from prescription_folders
      where patient_id in (select id from patients where portal_user_id = auth.uid())
    )
  );

-- Translations read-only for patients
create policy "translations_patient_read" on prescription_translations
  for select using (
    prescription_id in (
      select p.id from prescriptions p
      join patients pt on pt.id = p.patient_id
      where pt.portal_user_id = auth.uid()
    )
  );

-- Reminders read & update status for patients
create policy "reminders_patient_read" on patient_reminders
  for select using (patient_id in (select id from patients where portal_user_id = auth.uid()));

create policy "reminders_patient_update_status_only" on patient_reminders
  for update using (patient_id in (select id from patients where portal_user_id = auth.uid()))
  with check (patient_id in (select id from patients where portal_user_id = auth.uid()));

-- Audit logs read-only for patients
create policy "audit_logs_patient_read" on patient_audit_logs
  for select using (patient_id in (select id from patients where portal_user_id = auth.uid()));


-- ========== TRIGGER FUNCTION: RESTRICT REMINDER UPDATES ==========

create or replace function restrict_reminder_patient_update()
returns trigger as $$
begin
  if new.title is distinct from old.title
     or new.message is distinct from old.message
     or new.created_by is distinct from old.created_by
     or new.remind_at is distinct from old.remind_at then
    raise exception 'Patients may only update status/snoozed_to on a reminder.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_restrict_reminder_patient_update on patient_reminders;
create trigger trg_restrict_reminder_patient_update
before update on patient_reminders
for each row execute function restrict_reminder_patient_update();


-- ========== DEMO SEED DATA ==========

insert into patient_audit_logs (id, patient_id, event_type, title, details, actor, created_at)
values
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000100',
    'DOCTOR_VERIFIED',
    'Care Protocol Verified by Physician',
    'Dr. Rajesh Sharma verified heart care protocol (Noveron 500mg, Amlodipine 5mg). SHA-256 Protocol Hash generated.',
    'Dr. Rajesh Sharma',
    now() - interval '1 day'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000100',
    'PRESCRIPTION_SCANNED',
    'Prescription Uploaded at Reception',
    'Paper prescription scanned at intake desk by Receptionist. Extracted doctor: Dr. Rajesh Patel. Tagged as UNVERIFIED (Needs Doctor Sign-Off).',
    'Reception Front Desk',
    now() - interval '2 days'
  )
on conflict (id) do nothing;
