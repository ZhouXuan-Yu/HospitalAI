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
