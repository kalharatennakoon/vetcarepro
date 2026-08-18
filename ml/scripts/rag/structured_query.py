"""
Structured Query Fallback
RAG (semantic retrieval + generation) is a poor fit for exact-fact questions
- it only ever sees a small sample of chunks (top_k), so asking "how many
pets are named X" gets answered from a handful of unrelated text snippets,
which the LLM then has to guess a number from. That produces exactly the
kind of confidently-wrong answer this module exists to prevent.

This module detects question patterns with a knowable exact answer and
resolves them with real SQL instead, bypassing embeddings/retrieval
entirely. Coverage has grown well past the original "counts" scope:
  - Counts/lists: pets, staff, appointments, disease cases, inventory
  - Clinic info: hours/location/contact from system_settings - public,
    every role including guest (checked first in try_structured_answer())
  - Pet-owner self-service: a caller's own upcoming appointments and
    billing balance, scoped to customer_id directly (no name-lookup
    ambiguity, unlike the staff equivalents which resolve a typed name)
  - Billing: unpaid totals, payment status, historical price estimates
  - Timeframe/relative-date resolution (_resolve_timeframe,
    _resolve_relative_weekday, _resolve_specific_day, _extract_date_via_llm)
  - Pet-name resolution (resolve_pet_id, find_pet_candidates and their
    helpers) - shared, not just used internally here

Other rag/ modules import from this file rather than duplicating pet
resolution or role constants: action_intent.py imports STAFF_ROLES,
APPT_TYPE_WORDS, the weekday/date helpers; clinical_tools.py imports
CLINICAL_STAFF_ROLES and the pet-name-matching helpers; rag_service.py
imports try_structured_answer, resolve_pet_id, find_pet_candidates,
STAFF_ROLES. This module must NOT import back from action_intent.py or
clinical_tools.py (action_intent.py already imports from here, and
clinical_tools.py imports from action_intent.py) - doing so would create a
circular import.

Add more patterns/handlers here as you notice more RAG "hallucinated
answer" failures in testing.
"""

import re
import sys
import os
import json
from datetime import date, timedelta
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from config.db_connection import get_raw_db_connection
from scripts.rag.ollama_client import generate_answer, OllamaError

STAFF_ROLES = {'admin', 'veterinarian', 'receptionist'}

# Clinical detail (diagnoses, treatment, disease-case specifics) is narrower
# than the general STAFF_ROLES bucket: receptionist is fully blocked from
# disease-case endpoints and medical-record pages in the regular app
# (roleCheck.js's vetOrAdmin, and App.jsx's requiredRoles), so the AI
# assistant shouldn't hand over clinical detail there either - only
# admin/veterinarian get it.
CLINICAL_STAFF_ROLES = {'admin', 'veterinarian'}

# Aggregate revenue reporting is narrower still, and in the opposite
# direction from CLINICAL_STAFF_ROLES: veterinarian is the one excluded
# role, not receptionist. Matches billingRoutes.js's adminOrReceptionist
# gate on GET /api/billing/stats/revenue - the one billing endpoint in the
# app that's actually restricted below plain "authenticated staff". Bill
# lookups, balances, and overdue counts (getBills/getBill/getOverdue) have
# no such gate, so _customer_balance/_count_unpaid_bills/etc. below stay on
# plain STAFF_ROLES; only _sum_revenue_timeframe - the handler that mirrors
# getRevenue's aggregate-stats shape - uses this narrower set.
BILLING_STAFF_ROLES = {'admin', 'receptionist'}

# Shared timeframe vocabulary used by appointments/disease-case/billing queries.
TIMEFRAME_WORDS = r'(today|yesterday|tomorrow|last\s+week|this\s+week|last\s+month|this\s+month|this\s+year)'


def _normalize_timeframe(raw: str) -> str:
    return re.sub(r'\s+', ' ', raw.strip().lower())


def _resolve_timeframe(raw: str):
    """
    Maps a natural-language timeframe word to a concrete (start_date, end_date)
    inclusive range, anchored on today's date.

    Returns:
        (date, date) if recognized, otherwise (None, None).
    """
    today = date.today()
    tf = _normalize_timeframe(raw)

    if tf == 'today':
        return today, today
    if tf == 'yesterday':
        d = today - timedelta(days=1)
        return d, d
    if tf == 'tomorrow':
        d = today + timedelta(days=1)
        return d, d
    if tf == 'this week':
        start = today - timedelta(days=today.weekday())  # Monday
        end = start + timedelta(days=6)
        return start, end
    if tf == 'last week':
        this_week_start = today - timedelta(days=today.weekday())
        start = this_week_start - timedelta(days=7)
        end = this_week_start - timedelta(days=1)
        return start, end
    if tf == 'this month':
        start = today.replace(day=1)
        next_month = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
        end = next_month - timedelta(days=1)
        return start, end
    if tf == 'last month':
        this_month_start = today.replace(day=1)
        end = this_month_start - timedelta(days=1)
        start = end.replace(day=1)
        return start, end
    if tf == 'this year':
        return date(today.year, 1, 1), date(today.year, 12, 31)

    return None, None


def _resolve_specific_day(day: int, month_qualifier: str = None):
    """
    Resolves a bare day-of-month (e.g. 31) plus an optional relative month
    qualifier ('this'/'next'/'last', defaulting to 'this') into a concrete
    date. Returns None if the day doesn't exist in that month (e.g. day=31,
    month_qualifier='next' when next month has only 30 days).
    """
    today = date.today()
    month_qualifier = (month_qualifier or 'this').lower()

    year = today.year
    month = today.month
    if month_qualifier == 'next':
        month += 1
        if month > 12:
            month = 1
            year += 1
    elif month_qualifier == 'last':
        month -= 1
        if month < 1:
            month = 12
            year -= 1

    try:
        return date(year, month, day)
    except ValueError:
        return None


_WEEKDAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']


def _resolve_relative_weekday(qualifier: str, weekday_name: str):
    """
    Resolves "this/next/last <weekday>" into a concrete date, anchored on
    the same Monday-start calendar week used by _resolve_timeframe's
    "this/next/last week" (not "N days from today") - keeps "next Friday"
    consistent with what "next week" already means elsewhere in this file.

    Deliberately deterministic Python arithmetic, NOT delegated to the LLM:
    relative weekday math is exactly the kind of thing a small local model
    gets subtly wrong (verified: asked for "next Friday" anchored on Monday
    2026-07-27, qwen2.5-coder:7b returned 2026-08-04 - a Tuesday). The LLM
    fallback (_extract_date_via_llm) is reserved for absolute dates only,
    where there's no arithmetic to get wrong.
    """
    today = date.today()
    this_week_start = today - timedelta(days=today.weekday())  # Monday
    target_weekday = _WEEKDAY_NAMES.index(weekday_name.lower())

    qualifier = (qualifier or 'this').lower()
    if qualifier == 'next':
        week_start = this_week_start + timedelta(days=7)
    elif qualifier == 'last':
        week_start = this_week_start - timedelta(days=7)
    else:
        week_start = this_week_start

    return week_start + timedelta(days=target_weekday)


# A bare relative-weekday question ("next monday", "what date is next
# Friday?") with no appointment/clinical content of its own is pure
# calendar arithmetic, not a clinic-data lookup - but with nothing else in
# the question, it has no chunks to retrieve and previously fell through
# to plain RAG retrieval, where the LLM was observed answering from
# whatever unrelated dates happened to be in the (irrelevant) retrieved
# context instead of doing real date arithmetic, off by months. Anchored
# on the whole (stripped) question so it only matches when the weekday
# reference IS the question - "appointments next Monday" has extra content
# this pattern won't match, leaving that to APPT_RELATIVE_WEEKDAY below,
# which is scoped to the appointments table.
# Bounded gap (not a bare .*) after "what", same fix as the inventory
# reorder regex - covers "what date is/day is/'s the date on next Friday"
# etc. without enumerating every phrasing combination, while still failing
# to match once "appointments" or other real content pushes the qualifier
# past the 20-char gap (verified below: "any appointments next monday?"
# doesn't start with "what" at all, so it's excluded from the very first
# token, independent of the gap bound).
BARE_RELATIVE_WEEKDAY = re.compile(
    r'^(?:what.{0,20})?(this|next|last)\s+(' + '|'.join(_WEEKDAY_NAMES) +
    r')\'?s?\s*(?:date)?\s*\??$',
    re.IGNORECASE
)


def _bare_relative_weekday_date(qualifier: str, weekday_name: str) -> dict:
    target_date = _resolve_relative_weekday(qualifier, weekday_name)
    qualifier_label = (qualifier or 'this').capitalize()
    weekday_label = weekday_name.capitalize()
    return {
        'answer': f"{qualifier_label} {weekday_label} is {_fmt_date(target_date)}.",
        'sources': [],
        'chunks_used': 0,
        'structured': True
    }


_DATE_EXTRACTION_PROMPT = """You extract a single calendar date from a question about appointments. Today's date is {today}.

Respond with ONLY a JSON object, no other text, no markdown, in exactly this shape:
{{"date": "YYYY-MM-DD"}}

If the question names a relative weekday (e.g. "next Friday", "last Monday"), respond with exactly:
{{"date": null}}
That case is handled separately with reliable date arithmetic, not by you - guessing it yourself is exactly the kind of calendar math small models get wrong.

If the question does not name or clearly imply one specific calendar date at all (e.g. it's about a whole week/month), also respond with:
{{"date": null}}
"""


def _extract_date_via_llm(question: str):
    """
    Last-resort date extraction for appointment questions that don't match
    any regex pattern above - regexes can't cover every phrasing ("July
    31st, 2026", "next Friday", "the first Monday of August"), so ask the
    LLM to normalize whatever date is in the question into YYYY-MM-DD, then
    look that date up for real in the database. The LLM only ever parses
    the date here - the actual appointment data always comes from a live
    SQL query (_list_appointments_on_date), never from the LLM itself.

    Returns:
        date if a single concrete date was confidently extracted, else None
        (caller should fall through to normal RAG rather than guess).
    """
    system_prompt = _DATE_EXTRACTION_PROMPT.format(today=date.today().isoformat())
    try:
        raw, _ = generate_answer(system_prompt, question)
    except OllamaError:
        return None

    # Defensive: the model may still wrap the JSON in a code fence or add
    # stray commentary despite the instruction - pull out the first {...}.
    match = re.search(r'\{.*\}', raw, re.DOTALL)
    if not match:
        return None

    try:
        parsed = json.loads(match.group(0))
    except (json.JSONDecodeError, TypeError):
        return None

    date_str = parsed.get('date') if isinstance(parsed, dict) else None
    if not date_str:
        return None

    try:
        return date.fromisoformat(date_str)
    except (ValueError, TypeError):
        return None

# Matches: "how many pets are/is there named/called X", "how many pets named X",
# "how many pets whose name is X", "how many pets ... name is X",
# "how many pets have the name X"
COUNT_PETS_BY_NAME = re.compile(
    r'how many pets?\b.*?(?:named|called|(?:name\s+is)|(?:whose\s+name\s+is)|(?:have\s+the\s+name))\s+[\'"]?([a-zA-Z]+)[\'"]?',
    re.IGNORECASE
)

# Matches: "how many pets does John Doe have?", "how many pets does customer
# Jane Doe own?" - counting pets belonging to a specific customer, as opposed
# to COUNT_PETS_BY_NAME which counts pets sharing a given pet name.
COUNT_PETS_BY_CUSTOMER = re.compile(
    r'how many pets?\b.*?\bdoes\b\s+(?:customer\s+)?[\'"]?([A-Za-z]+(?:\s+[A-Za-z]+)?)[\'"]?\s+(?:have|own)\b',
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

# Matches temporal "last / most recent" vaccine questions - a single-dose
# lookup, deliberately NOT matching "up to date" phrasing (see
# VACCINATION_UP_TO_DATE below, a different question with a different
# handler):
# "when did Max take his last vaccine?"
# "when was Max last vaccinated?"
# "what was the latest vaccination for Bella?"
# "most recent vaccine for Max"
LAST_VACCINATION = re.compile(
    r'\b(?:last|latest|most\s+recent|recent)\b.*\b(?:vaccines?|vaccinations?)\b|'
    r'\b(?:vaccines?|vaccinations?)\b.*\b(?:last|latest|most\s+recent|recent)\b|'
    r'\bwhen\b.*\b(?:last|latest|recent)\b.*\bvaccinat|'
    r'\bwhen\b.*\bvaccinat.*\b(?:last|latest|recent)\b|'
    r'\blast\s+time\b.*\bvaccinat',
    re.IGNORECASE
)

# Matches "up to date" vaccination-status questions - answered differently
# from LAST_VACCINATION above. A pet can have several DISTINCT vaccine
# types on file (e.g. both DHPP and Rabies) with different due dates; "up
# to date" asks about ALL of them, not just whichever single dose happens
# to have been administered most recently (LAST_VACCINATION's question).
# Answering "is Max up to date with shots?" with only his latest Rabies
# shot, while silently omitting an overdue DHPP booster, would be actively
# misleading - see _vaccination_status_for_pet, which reports every
# vaccine type's latest dose and due date, not one global "last shot" row:
# "is Max up to date with shots?" / "is Max up to date on vaccinations?"
VACCINATION_UP_TO_DATE = re.compile(
    r'\bup[\s-]?to[\s-]?date\b.*\b(?:vaccines?|vaccinations?|shots?)\b|'
    r'\b(?:vaccines?|vaccinations?|shots?)\b.*\bup[\s-]?to[\s-]?date\b',
    re.IGNORECASE
)

# Matches: "list medical records for pet Max", "show me the history of pet Fido"
LIST_RECORDS_BY_PET = re.compile(
    r'\b(?:list|show|get|find)\b.*\b(?:medical\s+records?|history)\b.*\b(?:for|of)\s+pet\b',
    re.IGNORECASE
)


# Matches: "list all medical records for customer John Doe", "show history for pets of Jane Doe"
LIST_RECORDS_BY_CUSTOMER = re.compile(
    r'\b(?:list|show|get|find)\b.*\b(?:medical\s+records?|history)\b.*\b(?:for|of|owned\s+by)\b\s+(?:customer\s+)?[\'"]?([A-Za-z]+(?:\s+[A-Za-z]+)?)[\'"]?',
    re.IGNORECASE
)


# A pet_owner referring to their own pet without naming it - "my pet", "my
# dog", "my cat", etc. Only meaningful for role='pet_owner' - staff have no
# "my pet" of their own to resolve. Without this, a question like "what
# vaccines has my pet had?" mentions no name at all, so find_pet_candidates()
# treats it exactly like a genuinely pet-less question (e.g. "what vaccines
# does a puppy need?") and falls through to slow, unscoped RAG retrieval -
# wasteful for a single-pet owner (there's only one possible answer) and
# outright wrong for a multi-pet owner (nothing tells retrieval which pet is
# meant, so it mixes both pets' records into one ungrounded answer).
SELF_PET_MENTION = re.compile(r'\bmy\s+(?:pet|dog|cat|puppy|kitten|companion)s?\b', re.IGNORECASE)

# Matches "pet Max" specifically - tried first since it's unambiguous.
PET_MENTION = re.compile(r'\bpet\s+[\'"]?([A-Za-z]+)[\'"]?', re.IGNORECASE)

# Matches "of Max" or "for Max" or "about Max" - a standalone name following a
# preposition, used as a fallback when "pet" isn't in the question. Only used
# if PET_MENTION doesn't match, otherwise "for pet Max" would capture "pet"
# itself instead of "Max".
PET_BY_MENTION = re.compile(r'\b(?:of|for|about)\s+[\'"]?([A-Za-z]+)[\'"]?', re.IGNORECASE)

# Matches a possessive pet name like "Loki's", "Max's", or "loki's" - the
# most natural way people actually phrase pet-specific questions ("what did
# the vet find during Loki's last visit"), which the two patterns above miss
# since there's no "pet"/"of"/"for"/"about" trigger word immediately before
# the name. Used as a last-resort fallback. Case-insensitive so a lowercase-
# typed name (e.g. "loki's" from someone not bothering to capitalize) still
# resolves.
PET_POSSESSIVE_MENTION = re.compile(r"\b([A-Za-z][a-zA-Z]*)'s\b")

# Common function/time words that can land in PET_BY_MENTION's "of/for/about
# X" capture group or PET_POSSESSIVE_MENTION's "X's" capture group when the
# question has nothing to do with a specific pet at all - e.g. "inventory
# demand for the next 18 months" would otherwise capture "the" as a pet
# name, and "what's next month's revenue" would capture "month". This used
# to be harmless (a bad extraction just meant zero SQL rows and a silent
# fall-through to unscoped retrieval), but rag_service.answer_question now
# returns a hard "I couldn't find a pet named ..." error whenever an
# extracted name matches zero pets, so a bad extraction here is a visible,
# confusing bug instead of a no-op - filter it out before it ever reaches
# the DB lookup.
_PET_NAME_STOPWORDS = {
    'the', 'a', 'an', 'this', 'that', 'these', 'those',
    'my', 'our', 'your', 'his', 'her', 'its', 'their',
    'next', 'last', 'coming', 'upcoming', 'past', 'current',
    'what', 'how', 'where', 'who', 'when', 'why',
    'it', 'there', 'here', 'he', 'she', 'they', 'we', 'you', 'i',
    'month', 'months', 'day', 'days', 'week', 'weeks', 'year', 'years',
    # "my pet's medical records" makes PET_POSSESSIVE_MENTION capture the
    # literal word "pet" - skipping it lets the scan continue to a real name
    # later in the same question ("my pet's vaccination history for Max").
    'pet', 'pets',
}


def _names_a_pet_explicitly(question: str, pet_name: str) -> bool:
    """
    Whether `pet_name` was capitalized where it appears in `question`, i.e.
    the asker actually wrote a name rather than ordinary lowercase English
    that the extraction patterns happened to capture.

    The patterns above are deliberately permissive, and the word "pet" shows
    up constantly in general pet-care questions that name no pet at all -
    "what counts as a pet emergency", "how do I care for my pet after
    surgery", "how often should my pet see a veterinarian" all put a plain
    lowercase word right after "pet". Capitalization is what separates those
    from "my pet Max is limping".

    This only gates the hard "I couldn't find a pet named X" error in
    find_pet_candidates - a lowercase name that DOES match a real pet still
    resolves normally (the lookup is ILIKE), so requiring a capital here
    costs nothing for genuine names. The one thing it gives up is erroring
    on a lowercase misspelling of a nonexistent pet ("luke"), which falls
    through to unscoped retrieval instead - the same harmless no-op this
    module had before the error existed, and far better than telling someone
    asking about a pet emergency that they have no pet named "emergency".

    A capitalized word immediately followed by ANOTHER capitalized word
    ("Diabetes Mellitus", "Chronic Kidney Disease") is excluded too - that
    shape is characteristic of a medical/proper-noun phrase caught by
    PET_BY_MENTION's "for/of/about X" pattern (e.g. "managed for Diabetes
    Mellitus"), not how a personal pet name is ever phrased ("for Max is
    limping", never "for Max Something"). Without this, a genuinely
    misspelled pet name still correctly hard-errors - it's just this one
    two-capitalized-words shape that's treated as "not a name at all".
    """
    match = re.search(rf'\b{re.escape(pet_name)}\b', question)
    if not match or not pet_name[:1].isupper():
        return False
    return not re.match(r"\s+[A-Z][a-z]", question[match.end():])


def _first_non_stopword_match(pattern, text: str):
    """Like pattern.search(text).group(1), but skips over any match whose
    captured group is a common function/time word rather than a plausible
    pet name, and keeps scanning for a later match instead of giving up -
    e.g. "for the vaccination history of Max" should still resolve to "Max"
    even though "for the" is tried (and rejected) first."""
    for match in pattern.finditer(text):
        candidate = match.group(1)
        if candidate.lower() not in _PET_NAME_STOPWORDS:
            return candidate
    return None


def _first_possessive_pet_name(question: str):
    return _first_non_stopword_match(PET_POSSESSIVE_MENTION, question)


def _match_customer_pet_by_name(question: str, customer_id: str):
    """
    Last-resort fallback for role='pet_owner' when the question mentions a
    pet by name with no grammatical trigger word at all - e.g. "help Max
    with his joint pain" has no "pet"/"of/for/about" before the name and no
    possessive "'s" either, so none of the patterns above catch it.

    Doing a plain whole-word scan is only safe here because it's bounded to
    this one customer's own (small) pet list - unlike staff, where the same
    name can belong to many different customers and genuinely needs a
    trigger word or owner name to disambiguate which pet is meant.
    """
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT pet_id, pet_name FROM pets WHERE customer_id = %s", (customer_id,))
            pets = cur.fetchall()
    finally:
        conn.close()

    matches = [
        pet_id for pet_id, pet_name in pets
        if pet_name and re.search(rf'\b{re.escape(pet_name)}\b', question, re.IGNORECASE)
    ]
    # Only resolve if exactly one of the owner's pets is named - if two
    # distinct pets are both mentioned (e.g. "compare Max and Loki"), fall
    # through to unscoped retrieval rather than guessing which one matters.
    return matches[0] if len(matches) == 1 else None


OWNER_MENTION = re.compile(
    r'owner\s+(?:is|named|called)?\s*[\'"]?([A-Za-z]+(?:\s+[A-Za-z]+)?)[\'"]?', re.IGNORECASE
)


def _bare_staff_pet_mention(question: str):
    """
    Last-resort pet-name extraction for STAFF questions with no grammatical
    trigger word ("pet"/"of"/"for"/"about") and no possessive "'s" at all -
    e.g. "is Max up to date with shots?" or "is max up to date with shots?"
    (no capital needed). None of PET_MENTION / PET_BY_MENTION /
    _first_possessive_pet_name catch this shape.

    Unlike _match_customer_pet_by_name, this is NOT bounded to one owner's
    pet list - it scans every pet name in the clinic, since staff can ask
    about any pet. That used to make a bare match unsafe to act on (the same
    name can belong to many different owners with no way to tell which one
    was meant) - now safe, because find_pet_candidates()/resolve_pet_id()
    already fall back to "ask which owner" (see rag_service.answer_question)
    whenever a resolved name turns out to match more than one pet, rather
    than silently guessing. Returning the bare name here just feeds that
    same disambiguation path instead of leaving the question with no pet
    identity at all and falling through to unscoped clinic-wide retrieval.

    Returns:
        the matched pet_name (str) if exactly one DISTINCT pet name (which
        may still belong to several different pets/owners) was found
        mentioned in the question, else None - zero matches, or two+
        different pet names mentioned (e.g. "compare Max and Loki", where
        guessing which one matters would be wrong).
    """
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT DISTINCT pet_name FROM pets WHERE pet_name IS NOT NULL")
            names = [r[0] for r in cur.fetchall()]
    finally:
        conn.close()

    matched = {
        name for name in names
        if name and re.search(rf'\b{re.escape(name)}\b', question, re.IGNORECASE)
    }
    return next(iter(matched)) if len(matched) == 1 else None


# ============================================================
# Clinic info (hours, location, contact) - public, no role restriction.
# system_settings holds this (seed.sql), but nothing previously read it in
# the RAG layer, so "what time do you open?" / "where are you located?" /
# "what's your phone number?" - the most common guest/receptionist
# questions - had no way to be answered. Exact SQL, same reasoning as every
# other structured handler in this file: these are facts, not something to
# leave to semantic retrieval or the LLM to guess/hallucinate.
# ============================================================

# All three patterns below require an explicit clinic anchor ("your",
# "the clinic('s)", "clinic('s)", or "VetCare('s)") rather than matching the
# bare words alone. Without it, "hours"/"address"/"phone number" also match
# a huge class of customer-data questions ("What is Nishantha Rajapaksa's
# phone number?", "within 48 hours of the appointment", "how many
# appointment hours does Dr. Silva have?") - those must fall through to the
# normal per-customer/per-pet handlers (or RAG), not get answered with the
# clinic's own details.
_CLINIC_ANCHOR = r'(?:your|the\s+clinic\'?s?|clinic\'?s?|vetcare\'?s?)'

CLINIC_HOURS = re.compile(
    rf'\b{_CLINIC_ANCHOR}\s+(?:business\s+|opening\s+|working\s+)?hours\b|'
    r'\b(?:business|opening|working)\s+hours\b|'  # unanchored: these compound forms are unambiguous on their own
    r'\bwhat\s+time\b.*\b(?:do\s+you|does\s+the\s+clinic|is\s+the\s+clinic)\b.*\b(?:open|close|closing)\b|'
    r'\bwhen\s+(?:are\s+you|do\s+you|is\s+the\s+clinic)\b.*\b(?:open|close|closing)\b|'
    r'\bare\s+you\s+open\b|'
    r'\bwhat\s+days\s+(?:are\s+you|is\s+the\s+clinic)\s+open\b',
    re.IGNORECASE
)

CLINIC_LOCATION = re.compile(
    r'\bwhere\s+(?:are\s+you|is\s+the\s+clinic|is\s+vetcare)\b|'
    rf'\b{_CLINIC_ANCHOR}\s+(?:address|location)\b',
    re.IGNORECASE
)

CLINIC_CONTACT = re.compile(
    rf'\b{_CLINIC_ANCHOR}\s+(?:phone|contact|mobile)\s+number\b|'
    r'\bhow\s+(?:do\s+i|can\s+i)\s+contact\s+(?:you|the\s+clinic|vetcare)\b|'
    rf'\b{_CLINIC_ANCHOR}\s+(?:phone|email|contact)\b|'
    rf'\b{_CLINIC_ANCHOR}\s+website\b',
    re.IGNORECASE
)


# ============================================================
# Inventory
# ============================================================

# Matches: "how many items are low on stock?", "which items are running low?"
INVENTORY_LOW_STOCK = re.compile(
    r'\b(?:low\s+(?:on\s+)?stock|running\s+low)\b', re.IGNORECASE
)

# Matches: "how many items are out of stock?", "what's out of stock?"
INVENTORY_OUT_OF_STOCK = re.compile(
    r'\bout\s+of\s+stock\b', re.IGNORECASE
)

# Matches: "what's expiring soon?", "which items are expiring in the next 30 days?",
# "what's expiring this month?". Optional day count; defaults to 90 (matches the
# near-expiry window used elsewhere in the app) if not specified.
INVENTORY_EXPIRING = re.compile(
    r'\bexpir(?:ing|es?|ed)\b(?:.*?\b(?:in\s+the\s+next|within|in)\s+(\d+)\s+days?\b)?',
    re.IGNORECASE
)


# ============================================================
# Appointments
# ============================================================

# Matches: "how many appointments does Dr. Silva have?", "how many appointments does Nimal have"
APPT_COUNT_BY_VET = re.compile(
    r'how many appointments?\b.*?\bdoes\b\s+(?:dr\.?\s+)?[\'"]?([A-Za-z]+(?:\s+[A-Za-z]+)?)[\'"]?\s+have\b',
    re.IGNORECASE
)

# Matches: "how many no-shows this month?", "how many no shows were there today?"
APPT_COUNT_NO_SHOW = re.compile(
    r'how many\b.*\bno[\s-]?shows?\b(?:.*?\b' + TIMEFRAME_WORDS + r'\b)?',
    re.IGNORECASE
)

# Matches: "how many appointments are scheduled?", "how many appointments were cancelled?"
APPT_COUNT_BY_STATUS = re.compile(
    r'how many appointments?\b.*?\b(scheduled|confirmed|in[\s-]?progress|completed|cancelled|no[\s-]?show)\b',
    re.IGNORECASE
)

# Matches: "how many appointments today?", "how many appointments are there this week?"
# Least specific of the four - only checked if the others don't match.
APPT_COUNT_TIMEFRAME = re.compile(
    r'how many appointments?\b.*?\b' + TIMEFRAME_WORDS + r'\b',
    re.IGNORECASE
)

# Matches: "what appointments do we have this week?", "list appointments today",
# "show me the appointments this month" - listing counterpart to
# APPT_COUNT_TIMEFRAME for "what's on" rather than "how many" questions.
LIST_APPOINTMENTS_TIMEFRAME = re.compile(
    r'\b(?:what|which|list|show)\b.*\bappointments?\b.*\b' + TIMEFRAME_WORDS + r'\b',
    re.IGNORECASE
)

# Matches a specific day-of-month, e.g. "what's the appointment on 31st of
# this month?", "any appointments on the 5th?", "appointment on the 12th
# next month" - checked BEFORE LIST_APPOINTMENTS_TIMEFRAME so a specific day
# doesn't get swallowed into a whole-month/week listing. Month qualifier
# defaults to the current month when omitted.
APPT_SPECIFIC_DAY = re.compile(
    r'\bappointments?\b.*?\bon\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\b'
    r'(?:\s+of\s+(this|next|last)\s+month|\s+(this|next|last)\s+month)?',
    re.IGNORECASE
)

# Matches: "any appointments next Friday?", "what's on this Monday",
# "appointments last Sunday" - resolved via _resolve_relative_weekday
# (deterministic arithmetic), not the LLM date-extraction fallback.
APPT_RELATIVE_WEEKDAY = re.compile(
    r'\bappointments?\b.*?\b(this|next|last)\s+(' + '|'.join(_WEEKDAY_NAMES) + r')\b',
    re.IGNORECASE
)

# "When is <pet>'s next appointment?" shape - role-agnostic wording, so it's
# shared by two different callers below: the pet-owner branch (no name
# needed - "my"/implicit own pet, scoped to customer_id) and the staff
# branch (a named pet, resolved clinic-wide by resolve_pet_id like the
# medical-record/vaccine patterns above it).
NEXT_APPOINTMENT_MENTION = re.compile(
    r'\b(?:when(?:\'s|\s+is)|what(?:\'s|\s+is))\b.*\bnext\b.*\bappointment|'
    r'\bnext\s+appointment\b|'
    r'\b(?:do\s+i|does\s+my\s+pet)\s+have\s+(?:an?\s+)?(?:upcoming\s+)?appointment|'
    r'\bupcoming\s+appointments?\b',
    re.IGNORECASE
)

# Matches: "what appointments do I have this week?", "my appointments this
# month", AND "do I have an appointment tomorrow?" (this word order - "do i
# have" before "appointment" - is the natural phrasing for a single-day
# yes/no check, so it needs its own alternative rather than only the
# "appointments ... do i have ... <timeframe>" listing order above it).
OWNER_APPOINTMENTS_TIMEFRAME = re.compile(
    r'\b(?:my|our)\b.*\bappointments?\b.*\b' + TIMEFRAME_WORDS + r'\b|'
    r'\bappointments?\b.*\bdo\s+i\s+have\b.*\b' + TIMEFRAME_WORDS + r'\b|'
    r'\bdo\s+i\s+have\b.*\bappointments?\b.*\b' + TIMEFRAME_WORDS + r'\b',
    re.IGNORECASE
)


# ============================================================
# Disease cases
# ============================================================

# Matches: "how many contagious cases are there?", "how many contagious disease cases this month?"
DISEASE_COUNT_CONTAGIOUS = re.compile(
    r'how many\b.*\bcontagious\b.*\bcases?\b', re.IGNORECASE
)

# Matches: "how many infectious cases?" AND "how many cases are infectious?"
DISEASE_COUNT_BY_CATEGORY = re.compile(
    r'how many\b.*?\b(infectious|parasitic|metabolic|genetic|immune[\s-]?mediated|'
    r'neoplastic|traumatic|nutritional)\b.*?\bcases?\b|'
    r'how many\b.*?\bcases?\b.*?\b(infectious|parasitic|metabolic|genetic|immune[\s-]?mediated|'
    r'neoplastic|traumatic|nutritional)\b',
    re.IGNORECASE
)

# Matches: "how many critical cases?" AND "how many cases are severe?"
DISEASE_COUNT_BY_SEVERITY = re.compile(
    r'how many\b.*?\b(mild|moderate|severe|critical)\b.*?\bcases?\b|'
    r'how many\b.*?\bcases?\b.*?\b(mild|moderate|severe|critical)\b',
    re.IGNORECASE
)


# ============================================================
# Billing
# ============================================================

# Matches: "how many unpaid bills are there?", "how many overdue bills?"
BILLING_COUNT_UNPAID = re.compile(
    r'how many\b.*\b(?:unpaid|overdue)\b.*\bbills?\b', re.IGNORECASE
)

# Matches: "what's the total revenue this month?", "how much income today?"
BILLING_REVENUE_TIMEFRAME = re.compile(
    r'\b(?:total\s+)?(?:revenue|income)\b.*?\b' + TIMEFRAME_WORDS + r'\b|'
    r'how much\s+(?:revenue|income)\b.*?\b' + TIMEFRAME_WORDS + r'\b',
    re.IGNORECASE
)

# Matches: "how many bills were paid by cash?", "how many bills paid via bank transfer?"
BILLING_COUNT_BY_METHOD = re.compile(
    r'how many bills?\b.*\bpaid\b.*\b(cash|card|bank[\s-]?transfer|mobile[\s-]?payment|insurance)\b',
    re.IGNORECASE
)

# Matches: "what does John Doe owe?", "how much does Jane Doe owe?",
# "outstanding balance for John Doe", "what's John Doe's balance/outstanding balance"
BILLING_BALANCE_BY_CUSTOMER = re.compile(
    r'(?:what\s+does|how\s+much\s+does)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+owe\b|'
    r'outstanding\s+balance\s+for\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\b|'
    r"\b([A-Za-z]+(?:\s+[A-Za-z]+)?)'s\s+(?:outstanding\s+)?balance\b",
    re.IGNORECASE
)

# Matches: "has John Doe paid?", "is Jane Doe's bill paid?",
# "what's the payment status for John Doe", "payment status of Jane Doe"
BILLING_PAYMENT_STATUS_BY_CUSTOMER = re.compile(
    r'\bhas\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+paid\b|'
    r'payment\s+status\s+(?:for|of)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\b|'
    r"\bis\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)'s\s+bill\s+paid\b",
    re.IGNORECASE
)

# Pet-owner (first-person) equivalents of the staff billing patterns above -
# "how much do I owe?", "have I paid my last bill?". Scoped to the caller's
# own customer_id, never a name lookup (unlike the staff versions, which
# must resolve an ambiguous customer name first).
OWNER_BALANCE = re.compile(
    r'\bhow\s+much\s+do\s+i\s+owe\b|\bwhat\s+do\s+i\s+owe\b|'
    r'\bmy\s+(?:outstanding\s+)?balance\b|\bdo\s+i\s+owe\s+anything\b',
    re.IGNORECASE
)

# Matches: "have I paid?", "is my bill paid?", "what's my payment status"
OWNER_PAYMENT_STATUS = re.compile(
    r'\bhave\s+i\s+paid\b|\bis\s+my\s+bill\s+paid\b|\bmy\s+payment\s+status\b',
    re.IGNORECASE
)

# Appointment-type vocabulary matching the `appointments.appointment_type` enum
# (checkup|vaccination|surgery|emergency|follow_up|consultation).
APPT_TYPE_WORDS = r'(checkups?|vaccinations?|surgery|surgeries|emergenc(?:y|ies)|follow[\s-]?ups?|consultations?)'

# Matches: "how much does a checkup cost?", "what's the estimated cost for a
# vaccination appointment?", "price of a surgery", "cost of a consultation"
BILLING_PRICE_ESTIMATE = re.compile(
    r'\b(?:how\s+much\s+(?:does|would|will|is)|what\'?s?\s+the\s+(?:estimated\s+)?(?:price|cost)\s+(?:of|for)|'
    r'price\s+of|cost\s+of|estimate[d]?\s+(?:cost|price)\s+(?:of|for))\b.*?\b' + APPT_TYPE_WORDS + r'\b',
    re.IGNORECASE
)

_APPT_TYPE_NORMALIZE = {
    'checkup': 'checkup', 'checkups': 'checkup',
    'vaccination': 'vaccination', 'vaccinations': 'vaccination',
    'surgery': 'surgery', 'surgeries': 'surgery',
    'emergency': 'emergency', 'emergencies': 'emergency',
    'consultation': 'consultation', 'consultations': 'consultation',
}


def _normalize_appointment_type(raw: str) -> str:
    key = raw.strip().lower()
    if key in _APPT_TYPE_NORMALIZE:
        return _APPT_TYPE_NORMALIZE[key]
    # "follow up" / "follow-up" / "follow ups" / "followup(s)" -> 'follow_up'
    if re.match(r'^follow[\s-]?ups?$', key):
        return 'follow_up'
    return re.sub(r'[\s-]+', '_', key)


def _first_group(match):
    """Returns the first non-None captured group from a regex match whose
    pattern has multiple alternative branches with separate groups (e.g.
    "X before Y" vs "Y before X" phrasing), or None if no match."""
    if not match:
        return None
    return next((g for g in match.groups() if g), None)


def _fmt_money(amount, decimals: int = 2) -> str:
    """Rs. formatting with thousands separators. Exact sums/balances (pulled
    straight from a DECIMAL(10,2) column) keep 2 decimals - that's real
    precision. An AVG() over a handful of bills should pass decimals=0
    instead: cents in an average of a small sample are false precision, not
    real ones."""
    return f'Rs. {float(amount):,.{decimals}f}'


def _fmt_date(d) -> str:
    """'05 January 2024' instead of a raw ISO date - matches the one
    handler (_last_vaccination_for_pet) that already formatted dates this
    way, so all structured answers render dates consistently."""
    return d.strftime('%d %B %Y') if hasattr(d, 'strftime') else str(d)


def _fmt_time(t) -> str:
    """'9:30 AM' instead of a raw datetime.time's default str() of
    '09:30:00'. Built from hour/minute directly rather than
    strftime('%I:%M %p') - %p is locale-dependent (driven by the process's
    LC_TIME) and some locales define no AM/PM marker at all, so it can
    silently return an empty string and drop AM/PM from an appointment time
    with nothing to indicate it happened. Also drops the leading zero
    strftime forces on the hour ('09:30 AM'), which isn't how a clinic
    schedule actually gets written."""
    if not hasattr(t, 'hour'):
        return str(t)
    hour_12 = t.hour % 12 or 12
    period = 'AM' if t.hour < 12 else 'PM'
    return f'{hour_12}:{t.minute:02d} {period}'


def _fmt_status(status: str) -> str:
    """'no_show' -> 'no show' - the same enum-to-prose normalization
    _count_appointments_by_status already does, applied everywhere else a
    raw appointments.status value lands in an answer string."""
    return status.replace('_', ' ') if status else status


def _summary_source(source_type: str, source_id: str, **metadata) -> list:
    """A single source representing a pure count/aggregate answer, instead
    of one chip per underlying row - the same fix applied to
    _sum_revenue_timeframe. A count answer ("there are 12 appointments this
    week") isn't "sourced" from any one row the way a listing is: none of
    those 12 rows is individually named in the answer text, so a chip per
    row is noise, not a citation - and it scales with real data volume (a
    month of appointments, a pet's full vaccination history), not with how
    much the answer actually says.

    Handlers that list individual items by name in their answer text (e.g.
    _list_appointments_timeframe, _customer_balance) do NOT use this - each
    item there is genuinely referenced in the prose, so a chip per item is
    a real citation, not noise.
    """
    return [{'source_type': source_type, 'source_id': source_id, 'metadata': metadata}]


def _self_pet_fallback(question: str, role: str, customer_id: str):
    """
    Nameless self-reference ("my pet"/"my dog"/"my cat"/etc, see
    SELF_PET_MENTION) fallback for role='pet_owner', called from
    find_pet_candidates() wherever it would otherwise give up and return
    (None, []) - both when no name was extracted at all, and when a
    permissive extraction produced a false positive later rejected as not a
    real name (e.g. "had" out of "...has my pet had?").

    Returns:
        ('your pet', rows) - same (pet_id, pet_name, customer_id,
            owner_first, owner_last) row shape as a real name match, if the
            question is a self-reference and the customer has at least one
            pet on file. 'your pet' is a placeholder, not an extracted name -
            callers only care about len(rows); the disambiguation message
            (rag_service.py) is built from the candidate pet_names
            (rows[i][1]), not this string.
        (None, []) - otherwise, so the caller falls through to normal
            unscoped retrieval exactly as it would have before this fallback
            existed.
    """
    if not (role == 'pet_owner' and customer_id and SELF_PET_MENTION.search(question)):
        return None, []

    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT p.pet_id, p.pet_name, p.customer_id, c.first_name, c.last_name
                FROM pets p
                JOIN customers c ON c.customer_id = p.customer_id
                WHERE p.customer_id = %s
                ORDER BY p.pet_name
            """, (customer_id,))
            rows = cur.fetchall()
    finally:
        conn.close()

    return ('your pet', rows) if rows else (None, [])


def find_pet_candidates(question: str, role: str, customer_id: str = None):
    """
    Name-extraction + SQL lookup shared by resolve_pet_id() and by
    rag_service.answer_question()'s ambiguity check. Unlike resolve_pet_id,
    this returns the full candidate row set (including owner name) rather
    than collapsing straight to a single pet_id or None - callers that need
    to tell "no pet mentioned" apart from "multiple pets matched, ask which
    one" (staff can share a pet name across many different owners) need to
    see who the candidates actually are.

    Returns:
        (pet_name, rows) - pet_name is the extracted name, or None if the
        question doesn't mention one at all (rows is then always []). rows
        is a list of (pet_id, pet_name, customer_id, owner_first, owner_last)
        tuples - possibly empty, possibly a single match, possibly several.
    """
    pet_name = (
        _first_non_stopword_match(PET_MENTION, question)
        or _first_non_stopword_match(PET_BY_MENTION, question)
        or _first_possessive_pet_name(question)
    )

    if not pet_name and role in STAFF_ROLES:
        pet_name = _bare_staff_pet_mention(question)

    if not pet_name:
        return _self_pet_fallback(question, role, customer_id)

    owner_match = OWNER_MENTION.search(question)
    owner_name = owner_match.group(1) if owner_match else None

    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            if role in STAFF_ROLES:
                if owner_name:
                    cur.execute("""
                        SELECT p.pet_id, p.pet_name, p.customer_id, c.first_name, c.last_name
                        FROM pets p
                        JOIN customers c ON c.customer_id = p.customer_id
                        WHERE p.pet_name ILIKE %s
                          AND (c.first_name || ' ' || c.last_name) ILIKE %s
                    """, (pet_name, f'%{owner_name}%'))
                else:
                    cur.execute("""
                        SELECT p.pet_id, p.pet_name, p.customer_id, c.first_name, c.last_name
                        FROM pets p
                        JOIN customers c ON c.customer_id = p.customer_id
                        WHERE p.pet_name ILIKE %s
                    """, (pet_name,))
            elif role == 'pet_owner' and customer_id:
                cur.execute("""
                    SELECT p.pet_id, p.pet_name, p.customer_id, c.first_name, c.last_name
                    FROM pets p
                    JOIN customers c ON c.customer_id = p.customer_id
                    WHERE p.pet_name ILIKE %s AND p.customer_id = %s
                """, (pet_name, customer_id))
            else:
                return pet_name, []

            rows = cur.fetchall()
    finally:
        conn.close()

    # A permissive extraction that matched nothing AND was never capitalized
    # is almost certainly not a name at all ("a pet emergency", "my pet after
    # surgery") - report it as "no pet mentioned" so the caller falls through
    # to normal retrieval instead of raising the hard "no pet named X" error.
    # Also try the self-reference fallback here, not just when extraction
    # found nothing at all: PET_MENTION's `pet\s+(\w+)` is greedy enough to
    # misfire on ordinary grammar, not just real names - "...has my pet
    # had?" extracts "had" as a bogus name, which would otherwise mask a
    # genuine "my pet" self-reference the exact same way a real rejected
    # guess would.
    if not rows and not _names_a_pet_explicitly(question, pet_name):
        return _self_pet_fallback(question, role, customer_id)

    return pet_name, rows


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
        (caller should fall back to normal unscoped retrieval - or, for
        rag_service.answer_question, check find_pet_candidates() itself to
        tell an ambiguous match apart from no name at all, and ask which
        pet is meant rather than guessing via unscoped retrieval).
    """
    pet_name, rows = find_pet_candidates(question, role, customer_id)

    if not pet_name:
        if role == 'pet_owner' and customer_id:
            return _match_customer_pet_by_name(question, customer_id)
        return None

    # Only resolve if unambiguous - if there are still multiple matches
    # (e.g. two "Max"s with no owner given, or owner name too vague),
    # fall back to normal retrieval rather than guessing which one.
    return rows[0][0] if len(rows) == 1 else None


def _clinical_detail_redirect() -> dict:
    """Returned instead of medical-record/disease-case detail for a staff
    role outside CLINICAL_STAFF_ROLES (i.e. receptionist) - explicit and
    immediate, rather than silently falling through to a RAG answer that
    would just look like a random "no information found"."""
    return {
        'answer': (
            "Medical record and diagnosis details aren't available through "
            "this assistant for your role - please check with a veterinarian "
            "or admin for clinical specifics."
        ),
        'sources': [],
        'chunks_used': 0,
        'structured': True
    }


def _billing_staff_redirect(subject: str) -> dict:
    """Returned instead of aggregate revenue data for a staff role outside
    BILLING_STAFF_ROLES (i.e. veterinarian) - same "explicit decline, not a
    confusing RAG fallthrough" convention as _clinical_detail_redirect,
    shared with chart_intent.py's chart path so a veterinarian gets the same
    wording whether they ask for revenue as a sentence or as a chart."""
    return {
        'answer': (
            f"I don't have access to share {subject} with your role - billing "
            "and revenue reporting is restricted to admin and receptionist. "
            "Please check with an admin or receptionist if you need it."
        ),
        'sources': [],
        'chunks_used': 0,
        'structured': True
    }


def try_structured_answer(question: str, role: str, customer_id: str = None, known_pet_id: str = None) -> dict:
    """
    Check if `question` matches a known structured-query pattern. If so,
    run an exact SQL query and return a grounded answer immediately.

    Args:
        known_pet_id: pass this when the caller has already resolved which
            pet is meant (e.g. rag_service.answer_question's second pass
            after a pet-disambiguation round-trip - see the comment there).
            When given, the pet-scoped block below uses it directly instead
            of re-extracting a name from `question` - this matters because
            on that round-trip `question` is the mechanical "pet X whose
            owner is Y" resolution phrase, which contains no pet name this
            module's own extraction patterns would find on a second call.

    Returns:
        dict (same shape as rag_service.answer_question's return) if matched,
        otherwise None (caller should fall back to normal RAG retrieval).
    """
    # Clinic hours/location/contact are public facts, available to every
    # role (including guest) - checked first since they're unambiguous and
    # never need pet/customer resolution.
    if CLINIC_HOURS.search(question):
        return _clinic_hours()
    if CLINIC_LOCATION.search(question):
        return _clinic_location()
    if CLINIC_CONTACT.search(question):
        return _clinic_contact()

    # Same reasoning as the clinic facts above - pure calendar arithmetic,
    # no pet/customer scoping needed, available to every role.
    match = BARE_RELATIVE_WEEKDAY.match(question.strip())
    if match:
        return _bare_relative_weekday_date(match.group(1), match.group(2))

    match = COUNT_PETS_BY_NAME.search(question)
    if match:
        return _count_pets_by_name(match.group(1), role, customer_id)

    # Counting how many pets a specific customer owns - staff-only, since a
    # pet_owner asking this about themselves would go through a different flow.
    match = COUNT_PETS_BY_CUSTOMER.search(question)
    if match and role in STAFF_ROLES:
        return _count_pets_by_customer(match.group(1))

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

    # For any query that might be about a specific pet (records, vaccinations,
    # next appointment, etc.), try to resolve the pet_id first. This is the
    # most specific action and should be prioritized over broader matches
    # like searching by customer name.
    is_pet_record_query = LIST_RECORDS_BY_PET.search(question)
    is_vaccine_query = _looks_like_vaccine_question(question)
    # Staff-only here: pet_owner's "next appointment" is handled by the
    # dedicated owner branch further down (implicitly their own pet, scoped
    # to customer_id - no name resolution needed the way staff's is).
    is_next_appointment_query = role in STAFF_ROLES and NEXT_APPOINTMENT_MENTION.search(question)

    if is_pet_record_query or is_vaccine_query or is_next_appointment_query:
        # Receptionist doesn't get medical-record detail (matches the
        # backend/UI block elsewhere) - vaccinations and appointments are
        # still fine, those fall through to the branches below unaffected.
        if is_pet_record_query and role == 'receptionist':
            return _clinical_detail_redirect()

        pet_id = known_pet_id or resolve_pet_id(question, role=role, customer_id=customer_id)
        if pet_id:
            # Now, check which type of query it was.
            if is_pet_record_query:
                return _list_records_by_pet(pet_id, role, customer_id)

            if is_vaccine_query:
                if VACCINATION_UP_TO_DATE.search(question):
                    return _vaccination_status_for_pet(pet_id, role, customer_id)
                if LAST_VACCINATION.search(question):
                    return _last_vaccination_for_pet(pet_id, role, customer_id)
                if LIST_VACCINATIONS.search(question):
                    return _list_vaccinations_for_pet(pet_id, role, customer_id)
                if COUNT_VACCINATIONS.search(question):
                    return _count_vaccinations_for_pet(pet_id, role, customer_id)
                # _looks_like_vaccine_question's broad \bvaccin\w*\b|\bshots?\b
                # gate is intentionally wider than these four specific
                # sub-patterns (e.g. "my pet's vaccine info", "vaccination
                # status", "details about my pet's vaccination" match the
                # gate but none of the four above). Without a default, those
                # questions fell all the way through this vaccine-specific
                # branch - past every other check below - to unscoped RAG
                # retrieval, which surfaces medical_record chunks alongside
                # vaccination ones and narrates both instead of answering
                # the vaccine question that was actually asked. Listing is
                # the safest default: it's the full vaccine picture rather
                # than a guess at count/last/status.
                return _list_vaccinations_for_pet(pet_id, role, customer_id)

            if is_next_appointment_query:
                return _next_appointment_for_pet(pet_id)

    # Check for listing all records for a customer's pets (less specific, so it runs after pet resolution)
    match = LIST_RECORDS_BY_CUSTOMER.search(question)
    if match and role == 'receptionist':
        return _clinical_detail_redirect()
    if match and role in CLINICAL_STAFF_ROLES:
        return _list_records_by_customer(match.group(1))

    # --- Inventory (staff-only: operational data) ---
    if role in STAFF_ROLES:
        if INVENTORY_OUT_OF_STOCK.search(question):
            return _count_inventory_out_of_stock()
        if INVENTORY_LOW_STOCK.search(question):
            return _count_inventory_low_stock()
        match = INVENTORY_EXPIRING.search(question)
        if match:
            days = int(match.group(1)) if match.group(1) else 90
            return _list_inventory_expiring(days)

    # --- Appointments (staff-only) ---
    # Checked most-specific-first: a name or explicit status narrows the
    # question more than a bare timeframe, so those are tried before falling
    # back to the generic "how many appointments <timeframe>" pattern.
    if role in STAFF_ROLES:
        # Most specific first: a bare day-of-month ("on the 31st") should
        # never get swallowed into a whole-month/week listing further down.
        match = APPT_SPECIFIC_DAY.search(question)
        if match:
            day = int(match.group(1))
            month_qualifier = match.group(2) or match.group(3)
            target_date = _resolve_specific_day(day, month_qualifier)
            if target_date:
                return _list_appointments_on_date(target_date)

        match = APPT_RELATIVE_WEEKDAY.search(question)
        if match:
            target_date = _resolve_relative_weekday(match.group(1), match.group(2))
            return _list_appointments_on_date(target_date)

        match = APPT_COUNT_BY_VET.search(question)
        if match:
            return _count_appointments_by_vet(match.group(1))

        match = APPT_COUNT_NO_SHOW.search(question)
        if match:
            return _count_no_shows(match.group(1))

        match = APPT_COUNT_BY_STATUS.search(question)
        if match:
            return _count_appointments_by_status(match.group(1))

        match = APPT_COUNT_TIMEFRAME.search(question)
        if match:
            return _count_appointments_timeframe(match.group(1))

        match = LIST_APPOINTMENTS_TIMEFRAME.search(question)
        if match:
            return _list_appointments_timeframe(match.group(1))

        # Last resort: the question mentions appointments but named a date
        # in a shape none of the regexes above cover (e.g. "July 31st,
        # 2026", "next Friday"). Rather than fall through to RAG - which
        # has zero appointment data and will confidently hallucinate a
        # wrong "no appointments" answer - ask the LLM to normalize
        # whatever date is in the question, then look it up for real.
        if re.search(r'\bappointments?\b', question, re.IGNORECASE):
            extracted_date = _extract_date_via_llm(question)
            if extracted_date:
                return _list_appointments_on_date(extracted_date)

    # --- Appointments (pet owner: own appointments only) ---
    elif role == 'pet_owner' and customer_id:
        # Timeframe checked BEFORE next-appointment: "do I have an
        # appointment tomorrow?" matches NEXT_APPOINTMENT_MENTION's bare
        # "do i have ... appointment" alternative too, and next-appointment
        # ignores the "tomorrow" word entirely - it would answer with the
        # owner's overall next appointment (possibly weeks away) instead of
        # a yes/no about tomorrow specifically. A named timeframe is always
        # the more specific question, so it wins.
        match = OWNER_APPOINTMENTS_TIMEFRAME.search(question)
        timeframe = _first_group(match)
        if timeframe:
            return _owner_appointments_timeframe(customer_id, timeframe)

        if NEXT_APPOINTMENT_MENTION.search(question):
            # If a specific pet is named ("when is Max's next
            # appointment"), narrow to just that pet - resolve_pet_id is
            # already bounded to this owner's own pets, so no cross-owner
            # ambiguity risk here.
            resolved_pet_id = resolve_pet_id(question, role=role, customer_id=customer_id)
            return _owner_next_appointment(customer_id, pet_id=resolved_pet_id)

    # --- Disease cases (clinical staff only - receptionist is fully
    # blocked from disease-case data in the regular app too, see
    # roleCheck.js's vetOrAdmin on diseaseCaseRoutes.js) ---
    if role == 'receptionist' and (
        DISEASE_COUNT_CONTAGIOUS.search(question)
        or DISEASE_COUNT_BY_CATEGORY.search(question)
        or DISEASE_COUNT_BY_SEVERITY.search(question)
    ):
        return _clinical_detail_redirect()

    if role in CLINICAL_STAFF_ROLES:
        if DISEASE_COUNT_CONTAGIOUS.search(question):
            return _count_disease_cases_contagious()

        match = DISEASE_COUNT_BY_CATEGORY.search(question)
        category = _first_group(match)
        if category:
            return _count_disease_cases_by_category(category)

        match = DISEASE_COUNT_BY_SEVERITY.search(question)
        severity = _first_group(match)
        if severity:
            return _count_disease_cases_by_severity(severity)

    # --- Billing (staff-only: financial data) ---
    if role in STAFF_ROLES:
        if BILLING_COUNT_UNPAID.search(question):
            return _count_unpaid_bills()

        match = BILLING_COUNT_BY_METHOD.search(question)
        if match:
            return _count_bills_by_payment_method(match.group(1))

        match = BILLING_REVENUE_TIMEFRAME.search(question)
        timeframe = _first_group(match)
        if timeframe:
            if role not in BILLING_STAFF_ROLES:
                return _billing_staff_redirect('revenue data')
            return _sum_revenue_timeframe(timeframe)

        # Pricing estimate is checked before the per-customer patterns below
        # since it never names a customer - no ambiguity to resolve there.
        match = BILLING_PRICE_ESTIMATE.search(question)
        appt_type_raw = _first_group(match)
        if appt_type_raw:
            return _estimate_price_by_appointment_type(_normalize_appointment_type(appt_type_raw))

        match = BILLING_PAYMENT_STATUS_BY_CUSTOMER.search(question)
        customer_name = _first_group(match)
        if customer_name:
            return _customer_payment_status(customer_name)

        match = BILLING_BALANCE_BY_CUSTOMER.search(question)
        customer_name = _first_group(match)
        if customer_name:
            return _customer_balance(customer_name)

    # --- Billing (pet owner: own bills only) ---
    elif role == 'pet_owner' and customer_id:
        if OWNER_PAYMENT_STATUS.search(question):
            return _owner_payment_status(customer_id)
        if OWNER_BALANCE.search(question):
            return _owner_balance(customer_id)

    return None


_CLINIC_SETTING_KEYS = [
    'clinic_name', 'clinic_address', 'clinic_phone', 'clinic_mobile', 'clinic_email',
    'clinic_website', 'business_hours_start', 'business_hours_end', 'working_days'
]


def _get_clinic_settings() -> dict:
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT setting_key, setting_value FROM system_settings WHERE setting_key = ANY(%s)",
                (_CLINIC_SETTING_KEYS,)
            )
            return dict(cur.fetchall())
    finally:
        conn.close()


def _clinic_hours() -> dict:
    # Deliberately doesn't mention lunch_break_start/end even though it's in
    # _CLINIC_SETTING_KEYS - server/src/utils/appointmentRules.js (the code
    # that actually enforces bookable slots) has no lunch-break concept at
    # all, so stating "closed for lunch" here would be the exact bug this
    # function exists to avoid: telling a customer something the booking
    # flow doesn't actually honor. Also see the business_hours_start/end
    # comments in database/seed.sql for the more direct version of that bug
    # (08:00-18:00 seeded vs. the real 09:00-18:30 enforced).
    settings = _get_clinic_settings()
    if not settings.get('business_hours_start') or not settings.get('business_hours_end'):
        return {
            'answer': "I don't have the clinic's business hours on file - please check with the clinic directly.",
            'sources': [], 'chunks_used': 0, 'structured': True
        }

    clinic_name = settings.get('clinic_name', 'The clinic')
    days = settings.get('working_days', '').replace(',', ', ')
    answer = f"{clinic_name} is open"
    if days:
        answer += f" {days}"
    answer += f", {settings['business_hours_start']} to {settings['business_hours_end']}."

    return {
        'answer': answer,
        'sources': [{'source_type': 'clinic_settings', 'source_id': 'business_hours', 'metadata': {}}],
        'chunks_used': 0,
        'structured': True
    }


def _clinic_location() -> dict:
    settings = _get_clinic_settings()
    if not settings.get('clinic_address'):
        return {
            'answer': "I don't have the clinic's address on file - please check with the clinic directly.",
            'sources': [], 'chunks_used': 0, 'structured': True
        }

    clinic_name = settings.get('clinic_name', 'The clinic')
    answer = f"{clinic_name} is located at {settings['clinic_address']}."

    return {
        'answer': answer,
        'sources': [{'source_type': 'clinic_settings', 'source_id': 'clinic_address', 'metadata': {}}],
        'chunks_used': 0,
        'structured': True
    }


def _clinic_contact() -> dict:
    settings = _get_clinic_settings()
    parts = []
    if settings.get('clinic_phone'):
        parts.append(f"phone {settings['clinic_phone']}")
    if settings.get('clinic_mobile'):
        parts.append(f"mobile {settings['clinic_mobile']}")
    if settings.get('clinic_email'):
        parts.append(f"email {settings['clinic_email']}")
    if settings.get('clinic_website'):
        parts.append(f"website {settings['clinic_website']}")

    if not parts:
        return {
            'answer': "I don't have the clinic's contact details on file - please check with the clinic directly.",
            'sources': [], 'chunks_used': 0, 'structured': True
        }

    clinic_name = settings.get('clinic_name', 'the clinic')
    answer = f"You can reach {clinic_name} at " + ', '.join(parts) + '.'

    return {
        'answer': answer,
        'sources': [{'source_type': 'clinic_settings', 'source_id': 'clinic_contact', 'metadata': {}}],
        'chunks_used': 0,
        'structured': True
    }


def _looks_like_vaccine_question(question: str) -> bool:
    # "shots" is the common everyday word staff/owners actually type for
    # vaccines ("is Max up to date with shots?") - without it, this whole
    # class of question skips the exact-SQL vaccine handlers entirely and
    # falls through to unscoped RAG. The \bvaccin\w*\b prefix match (rather
    # than spelling out vaccines?/vaccinations?) is deliberately broad
    # enough to also catch the verb form ("when was Max last vaccinated?")
    # that the noun-only forms used to miss, silently skipping this same
    # dispatch block for a question that's just as clearly about vaccines.
    return bool(re.search(r'\bvaccin\w*\b|\bshots?\b', question, re.IGNORECASE))


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
        listing = '\n- '.join(
            f"{r[1]} ({r[2]}{', ' + r[3] if r[3] else ''})" for r in rows
        )
        answer = f'There are {count} pets named "{name}":\n- {listing}'

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

        # Every appointment answer refers to veterinarians as "Dr. First
        # Last" - match that here so the same person isn't named two
        # different ways depending on which handler answered.
        name_prefix = 'Dr. ' if role_to_count == 'veterinarian' else ''

        parts = []
        if active_staff:
            active_count = len(active_staff)
            active_listing = '\n- '.join(f'{name_prefix}{r[1]} {r[2]}' for r in active_staff)
            parts.append(
                f'There {"is" if active_count == 1 else "are"} {active_count} active '
                f'{role_to_count}{"s" if active_count != 1 else ""}:\n- {active_listing}'
            )
        if inactive_staff:
            inactive_count = len(inactive_staff)
            inactive_listing = '\n- '.join(f'{name_prefix}{r[1]} {r[2]}' for r in inactive_staff)
            parts.append(
                f'There {"is" if inactive_count == 1 else "are"} also {inactive_count} inactive '
                f'{role_to_count}{"s" if inactive_count != 1 else ""} on record:\n- {inactive_listing}'
            )
        answer = '\n\n'.join(parts)

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
    items = [f'{r[1]} ({_fmt_date(r[2])}): {r[3]}' for r in record_rows]
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


def _count_pets_by_customer(customer_name: str) -> dict:
    """Counts pets owned by a given customer, by exact SQL lookup."""
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

            # Fetch that customer's pets
            cur.execute(
                "SELECT pet_id, pet_name, species, breed FROM pets WHERE customer_id = %s",
                (customer_id,)
            )
            pet_rows = cur.fetchall()

    finally:
        conn.close()

    count = len(pet_rows)
    if count == 0:
        answer = f'Customer {full_name} has no pets on record.'
    else:
        listing = '\n- '.join(
            f"{r[1]} ({r[2]}{', ' + r[3] if r[3] else ''})" for r in pet_rows
        )
        answer = f'Customer {full_name} has {count} pet{"s" if count != 1 else ""}:\n- {listing}'

    return {
        'answer': answer,
        'sources': [{
            'source_type': 'pet',
            'source_id': r[0],
            'metadata': {'pet_name': r[1]}
        } for r in pet_rows],
        'chunks_used': 0,
        'structured': True
    }


# ============================================================
# Inventory
# ============================================================

def _count_inventory_low_stock() -> dict:
    """Items with stock remaining but at or below their reorder level."""
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT item_id, item_name, quantity, reorder_level
                FROM inventory
                WHERE quantity > 0 AND quantity <= reorder_level AND is_active = true
                ORDER BY item_name
                """
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    count = len(rows)
    if count == 0:
        answer = 'No items are currently low on stock.'
    else:
        listing = '\n- '.join(f'{r[1]} ({r[2]} left, reorder at {r[3]})' for r in rows)
        answer = f'{count} item{"s" if count != 1 else ""} {"is" if count == 1 else "are"} low on stock:\n- {listing}'

    return {
        'answer': answer,
        'sources': [{'source_type': 'inventory', 'source_id': r[0], 'metadata': {'item_name': r[1]}} for r in rows],
        'chunks_used': 0,
        'structured': True
    }


def _count_inventory_out_of_stock() -> dict:
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT item_id, item_name
                FROM inventory
                WHERE quantity = 0 AND is_active = true
                ORDER BY item_name
                """
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    count = len(rows)
    if count == 0:
        answer = 'No items are currently out of stock.'
    else:
        listing = '\n- '.join(r[1] for r in rows)
        answer = f'{count} item{"s" if count != 1 else ""} {"is" if count == 1 else "are"} out of stock:\n- {listing}'

    return {
        'answer': answer,
        'sources': [{'source_type': 'inventory', 'source_id': r[0], 'metadata': {'item_name': r[1]}} for r in rows],
        'chunks_used': 0,
        'structured': True
    }


def _list_inventory_expiring(days: int = 90) -> dict:
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT item_id, item_name, expiry_date, quantity
                FROM inventory
                WHERE expiry_date IS NOT NULL
                  AND expiry_date >= CURRENT_DATE
                  AND expiry_date <= CURRENT_DATE + (%s || ' days')::interval
                  AND quantity > 0
                  AND is_active = true
                ORDER BY expiry_date ASC
                """,
                (days,)
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    count = len(rows)
    if count == 0:
        answer = f'No items are expiring within the next {days} days.'
    else:
        listing = '\n- '.join(f'{r[1]} (expires {_fmt_date(r[2])}, {r[3]} left)' for r in rows)
        answer = f'{count} item{"s" if count != 1 else ""} expiring within the next {days} days:\n- {listing}'

    return {
        'answer': answer,
        'sources': [
            {'source_type': 'inventory', 'source_id': r[0], 'metadata': {'item_name': r[1], 'expiry_date': str(r[2])}}
            for r in rows
        ],
        'chunks_used': 0,
        'structured': True
    }


# ============================================================
# Appointments
# ============================================================

def _count_appointments_timeframe(timeframe: str) -> dict:
    start, end = _resolve_timeframe(timeframe)
    if start is None:
        return {'answer': f'I could not resolve the timeframe "{timeframe}".', 'sources': [], 'chunks_used': 0, 'structured': True}

    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT appointment_id, status FROM appointments WHERE appointment_date BETWEEN %s AND %s",
                (start, end)
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    count = len(rows)
    answer = f'There {"is" if count == 1 else "are"} {count} appointment{"s" if count != 1 else ""} {_normalize_timeframe(timeframe)}.'

    return {
        'answer': answer,
        'sources': _summary_source(
            'appointment_summary', f'appointments_{start.isoformat()}_{end.isoformat()}',
            start_date=str(start), end_date=str(end), count=count
        ),
        'chunks_used': 0,
        'structured': True
    }


def _list_appointments_timeframe(timeframe: str) -> dict:
    """Listing counterpart to _count_appointments_timeframe - "what
    appointments do we have this week" needs the actual bookings, not just
    a number."""
    start, end = _resolve_timeframe(timeframe)
    if start is None:
        return {'answer': f'I could not resolve the timeframe "{timeframe}".', 'sources': [], 'chunks_used': 0, 'structured': True}

    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT a.appointment_id, a.appointment_date, a.appointment_time, a.status,
                       a.reason, p.pet_name, c.first_name, c.last_name,
                       u.first_name, u.last_name
                FROM appointments a
                JOIN pets p ON p.pet_id = a.pet_id
                JOIN customers c ON c.customer_id = a.customer_id
                LEFT JOIN users u ON u.user_id = a.veterinarian_id
                WHERE a.appointment_date BETWEEN %s AND %s
                ORDER BY a.appointment_date, a.appointment_time
            """, (start, end))
            rows = cur.fetchall()
    finally:
        conn.close()

    if not rows:
        return {
            'answer': f'There are no appointments {_normalize_timeframe(timeframe)}.',
            'sources': [],
            'chunks_used': 0,
            'structured': True
        }

    items = []
    sources = []
    for appt_id, appt_date, appt_time, status, reason, pet_name, cust_first, cust_last, vet_first, vet_last in rows:
        vet_str = f' with Dr. {vet_first} {vet_last}' if vet_first else ''
        items.append(
            f'{_fmt_date(appt_date)} {_fmt_time(appt_time)} - {pet_name} ({cust_first} {cust_last}){vet_str}, '
            f'{_fmt_status(status)} - {reason}'
        )
        sources.append({
            'source_type': 'appointment',
            'source_id': appt_id,
            'metadata': {'appointment_date': str(appt_date), 'status': status}
        })

    count = len(rows)
    listing = '\n- '.join(items)
    answer = (
        f'There {"is" if count == 1 else "are"} {count} appointment{"s" if count != 1 else ""} '
        f'{_normalize_timeframe(timeframe)}:\n- {listing}'
    )

    return {
        'answer': answer,
        'sources': sources,
        'chunks_used': 0,
        'structured': True
    }


def _list_appointments_on_date(target_date: date) -> dict:
    """Same shape as _list_appointments_timeframe, but for one specific
    calendar date rather than a whole week/month range - "what's the
    appointment on the 31st" shouldn't return the entire month."""
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT a.appointment_id, a.appointment_date, a.appointment_time, a.status,
                       a.reason, p.pet_name, c.first_name, c.last_name,
                       u.first_name, u.last_name
                FROM appointments a
                JOIN pets p ON p.pet_id = a.pet_id
                JOIN customers c ON c.customer_id = a.customer_id
                LEFT JOIN users u ON u.user_id = a.veterinarian_id
                WHERE a.appointment_date = %s
                ORDER BY a.appointment_time
            """, (target_date,))
            rows = cur.fetchall()
    finally:
        conn.close()

    date_str = target_date.strftime('%B %d, %Y')

    if not rows:
        return {
            'answer': f'There are no appointments on {date_str}.',
            'sources': [],
            'chunks_used': 0,
            'structured': True
        }

    items = []
    sources = []
    for appt_id, appt_date, appt_time, status, reason, pet_name, cust_first, cust_last, vet_first, vet_last in rows:
        vet_str = f' with Dr. {vet_first} {vet_last}' if vet_first else ''
        items.append(f'{_fmt_time(appt_time)} - {pet_name} ({cust_first} {cust_last}){vet_str}, {_fmt_status(status)} - {reason}')
        sources.append({
            'source_type': 'appointment',
            'source_id': appt_id,
            'metadata': {'appointment_date': str(appt_date), 'status': status}
        })

    count = len(rows)
    listing = '\n- '.join(items)
    answer = (
        f'There {"is" if count == 1 else "are"} {count} appointment{"s" if count != 1 else ""} '
        f'on {date_str}:\n- {listing}'
    )

    return {
        'answer': answer,
        'sources': sources,
        'chunks_used': 0,
        'structured': True
    }


def _next_appointment_for_pet(pet_id: str) -> dict:
    """Staff-facing "when is <pet>'s next appointment" - clinic-wide (no
    customer_id scoping, unlike _owner_next_appointment below), for a pet
    already resolved to a single pet_id by resolve_pet_id() or, after a
    disambiguation round-trip, passed in as try_structured_answer's
    known_pet_id. Includes the owner's name in the answer since staff (unlike
    an owner asking about their own pet) need that context to confirm they
    have the right animal."""
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT a.appointment_id, a.appointment_date, a.appointment_time, a.status,
                       a.reason, p.pet_name, c.first_name, c.last_name, u.first_name, u.last_name
                FROM appointments a
                JOIN pets p ON p.pet_id = a.pet_id
                JOIN customers c ON c.customer_id = a.customer_id
                LEFT JOIN users u ON u.user_id = a.veterinarian_id
                WHERE a.pet_id = %s
                  AND a.appointment_date >= CURRENT_DATE
                  AND a.status NOT IN ('cancelled', 'completed', 'no_show')
                ORDER BY a.appointment_date, a.appointment_time
                LIMIT 5
            """, (pet_id,))
            rows = cur.fetchall()
    finally:
        conn.close()

    if not rows:
        return {
            'answer': 'There are no upcoming appointments on file for this pet.',
            'sources': [],
            'chunks_used': 0,
            'structured': True
        }

    appt_id, appt_date, appt_time, status, reason, pet_name, cust_first, cust_last, vet_first, vet_last = rows[0]
    vet_str = f' with Dr. {vet_first} {vet_last}' if vet_first else ''
    answer = (
        f"{pet_name}'s next appointment is on {_fmt_date(appt_date)} at {_fmt_time(appt_time)}{vet_str} "
        f"({_fmt_status(status)}) - {reason}. Owner: {cust_first} {cust_last}."
    )

    if len(rows) > 1:
        more = '\n- '.join(
            f'{_fmt_date(r[1])} {_fmt_time(r[2])}' + (f' with Dr. {r[8]} {r[9]}' if r[8] else '') + f' ({_fmt_status(r[3])}) - {r[4]}'
            for r in rows[1:]
        )
        answer += f'\n\nOther upcoming appointments:\n- {more}'

    return {
        'answer': answer,
        'sources': [{'source_type': 'appointment', 'source_id': r[0], 'metadata': {'status': r[3]}} for r in rows],
        'chunks_used': 0,
        'structured': True
    }


def _owner_next_appointment(customer_id: str, pet_id: str = None) -> dict:
    """The pet-owner-facing "when is my/Max's next appointment" lookup -
    scoped to customer_id directly (already authenticated), never a name
    lookup like the staff equivalents above."""
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            query = """
                SELECT a.appointment_id, a.appointment_date, a.appointment_time, a.status,
                       a.reason, p.pet_name, u.first_name, u.last_name
                FROM appointments a
                JOIN pets p ON p.pet_id = a.pet_id
                LEFT JOIN users u ON u.user_id = a.veterinarian_id
                WHERE a.customer_id = %s
                  AND a.appointment_date >= CURRENT_DATE
                  AND a.status NOT IN ('cancelled', 'completed', 'no_show')
            """
            params = [customer_id]
            if pet_id:
                query += " AND a.pet_id = %s"
                params.append(pet_id)
            query += " ORDER BY a.appointment_date, a.appointment_time LIMIT 5"

            cur.execute(query, tuple(params))
            rows = cur.fetchall()
    finally:
        conn.close()

    if not rows:
        return {
            'answer': 'You have no upcoming appointments scheduled.',
            'sources': [],
            'chunks_used': 0,
            'structured': True
        }

    appt_id, appt_date, appt_time, status, reason, pet_name, vet_first, vet_last = rows[0]
    vet_str = f' with Dr. {vet_first} {vet_last}' if vet_first else ''
    answer = f'Your next appointment is on {_fmt_date(appt_date)} at {_fmt_time(appt_time)} for {pet_name}{vet_str} ({_fmt_status(status)}) - {reason}.'

    if len(rows) > 1:
        more = '\n- '.join(
            f'{_fmt_date(r[1])} {_fmt_time(r[2])} - {r[5]}' + (f' with Dr. {r[6]} {r[7]}' if r[6] else '') + f' ({_fmt_status(r[3])}) - {r[4]}'
            for r in rows[1:]
        )
        answer += f'\n\nOther upcoming appointments:\n- {more}'

    return {
        'answer': answer,
        'sources': [{'source_type': 'appointment', 'source_id': r[0], 'metadata': {'status': r[3]}} for r in rows],
        'chunks_used': 0,
        'structured': True
    }


def _owner_appointments_timeframe(customer_id: str, timeframe: str) -> dict:
    """Listing counterpart to _owner_next_appointment for "what appointments
    do I have this week" style questions - same scoping (customer_id, no
    name lookup) as _owner_next_appointment above."""
    start, end = _resolve_timeframe(timeframe)
    if start is None:
        return {'answer': f'I could not resolve the timeframe "{timeframe}".', 'sources': [], 'chunks_used': 0, 'structured': True}

    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT a.appointment_id, a.appointment_date, a.appointment_time, a.status,
                       a.reason, p.pet_name, u.first_name, u.last_name
                FROM appointments a
                JOIN pets p ON p.pet_id = a.pet_id
                LEFT JOIN users u ON u.user_id = a.veterinarian_id
                WHERE a.customer_id = %s AND a.appointment_date BETWEEN %s AND %s
                ORDER BY a.appointment_date, a.appointment_time
            """, (customer_id, start, end))
            rows = cur.fetchall()
    finally:
        conn.close()

    if not rows:
        return {
            'answer': f'You have no appointments {_normalize_timeframe(timeframe)}.',
            'sources': [],
            'chunks_used': 0,
            'structured': True
        }

    items = []
    sources = []
    for appt_id, appt_date, appt_time, status, reason, pet_name, vet_first, vet_last in rows:
        vet_str = f' with Dr. {vet_first} {vet_last}' if vet_first else ''
        items.append(f'{_fmt_date(appt_date)} {_fmt_time(appt_time)} - {pet_name}{vet_str}, {_fmt_status(status)} - {reason}')
        sources.append({'source_type': 'appointment', 'source_id': appt_id, 'metadata': {'status': status}})

    count = len(rows)
    listing = '\n- '.join(items)
    answer = (
        f'You have {count} appointment{"s" if count != 1 else ""} '
        f'{_normalize_timeframe(timeframe)}:\n- {listing}'
    )

    return {
        'answer': answer,
        'sources': sources,
        'chunks_used': 0,
        'structured': True
    }


def _count_no_shows(timeframe: str = None) -> dict:
    start = end = None
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            if timeframe:
                start, end = _resolve_timeframe(timeframe)
                if start is None:
                    return {'answer': f'I could not resolve the timeframe "{timeframe}".', 'sources': [], 'chunks_used': 0, 'structured': True}
                cur.execute(
                    "SELECT appointment_id FROM appointments WHERE status = 'no_show' AND appointment_date BETWEEN %s AND %s",
                    (start, end)
                )
            else:
                cur.execute("SELECT appointment_id FROM appointments WHERE status = 'no_show'")
            rows = cur.fetchall()
    finally:
        conn.close()

    count = len(rows)
    suffix = f' {_normalize_timeframe(timeframe)}' if timeframe else ''
    answer = f'There {"was" if count == 1 else "were"} {count} no-show{"s" if count != 1 else ""}{suffix}.'

    source_id = f'no_shows_{start.isoformat()}_{end.isoformat()}' if start else 'no_shows_all_time'
    return {
        'answer': answer,
        'sources': _summary_source('appointment_summary', source_id, count=count, timeframe=timeframe),
        'chunks_used': 0,
        'structured': True
    }


def _count_appointments_by_vet(vet_name: str) -> dict:
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT user_id, first_name, last_name
                FROM users
                WHERE role = 'veterinarian' AND (first_name || ' ' || last_name) ILIKE %s
                """,
                (f'%{vet_name}%',)
            )
            vet_rows = cur.fetchall()

            if not vet_rows:
                return {'answer': f'No veterinarian found matching "{vet_name}".', 'sources': [], 'chunks_used': 0, 'structured': True}
            if len(vet_rows) > 1:
                return {'answer': f'Found multiple veterinarians matching "{vet_name}". Please be more specific.', 'sources': [], 'chunks_used': 0, 'structured': True}

            vet_id, first_name, last_name = vet_rows[0]
            full_name = f'{first_name} {last_name}'

            cur.execute(
                "SELECT appointment_id, status FROM appointments WHERE veterinarian_id = %s",
                (vet_id,)
            )
            appt_rows = cur.fetchall()
    finally:
        conn.close()

    count = len(appt_rows)
    answer = f'Dr. {full_name} has {count} appointment{"s" if count != 1 else ""} on record.'

    return {
        'answer': answer,
        'sources': _summary_source('appointment_summary', f'appointments_by_vet_{vet_id}', vet_name=full_name, count=count),
        'chunks_used': 0,
        'structured': True
    }


def _count_appointments_by_status(status_raw: str) -> dict:
    status = re.sub(r'[\s-]+', '_', status_raw.strip().lower())
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT appointment_id FROM appointments WHERE status = %s", (status,))
            rows = cur.fetchall()
    finally:
        conn.close()

    count = len(rows)
    status_display = status.replace('_', ' ')
    answer = f'There {"is" if count == 1 else "are"} {count} appointment{"s" if count != 1 else ""} with status "{status_display}".'

    return {
        'answer': answer,
        'sources': _summary_source('appointment_summary', f'appointments_status_{status}', status=status, count=count),
        'chunks_used': 0,
        'structured': True
    }


# ============================================================
# Disease cases
# ============================================================

def _count_disease_cases_contagious() -> dict:
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT case_id, disease_name FROM disease_cases WHERE is_contagious = true")
            rows = cur.fetchall()
    finally:
        conn.close()

    count = len(rows)
    answer = f'There {"is" if count == 1 else "are"} {count} contagious disease case{"s" if count != 1 else ""} on record.'

    return {
        'answer': answer,
        'sources': _summary_source('disease_case_summary', 'disease_cases_contagious', count=count),
        'chunks_used': 0,
        'structured': True
    }


def _count_disease_cases_by_category(category_raw: str) -> dict:
    category = re.sub(r'[\s-]+', '_', category_raw.strip().lower())
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT case_id, disease_name FROM disease_cases WHERE disease_category = %s", (category,))
            rows = cur.fetchall()
    finally:
        conn.close()

    count = len(rows)
    answer = f'There {"is" if count == 1 else "are"} {count} {category.replace("_", " ")} disease case{"s" if count != 1 else ""} on record.'

    return {
        'answer': answer,
        'sources': _summary_source('disease_case_summary', f'disease_cases_category_{category}', category=category, count=count),
        'chunks_used': 0,
        'structured': True
    }


def _count_disease_cases_by_severity(severity_raw: str) -> dict:
    severity = severity_raw.strip().lower()
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT case_id, disease_name FROM disease_cases WHERE severity = %s", (severity,))
            rows = cur.fetchall()
    finally:
        conn.close()

    count = len(rows)
    answer = f'There {"is" if count == 1 else "are"} {count} {severity} disease case{"s" if count != 1 else ""} on record.'

    return {
        'answer': answer,
        'sources': _summary_source('disease_case_summary', f'disease_cases_severity_{severity}', severity=severity, count=count),
        'chunks_used': 0,
        'structured': True
    }


# ============================================================
# Billing
# ============================================================

def _count_unpaid_bills() -> dict:
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT bill_id, bill_number, balance_amount FROM billing "
                "WHERE payment_status IN ('unpaid', 'partially_paid', 'overdue')"
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    count = len(rows)
    if count == 0:
        answer = 'There are no outstanding bills.'
    else:
        total_outstanding = sum(r[2] for r in rows)
        # "unpaid" is only one of the three statuses this query covers - a
        # partially-paid bill has money on it already, so calling it
        # "unpaid" is wrong, not just imprecise.
        answer = (
            f'There {"is" if count == 1 else "are"} {count} outstanding bill{"s" if count != 1 else ""} '
            f'(unpaid, partially paid, or overdue), totaling {_fmt_money(total_outstanding)}.'
        )

    return {
        'answer': answer,
        'sources': _summary_source('billing_summary', 'unpaid_bills', count=count),
        'chunks_used': 0,
        'structured': True
    }


def _sum_revenue_timeframe(timeframe: str) -> dict:
    start, end = _resolve_timeframe(timeframe)
    if start is None:
        return {'answer': f'I could not resolve the timeframe "{timeframe}".', 'sources': [], 'chunks_used': 0, 'structured': True}

    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT bill_id, paid_amount FROM billing WHERE bill_date BETWEEN %s AND %s",
                (start, end)
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    total = sum(r[1] for r in rows) if rows else 0
    # "across N bills" must count bills that actually contributed money, not
    # every bill in the date range - a bill with paid_amount = 0 didn't add
    # to the total, so counting it here would overstate how many bills the
    # revenue figure came from.
    contributing = [r for r in rows if r[1] and float(r[1]) > 0]
    answer = (
        f'Total revenue collected {_normalize_timeframe(timeframe)} is {_fmt_money(total)} '
        f'across {len(contributing)} bill{"s" if len(contributing) != 1 else ""} with a payment recorded.'
    )

    return {
        'answer': answer,
        'sources': _summary_source(
            'billing_summary', f'revenue_{start.isoformat()}_{end.isoformat()}',
            start_date=str(start), end_date=str(end), bill_count=len(contributing)
        ),
        'chunks_used': 0,
        'structured': True
    }


def _count_bills_by_payment_method(method_raw: str) -> dict:
    method = re.sub(r'[\s-]+', '_', method_raw.strip().lower())
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT bill_id, bill_number FROM billing WHERE payment_method = %s", (method,))
            rows = cur.fetchall()
    finally:
        conn.close()

    count = len(rows)
    answer = f'{count} bill{"s" if count != 1 else ""} {"was" if count == 1 else "were"} paid via {method.replace("_", " ")}.'

    return {
        'answer': answer,
        'sources': _summary_source('billing_summary', f'bills_method_{method}', payment_method=method, count=count),
        'chunks_used': 0,
        'structured': True
    }


def _find_customer_by_name(cur, customer_name: str):
    """Shared customer-name lookup used by the billing handlers below - same
    ambiguous/not-found handling as _count_pets_by_customer (line 890) so a
    vague or multi-match name gets a clear "be more specific" answer instead
    of silently picking one."""
    cur.execute(
        """
        SELECT customer_id, first_name, last_name
        FROM customers
        WHERE (first_name || ' ' || last_name) ILIKE %s
        """,
        (f'%{customer_name}%',)
    )
    return cur.fetchall()


def _customer_balance(customer_name: str) -> dict:
    """Total outstanding balance across all of a customer's bills - the
    receptionist-facing "what does this customer owe" lookup."""
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            customer_rows = _find_customer_by_name(cur, customer_name)
            if not customer_rows:
                return {'answer': f'No customer found matching the name "{customer_name}".', 'sources': [], 'chunks_used': 0, 'structured': True}
            if len(customer_rows) > 1:
                return {'answer': f'Found multiple customers matching "{customer_name}". Please be more specific.', 'sources': [], 'chunks_used': 0, 'structured': True}

            customer_id, first_name, last_name = customer_rows[0]
            full_name = f'{first_name} {last_name}'

            # payment_status is one of unpaid/partially_paid/fully_paid/
            # overdue/refunded (schema.sql) - excluding only 'fully_paid'
            # would also list refunded bills as still owed, which is wrong:
            # a refund means the customer no longer owes that amount.
            cur.execute(
                """
                SELECT bill_id, bill_number, balance_amount, due_date
                FROM billing
                WHERE customer_id = %s AND payment_status IN ('unpaid', 'partially_paid', 'overdue')
                ORDER BY due_date ASC NULLS LAST
                """,
                (customer_id,)
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    if not rows:
        return {
            'answer': f'{full_name} has no outstanding balance - all bills are fully paid.',
            'sources': [{'source_type': 'customer', 'source_id': customer_id, 'metadata': {}}],
            'chunks_used': 0,
            'structured': True
        }

    total_owed = sum(r[2] for r in rows)
    listing = '\n- '.join(
        f'{r[1]} - {_fmt_money(r[2])}{f", due {_fmt_date(r[3])}" if r[3] else ""}' for r in rows
    )
    answer = (
        f'{full_name} owes {_fmt_money(total_owed)} in total across {len(rows)} outstanding bill'
        f'{"s" if len(rows) != 1 else ""} (unpaid, partially paid, or overdue):\n- {listing}'
    )

    return {
        'answer': answer,
        'sources': [{'source_type': 'billing', 'source_id': r[0], 'metadata': {'bill_number': r[1]}} for r in rows],
        'chunks_used': 0,
        'structured': True
    }


def _customer_payment_status(customer_name: str) -> dict:
    """Per-bill payment status for a customer - "has X paid" / "payment
    status for X" - distinct from _customer_balance which only totals what's
    still owed."""
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            customer_rows = _find_customer_by_name(cur, customer_name)
            if not customer_rows:
                return {'answer': f'No customer found matching the name "{customer_name}".', 'sources': [], 'chunks_used': 0, 'structured': True}
            if len(customer_rows) > 1:
                return {'answer': f'Found multiple customers matching "{customer_name}". Please be more specific.', 'sources': [], 'chunks_used': 0, 'structured': True}

            customer_id, first_name, last_name = customer_rows[0]
            full_name = f'{first_name} {last_name}'

            cur.execute(
                """
                SELECT bill_id, bill_number, payment_status, total_amount, balance_amount, bill_date
                FROM billing
                WHERE customer_id = %s
                ORDER BY bill_date DESC
                """,
                (customer_id,)
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    if not rows:
        return {
            'answer': f'{full_name} has no bills on record.',
            'sources': [{'source_type': 'customer', 'source_id': customer_id, 'metadata': {}}],
            'chunks_used': 0,
            'structured': True
        }

    items = [
        f'{bill_number} ({_fmt_date(bill_date)}): {payment_status.replace("_", " ")}'
        + (f', balance {_fmt_money(balance_amount)}' if balance_amount and float(balance_amount) > 0 else '')
        for _, bill_number, payment_status, _, balance_amount, bill_date in rows
    ]
    answer = f'Payment status for {full_name}:\n- ' + '\n- '.join(items)

    return {
        'answer': answer,
        'sources': [{'source_type': 'billing', 'source_id': r[0], 'metadata': {'bill_number': r[1], 'payment_status': r[2]}} for r in rows],
        'chunks_used': 0,
        'structured': True
    }


def _owner_balance(customer_id: str) -> dict:
    """The pet-owner-facing "how much do I owe" lookup - same query as
    _customer_balance above, but scoped to customer_id directly since the
    caller is already authenticated (no name lookup/ambiguity to resolve)."""
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            # See _customer_balance's comment above on why 'refunded' must
            # be excluded, not just 'fully_paid'.
            cur.execute("""
                SELECT bill_id, bill_number, balance_amount, due_date
                FROM billing
                WHERE customer_id = %s AND payment_status IN ('unpaid', 'partially_paid', 'overdue')
                ORDER BY due_date ASC NULLS LAST
            """, (customer_id,))
            rows = cur.fetchall()
    finally:
        conn.close()

    if not rows:
        return {
            'answer': 'You have no outstanding balance - all your bills are fully paid.',
            'sources': [],
            'chunks_used': 0,
            'structured': True
        }

    total_owed = sum(r[2] for r in rows)
    listing = '\n- '.join(
        f'{r[1]} - {_fmt_money(r[2])}{f", due {_fmt_date(r[3])}" if r[3] else ""}' for r in rows
    )
    answer = (
        f'You owe {_fmt_money(total_owed)} in total across {len(rows)} outstanding bill'
        f'{"s" if len(rows) != 1 else ""} (unpaid, partially paid, or overdue):\n- {listing}'
    )

    return {
        'answer': answer,
        'sources': [{'source_type': 'billing', 'source_id': r[0], 'metadata': {'bill_number': r[1]}} for r in rows],
        'chunks_used': 0,
        'structured': True
    }


def _owner_payment_status(customer_id: str) -> dict:
    """Per-bill payment status for the caller's own account - pet-owner
    equivalent of _customer_payment_status above, scoped to customer_id
    directly rather than a name lookup."""
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT bill_id, bill_number, payment_status, total_amount, balance_amount, bill_date
                FROM billing
                WHERE customer_id = %s
                ORDER BY bill_date DESC
            """, (customer_id,))
            rows = cur.fetchall()
    finally:
        conn.close()

    if not rows:
        return {
            'answer': 'You have no bills on record.',
            'sources': [],
            'chunks_used': 0,
            'structured': True
        }

    items = [
        f'{bill_number} ({_fmt_date(bill_date)}): {payment_status.replace("_", " ")}'
        + (f', balance {_fmt_money(balance_amount)}' if balance_amount and float(balance_amount) > 0 else '')
        for _, bill_number, payment_status, _, balance_amount, bill_date in rows
    ]
    answer = 'Your payment status:\n- ' + '\n- '.join(items)

    return {
        'answer': answer,
        'sources': [{'source_type': 'billing', 'source_id': r[0], 'metadata': {'bill_number': r[1], 'payment_status': r[2]}} for r in rows],
        'chunks_used': 0,
        'structured': True
    }


def _estimate_price_by_appointment_type(appointment_type: str) -> dict:
    """Historical-average price estimate for an appointment type - explicitly
    framed as an average of past bills, never a guaranteed quote. Falls back
    to appointments.estimated_cost if there's no billing history yet for this
    type (e.g. a newly added appointment_type with no completed visits)."""
    type_display = appointment_type.replace('_', ' ')
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT AVG(b.total_amount), COUNT(*)
                FROM billing b
                JOIN appointments a ON b.appointment_id = a.appointment_id
                WHERE a.appointment_type = %s
                """,
                (appointment_type,)
            )
            avg_total, bill_count = cur.fetchone()

            if avg_total is not None:
                return {
                    'answer': (
                        f'Based on {bill_count} past bill{"s" if bill_count != 1 else ""}, a {type_display} '
                        # Rounded to the nearest rupee, not decimals=2 - an
                        # average of a handful of bills doesn't justify
                        # cent-level precision, and showing it invites
                        # someone to read it as an exact quote.
                        f'appointment costs an average of {_fmt_money(avg_total, decimals=0)}. This is a historical '
                        f'average, not a fixed price or quote - the actual cost depends on the specific visit.'
                    ),
                    'sources': [],
                    'chunks_used': 0,
                    'structured': True
                }

            # No billing history for this type yet - fall back to the
            # appointment-level estimate staff enter when booking.
            cur.execute(
                "SELECT AVG(estimated_cost), COUNT(*) FROM appointments WHERE appointment_type = %s AND estimated_cost IS NOT NULL",
                (appointment_type,)
            )
            avg_estimate, estimate_count = cur.fetchone()
    finally:
        conn.close()

    if avg_estimate is not None:
        return {
            'answer': (
                f'There\'s no billing history yet for {type_display} appointments, but based on '
                f'{estimate_count} past appointment estimate{"s" if estimate_count != 1 else ""}, expect '
                f'around {_fmt_money(avg_estimate, decimals=0)}. This is an estimate, not a fixed price.'
            ),
            'sources': [],
            'chunks_used': 0,
            'structured': True
        }

    return {
        'answer': f'There is no pricing history yet for {type_display} appointments to estimate from.',
        'sources': [],
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

            if role in STAFF_ROLES or (role == 'pet_owner' and customer_id):
                # Only the count is needed now that the answer no longer
                # lists individual doses - COUNT(*) instead of fetching
                # every row just to call len() on it.
                cur.execute("SELECT COUNT(*) FROM vaccinations WHERE pet_id = %s", (pet_id,))
            else:
                return None

            count = cur.fetchone()[0]
    finally:
        conn.close()

    # "dose", not "record" - same ambiguity _list_vaccinations_for_pet used
    # to have (a "record" could mean a row or a distinct vaccine).
    answer = f'{pet_name} (owner: {owner_name}) has had {count} vaccination dose{"s" if count != 1 else ""} so far.'

    return {
        'answer': answer,
        'sources': _summary_source('vaccination_summary', f'vaccination_count_{pet_id}', pet_name=pet_name, count=count),
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
    items = [f'{_fmt_date(r[1])} - {r[2]} (Complaint: {r[3]})' for r in record_rows]
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
        date_str = _fmt_date(first_date) if first_date else 'date unknown'
        if dose_count > 1:
            items.append(f'{vaccine_name}{type_text} - {dose_count} doses, first given {date_str}')
        else:
            items.append(f'{vaccine_name}{type_text} - given {date_str}')

    listing = '\n- '.join(items)
    answer = f'{pet_name} (owner: {owner_name}) has received:\n- {listing}'

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

def _last_vaccination_for_pet(pet_id: str, role: str, customer_id: str = None) -> dict:
    """Return the most recent vaccination for a pet, queried directly from the DB."""
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
                    'structured': True,
                }

            pet_name = pet_row[0]

            cur.execute(
                """
                SELECT v.vaccine_name, v.vaccine_type, v.vaccination_date,
                       v.next_due_date,
                       (u.first_name || ' ' || u.last_name) AS administered_by_name
                FROM vaccinations v
                LEFT JOIN users u ON v.administered_by = u.user_id
                WHERE v.pet_id = %s
                ORDER BY v.vaccination_date DESC
                LIMIT 1
                """,
                (pet_id,)
            )
            row = cur.fetchone()
    finally:
        conn.close()

    if not row:
        return {
            'answer': f'{pet_name} has no vaccination records yet.',
            'sources': [],
            'chunks_used': 0,
            'structured': True,
        }

    vaccine_name, vaccine_type, vaccination_date, next_due_date, administered_by_name = row
    type_text = f' ({vaccine_type})' if vaccine_type else ''
    date_str = (
        vaccination_date.strftime('%d %B %Y')
        if hasattr(vaccination_date, 'strftime')
        else str(vaccination_date)
    )

    answer = (
        f"{pet_name}'s most recent vaccination was **{vaccine_name}**{type_text}, "
        f"administered on **{date_str}**."
    )
    if administered_by_name:
        answer += f' Administered by {administered_by_name}.'
    if next_due_date:
        due_str = (
            next_due_date.strftime('%d %B %Y')
            if hasattr(next_due_date, 'strftime')
            else str(next_due_date)
        )
        answer += f' Next due: {due_str}.'

    return {
        'answer': answer,
        'sources': [
            {
                'source_type': 'vaccination',
                'source_id': str(pet_id),
                'metadata': {
                    'pet_name': pet_name,
                    'vaccine_name': vaccine_name,
                    'vaccine_type': vaccine_type,
                    'vaccination_date': str(vaccination_date) if vaccination_date else None,
                    'next_due_date': str(next_due_date) if next_due_date else None,
                },
            }
        ],
        'chunks_used': 0,
        'structured': True,
    }


def _vaccination_status_for_pet(pet_id: str, role: str, customer_id: str = None) -> dict:
    """
    Answers "is <pet> up to date with shots/vaccines?" - deliberately
    different from _last_vaccination_for_pet above: a pet can have several
    DISTINCT vaccine types on file (e.g. both DHPP and Rabies) with
    different due dates, and "up to date" is asking about ALL of them, not
    just whichever single dose happens to have been administered most
    recently. Reports every vaccine type's latest dose and next due date,
    plus an overall verdict, rather than one global "last shot given" row.
    """
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
                    'structured': True,
                }

            pet_name = pet_row[0]

            # DISTINCT ON (vaccine_name) keeps only the most recent dose PER
            # vaccine type - a pet current on DHPP but overdue on Rabies is
            # not "up to date with shots", and this needs to see both, not
            # just whichever type happens to have the latest single dose.
            cur.execute(
                """
                SELECT DISTINCT ON (v.vaccine_name)
                    v.vaccine_name, v.vaccine_type, v.vaccination_date, v.next_due_date
                FROM vaccinations v
                WHERE v.pet_id = %s
                ORDER BY v.vaccine_name, v.vaccination_date DESC
                """,
                (pet_id,)
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    if not rows:
        return {
            'answer': f'{pet_name} has no vaccination records yet.',
            'sources': [],
            'chunks_used': 0,
            'structured': True,
        }

    today = date.today()
    items = []
    overdue = []
    for vaccine_name, vaccine_type, vaccination_date, next_due_date in rows:
        type_text = f' ({vaccine_type})' if vaccine_type else ''
        date_str = _fmt_date(vaccination_date) if vaccination_date else 'date unknown'
        if next_due_date:
            due_str = _fmt_date(next_due_date)
            if next_due_date < today:
                items.append(f'{vaccine_name}{type_text} - last given {date_str}, **overdue since {due_str}**')
                overdue.append(vaccine_name)
            else:
                items.append(f'{vaccine_name}{type_text} - last given {date_str}, next due {due_str}')
        else:
            items.append(f'{vaccine_name}{type_text} - last given {date_str}, no next due date on file')

    listing = '\n- '.join(items)
    if overdue:
        verdict = f"{pet_name} is **not fully up to date** - overdue on {', '.join(overdue)}."
    else:
        verdict = f'{pet_name} is **up to date** on all vaccines on file.'

    answer = f'{verdict}\n\n- {listing}'

    return {
        'answer': answer,
        'sources': [
            {
                'source_type': 'vaccination',
                'source_id': f'{vaccine_name}|{vaccine_type or ""}',
                'metadata': {
                    'pet_name': pet_name,
                    'vaccine_name': vaccine_name,
                    'vaccine_type': vaccine_type,
                    'vaccination_date': str(vaccination_date) if vaccination_date else None,
                    'next_due_date': str(next_due_date) if next_due_date else None,
                }
            }
            for vaccine_name, vaccine_type, vaccination_date, next_due_date in rows
        ],
        'chunks_used': 0,
        'structured': True,
    }
