"""
Action Intent
Detects staff requests to perform a write action - book/reschedule/cancel an
appointment, send an appointment reminder, register a new customer, add a
pet, or (admin only) register a new staff member - and resolves the details
to real database IDs. This module never writes anything itself: it only ever
proposes an `action` (executed by Node, see
server/src/controllers/aiController.js's confirmAction) after the staff
member explicitly confirms it, or asks a follow-up question when a detail is
still missing.

Same "LLM only parses, never decides" discipline as structured_query.py's
_extract_date_via_llm: one LLM call per turn turns free text into a small
JSON slot object; every ID resolution (pet, customer, veterinarian,
appointment, date) is a real SQL lookup or deterministic date arithmetic. If
a slot is ambiguous or missing, we ask rather than guess.

There is no server-side conversation session. Multi-turn slot-filling works
by round-tripping state through the client: when a slot is still missing,
the response includes `pending_intent` (the intent type + slots collected so
far), which the frontend echoes back on the next turn's request body.
"""

import re
import json
from datetime import date

from config.db_connection import get_raw_db_connection
from scripts.rag.ollama_client import generate_answer, OllamaError
from scripts.rag.structured_query import (
    STAFF_ROLES,
    APPT_TYPE_WORDS,
    _WEEKDAY_NAMES,
    _resolve_relative_weekday,
    _resolve_specific_day,
    _extract_date_via_llm,
    _normalize_appointment_type,
    _find_customer_by_name,
)
from scripts.rag.chart_intent import CHART_TRIGGER

# ============================================================
# Intent detection - checked most-specific-first so e.g. "reschedule" isn't
# swallowed by the more general "book" pattern.
# ============================================================

# Staff rarely say the literal word "appointment" - they say "a checkup",
# "her vaccination", "his surgery" - so the trigger noun has to cover the
# same appointment_type vocabulary structured_query.py's billing handlers
# already use, plus "visit", not just "appointment" itself.
_APPT_NOUN = r'(?:appointments?|visits?|' + APPT_TYPE_WORDS + r')'

# Bounds the verb-to-noun gap to inside the same clause. An unbounded `.*`
# let the verb and noun pair across unrelated clauses - "make [a chart of]
# appointments" or "why did the owner cancel [the checkup]" matched a write
# intent purely because both words appeared anywhere in the sentence, in
# order, regardless of what came between them.
_GAP = r'.{0,40}?'

RESCHEDULE_APPOINTMENT = re.compile(
    r'\breschedule\b' + _GAP + _APPT_NOUN + r'|\bmove\b' + _GAP + _APPT_NOUN + _GAP + r'\bto\b',
    re.IGNORECASE
)
CANCEL_APPOINTMENT = re.compile(r'\bcancel\b' + _GAP + _APPT_NOUN, re.IGNORECASE)
# "make" is deliberately left out of the general verb list - "make a chart
# of appointments"/"make a report on X" are far more common in practice than
# "make an appointment", and an unbounded match on "make" swallowed both.
# "make an appointment" is still covered, just via its own pattern below
# that requires the noun to sit immediately after "make".
BOOK_APPOINTMENT = re.compile(
    r'\b(?:book|schedule|set\s+up)\b' + _GAP + _APPT_NOUN, re.IGNORECASE
)
_MAKE_APPOINTMENT = re.compile(r'\bmake\b\s+(?:an?\s+)?' + _APPT_NOUN, re.IGNORECASE)
SEND_REMINDER = re.compile(
    r'\b(?:send|give)\b' + _GAP + r'\breminder\b|\bremind\b' + _GAP + r'\b(?:about|of)\b' + _GAP + _APPT_NOUN,
    re.IGNORECASE
)
REGISTER_CUSTOMER = re.compile(
    r'\b(?:register|add|create)\b' + _GAP + r'\b(?:new\s+)?(?:customer|client)\b', re.IGNORECASE
)
ADD_PET = re.compile(r'\b(?:register|add|create)\b' + _GAP + r'\bpet\b', re.IGNORECASE)

# A hedged/speculative framing ("should we schedule...", "do we need to
# book...", "is it worth rescheduling...") is asking for a judgment call,
# not issuing a command - e.g. "why is Max's disease-recurrence risk
# elevated, and should we schedule a follow-up?" is a pet-health question
# with a rhetorical aside, not a booking request. The four write-intent
# triggers above can't tell a bare "schedule...follow-up" apart from that on
# their own, so try_action_intent checks this first and suppresses ALL of
# them when it matches - without it, action_intent.py claimed the entire
# question ahead of pet_health_intent.py/clinical_tools.py (it's checked
# first in the pipeline) and asked "which pet is this appointment for?"
# instead of ever getting to the disease-recurrence-risk question at all.
_HEDGED_SUGGESTION = re.compile(
    r'\bshould\s+(?:we|i|they)\b|\bdo(?:es)?\s+(?:we|i|they)\s+need\s+to\b|'
    r'\bmight\s+(?:we|i|they)?\s*need\s+to\b|\bis\s+it\s+worth\b|'
    r'\bwould\s+it\s+help\s+to\b',
    re.IGNORECASE
)

# A chart/graph/report request is never a write command, even though it
# often shares nouns with the write-intent patterns above ("make A GRAPH OF
# appointments" contains both "make" and "appointments"). Checked before any
# write-intent pattern, same suppression role as _HEDGED_SUGGESTION - without
# it, chart_intent.py (which owns these questions, see rag_service.py's
# _route_to_generation ordering) never got a chance to run, because
# try_action_intent is tried first in that same ordering and claimed the
# whole question on the verb/noun pair alone.
_CHART_OR_REPORT_REQUEST = CHART_TRIGGER

# A read/analysis framing - "what's the schedule for X", "why did Y happen",
# "how many/which/what... appointments" - names the same nouns a booking
# request does but is asking a question, not issuing a command. Distinct
# from _HEDGED_SUGGESTION above (that catches a suggestion embedded in a
# clinical question; this catches a plain informational question that
# happens to contain a write-intent verb elsewhere in the sentence, e.g.
# "why did the owner CANCEL the checkup?" or "can you set up A REPORT on
# emergency visits?").
_REPORT_OR_QUESTION_FRAMING = re.compile(
    r'\b(?:report|summary|breakdown|how\s+many|which|why|'
    r"what(?:'s|\s+is)\s+the)\b",
    re.IGNORECASE
)

# Admin-only - a distinct trigger vocabulary (staff/team member/employee, or
# an explicit role name) so it never overlaps with REGISTER_CUSTOMER/ADD_PET
# above. Matched for any staff role (so a receptionist/vet asking still gets
# a clear "admin only" answer instead of silently falling through to RAG),
# but only ever resolved for role == 'admin' - see try_action_intent. The verb
# must sit immediately before an optional article/"new" and the role noun -
# "add THE vet's performance numbers" or "add a column for THE doctor's name"
# don't fit that shape (an unbounded gap previously let both match).
REGISTER_STAFF = re.compile(
    r'\b(?:register|add|create|hire|onboard)\b\s+(?:an?\s+)?(?:new\s+)?'
    r'(?:staff\s+member|team\s+member|employee|veterinarian|vet|receptionist|administrator|doctor)\b',
    re.IGNORECASE
)

# Lets a staff member back out of an in-progress multi-turn action instead of
# being stuck answering slot questions forever.
_BREAK_OUT = re.compile(
    r'\b(?:never\s?mind|forget it|cancel that|scratch that)\b', re.IGNORECASE
)

_TIME_RE = re.compile(r'^([01]\d|2[0-3]):[0-5]\d$')
_RELATIVE_WEEKDAY_IN_PHRASE = re.compile(
    r'\b(this|next|last)\s+(' + '|'.join(_WEEKDAY_NAMES) + r')\b', re.IGNORECASE
)
_DAY_OF_MONTH_IN_PHRASE = re.compile(
    r'\b(\d{1,2})(?:st|nd|rd|th)?\b(?:\s+of\s+(this|next|last)\s+month|\s+(this|next|last)\s+month)?',
    re.IGNORECASE
)
# Guards the day-of-month branch above: that regex greedily matches ANY bare
# number, so on a phrase like "August 4, 2026" it would grab the "4" and
# resolve it against the CURRENT month, silently discarding the "August" that
# was already stated. Once a month name is present the phrase is a full
# absolute date, not a bare "the 5th"/"the 31st of next month" shorthand - so
# it belongs to _extract_date_via_llm instead.
_MONTH_NAME_IN_PHRASE = re.compile(
    r'\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|'
    r'aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b',
    re.IGNORECASE
)

VALID_APPOINTMENT_TYPES = {
    'checkup', 'vaccination', 'surgery', 'emergency', 'follow_up', 'consultation'
}

# Matches the same +94XXXXXXXXX shape server/src/middleware/validation.js
# enforces for staff phone numbers - the AI action path writes to the users
# table directly (via createUser), bypassing that express-validator chain,
# so it's re-checked here rather than trusting whatever the LLM extracted.
_STAFF_PHONE_RE = re.compile(r'^\+94\d{9}$')
_EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')

_STAFF_ROLE_NORMALIZE = {
    'admin': 'admin', 'administrator': 'admin',
    'veterinarian': 'veterinarian', 'vet': 'veterinarian', 'doctor': 'veterinarian', 'dr': 'veterinarian',
    'receptionist': 'receptionist', 'front desk': 'receptionist', 'front-desk': 'receptionist',
}


def _normalize_staff_role(raw: str):
    return _STAFF_ROLE_NORMALIZE.get((raw or '').strip().lower())


# ============================================================
# Slot extraction (one LLM call per turn, per intent type)
# ============================================================

SLOT_SCHEMAS = {
    'book_appointment': {
        'fields': ['pet_name', 'owner_name', 'date_phrase', 'time', 'appointment_type', 'vet_name', 'reason'],
        'instructions': (
            'Extract appointment-booking details. pet_name: the pet\'s name. owner_name: the '
            'pet owner\'s name, if mentioned. date_phrase: the date exactly as phrased (e.g. '
            '"next Tuesday", "the 31st", "July 31st") - do not compute an actual date yourself. '
            'time: convert to 24-hour "HH:MM" format (e.g. "2pm" -> "14:00"), or null if not '
            'stated. appointment_type: one of checkup, vaccination, surgery, emergency, '
            'follow_up, consultation - pick the closest match, or null if not stated. vet_name: '
            'veterinarian\'s name, if mentioned. reason: a short reason for the visit, if mentioned.'
        ),
    },
    'reschedule_appointment': {
        'fields': ['pet_name', 'owner_name', 'old_date_phrase', 'new_date_phrase', 'new_time'],
        'instructions': (
            'Extract appointment-rescheduling details. pet_name: the pet\'s name. owner_name: '
            'the owner\'s name, if mentioned. old_date_phrase: the CURRENT appointment date, '
            'exactly as phrased, if mentioned (helps find which appointment). new_date_phrase: '
            'the NEW date being requested, exactly as phrased. new_time: the new time in '
            '24-hour "HH:MM" format, if a new time was requested, else null.'
        ),
    },
    'cancel_appointment': {
        'fields': ['pet_name', 'owner_name', 'date_phrase', 'reason'],
        'instructions': (
            'Extract appointment-cancellation details. pet_name: the pet\'s name. owner_name: '
            'the owner\'s name, if mentioned. date_phrase: the appointment date, exactly as '
            'phrased, if mentioned (helps find which appointment if there is more than one). '
            'reason: the reason for cancelling, if mentioned.'
        ),
    },
    'send_reminder': {
        'fields': ['pet_name', 'owner_name'],
        'instructions': (
            'Extract who to send an appointment reminder about. pet_name: the pet\'s name. '
            'owner_name: the owner\'s name, if mentioned.'
        ),
    },
    'register_customer': {
        'fields': ['first_name', 'last_name', 'phone', 'email', 'address', 'city'],
        'instructions': (
            'Extract new-customer registration details: first_name, last_name, phone, email '
            '(optional), address (optional), city (optional). If a full name is given as one '
            'phrase, split it into first_name/last_name as best you can.'
        ),
    },
    'add_pet': {
        'fields': ['customer_name', 'pet_name', 'species', 'breed', 'gender', 'date_of_birth'],
        'instructions': (
            'Extract new-pet registration details. customer_name: the owner this pet belongs '
            'to. pet_name: the pet\'s name. species: e.g. dog, cat, bird. breed: optional. '
            'gender: "male" or "female" if stated, else null. date_of_birth: an ISO date '
            '(YYYY-MM-DD) only if an exact date is given, else null - do not guess an age into a date.'
        ),
    },
    'register_staff': {
        'fields': ['first_name', 'last_name', 'email', 'phone', 'role', 'specialization', 'license_number'],
        'instructions': (
            'Extract new-staff-member registration details: first_name, last_name, email, phone '
            '(optional). role: the job role as the person actually said it (e.g. "vet", "doctor", '
            '"receptionist", "admin") - do NOT normalize or guess a role that was not stated. '
            'specialization: optional, a veterinarian\'s area of specialty. license_number: '
            'optional, a veterinarian\'s professional license number. If a full name is given as '
            'one phrase, split it into first_name/last_name as best you can.'
        ),
    },
}


def _conversation_text(history, question: str) -> str:
    """Builds a short plain-text transcript for the slot-extraction prompt.
    Only the last few turns matter - slot-filling conversations are short."""
    lines = []
    for turn in (history or [])[-8:]:
        content = (turn.get('content') or '').strip() if isinstance(turn, dict) else ''
        if not content:
            continue
        speaker = 'Assistant' if turn.get('role') == 'assistant' else 'Staff'
        lines.append(f'{speaker}: {content}')
    lines.append(f'Staff: {question}')
    return '\n'.join(lines)


def _extract_slots_via_llm(intent_type: str, prior_slots: dict, conversation_text: str) -> dict:
    schema = SLOT_SCHEMAS[intent_type]
    fallback = {f: (prior_slots or {}).get(f) for f in schema['fields']}

    system_prompt = f"""You extract structured details from a conversation between clinic front-desk \
staff and an assistant. {schema['instructions']}

Previously known values from earlier in this conversation: {json.dumps(fallback)}

Respond with ONLY a JSON object with exactly these keys: {json.dumps(schema['fields'])}.
Use null for anything not mentioned anywhere in the conversation. Carry forward previously known \
values unless the latest message changes them. No markdown, no extra commentary - JSON only."""

    try:
        raw, _ = generate_answer(system_prompt, conversation_text)
    except OllamaError:
        return fallback

    match = re.search(r'\{.*\}', raw, re.DOTALL)
    if not match:
        return fallback

    try:
        parsed = json.loads(match.group(0))
    except (json.JSONDecodeError, TypeError):
        return fallback

    if not isinstance(parsed, dict):
        return fallback

    return {f: parsed.get(f, fallback.get(f)) for f in schema['fields']}


def _resolve_date_phrase(phrase):
    """Resolves a short date phrase into a concrete date. Relative-weekday
    and day-of-month arithmetic stay deterministic Python (same reasoning as
    _resolve_relative_weekday: small models get calendar math wrong); a
    genuinely absolute phrase ("July 31st, 2026") falls back to the existing
    LLM date-normalizer. Returns None if nothing could be resolved."""
    if not phrase or not str(phrase).strip():
        return None
    phrase = str(phrase)

    weekday_match = _RELATIVE_WEEKDAY_IN_PHRASE.search(phrase)
    if weekday_match:
        return _resolve_relative_weekday(weekday_match.group(1), weekday_match.group(2))

    if not _MONTH_NAME_IN_PHRASE.search(phrase):
        day_match = _DAY_OF_MONTH_IN_PHRASE.search(phrase)
        if day_match:
            resolved = _resolve_specific_day(int(day_match.group(1)), day_match.group(2) or day_match.group(3))
            if resolved:
                return resolved

    return _extract_date_via_llm(phrase)


def _escape_like(value: str) -> str:
    """Pre-escapes LIKE/ILIKE wildcard characters in user-typed text before
    it's wrapped in %...% or used as-is in a pattern - without this, a pet
    name (or a slot-filling reply) containing "%" or "_" silently acted as a
    wildcard instead of a literal character. Paired with ESCAPE '\\' on every
    query below."""
    return value.replace('\\', '\\\\').replace('%', r'\%').replace('_', r'\_')


def _find_pet_by_name(cur, pet_name: str, owner_name: str = None):
    escaped_pet_name = _escape_like(pet_name)
    if owner_name:
        cur.execute(
            """
            SELECT p.pet_id, p.pet_name, p.customer_id, c.first_name, c.last_name
            FROM pets p JOIN customers c ON c.customer_id = p.customer_id
            WHERE p.pet_name ILIKE %s ESCAPE '\\'
              AND (c.first_name || ' ' || c.last_name) ILIKE %s ESCAPE '\\'
              AND p.is_active = true
            """,
            (escaped_pet_name, f'%{_escape_like(owner_name)}%')
        )
    else:
        cur.execute(
            """
            SELECT p.pet_id, p.pet_name, p.customer_id, c.first_name, c.last_name
            FROM pets p JOIN customers c ON c.customer_id = p.customer_id
            WHERE p.pet_name ILIKE %s ESCAPE '\\' AND p.is_active = true
            """,
            (escaped_pet_name,)
        )
    return cur.fetchall()


def _find_veterinarian_by_name(cur, vet_name: str):
    cur.execute(
        """
        SELECT user_id, first_name, last_name FROM users
        WHERE role = 'veterinarian' AND (first_name || ' ' || last_name) ILIKE %s ESCAPE '\\'
        """,
        (f'%{_escape_like(vet_name)}%',)
    )
    return cur.fetchall()


def _ask(intent_type: str, slots: dict, question_text: str, field: str, options: list = None) -> dict:
    """`field` names exactly which SLOT_SCHEMAS key this question is trying
    to fill (or the pseudo-field 'full_name', split into first_name/last_name
    - see try_action_intent). On the next turn, the reply is injected
    directly into that field and the resolver re-run immediately, rather
    than routed through the general LLM slot-merge - that step isn't
    reliable at attributing a short/bare reply to the right field (observed
    looping forever instead of ever updating it, especially when the reply
    overlaps with an already-set field, e.g. "vaccination" as both
    appointment_type and reason)."""
    result = {
        'answer': question_text,
        'pending_intent': {'type': intent_type, 'slots': slots, 'field': field},
        'structured': True
    }
    if options:
        result['options'] = options
    return result


def _owner_options(pet_rows) -> list:
    """Builds clickable disambiguation options from _find_pet_by_name's rows
    - clicking one just re-submits the owner's name as the next message,
    same as if the vet/receptionist had typed it themselves."""
    return [
        {'label': f'{r[1]} ({r[3]} {r[4]})', 'value': f'{r[3]} {r[4]}'}
        for r in pet_rows
    ]


def _done(answer_text: str) -> dict:
    return {'answer': answer_text, 'structured': True}


# ============================================================
# Per-intent resolution
# ============================================================

def _resolve_book_appointment(slots: dict) -> dict:
    pet_name = (slots.get('pet_name') or '').strip()
    owner_name = (slots.get('owner_name') or '').strip() or None
    time_raw = (slots.get('time') or '').strip()
    appt_type_raw = (slots.get('appointment_type') or '').strip()
    vet_name = (slots.get('vet_name') or '').strip() or None
    reason = (slots.get('reason') or '').strip() or None

    if not pet_name:
        return _ask('book_appointment', slots, 'Which pet is this appointment for?', field='pet_name')

    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            pet_rows = _find_pet_by_name(cur, pet_name, owner_name)
    finally:
        conn.close()

    if not pet_rows:
        return _done(f'I couldn\'t find an active pet named "{pet_name}". Could you double-check the name?')
    if len(pet_rows) > 1:
        return _ask(
            'book_appointment', slots, f'I found multiple pets named "{pet_name}" - which one did you mean?',
            field='owner_name', options=_owner_options(pet_rows)
        )

    pet_id, resolved_pet_name, customer_id, owner_first, owner_last = pet_rows[0]

    resolved_date = _resolve_date_phrase(slots.get('date_phrase'))
    if not resolved_date:
        return _ask('book_appointment', slots, f'What date would you like to book {resolved_pet_name} in for?', field='date_phrase')

    if not _TIME_RE.match(time_raw):
        return _ask('book_appointment', slots, f'What time on {resolved_date.strftime("%B %d, %Y")} works?', field='time')

    appointment_type = _normalize_appointment_type(appt_type_raw) if appt_type_raw else None
    if appointment_type not in VALID_APPOINTMENT_TYPES:
        return _ask(
            'book_appointment', slots,
            'What type of appointment is this - checkup, vaccination, surgery, emergency, follow-up, or consultation?',
            field='appointment_type'
        )

    # appointments.reason is NOT NULL in the schema (same as the manual "New
    # Appointment" form) - unlike vet_name below, this can't be left blank.
    if not reason:
        return _ask('book_appointment', slots, f"What's the reason for {resolved_pet_name}'s visit?", field='reason')

    veterinarian_id = None
    vet_display = ''
    if vet_name:
        conn = get_raw_db_connection()
        try:
            with conn.cursor() as cur:
                vet_rows = _find_veterinarian_by_name(cur, vet_name)
        finally:
            conn.close()
        if not vet_rows:
            return _ask('book_appointment', slots, f'I couldn\'t find a veterinarian named "{vet_name}" - could you confirm the name, or should I leave it unassigned?', field='vet_name')
        if len(vet_rows) > 1:
            return _ask('book_appointment', slots, f'There are multiple veterinarians matching "{vet_name}" - could you be more specific?', field='vet_name')
        veterinarian_id, vet_first, vet_last = vet_rows[0]
        vet_display = f' with Dr. {vet_first} {vet_last}'

    action = {
        'type': 'book_appointment',
        'slots': {
            'customer_id': customer_id,
            'pet_id': pet_id,
            'veterinarian_id': veterinarian_id,
            'appointment_date': resolved_date.isoformat(),
            'appointment_time': time_raw,
            'appointment_type': appointment_type,
            'reason': reason,
        }
    }
    confirmation = (
        f'Book {resolved_pet_name} ({owner_first} {owner_last}) for a {appointment_type.replace("_", " ")} '
        f'appointment on {resolved_date.strftime("%B %d, %Y")} at {time_raw}{vet_display}'
        f'{", reason: " + reason if reason else ""} - shall I confirm this?'
    )
    return {'answer': confirmation, 'action': action, 'requires_confirmation': True, 'structured': True}


def _find_upcoming_appointments(cur, pet_id: str, statuses):
    cur.execute(
        """
        SELECT appointment_id, appointment_date, appointment_time, veterinarian_id
        FROM appointments
        WHERE pet_id = %s AND status = ANY(%s) AND appointment_date >= CURRENT_DATE
        ORDER BY appointment_date, appointment_time
        """,
        (pet_id, list(statuses))
    )
    return cur.fetchall()


def _resolve_reschedule_appointment(slots: dict) -> dict:
    pet_name = (slots.get('pet_name') or '').strip()
    owner_name = (slots.get('owner_name') or '').strip() or None

    if not pet_name:
        return _ask('reschedule_appointment', slots, "Which pet's appointment would you like to reschedule?", field='pet_name')

    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            pet_rows = _find_pet_by_name(cur, pet_name, owner_name)
            if not pet_rows:
                return _done(f'I couldn\'t find an active pet named "{pet_name}".')
            if len(pet_rows) > 1:
                return _ask(
                    'reschedule_appointment', slots, f'I found multiple pets named "{pet_name}" - which one did you mean?',
                    field='owner_name', options=_owner_options(pet_rows)
                )

            pet_id, resolved_pet_name, customer_id, owner_first, owner_last = pet_rows[0]
            appt_rows = _find_upcoming_appointments(cur, pet_id, ('scheduled', 'confirmed'))
    finally:
        conn.close()

    if not appt_rows:
        return _done(f'{resolved_pet_name} has no upcoming appointment to reschedule.')

    target = None
    old_date_phrase = slots.get('old_date_phrase')
    if old_date_phrase:
        old_date = _resolve_date_phrase(old_date_phrase)
        matches = [r for r in appt_rows if old_date and r[1] == old_date]
        if len(matches) == 1:
            target = matches[0]

    if target is None:
        if len(appt_rows) == 1:
            target = appt_rows[0]
        else:
            listing = ', '.join(f'{r[1]} at {str(r[2])[:5]}' for r in appt_rows)
            return _ask('reschedule_appointment', slots, f'{resolved_pet_name} has multiple upcoming appointments ({listing}) - which one would you like to reschedule?', field='old_date_phrase')

    appointment_id, old_date, old_time, veterinarian_id = target

    new_date = _resolve_date_phrase(slots.get('new_date_phrase'))
    if not new_date:
        return _ask('reschedule_appointment', slots, 'What new date would you like to move it to?', field='new_date_phrase')

    new_time_raw = (slots.get('new_time') or '').strip()
    new_time = new_time_raw if _TIME_RE.match(new_time_raw) else str(old_time)[:5]

    action = {
        'type': 'reschedule_appointment',
        'slots': {
            'appointment_id': appointment_id,
            'appointment_date': new_date.isoformat(),
            'appointment_time': new_time,
        }
    }
    confirmation = (
        f'Move {resolved_pet_name}\'s appointment from {old_date} {str(old_time)[:5]} to '
        f'{new_date.strftime("%B %d, %Y")} at {new_time} - shall I confirm this?'
    )
    return {'answer': confirmation, 'action': action, 'requires_confirmation': True, 'structured': True}


def _resolve_cancel_appointment(slots: dict) -> dict:
    pet_name = (slots.get('pet_name') or '').strip()
    owner_name = (slots.get('owner_name') or '').strip() or None
    reason = (slots.get('reason') or '').strip() or 'Cancelled via AI assistant'

    if not pet_name:
        return _ask('cancel_appointment', slots, "Which pet's appointment would you like to cancel?", field='pet_name')

    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            pet_rows = _find_pet_by_name(cur, pet_name, owner_name)
            if not pet_rows:
                return _done(f'I couldn\'t find an active pet named "{pet_name}".')
            if len(pet_rows) > 1:
                return _ask(
                    'cancel_appointment', slots, f'I found multiple pets named "{pet_name}" - which one did you mean?',
                    field='owner_name', options=_owner_options(pet_rows)
                )

            pet_id, resolved_pet_name, customer_id, owner_first, owner_last = pet_rows[0]
            appt_rows = _find_upcoming_appointments(cur, pet_id, ('scheduled', 'confirmed'))
    finally:
        conn.close()

    if not appt_rows:
        return _done(f'{resolved_pet_name} has no upcoming appointment to cancel.')

    target = None
    date_phrase = slots.get('date_phrase')
    if date_phrase:
        target_date = _resolve_date_phrase(date_phrase)
        matches = [r for r in appt_rows if target_date and r[1] == target_date]
        if len(matches) == 1:
            target = matches[0]

    if target is None:
        if len(appt_rows) == 1:
            target = appt_rows[0]
        else:
            listing = ', '.join(f'{r[1]} at {str(r[2])[:5]}' for r in appt_rows)
            return _ask('cancel_appointment', slots, f'{resolved_pet_name} has multiple upcoming appointments ({listing}) - which one would you like to cancel?', field='date_phrase')

    appointment_id, appt_date, appt_time, _vet_id = target

    action = {
        'type': 'cancel_appointment',
        'slots': {'appointment_id': appointment_id, 'cancellation_reason': reason}
    }
    confirmation = f'Cancel {resolved_pet_name}\'s appointment on {appt_date} at {str(appt_time)[:5]} - shall I confirm this?'
    return {'answer': confirmation, 'action': action, 'requires_confirmation': True, 'structured': True}


def _resolve_send_reminder(slots: dict) -> dict:
    pet_name = (slots.get('pet_name') or '').strip()
    owner_name = (slots.get('owner_name') or '').strip() or None

    if not pet_name:
        return _ask('send_reminder', slots, "Which pet's appointment should I send a reminder for?", field='pet_name')

    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            pet_rows = _find_pet_by_name(cur, pet_name, owner_name)
            if not pet_rows:
                return _done(f'I couldn\'t find an active pet named "{pet_name}".')
            if len(pet_rows) > 1:
                return _ask(
                    'send_reminder', slots, f'I found multiple pets named "{pet_name}" - which one did you mean?',
                    field='owner_name', options=_owner_options(pet_rows)
                )

            pet_id, resolved_pet_name, customer_id, owner_first, owner_last = pet_rows[0]

            cur.execute(
                """
                SELECT appointment_id, appointment_date, appointment_time
                FROM appointments
                WHERE pet_id = %s AND status = 'confirmed' AND appointment_date >= CURRENT_DATE
                ORDER BY appointment_date, appointment_time
                LIMIT 1
                """,
                (pet_id,)
            )
            appt_row = cur.fetchone()

            cur.execute("SELECT email FROM customers WHERE customer_id = %s", (customer_id,))
            email_row = cur.fetchone()
    finally:
        conn.close()

    if not appt_row:
        return _done(f'{resolved_pet_name} has no upcoming confirmed appointment to remind about.')
    if not email_row or not email_row[0]:
        return _done(f'{owner_first} {owner_last} doesn\'t have an email on file, so I can\'t send a reminder.')

    appointment_id, appt_date, appt_time = appt_row
    action = {'type': 'send_reminder', 'slots': {'appointment_id': appointment_id}}
    confirmation = (
        f'Send a reminder email to {owner_first} {owner_last} about {resolved_pet_name}\'s appointment '
        f'on {appt_date} at {str(appt_time)[:5]} - shall I send it?'
    )
    return {'answer': confirmation, 'action': action, 'requires_confirmation': True, 'structured': True}


def _resolve_register_customer(slots: dict) -> dict:
    first_name = (slots.get('first_name') or '').strip()
    last_name = (slots.get('last_name') or '').strip()
    phone = (slots.get('phone') or '').strip()
    email = (slots.get('email') or '').strip() or None
    address = (slots.get('address') or '').strip() or None
    city = (slots.get('city') or '').strip() or None

    if not first_name or not last_name:
        return _ask('register_customer', slots, "What's the customer's full name?", field='full_name')
    if not phone:
        return _ask('register_customer', slots, f'What\'s a phone number for {first_name} {last_name}?', field='phone')

    # Mirrors customerModel.js's phoneExists/emailExists dedup checks (can't
    # call that Node code from here, so this re-implements the same lookup
    # against the same table/columns) - surfaces a conflict in the chat
    # instead of silently proposing a duplicate customer.
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT customer_id, first_name, last_name FROM customers WHERE phone = %s", (phone,))
            phone_match = cur.fetchone()
            email_match = None
            if email:
                cur.execute("SELECT customer_id, first_name, last_name FROM customers WHERE email = %s", (email,))
                email_match = cur.fetchone()
    finally:
        conn.close()

    if phone_match:
        return _done(f'A customer with phone {phone} already exists: {phone_match[1]} {phone_match[2]}. Did you mean to look them up instead?')
    if email_match:
        return _done(f'A customer with email {email} already exists: {email_match[1]} {email_match[2]}. Did you mean to look them up instead?')

    action = {
        'type': 'register_customer',
        'slots': {
            'first_name': first_name, 'last_name': last_name, 'phone': phone,
            'email': email, 'address': address, 'city': city,
        }
    }
    confirmation = f'Register new customer {first_name} {last_name}, phone {phone}{", email " + email if email else ""} - shall I confirm this?'
    return {'answer': confirmation, 'action': action, 'requires_confirmation': True, 'structured': True}


def _resolve_add_pet(slots: dict) -> dict:
    customer_name = (slots.get('customer_name') or '').strip()
    pet_name = (slots.get('pet_name') or '').strip()
    species = (slots.get('species') or '').strip()
    breed = (slots.get('breed') or '').strip() or None
    gender_raw = (slots.get('gender') or '').strip().lower() or None
    dob = (slots.get('date_of_birth') or '').strip() or None

    if not customer_name:
        return _ask('add_pet', slots, 'Which customer is this pet for?', field='customer_name')

    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            customer_rows = _find_customer_by_name(cur, customer_name)
    finally:
        conn.close()

    if not customer_rows:
        return _done(f'I couldn\'t find a customer matching "{customer_name}".')
    if len(customer_rows) > 1:
        return _ask('add_pet', slots, f'Found multiple customers matching "{customer_name}" - could you be more specific?', field='customer_name')

    customer_id, first_name, last_name = customer_rows[0]

    if not pet_name:
        return _ask('add_pet', slots, "What's the pet's name?", field='pet_name')
    if not species:
        return _ask('add_pet', slots, f'What species is {pet_name} (e.g. dog, cat)?', field='species')

    gender = gender_raw if gender_raw in ('male', 'female') else None
    if dob:
        try:
            date.fromisoformat(dob)
        except ValueError:
            dob = None

    action = {
        'type': 'add_pet',
        'slots': {
            'customer_id': customer_id, 'pet_name': pet_name, 'species': species.lower(),
            'breed': breed, 'gender': gender, 'date_of_birth': dob,
        }
    }
    confirmation = f'Add {pet_name} ({species}{", " + breed if breed else ""}) as a pet for {first_name} {last_name} - shall I confirm this?'
    return {'answer': confirmation, 'action': action, 'requires_confirmation': True, 'structured': True}


def _resolve_register_staff(slots: dict) -> dict:
    first_name = (slots.get('first_name') or '').strip()
    last_name = (slots.get('last_name') or '').strip()
    email = (slots.get('email') or '').strip()
    phone = (slots.get('phone') or '').strip() or None
    staff_role = _normalize_staff_role(slots.get('role'))
    specialization = (slots.get('specialization') or '').strip() or None
    license_number = (slots.get('license_number') or '').strip() or None

    if not first_name or not last_name:
        return _ask('register_staff', slots, "What's the new team member's full name?", field='full_name')

    if not staff_role:
        return _ask(
            'register_staff', slots,
            f'What role is {first_name} joining as - admin, veterinarian, or receptionist?',
            field='role'
        )

    if not email or not _EMAIL_RE.match(email):
        return _ask('register_staff', slots, f"What's a valid email address for {first_name} {last_name}?", field='email')

    if phone and not _STAFF_PHONE_RE.match(phone):
        return _ask(
            'register_staff', slots,
            'That phone number doesn\'t look right - please give it in the format +94XXXXXXXXX.',
            field='phone'
        )

    # Mirrors _resolve_register_customer's dedup check - re-implements the
    # same lookup emailExists() in userModel.js does, since that Node code
    # can't be called from here.
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT user_id, first_name, last_name FROM users WHERE email = %s", (email,))
            existing = cur.fetchone()
    finally:
        conn.close()

    if existing:
        return _done(f'A user with email {email} already exists: {existing[1]} {existing[2]}.')

    action = {
        'type': 'register_staff',
        'slots': {
            'first_name': first_name, 'last_name': last_name, 'email': email,
            'phone': phone, 'role': staff_role,
            'specialization': specialization, 'license_number': license_number,
        }
    }
    confirmation = (
        f'Add {first_name} {last_name} as a new {staff_role}, email {email}'
        f'{", phone " + phone if phone else ""} - they\'ll be created with a temporary password '
        f'and required to change it on first login. Shall I confirm this?'
    )
    return {'answer': confirmation, 'action': action, 'requires_confirmation': True, 'structured': True}


_RESOLVERS = {
    'book_appointment': _resolve_book_appointment,
    'reschedule_appointment': _resolve_reschedule_appointment,
    'cancel_appointment': _resolve_cancel_appointment,
    'send_reminder': _resolve_send_reminder,
    'register_customer': _resolve_register_customer,
    'add_pet': _resolve_add_pet,
    'register_staff': _resolve_register_staff,
}


_QUESTION_STARTER = re.compile(
    r'^\s*(?:how\s+many|how\s+much|what|why|when|where|who|which|is|are|does|do|can|could|should)\b',
    re.IGNORECASE
)


def _looks_like_fresh_question(reply: str) -> bool:
    """Used only while a slot-filling follow-up is pending (see
    try_action_intent): a bare value answering the field we just asked about
    ("Max", "next Tuesday", "checkup") never matches this, but a genuinely
    new question does. Without this, a mid-booking "actually, how many
    appointments do we have today?" got silently injected as the pet_name
    slot instead of being recognized as a topic change - see the comment at
    the call site."""
    reply = reply.strip()
    if not reply:
        return False
    if _CHART_OR_REPORT_REQUEST.search(reply) or _REPORT_OR_QUESTION_FRAMING.search(reply):
        return True
    word_count = len(reply.split())
    if word_count > 8 and reply.endswith('?'):
        return True
    if word_count > 3 and _QUESTION_STARTER.match(reply):
        return True
    return False


def _sanitize_slots(intent_type: str, slots) -> dict:
    """pending_intent round-trips through the client unvalidated - this
    keeps a malformed or tampered `slots` payload from reaching a resolver
    (or being merged into updated_slots below) as anything other than a
    plain dict restricted to that intent's own known fields."""
    if not isinstance(slots, dict):
        return {}
    fields = set(SLOT_SCHEMAS[intent_type]['fields'])
    return {k: v for k, v in slots.items() if k in fields}


def try_action_intent(question: str, role: str, customer_id: str = None, history=None, pending_intent: dict = None):
    """
    Detects and progresses a write-action request. Staff-only - returns None
    immediately for any other role, or if `question` doesn't match a known
    action intent (caller should fall through to try_structured_answer / RAG).
    """
    if role not in STAFF_ROLES:
        return None

    # register_staff is admin-only end to end. Checked here - before either
    # branch below, using pending_intent directly - rather than only on a
    # fresh request: pending_intent is client-supplied and unvalidated, so a
    # receptionist could otherwise post a hand-crafted
    # {"type": "register_staff", ...} pending_intent and walk the whole
    # slot-filling flow to a confirmation prompt that confirmAction would
    # only 403 anyway. No actual privilege escalation either way (Node
    # re-checks role on confirm), but this keeps a non-admin from ever
    # seeing a "shall I confirm this?" for an action they can't take.
    if pending_intent and pending_intent.get('type') == 'register_staff' and role != 'admin':
        return _done(
            "Staff registration is limited to admin accounts - please ask an admin to add this team member."
        )

    if pending_intent and pending_intent.get('type') in _RESOLVERS:
        if _BREAK_OUT.search(question):
            return _done("No problem, I've dropped that request.")
        intent_type = pending_intent['type']
        prior_slots = _sanitize_slots(intent_type, pending_intent.get('slots'))
        awaiting_field = pending_intent.get('field')

        if awaiting_field:
            reply = question.strip()
            if _looks_like_fresh_question(reply):
                # Topic change mid-flow: this doesn't look like an answer to
                # the field we just asked about, it looks like a new
                # question ("actually, how many appointments do we have
                # today?", "make a chart of appointments by type"). Drop the
                # pending intent instead of injecting the reply into
                # awaiting_field, and return None so the rest of
                # _route_to_generation's chain (chart/structured/RAG) gets a
                # chance to answer it fresh, same as if there were no
                # pending_intent at all.
                return None
            # Deterministic: this reply answers the single field we just
            # asked about (see _ask) - inject it directly and re-run the
            # resolver immediately, rather than routing it through the LLM
            # slot-merge below. That step isn't reliable at attributing a
            # short/bare reply to the right field - it was observed looping
            # on the same question forever instead of ever updating it,
            # especially when the reply overlaps with an already-set field
            # (e.g. "vaccination" answering both appointment_type and reason).
            if awaiting_field == 'full_name':
                # Splitting a full name doesn't need an LLM either - first
                # word is the first name, the rest is the last name.
                parts = reply.split(None, 1)
                updated_slots = {
                    **prior_slots,
                    'first_name': parts[0] if parts else '',
                    'last_name': parts[1] if len(parts) > 1 else ''
                }
            else:
                updated_slots = {**prior_slots, awaiting_field: reply}
            return _RESOLVERS[intent_type](updated_slots)
    else:
        intent_type = None
        if _CHART_OR_REPORT_REQUEST.search(question) or _REPORT_OR_QUESTION_FRAMING.search(question):
            # A chart/report request or a plain read/analysis question is
            # never a write command, even when it shares nouns with the
            # patterns below ("make A GRAPH OF appointments", "why did the
            # owner CANCEL the checkup?", "can you set up A REPORT on
            # emergency visits?"). Checked first so it suppresses every
            # write-intent pattern at once, same role as _HEDGED_SUGGESTION.
            pass
        elif _HEDGED_SUGGESTION.search(question):
            pass
        elif RESCHEDULE_APPOINTMENT.search(question):
            intent_type = 'reschedule_appointment'
        elif CANCEL_APPOINTMENT.search(question):
            intent_type = 'cancel_appointment'
        elif BOOK_APPOINTMENT.search(question) or _MAKE_APPOINTMENT.search(question):
            intent_type = 'book_appointment'
        elif SEND_REMINDER.search(question):
            intent_type = 'send_reminder'
        elif REGISTER_CUSTOMER.search(question):
            intent_type = 'register_customer'
        elif ADD_PET.search(question):
            intent_type = 'add_pet'
        elif REGISTER_STAFF.search(question):
            intent_type = 'register_staff'

        if intent_type is None:
            return None

        # Staff-account creation is admin-only (matches adminOnly on
        # POST /api/users) - caught here too, before any slot-filling
        # starts, rather than letting a receptionist/vet get partway through
        # a request that will only ever dead-end. (The pending_intent case
        # is covered above, ahead of this whole if/else.)
        if intent_type == 'register_staff' and role != 'admin':
            return _done(
                "Staff registration is limited to admin accounts - please ask an admin to add this team member."
            )

        prior_slots = {}

    # Only reached on a genuinely fresh request (first turn, no pending_intent) -
    # continuations above always resolve deterministically without an LLM call.
    conversation_text = _conversation_text(history, question)
    slots = _extract_slots_via_llm(intent_type, prior_slots, conversation_text)

    return _RESOLVERS[intent_type](slots)
