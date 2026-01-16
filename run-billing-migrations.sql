-- Run billing migrations
-- Execute this file in PostgreSQL to set up the billing module

\echo 'Creating payments table...'
\i database/migrations/002_create_payments_table.sql

\echo 'Updating billing payment status...'
\i database/migrations/003_update_billing_payment_status.sql

\echo 'Migrations completed successfully!'
