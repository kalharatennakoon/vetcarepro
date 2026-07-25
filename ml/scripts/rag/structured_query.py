"""
Structured Query Fallback
RAG (semantic retrieval + generation) is a poor fit for counting/aggregate
questions - it only ever sees a small sample of chunks (top_k), so asking
"how many pets are named X" gets answered from a handful of unrelated text
snippets, which the LLM then has to guess a number from. That produces
exactly the kind of confidently-wrong answer this module exists to prevent.

This module detects a small set of common count/list question patterns and
answers them with an exact SQL query instead, bypassing embeddings/retrieval
entirely. Add more patterns here as you notice more RAG "hallucinated count"
failures in testing.
"""

import re
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from config.db_connection import get_raw_db_connection

STAFF_ROLES = {'admin', 'veterinarian', 'receptionist'}

# "how many pets are/is there named/called Max" / "how many pets named Max are there"
COUNT_PETS_BY_NAME = re.compile(
    r'how many pets?.*(?:named|called)\s+([a-zA-Z]+)', re.IGNORECASE
)


def try_structured_answer(question: str, role: str, customer_id: str = None) -> dict:
    """
    Check if `question` matches a known structured-query pattern. If so,
    run an exact SQL query and return a grounded answer immediately.

    Returns:
        dict (same shape as rag_service.answer_question's return) if matched,
        otherwise None (caller should fall back to normal RAG retrieval).
    """
    match = COUNT_PETS_BY_NAME.search(question)
    if match:
        return _count_pets_by_name(match.group(1), role, customer_id)

    return None


def _count_pets_by_name(name: str, role: str, customer_id: str = None) -> dict:
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            if role in STAFF_ROLES:
                cur.execute(
                    "SELECT pet_id, pet_name, species, breed FROM pets WHERE pet_name ILIKE %s",
                    (name,)
                )
            elif role == 'pet_owner' and customer_id:
                cur.execute(
                    "SELECT pet_id, pet_name, species, breed FROM pets WHERE pet_name ILIKE %s AND customer_id = %s",
                    (name, customer_id)
                )
            else:
                # Guests don't get access to the pet directory - fall back to RAG,
                # which will correctly find nothing and say so.
                return None

            rows = cur.fetchall()
    finally:
        conn.close()

    count = len(rows)
    if count == 0:
        answer = f'There are no pets named "{name}" in the system.'
    elif count == 1:
        pet_id, pet_name, species, breed = rows[0]
        answer = f'There is 1 pet named "{name}": {pet_name} ({species}{", " + breed if breed else ""}).'
    else:
        listing = ', '.join(
            f"{r[1]} ({r[2]}{', ' + r[3] if r[3] else ''})" for r in rows
        )
        answer = f'There are {count} pets named "{name}": {listing}.'

    return {
        'answer': answer,
        'sources': [{'source_type': 'pets', 'source_id': r[0], 'metadata': {}} for r in rows],
        'chunks_used': 0,
        'structured': True  # flag so the frontend/caller knows this bypassed RAG
    }