"""
Pet Health Intent
Detects admin questions asking for a live prediction from PetHealthPredictor
(ml/scripts/pet_health_predictor.py): a specific pet's disease-recurrence
risk, a specific pet's cancer/tumor risk, or the clinic-wide pandemic risk
assessment. PetHealthPredictor is a stateless, DB-query-backed class with no
trained-artifact dependency (unlike the sales/inventory/.pkl models), so it's
cheap to instantiate fresh per call rather than needing a pre-warmed
singleton.

Same reasoning as clinical_tools.py and the inline outbreak-risk/revenue-
forecast/inventory-forecast blocks in ml/app.py's rag_chat(): these are live
model computations, never ingested into rag_chunks, so plain RAG retrieval
has nothing relevant to find and would otherwise stitch together an answer
from unrelated chunks. Route them to the actual predictor instead, then
explain the raw output in plain language via rag_service.explain_ml_output
(blocking) or stream_explain_ml_output (real-time streamed, admin-only
"show reasoning" view) - the same two-step "compute, then explain" pattern
already used for the other three prediction types. explain_ml_output/
stream_explain_ml_output are imported inside each function rather than at
module load time, matching how ml/app.py itself imports explain_ml_output
(app.py:1319) - rag_service.py imports _route_pet_health_intent,
run_pet_health_generation, and stream_pet_health_generation from this
module, so a top-level import back would be circular.

Admin-only (not admin+veterinarian like clinical_tools.py's clinical-detail
tools) - a deliberately narrower gate for this specific feature, per product
decision, even though it draws on the same disease_cases data clinicians see
elsewhere.

Note: PetHealthPredictor.predict_outbreak_trend is deliberately NOT wired in
here. Any question mentioning "outbreak risk" or "outbreak trend" is already
intercepted upstream by ml/app.py's rag_chat() (regex
`outbreak\\s*(risk|trend)|disease\\s+outbreak`) and routed to
DiseasePredictionModel.predict_outbreak_risk() before answer_question() (and
therefore this module) ever runs - a second, unreachable regex for the same
phrase would be dead code. Reconciling that would mean changing the existing
outbreak-risk routing, which is out of scope here.
"""

import re
from datetime import date

from config.db_connection import get_raw_db_connection
from scripts.rag.action_intent import _find_pet_by_name
from scripts.rag.clinical_tools import _extract_pet_name, _owner_options

PET_HEALTH_ADMIN_ROLES = {'admin'}

CANCER_RISK = re.compile(r'\bcancer\b|\btumor\b', re.IGNORECASE)
PANDEMIC_RISK = re.compile(r'\bpandemic\b', re.IGNORECASE)
INDIVIDUAL_DISEASE_RISK = re.compile(
    r'\bdisease\s+risk\b|\brisk\s+of\s+(?:disease|illness|relapse|recurrence)\b|'
    r'\b(?:what|which)\s+diseases?\b.*\b(?:might|could|likely)\b|'
    r'\bhealth\s+risk\b.*\bpredict',
    re.IGNORECASE
)

_PREPARERS = {}  # populated below, after the prepare functions are defined


def _age_months(date_of_birth) -> int:
    if not date_of_birth:
        return None
    today = date.today()
    return max((today.year - date_of_birth.year) * 12 + (today.month - date_of_birth.month), 0)


def _fetch_pet_basics(cur, pet_id: str):
    cur.execute(
        "SELECT pet_name, species, breed, gender, date_of_birth FROM pets WHERE pet_id = %s",
        (pet_id,)
    )
    return cur.fetchone()


def _fetch_past_disease_categories(cur, pet_id: str) -> list:
    cur.execute(
        "SELECT disease_category FROM disease_cases WHERE pet_id = %s AND disease_category IS NOT NULL",
        (pet_id,)
    )
    return [{'disease_category': row[0]} for row in cur.fetchall()]


def _prepare_individual_disease_risk(pet_id: str, question: str) -> tuple:
    from scripts.pet_health_predictor import PetHealthPredictor

    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            pet_row = _fetch_pet_basics(cur, pet_id)
            if not pet_row:
                return 'early', {'answer': "I couldn't find that pet's record.", 'structured': True}
            pet_name, species, breed, gender, dob = pet_row
            past_diseases = _fetch_past_disease_categories(cur, pet_id)
    finally:
        conn.close()

    result = PetHealthPredictor().predict_individual_risk(
        species=species, breed=breed, age_months=_age_months(dob), past_diseases=past_diseases
    )
    result['pet_name'] = pet_name

    return 'explain', {
        'output_type': 'pet_disease_risk',
        'data': result,
        'source': {'source_type': 'pet_disease_risk_model', 'source_id': pet_id, 'metadata': {}}
    }


def _prepare_cancer_risk(pet_id: str, question: str) -> tuple:
    from scripts.pet_health_predictor import PetHealthPredictor

    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            pet_row = _fetch_pet_basics(cur, pet_id)
            if not pet_row:
                return 'early', {'answer': "I couldn't find that pet's record.", 'structured': True}
            pet_name, species, breed, gender, dob = pet_row
    finally:
        conn.close()

    # predict_cancer_risk only branches on sex == 'Female' (mammary-tumor
    # screening note) - the db stores gender lowercase ('male'/'female'/
    # 'unknown'), so it has to be capitalized or that branch silently never
    # fires.
    sex = {'male': 'Male', 'female': 'Female'}.get((gender or '').lower())

    result = PetHealthPredictor().predict_cancer_risk(
        species=species, breed=breed, age_months=_age_months(dob), sex=sex
    )
    result['pet_name'] = pet_name

    return 'explain', {
        'output_type': 'cancer_risk',
        'data': result,
        'source': {'source_type': 'cancer_risk_model', 'source_id': pet_id, 'metadata': {}}
    }


def _prepare_pandemic_risk(pet_id: str, question: str) -> tuple:
    from scripts.pet_health_predictor import PetHealthPredictor

    result = PetHealthPredictor().assess_pandemic_risk()
    return 'explain', {
        'output_type': 'pandemic_risk',
        'data': result,
        'source': {'source_type': 'pandemic_risk_model', 'source_id': 'current', 'metadata': {}}
    }


def _finalize_pet_health(explanation: str, reasoning, prep: dict) -> dict:
    result = {'answer': explanation, 'sources': [prep['source']], 'chunks_used': 0, 'structured': True}
    if reasoning:
        result['reasoning'] = reasoning
    return result


def run_pet_health_generation(intent_type: str, pet_id: str, question: str, role: str) -> dict:
    """
    Runs the actual live-model + explanation step for a matched pet-health
    intent (called by rag_service.answer_question once
    _route_pet_health_intent has resolved a pet/intent) - blocking, via
    explain_ml_output. See
    stream_pet_health_generation for the real-time streamed counterpart.
    """
    from scripts.rag.rag_service import explain_ml_output, _wants_paragraph_and_bullets

    prep_kind, prep = _PREPARERS[intent_type](pet_id, question)
    if prep_kind == 'early':
        return prep

    # Same "only think for explain/summarize questions" gating as the other
    # three generation paths in rag_service.py/app.py.
    think = role == 'admin' and _wants_paragraph_and_bullets(question)
    explanation, reasoning = explain_ml_output(prep['output_type'], prep['data'], think=think)
    return _finalize_pet_health(explanation, reasoning, prep)


def stream_pet_health_generation(intent_type: str, pet_id: str, question: str, role: str):
    """
    Streaming counterpart to run_pet_health_generation, for the admin-only
    real-time "show reasoning" chat view - surfaces reasoning deltas as
    they're produced via stream_explain_ml_output instead of only after the
    full explanation is ready.

    Yields:
        dict: {'type': 'reasoning_delta', 'text': str} zero or more times,
            followed by exactly one {'type': 'final', 'result': dict}
    """
    from scripts.rag.rag_service import stream_explain_ml_output, _wants_paragraph_and_bullets

    prep_kind, prep = _PREPARERS[intent_type](pet_id, question)
    if prep_kind == 'early':
        yield {'type': 'final', 'result': prep}
        return

    explanation = ''
    reasoning = None
    think = role == 'admin' and _wants_paragraph_and_bullets(question)
    for event in stream_explain_ml_output(prep['output_type'], prep['data'], think=think):
        if event['type'] == 'reasoning_delta':
            yield event
        elif event['type'] == 'done':
            explanation = event['explanation']
            reasoning = event['reasoning']

    yield {'type': 'final', 'result': _finalize_pet_health(explanation, reasoning, prep)}


_PREPARERS.update({
    'individual_disease_risk': _prepare_individual_disease_risk,
    'cancer_risk': _prepare_cancer_risk,
    'pandemic_risk': _prepare_pandemic_risk,
})

# pandemic_risk is clinic-wide - it never needs a pet resolved.
_NEEDS_PET = {'individual_disease_risk', 'cancer_risk'}


def _route_pet_health_intent(question: str, role: str, history=None, pending_intent: dict = None) -> tuple:
    """
    Detects and progresses a pet-health-prediction request (individual
    disease risk, cancer risk, or clinic-wide pandemic risk), stopping short
    of the actual live-model + explanation call so rag_service.answer_question
    (blocking) and stream_answer_question (real-time streamed, admin-only
    "show reasoning" view) can each run that final step their own way, via
    run_pet_health_generation/stream_pet_health_generation. Admin-only.

    Returns:
        tuple: (None, None) - role not allowed, or `question` doesn't match
            a known intent (caller should fall through to
            try_structured_answer / RAG)
          ('early', dict) - fully resolved already (disambiguation prompts,
            "couldn't find pet") - nothing left to generate
          ('dispatch', {'intent_type', 'pet_id', 'question'}) - a pet (or,
            for pandemic_risk, no pet at all) and intent are resolved, ready
            for run_pet_health_generation/stream_pet_health_generation
    """
    if role not in PET_HEALTH_ADMIN_ROLES:
        return None, None

    if pending_intent and pending_intent.get('type') in _PREPARERS:
        intent_type = pending_intent['type']
        stage = pending_intent.get('stage')

        conn = get_raw_db_connection()
        try:
            with conn.cursor() as cur:
                if stage == 'need_pet_name':
                    # This turn's whole reply is the pet's name.
                    id_rows = _find_pet_by_name(cur, question.strip())
                elif stage == 'disambiguate_pet':
                    # This turn's whole reply is the owner's name - either
                    # typed, or sent verbatim by clicking one of the option
                    # buttons offered below.
                    id_rows = _find_pet_by_name(cur, pending_intent.get('pet_name'), owner_name=question)
                else:
                    return None, None
        finally:
            conn.close()

        if not id_rows:
            return 'early', {
                'answer': "I still couldn't find a matching pet - could you double-check the name?",
                'structured': True
            }
        if len(id_rows) > 1:
            return 'early', {
                'answer': f'I found multiple pets named "{id_rows[0][1]}" - which one did you mean?',
                'options': _owner_options(id_rows),
                'pending_intent': {
                    'type': intent_type, 'stage': 'disambiguate_pet', 'pet_name': id_rows[0][1]
                },
                'structured': True
            }

        return 'dispatch', {'intent_type': intent_type, 'pet_id': id_rows[0][0], 'question': question}

    intent_type = None
    if CANCER_RISK.search(question):
        intent_type = 'cancer_risk'
    elif PANDEMIC_RISK.search(question):
        intent_type = 'pandemic_risk'
    elif INDIVIDUAL_DISEASE_RISK.search(question):
        intent_type = 'individual_disease_risk'

    if intent_type is None:
        return None, None

    if intent_type not in _NEEDS_PET:
        return 'dispatch', {'intent_type': intent_type, 'pet_id': None, 'question': question}

    pet_name = _extract_pet_name(question)
    if not pet_name:
        return 'early', {
            'answer': "Which pet is this about?",
            'pending_intent': {'type': intent_type, 'stage': 'need_pet_name'},
            'structured': True
        }

    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            id_rows = _find_pet_by_name(cur, pet_name)
    finally:
        conn.close()

    if not id_rows:
        return 'early', {'answer': f'I couldn\'t find an active pet named "{pet_name}".', 'structured': True}
    if len(id_rows) > 1:
        return 'early', {
            'answer': f'I found multiple pets named "{pet_name}" - which one did you mean?',
            'options': _owner_options(id_rows),
            'pending_intent': {'type': intent_type, 'stage': 'disambiguate_pet', 'pet_name': pet_name},
            'structured': True
        }

    return 'dispatch', {'intent_type': intent_type, 'pet_id': id_rows[0][0], 'question': question}
