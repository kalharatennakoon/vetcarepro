-- Migration: Remove Duplicate Pet Records
-- Purpose: Identify and remove duplicate pets (same name under same owner)
-- Date: 2026-02-05

-- Step 1: Identify duplicate pets
-- Show duplicate pets before deletion (for verification)
SELECT 
    p1.pet_id,
    p1.customer_id,
    p1.pet_name,
    p1.species,
    p1.breed,
    p1.created_at,
    c.first_name || ' ' || c.last_name as owner_name
FROM pets p1
INNER JOIN customers c ON p1.customer_id = c.customer_id
WHERE EXISTS (
    SELECT 1 
    FROM pets p2 
    WHERE p1.customer_id = p2.customer_id 
    AND LOWER(TRIM(p1.pet_name)) = LOWER(TRIM(p2.pet_name))
    AND p1.pet_id != p2.pet_id
)
ORDER BY p1.customer_id, p1.pet_name, p1.pet_id;

-- Step 2: Create temporary table to store pets to keep (oldest record per duplicate group)
CREATE TEMP TABLE pets_to_keep AS
SELECT DISTINCT ON (customer_id, LOWER(TRIM(pet_name)))
    pet_id as keep_pet_id,
    customer_id,
    LOWER(TRIM(pet_name)) as normalized_name
FROM pets
ORDER BY customer_id, LOWER(TRIM(pet_name)), pet_id ASC;

-- Step 3: Create temporary table to store pets to delete
CREATE TEMP TABLE pets_to_delete AS
SELECT p.pet_id as delete_pet_id, ptk.keep_pet_id
FROM pets p
INNER JOIN pets_to_keep ptk 
    ON p.customer_id = ptk.customer_id 
    AND LOWER(TRIM(p.pet_name)) = ptk.normalized_name
WHERE p.pet_id != ptk.keep_pet_id;

-- Step 4: Show what will be deleted and merged
SELECT 
    ptd.delete_pet_id as "Pet ID to Delete",
    ptd.keep_pet_id as "Will be Merged Into",
    p1.pet_name as "Pet Name",
    p1.species,
    c.first_name || ' ' || c.last_name as "Owner",
    (SELECT COUNT(*) FROM appointments WHERE pet_id = ptd.delete_pet_id) as "Appointments",
    (SELECT COUNT(*) FROM medical_records WHERE pet_id = ptd.delete_pet_id) as "Medical Records",
    (SELECT COUNT(*) FROM vaccinations WHERE pet_id = ptd.delete_pet_id) as "Vaccinations"
FROM pets_to_delete ptd
INNER JOIN pets p1 ON ptd.delete_pet_id = p1.pet_id
INNER JOIN customers c ON p1.customer_id = c.customer_id;

-- Step 5: Update all related records to point to the kept pet

-- Update appointments
UPDATE appointments a
SET pet_id = ptd.keep_pet_id,
    updated_at = CURRENT_TIMESTAMP
FROM pets_to_delete ptd
WHERE a.pet_id = ptd.delete_pet_id;

-- Update medical records
UPDATE medical_records mr
SET pet_id = ptd.keep_pet_id,
    updated_at = CURRENT_TIMESTAMP
FROM pets_to_delete ptd
WHERE mr.pet_id = ptd.delete_pet_id;

-- Update vaccinations
UPDATE vaccinations v
SET pet_id = ptd.keep_pet_id,
    updated_at = CURRENT_TIMESTAMP
FROM pets_to_delete ptd
WHERE v.pet_id = ptd.delete_pet_id;

-- Update disease cases (if any reference duplicates)
UPDATE disease_cases dc
SET pet_id = ptd.keep_pet_id,
    updated_at = CURRENT_TIMESTAMP
FROM pets_to_delete ptd
WHERE dc.pet_id = ptd.delete_pet_id;

-- Update billing items (if billing_items table exists and references pets)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'billing_items'
    ) THEN
        UPDATE billing_items bi
        SET updated_at = CURRENT_TIMESTAMP
        FROM billing b
        JOIN pets_to_delete ptd ON b.pet_id = ptd.delete_pet_id
        WHERE bi.billing_id = b.billing_id;
        
        UPDATE billing b
        SET pet_id = ptd.keep_pet_id,
            updated_at = CURRENT_TIMESTAMP
        FROM pets_to_delete ptd
        WHERE b.pet_id = ptd.delete_pet_id;
    END IF;
END $$;

-- Step 6: Merge pet details (keep most recent non-null values)
-- Update kept pets with any additional info from duplicates
UPDATE pets p
SET 
    photo_url = COALESCE(p.photo_url, dup.photo_url),
    breed = COALESCE(p.breed, dup.breed),
    date_of_birth = COALESCE(p.date_of_birth, dup.date_of_birth),
    color = COALESCE(p.color, dup.color),
    weight_current = COALESCE(dup.weight_current, p.weight_current), -- Take most recent weight
    insurance_provider = COALESCE(p.insurance_provider, dup.insurance_provider),
    insurance_policy_number = COALESCE(p.insurance_policy_number, dup.insurance_policy_number),
    is_neutered = CASE WHEN dup.is_neutered = true THEN true ELSE p.is_neutered END,
    allergies = COALESCE(
        CASE 
            WHEN p.allergies IS NOT NULL AND dup.allergies IS NOT NULL 
            THEN p.allergies || '; ' || dup.allergies
            ELSE COALESCE(p.allergies, dup.allergies)
        END,
        p.allergies
    ),
    special_needs = COALESCE(
        CASE 
            WHEN p.special_needs IS NOT NULL AND dup.special_needs IS NOT NULL 
            THEN p.special_needs || '; ' || dup.special_needs
            ELSE COALESCE(p.special_needs, dup.special_needs)
        END,
        p.special_needs
    ),
    notes = COALESCE(
        CASE 
            WHEN p.notes IS NOT NULL AND dup.notes IS NOT NULL 
            THEN p.notes || ' | Merged duplicate: ' || dup.notes
            ELSE COALESCE(p.notes, dup.notes)
        END,
        p.notes
    ),
    updated_at = CURRENT_TIMESTAMP
FROM pets dup
INNER JOIN pets_to_delete ptd ON dup.pet_id = ptd.delete_pet_id
WHERE p.pet_id = ptd.keep_pet_id;

-- Step 7: Delete duplicate pet records
DELETE FROM pets
WHERE pet_id IN (SELECT delete_pet_id FROM pets_to_delete);

-- Step 8: Show summary of changes
SELECT 
    'Duplicate Pets Removed' as action,
    COUNT(*) as count
FROM pets_to_delete;

-- Clean up temporary tables
DROP TABLE IF EXISTS pets_to_delete;
DROP TABLE IF EXISTS pets_to_keep;

-- Verification query - This should return no results if successful
SELECT 
    customer_id,
    LOWER(TRIM(pet_name)) as pet_name,
    COUNT(*) as duplicate_count
FROM pets
GROUP BY customer_id, LOWER(TRIM(pet_name))
HAVING COUNT(*) > 1;
