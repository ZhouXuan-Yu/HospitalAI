ALTER TABLE recommendation_decision
  ADD COLUMN IF NOT EXISTS modified_diff_json TEXT;

CREATE TABLE IF NOT EXISTS collaboration_task (
  task_id TEXT PRIMARY KEY,
  recommendation_id TEXT NOT NULL,
  encounter_id TEXT NOT NULL REFERENCES encounters(encounter_id),
  source_department TEXT NOT NULL,
  target_department TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolution TEXT
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
