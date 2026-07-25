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
from scripts.rag.chunking import chunk_medical_record, chunk_disease_case, chunk_lab_report, chunk_vaccination, chunk_faq
from scripts.rag.faq_data import FAQS
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
                print(f'  [{ingested + failed}/{len(rows)}] medical_record #{row["record_id"]} ingested')
            except OllamaError as e:
                failed += 1
                errors.append(f"record_id={row['record_id']}: {str(e)}")

        return {'ingested': ingested, 'failed': failed, 'errors': errors}

    finally:
        conn.close()


def ingest_disease_cases(case_id: int = None) -> dict:
    """
    Ingest disease cases into rag_chunks. Same on-write / backfill pattern
    as ingest_medical_records.
    """
    conn = get_raw_db_connection()
    ingested, failed, errors = 0, 0, []

    try:
        query = """
            SELECT
                dc.case_id, dc.pet_id, p.customer_id, p.pet_name, p.species, p.breed,
                dc.disease_name, dc.disease_category, dc.diagnosis_date, dc.severity,
                dc.outcome, dc.symptoms, dc.is_contagious, dc.transmission_method,
                dc.notes, dc.requires_followup, dc.next_followup_date
            FROM disease_cases dc
            JOIN pets p ON p.pet_id = dc.pet_id
        """
        params = ()
        if case_id is not None:
            query += " WHERE dc.case_id = %s"
            params = (case_id,)

        with conn.cursor() as cur:
            cur.execute(query, params)
            columns = [desc[0] for desc in cur.description]
            rows = [dict(zip(columns, r)) for r in cur.fetchall()]

        for row in rows:
            try:
                chunk = chunk_disease_case(row)
                _upsert_chunk(conn, chunk)
                ingested += 1
                print(f'  [{ingested + failed}/{len(rows)}] disease_case #{row["case_id"]} ingested')
            except OllamaError as e:
                failed += 1
                errors.append(f"case_id={row['case_id']}: {str(e)}")

        return {'ingested': ingested, 'failed': failed, 'errors': errors}

    finally:
        conn.close()


def ingest_lab_reports(report_id: int = None) -> dict:
    """
    Ingest lab report metadata (not file contents - see chunk_lab_report
    docstring) into rag_chunks.
    """
    conn = get_raw_db_connection()
    ingested, failed, errors = 0, 0, []

    try:
        query = """
            SELECT
                lr.report_id, lr.pet_id, p.customer_id, p.pet_name,
                lr.report_name, lr.report_type, lr.notes, lr.created_at
            FROM lab_reports lr
            JOIN pets p ON p.pet_id = lr.pet_id
        """
        params = ()
        if report_id is not None:
            query += " WHERE lr.report_id = %s"
            params = (report_id,)

        with conn.cursor() as cur:
            cur.execute(query, params)
            columns = [desc[0] for desc in cur.description]
            rows = [dict(zip(columns, r)) for r in cur.fetchall()]

        for row in rows:
            try:
                chunk = chunk_lab_report(row)
                _upsert_chunk(conn, chunk)
                ingested += 1
                print(f'  [{ingested + failed}/{len(rows)}] lab_report #{row["report_id"]} ingested')
            except OllamaError as e:
                failed += 1
                errors.append(f"report_id={row['report_id']}: {str(e)}")

        return {'ingested': ingested, 'failed': failed, 'errors': errors}

    finally:
        conn.close()


def ingest_vaccinations(vaccination_id: int = None) -> dict:
    """
    Ingest vaccination records into rag_chunks. Same on-write / backfill
    pattern as the other ingest_* functions.
    """
    conn = get_raw_db_connection()
    ingested, failed, errors = 0, 0, []

    try:
        query = """
            SELECT
                v.vaccination_id, v.pet_id, p.customer_id, p.pet_name, p.species, p.breed,
                v.vaccine_name, v.vaccine_type, v.vaccination_date, v.next_due_date,
                v.manufacturer, v.adverse_reaction, v.reaction_details, v.notes,
                (u.first_name || ' ' || u.last_name) AS administered_by_name
            FROM vaccinations v
            JOIN pets p ON p.pet_id = v.pet_id
            LEFT JOIN users u ON u.user_id = v.administered_by
        """
        params = ()
        if vaccination_id is not None:
            query += " WHERE v.vaccination_id = %s"
            params = (vaccination_id,)

        with conn.cursor() as cur:
            cur.execute(query, params)
            columns = [desc[0] for desc in cur.description]
            rows = [dict(zip(columns, r)) for r in cur.fetchall()]

        for row in rows:
            try:
                chunk = chunk_vaccination(row)
                _upsert_chunk(conn, chunk)
                ingested += 1
                print(f"  [{ingested + failed}/{len(rows)}] vaccination #{row['vaccination_id']} ingested")
            except OllamaError as e:
                failed += 1
                errors.append(f"vaccination_id={row['vaccination_id']}: {str(e)}")

        return {'ingested': ingested, 'failed': failed, 'errors': errors}

    finally:
        conn.close()


def ingest_faqs() -> dict:
    """Ingest the static FAQ/care-instruction content (public, no owner scope)."""
    conn = get_raw_db_connection()
    ingested, failed, errors = 0, 0, []

    try:
        for faq in FAQS:
            try:
                chunk = chunk_faq(faq)
                _upsert_chunk(conn, chunk)
                ingested += 1
            except OllamaError as e:
                failed += 1
                errors.append(f"faq_id={faq['id']}: {str(e)}")

        return {'ingested': ingested, 'failed': failed, 'errors': errors}

    finally:
        conn.close()


def ingest_all() -> dict:
    """Run every ingestion type in sequence. Used for full backfills."""
    results = {
        'medical_records': ingest_medical_records(),
        'disease_cases': ingest_disease_cases(),
        'lab_reports': ingest_lab_reports(),
        'vaccinations': ingest_vaccinations(),
        'faqs': ingest_faqs(),
    }
    return results


if __name__ == '__main__':
    # Manual full backfill: python scripts/rag/ingest.py
    print("Backfilling rag_chunks from all sources...")
    results = ingest_all()
    for source, result in results.items():
        print(f"{source}: ingested={result['ingested']}, failed={result['failed']}")
        for e in result['errors']:
            print(f"    - {e}")