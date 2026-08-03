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

CREATE TABLE IF NOT EXISTS rule_execution (
  execution_id TEXT PRIMARY KEY,
  recommendation_id TEXT NOT NULL,
  encounter_id TEXT NOT NULL REFERENCES encounters(encounter_id),
  rule_id TEXT NOT NULL,
  rule_version TEXT NOT NULL,
  result_level TEXT NOT NULL,
  blocked BOOLEAN NOT NULL,
  matched_facts TEXT NOT NULL,
  message TEXT NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL
);
