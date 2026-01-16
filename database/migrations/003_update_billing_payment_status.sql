-- Migration: Update billing payment_status to include cancelled
-- Date: 2026-01-16
-- Description: Add 'cancelled' as a valid payment_status option

-- Drop the existing constraint
ALTER TABLE billing DROP CONSTRAINT IF EXISTS billing_payment_status_check;

-- Add the new constraint with 'cancelled' option
ALTER TABLE billing ADD CONSTRAINT billing_payment_status_check 
CHECK (payment_status IN ('unpaid', 'partially_paid', 'fully_paid', 'overdue', 'refunded', 'cancelled'));
