CREATE TABLE IF NOT EXISTS patients (
  patient_id TEXT PRIMARY KEY,
  his_patient_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  sex TEXT NOT NULL,
  age INT NOT NULL
);

CREATE TABLE IF NOT EXISTS encounters (
  encounter_id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(patient_id),
  department TEXT NOT NULL,
  diagnosis TEXT NOT NULL,
  scenario TEXT NOT NULL,
  data_version INT NOT NULL,
  admitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS department_participation (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL,
  department TEXT NOT NULL,
  role TEXT NOT NULL,
  doctor_name TEXT NOT NULL,
  active BOOLEAN NOT NULL
);

CREATE TABLE IF NOT EXISTS source_identifier_mapping (
  internal_id TEXT NOT NULL,
  source_system TEXT NOT NULL,
  source_id TEXT NOT NULL,
  object_type TEXT NOT NULL,
  version INT NOT NULL,
  PRIMARY KEY (internal_id, source_system, object_type)
);

CREATE TABLE IF NOT EXISTS inbound_event (
  event_id TEXT PRIMARY KEY,
  source_system TEXT NOT NULL,
  source_batch_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  payload_version TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL,
  applied_at TIMESTAMPTZ,
  UNIQUE (source_system, source_batch_id, event_type)
);

CREATE TABLE IF NOT EXISTS source_sync_cursor (
  source_system TEXT NOT NULL,
  stream_name TEXT NOT NULL,
  cursor_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (source_system, stream_name)
);

CREATE TABLE IF NOT EXISTS diagnosis (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  source_id TEXT NOT NULL,
  collected_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS lab_result (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  lab_value TEXT,
  unit TEXT,
  missing_status TEXT NOT NULL,
  source_id TEXT NOT NULL,
  collected_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS medication_order (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  drug_code TEXT NOT NULL,
  drug_name TEXT NOT NULL,
  pharmacology_class TEXT NOT NULL,
  department TEXT NOT NULL,
  status TEXT NOT NULL,
  source_id TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS medication_exposure (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  encounter_id TEXT NOT NULL,
  drug_code TEXT NOT NULL,
  drug_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS medication_timeline_event (
  event_id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  encounter_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  drug_code TEXT,
  drug_name TEXT,
  event_time TIMESTAMPTZ NOT NULL,
  source_system TEXT NOT NULL,
  source_id TEXT NOT NULL,
  detail TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS medication_feedback (
  feedback_id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  encounter_id TEXT NOT NULL,
  drug_code TEXT NOT NULL,
  effectiveness TEXT NOT NULL,
  adverse_signal TEXT NOT NULL,
  reporter_role TEXT NOT NULL,
  note TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS discharge_outcome (
  outcome_id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  encounter_id TEXT NOT NULL,
  outcome_status TEXT NOT NULL,
  readmission_risk TEXT NOT NULL,
  followup_required BOOLEAN NOT NULL,
  note TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS allergy_event (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  drug_code TEXT NOT NULL,
  drug_name TEXT NOT NULL,
  status TEXT NOT NULL,
  severity TEXT NOT NULL,
  source_id TEXT NOT NULL,
  confirmed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS adverse_drug_reaction (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  drug_code TEXT NOT NULL,
  drug_name TEXT NOT NULL,
  severity TEXT NOT NULL,
  review_status TEXT NOT NULL,
  source_id TEXT NOT NULL,
  reviewed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS drug_catalog (
  drug_code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  pharmacology_class TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evidence_document (
  evidence_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  version TEXT NOT NULL,
  effective_date DATE NOT NULL,
  scope TEXT NOT NULL,
  locator TEXT NOT NULL,
  text TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clinical_rule (
  rule_id TEXT NOT NULL,
  version TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  severity TEXT NOT NULL,
  basis TEXT NOT NULL,
  deterministic_handler TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  PRIMARY KEY (rule_id, version)
);

CREATE TABLE IF NOT EXISTS clinical_rule_case (
  case_id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  rule_version TEXT NOT NULL,
  title TEXT NOT NULL,
  input_ref TEXT NOT NULL,
  expected_result TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dose_rule (
  dose_rule_id TEXT PRIMARY KEY,
  drug_code TEXT NOT NULL REFERENCES drug_catalog(drug_code),
  indication TEXT NOT NULL,
  patient_group TEXT NOT NULL,
  renal_adjustment_required BOOLEAN NOT NULL,
  regimen_text TEXT NOT NULL,
  status TEXT NOT NULL,
  evidence_id TEXT,
  version TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS rule_execution (
  execution_id TEXT PRIMARY KEY,
  recommendation_id TEXT NOT NULL,
  encounter_id TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  rule_version TEXT NOT NULL,
  result_level TEXT NOT NULL,
  blocked BOOLEAN NOT NULL,
  matched_facts TEXT NOT NULL,
  message TEXT NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS document_block (
  block_id TEXT PRIMARY KEY,
  evidence_id TEXT NOT NULL REFERENCES evidence_document(evidence_id),
  block_type TEXT NOT NULL,
  page_label TEXT NOT NULL,
  sort_order INT NOT NULL,
  text TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evidence_chunk (
  chunk_id TEXT PRIMARY KEY,
  evidence_id TEXT NOT NULL REFERENCES evidence_document(evidence_id),
  block_id TEXT NOT NULL REFERENCES document_block(block_id),
  chunk_text TEXT NOT NULL,
  keywords TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS recommendation_decision (
  decision_id TEXT PRIMARY KEY,
  recommendation_id TEXT NOT NULL,
  encounter_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  action TEXT NOT NULL,
  original_version TEXT NOT NULL,
  modified_regimen TEXT,
  modified_diff_json TEXT,
  reason TEXT NOT NULL,
  actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS collaboration_task (
  task_id TEXT PRIMARY KEY,
  recommendation_id TEXT NOT NULL,
  encounter_id TEXT NOT NULL,
  source_department TEXT NOT NULL,
  target_department TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolution TEXT
);

CREATE TABLE IF NOT EXISTS recommendation_snapshot (
  recommendation_id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  data_version INT NOT NULL,
  status TEXT NOT NULL,
  candidate_count INT NOT NULL,
  blocking_count INT NOT NULL,
  strong_alert_count INT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  expired_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS pharmacist_review_task (
  review_id TEXT PRIMARY KEY,
  recommendation_id TEXT NOT NULL,
  decision_id TEXT,
  encounter_id TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  reason TEXT NOT NULL,
  assigned_role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolution TEXT
);

CREATE TABLE IF NOT EXISTS prescription_draft (
  draft_id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL,
  encounter_id TEXT NOT NULL,
  status TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  his_status TEXT,
  his_message TEXT,
  callback_at TIMESTAMPTZ,
  UNIQUE (idempotency_key)
);

CREATE TABLE IF NOT EXISTS prescription_draft_write_task (
  task_id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL REFERENCES prescription_draft(draft_id),
  status TEXT NOT NULL,
  attempt_count INT NOT NULL,
  next_attempt_at TIMESTAMPTZ NOT NULL,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  audit_id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  object_id TEXT NOT NULL,
  detail TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS research_cohort (
  cohort_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  disease_scope TEXT NOT NULL,
  inclusion_criteria TEXT NOT NULL,
  exclusion_criteria TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  frozen_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS research_variable (
  variable_id TEXT PRIMARY KEY,
  cohort_id TEXT NOT NULL REFERENCES research_cohort(cohort_id),
  name TEXT NOT NULL,
  definition TEXT NOT NULL,
  source_table TEXT NOT NULL,
  missing_policy TEXT NOT NULL,
  version TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS research_dataset_quality_check (
  check_id TEXT PRIMARY KEY,
  cohort_id TEXT NOT NULL REFERENCES research_cohort(cohort_id),
  status TEXT NOT NULL,
  total_subjects INT NOT NULL,
  missing_summary TEXT NOT NULL,
  issue_summary TEXT NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS research_analysis_run (
  run_id TEXT PRIMARY KEY,
  cohort_id TEXT NOT NULL REFERENCES research_cohort(cohort_id),
  status TEXT NOT NULL,
  script_version TEXT NOT NULL,
  statistic_plan TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  output_hash TEXT NOT NULL,
  result_summary TEXT NOT NULL,
  artifact_uri TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS research_deidentified_export (
  export_id TEXT PRIMARY KEY,
  cohort_id TEXT NOT NULL REFERENCES research_cohort(cohort_id),
  status TEXT NOT NULL,
  row_count INT NOT NULL,
  artifact_uri TEXT NOT NULL,
  data_hash TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  purpose TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS research_report_draft (
  report_id TEXT PRIMARY KEY,
  cohort_id TEXT NOT NULL REFERENCES research_cohort(cohort_id),
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  markdown_body TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT
);

CREATE TABLE IF NOT EXISTS knowledge_submission (
  submission_id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES research_report_draft(report_id),
  status TEXT NOT NULL,
  submission_type TEXT NOT NULL,
  title TEXT NOT NULL,
  submitted_by TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS knowledge_submission_review (
  review_id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES knowledge_submission(submission_id),
  reviewer_role TEXT NOT NULL,
  decision TEXT NOT NULL,
  note TEXT NOT NULL,
  reviewed_at TIMESTAMPTZ NOT NULL
);
