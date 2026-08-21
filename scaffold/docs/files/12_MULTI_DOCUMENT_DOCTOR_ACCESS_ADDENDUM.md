# 12 — Multi-Document & Full Doctor Record Access Addendum

This addendum extends the Sanjeevani data model so that:
1. A patient can accumulate **unlimited** documents per category (lab reports, scans, discharge summaries, etc.) over time — never overwriting, always appending.
2. A doctor viewing a patient gets their **complete** medical record in one call — every prescription from every doctor, every lab result, every scan, every symptom log — not just what this doctor personally created.

---

## B.1 PRD

### Purpose
1. A patient's Vault must hold an unlimited, ever-growing set of documents per category.
2. A doctor opening a patient's file must get their complete medical picture in one call.

### User Stories
- As a patient, I want every lab report I have ever had to live in my Vault, sorted by date.
- As a patient, I want to upload an external document myself and have it appear in my Vault, clearly marked as "patient-uploaded" vs. "clinic-verified."
- As a doctor, when I open a new patient, I want one screen showing their entire history.
- As a doctor, I want to filter that full history by date range, doctor, or category.
- As a specialist, I want to see trends across repeated lab tests (e.g. HbA1c over 6 visits) as a simple chart.

### Feature Matrix

| ID   | Feature | Priority |
|------|---------|----------|
| MD-1 | Unlimited documents per patient per category | P0 |
| MD-2 | Document versioning/history — never overwrite, always append | P0 |
| MD-3 | Patient self-upload of external documents (tagged source: patient_uploaded) | P0 |
| MD-4 | Doctor "Full Patient Record" endpoint — single call returns everything | P0 |
| MD-5 | Filter/paginate full record by date range, category, doctor | P1 |
| MD-6 | Trend charting for repeated lab tests | P1 |
| MD-7 | Cross-doctor prescription timeline (chronological, not per-doctor silos) | P0 |
| MD-8 | Document access audit log | P1 |

---

## B.2 Database — Generalized Document Store

```sql
create table if not exists patient_documents (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  category text not null check (category in (
    'prescription', 'lab_report', 'xray_scan', 'mri_ct_scan',
    'discharge_summary', 'vaccination', 'referral_letter', 'other'
  )),
  source text not null default 'clinic_verified'
    check (source in ('clinic_verified', 'patient_uploaded', 'external_import')),
  title text not null,
  file_url text,
  file_type text,
  linked_prescription_id uuid references prescriptions(id) on delete set null,
  linked_scan_id uuid references scans(id) on delete set null,
  linked_lab_result_id uuid references lab_results(id) on delete set null,
  linked_diagnostic_order_id uuid references diagnostic_orders(id) on delete set null,
  uploaded_by_id uuid references app_users(id),
  uploaded_by_role text,
  document_date date not null,
  uploaded_at timestamptz default now(),
  supersedes_document_id uuid references patient_documents(id),
  is_current_version boolean default true,
  created_at timestamptz default now()
);

create index idx_patient_documents_patient_category on patient_documents(patient_id, category, document_date desc);
create index idx_patient_documents_patient_date on patient_documents(patient_id, document_date desc);

create table if not exists document_access_log (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid references patient_documents(id) on delete cascade,
  accessed_by_id uuid references app_users(id),
  accessed_by_role text,
  accessed_at timestamptz default now()
);
create index idx_document_access_log_document on document_access_log(document_id, accessed_at desc);
```

### RLS

```sql
alter table patient_documents enable row level security;

create policy "documents_patient_rw" on patient_documents
  for all using (
    patient_id in (select id from patients where portal_user_id = auth.uid())
  );
```

### Patient Self-Upload Rule
`source = 'patient_uploaded'` documents are visible to the patient and to any doctor viewing the full record, but are always visually flagged and never used as input to the guardrail engine without a doctor first marking it `clinic_verified`.

---

## B.3 The "Full Patient Record" Endpoint

```
GET /api/doctor/patient/{patient_id}/full-record
    ?from=2024-01-01&to=2026-08-21&category=all&doctor_id=all

Returns:
{
  "patient": {...demographics...},
  "prescriptions_timeline": [...every prescription, from every doctor, chronological...],
  "documents": {
    "lab_report": [...],
    "xray_scan": [...],
    "mri_ct_scan": [...],
    "discharge_summary": [...],
    "vaccination": [...],
    "other": [...]
  },
  "lab_trends": [
    {"test_name": "HbA1c", "unit": "%", "points": [{"date": "...", "value": 7.8}, ...]}
  ],
  "allergy_profile": [...],
  "symptom_summary": {...},
  "caregiver_audit": {...},
  "adherence_score": 78,
  "refill_history": [...],
  "smart_alerts": [...]
}
```

---

## B.4 UI — Doctor's Full Patient Record Screen

Filter bar: [All Time] [All Doctors] [All Categories]
Prescription Timeline (Cross-Doctor): chronological from all prescribers
Lab Trends: chartable series with improving/worsening indicators
All Documents: category-grouped cards with source badges and View/Verify actions
