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

# Matches: "how many doctors", "how many admins are there", "how many receptionists"
COUNT_STAFF_BY_ROLE = re.compile(
    r'how many (admins?|receptionists?|doctors?|vets?|veterinarians?)\b',
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

# Matches: "list medical records for pet Max", "show me the history of pet Fido"
LIST_RECORDS_BY_PET = re.compile(
    r'\b(?:list|show|get|find)\b.*\b(?:medical\s+records?|history)\b.*\b(?:for|of)\s+pet\b',
    re.IGNORECASE
)


# Matches: "list all medical records for customer John Doe", "show history for pets of Jane Doe"
LIST_RECORDS_BY_CUSTOMER = re.compile(
    r'\b(?:list|show|get|find)\b.*\b(?:medical\s+records?|history)\b.*\b(?:for|of|owned\s+by)\b\s+(?:customer\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)',
    re.IGNORECASE
)


# Matches "pet Max" or "of Max" or "for Max" - a standalone name following a preposition.
# This is less strict and helps resolve pet names even if the word "pet" isn't used.
PET_MENTION = re.compile(r'\b(?:pet|of|for|about)\s+([A-Za-z]+)\b', re.IGNORECASE)


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

    # New check for counting veterinarians
    match = COUNT_STAFF_BY_ROLE.search(question)
    if match and role in STAFF_ROLES:
        role_group = match.group(1).lower()
        if role_group.startswith('admin'):
            return _count_staff_by_role('admin')
        elif role_group.startswith('receptionist'):
            return _count_staff_by_role('receptionist')
        else: # vets, doctors, veterinarians
            return _count_staff_by_role('veterinarian')

    # For any query that might be about a specific pet (records, vaccinations, etc.),
    # try to resolve the pet_id first. This is the most specific action and should
    # be prioritized over broader matches like searching by customer name.
    is_pet_record_query = LIST_RECORDS_BY_PET.search(question)
    is_vaccine_query = _looks_like_vaccine_question(question)

    if is_pet_record_query or is_vaccine_query:
        resolved_pet_id = resolve_pet_id(question, role=role, customer_id=customer_id)
        if resolved_pet_id:
            # Now, check which type of query it was.
            if is_pet_record_query:
                return _list_records_by_pet(resolved_pet_id, role, customer_id)

            if is_vaccine_query:
                if LIST_VACCINATIONS.search(question):
                    return _list_vaccinations_for_pet(resolved_pet_id, role, customer_id)
                if COUNT_VACCINATIONS.search(question):
                    return _count_vaccinations_for_pet(resolved_pet_id, role, customer_id)

    # Check for listing all records for a customer's pets (less specific, so it runs after pet resolution)
    match = LIST_RECORDS_BY_CUSTOMER.search(question)
    if match and role in STAFF_ROLES:
        return _list_records_by_customer(match.group(1))

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


def _count_staff_by_role(role_to_count: str) -> dict:
    """Counts active and inactive users for a given role."""
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT user_id, first_name, last_name, is_active
                FROM users
                WHERE role = %s
                ORDER BY is_active DESC, first_name, last_name
                """,
                (role_to_count,)
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    role_plural = f'{role_to_count}s'

    if not rows:
        answer = f'There are no {role_plural} in the system.'
    else:
        active_staff = [r for r in rows if r[3]]
        inactive_staff = [r for r in rows if not r[3]]

        parts = []
        if active_staff:
            active_count = len(active_staff)
            active_listing = ', '.join(f'{r[1]} {r[2]}' for r in active_staff)
            parts.append(
                f'There {"is" if active_count == 1 else "are"} {active_count} active '
                f'{role_to_count}{"s" if active_count != 1 else ""}: {active_listing}.'
            )
        if inactive_staff:
            inactive_count = len(inactive_staff)
            inactive_listing = ', '.join(f'{r[1]} {r[2]}' for r in inactive_staff)
            parts.append(
                f'There {"is" if inactive_count == 1 else "are"} also {inactive_count} inactive '
                f'{role_to_count}{"s" if inactive_count != 1 else ""} on record: {inactive_listing}.'
            )
        answer = ' '.join(parts)

    return {
        'answer': answer,
        'sources': [{
            'source_type': 'user',
            'source_id': r[0],
            'metadata': {'name': f'{r[1]} {r[2]}'}
        } for r in rows],
        'chunks_used': 0,
        'structured': True
    }


def _list_records_by_customer(customer_name: str) -> dict:
    """Lists all medical records for all pets owned by a given customer."""
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            # Find the customer first
            cur.execute(
                """
                SELECT customer_id, first_name, last_name
                FROM customers
                WHERE (first_name || ' ' || last_name) ILIKE %s
                """,
                (f'%{customer_name}%',)
            )
            customer_rows = cur.fetchall()

            if not customer_rows:
                return {'answer': f'No customer found matching the name "{customer_name}".', 'sources': [], 'chunks_used': 0, 'structured': True}
            if len(customer_rows) > 1:
                return {'answer': f'Found multiple customers matching "{customer_name}". Please be more specific.', 'sources': [], 'chunks_used': 0, 'structured': True}

            customer_id, first_name, last_name = customer_rows[0]
            full_name = f'{first_name} {last_name}'

            # Fetch all medical records for that customer's pets
            cur.execute(
                """
                SELECT mr.record_id, p.pet_name, mr.visit_date, mr.diagnosis
                FROM medical_records mr
                JOIN pets p ON mr.pet_id = p.pet_id
                WHERE p.customer_id = %s
                ORDER BY p.pet_name, mr.visit_date DESC
                """,
                (customer_id,)
            )
            record_rows = cur.fetchall()

    finally:
        conn.close()

    if not record_rows:
        return {
            'answer': f'Customer {full_name} exists, but there are no medical records for any of their pets.',
            'sources': [{'source_type': 'customer', 'source_id': customer_id, 'metadata': {}}],
            'chunks_used': 0,
            'structured': True
        }

    record_count = len(record_rows)
    items = [f'{r[1]} ({r[2]}): {r[3]}' for r in record_rows]
    listing = '\n- '.join(items)

    answer = f'Found {record_count} medical record{"s" if record_count != 1 else ""} for pets of customer {full_name}:\n- {listing}'

    return {
        'answer': answer,
        'sources': [{
            'source_type': 'medical_record',
            'source_id': r[0],
            'metadata': {'pet_name': r[1], 'visit_date': str(r[2])}
        } for r in record_rows],
        'chunks_used': 0,
        'structured': True
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


def _list_records_by_pet(pet_id: str, role: str, customer_id: str = None) -> dict:
    """Lists all medical records for a specific, resolved pet."""
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            # Get pet and owner name for the answer
            cur.execute(
                """
                SELECT p.pet_name, c.first_name, c.last_name
                FROM pets p
                JOIN customers c ON p.customer_id = c.customer_id
                WHERE p.pet_id = %s
                """,
                (pet_id,)
            )
            pet_row = cur.fetchone()
            if not pet_row:
                # This should be rare since resolve_pet_id found it, but handle defensively.
                return {'answer': 'Could not find the specified pet.', 'sources': [], 'chunks_used': 0, 'structured': True}

            pet_name, owner_first, owner_last = pet_row
            owner_name = f'{owner_first} {owner_last}'

            # Fetch all medical records for that pet
            cur.execute(
                """
                SELECT record_id, visit_date, diagnosis, chief_complaint
                FROM medical_records
                WHERE pet_id = %s
                ORDER BY visit_date DESC
                """,
                (pet_id,)
            )
            record_rows = cur.fetchall()

    finally:
        conn.close()

    if not record_rows:
        return {
            'answer': f'Pet {pet_name} (owner: {owner_name}) has no medical records in the system.',
            'sources': [{'source_type': 'pet', 'source_id': pet_id, 'metadata': {}}],
            'chunks_used': 0,
            'structured': True
        }

    record_count = len(record_rows)
    items = [f'{r[1]} - {r[2]} (Complaint: {r[3]})' for r in record_rows]
    listing = '\n- '.join(items)

    answer = f'Found {record_count} medical record{"s" if record_count != 1 else ""} for pet {pet_name} (owner: {owner_name}):\n- {listing}'

    return {
        'answer': answer,
        'sources': [{
            'source_type': 'medical_record',
            'source_id': r[0],
            'metadata': {'pet_name': pet_name, 'visit_date': str(r[1])}
        } for r in record_rows],
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