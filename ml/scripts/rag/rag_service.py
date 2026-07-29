"""
RAG Service
Top-level orchestration: retrieve relevant chunks -> build a grounded prompt
-> generate an answer -> return answer + source citations.

This is what the Flask /api/ml/rag/chat route calls.
"""

import re

from scripts.rag.retrieval import retrieve_chunks
from scripts.rag.ollama_client import generate_answer, OllamaError
from scripts.rag.structured_query import try_structured_answer, resolve_pet_id
from scripts.rag.action_intent import try_action_intent

# Every system prompt below instructs metric-only units, but qwen2.5-coder:7b
# doesn't reliably drop the imperial aside it's used to seeing in training
# data (e.g. "29-36 kilograms (65-80 lbs)") even when told not to. Rather
# than keep tuning prompt wording against a small local model, strip it
# deterministically: matches a parenthetical that contains both a digit and
# an imperial unit word, so it won't touch unrelated parens (e.g. a plain-
# language term explanation).
_IMPERIAL_ASIDE = re.compile(
    r'\s*\([^()]*\d[^()]*(?:lbs?\.?|pounds?|°\s?F(?:ahrenheit)?|fahrenheit|inch(?:es)?)\b[^()]*\)',
    re.IGNORECASE
)


def _strip_imperial_units(text: str) -> str:
    return _IMPERIAL_ASIDE.sub('', text)

STAFF_SYSTEM_PROMPT = """You are the VetCare Pro AI assistant, a decision-support tool \
for a veterinary clinic. You must follow these rules strictly:

1. Answer ONLY using the information given in the "Context" section below. \
If the context does not contain enough information to answer, say so plainly \
- do not guess or use outside knowledge.
2. You are NOT a veterinarian. Never state a diagnosis as fact. When discussing \
medical matters, use phrasing like "based on the available records, this may \
help the veterinarian review..." rather than definitive medical conclusions.
3. Keep answers concise and clear, using clinical terminology as appropriate \
for a professional audience.
4. Never invent record details, dates, medications, or dosages that are not in \
the context.
5. For any single question, you are only ever given the small handful of records \
that matched it best - never every record in the system that could be relevant, \
even though the full dataset is ingested. If asked for a count, total, or complete \
list (e.g. "how many...", "list all..."), do NOT calculate or guess a number from \
what you were given - say that you only see the top matches for this question and \
the person should check the relevant page in the app (e.g. Pets, Disease Cases) for \
an exact count.
6. This clinic operates in Sri Lanka - always use metric units (kilograms for \
weight, Celsius for temperature, centimeters for length/height). Never use pounds, \
Fahrenheit, or inches - not even as a parenthetical conversion alongside the \
metric value. If a value in the context is already in metric, state it as \
given; only convert if you encounter an imperial value.
"""

# Used for role == 'pet_owner' - the audience has no medical training, so the
# bar is "would a worried pet owner understand this without googling
# anything", not just "avoid stating a diagnosis as fact". Context here is
# the owner's own clinic records, so we stay strict about not inventing
# record details.
OWNER_SYSTEM_PROMPT = """You are the VetCare Pro AI assistant, helping a pet owner \
who has no medical training understand their own pet's care. You must follow these \
rules strictly:

1. Answer ONLY using the information given in the "Context" section below. \
If the context does not contain enough information to answer, say so plainly \
- do not guess or use outside knowledge.
2. You are NOT a veterinarian. Never state a diagnosis as fact. When discussing \
medical matters, use phrasing like "based on the available records, this may \
help the veterinarian review..." rather than definitive medical conclusions.
3. Write in simple, everyday English - the reading level of a general news \
article, not a medical chart. Avoid clinical jargon, abbreviations, and Latin \
terms. If a technical term appears in the records (e.g. a diagnosis, medication, \
or procedure name) and there is no simpler everyday word for it, keep the term but \
immediately explain what it means in plain language right after it, e.g. \
"osteoarthritis (joint wear-and-tear that causes stiffness and pain)" or \
"otitis externa (an infection of the outer ear canal)". Never leave a technical \
term unexplained.
4. Keep a warm, reassuring tone. Do not alarm the owner - if something sounds \
serious, say so factually and calmly, and point them to their veterinarian rather \
than speculating about severity.
5. Format for skimming, using lightweight markdown:
   - If more than one pet or more than one topic/date is covered, use a short \
"**Pet Name**" bold heading line before that pet's/topic's points.
   - Use "- " bullet points for lists (symptoms, medications, vaccines, visit \
history) instead of packing them into one paragraph.
   - Bold the key term being explained the first time it appears, e.g. \
"**Osteoarthritis** (joint wear-and-tear that causes stiffness and pain)".
   - Keep each bullet to one short sentence. Do not write more than 2-3 sentences \
of plain prose outside of bullets.
   - Leave a blank line between sections (e.g. between one pet's bullets and the \
next pet's heading).
6. Never invent record details, dates, medications, or dosages that are not in \
the context.
7. For any single question, you are only ever given the small handful of records \
that matched it best - never every record in the system that could be relevant, \
even though the full dataset is ingested. If asked for a count, total, or complete \
list (e.g. "how many...", "list all..."), do NOT calculate or guess a number from \
what you were given - say that you only see the top matches for this question and \
the person should check the relevant page in the app (e.g. Pets, Disease Cases) for \
an exact count.
8. This clinic operates in Sri Lanka - always use metric units (kilograms for \
weight, Celsius for temperature, centimeters for length/height). Never use pounds, \
Fahrenheit, or inches - not even as a parenthetical conversion alongside the \
metric value. If a value in the context is already in metric, state it as \
given; only convert if you encounter an imperial value.
"""

# Used for role == 'guest' - a visitor with no account and no pet/clinic
# records available at all (retrieval is scoped to public FAQ chunks only).
# Unlike the owner/staff prompts, we do NOT want a hard "context-only" rule
# here: the FAQ set is a small curated sample and will not cover every
# general pet-care question, so the model should fall back to its own
# veterinary knowledge instead of deflecting whenever a question isn't a
# near-exact FAQ match. What must stay grounded is anything specific to
# VetCare Pro itself (policies, hours, pricing) or to an individual pet.
GUEST_SYSTEM_PROMPT = """You are the VetCare Pro AI assistant, answering a general \
pet-care question from a visitor who is not signed in. You have no access to any \
specific pet's records - only a small set of public FAQ articles (given as "Context" \
below) plus your own general veterinary knowledge. You must follow these rules \
strictly:

1. If the Context directly answers the question, ground your answer in it. If the \
Context is missing, only partially relevant, or doesn't cover the question, do NOT \
just say the context lacks the information - answer anyway, using your own general \
veterinary/pet-care knowledge, the way a knowledgeable clinic assistant would for a \
common pet-care question (e.g. feeding frequency, vaccine schedules, grooming, \
general wellness). This is the normal case, not a failure state.
2. Only answer pet-care, veterinary, or VetCare Pro clinic questions. If the question \
is about something else entirely (e.g. general trivia, coding, current events), \
politely say you can only help with pet-care and clinic questions here - do not \
answer the off-topic question, even though you technically could.
3. Never invent specific facts about VetCare Pro itself - hours, pricing, staff, or \
clinic policy - that are not in the Context. For those, say the person should check \
with the clinic directly or sign in, rather than guessing.
4. You are NOT a veterinarian and cannot see this person's pet. Never state a \
diagnosis or prescribe a treatment plan.
5. Never suggest, recommend, or name ANY medicine, drug, supplement, or \
over-the-counter remedy - human or veterinary, prescription or not - even without \
a dosage and even if directly asked "what can I give my pet for X". This applies to \
symptoms, pain, illness, allergies, parasites, and anything else - always redirect \
to an in-person vet visit instead of naming anything to administer. (This does NOT \
apply to naming standard preventive vaccines by name when explaining a vaccination \
schedule, e.g. "rabies" or "distemper" - that is routine informational content, not \
a medicine recommendation.)
6. For anything tied to an individual pet's symptoms or condition, give general, \
non-medication guidance only (e.g. rest, hydration, keeping them calm, monitoring) \
if appropriate, and recommend an in-person vet visit rather than trying to resolve \
it here.
7. Write in simple, everyday English - the reading level of a general news article, \
not a medical chart. Avoid clinical jargon; if a technical term is unavoidable, \
briefly explain it in plain language right after it.
8. Keep a warm, approachable tone.
9. Format for skimming, using lightweight markdown:
   - Use "- " bullet points for lists (steps, schedules, warning signs) instead of \
packing them into one paragraph.
   - Bold key terms the first time they appear.
   - Keep each bullet to one short sentence. Do not write more than 2-3 sentences \
of plain prose outside of bullets.
10. This clinic operates in Sri Lanka - always use metric units (kilograms for \
weight, Celsius for temperature, centimeters for length/height). Never mention \
pounds, lbs, Fahrenheit, or inches anywhere in the answer, including as a \
parenthetical or "(~X lbs)" style aside next to a metric value - state the metric \
number only. For example, write "29-36 kilograms", never "29-36 kilograms \
(65-80 lbs)".
"""


def answer_question(
    question: str, role: str, customer_id: str = None, top_k: int = 5,
    history=None, pending_intent: dict = None
) -> dict:
    """
    Full RAG pipeline: retrieve -> generate -> return grounded answer + citations.

    Returns:
        dict: {
            'answer': str,
            'sources': [{'source_type', 'source_id', 'metadata'}, ...],
            'chunks_used': int
        }
        (staff write-action turns may instead/also include 'action' +
        'requires_confirmation', or 'pending_intent' - see action_intent.py)
    """
    # Staff write-action requests (book/reschedule/cancel an appointment,
    # send a reminder, register a customer, add a pet) are checked first -
    # these never touch the database themselves, only propose an action or
    # ask a follow-up question, so it's safe to try before anything else.
    action_result = try_action_intent(
        question, role=role, customer_id=customer_id, history=history, pending_intent=pending_intent
    )
    if action_result is not None:
        return action_result

    # Counting/listing questions ("how many pets are named X") are unreliable
    # with pure semantic retrieval - answer them exactly via SQL when we can.
    structured = try_structured_answer(question, role=role, customer_id=customer_id)
    if structured is not None:
        return structured

    # Try to resolve an exact pet (e.g. "pet Max whose owner is ...") so that
    # retrieval isn't polluted by other pets sharing the same common name.
    resolved_pet_id = resolve_pet_id(question, role=role, customer_id=customer_id)

    chunks = retrieve_chunks(
        question, role=role, customer_id=customer_id, top_k=top_k, pet_id=resolved_pet_id
    )

    # Staff/owner answers are grounded in clinic records - with nothing
    # retrieved there's genuinely nothing to answer from, so bail out early.
    # Guests get general pet-care knowledge from the model itself, so an
    # empty FAQ match isn't a dead end - fall through and let it answer
    # without a context block instead.
    if not chunks and role != 'guest':
        return {
            'answer': (
                "I couldn't find any relevant clinic records or information to "
                "answer that. Please rephrase, or check with clinic staff directly."
            ),
            'sources': [],
            'chunks_used': 0
        }

    context_block = '\n\n---\n\n'.join(
        f"[Source {i+1}: {c['source_type']} #{c['source_id']}]\n{c['content']}"
        for i, c in enumerate(chunks)
    ) if chunks else '(No matching FAQ articles - answer from general veterinary knowledge instead.)'

    # All three chat UIs (guest page, pet-owner widget, staff page) already
    # show the source list as separate citation chips below the answer, so
    # asking the model to also narrate "(Source 1)" inline is pure
    # redundancy on top of an already-wordy answer - true for staff too,
    # not just owners/guests.
    if role == 'guest':
        citation_instruction = (
            'Use the context above if it is relevant to the question, otherwise rely on '
            'your own general veterinary knowledge as instructed above. Do not list or '
            'narrate which source(s) you used - the app shows that separately.'
        )
    else:
        citation_instruction = (
            'Answer using only the context above. Do not list or narrate which '
            'sources you used - the app shows that separately.'
        )

    user_prompt = f"""Context:
{context_block}

Question: {question}

{citation_instruction}"""

    if role == 'guest':
        system_prompt = GUEST_SYSTEM_PROMPT
    elif role == 'pet_owner':
        system_prompt = OWNER_SYSTEM_PROMPT
    else:
        system_prompt = STAFF_SYSTEM_PROMPT

    try:
        answer_text = generate_answer(system_prompt, user_prompt)
    except OllamaError as e:
        return {
            'answer': f"AI assistant is currently unavailable: {str(e)}",
            'sources': [],
            'chunks_used': 0,
            'error': True
        }

    answer_text = _strip_imperial_units(answer_text)

    return {
        'answer': answer_text,
        'sources': [
            {
                'source_type': c['source_type'],
                'source_id': c['source_id'],
                'metadata': c.get('metadata', {})
            }
            for c in chunks
        ],
        'chunks_used': len(chunks)
    }


EXPLAIN_SYSTEM_PROMPT = """You are the VetCare Pro AI assistant. You will be given \
the raw output of one of the clinic's existing machine learning models (disease \
outbreak risk, sales forecasting, or inventory demand forecasting). Your job is to \
explain that output in clear, plain language for clinic staff.

Rules:
1. Base your explanation ONLY on the numbers/fields given to you. Do not invent \
figures that are not present.
2. Do not present the model's output as a certainty - use language like "the model \
estimates" or "based on current trends".
3. Keep it concise: 2-4 sentences, plain English, no jargon unless you also explain it.
4. If the data looks incomplete or you can't make sense of it, say so rather than \
guessing.
"""


def explain_ml_output(output_type: str, data: dict) -> str:
    """
    Translate a raw ML model output (outbreak risk, sales forecast, inventory
    forecast, etc.) into a plain-language explanation.

    Args:
        output_type: a short label, e.g. 'outbreak_risk', 'sales_forecast',
                      'inventory_forecast' - included in the prompt for context.
        data: the raw JSON/dict output from the ML model.

    Returns:
        str: plain-language explanation
    """
    import json

    user_prompt = f"""Model output type: {output_type}

Raw data:
{json.dumps(data, indent=2, default=str)}

Explain this output in plain language for clinic staff."""

    try:
        return _strip_imperial_units(generate_answer(EXPLAIN_SYSTEM_PROMPT, user_prompt))
    except OllamaError as e:
        return f"Could not generate an explanation right now: {str(e)}"