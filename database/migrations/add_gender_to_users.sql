-- Migration: Add gender column to users table
-- Date: 2026-02-13
-- Description: Add gender field to support proper title prefixes (Mr./Ms./Dr.)

-- Add gender column to users table
ALTER TABLE users 
ADD COLUMN gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other'));

-- Add comment to explain the column
COMMENT ON COLUMN users.gender IS 'User gender for proper title prefix (Mr./Ms./Dr.)';

-- Update existing users to have a default value (optional)
-- This can be adjusted based on actual data or left as NULL
UPDATE users SET gender = 'male' WHERE gender IS NULL;
