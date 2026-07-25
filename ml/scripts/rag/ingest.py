"""
RAG Ingestion
Pulls source records from Postgres, converts them to text chunks, embeds them
via Ollama, and upserts into rag_chunks.

Start scope: medical_records only (proves the embed -> store -> retrieve loop).
Extend with more source_types (disease_cases, lab_reports, faqs, ...) by adding
a loader + chunker and a new ingest_* function below.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from config.db_connection import get_raw_db_connection
from scripts.rag.chunking import chunk_medical_record
from scripts.rag.ollama_client import embed_text, OllamaError


def _upsert_chunk(conn, chunk: dict):
    """Insert or update a single rag_chunks row, keyed on (source_type, source_id)."""
    embedding = embed_text(chunk['content'])
    # pgvector expects a string like '[0.1,0.2,...]'
    embedding_literal = '[' + ','.join(str(x) for x in embedding) + ']'

    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO rag_chunks (source_type, source_id, pet_id, customer_id, content, embedding, metadata, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s::vector, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (source_type, source_id)
            DO UPDATE SET
                content = EXCLUDED.content,
                embedding = EXCLUDED.embedding,
                metadata = EXCLUDED.metadata,
                pet_id = EXCLUDED.pet_id,
                customer_id = EXCLUDED.customer_id,
                updated_at = CURRENT_TIMESTAMP
        """, (
            chunk['source_type'], chunk['source_id'], chunk.get('pet_id'),
            chunk.get('customer_id'), chunk['content'], embedding_literal,
            _to_jsonb(chunk.get('metadata', {}))
        ))
    conn.commit()


def _to_jsonb(d: dict) -> str:
    import json
    return json.dumps(d)


def ingest_medical_records(record_id: int = None) -> dict:
    """
    Ingest medical records into rag_chunks.

    Args:
        record_id: if given, only (re)ingest this single record (used for
                   on-write ingestion right after a create/update). If None,
                   backfills all existing medical records.

    Returns:
        dict summary: {ingested: int, failed: int, errors: [...]}
    """
    conn = get_raw_db_connection()
    ingested, failed, errors = 0, 0, []

    try:
        query = """
            SELECT
                mr.record_id, mr.pet_id, p.customer_id, p.pet_name, p.species, p.breed,
                mr.visit_date, mr.chief_complaint, mr.symptoms, mr.diagnosis,
                mr.treatment, mr.prescription, mr.follow_up_required, mr.follow_up_date,
                (u.first_name || ' ' || u.last_name) AS veterinarian_name
            FROM medical_records mr
            JOIN pets p ON p.pet_id = mr.pet_id
            LEFT JOIN users u ON u.user_id = mr.veterinarian_id
        """
        params = ()
        if record_id is not None:
            query += " WHERE mr.record_id = %s"
            params = (record_id,)

        with conn.cursor() as cur:
            cur.execute(query, params)
            columns = [desc[0] for desc in cur.description]
            rows = [dict(zip(columns, r)) for r in cur.fetchall()]

        for row in rows:
            try:
                chunk = chunk_medical_record(row)
                _upsert_chunk(conn, chunk)
                ingested += 1
            except OllamaError as e:
                failed += 1
                errors.append(f"record_id={row['record_id']}: {str(e)}")

        return {'ingested': ingested, 'failed': failed, 'errors': errors}

    finally:
        conn.close()


if __name__ == '__main__':
    # Manual backfill: python scripts/rag/ingest.py
    print("Backfilling rag_chunks from existing medical_records...")
    result = ingest_medical_records()
    print(f"Done. Ingested: {result['ingested']}, Failed: {result['failed']}")
    if result['errors']:
        print("Errors:")
        for e in result['errors']:
            print(f"  - {e}")
