CREATE TABLE IF NOT EXISTS research_analysis_task (
  task_id TEXT PRIMARY KEY,
  cohort_id TEXT NOT NULL REFERENCES research_cohort(cohort_id),
  status TEXT NOT NULL,
  script_version TEXT NOT NULL,
  statistic_plan TEXT NOT NULL,
  attempt_count INT NOT NULL,
  next_attempt_at TIMESTAMPTZ NOT NULL,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
