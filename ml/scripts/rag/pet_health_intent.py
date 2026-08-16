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
explain the raw output in plain language via rag_service.explain_ml_output -
the same two-step "compute, then explain" pattern already used for the other
three prediction types. explain_ml_output is imported inside each resolver
function rather than at module load time, matching how ml/app.py itself
imports it (app.py:1319) - rag_service.py will import try_pet_health_intent
from this module, so a top-level import back would be circular.

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

_RESOLVERS = {}  # populated below, after the resolver functions are defined


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


def _resolve_individual_disease_risk(pet_id: str, question: str) -> dict:
    from scripts.pet_health_predictor import PetHealthPredictor
    from scripts.rag.rag_service import explain_ml_output

    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            pet_row = _fetch_pet_basics(cur, pet_id)
            if not pet_row:
                return {'answer': "I couldn't find that pet's record.", 'structured': True}
            pet_name, species, breed, gender, dob = pet_row
            past_diseases = _fetch_past_disease_categories(cur, pet_id)
    finally:
        conn.close()

    result = PetHealthPredictor().predict_individual_risk(
        species=species, breed=breed, age_months=_age_months(dob), past_diseases=past_diseases
    )
    result['pet_name'] = pet_name

    explanation, reasoning = explain_ml_output('pet_disease_risk', result, think=True)
    return {
        'answer': explanation,
        'sources': [{'source_type': 'pet_disease_risk_model', 'source_id': pet_id, 'metadata': {}}],
        'chunks_used': 0,
        'structured': True,
        **({'reasoning': reasoning} if reasoning else {})
    }


def _resolve_cancer_risk(pet_id: str, question: str) -> dict:
    from scripts.pet_health_predictor import PetHealthPredictor
    from scripts.rag.rag_service import explain_ml_output

    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            pet_row = _fetch_pet_basics(cur, pet_id)
            if not pet_row:
                return {'answer': "I couldn't find that pet's record.", 'structured': True}
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

    explanation, reasoning = explain_ml_output('cancer_risk', result, think=True)
    return {
        'answer': explanation,
        'sources': [{'source_type': 'cancer_risk_model', 'source_id': pet_id, 'metadata': {}}],
        'chunks_used': 0,
        'structured': True,
        **({'reasoning': reasoning} if reasoning else {})
    }


def _resolve_pandemic_risk(pet_id: str, question: str) -> dict:
    from scripts.pet_health_predictor import PetHealthPredictor
    from scripts.rag.rag_service import explain_ml_output

    result = PetHealthPredictor().assess_pandemic_risk()
    explanation, reasoning = explain_ml_output('pandemic_risk', result, think=True)
    return {
        'answer': explanation,
        'sources': [{'source_type': 'pandemic_risk_model', 'source_id': 'current', 'metadata': {}}],
        'chunks_used': 0,
        'structured': True,
        **({'reasoning': reasoning} if reasoning else {})
    }


_RESOLVERS.update({
    'individual_disease_risk': _resolve_individual_disease_risk,
    'cancer_risk': _resolve_cancer_risk,
    'pandemic_risk': _resolve_pandemic_risk,
})

# pandemic_risk is clinic-wide - it never needs a pet resolved.
_NEEDS_PET = {'individual_disease_risk', 'cancer_risk'}


def try_pet_health_intent(question: str, role: str, history=None, pending_intent: dict = None) -> dict:
    """
    Detects and progresses a pet-health-prediction request (individual
    disease risk, cancer risk, or clinic-wide pandemic risk). Admin-only -
    returns None for any other role, or if `question` doesn't match a known
    intent (caller should fall through to try_structured_answer / RAG).
    """
    if role not in PET_HEALTH_ADMIN_ROLES:
        return None

    if pending_intent and pending_intent.get('type') in _RESOLVERS:
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
                    return None
        finally:
            conn.close()

        if not id_rows:
            return {
                'answer': "I still couldn't find a matching pet - could you double-check the name?",
                'structured': True
            }
        if len(id_rows) > 1:
            return {
                'answer': f'I found multiple pets named "{id_rows[0][1]}" - which one did you mean?',
                'options': _owner_options(id_rows),
                'pending_intent': {
                    'type': intent_type, 'stage': 'disambiguate_pet', 'pet_name': id_rows[0][1]
                },
                'structured': True
            }

        return _RESOLVERS[intent_type](id_rows[0][0], question)

    intent_type = None
    if CANCER_RISK.search(question):
        intent_type = 'cancer_risk'
    elif PANDEMIC_RISK.search(question):
        intent_type = 'pandemic_risk'
    elif INDIVIDUAL_DISEASE_RISK.search(question):
        intent_type = 'individual_disease_risk'

    if intent_type is None:
        return None

    if intent_type not in _NEEDS_PET:
        return _RESOLVERS[intent_type](None, question)

    pet_name = _extract_pet_name(question)
    if not pet_name:
        return {
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
        return {'answer': f'I couldn\'t find an active pet named "{pet_name}".', 'structured': True}
    if len(id_rows) > 1:
        return {
            'answer': f'I found multiple pets named "{pet_name}" - which one did you mean?',
            'options': _owner_options(id_rows),
            'pending_intent': {'type': intent_type, 'stage': 'disambiguate_pet', 'pet_name': pet_name},
            'structured': True
        }

    return _RESOLVERS[intent_type](id_rows[0][0], question)
