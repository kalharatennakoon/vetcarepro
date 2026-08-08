# How the AI Assistant Works

End-to-end walkthrough of the retrieval-augmented assistant: what happens between a typed question and a displayed answer.

Related: [`ARCHITECTURE.md`](ARCHITECTURE.md) §4 for the summary; [`rag-query-coverage.md`](rag-query-coverage.md) for which questions bypass retrieval.

---

## 1. Overview

The assistant spans all three services. A question travels from a browser or iOS app, through the Node backend, into the Flask ML service, and reaches Ollama only if the question genuinely needs generation.

```
Client
  AIAssistant.jsx (staff) │ PetOwnerAIWidget.jsx │ GuestAIAssistant.jsx
  PetOwnerAIView.swift    │ GuestAIView.swift
        │
        ▼  POST /api/ai/chat | /customer-chat | /public-chat
Backend  aiRoutes.js → aiController.js
        │  Verifies the token, derives role and customerId
        ▼  aiService.js
ML       POST /api/ml/rag/chat
        │  live-model gates (staff only) — outbreak risk, disease forecast,
        │  revenue forecast, reorder suggestions; short-circuits below if matched
        ▼  rag_service.answer_question()
        │
        ▼  five handlers, first match wins
Ollama   embeddings + generation
```

---

## 2. Identity is established before the question is read

The client sends a question and, for multi-turn interactions, a `pending_intent`. It does **not** send its role or customer ID.

The backend derives both from the verified token: `req.user.role` for staff, `req.customer.customer_id` for pet owners, and a fixed `guest` role for the public endpoint. These are attached server-side before the request is forwarded.

This ordering is the reason a client cannot widen its own access. A modified request body has nothing to modify — the fields that determine data visibility are not accepted from the client at all.

---

## 3. Routing inside `rag_service.py`

Before `rag_service.py` is even reached, `ml/app.py`'s `/api/ml/rag/chat` route itself regex-matches the raw question against four live-model question shapes: disease outbreak risk, disease trend forecast, revenue forecast, and inventory reorder suggestions. For admin and veterinarian, a match answers directly from the corresponding trained model (`disease_prediction.py` / `sales_forecasting.py` / `inventory_forecasting.py`) via `explain_ml_output` and returns immediately — `rag_service.answer_question()` is never called for that request. A receptionist matches the same gate but gets an explicit "not available for your role" message instead — analytics stays admin/vet territory even though receptionist is otherwise a staff role. These are live computations, not something ever ingested into `rag_chunks`, so routing them through retrieval would mean stitching an answer from unrelated chunks instead of the real model. Guest and pet-owner questions matching the same phrasing (e.g. "what should I do during a dog disease outbreak?") deliberately skip these gates and reach the normal pipeline below instead — for those roles it's an ordinary general-knowledge or FAQ question, not a request for the clinic's own live risk model.

Once inside `rag_service.py`, the question is offered to five handlers in a fixed order. The first that claims it produces the answer. Order runs most-specific to most-general, so a narrower handler is never pre-empted by a broader one.

### Handler 1 — write intents (`action_intent.py`)

Detects requests to change something: book, reschedule, or cancel an appointment; send a reminder; register a customer; add a pet; register a staff member (administrators only).

Runs first because it is safe to try. It performs no writes — it either proposes an action or asks a follow-up question.

Processing:

1. **Pattern match** the intent, checked most-specific-first so that "reschedule" is not captured by the broader "book" pattern.
2. **Extract slots** with a single generation call that converts free text into a JSON object.
3. **Resolve every slot against the database.** Pet, customer, veterinarian, appointment, and date resolution are SQL lookups or deterministic date arithmetic, never model output.
4. **Ask or propose.** A missing or ambiguous slot produces a question. A complete set produces a proposed action returned to the client for confirmation.

Nothing is written until the user confirms and the client calls `POST /api/ai/actions/confirm`, which the backend executes through its normal controllers — with the same validation and authorization as any other request.

### Handler 2 — clinical tools (`clinical_tools.py`)

Handles four capabilities needing a pet's *complete* record set: full history summary, consultation-note draft, aftercare instructions, pre-appointment briefing.

These cannot use retrieval. Retrieval returns a sample, and a "full history" assembled from a sample is a partial history presented as a complete one. Instead the module fetches every relevant row by SQL, formats the whole dataset, and makes exactly one generation call over it.

Restricted to administrators and veterinarians, matching the clinical boundary applied everywhere else. Generated content is a draft: nothing is saved as a medical record and no email is sent without explicit review.

### Handler 3 — pet health risk (`pet_health_intent.py`)

Handles an individual pet's disease-recurrence/cancer risk, and clinic-wide pandemic risk — computed live by `PetHealthPredictor`, the same "live model, not a text sample" reasoning as the pre-pipeline gates in §3's opening paragraph. This one runs inside `rag_service.py` rather than `ml/app.py` because it needs the resolved-pet-name machinery the other handlers share, not because the underlying computation is any less live.

Admin-only (`PET_HEALTH_ADMIN_ROLES`). The module gates internally and returns `None` for any other role, so the question falls through to the next handler rather than erroring.

### Between handlers 3 and 4 — chart requests (`chart_intent.py`)

Not a sixth handler, and the count above is unchanged. Each of the five owns a class of *question*; this one owns a form of *answer*. It is dispatched from the same `answer_question()` function, immediately before handler 4, and it changes how already-covered data is presented rather than covering anything new.

It claims a question only when an explicit trigger word is present — chart, graph, plot, visualize/visualise. Everything else falls through untouched, which is what keeps "what's our revenue this month?" a sentence while "graph revenue by month" becomes a chart. Guessing that a question merely looked chart-shaped would put a picture in front of someone who asked for a number.

The position matters. Chart questions share their nouns with patterns handler 4 already matches — "graph revenue by month" contains the same "revenue" as its revenue-by-timeframe pattern, "chart appointments by status" the same pair as its count-by-status pattern — and neither handler knows about the other's criteria, so whichever runs first claims the question outright. Running the chart check second would mean a chart request silently answered as a one-line sentence. The reverse mistake cannot happen, because without a trigger word the chart check never claims anything.

The response is the handler-4 dict shape plus a `chart` key: a title, bar rows, and one or more named series. Six categories are supported — disease cases by category and by severity, appointments by status and over time, inventory stock versus reorder level, and revenue by month. Staff-only; the two disease-case charts are restricted to `CLINICAL_STAFF_ROLES`, with receptionist receiving the same clinical redirect used elsewhere. Guest and pet-owner questions fall through rather than erroring, exactly as they do for handler 4's staff-only patterns. Charts are web-only — the iOS client ignores the extra key.

Every number is SQL, as in handler 4; the model plays no part in producing chart data. See [`rag-query-coverage.md`](rag-query-coverage.md) for the full category list.

### Handler 4 — structured queries (`structured_query.py`)

Answers counting and listing questions, clinic info (hours/location/contact — open to every role including guests), and pet-owner self-service (their own upcoming appointments, their own billing balance) with deterministic SQL, bypassing embeddings entirely. See [`rag-query-coverage.md`](rag-query-coverage.md) for the covered patterns.

### Handler 5 — retrieval (`retrieval.py`)

The general path. Embeds the question, runs a similarity search scoped to the caller, and generates an answer grounded in what came back.

---

## 4. Why counting bypasses retrieval

This is the assistant's central design decision.

Retrieval returns the top *k* matching chunks — a sample, never the complete set. Asked "how many pets are named Max?", a model given five chunks will produce a number. The number will be confident, plausibly formatted, and wrong.

Ordinary hallucination is often detectable: an invented medication name looks unfamiliar. A wrong count does not look like anything. It looks exactly like a right count. In a clinical setting that is the more dangerous failure.

Two defences:

1. **Route recognized aggregate questions to SQL.** Exact, by construction.
2. **Instruct the model to decline the rest.** The staff system prompt states that only top matches are visible and that counts must not be calculated from them, directing the user to the relevant page instead.

---

## 5. Entity resolution

Pet names collide. A clinic has several dogs called Max, and answering from the wrong one is worse than not answering.

Resolution proceeds in a cascade: an explicit mention with owner ("pet Max, owner Nishantha Rajapaksa"), then a possessive form, then a bare name. If exactly one pet matches, its `pet_id` scopes retrieval. If several match, the assistant asks which is meant and offers the candidates as options — clicking one resubmits the owner's name as the next message.

Falling through to unscoped retrieval on an ambiguous name would let semantic search return several pets' records as though they described one animal. Asking is the correct behaviour, and matches the "ask rather than guess" discipline used for write intents.

---

## 6. Access scoping

Enforced in the retrieval SQL, not in the interface.

| Caller | Chunks visible |
|---|---|
| Guest | Public FAQ chunks only — `pet_id IS NULL AND customer_id IS NULL`, excluding `staff_faq` |
| Pet owner | Chunks matching their `customer_id`, plus public FAQs |
| Receptionist | Clinic-wide, excluding `disease_case`, `lab_report`, `medical_record` |
| Veterinarian / admin | Clinic-wide, including internal `staff_faq` |

The receptionist exclusion mirrors the `vetOrAdmin` restriction on medical records and disease cases in the rest of the application. A receptionist who cannot open a medical record in the interface cannot reach one through the assistant either.

Guest retrieval also applies a relevance threshold. Without it, a question with no genuine FAQ match still returns the five closest articles, which the interface would then present as sources — implying grounding that did not occur.

---

## 7. Generation

The retrieved chunks are assembled into a context block and sent with a role-appropriate system prompt.

**Staff prompt** — answer only from context; never state a diagnosis as fact; never invent record details, dates, medications, or dosages; do not calculate counts from partial samples; use metric units and Sri Lankan Rupees.

**Owner prompt** — the same grounding rules, plus a readability requirement. The audience has no medical training, so the bar is whether a worried owner would understand the answer without looking anything up.

**Guest prompt** — general pet-care knowledge, no clinic data, no medication recommendations, redirect to an in-person visit where appropriate.

### Deterministic post-processing

The local model reinserts imperial conversions — "29 kilograms (65 lbs)" — regardless of instruction. Rather than continue tuning prompt wording against a small model, `rag_service.py` strips these with a regex targeting parentheticals containing both a digit and an imperial unit.

The general principle: when a small model reliably fails a rule, enforce the rule in code rather than repeating it more emphatically in the prompt.

---

## 8. Citations

Retrieved chunks are returned alongside the answer and rendered as source chips. Because the interface displays them separately, the system prompt instructs the model *not* to narrate "(Source 1)" inline — the citation is already visible, and inline markers add length without information.

---

## 9. Conversation state

There is no server-side session.

Multi-turn slot filling round-trips through the client. When a slot is missing, the response includes a `pending_intent` object holding the intent type and slots gathered so far. The client echoes it back on the next request. The ML service stays stateless, and an abandoned conversation leaves nothing behind.

---

## 10. Ingestion

Clinic data becomes retrievable through `ingest.py` and `chunking.py`: rows are converted to text, embedded with `nomic-embed-text` (768 dimensions), and written to `rag_chunks` with `pet_id`, `customer_id`, and `source_type` for scoping.

Rows are keyed on `(source_type, source_id)` and upserted, so re-ingestion is idempotent. Kept in sync with the source tables through a full lifecycle, not a one-off admin action:

- **Create/update** — the record's Node controller calls the matching `ingest*` wrapper in `server/src/services/aiService.js` right after the write (e.g. saving a medical record re-ingests just that record).
- **Delete** — the delete handler calls `deleteChunk(source_type, source_id)`. `rag_chunks` has no foreign key to `medical_records`/`disease_cases`/`lab_reports`/`vaccinations` (only to `pets`/`customers`, which cascade automatically), so without this call a deleted record's chunk stays retrievable and the assistant keeps citing data that no longer exists.
- **Pet identity change** — `updatePetById` calls `reingestPet(petId)` whenever a pet's name/species/breed changes, since chunk text embeds those fields at ingestion time and won't otherwise pick up the new value.

`/api/ai/ingest/` (backfill-all and per-type) remains available as an admin-triggered manual action — for a fresh clone, a bulk backfill, or after directly editing static content like `faq_data.py`, which has no create/update/delete event of its own to hook into.

Source types: `medical_record`, `disease_case`, `lab_report`, `vaccination`, `faq`, `staff_faq`.

> Lab reports are ingested from structured metadata only; the text inside uploaded files is not extracted. See [`ai-assistant-requirements.md`](ai-assistant-requirements.md) for what this excludes.

---

## 11. Failure behaviour

| Condition | Behaviour |
|---|---|
| Ollama unavailable | Chat returns an "unavailable" message rather than an error |
| Vector store empty | Answers are vague and cite no sources — run ingestion |
| No chunks retrieved (staff or owner) | Assistant states it has nothing to answer from |
| No chunks retrieved (guest) | Falls through to general knowledge without a context block |
| Ambiguous pet name | Asks which pet is meant, offering candidates |
| Missing slot in a write intent | Asks for the missing detail |
| Record deleted (medical record, disease case, lab report, vaccination) | `deleteChunk` removes the corresponding `rag_chunks` row in the same request, so the assistant stops citing it immediately rather than on the next backfill |
| Pet renamed (or species/breed changed) | `reingestPet` re-embeds every chunk for that pet in the same request, so the assistant picks up the new name rather than continuing to cite the old one until a manual backfill |

Note the asymmetry in the empty-retrieval cases. Staff and owner answers must be grounded in records, so nothing retrieved means nothing to say. Guest answers draw on general pet-care knowledge, so an unmatched FAQ is not a dead end.