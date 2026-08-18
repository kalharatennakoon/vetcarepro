"""
RAG Service
Top-level orchestration: retrieve relevant chunks -> build a grounded prompt
-> generate an answer -> return answer + source citations.

This is what the Flask /api/ml/rag/chat route calls.
"""

import re

from scripts.rag.retrieval import retrieve_chunks
from scripts.rag.ollama_client import generate_answer, stream_chat, normalize_currency, strip_non_english, OllamaError
from scripts.rag.structured_query import try_structured_answer, resolve_pet_id, find_pet_candidates, STAFF_ROLES
from scripts.rag.action_intent import try_action_intent
from scripts.rag.clinical_tools import _route_clinical_tool, run_clinical_generation, stream_clinical_generation
from scripts.rag.pet_health_intent import (
    _route_pet_health_intent, run_pet_health_generation, stream_pet_health_generation
)
from scripts.rag.chart_intent import try_chart_intent

# Every system prompt below instructs metric-only units, but small local chat
# models don't reliably drop the imperial aside they're used to seeing in
# training data (e.g. "29-36 kilograms (65-80 lbs)") even when told not to.
# Rather than keep tuning prompt wording per-model, strip it deterministically
# as a model-agnostic safety net: matches a parenthetical that contains both a
# digit and an imperial unit word, so it won't touch unrelated parens (e.g. a
# plain-language term explanation) - a no-op when the model already gets it right.
_IMPERIAL_ASIDE = re.compile(
    r'\s*\([^()]*\d[^()]*(?:lbs?\.?|pounds?|°\s?F(?:ahrenheit)?|fahrenheit|(?<=\d)\s?F\b|inch(?:es)?)\b[^()]*\)',
    re.IGNORECASE
)


def _strip_imperial_units(text: str) -> str:
    return _IMPERIAL_ASIDE.sub('', text)


# Asking for the paragraph-then-bullets shape inside the main generation
# call - as a prose rule, repeated next to the question, even as a literal
# fill-in-the-blank template - was never enough on its own: the model kept
# relabeling the context's terse "field: value" chunk lines (see
# chunking.py's chunk_vaccination/chunk_medical_record) into grouped headers
# like "Vaccinations:"/"Medical Records:" regardless, because that one rule
# was competing against several others (units, currency, clinical tone,
# citation handling) in the same call. So the shape is now enforced by a
# separate follow-up reshape call instead (see _reshape_explain_summarize
# below) - this regex pair just decides whether that follow-up call runs.
# NOTE: this was diagnosed against qwen2.5-coder:7b specifically and hasn't
# been re-verified since - the chat model has since moved to
# qwen2.5:7b-instruct and now qwen3:8b. If a future pass confirms the
# current model holds the shape in one call, this reshape call can likely
# be dropped to save the extra round-trip.
_EXPLAIN_INTENT = re.compile(r'\bexplain\b|\bwhy\b', re.IGNORECASE)
_SUMMARIZE_INTENT = re.compile(r'\bsummar(?:y|ize|ise)\b', re.IGNORECASE)

# A yes/no clinical-judgment question ("does he need any vitamins?", "is he
# due for his rabies shot?", "has he been given anything for it?", "should I
# bring him in?") is just as much a synthesis question as an "explain"/
# "summarize" one - answering it well means weaving together several
# records into a real judgment call, not a one-line lookup - so it gets the
# same paragraph-then-bullets treatment (and, for admin, the same reasoning
# pass - see the `think=` call sites below). This is also what actually
# closes the "bundled multi-part question" gap from STAFF_SYSTEM_PROMPT/
# OWNER_SYSTEM_PROMPT rule 3/7 (answer every sub-question explicitly): a
# question like "why does he seem off? does he need medicine?" hits
# _EXPLAIN_INTENT via "why" already, but a lone "does he need medicine?"
# with no "why"/"explain"/"summarize" at all previously skipped the reshape
# pass entirely and got no structural push toward a direct answer.
_JUDGMENT_INTENT = re.compile(
    r'\b(?:does|do|did)\b.{0,40}\bneeds?\b|'
    r'\bneeds?\s+(?:any|a|an)\b|'
    r'\b(?:is|are)\b.{0,40}\bdue\b|'
    r'\b(?:has|have)\b.{0,40}\bbeen\s+given\b|'
    r'\bshould\s+(?:i|we)\b',
    re.IGNORECASE
)


def _wants_paragraph_and_bullets(question: str) -> bool:
    return bool(
        _EXPLAIN_INTENT.search(question)
        or _SUMMARIZE_INTENT.search(question)
        or _JUDGMENT_INTENT.search(question)
    )


# "Summarize my pet's health condition" from an owner with more than one pet
# is not the same ambiguity as "does my pet need medicine" - the owner is
# explicitly asking for a broad rundown, not naming (even implicitly) one
# specific pet. retrieve_chunks' pet_owner branch already ranks chunks fairly
# across every pet on the account for exactly this shape of question (see
# retrieval.py's "what health issues do my pets have?" example) - used below
# to skip the multi-pet disambiguation prompt and let a question matching
# this straight through to that per-pet-fair-sampling retrieval instead,
# rather than making the owner pick just one pet for a question that was
# never about just one. Deliberately narrower than _SUMMARIZE_INTENT alone:
# "summarize Max's health" (a named pet) never reaches this check at all
# (resolved_pet_id already narrows it down before this fires), so this only
# ever affects the genuinely-unscoped "my pet(s)" phrasing.
_BROAD_MULTI_PET_INTENT = re.compile(
    r'\bsummar(?:y|ize|ise)\b|\beverything\s+about\b|\boverall\s+health\b|'
    r'\bhow\s+(?:are|is)\b.{0,20}\b(?:doing|health)\b',
    re.IGNORECASE
)

# A stronger, standalone signal than _BROAD_MULTI_PET_INTENT above: the
# owner used the PLURAL "pets"/"dogs"/etc, not "pet"/"dog" - SELF_PET_MENTION
# in structured_query.py matches both ("s?" makes the plural optional) and
# can't tell them apart on its own, but grammatically "my pets" is never
# asking about just one, regardless of which verb/keyword surrounds it (e.g.
# "explain my pets' current health issues" says nothing that
# _BROAD_MULTI_PET_INTENT's word list catches - no "summarize", no
# "overall" - the plural noun alone is what actually disambiguates it).
# Checked independently of, not instead of, _BROAD_MULTI_PET_INTENT below.
_PLURAL_SELF_PET_MENTION = re.compile(
    r'\bmy\s+(?:pets|dogs|cats|puppies|kittens|companions)\b', re.IGNORECASE
)


# Used only by the "no relevant chunks" bail-out below - a pet can have zero
# ingested records at all (never seen the clinic, or a demo/test account
# with no history on file), which is a real, valid state, not a bug. But a
# flat "I couldn't find anything, please rephrase" leaves a genuine symptom
# question ("why does he seem off?", "does he need vitamins?") as a dead
# end with no guidance at all - see the answer built below, which appends a
# general, non-diagnostic safety note when this matches.
_SYMPTOM_CONCERN = re.compile(
    r'\b(?:not\s+(?:well|feeling\s+well|himself|herself)|unwell|sick|ill|lethargic|'
    r'symptom|vitamins?|medicine|medication|supplement)\b',
    re.IGNORECASE
)

STAFF_SYSTEM_PROMPT = """You are VetCare Pro's veterinary copilot - a decision-support \
assistant working alongside the clinic's veterinarians, admin, and receptionists, never \
in place of their clinical judgment. You must follow these rules strictly:

1. Answer ONLY using the information given in the "Context" section below. \
If the context does not contain enough information to answer, say so plainly \
- do not guess or use outside knowledge.
2. You are NOT a veterinarian. Never state a diagnosis as fact. The Context is \
historical clinic records, never a live observation of the pet right now - if the \
question assumes a current/"today" state (e.g. "why does he seem unwell today?"), \
do not present what's in a past record as if it were confirmed to be happening now. \
Say plainly that there's no record of today, then use hedged language grounded in \
the pattern in the records (e.g. "if he's showing similar signs to the January \
flare noted in his history, this could be a related flare-up") rather than \
restating a past episode as an ongoing fact. When discussing medical matters more \
generally, use phrasing like "based on the available records, this may help the \
veterinarian review..." rather than definitive medical conclusions.
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
   - When the question bundles more than one distinct sub-question (e.g. "why is he \
unwell? does he need medicine?"), answer EACH one explicitly, grounded in the \
Context - do not fold a direct yes/no question into narrative that only implies the \
answer, and do not let it surface only as an unlabeled bullet point among others. \
Any sub-question phrased as yes/no ("does he need X?", "is he due for Y?", "has Z \
been given?") - about medication, vitamins/supplements, follow-up care, vaccination, \
or anything else - gets an explicit "Yes"/"No"/"Not noted in the records" as its own \
sentence, immediately followed by the supporting fact, e.g. "Yes - Omega-3 fatty \
acids were added to his regimen on 2025-09-15" rather than leaving that fact to \
speak for itself in a bullet list. The person asking should never have to re-ask, or \
infer from a bullet, a part of their question that was already right there in what \
they typed.
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
2. You are NOT a veterinarian. Never state a diagnosis as fact. The Context is \
historical clinic records, never a live observation of the pet right now - if the \
question assumes a current/"today" state (e.g. "why does he seem unwell today?"), \
do not present what's in a past record as if it were confirmed to be happening now. \
Say plainly that there's no record of today, then use hedged language grounded in \
the pattern in the records (e.g. "if he's showing similar signs to the January \
flare noted in his history, this could be a related flare-up") rather than \
restating a past episode as an ongoing fact. When discussing medical matters more \
generally, use phrasing like "based on the available records, this may help the \
veterinarian review..." rather than definitive medical conclusions.
3. Never suggest, recommend, or invent a NEW medicine, drug, supplement, or vitamin \
that isn't already documented in the records - even without a dosage, and even if \
the owner asks for one directly (e.g. "does he need vitamins?", "what can I give \
her for X?"). For that kind of forward-looking question, always redirect to their \
veterinarian instead of guessing or naming anything new - only a vet examining the \
pet now can say what's appropriate today. This is different from RECALLING a \
medication already in the records: if the Context shows something was prescribed \
or added (ongoing or past), you may state that fact plainly by name (e.g. \
"Gabapentin was added to his plan on 2026-01-14") - reporting an existing \
prescription is not the same as recommending one, and an owner needs to know what \
their pet is or has been taking. Don't let that fact alone stand in for an answer \
to a forward-looking question, though - a renewal or change to it still needs the \
vet redirect above. (This does NOT apply to naming standard preventive vaccines by \
name when answering a vaccination question, e.g. "rabies" or "DHPP" - that is \
routine informational content, not a medicine recommendation.)
4. If the owner's question includes a symptom, wellness, or "should I do X" concern \
that the Context doesn't fully resolve (e.g. "why does he seem off?", "does he need \
vitamins?", asked alongside or instead of a record-lookup question), do not silently \
drop that part of the question just because the records don't cover it. Explicitly \
acknowledge it, offer general, non-medication guidance if appropriate (e.g. rest, \
hydration, monitoring, keeping them comfortable), and recommend an in-person vet \
visit for anything the records don't already resolve - the owner should get a clear \
answer to every part of what they asked, not just whichever part happened to match \
a record.
5. Write in simple, everyday English - the reading level of a general news \
article, not a medical chart. Avoid clinical jargon, abbreviations, and Latin \
terms. If a technical term appears in the records (e.g. a diagnosis, medication, \
or procedure name) and there is no simpler everyday word for it, keep the term but \
immediately explain what it means in plain language right after it, e.g. \
"osteoarthritis (joint wear-and-tear that causes stiffness and pain)" or \
"otitis externa (an infection of the outer ear canal)". Never leave a technical \
term unexplained.
6. Keep a warm, reassuring tone. Do not alarm the owner - if something sounds \
serious, say so factually and calmly, and point them to their veterinarian rather \
than speculating about severity. Just say "their veterinarian" / "the clinic" - \
never "a vet in Sri Lanka" or "a Sri Lankan vet"; this clinic is already in Sri \
Lanka, so naming the country again is redundant.
7. Match the answer to what's actually being asked, not just the topic:
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
   - When the question is about one specific thing (e.g. vaccines, a single medical \
record, a billing charge), answer only that - do not also narrate unrelated record \
types just because they showed up in the Context (e.g. a vaccine question should \
list vaccines, not also recap diagnoses, treatments, or visit notes that happened \
to be retrieved alongside them). Only weave multiple record types together when \
the question is genuinely broad (e.g. "summarize my pet's health", "tell me \
everything about my pet").
   - When the question bundles more than one distinct sub-question (e.g. "why does \
he seem off, and does he need any vitamins?"), address EACH one explicitly rather \
than folding one into narrative that only implies an answer, and never let it \
surface only as an unlabeled bullet among others. Any sub-question phrased as \
yes/no about medicine, a vitamin, or a supplement is always answered per rule 3 - \
never by naming anything - but that redirect still has to be its own explicit \
sentence (e.g. "That's a question for your veterinarian, since it depends on \
examining him now"), not silently skipped, and not left implied by a record from \
the past appearing elsewhere in the answer.
8. Format for skimming, using lightweight markdown:
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
9. Never invent record details, dates, medications, or dosages that are not in \
the context.
10. For any single question, you are only ever given the small handful of records \
that matched it best - never every record in the system that could be relevant, \
even though the full dataset is ingested. If asked for a count, total, or complete \
list (e.g. "how many...", "list all..."), do NOT calculate or guess a number from \
what you were given - say that you only see the top matches for this question and \
the person should check the relevant page in the app (e.g. Pets, Disease Cases) for \
an exact count.
11. This clinic operates in Sri Lanka - always use metric units (kilograms for \
weight, Celsius for temperature, centimeters for length/height). Never use pounds, \
Fahrenheit, or inches - not even as a parenthetical conversion alongside the \
metric value. If a value in the context is already in metric, state it as \
given; only convert if you encounter an imperial value.
12. Always state monetary amounts in Sri Lankan Rupees, written as "Rs. X" - never \
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
it here. Just say "a vet" / "your veterinarian" / "an in-person visit" - never "a \
vet in Sri Lanka" or "a Sri Lankan vet". This clinic is already in Sri Lanka and \
staffed by Sri Lankan veterinarians, so naming the country again when recommending \
a visit is redundant, not informative.
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
# fill-in-the-blank template - was not enough on its own: the model kept
# relabeling the context's terse "field: value" chunk lines (see
# chunking.py's chunk_vaccination/chunk_medical_record) into grouped headers
# like "Vaccinations:"/"Medical Records:" regardless, because that one rule
# was competing against several others (units, currency, clinical tone,
# citation handling) in the same generation call. Splitting reformatting
# into its own follow-up call, with nothing else for the model to juggle,
# is far more reliable - this prompt's only job is the shape, and the facts
# are already locked in from the first pass, so there's nothing left for it
# to get wrong except the format.
# NOTE: diagnosed against qwen2.5-coder:7b specifically, not re-verified
# since - the chat model has since moved to qwen2.5:7b-instruct and now
# qwen3:8b - see the matching note above _wants_paragraph_and_bullets.
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
        answer, _ = generate_answer(_RESHAPE_SYSTEM_PROMPT, user_prompt)
        return answer
    except OllamaError:
        # Reformatting is a nice-to-have on top of an already-correct answer -
        # if the follow-up call fails, showing the unshaped draft beats
        # showing nothing.
        return draft_answer


def _route_to_generation(
    question: str, role: str, customer_id: str = None, user_id: str = None, top_k: int = 5,
    history=None, pending_intent: dict = None
) -> tuple:
    """
    Shared routing logic for answer_question/stream_answer_question: tries
    every early-return path (write-actions, clinical tools, pet health,
    charts, structured SQL, pet disambiguation) in the same order both
    callers need, then either resolves a full answer already (nothing left
    to generate) or prepares everything the final free-form RAG generation
    call needs, without actually making that call - the two callers differ
    only in whether that last call is blocking (generate_answer) or
    streamed (stream_chat), so it's factored out here to avoid duplicating
    this entire routing chain between them.

    Returns:
        tuple: ('early', dict) - a fully-resolved answer, return/yield as-is
            ('clinical_generate', dict) - {'intent_type', 'pet_id',
                'observations_text'}, ready for
                clinical_tools.run_clinical_generation/stream_clinical_generation
            ('health_generate', dict) - {'intent_type', 'pet_id',
                'question'}, ready for
                pet_health_intent.run_pet_health_generation/stream_pet_health_generation
            ('generate', dict) - {'system_prompt', 'user_prompt',
                'effective_question', 'chunks', 'is_guest_ungrounded'},
                everything needed to run and finalize the plain free-form
                RAG generation call
    """
    # Staff write-action requests (book/reschedule/cancel an appointment,
    # send a reminder, register a customer, add a pet) are checked first -
    # these never touch the database themselves, only propose an action or
    # ask a follow-up question, so it's safe to try before anything else.
    action_result = try_action_intent(
        question, role=role, customer_id=customer_id, history=history, pending_intent=pending_intent
    )
    if action_result is not None:
        return 'early', action_result

    # Clinical generation requests (full history summary, consultation note
    # draft, aftercare instructions, pre-appointment briefing) need the
    # COMPLETE record set for a pet, not a top-k RAG sample - checked next,
    # before falling to exact-SQL/RAG. Staff-only (admin/veterinarian); the
    # module itself gates on CLINICAL_STAFF_ROLES and returns (None, None)
    # otherwise. Routing only here (no generation yet) so the streaming
    # caller can watch this generation live too, same as the plain RAG path.
    clinical_kind, clinical_payload = _route_clinical_tool(
        question, role=role, history=history, pending_intent=pending_intent
    )
    if clinical_kind == 'early':
        return 'early', clinical_payload
    if clinical_kind == 'dispatch':
        return 'clinical_generate', clinical_payload

    # Pet disease-recurrence risk, cancer risk, and clinic-wide pandemic risk
    # are live PetHealthPredictor computations, never ingested into
    # rag_chunks - checked next, same "live model, not RAG" reasoning as the
    # clinical tools above. Restricted to admin/veterinarian; the module
    # itself gates on PET_HEALTH_ROLES and returns (None, None) for any
    # other role (with an explicit denial for receptionist specifically,
    # when the question actually asks for this).
    health_kind, health_payload = _route_pet_health_intent(
        question, role=role, history=history, pending_intent=pending_intent
    )
    if health_kind == 'early':
        return 'early', health_payload
    if health_kind == 'dispatch':
        return 'health_generate', health_payload

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
        return 'early', chart

    # Counting/listing questions ("how many pets are named X") are unreliable
    # with pure semantic retrieval - answer them exactly via SQL when we can.
    structured = try_structured_answer(question, role=role, customer_id=customer_id)
    if structured is not None:
        return 'early', structured

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
            return 'early', {
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
            return 'early', {
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
        # Same disambiguation, for a pet_owner who said "my pet"/"my dog"/etc
        # without naming it and has more than one pet on their account (see
        # SELF_PET_MENTION in structured_query.py - pet_name is the 'your
        # pet' placeholder it returns, candidates are the owner's own pets).
        # No owner qualifier needed in the listing/options - it's already
        # scoped to their own account, so just the pet's name disambiguates.
        # Skipped for a broad multi-pet question (_BROAD_MULTI_PET_INTENT,
        # e.g. "summarize my pets' health condition") OR whenever the owner
        # used the plural "pets"/"dogs"/etc at all (_PLURAL_SELF_PET_MENTION
        # - "explain my pets' current health issues" matches neither
        # "summarize" nor "overall", but the plural noun alone already says
        # this isn't "which one do you mean") - either way it falls through
        # instead to retrieve_chunks' pet_owner branch, which already
        # fairly samples every pet on the account rather than forcing a
        # pick between them.
        if (
            pet_name and len(candidates) > 1 and role == 'pet_owner'
            and not (_BROAD_MULTI_PET_INTENT.search(question) or _PLURAL_SELF_PET_MENTION.search(question))
        ):
            listing = '\n'.join(f'- {r[1]}' for r in candidates)
            return 'early', {
                'answer': f'You have {len(candidates)} pets - which one do you mean?\n{listing}',
                'sources': [],
                'chunks_used': 0,
                'options': [
                    {
                        'label': r[1],
                        # "pet <Name>" round-trips through PET_MENTION, then
                        # find_pet_candidates' pet_owner branch resolves it
                        # scoped to this customer_id - no owner phrase needed
                        # since it's implicit from the authenticated session.
                        'value': f'pet {r[1]}',
                        'display': r[1]
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
            return 'early', structured

    chunks = retrieve_chunks(
        effective_question, role=role, customer_id=customer_id, top_k=top_k, pet_id=resolved_pet_id
    )

    # Staff/owner answers are grounded in clinic records - with nothing
    # retrieved there's genuinely nothing to answer from, so bail out early.
    # Guests get general pet-care knowledge from the model itself, so an
    # empty FAQ match isn't a dead end - fall through and let it answer
    # without a context block instead.
    if not chunks and role != 'guest':
        answer = (
            "I couldn't find any relevant clinic records or information to "
            "answer that. Please rephrase, or check with clinic staff directly."
        )
        # A pet with zero records on file is a real, valid state (never
        # seen the clinic, or a test/demo account with no history) - but a
        # genuine symptom concern still deserves a clear answer, not just a
        # dead end, per OWNER_SYSTEM_PROMPT rule 4's "don't silently drop
        # part of the question" reasoning. General, non-diagnostic safety
        # guidance only - never speculate about what the missing records
        # might have shown.
        if _SYMPTOM_CONCERN.search(effective_question):
            answer += (
                " If there's a specific health concern, the safest next step is an "
                "in-person examination with a veterinarian rather than guessing from "
                "what's on file - records alone can't tell you what's needed today."
            )
        return 'early', {
            'answer': answer,
            'sources': [],
            'chunks_used': 0,
            # Deterministic bail-out, not an LLM answer at all (let alone an
            # ungrounded general-knowledge one) - without this, the chat UI's
            # "General veterinary knowledge - not from a specific clinic
            # record" footer (gated on !structured) wrongly labels this
            # "nothing found" message as if the model had answered from its
            # own training knowledge.
            'structured': True
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

    # normalize_currency assumes any "$"/"USD"/"dollars" figure is really an
    # LKR amount the model mislabeled - true for clinic data (billing/pricing
    # fields are always LKR at the source), but not for a guest's ungrounded
    # general-knowledge answer (no FAQ chunk matched), where a dollar figure
    # is more likely a genuine foreign reference amount. Relabeling that
    # preserves the digits and only swaps the currency word would misrepresent
    # the value by ~300x, so skip normalization in that specific case.
    is_guest_ungrounded = role == 'guest' and not chunks

    return 'generate', {
        'system_prompt': system_prompt,
        'user_prompt': user_prompt,
        'effective_question': effective_question,
        'chunks': chunks,
        'is_guest_ungrounded': is_guest_ungrounded
    }


def _finalize_generation(answer_text: str, reasoning, prep: dict) -> dict:
    """
    Shared post-processing for the final free-form RAG generation step
    (currency/units normalization, the paragraph-then-bullets reshape call,
    source list) - used by both answer_question and stream_answer_question
    once they have the model's full answer text, however they got it.
    """
    effective_question = prep['effective_question']
    chunks = prep['chunks']
    is_guest_ungrounded = prep['is_guest_ungrounded']

    def _normalize(text: str) -> str:
        text = strip_non_english(text)
        text = _strip_imperial_units(text)
        return text if is_guest_ungrounded else normalize_currency(text)

    answer_text = _normalize(answer_text)

    if _wants_paragraph_and_bullets(effective_question):
        answer_text = _normalize(_reshape_explain_summarize(effective_question, answer_text))

    result = {
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
    if reasoning:
        result['reasoning'] = reasoning
    return result


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
        'requires_confirmation', or 'pending_intent' - see action_intent.py.
        Admin-role turns on any of the three generation paths - plain RAG,
        clinical_tools, or pet_health_intent - may also include 'reasoning':
        str, the model's thinking-mode output, present only when the chat
        model supports it and produced non-empty output.)
    """
    kind, payload = _route_to_generation(
        question, role, customer_id=customer_id, user_id=user_id, top_k=top_k,
        history=history, pending_intent=pending_intent
    )
    if kind == 'early':
        return payload
    if kind == 'clinical_generate':
        return run_clinical_generation(payload['intent_type'], payload['pet_id'], payload['observations_text'], role)
    if kind == 'health_generate':
        return run_pet_health_generation(payload['intent_type'], payload['pet_id'], payload['question'], role)

    try:
        # Reasoning is only requested for admins - it's an admin-only debug
        # view in the chat UI - and even then only for questions that
        # actually ask the model to explain or summarize something.
        # Thinking mode has a real latency cost (see generate_answer's
        # docstring, ~24x slower) that isn't worth paying for a plain
        # factual question, and reusing _wants_paragraph_and_bullets' same
        # explain/summarize detection keeps the two "this question wants
        # more than a one-shot answer" checks in sync.
        answer_text, reasoning = generate_answer(
            payload['system_prompt'], payload['user_prompt'],
            think=(role == 'admin' and _wants_paragraph_and_bullets(question))
        )
    except OllamaError as e:
        return {
            'answer': f"AI assistant is currently unavailable: {str(e)}",
            'sources': [],
            'chunks_used': 0,
            'error': True
        }

    return _finalize_generation(answer_text, reasoning, payload)


def stream_answer_question(
    question: str, role: str, customer_id: str = None, user_id: str = None, top_k: int = 5,
    history=None, pending_intent: dict = None
):
    """
    Generator variant of answer_question, for the admin-only real-time
    "show reasoning" chat view. Runs the exact same routing as
    answer_question (see _route_to_generation) - three different final
    steps can end up streamed token-by-token: the plain free-form RAG
    generation call, clinical_tools' generation (full history summary,
    consultation note, aftercare, briefing), and pet_health_intent's
    live-model explanation (individual disease risk, cancer risk, pandemic
    risk), since all three make a live model call worth watching in real
    time. Every OTHER early-return branch (write-actions, chart/structured
    SQL answers, pet disambiguation, "which pet did you mean") already
    resolves synchronously and cheaply with nothing to generate, so it's
    yielded as a single 'final' event immediately, same as it would return
    from answer_question.

    Yields:
        dict: {'type': 'reasoning_delta', 'text': str} for each incremental
            chunk of the model's thinking-mode output, zero or more times,
            followed by exactly one:
              {'type': 'final', 'result': dict} - same shape answer_question
              returns
    """
    kind, payload = _route_to_generation(
        question, role, customer_id=customer_id, user_id=user_id, top_k=top_k,
        history=history, pending_intent=pending_intent
    )
    if kind == 'early':
        yield {'type': 'final', 'result': payload}
        return
    if kind == 'clinical_generate':
        yield from stream_clinical_generation(
            payload['intent_type'], payload['pet_id'], payload['observations_text'], role
        )
        return
    if kind == 'health_generate':
        yield from stream_pet_health_generation(payload['intent_type'], payload['pet_id'], payload['question'], role)
        return

    content = ''
    reasoning = None
    think = role == 'admin' and _wants_paragraph_and_bullets(question)
    try:
        for event in stream_chat(payload['system_prompt'], payload['user_prompt'], think=think):
            if event['type'] == 'thinking':
                yield {'type': 'reasoning_delta', 'text': event['delta']}
            elif event['type'] == 'done':
                content = event['content']
                reasoning = event['thinking']
    except OllamaError as e:
        yield {
            'type': 'final',
            'result': {
                'answer': f"AI assistant is currently unavailable: {str(e)}",
                'sources': [],
                'chunks_used': 0,
                'error': True
            }
        }
        return

    yield {'type': 'final', 'result': _finalize_generation(content, reasoning, payload)}


EXPLAIN_SYSTEM_PROMPT = """You are VetCare Pro's veterinary copilot. You will be given \
the raw output of one of the clinic's existing machine learning models (disease \
outbreak risk, individual pet disease/cancer risk, clinic-wide pandemic risk, sales \
forecasting, or inventory demand forecasting). Your job is to explain that output in \
clear, plain language for clinic staff.

Rules:
1. Base your explanation ONLY on the numbers/fields given to you. Do not invent \
figures that are not present.
2. Never write a raw field name or a raw enum value from the data verbatim - \
`trend_direction`, `peak_month`, `pandemic_risk`, `very_low`, `increasing` are JSON \
data labels, not English words, even though they look like ones. Translate every one \
into an ordinary English word or phrase before it reaches a sentence: trend_direction \
"increasing" becomes "an increasing trend" / "trending upward", not the literal word \
"increasing" left standing in as a noun; peak_month "2027-07" becomes "a peak month of \
July 2027", not "peak_month of July 2027"; a confidence value of "very_low" becomes \
"very low confidence", never "very_low"; pandemic_risk "low" becomes "the pandemic \
risk is low", never a bare label. If you notice yourself about to write an underscore \
or a bare field name followed by a colon, stop and rewrite that clause in plain prose.
3. Do not present the model's output as a certainty - use language like "the model \
estimates" or "based on current trends". This applies doubly to individual pet \
disease/cancer risk figures: these are statistical estimates from breed/age/history \
data, never a diagnosis - make that explicit rather than stating a pet "has" or \
"will get" a condition.
4. Write in a professional, clinical-report tone suited to staff review - not casual \
or conversational phrasing. Keep it concise: 3-5 sentences, plain English, no jargon \
unless you also explain it. Bold the key figures and labels (risk level, trend \
direction, peak period, case/revenue volumes, confidence level) using markdown, e.g. \
"**low risk**", "**17.2 cases/month**" - bold the plain-English phrase per rule 2 \
above, never the raw field name or value itself. Do not add section headers, bullet \
lists, or a "Source:" line - the app displays sources separately from this text.
5. If the data reports a confidence or reliability level, close with one explicit \
sentence stating what that means for how staff should use the numbers (e.g. treat as \
directional rather than precise, corroborate before acting on it). If the data looks \
incomplete or you can't make sense of it, say so rather than guessing.
6. This clinic operates in Sri Lanka - any revenue, cost, or price figure in the data \
is in Sri Lankan Rupees, even though the field itself carries no currency label. \
Always present it as "Rs. X", never "$", "USD", or "dollars".
7. When "The staff member specifically asked" is given below, answer THAT question \
explicitly, as its own sentence - not just a generic readout of the data that happens \
to contain the answer. In particular, "explain the trend" is asking you to name the \
direction and rough magnitude in plain terms (e.g. "this reflects a declining trend, \
down roughly 15% month over month") - simply listing each period's figure in sequence \
and letting the reader infer the direction themselves is not an explanation of the \
trend, even if the same numbers are present. If nothing in the data actually supports \
what was specifically asked, say so plainly rather than silently answering only the \
part the data does cover.
"""


def _explain_prompt(output_type: str, data: dict, question: str = None) -> str:
    import json

    asked_line = f'\nThe staff member specifically asked: "{question}"\n' if question else ''
    return f"""Model output type: {output_type}
{asked_line}
Raw data:
{json.dumps(data, indent=2, default=str)}

Explain this output in plain language for clinic staff."""


def explain_ml_output(output_type: str, data: dict, think: bool = False, question: str = None) -> tuple:
    """
    Translate a raw ML model output (outbreak risk, sales forecast, inventory
    forecast, etc.) into a plain-language explanation.

    Args:
        output_type: a short label, e.g. 'outbreak_risk', 'sales_forecast',
                      'inventory_forecast' - included in the prompt for context.
        data: the raw JSON/dict output from the ML model.
        think: request the model's reasoning pass (admin-only "show reasoning"
            view in the chat UI) - see generate_answer's docstring.
        question: the staff member's actual chat question, when this call
            came from the chat pipeline (ml/app.py's live-model gates,
            pet_health_intent.py) rather than the standalone /api/ml/rag/
            explain endpoint (which has no question at all - just raw
            output_type/data). Without this, the model only ever saw
            "explain this output" generically and had no way to know the
            question asked for something more specific, e.g. "explain the
            TREND" - it would readout the figures without ever explicitly
            characterizing the trend itself, technically using the right
            numbers but not actually answering what was asked.

    Returns:
        tuple: (plain-language explanation, reasoning text or None)
    """
    try:
        answer, reasoning = generate_answer(
            EXPLAIN_SYSTEM_PROMPT, _explain_prompt(output_type, data, question), think=think
        )
        return normalize_currency(_strip_imperial_units(strip_non_english(answer))), reasoning
    except OllamaError as e:
        return f"Could not generate an explanation right now: {str(e)}", None


def stream_explain_ml_output(output_type: str, data: dict, think: bool = True, question: str = None):
    """
    Streaming counterpart to explain_ml_output, for the admin-only real-time
    "show reasoning" chat view on the four live-model gates in ml/app.py
    (outbreak risk, disease trend forecast, revenue forecast, inventory
    reorder suggestions) - the same live-model-explanation call, but
    surfacing reasoning deltas as they're produced instead of only after
    the full explanation is ready. See explain_ml_output's docstring for
    what `question` is for.

    Yields:
        dict: {'type': 'reasoning_delta', 'text': str} for each incremental
            chunk of the model's thinking-mode output, zero or more times,
            followed by exactly one:
              {'type': 'done', 'explanation': str, 'reasoning': str or None}
    """
    try:
        content = ''
        reasoning = None
        for event in stream_chat(EXPLAIN_SYSTEM_PROMPT, _explain_prompt(output_type, data, question), think=think):
            if event['type'] == 'thinking':
                yield {'type': 'reasoning_delta', 'text': event['delta']}
            elif event['type'] == 'done':
                content = event['content']
                reasoning = event['thinking']
        yield {
            'type': 'done',
            'explanation': normalize_currency(_strip_imperial_units(strip_non_english(content))),
            'reasoning': reasoning
        }
    except OllamaError as e:
        yield {'type': 'done', 'explanation': f"Could not generate an explanation right now: {str(e)}", 'reasoning': None}