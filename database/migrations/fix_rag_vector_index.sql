-- Migration: Replace the rag_chunks ivfflat index with HNSW
--
-- Fixes silent, severe recall loss in the AI assistant's retrieval.
--
-- add_rag_vector_store.sql originally created:
--   CREATE INDEX idx_rag_chunks_embedding
--     ON rag_chunks USING ivfflat (embedding vector_cosine_ops)
--     WITH (lists = 100);
--
-- Two things made that index actively wrong rather than merely approximate:
--
--   1. ivfflat clusters existing rows into `lists` buckets at CREATE INDEX
--      time. That migration creates the table and the index together, so the
--      index was always built on an EMPTY table - the centroids never saw a
--      single embedding, and every row ingested afterwards was filed against
--      arbitrary ones.
--   2. `lists = 100` with the default `ivfflat.probes = 1` means a query scans
--      one hundredth of the table. Some of those lists hold no rows at all, so
--      a query landing on one returns ZERO results.
--
-- Observed on a 649-chunk database before this fix, on the clinic-wide staff
-- retrieval path (the only query whose plan actually used the index - every
-- other role's WHERE clause made the planner choose an exact seq scan):
--
--   "how important is dental care?"  -> index returned []
--                                       exact answer was faq/dental-001 @ 0.309
--   Across the 22 public FAQ questions: only 11 returned the right FAQ,
--   9 dropped it out of the top-5 entirely, and 2 returned nothing.
--
-- HNSW has no empty-table failure mode (its graph is built incrementally on
-- insert) and gives near-exact recall at the default ef_search = 40, so this
-- needs no session GUC in application code to be correct.

DROP INDEX IF EXISTS idx_rag_chunks_embedding;

CREATE INDEX idx_rag_chunks_embedding
  ON rag_chunks USING hnsw (embedding vector_cosine_ops);

ANALYZE rag_chunks;
