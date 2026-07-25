-- Migration: Add RAG vector store
-- Enables pgvector and creates rag_chunks, the table that backs the AI
-- assistant's Retrieval-Augmented Generation (RAG) feature.
--
-- Embedding model: nomic-embed-text via Ollama (local, free) -> 768 dimensions.
-- If you switch embedding models later, this column's dimension must match.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS rag_chunks (
  chunk_id      SERIAL PRIMARY KEY,

  -- What this chunk was generated from
  source_type   VARCHAR(50) NOT NULL,   -- 'medical_record' | 'disease_case' | 'lab_report' |
                                          -- 'vaccination' | 'faq' | 'care_instruction' |
                                          -- 'pet_profile' | 'ml_output'
  source_id     VARCHAR(50) NOT NULL,   -- id of the originating row (record_id, case_id, etc.)

  -- Access-control scope so retrieval can be filtered per logged-in user.
  -- Both are nullable: public content (FAQs, care guides) has NULL for both.
  pet_id        VARCHAR(50) REFERENCES pets(pet_id) ON DELETE CASCADE,
  customer_id   VARCHAR(50) REFERENCES customers(customer_id) ON DELETE CASCADE,

  -- Text + vector
  content       TEXT NOT NULL,
  embedding     vector(768) NOT NULL,

  -- Bookkeeping
  metadata      JSONB DEFAULT '{}'::jsonb,   -- e.g. { "visit_date": "...", "veterinarian": "..." }
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vector similarity search index (cosine distance, matches the query pattern
-- used in retrieval.py: ORDER BY embedding <=> $1)
CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding
  ON rag_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Fast lookups for re-ingestion (upsert-by-source) and scoped retrieval
CREATE UNIQUE INDEX IF NOT EXISTS idx_rag_chunks_source
  ON rag_chunks(source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_pet_id ON rag_chunks(pet_id);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_customer_id ON rag_chunks(customer_id);

GRANT ALL ON TABLE rag_chunks TO vetcarepro_admin;
GRANT USAGE, SELECT ON SEQUENCE rag_chunks_chunk_id_seq TO vetcarepro_admin;
