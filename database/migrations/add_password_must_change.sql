-- Migration: Add password_must_change column to users table
-- Date: 2026-02-13
-- Purpose: Track users who need to change their password on first login

-- Add password_must_change column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_must_change BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN users.password_must_change IS 'Flag indicating if user must change password on next login';
