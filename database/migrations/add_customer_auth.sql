-- Migration: Add authentication fields to customers table
-- Date: 2026-07-26
-- Purpose: Enable pet-owner portal login. Customers log in with their email
-- or phone number as username. Every customer starts with the clinic-wide
-- default password below and is forced to change it on first login, mirroring
-- the existing users.password_must_change pattern.

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_must_change BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

COMMENT ON COLUMN customers.password_hash IS 'Bcrypt hash for pet-owner portal login';
COMMENT ON COLUMN customers.password_must_change IS 'Flag indicating the customer must change their password on next login';
COMMENT ON COLUMN customers.last_login IS 'Last successful pet-owner portal login';

-- Backfill existing customers with the clinic-wide default password so they
-- can log in for the first time. They will be forced to change it
-- immediately afterwards (password_must_change defaults to true above).
--
-- Default password: VetCare@123
-- (bcrypt hash below, generated with the same salt rounds as server/src/utils/authUtils.js)
UPDATE customers
SET password_hash = '$2b$10$NeiOm8GgzQnBbrwS6FD/zuY4WGpUQpexOlVCItcPw6WstME5LI9Xm'
WHERE password_hash IS NULL;

-- Going forward, password_hash should never be null for a customer -
-- newly created customers get the same default assigned by createCustomer()
-- in server/src/models/customerModel.js.
ALTER TABLE customers
ALTER COLUMN password_hash SET NOT NULL;
