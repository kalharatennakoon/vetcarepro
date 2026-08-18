"""
Clinical Tools
Veterinarian-facing AI capabilities that need the COMPLETE record set for a
pet - not a top-k sample the way normal RAG retrieval works. Plain RAG can't
be trusted here: it only ever sees a handful of matching chunks and is
explicitly instructed not to claim completeness (see rag_service.py's
STAFF_SYSTEM_PROMPT), so "summarize this pet's full history" needs a
different path that fetches every record via SQL first, then makes exactly
one generation call over the whole dataset.

Four capabilities live here:
- full_history_summary   - complete medical/vaccination/lab history, summarized
- draft_consultation_note - turns the vet's free-text observations into a
                             structured DRAFT note (never auto-saved)
- aftercare_instructions  - owner-friendly aftercare text, optionally emailed
                             after explicit confirmation
- pre_appointment_briefing - what to know about a pet before seeing them

Staff-only, restricted to CLINICAL_STAFF_ROLES (admin/veterinarian) - the
same clinical-detail boundary already enforced everywhere else in this app
(receptionists are blocked from diagnosis/treatment detail).

Same "ask rather than guess" and "confirm before any write" discipline as
action_intent.py: nothing here ever creates a medical_records row or sends
an email without the vet reviewing it first.
"""

import re

from config.db_connection import get_raw_db_connection
from scripts.rag.ollama_client import generate_answer, stream_chat, normalize_currency, strip_non_english, OllamaError
from scripts.rag.structured_query import (
    CLINICAL_STAFF_ROLES, PET_MENTION, PET_BY_MENTION, OWNER_MENTION,
    _first_possessive_pet_name, _first_non_stopword_match
)
from scripts.rag.action_intent import _find_pet_by_name


def _extract_pet_name(question: str):
    """Same pet-name extraction cascade as structured_query.py's
    resolve_pet_id, but exposed separately here so we can see the full list
    of candidate pets on an ambiguous match (resolve_pet_id only ever
    returns a single pet_id or None, discarding the candidates - which we
    need to offer as clickable options instead of asking the vet to type
    the owner's name from memory)."""
    return (
        _first_non_stopword_match(PET_MENTION, question)
        or _first_non_stopword_match(PET_BY_MENTION, question)
        or _first_possessive_pet_name(question)
    )


def _owner_options(pet_rows) -> list:
    """Builds clickable disambiguation options from _find_pet_by_name's rows
    - clicking one just re-submits the owner's name as the next message,
    same as if the vet had typed it themselves."""
    return [
        {'label': f'{r[1]} ({r[3]} {r[4]})', 'value': f'{r[3]} {r[4]}'}
        for r in pet_rows
    ]


def _strip_pet_name_prefix(reply: str, pet_name: str) -> str:
    """A vet disambiguating a pet naturally restates its name alongside the
    owner's (e.g. "Max, Nishantha Rajapaksa") rather than replying with just
    the owner's name - strip a leading repeat of the pet's name plus a
    comma/"and"/whitespace separator so the remainder is a clean owner-name
    filter for _find_pet_by_name."""
    if not pet_name:
        return reply.strip()
    return re.sub(
        rf'^\s*{re.escape(pet_name)}\s*(?:[,;]|and)?\s*', '', reply, count=1, flags=re.IGNORECASE
    ).strip()

# ============================================================
# Intent detection
# ============================================================

FULL_HISTORY_SUMMARY = re.compile(
    r'\bsummar(?:y|ize|ise)\b.*\b(?:history|health)\b|\b(?:history|health)\b.*\bsummar(?:y|ize|ise)\b|'
    r'\b(?:full|complete|entire|whole)\b.*\bhistory\b|'
    # "current health condition/status", "how is X's health" etc - phrasings
    # that ask for a health summary without literally saying "history". Kept
    # to explicit "health" wording (not a bare "how is X doing") so this
    # doesn't fire on unrelated clinic questions ("how is revenue doing").
    r'\b(?:current\s+)?health\s+(?:condition|status)\b|\bhow\s+(?:is|\'s)\b.{0,40}\bhealth\b|'
    r'\bhow\s+healthy\b',
    re.IGNORECASE
)
DRAFT_CONSULTATION_NOTE = re.compile(
    r'\bdraft\b.*\bnote\b|\bwrite\b.*\b(?:consultation\s+)?note\b|'
    r'\bhelp\s+me\s+(?:write|draft)\b.*\bnote\b',
    re.IGNORECASE
)
AFTERCARE_INSTRUCTIONS = re.compile(r'\bafter[\s-]?care\b', re.IGNORECASE)
PRE_APPOINTMENT_BRIEFING = re.compile(
    r'\bwhat\s+should\s+i\s+know\b.*\b(?:before|about)\b|'
    r'\bbrief(?:ing)?\b.*\b(?:before|visit|appointment)\b|'
    r'\bprep(?:are|aration)?\b.*\b(?:before|visit|appointment)\b',
    re.IGNORECASE
)

# Filler/trigger words stripped out before judging whether a message has
# enough real clinical content to draft from, vs. needing a follow-up
# question first - crude on purpose, this only decides whether to ask once.
_FILLER_WORDS = re.compile(
    r'\b(?:draft|write|help|me|please|can|you|a|an|the|for|note|consultation|'
    r'aftercare|instructions|give|generate|create|about|of)\b',
    re.IGNORECASE
)


def _has_enough_detail(text: str, min_words: int = 6) -> bool:
    cleaned = _FILLER_WORDS.sub('', text or '')
    words = [w for w in re.split(r'[^a-zA-Z0-9]+', cleaned) if w]
    return len(words) >= min_words


# ============================================================
# Data fetching - complete record sets, capped defensively so a pet with a
# very long history doesn't blow the local model's context window. This is
# a simple cap, not pagination/chunking - most-recent-first, so a truncation
# still keeps the clinically-relevant recent picture.
# ============================================================

MAX_RECORDS = 30
MAX_VACCINATIONS = 20
MAX_LAB_REPORTS = 20
MAX_DISEASE_CASES = 20


def _fetch_pet_profile(cur, pet_id: str):
    cur.execute(
        """
        SELECT pet_name, species, breed, gender, date_of_birth, weight_current,
               is_neutered, allergies, special_needs
        FROM pets WHERE pet_id = %s
        """,
        (pet_id,)
    )
    return cur.fetchone()


def _fetch_medical_records(cur, pet_id: str, limit: int = MAX_RECORDS):
    cur.execute(
        """
        SELECT visit_date, chief_complaint, symptoms, diagnosis, treatment,
               prescription, lab_tests, lab_results, follow_up_required, follow_up_date, notes
        FROM medical_records
        WHERE pet_id = %s
        ORDER BY visit_date DESC
        LIMIT %s
        """,
        (pet_id, limit)
    )
    return cur.fetchall()


def _fetch_vaccinations(cur, pet_id: str, limit: int = MAX_VACCINATIONS):
    cur.execute(
        """
        SELECT vaccine_name, vaccine_type, vaccination_date, next_due_date, adverse_reaction
        FROM vaccinations
        WHERE pet_id = %s
        ORDER BY vaccination_date DESC
        LIMIT %s
        """,
        (pet_id, limit)
    )
    return cur.fetchall()


def _fetch_lab_reports(cur, pet_id: str, limit: int = MAX_LAB_REPORTS):
    cur.execute(
        """
        SELECT report_name, report_type, notes, created_at
        FROM lab_reports
        WHERE pet_id = %s
        ORDER BY created_at DESC
        LIMIT %s
        """,
        (pet_id, limit)
    )
    return cur.fetchall()


def _fetch_disease_cases(cur, pet_id: str, limit: int = MAX_DISEASE_CASES):
    cur.execute(
        """
        SELECT disease_name, disease_category, diagnosis_date, severity, outcome,
               requires_followup, next_followup_date, notes
        FROM disease_cases
        WHERE pet_id = %s
        ORDER BY diagnosis_date DESC
        LIMIT %s
        """,
        (pet_id, limit)
    )
    return cur.fetchall()


def _format_pet_dataset_for_prompt(pet_profile, records, vaccinations, lab_reports=None, disease_cases=None) -> str:
    pet_name, species, breed, gender, dob, weight, is_neutered, allergies, special_needs = pet_profile

    lines = [f"Pet: {pet_name} ({species}{', ' + breed if breed else ''}, {gender or 'unknown gender'})"]
    if dob:
        lines.append(f"Date of birth: {dob}")
    if weight:
        lines.append(f"Current weight: {weight} kg")
    lines.append(f"Neutered: {'yes' if is_neutered else 'no'}")
    if allergies:
        lines.append(f"Known allergies: {allergies}")
    if special_needs:
        lines.append(f"Special needs: {special_needs}")

    # Diagnosed disease cases carry the status fields (severity/outcome/
    # follow-up) that a medical record's free-text diagnosis doesn't - placed
    # first and flagged explicitly so an UNRESOLVED case can't get missed or
    # summarized as if the pet were currently healthy.
    if disease_cases is not None:
        lines.append("")
        lines.append(f"Diagnosed disease cases ({len(disease_cases)}, most recent first):")
        if not disease_cases:
            lines.append("- none on file")
        for (disease_name, disease_category, diagnosis_date, severity, outcome,
             requires_followup, next_followup_date, notes) in disease_cases:
            is_unresolved = outcome in ('ongoing_treatment', 'chronic')
            entry = (
                f"- {diagnosis_date}: {disease_name}"
                f"{' (' + disease_category + ')' if disease_category else ''}; "
                f"severity: {severity or 'n/a'}; status: {outcome or 'n/a'}"
                f"{' — STILL UNRESOLVED, not recovered' if is_unresolved else ''}"
            )
            if requires_followup:
                entry += f"; follow-up required{' by ' + str(next_followup_date) if next_followup_date else ''}"
            if notes:
                entry += f"; notes: {notes}"
            lines.append(entry)

    lines.append("")
    lines.append(f"Medical records ({len(records)}, most recent first):")
    if not records:
        lines.append("- none on file")
    for (visit_date, chief_complaint, symptoms, diagnosis, treatment, prescription,
         lab_tests, lab_results, follow_up_required, follow_up_date, notes) in records:
        entry = (
            f"- {visit_date}: complaint: {chief_complaint or 'n/a'}; symptoms: {symptoms or 'n/a'}; "
            f"diagnosis: {diagnosis or 'n/a'}; treatment: {treatment or 'n/a'}"
        )
        if prescription:
            entry += f"; prescription: {prescription}"
        if lab_tests or lab_results:
            entry += f"; labs: {(lab_tests or '')} {(lab_results or '')}".strip()
        if follow_up_required:
            entry += f"; follow-up required{' by ' + str(follow_up_date) if follow_up_date else ''}"
        if notes:
            entry += f"; notes: {notes}"
        lines.append(entry)

    lines.append("")
    lines.append(f"Vaccinations ({len(vaccinations)}, most recent first):")
    if not vaccinations:
        lines.append("- none on file")
    for vaccine_name, vaccine_type, vaccination_date, next_due_date, adverse_reaction in vaccinations:
        entry = f"- {vaccination_date}: {vaccine_name}{' (' + vaccine_type + ')' if vaccine_type else ''}"
        if next_due_date:
            entry += f", next due {next_due_date}"
        if adverse_reaction:
            entry += " [had an adverse reaction]"
        lines.append(entry)

    if lab_reports is not None:
        lines.append("")
        lines.append(f"Lab reports ({len(lab_reports)}, most recent first):")
        if not lab_reports:
            lines.append("- none on file")
        for report_name, report_type, notes, created_at in lab_reports:
            entry = f"- {created_at}: {report_name} ({report_type})"
            if notes:
                entry += f" - {notes}"
            lines.append(entry)

    return '\n'.join(lines)


# ============================================================
# System prompts
# ============================================================

HISTORY_SUMMARY_SYSTEM_PROMPT = """You are VetCare Pro's veterinary copilot, helping a veterinarian or \
admin quickly review a pet's COMPLETE medical history, given to you in full below - not a sample. \
You must follow these rules strictly:

1. Base your summary ONLY on the records given below. Do not invent dates, diagnoses, medications, \
or details not present.
2. This is decision support only - you are not making a diagnosis or treatment recommendation. \
Present facts from the records; let the veterinarian draw clinical conclusions.
3. STRICT RULE - if any entry in "Diagnosed disease cases" is marked STILL UNRESOLVED, you MUST lead \
the summary with that fact (e.g. "Currently under treatment for X since <date>") before any overall \
pattern/timeline. Never describe a pet as healthy, stable, or having "no significant issues" while an \
unresolved case is on file, even if other recent visits (routine checkups, vaccinations) look normal - \
those don't override an open case. After that, flag anything else that stands out (recurring issues, \
allergies, adverse reactions, overdue follow-ups or vaccinations).
4. Use clinical terminology appropriate for a veterinary professional audience.
5. Format for skimming: a short lead-in sentence at most, then group the facts by \
topic (e.g. arthritis history, recent medical records, vaccinations, lab reports, \
allergies, flagged issues). Each topic gets its own bold heading line ("**Vaccinations**") \
on its own line - never as a bullet item itself, never prefixed with "- ". Under each \
heading, list the actual facts as "- " bullet points. Leave a blank line between one \
topic's bullets and the next topic's heading. Not a paragraph re-statement of every record.
6. This clinic operates in Sri Lanka - always use metric units (kilograms, Celsius, centimeters). \
Never use pounds, Fahrenheit, or inches.
7. Always state monetary amounts in Sri Lankan Rupees, written as "Rs. X" - never "$", "USD", or "dollars".
"""

DRAFT_NOTE_SYSTEM_PROMPT = """You are VetCare Pro's veterinary copilot, helping a veterinarian quickly \
turn their visit observations into a structured DRAFT consultation note. You must follow these \
rules strictly:

1. This is a DRAFT ONLY. Clearly label it as a draft that the veterinarian must review, correct, \
and personally enter into the real medical record - never imply it has already been saved or is final.
2. Organize the draft under these exact headings, matching the clinic's medical record form: Chief \
Complaint, Symptoms, Diagnosis, Treatment, Prescription, Notes.
3. STRICT RULE - for EVERY heading, write ONLY what the veterinarian's own words say. If the vet did \
not explicitly state a treatment, medication, dosage, duration, or follow-up plan, you MUST write \
exactly "Not specified by the veterinarian" under that heading. Do NOT invent, infer, or guess a \
plausible-sounding treatment, medication name, dosage, or duration under any circumstances - even if \
it seems like standard veterinary practice for the stated diagnosis. Making up a treatment the vet \
never gave is a serious error, worse than leaving a heading blank.
4. Do not soften or change the clinical substance of what the vet said - just organize it into \
clear, professional clinical language under the right heading.
5. Produce exactly ONE draft, in this exact format, one time - do not repeat yourself or produce a \
second version.
6. This clinic operates in Sri Lanka - always use metric units. Never use pounds, Fahrenheit, or inches.
7. Always state monetary amounts in Sri Lankan Rupees, written as "Rs. X" - never "$", "USD", or "dollars".
"""

AFTERCARE_SYSTEM_PROMPT = """You are VetCare Pro's veterinary copilot, helping a veterinarian write \
owner-friendly aftercare instructions to send to a pet owner after a visit. You must follow these \
rules strictly:

1. STRICT RULE - base the instructions ONLY on the diagnosis/treatment information given below. If no \
treatment or medication was mentioned, do NOT invent one - stick to general, non-medical care advice \
(rest, monitoring, feeding, when to call the clinic) instead of guessing a plausible-sounding \
medication, dosage, or schedule. Inventing a treatment the vet never gave is a serious error.
2. Write in simple, everyday English for a pet owner with no medical training - the reading level of \
a general news article, not a medical chart. If a technical term is unavoidable, briefly explain it \
in plain language right after it.
3. Keep a warm, reassuring tone. Include practical care steps (rest, monitoring, feeding, medication \
schedule ONLY if one was actually given) and when to contact the clinic again (e.g. if symptoms worsen).
4. Never invent a follow-up date, medication, or dosage that wasn't given to you.
5. Format for skimming: a short paragraph or two, then a bullet list of care steps.
6. This clinic operates in Sri Lanka - always use metric units. Never use pounds, Fahrenheit, or inches.
7. Always state monetary amounts in Sri Lankan Rupees, written as "Rs. X" - never "$", "USD", or "dollars".
"""

BRIEFING_SYSTEM_PROMPT = """You are VetCare Pro's veterinary copilot, giving a veterinarian a quick \
pre-visit briefing on a pet, based on their complete record shown below. You must follow these \
rules strictly:

1. Base the briefing ONLY on the records given - do not invent anything.
2. This is decision support only, not a diagnosis - surface what the vet should be aware of before \
the visit: known allergies, special needs, past adverse reactions, recent/ongoing issues, overdue \
vaccinations or follow-ups, and current medication if a recent prescription is on file.
3. STRICT RULE - if any entry in "Diagnosed disease cases" is marked STILL UNRESOLVED, lead with it - \
that's the single most important thing for the vet to know walking into the room, ahead of routine \
checkup history.
4. Keep it short and scannable - a few bullet points, not a full history retelling.
5. This clinic operates in Sri Lanka - always use metric units. Never use pounds, Fahrenheit, or inches.
6. Always state monetary amounts in Sri Lankan Rupees, written as "Rs. X" - never "$", "USD", or "dollars".
"""


def _unavailable(e: OllamaError) -> dict:
    return {'answer': f"AI assistant is currently unavailable: {str(e)}", 'structured': True, 'error': True}


def _pet_source(pet_id: str) -> list:
    return [{'source_type': 'pet', 'source_id': pet_id, 'metadata': {}}]


# ============================================================
# Per-intent resolution
# ============================================================

def _prepare_full_history_summary(pet_id: str, observations_text: str) -> tuple:
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            pet_profile = _fetch_pet_profile(cur, pet_id)
            if not pet_profile:
                return 'early', {'answer': "I couldn't find that pet's record.", 'structured': True}
            records = _fetch_medical_records(cur, pet_id)
            vaccinations = _fetch_vaccinations(cur, pet_id)
            lab_reports = _fetch_lab_reports(cur, pet_id)
            disease_cases = _fetch_disease_cases(cur, pet_id)
    finally:
        conn.close()

    dataset_text = _format_pet_dataset_for_prompt(pet_profile, records, vaccinations, lab_reports, disease_cases)
    user_prompt = f"Full record for this pet:\n\n{dataset_text}\n\nWrite a summary of this pet's complete medical history for the veterinarian."
    return 'generate', {'system_prompt': HISTORY_SUMMARY_SYSTEM_PROMPT, 'user_prompt': user_prompt, 'pet_id': pet_id}


def _finalize_full_history_summary(answer_text: str, reasoning, prep: dict) -> dict:
    answer = normalize_currency(strip_non_english(answer_text))
    return {
        'answer': answer, 'sources': _pet_source(prep['pet_id']), 'chunks_used': 0, 'structured': True,
        **({'reasoning': reasoning} if reasoning else {})
    }


def _prepare_draft_consultation_note(pet_id: str, observations_text: str) -> tuple:
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            pet_profile = _fetch_pet_profile(cur, pet_id)
    finally:
        conn.close()

    if not pet_profile:
        return 'early', {'answer': "I couldn't find that pet's record.", 'structured': True}

    pet_name = pet_profile[0]
    user_prompt = (
        f"Pet: {pet_name}\n\nVeterinarian's observations from this visit:\n{observations_text}\n\n"
        "Turn this into a structured draft consultation note."
    )
    return 'generate', {'system_prompt': DRAFT_NOTE_SYSTEM_PROMPT, 'user_prompt': user_prompt, 'pet_id': pet_id}


def _finalize_draft_consultation_note(answer_text: str, reasoning, prep: dict) -> dict:
    answer = normalize_currency(strip_non_english(answer_text))
    return {
        'answer': answer, 'sources': _pet_source(prep['pet_id']), 'chunks_used': 0, 'structured': True,
        **({'reasoning': reasoning} if reasoning else {})
    }


def _prepare_aftercare_instructions(pet_id: str, observations_text: str) -> tuple:
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT p.pet_name, p.customer_id, c.first_name, c.last_name, c.email
                FROM pets p JOIN customers c ON c.customer_id = p.customer_id
                WHERE p.pet_id = %s
                """,
                (pet_id,)
            )
            row = cur.fetchone()
    finally:
        conn.close()

    if not row:
        return 'early', {'answer': "I couldn't find that pet's record.", 'structured': True}

    pet_name, customer_id, owner_first, owner_last, owner_email = row
    user_prompt = (
        f"Pet: {pet_name}\n\nVisit details:\n{observations_text}\n\n"
        "Write owner-friendly aftercare instructions."
    )
    return 'generate', {
        'system_prompt': AFTERCARE_SYSTEM_PROMPT, 'user_prompt': user_prompt, 'pet_id': pet_id,
        'pet_name': pet_name, 'customer_id': customer_id,
        'owner_first': owner_first, 'owner_last': owner_last, 'owner_email': owner_email
    }


def _finalize_aftercare_instructions(answer_text: str, reasoning, prep: dict) -> dict:
    answer = normalize_currency(strip_non_english(answer_text))
    pet_name, customer_id = prep['pet_name'], prep['customer_id']
    owner_first, owner_last, owner_email = prep['owner_first'], prep['owner_last'], prep['owner_email']

    result = {
        'answer': answer, 'sources': _pet_source(prep['pet_id']), 'chunks_used': 0, 'structured': True,
        **({'reasoning': reasoning} if reasoning else {})
    }

    if owner_email:
        result['answer'] = f"{answer}\n\nShall I email this to {owner_first} {owner_last} ({owner_email})?"
        result['action'] = {
            'type': 'send_aftercare_email',
            'slots': {
                'customer_id': customer_id,
                'subject': f'Aftercare Instructions for {pet_name}',
                'message': answer,
                'pet_name': pet_name,
            }
        }
        result['requires_confirmation'] = True
    else:
        result['answer'] = (
            f"{answer}\n\n({owner_first} {owner_last} has no email on file, so I can't send this "
            "automatically - you'll need to share it another way.)"
        )

    return result


def _prepare_pre_appointment_briefing(pet_id: str, observations_text: str) -> tuple:
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            pet_profile = _fetch_pet_profile(cur, pet_id)
            if not pet_profile:
                return 'early', {'answer': "I couldn't find that pet's record.", 'structured': True}
            records = _fetch_medical_records(cur, pet_id)
            vaccinations = _fetch_vaccinations(cur, pet_id)
            disease_cases = _fetch_disease_cases(cur, pet_id)
    finally:
        conn.close()

    dataset_text = _format_pet_dataset_for_prompt(pet_profile, records, vaccinations, disease_cases=disease_cases)
    user_prompt = f"Record for this pet:\n\n{dataset_text}\n\nGive the veterinarian a short pre-visit briefing for today's appointment."
    return 'generate', {'system_prompt': BRIEFING_SYSTEM_PROMPT, 'user_prompt': user_prompt, 'pet_id': pet_id}


def _finalize_pre_appointment_briefing(answer_text: str, reasoning, prep: dict) -> dict:
    answer = normalize_currency(strip_non_english(answer_text))
    return {
        'answer': answer, 'sources': _pet_source(prep['pet_id']), 'chunks_used': 0, 'structured': True,
        **({'reasoning': reasoning} if reasoning else {})
    }


_PREPARERS = {
    'full_history_summary': _prepare_full_history_summary,
    'draft_consultation_note': _prepare_draft_consultation_note,
    'aftercare_instructions': _prepare_aftercare_instructions,
    'pre_appointment_briefing': _prepare_pre_appointment_briefing,
}

_FINALIZERS = {
    'full_history_summary': _finalize_full_history_summary,
    'draft_consultation_note': _finalize_draft_consultation_note,
    'aftercare_instructions': _finalize_aftercare_instructions,
    'pre_appointment_briefing': _finalize_pre_appointment_briefing,
}


def run_clinical_generation(intent_type: str, pet_id: str, observations_text: str, role: str) -> dict:
    """
    Runs the actual generation step for a matched clinical-tool intent
    (called by rag_service.answer_question once _route_clinical_tool has
    resolved a pet and intent) - blocking, via generate_answer. See
    stream_clinical_generation for the real-time streamed counterpart.
    """
    prep_kind, prep = _PREPARERS[intent_type](pet_id, observations_text)
    if prep_kind == 'early':
        return prep

    try:
        answer_text, reasoning = generate_answer(prep['system_prompt'], prep['user_prompt'], think=(role == 'admin'))
    except OllamaError as e:
        return _unavailable(e)

    return _FINALIZERS[intent_type](answer_text, reasoning, prep)


def stream_clinical_generation(intent_type: str, pet_id: str, observations_text: str, role: str):
    """
    Streaming counterpart to run_clinical_generation, for the admin-only
    real-time "show reasoning" chat view - same matched intent/pet, but
    surfaces reasoning deltas as they're produced via stream_chat instead of
    only after the full answer is ready.

    Yields:
        dict: {'type': 'reasoning_delta', 'text': str} zero or more times,
            followed by exactly one {'type': 'final', 'result': dict}
    """
    prep_kind, prep = _PREPARERS[intent_type](pet_id, observations_text)
    if prep_kind == 'early':
        yield {'type': 'final', 'result': prep}
        return

    content = ''
    reasoning = None
    try:
        for event in stream_chat(prep['system_prompt'], prep['user_prompt'], think=(role == 'admin')):
            if event['type'] == 'thinking':
                yield {'type': 'reasoning_delta', 'text': event['delta']}
            elif event['type'] == 'done':
                content = event['content']
                reasoning = event['thinking']
    except OllamaError as e:
        yield {'type': 'final', 'result': _unavailable(e)}
        return

    yield {'type': 'final', 'result': _FINALIZERS[intent_type](content, reasoning, prep)}


# Only these two intents take free-text clinical input from the vet - the
# other two (full_history_summary, pre_appointment_briefing) work entirely
# off the pet's stored records, so they never need a "give me more detail"
# round-trip.
_NEEDS_CLINICAL_DETAIL = {'draft_consultation_note', 'aftercare_instructions'}


def _detail_question(intent_type: str) -> str:
    return (
        'What did you observe during the visit (symptoms, findings, diagnosis, treatment given)?'
        if intent_type == 'draft_consultation_note' else
        'What was the diagnosis and treatment, so I can write aftercare instructions for the owner?'
    )


def _route_clinical_tool(question: str, role: str, history=None, pending_intent: dict = None) -> tuple:
    """
    Detects and progresses a clinical generation request (full history
    summary, consultation note draft, aftercare instructions, or a
    pre-appointment briefing), stopping short of the actual LLM generation
    call so rag_service.answer_question (blocking) and
    stream_answer_question (real-time streamed, admin-only "show reasoning"
    view) can each run that final step their own way, via
    run_clinical_generation/stream_clinical_generation. Staff-only
    (admin/veterinarian).

    Note this deliberately does NOT feed the model the raw conversation
    history/transcript - only the vet's own clinical text (the original
    trigger message, plus a follow-up answer if one was needed). Passing the
    full back-and-forth (including the pet-disambiguation exchange) confused
    the model into echoing transcript-like text back in earlier testing.

    Returns:
        tuple: (None, None) - role not allowed, or `question` doesn't match
            a known intent (caller should fall through to
            try_structured_answer / RAG)
          ('early', dict) - fully resolved already (disambiguation prompts,
            "couldn't find pet", "what did you observe" follow-up) - nothing
            left to generate
          ('dispatch', {'intent_type', 'pet_id', 'observations_text'}) - a
            pet and intent are resolved, ready for
            run_clinical_generation/stream_clinical_generation
    """
    if role not in CLINICAL_STAFF_ROLES:
        return None, None

    if pending_intent and pending_intent.get('type') in _PREPARERS:
        intent_type = pending_intent['type']
        stage = pending_intent.get('stage')
        original_question = pending_intent.get('original_question', '')

        if stage == 'need_detail':
            pet_id = pending_intent.get('pet_id')
            observations_text = f"{original_question}\n{question}"
            return 'dispatch', {'intent_type': intent_type, 'pet_id': pet_id, 'observations_text': observations_text}

        if stage == 'need_pet_name':
            # The original request had no pet name in it at all - this
            # turn's whole reply is the pet's name.
            pet_name = question.strip()
            conn = get_raw_db_connection()
            try:
                with conn.cursor() as cur:
                    pet_rows = _find_pet_by_name(cur, pet_name)
            finally:
                conn.close()

            if not pet_rows:
                return 'early', {'answer': f'I couldn\'t find an active pet named "{pet_name}".', 'structured': True}

            if len(pet_rows) > 1:
                return 'early', {
                    'answer': f'I found multiple pets named "{pet_name}" - which one did you mean?',
                    'options': _owner_options(pet_rows),
                    'pending_intent': {
                        'type': intent_type, 'stage': 'disambiguate_pet',
                        'pet_name': pet_name, 'original_question': original_question
                    },
                    'structured': True
                }
            pet_id = pet_rows[0][0]
        elif stage == 'disambiguate_pet':
            # This turn's reply is the owner's name - typed alone, sent
            # verbatim by clicking one of the option buttons offered below,
            # or naturally restating the pet's name alongside the owner's
            # (e.g. "Max, Nishantha Rajapaksa") - strip a restated pet name
            # first so it doesn't pollute the owner-name filter.
            pet_name = pending_intent.get('pet_name')
            owner_reply = _strip_pet_name_prefix(question, pet_name)
            conn = get_raw_db_connection()
            try:
                with conn.cursor() as cur:
                    pet_rows = _find_pet_by_name(cur, pet_name, owner_name=owner_reply)
            finally:
                conn.close()

            retry_pending_intent = {
                'type': intent_type, 'stage': 'disambiguate_pet',
                'pet_name': pet_name, 'original_question': original_question
            }
            if not pet_rows:
                return 'early', {
                    'answer': (
                        "I still couldn't find exactly one matching pet - could you double-check "
                        "the pet's name and the owner's name?"
                    ),
                    'pending_intent': retry_pending_intent,
                    'structured': True
                }
            if len(pet_rows) > 1:
                return 'early', {
                    'answer': f'I found multiple pets named "{pet_name}" - which one did you mean?',
                    'options': _owner_options(pet_rows),
                    'pending_intent': retry_pending_intent,
                    'structured': True
                }
            pet_id = pet_rows[0][0]
        else:
            return None, None

        # Pet just resolved - check the ORIGINAL request for clinical detail
        # (not this turn's reply, which was just naming/disambiguating the pet).
        if intent_type in _NEEDS_CLINICAL_DETAIL and not _has_enough_detail(original_question):
            return 'early', {
                'answer': _detail_question(intent_type),
                'pending_intent': {
                    'type': intent_type, 'stage': 'need_detail',
                    'pet_id': pet_id, 'original_question': original_question
                },
                'structured': True
            }
        observations_text = original_question
    else:
        intent_type = None
        if FULL_HISTORY_SUMMARY.search(question):
            intent_type = 'full_history_summary'
        elif DRAFT_CONSULTATION_NOTE.search(question):
            intent_type = 'draft_consultation_note'
        elif AFTERCARE_INSTRUCTIONS.search(question):
            intent_type = 'aftercare_instructions'
        elif PRE_APPOINTMENT_BRIEFING.search(question):
            intent_type = 'pre_appointment_briefing'

        if intent_type is None:
            return None, None

        pet_name = _extract_pet_name(question)
        if not pet_name:
            return 'early', {
                'answer': "Which pet is this about?",
                'pending_intent': {'type': intent_type, 'stage': 'need_pet_name', 'original_question': question},
                'structured': True
            }

        # The vet may have already named the owner in this same message
        # ("summarize pet Duke's history - owner Kavindra Dissanayake") -
        # without checking for it here, a name shared by multiple pets
        # always triggered the disambiguation round-trip below even though
        # the question already disambiguated it, forcing the vet to repeat
        # information they'd just typed. Same OWNER_MENTION extraction the
        # disambiguate_pet stage above uses once asked - just applied a
        # turn earlier, when the answer was there from the start.
        owner_match = OWNER_MENTION.search(question)
        owner_name = owner_match.group(1) if owner_match else None

        conn = get_raw_db_connection()
        try:
            with conn.cursor() as cur:
                pet_rows = _find_pet_by_name(cur, pet_name, owner_name=owner_name)
        finally:
            conn.close()

        if not pet_rows:
            return 'early', {'answer': f'I couldn\'t find an active pet named "{pet_name}".', 'structured': True}

        if len(pet_rows) > 1:
            return 'early', {
                'answer': f'I found multiple pets named "{pet_name}" - which one did you mean?',
                'options': _owner_options(pet_rows),
                'pending_intent': {
                    'type': intent_type, 'stage': 'disambiguate_pet',
                    'pet_name': pet_name, 'original_question': question
                },
                'structured': True
            }

        pet_id = pet_rows[0][0]

        if intent_type in _NEEDS_CLINICAL_DETAIL and not _has_enough_detail(question):
            return 'early', {
                'answer': _detail_question(intent_type),
                'pending_intent': {
                    'type': intent_type, 'stage': 'need_detail', 'pet_id': pet_id, 'original_question': question
                },
                'structured': True
            }
        observations_text = question

    return 'dispatch', {'intent_type': intent_type, 'pet_id': pet_id, 'observations_text': observations_text}
