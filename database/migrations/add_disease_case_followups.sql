-- Migration: Add disease_case_followups table
-- Stores individual follow-up visit records for disease cases

CREATE TABLE IF NOT EXISTS disease_case_followups (
  followup_id   SERIAL PRIMARY KEY,
  case_id       INTEGER NOT NULL REFERENCES disease_cases(case_id) ON DELETE CASCADE,
  visit_date    DATE NOT NULL,
  notes         TEXT NOT NULL,
  next_followup_date DATE,
  recorded_by   INTEGER REFERENCES users(user_id),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_disease_case_followups_case_id
  ON disease_case_followups(case_id);

GRANT ALL ON TABLE disease_case_followups TO vetcarepro_admin;
GRANT USAGE, SELECT ON SEQUENCE disease_case_followups_followup_id_seq TO vetcarepro_admin;
