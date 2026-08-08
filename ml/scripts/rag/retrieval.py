"""
RAG Retrieval
Semantic search over rag_chunks, scoped by who is asking:
  - staff (admin/veterinarian): can see clinic-wide chunks, including
    internal staff_faq content
  - staff (receptionist): clinic-wide chunks minus clinical detail
    (disease_case, lab_report, medical_record) - still includes vaccinations,
    the public faq set, and staff_faq
  - pet_owner: only chunks tied to their own customer_id, plus public faq
  - guest: only public faq chunks (pet_id IS NULL AND customer_id IS NULL,
    excluding staff_faq even though those share the same NULL scoping)

This is the enforcement point that keeps private medical data private -
the caller (Flask route) must always pass the requester's role + customer_id.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from config.db_connection import get_raw_db_connection
from scripts.rag.ollama_client import embed_text

STAFF_ROLES = {'admin', 'veterinarian', 'receptionist'}

# Guest retrieval (unlike staff/owner) is always a plain top-k with no
# relevance floor, so a question with no real FAQ match still gets the
# closest 5 articles back - and the frontend would show those as "Sources"
# even though they didn't actually inform the answer. Empirically (cosine
# distance via embedding <=> %s::vector), a genuinely on-topic FAQ scores
# well under this, while a same-general-subject-but-not-really-relevant
# near-miss (e.g. FAQs about checkups/vaccines when asked about feeding
# schedules) sits meaningfully higher - so filter those out rather than
# present them as if they grounded the answer.
GUEST_RELEVANCE_THRESHOLD = 0.32

# ...except for FAQs about VetCare Pro ITSELF, which get a looser floor.
#
# The threshold above is safe for general pet-care topics precisely because
# dropping a weak chunk is harmless there: GUEST_SYSTEM_PROMPT rule 1 tells
# the model to fall back on general veterinary knowledge, so the guest still
# gets a useful answer. That reasoning inverts for clinic/platform/assistant
# questions - rule 3 forbids inventing facts about VetCare Pro, so filtering
# the one chunk that could have answered leaves NO way to answer at all. The
# observed failures were a prospective user asking "can I use the app on my
# iphone?" (platform-001 @ 0.354) being told the assistant only handles
# pet-care questions, and "do you have an android app" (0.391) getting an
# ungrounded answer in violation of rule 3.
#
# 0.45 clears every on-topic phrasing measured for these categories (worst
# was "can I book online" @ 0.419) while still excluding genuinely unrelated
# questions, whose nearest clinic-category chunk sat at 0.53+ ("write me a
# python script" @ 0.532, "what is the capital of France?" @ 0.605).
GUEST_CLINIC_FACT_CATEGORIES = {'clinic_policy', 'ai_assistant', 'platform'}
GUEST_CLINIC_FACT_THRESHOLD = 0.45


def _guest_threshold(chunk: dict) -> float:
    """Relevance floor for one chunk on the guest path - looser for FAQs the
    model is not allowed to answer from its own knowledge (see above)."""
    metadata = chunk.get('metadata') or {}
    if metadata.get('category') in GUEST_CLINIC_FACT_CATEGORIES:
        return GUEST_CLINIC_FACT_THRESHOLD
    return GUEST_RELEVANCE_THRESHOLD


def retrieve_chunks(question: str, role: str, customer_id: str = None, top_k: int = 5, pet_id: str = None) -> list:
    """
    Retrieve the top_k most relevant chunks for a question, filtered by scope.

    Args:
        question: the user's natural-language question
        role: 'guest' | 'pet_owner' | one of STAFF_ROLES
        customer_id: required when role == 'pet_owner', ignored otherwise
        top_k: number of chunks to return
        pet_id: if given, restrict results to just this pet (used when the
                question was resolved to an exact pet via structured_query.
                resolve_pet_id - prevents common-name ambiguity like multiple
                pets named "Max" polluting the top-k results)

    Returns:
        list[dict]: chunks with content, source_type, source_id, metadata, distance
    """
    query_embedding = embed_text(question)
    embedding_literal = '[' + ','.join(str(x) for x in query_embedding) + ']'

    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            if role in STAFF_ROLES:
                if role == 'receptionist':
                    # Receptionist is fully blocked from disease cases and lab
                    # reports in the regular app (roleCheck.js's vetOrAdmin),
                    # and medical records are hidden from their nav (App.jsx
                    # requiredRoles) - mirror that here rather than handing
                    # over clinical detail through the AI assistant instead.
                    # Vaccinations stay in scope - front-desk staff routinely
                    # field "when's their next shot due" questions.
                    if pet_id:
                        cur.execute("""
                            SELECT chunk_id, source_type, source_id, content, metadata,
                                   embedding <=> %s::vector AS distance
                            FROM rag_chunks
                            WHERE pet_id = %s
                              AND source_type NOT IN ('disease_case', 'lab_report', 'medical_record')
                            ORDER BY distance ASC
                            LIMIT %s
                        """, (embedding_literal, pet_id, top_k))
                    else:
                        cur.execute("""
                            SELECT chunk_id, source_type, source_id, content, metadata,
                                   embedding <=> %s::vector AS distance
                            FROM rag_chunks
                            WHERE source_type NOT IN ('disease_case', 'lab_report', 'medical_record')
                            ORDER BY distance ASC
                            LIMIT %s
                        """, (embedding_literal, top_k))
                elif pet_id:
                    cur.execute("""
                        SELECT chunk_id, source_type, source_id, content, metadata,
                               embedding <=> %s::vector AS distance
                        FROM rag_chunks
                        WHERE pet_id = %s
                        ORDER BY distance ASC
                        LIMIT %s
                    """, (embedding_literal, pet_id, top_k))
                else:
                    # Staff (admin/vet): clinic-wide access (private + public chunks)
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
                if pet_id:
                    cur.execute("""
                        SELECT chunk_id, source_type, source_id, content, metadata,
                               embedding <=> %s::vector AS distance
                        FROM rag_chunks
                        WHERE pet_id = %s AND customer_id = %s
                        ORDER BY distance ASC
                        LIMIT %s
                    """, (embedding_literal, pet_id, customer_id, top_k))
                else:
                    # Owner asking a broad question not tied to one named pet
                    # (e.g. "what health issues do my pets have?"). A plain
                    # top-k-by-distance query lets one pet's chunks crowd out
                    # another's whenever they happen to score higher on pure
                    # embedding similarity - an owner with 2+ pets could ask
                    # about "my pets" and only ever see one of them. Instead,
                    # rank per pet (and per public/FAQ content) separately so
                    # every pet gets a fair shot at appearing, then take the
                    # closest matches overall across those fairly-sampled sets.
                    cur.execute("""
                        WITH ranked AS (
                            SELECT chunk_id, source_type, source_id, content, metadata,
                                   embedding <=> %s::vector AS distance,
                                   ROW_NUMBER() OVER (
                                       PARTITION BY COALESCE(pet_id, 'PUBLIC')
                                       ORDER BY embedding <=> %s::vector ASC
                                   ) AS rn
                            FROM rag_chunks
                            WHERE customer_id = %s
                               OR (pet_id IS NULL AND customer_id IS NULL AND source_type != 'staff_faq')
                        )
                        SELECT chunk_id, source_type, source_id, content, metadata, distance
                        FROM ranked
                        WHERE rn <= 3
                        ORDER BY distance ASC
                        LIMIT %s
                    """, (embedding_literal, embedding_literal, customer_id, max(top_k, 10)))

            else:
                # Guest: public content only (e.g. FAQs, general care
                # instructions) - explicitly excludes staff_faq (internal/
                # operational FAQs like "how do I register a new customer")
                # even though those chunks also have pet_id/customer_id NULL.
                cur.execute("""
                    SELECT chunk_id, source_type, source_id, content, metadata,
                           embedding <=> %s::vector AS distance
                    FROM rag_chunks
                    WHERE pet_id IS NULL AND customer_id IS NULL
                      AND source_type != 'staff_faq'
                    ORDER BY distance ASC
                    LIMIT %s
                """, (embedding_literal, top_k))

            columns = [desc[0] for desc in cur.description]
            rows = [dict(zip(columns, r)) for r in cur.fetchall()]

            if role not in STAFF_ROLES and role != 'pet_owner':
                rows = [r for r in rows if r['distance'] <= _guest_threshold(r)]

            return rows
    finally:
        conn.close()