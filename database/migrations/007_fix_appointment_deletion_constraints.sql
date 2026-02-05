-- Migration: Fix Appointment Deletion Constraints
-- Purpose: Allow appointments to be deleted by handling foreign key constraints
-- Date: 2026-02-05

-- Drop existing foreign key constraints and recreate with appropriate ON DELETE actions

-- 1. Fix medical_records.appointment_id constraint
-- Drop existing constraint
ALTER TABLE medical_records 
DROP CONSTRAINT IF EXISTS medical_records_appointment_id_fkey;

-- Add new constraint with SET NULL on delete
-- This preserves medical records even if the appointment is deleted
ALTER TABLE medical_records 
ADD CONSTRAINT medical_records_appointment_id_fkey 
FOREIGN KEY (appointment_id) 
REFERENCES appointments(appointment_id) 
ON DELETE SET NULL;

-- 2. Fix billing.appointment_id constraint
-- Drop existing constraint
ALTER TABLE billing 
DROP CONSTRAINT IF EXISTS billing_appointment_id_fkey;

-- Add new constraint with SET NULL on delete
-- This preserves billing records even if the appointment is deleted
ALTER TABLE billing 
ADD CONSTRAINT billing_appointment_id_fkey 
FOREIGN KEY (appointment_id) 
REFERENCES appointments(appointment_id) 
ON DELETE SET NULL;

-- Verification: Check the updated constraints
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table,
    confdeltype AS on_delete_action,
    CASE confdeltype
        WHEN 'a' THEN 'NO ACTION'
        WHEN 'r' THEN 'RESTRICT'
        WHEN 'c' THEN 'CASCADE'
        WHEN 'n' THEN 'SET NULL'
        WHEN 'd' THEN 'SET DEFAULT'
    END AS delete_action_description
FROM pg_constraint
WHERE confrelid = 'appointments'::regclass
ORDER BY conrelid::regclass::text;
