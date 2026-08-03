CREATE TABLE IF NOT EXISTS recommendation_snapshot (
  recommendation_id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL REFERENCES encounters(encounter_id),
  patient_id TEXT NOT NULL REFERENCES patients(patient_id),
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
  encounter_id TEXT NOT NULL REFERENCES encounters(encounter_id),
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  reason TEXT NOT NULL,
  assigned_role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolution TEXT
);

ALTER TABLE prescription_draft
  ADD COLUMN IF NOT EXISTS his_status TEXT,
  ADD COLUMN IF NOT EXISTS his_message TEXT,
  ADD COLUMN IF NOT EXISTS callback_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prescription_draft_idempotency_key_key'
  ) THEN
    ALTER TABLE prescription_draft ADD CONSTRAINT prescription_draft_idempotency_key_key UNIQUE (idempotency_key);
  END IF;
END $$;
