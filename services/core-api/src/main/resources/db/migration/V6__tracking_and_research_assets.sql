CREATE TABLE IF NOT EXISTS medication_timeline_event (
  event_id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(patient_id),
  encounter_id TEXT NOT NULL REFERENCES encounters(encounter_id),
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
  patient_id TEXT NOT NULL REFERENCES patients(patient_id),
  encounter_id TEXT NOT NULL REFERENCES encounters(encounter_id),
  drug_code TEXT NOT NULL,
  effectiveness TEXT NOT NULL,
  adverse_signal TEXT NOT NULL,
  reporter_role TEXT NOT NULL,
  note TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS discharge_outcome (
  outcome_id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(patient_id),
  encounter_id TEXT NOT NULL REFERENCES encounters(encounter_id),
  outcome_status TEXT NOT NULL,
  readmission_risk TEXT NOT NULL,
  followup_required BOOLEAN NOT NULL,
  note TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL
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
