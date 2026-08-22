-- ========================================================================
-- Migration: Vault Archive AI & Enriched Document Layer
-- Spec: Vault Archive: Prescriptions & Scans + AI Features (VA-1 to VA-10)
-- ========================================================================

-- Extend patient_documents with AI categorization, source flags, and relevance decay
alter table if exists patient_documents
  add column if not exists ai_category_suggestion text,
  add column if not exists ai_category_confidence numeric(4,2),
  add column if not exists is_expired boolean default false,
  add column if not exists expiry_reason text,
  add column if not exists condition_tags text[] default '{}',
  add column if not exists ocr_confidence_score numeric(4,2);

-- Document Relationship Links (VA-3 Auto-Linking)
create table if not exists vault_document_links (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  source_document_id uuid references patient_documents(id) on delete cascade,
  target_document_id uuid references patient_documents(id) on delete cascade,
  link_type text not null check (link_type in ('prescribed_for_scan', 'ordered_lab', 'discharge_treatment', 'repeat_scan', 'related_condition')),
  confidence_score numeric(4,2) default 90.0,
  created_at timestamptz default now()
);
create index if not exists idx_vault_doc_links_patient on vault_document_links(patient_id, source_document_id);

-- Vault AI Insights Cache (VA-2, VA-5, VA-9)
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
create index if not exists idx_vault_ai_insights_patient on vault_ai_insights(patient_id, created_at desc);

-- Vault Smart Search Audit Log (VA-7)
create table if not exists vault_search_log (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  search_query text not null,
  results_count int default 0,
  searched_at timestamptz default now()
);

-- RLS Policies
alter table vault_document_links enable row level security;
alter table vault_ai_insights enable row level security;
alter table vault_search_log enable row level security;

create policy "vault_document_links_patient_rw" on vault_document_links
  for all using (patient_id in (select id from patients where portal_user_id = auth.uid()));

create policy "vault_ai_insights_patient_ro" on vault_ai_insights
  for select using (patient_id in (select id from patients where portal_user_id = auth.uid()));

create policy "vault_search_log_patient_insert" on vault_search_log
  for insert with check (patient_id in (select id from patients where portal_user_id = auth.uid()));
