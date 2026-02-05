-- Migration: Remove Duplicate Customer Records
-- Purpose: Identify and remove duplicate customers (same phone or email)
-- Date: 2026-02-05

-- Step 1: Identify duplicate customers
-- Show duplicate customers before deletion (for verification)
SELECT 
    phone,
    COUNT(*) as duplicate_count,
    STRING_AGG(customer_id::text, ', ' ORDER BY customer_id) as customer_ids,
    STRING_AGG(first_name || ' ' || last_name, ', ' ORDER BY customer_id) as customer_names
FROM customers
WHERE phone IS NOT NULL AND TRIM(phone) != ''
GROUP BY phone
HAVING COUNT(*) > 1
ORDER BY phone;

SELECT 
    email,
    COUNT(*) as duplicate_count,
    STRING_AGG(customer_id::text, ', ' ORDER BY customer_id) as customer_ids,
    STRING_AGG(first_name || ' ' || last_name, ', ' ORDER BY customer_id) as customer_names
FROM customers
WHERE email IS NOT NULL AND TRIM(email) != ''
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY email;

-- Step 2: Create temporary table to store customers to keep (by phone)
CREATE TEMP TABLE customers_to_keep_by_phone AS
SELECT DISTINCT ON (phone)
    customer_id as keep_customer_id,
    phone
FROM customers
WHERE phone IS NOT NULL AND TRIM(phone) != ''
ORDER BY phone, customer_id ASC;

-- Step 3: Create temporary table to store customers to keep (by email)
CREATE TEMP TABLE customers_to_keep_by_email AS
SELECT DISTINCT ON (email)
    customer_id as keep_customer_id,
    email
FROM customers
WHERE email IS NOT NULL AND TRIM(email) != ''
    AND customer_id NOT IN (SELECT keep_customer_id FROM customers_to_keep_by_phone)
ORDER BY email, customer_id ASC;

-- Step 4: Create comprehensive list of customers to delete
CREATE TEMP TABLE customers_to_delete AS
SELECT 
    c.customer_id as delete_customer_id, 
    ctkp.keep_customer_id
FROM customers c
INNER JOIN customers_to_keep_by_phone ctkp ON c.phone = ctkp.phone
WHERE c.customer_id != ctkp.keep_customer_id
UNION
SELECT 
    c.customer_id as delete_customer_id, 
    ctke.keep_customer_id
FROM customers c
INNER JOIN customers_to_keep_by_email ctke ON c.email = ctke.email
WHERE c.customer_id != ctke.keep_customer_id
    AND c.customer_id NOT IN (
        SELECT delete_customer_id FROM (
            SELECT c2.customer_id as delete_customer_id
            FROM customers c2
            INNER JOIN customers_to_keep_by_phone ctkp2 ON c2.phone = ctkp2.phone
            WHERE c2.customer_id != ctkp2.keep_customer_id
        ) phone_dupes
    );

-- Step 5: Show what will be deleted and merged
SELECT 
    ctd.delete_customer_id as "Customer ID to Delete",
    ctd.keep_customer_id as "Will be Merged Into",
    c1.first_name || ' ' || c1.last_name as "Customer Name",
    c1.phone,
    c1.email,
    (SELECT COUNT(*) FROM pets WHERE customer_id = ctd.delete_customer_id) as "Pets",
    (SELECT COUNT(*) FROM appointments WHERE customer_id = ctd.delete_customer_id) as "Appointments"
FROM customers_to_delete ctd
INNER JOIN customers c1 ON ctd.delete_customer_id = c1.customer_id
ORDER BY c1.first_name, c1.last_name;

-- Step 6: Update all related records to point to the kept customer

-- Update pets
UPDATE pets p
SET customer_id = ctd.keep_customer_id,
    updated_at = CURRENT_TIMESTAMP
FROM customers_to_delete ctd
WHERE p.customer_id = ctd.delete_customer_id;

-- Update appointments
UPDATE appointments a
SET customer_id = ctd.keep_customer_id,
    updated_at = CURRENT_TIMESTAMP
FROM customers_to_delete ctd
WHERE a.customer_id = ctd.delete_customer_id;

-- Update billing records (if billing table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'billing'
    ) THEN
        UPDATE billing b
        SET customer_id = ctd.keep_customer_id,
            updated_at = CURRENT_TIMESTAMP
        FROM customers_to_delete ctd
        WHERE b.customer_id = ctd.delete_customer_id;
    END IF;
END $$;

-- Step 7: Delete duplicate customer records
DELETE FROM customers
WHERE customer_id IN (SELECT delete_customer_id FROM customers_to_delete);

-- Step 8: Show summary of changes
SELECT 
    'Duplicate Customers Removed' as action,
    COUNT(*) as count
FROM customers_to_delete;

-- Clean up temporary tables
DROP TABLE IF EXISTS customers_to_delete;
DROP TABLE IF EXISTS customers_to_keep_by_email;
DROP TABLE IF EXISTS customers_to_keep_by_phone;

-- Verification queries - These should return no results if successful
SELECT 
    phone,
    COUNT(*) as duplicate_count
FROM customers
WHERE phone IS NOT NULL AND TRIM(phone) != ''
GROUP BY phone
HAVING COUNT(*) > 1;

SELECT 
    email,
    COUNT(*) as duplicate_count
FROM customers
WHERE email IS NOT NULL AND TRIM(email) != ''
GROUP BY email
HAVING COUNT(*) > 1;
