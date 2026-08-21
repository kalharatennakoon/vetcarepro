-- Add unique constraints to customers table
-- address, emergency_phone: optional fields, enforce uniqueness across
-- customers when provided (NULLs and empty strings are exempt, matching
-- the pattern in add_unique_constraints_customers.sql for email/nic)

CREATE UNIQUE INDEX customers_address_unique ON customers (address) WHERE address IS NOT NULL AND address != '';

CREATE UNIQUE INDEX customers_emergency_phone_unique ON customers (emergency_phone) WHERE emergency_phone IS NOT NULL AND emergency_phone != '';
