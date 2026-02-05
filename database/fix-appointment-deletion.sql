-- Quick Fix for Appointment Deletion (Run as postgres superuser)
-- This grants necessary permissions and updates constraints

-- Grant ownership/permissions to vetcarepro_adminuser
ALTER TABLE medical_records OWNER TO vetcarepro_adminuser;
ALTER TABLE billing OWNER TO vetcarepro_adminuser;
ALTER TABLE appointments OWNER TO vetcarepro_adminuser;

-- Now apply the constraint fixes
ALTER TABLE medical_records 
DROP CONSTRAINT IF EXISTS medical_records_appointment_id_fkey;

ALTER TABLE medical_records 
ADD CONSTRAINT medical_records_appointment_id_fkey 
FOREIGN KEY (appointment_id) 
REFERENCES appointments(appointment_id) 
ON DELETE SET NULL;

ALTER TABLE billing 
DROP CONSTRAINT IF EXISTS billing_appointment_id_fkey;

ALTER TABLE billing 
ADD CONSTRAINT billing_appointment_id_fkey 
FOREIGN KEY (appointment_id) 
REFERENCES appointments(appointment_id) 
ON DELETE SET NULL;

-- Verify
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    CASE confdeltype
        WHEN 'a' THEN 'NO ACTION'
        WHEN 'r' THEN 'RESTRICT'
        WHEN 'c' THEN 'CASCADE'
        WHEN 'n' THEN 'SET NULL'
        WHEN 'd' THEN 'SET DEFAULT'
    END AS delete_action
FROM pg_constraint
WHERE confrelid = 'appointments'::regclass
ORDER BY conrelid::regclass::text;
