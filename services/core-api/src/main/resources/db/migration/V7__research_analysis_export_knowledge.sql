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
