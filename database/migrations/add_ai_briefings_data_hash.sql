-- Migration: Add data_hash to ai_briefings
-- The briefing cache was keyed only on (user_id, briefing_date), so once
-- generated it never reflected same-day changes (e.g. new appointments)
-- until midnight. data_hash lets briefingService.js detect that the
-- underlying numeric data changed and regenerate the Ollama summary,
-- while still skipping the LLM call when nothing has changed since the
-- last request.

ALTER TABLE ai_briefings ADD COLUMN IF NOT EXISTS data_hash VARCHAR(64);
