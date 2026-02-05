-- Check for Duplicate Customer Records
-- Purpose: Identify customers with the same phone or email
-- Run this first to see if duplicates exist before running the migration

-- Query 1: Find duplicate phone numbers
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

-- Query 2: Find duplicate email addresses
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

-- Query 3: Detailed view of all duplicate customers
SELECT DISTINCT
    c1.customer_id,
    c1.first_name,
    c1.last_name,
    c1.email,
    c1.phone,
    c1.created_at::date as created_date,
    (SELECT COUNT(*) FROM pets WHERE customer_id = c1.customer_id) as pet_count,
    (SELECT COUNT(*) FROM appointments WHERE customer_id = c1.customer_id) as appointment_count,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM customers c2 
            WHERE c2.customer_id != c1.customer_id 
            AND c2.phone = c1.phone
        ) THEN 'Duplicate Phone'
        ELSE ''
    END || 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM customers c2 
            WHERE c2.customer_id != c1.customer_id 
            AND c2.email = c1.email
        ) THEN ' | Duplicate Email'
        ELSE ''
    END as duplicate_reason
FROM customers c1
WHERE EXISTS (
    SELECT 1 
    FROM customers c2 
    WHERE c1.customer_id != c2.customer_id
    AND (
        (c1.phone IS NOT NULL AND c1.phone = c2.phone)
        OR (c1.email IS NOT NULL AND c1.email = c2.email)
    )
)
ORDER BY c1.phone, c1.email, c1.customer_id;

-- Query 4: Summary count
SELECT 
    'Total duplicate customer records found' as description,
    COUNT(DISTINCT c1.customer_id) as count
FROM customers c1
WHERE EXISTS (
    SELECT 1 
    FROM customers c2 
    WHERE c1.customer_id != c2.customer_id
    AND (
        (c1.phone IS NOT NULL AND c1.phone = c2.phone)
        OR (c1.email IS NOT NULL AND c1.email = c2.email)
    )
);
