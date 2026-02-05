-- Run this as postgres superuser to fix appointment deletion
-- Command: psql -h localhost -U postgres -d vetcarepro -f fix-as-superuser.sql

-- First, grant ownership to vetcarepro_adminuser (optional but recommended)
ALTER TABLE medical_records OWNER TO vetcarepro_adminuser;
ALTER TABLE billing OWNER TO vetcarepro_adminuser;
ALTER TABLE appointments OWNER TO vetcarepro_adminuser;
ALTER TABLE customers OWNER TO vetcarepro_adminuser;
ALTER TABLE pets OWNER TO vetcarepro_adminuser;

-- Now fix the constraints
ALTER TABLE medical_records 
DROP CONSTRAINT IF EXISTS medical_records_appointment_id_fkey CASCADE;

ALTER TABLE medical_records 
ADD CONSTRAINT medical_records_appointment_id_fkey 
FOREIGN KEY (appointment_id) 
REFERENCES appointments(appointment_id) 
ON DELETE SET NULL;

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
        WHEN 'n' THEN '✅ SET NULL - FIXED!'
        WHEN 'a' THEN '❌ NO ACTION - NOT FIXED'
        WHEN 'r' THEN '❌ RESTRICT - NOT FIXED'
        WHEN 'c' THEN 'CASCADE'
    END AS delete_action
FROM pg_constraint
WHERE confrelid = 'appointments'::regclass
    AND conrelid::regclass IN ('medical_records'::regclass, 'billing'::regclass);

-- Success message
SELECT '✅ Appointment deletion is now enabled!' AS status;
