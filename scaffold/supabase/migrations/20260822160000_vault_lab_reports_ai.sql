-- ========================================================================
-- Migration: Vault Archive - Lab Diagnostic Reports AI & Clinical Layer
-- Spec: Vault Archive: Lab Diagnostic Reports (LR-1 to LR-8)
-- ========================================================================

-- Extend lab_results with doctor review note, plain summary approval state,
-- recheck scheduling, critical escalation, and multi-parameter insights
alter table if exists lab_results
  add column if not exists reviewed_by_doctor_note text,
  add column if not exists doctor_reviewed_at timestamptz,
  add column if not exists doctor_reviewed_by uuid references app_users(id),
  add column if not exists plain_language_summary text,
  add column if not exists summary_status text default 'draft' check (summary_status in ('draft', 'approved', 'dismissed')),
  add column if not exists overall_status text default 'normal' check (overall_status in ('normal', 'abnormal', 'critical')),
  add column if not exists next_recheck_suggested date,
  add column if not exists recheck_reason text,
  add column if not exists recheck_reminder_set boolean default false,
  add column if not exists critical_alert_sent boolean default false,
  add column if not exists critical_alert_at timestamptz,
  add column if not exists doctor_pattern_insights jsonb default '[]',
  add column if not exists historical_trend_data jsonb default '[]';

-- Critical Lab Escalation Log (LR-4)
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
create index if not exists idx_lab_critical_doctor on lab_critical_escalations(ordering_doctor_id, acknowledged_by_doctor);

-- Doctor Multi-Parameter Pattern Insights Audit Log (LR-8)
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

-- RLS
alter table lab_critical_escalations enable row level security;
alter table lab_pattern_insights_log enable row level security;

create policy "lab_critical_escalations_doctor" on lab_critical_escalations
  for all using (ordering_doctor_id = auth.uid());

create policy "lab_pattern_insights_doctor" on lab_pattern_insights_log
  for all using (doctor_id = auth.uid());
