# AI Assistant — Requirements

Requirements for the AI assistant layer added to VetCare Pro during the AI Launchpad programme.

Related: [`ai-assistant-problem-solution.md`](ai-assistant-problem-solution.md) for how these were arrived at and prioritized; [`how-the-ai-assistant-works.md`](how-the-ai-assistant-works.md) for the implementation.

---

## Purpose

Add an AI assistant layer to VetCare Pro that helps clinic staff work faster, communicate more clearly, and make better informed decisions — while keeping veterinary professionals in control of every clinical judgment.

---

## Functional requirements

### Assistant experience

- Provide an AI assistant or copilot experience across VetCare Pro through a modern, easy-to-use interface.
- Use retrieval-augmented generation so the assistant answers from trusted clinic knowledge sources rather than model recall.
- Ground responses in clinic data, pet records, FAQs, care instructions, and other approved reference material.

### Summarization

- Generate concise summaries of key records: pet medical history, consultation notes, and owner-friendly aftercare instructions.

### Explanation of analytics

- Translate existing machine-learning outputs into clear natural-language explanations.
- Cover outbreak risk predictions, sales forecasts, and inventory demand predictions in terms a non-technical user can act on.

---

## Safety requirements

These are constraints on every response, not features:

- Keep outputs focused on decision support rather than automated diagnosis or treatment.
- Make clear that the assistant does not replace professional veterinary advice, clinical judgment, or human review.
- Prefer safe, traceable answers that can be linked back to trusted source data.
- Reduce manual effort without exposing sensitive data beyond the user's permissions.

The last point is load-bearing: an assistant that answers well but leaks one customer's records to another has failed, regardless of answer quality.

---

## Expected outcomes

- Faster access to relevant clinic information.
- Better communication with pet owners through clearer summaries and instructions.
- Improved understanding of predictive analytics results.
- Safer use of AI within a veterinary workflow.

---

## Deferred work

### Document text extraction

Lab reports are currently ingested using their structured metadata — pet, date, report type, and any recorded findings — rather than the contents of the uploaded file. Uploaded PDFs and images are stored and served, but their text is not extracted, embedded, or retrievable.

The consequence is a specific blind spot: the assistant knows a lab report exists and what it is nominally about, but cannot answer from values inside it. A question such as "what was Max's white cell count?" will not be answered from the report even though the report is on file.

Extraction would require a parsing step ahead of chunking — text extraction for PDFs, optical character recognition for scanned images — plus a decision about how to chunk tabular results so that a value stays attached to its reference range. Neither is complex, but both add dependencies and failure modes to the ingest path, and the assistant is useful without them.

This is the deferred work referenced from `ml/scripts/rag/chunking.py`.

### Other deferred items

Carried in the Could Have tier of [`ai-assistant-problem-solution.md`](ai-assistant-problem-solution.md):

- Typo-tolerant and fuzzy entity matching
- Customer growth and trend queries in the structured-query layer
- Voice input
- Multi-turn conversational memory beyond the current `pending_intent` slot-filling
- Push notifications on mobile for appointment reminders and vaccination due dates

> **Delivered since the tiers above were drafted:** clinic hours/location/contact lookup, read live from `system_settings` and open to every role including guests, and pet-owner self-service (their own upcoming appointments, their own billing balance) — both now in `structured_query.py`. Neither was an explicit Could Have item, but both closed the same "assistant can't answer a question its own data already holds the answer to" gap this section otherwise tracks. See [`rag-query-coverage.md`](rag-query-coverage.md) for coverage.