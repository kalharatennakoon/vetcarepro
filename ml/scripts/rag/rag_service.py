"""
RAG Service
Top-level orchestration: retrieve relevant chunks -> build a grounded prompt
-> generate an answer -> return answer + source citations.

This is what the Flask /api/ml/rag/chat route calls.
"""

import re

from scripts.rag.retrieval import retrieve_chunks
from scripts.rag.ollama_client import generate_answer, normalize_currency, OllamaError
from scripts.rag.structured_query import try_structured_answer, resolve_pet_id, find_pet_candidates, STAFF_ROLES
from scripts.rag.action_intent import try_action_intent
from scripts.rag.clinical_tools import try_clinical_tool
from scripts.rag.pet_health_intent import try_pet_health_intent
from scripts.rag.chart_intent import try_chart_intent

# Every system prompt below instructs metric-only units, but qwen2.5-coder:7b
# doesn't reliably drop the imperial aside it's used to seeing in training
# data (e.g. "29-36 kilograms (65-80 lbs)") even when told not to. Rather
# than keep tuning prompt wording against a small local model, strip it
# deterministically: matches a parenthetical that contains both a digit and
# an imperial unit word, so it won't touch unrelated parens (e.g. a plain-
# language term explanation).
_IMPERIAL_ASIDE = re.compile(
    r'\s*\([^()]*\d[^()]*(?:lbs?\.?|pounds?|°\s?F(?:ahrenheit)?|fahrenheit|(?<=\d)\s?F\b|inch(?:es)?)\b[^()]*\)',
    re.IGNORECASE
)


def _strip_imperial_units(text: str) -> str:
    return _IMPERIAL_ASIDE.sub('', text)


# Asking for the paragraph-then-bullets shape inside the main generation
# call - as a prose rule, repeated next to the question, even as a literal
# fill-in-the-blank template - was never enough on its own: qwen2.5-coder:7b
# kept relabeling the context's terse "field: value" chunk lines (see
# chunking.py's chunk_vaccination/chunk_medical_record) into grouped headers
# like "Vaccinations:"/"Medical Records:" regardless, because that one rule
# was competing against several others (units, currency, clinical tone,
# citation handling) in the same call. So the shape is now enforced by a
# separate follow-up reshape call instead (see _reshape_explain_summarize
# below) - this regex pair just decides whether that follow-up call runs.
_EXPLAIN_INTENT = re.compile(r'\bexplain\b|\bwhy\b', re.IGNORECASE)
_SUMMARIZE_INTENT = re.compile(r'\bsummar(?:y|ize|ise)\b', re.IGNORECASE)


def _wants_paragraph_and_bullets(question: str) -> bool:
    return bool(_EXPLAIN_INTENT.search(question) or _SUMMARIZE_INTENT.search(question))

STAFF_SYSTEM_PROMPT = """You are the VetCare Pro AI assistant, a decision-support tool \
for a veterinary clinic. You must follow these rules strictly:

1. Answer ONLY using the information given in the "Context" section below. \
If the context does not contain enough information to answer, say so plainly \
- do not guess or use outside knowledge.
2. You are NOT a veterinarian. Never state a diagnosis as fact. When discussing \
medical matters, use phrasing like "based on the available records, this may \
help the veterinarian review..." rather than definitive medical conclusions.
3. Match the answer to what's actually being asked, not just the topic:
   - If the question asks you to "explain" something (e.g. a pet's current health \
condition, a result, why a recommendation was made), answer in two parts: a short \
paragraph (2-4 sentences) that synthesizes the relevant facts from the Context into \
an actual explanation - connecting the diagnosis, current status, and relevant \
treatment/vaccination history into a coherent narrative - followed by a few key-point \
bullets for the specific dates/values a reader would want to double-check.
   - If the question asks you to "summarize" something, answer in two parts: a short \
paragraph (1-2 sentences) giving the overall takeaway, followed by a few key-point \
bullets for the facts that actually matter - omit anything routine or unremarkable \
rather than restating every record.
   - Either way, do NOT answer with grouped field-label lines or headings like \
"Vaccinations:" / "Medical Records:" followed by one line per record - that is a \
reformatted list, not an explanation or summary, even if each line is reworded from \
the source. The paragraph always comes first and is never replaced by the bullets.
   - For a plain factual question (a specific date, a status, a single value), just \
answer it directly - no paragraph-plus-bullets needed.
4. Keep answers concise and clear, using clinical terminology as appropriate \
for a professional audience.
5. Format for skimming, using lightweight markdown:
   - If more than one pet or more than one topic/date is covered, use a short \
"**Pet Name**" bold heading line before that pet's/topic's points.
   - Use "- " bullet points for lists (vaccinations, medications, visit history, \
findings, dates) instead of packing them into one paragraph.
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
9. Always state monetary amounts in Sri Lankan Rupees, written as "Rs. X" - never \
"$", "USD", or "dollars", even as a parenthetical conversion.
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
5. Match the answer to what's actually being asked, not just the topic:
   - If the question asks you to "explain" something (e.g. their pet's current \
health condition, a result, why a recommendation was made), answer in two parts: a \
short, plain-English paragraph (2-4 sentences) that weaves the relevant facts \
together - connecting the diagnosis, current status, and relevant treatment/ \
vaccination history into an actual explanation - followed by a few key-point \
bullets for the specific dates/values a reader would want to double-check.
   - If the question asks you to "summarize" something, answer in two parts: a \
short paragraph (1-2 sentences) giving the overall takeaway, followed by a few \
key-point bullets for the facts that actually matter - omit granular detail that \
doesn't change the takeaway.
   - Either way, do NOT answer with grouped field-label lines or headings like \
"Vaccinations:" / "Medical Records:" followed by one line per record - that is a \
reformatted list, not an explanation or summary, even if each line is reworded \
from the source. The paragraph always comes first and is never replaced by the \
bullets.
   - For a plain factual question (a specific date, a status, a single value), just \
answer it directly - no paragraph-plus-bullets needed.
6. Format for skimming, using lightweight markdown:
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
7. Never invent record details, dates, medications, or dosages that are not in \
the context.
8. For any single question, you are only ever given the small handful of records \
that matched it best - never every record in the system that could be relevant, \
even though the full dataset is ingested. If asked for a count, total, or complete \
list (e.g. "how many...", "list all..."), do NOT calculate or guess a number from \
what you were given - say that you only see the top matches for this question and \
the person should check the relevant page in the app (e.g. Pets, Disease Cases) for \
an exact count.
9. This clinic operates in Sri Lanka - always use metric units (kilograms for \
weight, Celsius for temperature, centimeters for length/height). Never use pounds, \
Fahrenheit, or inches - not even as a parenthetical conversion alongside the \
metric value. If a value in the context is already in metric, state it as \
given; only convert if you encounter an imperial value.
10. Always state monetary amounts in Sri Lankan Rupees, written as "Rs. X" - never \
"$", "USD", or "dollars", even as a parenthetical conversion.
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
11. If any monetary amount comes up, always state it in Sri Lankan Rupees, written \
as "Rs. X" - never "$", "USD", or "dollars".
"""

# Asking for the paragraph-then-bullets shape inside the main system prompt -
# even repeated right next to the question, even spelled out as a literal
# fill-in-the-blank template - was not enough on its own: qwen2.5-coder:7b
# kept relabeling the context's terse "field: value" chunk lines (see
# chunking.py's chunk_vaccination/chunk_medical_record) into grouped headers
# like "Vaccinations:"/"Medical Records:" regardless, because that one rule
# was competing against several others (units, currency, clinical tone,
# citation handling) in the same generation call. Splitting reformatting
# into its own follow-up call, with nothing else for the model to juggle,
# is far more reliable - this prompt's only job is the shape, and the facts
# are already locked in from the first pass, so there's nothing left for it
# to get wrong except the format.
_RESHAPE_SYSTEM_PROMPT = """You are a text reformatter, not a clinical assistant - you do \
not add, remove, or invent any fact. You will be given a draft answer that already contains \
all the correct facts, and must rewrite it into exactly this shape:

<a short paragraph of connected prose, 2-4 sentences, no heading>

Key points:
- <bullet 1>
- <bullet 2>
- <bullet 3, only if there is a genuinely distinct third point - omit otherwise>

Rules:
1. The paragraph is not optional and is never skipped, even when the draft itself is just a \
list. The FIRST thing you write must be a full sentence of plain prose - never start your \
answer with "Key points:" or with a bullet. If you find yourself about to write "Key points:" \
as the very first line, stop and write the paragraph first instead.
2. Exactly 2 or 3 bullets under "Key points:" - never more, and never fewer than 2 if the \
draft contains at least two distinct facts.
3. Never use any heading other than "Key points:" - drop any headings from the draft such as \
"Vaccinations:", "Medical Records:", "Current Health:", or "Next Due Dates:" and fold their \
content into the paragraph and bullets instead.
4. Do not repeat the same fact in both the paragraph and the bullets.
5. Keep every date, number, medication name, and unit exactly as written in the draft - do \
not change, round, or convert them.
6. Do not add any fact, caveat, or disclaimer that isn't already in the draft, and do not \
drop any fact from the draft either - this is a reformat, not a rewrite of the content.

Example:

Draft answer:
Vaccinations:
DHPP (Core): Administered on 2024-01-05, next due on 2027-01-05
Medical Records:
Visit on 2024-01-05: DHPP vaccination, animal in good health

Your output:
Max is up to date on his core DHPP vaccination, given in January 2024 with no issues noted \
at the visit.

Key points:
- DHPP (Core) administered 2024-01-05, next due 2027-01-05
- Visit note: animal in good health
"""


def _reshape_explain_summarize(question: str, draft_answer: str) -> str:
    user_prompt = f"""Original question: {question}

Draft answer to reformat (already fact-checked - only its shape needs to change):
{draft_answer}

Rewrite it now in the required shape. Remember: the paragraph comes first, always - do not \
start with "Key points:"."""
    try:
        return generate_answer(_RESHAPE_SYSTEM_PROMPT, user_prompt)
    except OllamaError:
        # Reformatting is a nice-to-have on top of an already-correct answer -
        # if the follow-up call fails, showing the unshaped draft beats
        # showing nothing.
        return draft_answer


def answer_question(
    question: str, role: str, customer_id: str = None, user_id: str = None, top_k: int = 5,
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

    # Clinical generation requests (full history summary, consultation note
    # draft, aftercare instructions, pre-appointment briefing) need the
    # COMPLETE record set for a pet, not a top-k RAG sample - checked next,
    # before falling to exact-SQL/RAG. Staff-only (admin/veterinarian); the
    # module itself gates on CLINICAL_STAFF_ROLES and returns None otherwise.
    clinical_result = try_clinical_tool(question, role=role, history=history, pending_intent=pending_intent)
    if clinical_result is not None:
        return clinical_result

    # Pet disease-recurrence risk, cancer risk, and clinic-wide pandemic risk
    # are live PetHealthPredictor computations, never ingested into
    # rag_chunks - checked next, same "live model, not RAG" reasoning as the
    # clinical tools above. Admin-only; the module itself gates on
    # PET_HEALTH_ADMIN_ROLES and returns None otherwise.
    pet_health_result = try_pet_health_intent(question, role=role, history=history, pending_intent=pending_intent)
    if pet_health_result is not None:
        return pet_health_result

    # Explicit "chart/graph/plot this" requests are checked BEFORE the plain
    # structured-query layer below, not after. Chart questions share their
    # nouns with patterns already covered there - "graph revenue by month"
    # contains the same "revenue" that BILLING_REVENUE_TIMEFRAME matches,
    # "chart appointments by status" the same "appointments ... status" as the
    # count-by-status pattern - and try_structured_answer has no notion of the
    # chart keyword, so whichever runs first claims the question outright.
    # Running it second would mean a chart request silently answered as a
    # one-line sentence. The reverse can't happen: try_chart_intent returns
    # None unless a trigger word is present, so a plain data question still
    # reaches the structured layer untouched.
    chart = try_chart_intent(question, role=role, user_id=user_id)
    if chart is not None:
        return chart

    # Counting/listing questions ("how many pets are named X") are unreliable
    # with pure semantic retrieval - answer them exactly via SQL when we can.
    structured = try_structured_answer(question, role=role, customer_id=customer_id)
    if structured is not None:
        return structured

    # Try to resolve an exact pet (e.g. "pet Max whose owner is ...") so that
    # retrieval isn't polluted by other pets sharing the same common name.
    resolved_pet_id = resolve_pet_id(question, role=role, customer_id=customer_id)

    # A name that matched MORE THAN ONE pet - or, just as dangerously, ZERO
    # pets - is not the same as "no pet mentioned". Staff can see pets across
    # every owner, so a common name like "Max" easily collides; a misspelled
    # or nonexistent name (e.g. "Luke" when no such pet exists) is just as
    # bad if silently ignored. Either way, falling through to unscoped,
    # clinic-wide retrieval here would let semantic search grab a completely
    # unrelated pet's (or several pets') records and hand them to the model
    # as "Context" for a question that names a specific pet - the model has
    # no way to know those records aren't about the pet asked about, and
    # will confidently present someone else's diagnosis as if it were
    # "Luke's". Ask/say so instead of guessing, the same "ask rather than
    # guess" discipline action_intent.py already uses for write-actions.
    if resolved_pet_id is None and role in (*STAFF_ROLES, 'pet_owner'):
        pet_name, candidates = find_pet_candidates(question, role=role, customer_id=customer_id)
        if pet_name and not candidates:
            return {
                'answer': (
                    f'I couldn\'t find a pet named "{pet_name}"'
                    + (' in the system' if role in STAFF_ROLES else ' in your account')
                    + ' - please double-check the spelling and try again.'
                ),
                'sources': [],
                'chunks_used': 0,
                'structured': True
            }
        if pet_name and len(candidates) > 1 and role in STAFF_ROLES:
            listing = '\n'.join(f'- {r[1]} (owner: {r[3]} {r[4]})' for r in candidates)
            return {
                'answer': (
                    f'There are {len(candidates)} pets named "{pet_name}" in the system - '
                    f'which one do you mean?\n{listing}'
                ),
                'sources': [],
                'chunks_used': 0,
                'options': [
                    {
                        'label': f'{r[1]} ({r[3]} {r[4]})',
                        # "pet <Name> whose owner is <Owner>" - not just any
                        # rephrasing: it has to actually round-trip through
                        # resolve_pet_id's own extraction patterns
                        # (PET_MENTION requires the literal "pet " trigger
                        # word; OWNER_MENTION picks up "owner is ..." after
                        # it). This is what actually gets sent to the
                        # backend when the option is picked - 'display' is
                        # what the chat bubble shows the user instead.
                        'value': f'pet {r[1]} whose owner is {r[3]} {r[4]}',
                        'display': f'{r[3]} {r[4]}'
                    }
                    for r in candidates
                ],
                'pending_intent': {'type': 'general_qa_disambiguation', 'original_question': question},
                'structured': True
            }

    # The turn that actually resolves a pet ("pet Max whose owner is
    # Nishantha Rajapaksa") is a mechanical resolution phrase, not a real
    # question - it carries none of the original "explain"/"summarize"/
    # whatever framing the user actually asked with. Retrieving and
    # generating against that phrase verbatim answers a different,
    # contentless question ("who is this pet") instead of the one the user
    # meant. Recover the real question from pending_intent (round-tripped by
    # the client the same way action_intent.py's slot-filling does) so
    # retrieval, generation, and the explain/summarize reshape below all see
    # what the user actually asked.
    effective_question = question
    if pending_intent and pending_intent.get('type') == 'general_qa_disambiguation':
        effective_question = pending_intent.get('original_question') or question

    # Give try_structured_answer a second look, now with BOTH pieces it
    # needed but couldn't have on the first call above: which pet (only
    # resolvable from the mechanical "pet X whose owner is Y" phrase, since
    # that's what disambiguated it) and what was actually asked (only
    # available as effective_question, recovered just above - the mechanical
    # phrase itself doesn't say "next appointment"/"vaccines"/whatever the
    # original question asked). Without this, a structured pattern needing a
    # disambiguated pet name - "when is <pet>'s next appointment" being the
    # sharpest example, since appointments have no RAG fallback at all - can
    # never fire post-disambiguation and silently degrades to unscoped
    # retrieval over whatever chunk type happens to look semantically
    # similar (e.g. an unrelated disease-case chunk), producing a fluent but
    # wrong answer instead of the exact one this module exists to give.
    if effective_question != question and resolved_pet_id:
        structured = try_structured_answer(
            effective_question, role=role, customer_id=customer_id, known_pet_id=resolved_pet_id
        )
        if structured is not None:
            return structured

    chunks = retrieve_chunks(
        effective_question, role=role, customer_id=customer_id, top_k=top_k, pet_id=resolved_pet_id
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

Question: {effective_question}

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

    # normalize_currency assumes any "$"/"USD"/"dollars" figure is really an
    # LKR amount the model mislabeled - true for clinic data (billing/pricing
    # fields are always LKR at the source), but not for a guest's ungrounded
    # general-knowledge answer (no FAQ chunk matched), where a dollar figure
    # is more likely a genuine foreign reference amount. Relabeling that
    # preserves the digits and only swaps the currency word would misrepresent
    # the value by ~300x, so skip normalization in that specific case.
    is_guest_ungrounded = role == 'guest' and not chunks

    def _normalize(text: str) -> str:
        text = _strip_imperial_units(text)
        return text if is_guest_ungrounded else normalize_currency(text)

    answer_text = _normalize(answer_text)

    if _wants_paragraph_and_bullets(effective_question):
        answer_text = _normalize(_reshape_explain_summarize(effective_question, answer_text))

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
outbreak risk, individual pet disease/cancer risk, clinic-wide pandemic risk, sales \
forecasting, or inventory demand forecasting). Your job is to explain that output in \
clear, plain language for clinic staff.

Rules:
1. Base your explanation ONLY on the numbers/fields given to you. Do not invent \
figures that are not present.
2. Do not present the model's output as a certainty - use language like "the model \
estimates" or "based on current trends". This applies doubly to individual pet \
disease/cancer risk figures: these are statistical estimates from breed/age/history \
data, never a diagnosis - make that explicit rather than stating a pet "has" or \
"will get" a condition.
3. Keep it concise: 2-4 sentences, plain English, no jargon unless you also explain it.
4. If the data looks incomplete or you can't make sense of it, say so rather than \
guessing.
5. This clinic operates in Sri Lanka - any revenue, cost, or price figure in the data \
is in Sri Lankan Rupees, even though the field itself carries no currency label. \
Always present it as "Rs. X", never "$", "USD", or "dollars".
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
        return normalize_currency(_strip_imperial_units(generate_answer(EXPLAIN_SYSTEM_PROMPT, user_prompt)))
    except OllamaError as e:
        return f"Could not generate an explanation right now: {str(e)}"