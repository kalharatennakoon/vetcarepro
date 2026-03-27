-- Migration: Add medical_record_id to disease_cases
-- Creates a direct link from a disease case to the medical record that identified it

ALTER TABLE disease_cases
  ADD COLUMN IF NOT EXISTS medical_record_id INTEGER REFERENCES medical_records(record_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_disease_cases_medical_record_id
  ON disease_cases(medical_record_id);

GRANT UPDATE (medical_record_id) ON disease_cases TO vetcarepro_admin;
