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
ML       POST /api/ml/rag/chat → rag_service.answer_question()
        │
        ▼  four handlers, first match wins
Ollama   embeddings + generation
```

---

## 2. Identity is established before the question is read

The client sends a question and, for multi-turn interactions, a `pending_intent`. It does **not** send its role or customer ID.

The backend derives both from the verified token: `req.user.role` for staff, `req.customer.customer_id` for pet owners, and a fixed `guest` role for the public endpoint. These are attached server-side before the request is forwarded.

This ordering is the reason a client cannot widen its own access. A modified request body has nothing to modify — the fields that determine data visibility are not accepted from the client at all.

---

## 3. Routing inside `rag_service.py`

The question is offered to four handlers in a fixed order. The first that claims it produces the answer. Order runs most-specific to most-general, so a narrower handler is never pre-empted by a broader one.

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

### Handler 3 — structured queries (`structured_query.py`)

Answers counting and listing questions with deterministic SQL, bypassing embeddings entirely. See [`rag-query-coverage.md`](rag-query-coverage.md) for the covered patterns.

### Handler 4 — retrieval (`retrieval.py`)

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

Rows are keyed on `(source_type, source_id)` and upserted, so re-ingestion is idempotent. Triggered by administrators through `/api/ai/ingest/`.

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

Note the asymmetry in the empty-retrieval cases. Staff and owner answers must be grounded in records, so nothing retrieved means nothing to say. Guest answers draw on general pet-care knowledge, so an unmatched FAQ is not a dead end.