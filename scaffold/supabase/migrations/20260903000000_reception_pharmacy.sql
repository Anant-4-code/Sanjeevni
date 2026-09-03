-- ==========================================================================
-- Sanjeevani — Reception & Pharmacy Schema Extensions
-- Run AFTER base schema.sql + doctor_role_extensions.sql
-- ==========================================================================

-- ========== APPOINTMENTS (RC-7) ==========

create table if not exists appointments (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid references app_users(id),
  scheduled_at timestamptz not null,
  reason text,
  status text default 'scheduled' check (status in ('scheduled','checked_in','completed','no_show','cancelled')),
  created_by uuid references app_users(id),
  created_at timestamptz default now()
);
create index if not exists idx_appointments_doctor_date on appointments(doctor_id, scheduled_at);
create index if not exists idx_appointments_patient on appointments(patient_id, scheduled_at desc);

-- ========== CHIEF COMPLAINTS EXTENSIONS ==========

alter table chief_complaints add column if not exists ai_suggested_severity int;
alter table chief_complaints add column if not exists severity_overridden_by_staff boolean default false;

-- ========== INVENTORY STOCK EXTENSIONS ==========

alter table inventory_stock add column if not exists reorder_threshold int default 50;
alter table inventory_stock add column if not exists last_restocked_at timestamptz;
alter table inventory_stock add column if not exists medication_name text;

-- ========== DISPENSING HISTORY (Unified Audit Trail) ==========

create table if not exists dispensing_history (
  id uuid primary key default uuid_generate_v4(),
  prescription_id uuid references prescriptions(id),
  refill_request_id uuid references refill_requests(id),
  patient_id uuid references patients(id),
  medication_id uuid references medications(id),
  medication_name text,
  quantity_dispensed int,
  dispensed_by uuid references app_users(id),
  dispensed_at timestamptz default now(),
  partial boolean default false,
  backorder_eta date
);
create index if not exists idx_dispensing_history_patient on dispensing_history(patient_id, dispensed_at desc);
create index if not exists idx_dispensing_history_prescription on dispensing_history(prescription_id);

-- ========== RLS ==========

alter table appointments enable row level security;
alter table dispensing_history enable row level security;

create policy "appointments_service_only" on appointments for all using (true);
create policy "dispensing_history_service_only" on dispensing_history for all using (true);
