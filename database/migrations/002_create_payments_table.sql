-- Migration: Create payments table
-- Date: 2026-01-16
-- Description: Add payments table to track payment history and support partial/multiple payments per invoice

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    payment_id SERIAL PRIMARY KEY,
    bill_id INTEGER NOT NULL REFERENCES billing(bill_id) ON DELETE CASCADE,
    payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'mobile_payment', 'insurance')),
    payment_reference VARCHAR(100), -- Transaction ID, check number, etc.
    card_type VARCHAR(20), -- Visa, Mastercard, etc.
    bank_name VARCHAR(100),
    notes TEXT,
    received_by INTEGER NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(user_id),
    updated_by INTEGER REFERENCES users(user_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_payments_bill ON payments(bill_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_payments_method ON payments(payment_method);
CREATE INDEX idx_payments_received_by ON payments(received_by);

-- Add trigger for updated_at
CREATE TRIGGER update_payments_updated_at 
BEFORE UPDATE ON payments 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE payments IS 'Tracks all payment transactions for invoices, supporting partial and multiple payments';
COMMENT ON COLUMN payments.payment_method IS 'Method of payment: cash, card, bank_transfer, mobile_payment, insurance';
COMMENT ON COLUMN payments.payment_reference IS 'Transaction reference number, check number, or insurance claim number';
