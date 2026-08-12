-- Migration: Add AI daily briefing cache
-- Backs the staff dashboard "AI Daily Briefing" card. One row per staff
-- user per calendar day, caching the LLM-generated summary so the
-- aggregation + Ollama generation call only runs once per user per day
-- rather than on every dashboard load.

CREATE TABLE IF NOT EXISTS ai_briefings (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  role           VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'veterinarian', 'receptionist')),
  briefing_date  DATE NOT NULL,
  content        JSONB NOT NULL,   -- { "summary": "...", "bullets": ["...", "..."] }
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- One cached briefing per user per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_briefings_user_date
  ON ai_briefings(user_id, briefing_date);

GRANT ALL ON TABLE ai_briefings TO vetcarepro_admin;
GRANT USAGE, SELECT ON SEQUENCE ai_briefings_id_seq TO vetcarepro_admin;
