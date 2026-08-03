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

CREATE TABLE IF NOT EXISTS recommendation_decision (
  decision_id TEXT PRIMARY KEY,
  recommendation_id TEXT NOT NULL,
  encounter_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  action TEXT NOT NULL,
  original_version TEXT NOT NULL,
  modified_regimen TEXT,
  reason TEXT NOT NULL,
  actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS prescription_draft (
  draft_id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL,
  encounter_id TEXT NOT NULL,
  status TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  audit_id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  object_id TEXT NOT NULL,
  detail TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
