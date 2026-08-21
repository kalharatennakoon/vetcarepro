-- Migration: Fix business_hours_start/end to match actual booking enforcement
-- Date: 2026-08-07
-- Purpose: seed.sql originally seeded 08:00-18:00, but the real booking rules
-- in server/src/utils/appointmentRules.js (CLINIC_OPEN_TIME/CLINIC_CLOSE_TIME)
-- have always been 09:00-18:30 - the portal refuses any slot before 09:00 or
-- after 18:00, contradicting what a database seeded from the old values would
-- report. Only touches rows still holding the stale default, so an admin who
-- already edited these settings via the app keeps their own values.

UPDATE system_settings
SET setting_value = '09:00', updated_at = CURRENT_TIMESTAMP
WHERE setting_key = 'business_hours_start' AND setting_value = '08:00';

UPDATE system_settings
SET setting_value = '18:30', updated_at = CURRENT_TIMESTAMP
WHERE setting_key = 'business_hours_end' AND setting_value = '18:00';
