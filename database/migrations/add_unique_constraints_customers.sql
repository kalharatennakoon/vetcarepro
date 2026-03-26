-- Add unique constraints to customers table
-- phone: required field, enforce uniqueness
-- email: optional (NULLs allowed by PostgreSQL UNIQUE), enforce uniqueness when provided
-- nic: optional (NULLs allowed by PostgreSQL UNIQUE), enforce uniqueness when provided

ALTER TABLE customers ADD CONSTRAINT customers_phone_unique UNIQUE (phone);

-- Partial unique index for email: only enforce uniqueness on non-null values
CREATE UNIQUE INDEX customers_email_unique ON customers (email) WHERE email IS NOT NULL;

-- Partial unique index for nic: only enforce uniqueness on non-null values
CREATE UNIQUE INDEX customers_nic_unique ON customers (nic) WHERE nic IS NOT NULL;
