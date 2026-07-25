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

# Matches: "how many pets are/is there named/called X", "how many pets named X",
# "how many pets whose name is X", "how many pets ... name is X",
# "how many pets have the name X"
COUNT_PETS_BY_NAME = re.compile(
    r'how many pets?\b.*?(?:named|called|(?:name\s+is)|(?:whose\s+name\s+is)|(?:have\s+the\s+name))\s+([a-zA-Z]+)',
    re.IGNORECASE
)

# Matches pet-specific vaccination count questions such as:
# "how many vaccines are taken by pet Max so far"
# "how many vaccinations has pet Max had"
COUNT_VACCINATIONS = re.compile(
    r'how many (?:vaccines?|vaccinations?)\b.*\b(?:given|taken|received|administered|had|got)\b|'
    r'\b(?:vaccines?|vaccinations?)\b.*\b(?:given|taken|received|administered|had|got)\b',
    re.IGNORECASE
)

# Matches vaccine listing questions such as:
# "list down the vaccines taken by Max"
# "what vaccines has pet Max had"
LIST_VACCINATIONS = re.compile(
    r'\b(?:list(?:\s+down)?|show(?:\s+me)?|tell\s+me|what|which|give\s+me)\b.*\b(?:vaccines?|vaccinations?)\b|'
    r'\b(?:vaccines?|vaccinations?)\b.*\b(?:list|show|details|history)\b',
    re.IGNORECASE
)


PET_MENTION = re.compile(r'\bpet\s+([A-Za-z]+)\b', re.IGNORECASE)
PET_BY_MENTION = re.compile(r'\b(?:by|for|of|to)\s+([A-Za-z]+)\b', re.IGNORECASE)
OWNER_MENTION = re.compile(
    r'owner\s+(?:is|named|called)?\s*([A-Za-z]+(?:\s+[A-Za-z]+)?)', re.IGNORECASE
)


def resolve_pet_id(question: str, role: str, customer_id: str = None):
    """
    Try to figure out exactly which pet a question is about, by name (and
    owner name, if mentioned) - e.g. "vaccination details of pet Max whose
    owner is Nishantha Rajapaksa".

    This exists because plain semantic search struggles when multiple pets
    share a common name: the wrong "Max" can outrank the right one in the
    top-k results. Resolving to an exact pet_id via SQL first and then
    scoping retrieval to just that pet fixes that ambiguity.

    Returns:
        str: a single pet_id if exactly one match is found, otherwise None
        (caller should fall back to normal unscoped retrieval).
    """
    pet_match = PET_MENTION.search(question)
    if not pet_match:
        pet_match = PET_BY_MENTION.search(question)
    if not pet_match:
        return None
    pet_name = pet_match.group(1)

    owner_match = OWNER_MENTION.search(question)
    owner_name = owner_match.group(1) if owner_match else None

    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            if role in STAFF_ROLES:
                if owner_name:
                    cur.execute("""
                        SELECT p.pet_id FROM pets p
                        JOIN customers c ON c.customer_id = p.customer_id
                        WHERE p.pet_name ILIKE %s
                          AND (c.first_name || ' ' || c.last_name) ILIKE %s
                    """, (pet_name, f'%{owner_name}%'))
                else:
                    cur.execute("SELECT pet_id FROM pets WHERE pet_name ILIKE %s", (pet_name,))
            elif role == 'pet_owner' and customer_id:
                cur.execute(
                    "SELECT pet_id FROM pets WHERE pet_name ILIKE %s AND customer_id = %s",
                    (pet_name, customer_id)
                )
            else:
                return None

            rows = cur.fetchall()
    finally:
        conn.close()

    # Only resolve if unambiguous - if there are still multiple matches
    # (e.g. two "Max"s with no owner given, or owner name too vague),
    # fall back to normal retrieval rather than guessing which one.
    return rows[0][0] if len(rows) == 1 else None


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

    if OWNER_MENTION.search(question) and _looks_like_vaccine_question(question):
        resolved_pet_id = resolve_pet_id(question, role=role, customer_id=customer_id)
        if resolved_pet_id:
            if LIST_VACCINATIONS.search(question):
                return _list_vaccinations_for_pet(resolved_pet_id, role, customer_id)
            if COUNT_VACCINATIONS.search(question):
                return _count_vaccinations_for_pet(resolved_pet_id, role, customer_id)

    if LIST_VACCINATIONS.search(question):
        resolved_pet_id = resolve_pet_id(question, role=role, customer_id=customer_id)
        if resolved_pet_id:
            return _list_vaccinations_for_pet(resolved_pet_id, role, customer_id)

    if COUNT_VACCINATIONS.search(question):
        resolved_pet_id = resolve_pet_id(question, role=role, customer_id=customer_id)
        if resolved_pet_id:
            return _count_vaccinations_for_pet(resolved_pet_id, role, customer_id)

    return None


def _looks_like_vaccine_question(question: str) -> bool:
    return bool(re.search(r'\b(?:vaccines?|vaccinations?)\b|\bvaccine\b', question, re.IGNORECASE))


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


def _count_vaccinations_for_pet(pet_id: str, role: str, customer_id: str = None) -> dict:
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            if role in STAFF_ROLES:
                cur.execute(
                    """
                    SELECT p.pet_name, c.first_name, c.last_name
                    FROM pets p
                    JOIN customers c ON c.customer_id = p.customer_id
                    WHERE p.pet_id = %s
                    """,
                    (pet_id,)
                )
            elif role == 'pet_owner' and customer_id:
                cur.execute(
                    """
                    SELECT p.pet_name, c.first_name, c.last_name
                    FROM pets p
                    JOIN customers c ON c.customer_id = p.customer_id
                    WHERE p.pet_id = %s AND p.customer_id = %s
                    """,
                    (pet_id, customer_id)
                )
            else:
                return None

            pet_row = cur.fetchone()
            if not pet_row:
                return {
                    'answer': 'I could not find vaccination records for that pet.',
                    'sources': [],
                    'chunks_used': 0,
                    'structured': True
                }

            pet_name = pet_row[0]
            owner_name = f'{pet_row[1]} {pet_row[2]}'

            if role in STAFF_ROLES:
                cur.execute(
                    """
                    SELECT v.vaccination_id, v.vaccine_name, v.vaccination_date
                    FROM vaccinations v
                    WHERE v.pet_id = %s
                    ORDER BY v.vaccination_date ASC, v.vaccination_id ASC
                    """,
                    (pet_id,)
                )
            elif role == 'pet_owner' and customer_id:
                cur.execute(
                    """
                    SELECT v.vaccination_id, v.vaccine_name, v.vaccination_date
                    FROM vaccinations v
                    WHERE v.pet_id = %s
                    ORDER BY v.vaccination_date ASC, v.vaccination_id ASC
                    """,
                    (pet_id,)
                )
            else:
                return None

            rows = cur.fetchall()
    finally:
        conn.close()

    count = len(rows)
    answer = f'{pet_name} (owner: {owner_name}) has had {count} vaccination record{"s" if count != 1 else ""} so far.'

    return {
        'answer': answer,
        'sources': [
            {
                'source_type': 'vaccination',
                'source_id': r[0],
                'metadata': {
                    'vaccine_name': r[1],
                    'vaccination_date': str(r[2]) if r[2] else None,
                }
            }
            for r in rows
        ],
        'chunks_used': 0,
        'structured': True
    }


def _list_vaccinations_for_pet(pet_id: str, role: str, customer_id: str = None) -> dict:
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            if role in STAFF_ROLES:
                cur.execute(
                    """
                    SELECT p.pet_name, c.first_name, c.last_name
                    FROM pets p
                    JOIN customers c ON c.customer_id = p.customer_id
                    WHERE p.pet_id = %s
                    """,
                    (pet_id,)
                )
            elif role == 'pet_owner' and customer_id:
                cur.execute(
                    """
                    SELECT p.pet_name, c.first_name, c.last_name
                    FROM pets p
                    JOIN customers c ON c.customer_id = p.customer_id
                    WHERE p.pet_id = %s AND p.customer_id = %s
                    """,
                    (pet_id, customer_id)
                )
            else:
                return None

            pet_row = cur.fetchone()
            if not pet_row:
                return {
                    'answer': 'I could not find vaccination records for that pet.',
                    'sources': [],
                    'chunks_used': 0,
                    'structured': True
                }

            pet_name = pet_row[0]
            owner_name = f'{pet_row[1]} {pet_row[2]}'

            cur.execute(
                """
                SELECT vaccine_name, vaccine_type, MIN(vaccination_date) AS first_date, COUNT(*) AS dose_count
                FROM vaccinations
                WHERE pet_id = %s
                GROUP BY vaccine_name, vaccine_type
                ORDER BY first_date ASC, vaccine_name ASC
                """,
                (pet_id,)
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    if not rows:
        return {
            'answer': f'{pet_name} (owner: {owner_name}) has no vaccination records yet.',
            'sources': [],
            'chunks_used': 0,
            'structured': True
        }

    items = []
    for vaccine_name, vaccine_type, first_date, dose_count in rows:
        type_text = f' ({vaccine_type})' if vaccine_type else ''
        if dose_count > 1:
            items.append(f'{vaccine_name}{type_text} ({dose_count} records)')
        else:
            items.append(f'{vaccine_name}{type_text}')

    answer = f'{pet_name} (owner: {owner_name}) has received: ' + '; '.join(items) + '.'

    return {
        'answer': answer,
        'sources': [
            {
                'source_type': 'vaccination',
                'source_id': f'{vaccine_name}|{vaccine_type or ""}',
                'metadata': {
                    'vaccine_name': vaccine_name,
                    'vaccine_type': vaccine_type,
                    'first_date': str(first_date) if first_date else None,
                    'dose_count': dose_count,
                }
            }
            for vaccine_name, vaccine_type, first_date, dose_count in rows
        ],
        'chunks_used': 0,
        'structured': True
    }