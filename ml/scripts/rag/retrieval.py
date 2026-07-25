"""
RAG Retrieval
Semantic search over rag_chunks, scoped by who is asking:
  - staff (admin/veterinarian/receptionist): can see clinic-wide chunks
  - pet_owner: only chunks tied to their own customer_id
  - guest: only public chunks (pet_id IS NULL AND customer_id IS NULL) - e.g. FAQs

This is the enforcement point that keeps private medical data private -
the caller (Flask route) must always pass the requester's role + customer_id.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from config.db_connection import get_raw_db_connection
from scripts.rag.ollama_client import embed_text

STAFF_ROLES = {'admin', 'veterinarian', 'receptionist'}


def retrieve_chunks(question: str, role: str, customer_id: str = None, top_k: int = 5) -> list:
    """
    Retrieve the top_k most relevant chunks for a question, filtered by scope.

    Args:
        question: the user's natural-language question
        role: 'guest' | 'pet_owner' | one of STAFF_ROLES
        customer_id: required when role == 'pet_owner', ignored otherwise
        top_k: number of chunks to return

    Returns:
        list[dict]: chunks with content, source_type, source_id, metadata, distance
    """
    query_embedding = embed_text(question)
    embedding_literal = '[' + ','.join(str(x) for x in query_embedding) + ']'

    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            if role in STAFF_ROLES:
                # Staff: clinic-wide access (private + public chunks)
                cur.execute("""
                    SELECT chunk_id, source_type, source_id, content, metadata,
                           embedding <=> %s::vector AS distance
                    FROM rag_chunks
                    ORDER BY distance ASC
                    LIMIT %s
                """, (embedding_literal, top_k))

            elif role == 'pet_owner':
                if not customer_id:
                    raise ValueError('customer_id is required for role=pet_owner')
                # Owner: their own records + public content only
                cur.execute("""
                    SELECT chunk_id, source_type, source_id, content, metadata,
                           embedding <=> %s::vector AS distance
                    FROM rag_chunks
                    WHERE customer_id = %s
                       OR (pet_id IS NULL AND customer_id IS NULL)
                    ORDER BY distance ASC
                    LIMIT %s
                """, (embedding_literal, customer_id, top_k))

            else:
                # Guest: public content only (e.g. FAQs, general care instructions)
                cur.execute("""
                    SELECT chunk_id, source_type, source_id, content, metadata,
                           embedding <=> %s::vector AS distance
                    FROM rag_chunks
                    WHERE pet_id IS NULL AND customer_id IS NULL
                    ORDER BY distance ASC
                    LIMIT %s
                """, (embedding_literal, top_k))

            columns = [desc[0] for desc in cur.description]
            return [dict(zip(columns, r)) for r in cur.fetchall()]
    finally:
        conn.close()
