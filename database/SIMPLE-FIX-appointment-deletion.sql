-- Run this SQL to fix appointment deletion
-- Copy and paste into your PostgreSQL terminal or pgAdmin

-- Update medical_records constraint
ALTER TABLE medical_records 
DROP CONSTRAINT IF EXISTS medical_records_appointment_id_fkey CASCADE;

ALTER TABLE medical_records 
ADD CONSTRAINT medical_records_appointment_id_fkey 
FOREIGN KEY (appointment_id) 
REFERENCES appointments(appointment_id) 
ON DELETE SET NULL;

-- Update billing constraint
ALTER TABLE billing 
DROP CONSTRAINT IF EXISTS billing_appointment_id_fkey CASCADE;

ALTER TABLE billing 
ADD CONSTRAINT billing_appointment_id_fkey 
FOREIGN KEY (appointment_id) 
REFERENCES appointments(appointment_id) 
ON DELETE SET NULL;

-- Verification
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    CASE confdeltype
        WHEN 'n' THEN 'SET NULL ✅'
        ELSE 'NOT FIXED ❌'
    END AS delete_action
FROM pg_constraint
WHERE confrelid = 'appointments'::regclass
    AND conrelid::regclass IN ('medical_records'::regclass, 'billing'::regclass);
