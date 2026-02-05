-- Check for Duplicate Pet Records
-- Purpose: Identify pets with the same name under the same owner
-- Run this first to see if duplicates exist before running the migration

-- Query 1: Show all duplicate pet records with details
SELECT 
    p.pet_id,
    p.customer_id,
    c.first_name || ' ' || c.last_name as owner_name,
    c.phone as owner_phone,
    p.pet_name,
    p.species,
    p.breed,
    p.date_of_birth,
    p.created_at,
    (SELECT COUNT(*) FROM appointments WHERE pet_id = p.pet_id) as appointment_count,
    (SELECT COUNT(*) FROM medical_records WHERE pet_id = p.pet_id) as medical_record_count,
    (SELECT COUNT(*) FROM vaccinations WHERE pet_id = p.pet_id) as vaccination_count
FROM pets p
INNER JOIN customers c ON p.customer_id = c.customer_id
WHERE EXISTS (
    SELECT 1 
    FROM pets p2 
    WHERE p.customer_id = p2.customer_id 
    AND LOWER(TRIM(p.pet_name)) = LOWER(TRIM(p2.pet_name))
    AND p.pet_id != p2.pet_id
)
ORDER BY c.first_name, c.last_name, p.pet_name, p.created_at;

-- Query 2: Summary of duplicates by owner
SELECT 
    c.customer_id,
    c.first_name || ' ' || c.last_name as owner_name,
    LOWER(TRIM(p.pet_name)) as pet_name,
    COUNT(*) as duplicate_count,
    STRING_AGG(p.pet_id::text, ', ' ORDER BY p.pet_id) as pet_ids
FROM pets p
INNER JOIN customers c ON p.customer_id = c.customer_id
WHERE EXISTS (
    SELECT 1 
    FROM pets p2 
    WHERE p.customer_id = p2.customer_id 
    AND LOWER(TRIM(p.pet_name)) = LOWER(TRIM(p2.pet_name))
    AND p.pet_id != p2.pet_id
)
GROUP BY c.customer_id, c.first_name, c.last_name, LOWER(TRIM(p.pet_name))
ORDER BY c.customer_id, pet_name;

-- Query 3: Total count of duplicate records
SELECT 
    'Total duplicate pet records found' as description,
    COUNT(*) as count
FROM pets p
WHERE EXISTS (
    SELECT 1 
    FROM pets p2 
    WHERE p.customer_id = p2.customer_id 
    AND LOWER(TRIM(p.pet_name)) = LOWER(TRIM(p2.pet_name))
    AND p.pet_id != p2.pet_id
);
