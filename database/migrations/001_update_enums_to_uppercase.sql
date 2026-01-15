-- Migration: Update enum values to uppercase to match UML class diagram
-- Date: 2026-01-15
-- Purpose: Align database with finalized class diagram specifications

-- This migration updates all enum-like values in the database to use uppercase
-- conventions as specified in the UML class diagram

BEGIN;

-- Update users table: role column
UPDATE users SET role = 'ADMIN' WHERE role = 'admin';
UPDATE users SET role = 'VETERINARIAN' WHERE role = 'veterinarian';
UPDATE users SET role = 'RECEPTIONIST' WHERE role = 'receptionist';

-- Update customers table: preferred_contact_method column
UPDATE customers SET preferred_contact_method = 'PHONE' WHERE preferred_contact_method = 'phone';
UPDATE customers SET preferred_contact_method = 'EMAIL' WHERE preferred_contact_method = 'email';
UPDATE customers SET preferred_contact_method = 'SMS' WHERE preferred_contact_method = 'sms';

-- Update pets table: gender column
UPDATE pets SET gender = 'MALE' WHERE gender = 'Male' OR gender = 'male';
UPDATE pets SET gender = 'FEMALE' WHERE gender = 'Female' OR gender = 'female';
UPDATE pets SET gender = NULL WHERE gender = 'Unknown' OR gender = 'unknown';

-- Update appointments table: appointment_type column
UPDATE appointments SET appointment_type = 'CHECKUP' WHERE appointment_type = 'checkup';
UPDATE appointments SET appointment_type = 'VACCINATION' WHERE appointment_type = 'vaccination';
UPDATE appointments SET appointment_type = 'SURGERY' WHERE appointment_type = 'surgery';
UPDATE appointments SET appointment_type = 'EMERGENCY' WHERE appointment_type = 'emergency';
UPDATE appointments SET appointment_type = 'FOLLOW_UP' WHERE appointment_type = 'followup' OR appointment_type = 'follow_up';
UPDATE appointments SET appointment_type = 'CONSULTATION' WHERE appointment_type = 'grooming' OR appointment_type = 'consultation';

-- Update appointments table: status column
UPDATE appointments SET status = 'SCHEDULED' WHERE status = 'scheduled';
UPDATE appointments SET status = 'CONFIRMED' WHERE status = 'confirmed';
UPDATE appointments SET status = 'IN_PROGRESS' WHERE status = 'in_progress';
UPDATE appointments SET status = 'COMPLETED' WHERE status = 'completed';
UPDATE appointments SET status = 'CANCELLED' WHERE status = 'cancelled' OR status = 'rescheduled';
UPDATE appointments SET status = 'NO_SHOW' WHERE status = 'no_show';

-- Update disease_cases table: disease_category column
UPDATE disease_cases SET disease_category = 'INFECTIOUS' WHERE disease_category = 'infectious';
UPDATE disease_cases SET disease_category = 'PARASITIC' WHERE disease_category = 'parasitic';
UPDATE disease_cases SET disease_category = 'METABOLIC' WHERE disease_category = 'chronic';
UPDATE disease_cases SET disease_category = 'GENETIC' WHERE disease_category = 'genetic';
UPDATE disease_cases SET disease_category = 'NUTRITIONAL' WHERE disease_category = 'nutritional';
UPDATE disease_cases SET disease_category = 'TRAUMATIC' WHERE disease_category = 'other';

-- Update disease_cases table: severity column
UPDATE disease_cases SET severity = 'MILD' WHERE severity = 'mild';
UPDATE disease_cases SET severity = 'MODERATE' WHERE severity = 'moderate';
UPDATE disease_cases SET severity = 'SEVERE' WHERE severity = 'severe';
UPDATE disease_cases SET severity = 'CRITICAL' WHERE severity = 'critical';

-- Update disease_cases table: outcome column
UPDATE disease_cases SET outcome = 'RECOVERED' WHERE outcome = 'recovered';
UPDATE disease_cases SET outcome = 'ONGOING_TREATMENT' WHERE outcome = 'ongoing';
UPDATE disease_cases SET outcome = 'CHRONIC' WHERE outcome = 'chronic';
UPDATE disease_cases SET outcome = 'DECEASED' WHERE outcome = 'deceased';
UPDATE disease_cases SET outcome = 'TRANSFERRED' WHERE outcome = 'unknown';

-- Update inventory table: category column
UPDATE inventory SET category = 'MEDICINE' WHERE category = 'medicine';
UPDATE inventory SET category = 'VACCINE' WHERE category = 'vaccine';
UPDATE inventory SET category = 'PET_FOOD' WHERE category = 'pet_food';
UPDATE inventory SET category = 'ACCESSORY' WHERE category IN ('pet_accessory', 'collar_leash', 'grooming', 'toy');
UPDATE inventory SET category = 'SUPPLEMENTS' WHERE category = 'supply';
UPDATE inventory SET category = 'SURGICAL_SUPPLY' WHERE category = 'equipment';

-- Update billing table: payment_status column
UPDATE billing SET payment_status = 'UNPAID' WHERE payment_status = 'pending';
UPDATE billing SET payment_status = 'PARTIALLY_PAID' WHERE payment_status = 'partial';
UPDATE billing SET payment_status = 'FULLY_PAID' WHERE payment_status = 'paid';
UPDATE billing SET payment_status = 'REFUNDED' WHERE payment_status IN ('refunded', 'cancelled');

-- Update billing table: payment_method column
UPDATE billing SET payment_method = 'CASH' WHERE payment_method = 'cash';
UPDATE billing SET payment_method = 'CARD' WHERE payment_method = 'card';
UPDATE billing SET payment_method = 'BANK_TRANSFER' WHERE payment_method = 'bank_transfer';
UPDATE billing SET payment_method = 'MOBILE_PAYMENT' WHERE payment_method IN ('cheque', 'other');

-- Update billing_items table: item_type column
UPDATE billing_items SET item_type = 'SERVICE' WHERE item_type = 'service';
UPDATE billing_items SET item_type = 'INVENTORY_ITEM' WHERE item_type IN ('product', 'medicine', 'vaccine', 'accessory');
UPDATE billing_items SET item_type = 'VACCINATION' WHERE item_type = 'vaccine';
UPDATE billing_items SET item_type = 'CONSULTATION' WHERE item_type = 'consultation';

COMMIT;
