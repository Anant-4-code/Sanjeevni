-- ========================================================================
-- Migration: Multi-Document Store & Access Audit Log
-- Spec: 12_MULTI_DOCUMENT_DOCTOR_ACCESS_ADDENDUM
-- ========================================================================

-- Unified document index: every document, regardless of source, gets an entry here.
-- This does NOT replace scans/lab_results/prescriptions — those remain the structured
-- source of truth. This table is the unifying index across all categories.

create table if not exists patient_documents (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  category text not null check (category in (
    'prescription', 'lab_report', 'xray_scan', 'mri_ct_scan',
    'discharge_summary', 'vaccination', 'referral_letter', 'other'
  )),
  source text not null default 'clinic_verified'
    check (source in ('clinic_verified', 'patient_uploaded', 'external_import')),
  -- clinic_verified: came from Reception/Doctor/Lab workflow (trusted)
  -- patient_uploaded: patient added it themselves (flagged, not clinically verified)
  -- external_import: bulk import from another hospital system (future)

  title text not null,                    -- "CBC — Aug 2026" / "Chest X-Ray — Dr. Rai"
  file_url text,                          -- Supabase Storage signed URL reference
  file_type text,                         -- 'pdf' | 'jpg' | 'png' | 'dicom'

  -- Links back to the structured source-of-truth row, if it has one
  linked_prescription_id uuid references prescriptions(id) on delete set null,
  linked_scan_id uuid references scans(id) on delete set null,
  linked_lab_result_id uuid references lab_results(id) on delete set null,
  linked_diagnostic_order_id uuid references diagnostic_orders(id) on delete set null,

  uploaded_by_id uuid references app_users(id),   -- staff member OR patient's own user id
  uploaded_by_role text,                          -- 'reception' | 'doctor' | 'lab' | 'patient'
  document_date date not null,                    -- clinically relevant date (test date, not upload date)
  uploaded_at timestamptz default now(),

  -- Versioning: if a document supersedes an earlier one (e.g. corrected report)
  supersedes_document_id uuid references patient_documents(id),
  is_current_version boolean default true,

  created_at timestamptz default now()
);

create index if not exists idx_patient_documents_patient_category
  on patient_documents(patient_id, category, document_date desc);
create index if not exists idx_patient_documents_patient_date
  on patient_documents(patient_id, document_date desc);

-- Access audit: who on the clinical side viewed what, and when.
create table if not exists document_access_log (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid references patient_documents(id) on delete cascade,
  accessed_by_id uuid references app_users(id),
  accessed_by_role text,
  accessed_at timestamptz default now()
);
create index if not exists idx_document_access_log_document
  on document_access_log(document_id, accessed_at desc);

-- ========== RLS ==========

alter table patient_documents enable row level security;
alter table document_access_log enable row level security;

-- Patient reads/writes own documents (including self-upload)
create policy "documents_patient_rw" on patient_documents
  for all using (
    patient_id in (select id from patients where portal_user_id = auth.uid())
  );

-- Doctors: no direct RLS access — always through FastAPI service-role
-- (consistent with doc 10 section 2.1)

-- Access log: service-role only (doctors never query this directly)
create policy "document_access_log_service_only" on document_access_log
  for all using (false);
