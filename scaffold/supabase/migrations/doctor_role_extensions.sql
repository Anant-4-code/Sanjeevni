-- ==========================================================================
-- Sanjeevani — Doctor Role Schema Extensions
-- Run AFTER the base schema.sql has been applied.
-- ==========================================================================

-- ========== PRESCRIPTION EXTENSIONS ==========

alter table prescriptions add column if not exists is_refillable boolean default true;
alter table prescriptions add column if not exists max_refills_allowed int default 3;
alter table prescriptions add column if not exists refills_issued int default 0;
alter table prescriptions add column if not exists allergy_checked_at timestamptz;

-- ========== REFILL REQUESTS (Feature #1 Integration) ==========

create table if not exists refill_requests (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  prescription_id uuid references prescriptions(id) on delete cascade,
  prescribing_doctor_id uuid references app_users(id),
  requested_by_patient_id uuid,
  requested_by_role text check (requested_by_role in ('patient', 'caregiver')),
  status text default 'pending',  -- pending | approved | dispensed | denied | expired
  refill_quantity int default 10,
  request_notes text,
  doctor_response_notes text,
  requested_at timestamptz default now(),
  approved_at timestamptz,
  approved_by uuid references app_users(id),
  dispensed_at timestamptz,
  expires_at timestamptz default (now() + interval '30 days')
);

create table if not exists refill_request_history (
  id uuid primary key default uuid_generate_v4(),
  refill_request_id uuid references refill_requests(id) on delete cascade,
  status_change_from text,
  status_change_to text,
  changed_by uuid references app_users(id),
  changed_at timestamptz default now()
);

-- ========== SYMPTOM & ADHERENCE TRACKING (Feature #2–4) ==========

create table if not exists symptom_logs (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  logged_by_id uuid references app_users(id),
  logged_by_role text,
  log_date date not null,
  feeling_score int check (feeling_score between 1 and 5),
  notes text,
  related_prescription_id uuid references prescriptions(id) on delete set null,
  symptoms jsonb default '[]',
  energy_level int check (energy_level is null or energy_level between 1 and 5),
  mood_level int check (mood_level is null or mood_level between 1 and 5),
  sleep_quality int check (sleep_quality is null or sleep_quality between 1 and 5),
  created_at timestamptz default now()
);

create table if not exists symptom_alerts (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  prescribing_doctor_id uuid references app_users(id),
  alert_type text,  -- 'low_score_streak' | 'new_symptom_onset'
  consecutive_days_count int,
  triggered_at timestamptz default now(),
  acknowledged_by_doctor boolean default false,
  acknowledged_at timestamptz
);

-- ========== INTAKE LOG EXTENSIONS (Feature #3–4 Caregiver Marking) ==========

alter table intake_logs add column if not exists marked_by_id uuid references app_users(id);
alter table intake_logs add column if not exists marked_by_role text;
alter table intake_logs add column if not exists marked_at timestamptz;

-- ========== CAREGIVER ACCESS (Feature #3) ==========

create table if not exists caregiver_links (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  caregiver_user_id uuid references app_users(id) on delete cascade,
  caregiver_role text,  -- 'parent_child' | 'spouse' | 'professional' | 'other'
  permissions text[] default '{view,mark_doses}',
  status text default 'pending',  -- pending | active | revoked | expired
  invited_at timestamptz default now(),
  activated_at timestamptz,
  revoked_at timestamptz,
  revoked_by text
);

create table if not exists caregiver_alerts (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  caregiver_user_id uuid references app_users(id) on delete cascade,
  alert_type text,  -- 'missed_dose' | 'low_stock' | 'appointment_reminder'
  alert_data jsonb,
  sent_at timestamptz default now(),
  acknowledged_at timestamptz,
  action_taken text
);

-- ========== ALLERGY & INTERACTION PROFILES (Feature #5) ==========

create table if not exists patient_allergies (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  allergen_name text not null,
  reaction_type text not null,  -- 'rash' | 'anaphylaxis' | 'nausea' | 'other'
  severity text,  -- 'mild' | 'moderate' | 'severe'
  reported_by_patient boolean default true,
  confirmed_by_doctor boolean default false,
  confirmed_by_doctor_id uuid references app_users(id),
  confirmed_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

-- Extend interaction_flags with acknowledgment tracking
alter table interaction_flags add column if not exists acknowledged_at timestamptz;
alter table interaction_flags add column if not exists acknowledged_by uuid references app_users(id);
alter table interaction_flags add column if not exists conflicting_allergen_id uuid references patient_allergies(id);

-- ========== FOLLOW-UP APPOINTMENTS ==========

create table if not exists follow_up_appointments (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid references app_users(id),
  scheduled_date date not null,
  reason text,
  status text default 'scheduled',  -- scheduled | completed | cancelled | no_show
  reminder_sent boolean default false,
  created_at timestamptz default now()
);

-- ========== INDEXES (Production-Critical) ==========

create index if not exists idx_refill_requests_doctor_status
  on refill_requests(prescribing_doctor_id, status);
create index if not exists idx_refill_requests_patient_status
  on refill_requests(patient_id, status);
create index if not exists idx_refill_requests_expires_at
  on refill_requests(expires_at);

create index if not exists idx_symptom_logs_patient_date
  on symptom_logs(patient_id, log_date desc);
create index if not exists idx_symptom_alerts_patient_triggered
  on symptom_alerts(patient_id, triggered_at desc);

create index if not exists idx_intake_logs_marked_by
  on intake_logs(marked_by_role, marked_at);

create index if not exists idx_caregiver_links_patient_active
  on caregiver_links(patient_id, status);
create index if not exists idx_caregiver_links_caregiver
  on caregiver_links(caregiver_user_id, status);

create index if not exists idx_allergies_patient
  on patient_allergies(patient_id);
create index if not exists idx_interaction_flags_prescription
  on interaction_flags(prescription_id);
create index if not exists idx_interaction_flags_severity
  on interaction_flags(severity);

create index if not exists idx_follow_up_patient_date
  on follow_up_appointments(patient_id, scheduled_date);
create index if not exists idx_follow_up_doctor_date
  on follow_up_appointments(doctor_id, scheduled_date);

-- ========== RLS POLICIES (Doctor Access — Default Deny) ==========

alter table refill_requests enable row level security;
alter table symptom_logs enable row level security;
alter table symptom_alerts enable row level security;
alter table caregiver_links enable row level security;
alter table caregiver_alerts enable row level security;
alter table patient_allergies enable row level security;
alter table follow_up_appointments enable row level security;

-- All direct client access denied; backend (service-role) reads via bypass
create policy "refill_requests_service_only" on refill_requests
  for all using (false);

create policy "symptom_logs_patient_own" on symptom_logs
  for all using (
    patient_id in (select id from patients where portal_user_id = auth.uid())
  );

create policy "symptom_alerts_service_only" on symptom_alerts
  for all using (false);

create policy "caregiver_links_service_only" on caregiver_links
  for all using (false);

create policy "caregiver_alerts_service_only" on caregiver_alerts
  for all using (false);

create policy "allergies_patient_read" on patient_allergies
  for select using (
    patient_id in (select id from patients where portal_user_id = auth.uid())
  );

create policy "follow_up_service_only" on follow_up_appointments
  for all using (false);
