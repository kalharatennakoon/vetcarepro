# Structured Query Coverage

Questions matching these patterns are answered with an exact SQL lookup rather than semantic retrieval. Anything not listed falls through to normal RAG.

Implemented in `ml/scripts/rag/structured_query.py`. For why this layer exists, see [`how-the-ai-assistant-works.md`](how-the-ai-assistant-works.md) §4.

---

## Why this exists

Retrieval returns a sample of matching chunks, never the complete set. A model asked to count from a sample produces a number that is confident, well-formatted, and wrong — and unlike an invented medication name, a wrong count is indistinguishable from a right one.

These patterns route to hand-written SQL instead. The result is exact by construction.

---

## Coverage

### Clinic info

Read from `system_settings`. Checked first, before every other pattern in this layer, and open to **every role including guest** — the only category here that is not staff- or owner-scoped.

- Hours — *"what time do you open?"*, *"what are your business hours?"*, *"are you open on Sundays?"*
- Location — *"where are you located?"*, *"what's the clinic address?"*
- Contact — *"what's your phone number?"*, *"how do I contact the clinic?"*, *"what's your email address?"*

### Pets

- Count pets by name — *"how many pets are named Max?"*
- Count pets owned by a customer — *"how many pets does John Doe have?"*

### Staff

- Count staff by role — *"how many veterinarians do we have?"*, *"how many receptionists?"*

### Medical records

- List records for a specific pet — *"list medical records for pet Max"*, *"list medical records for pet Max, owner is Nishantha Rajapaksa"*
- List records for a customer's pets — *"show history for pets of Jane Doe"*

### Vaccinations

- List vaccinations for a pet — *"what vaccines has pet Max had?"*
- Count vaccinations for a pet — *"how many vaccines has Max received?"*
- Last/most-recent vaccination, and "up to date" status checks — *"when was Max last vaccinated?"*, *"is Max up to date on shots?"*

### Inventory

- Low stock items — *"which items are low on stock?"*
- Out of stock items — *"what's out of stock?"*
- Expiring items — *"what's expiring in the next 30 days?"*

### Appointments (staff)

- Count by timeframe — *"how many appointments today?"*, *"…this month?"*
- List by timeframe — *"what appointments do we have this week?"*
- Specific day — *"any appointments on the 31st?"*, *"appointment on the 5th of next month"*
- Relative weekday — *"any appointments next Friday?"*, *"what's on this Monday"*
- Any other named date not matched by the patterns above (e.g. *"appointments on July 31st, 2026"*) falls back to LLM date-extraction: the model only normalizes the date string to `YYYY-MM-DD`, then a real SQL lookup answers from it — never an LLM-generated appointment list.
- Count no-shows — *"how many no-shows this month?"*
- Count by veterinarian — *"how many appointments does Dr. Silva have?"*
- Count by status — *"how many appointments are cancelled?"*

### Disease cases

- Contagious case count — *"how many contagious cases are there?"*
- Count by category — *"how many infectious cases?"*
- Count by severity — *"how many critical cases this month?"*

### Billing (staff)

- Unpaid bills — *"how many unpaid bills are there?"*
- Revenue by timeframe — *"what's the total revenue this month?"*
- Count by payment method — *"how many bills were paid by cash?"*
- Balance owed by customer name — *"what does John Doe owe?"*, *"outstanding balance for Jane Doe"*
- Payment status by customer name — *"has John Doe paid?"*, *"payment status for Jane Doe"*
- Historical price estimate by appointment type — *"how much does a checkup cost?"*, averaged from past `billing` rows, never a guaranteed quote

### Pet-owner self-service

Scoped to the caller's own `customer_id` directly — no name lookup, so there's no ambiguity to resolve the way there is for the staff/name-based billing patterns above.

- Next upcoming appointment, optionally narrowed to a named pet of theirs — *"when is my next appointment?"*, *"when is Max's next appointment?"*
- Own appointments by timeframe, including single-day yes/no phrasing — *"what appointments do I have this week?"*, *"do I have an appointment tomorrow?"* (timeframe is checked before "next appointment", so a named timeframe always wins over the general next-appointment answer)
- Own outstanding balance — *"how much do I owe?"*, *"what's my balance?"*
- Own payment status — *"have I paid?"*, *"is my bill paid?"*

Shared timeframe vocabulary across appointments, disease cases, and billing: today, yesterday, tomorrow, last week, this week, last month, this month, this year.

---

## Access restrictions

Clinic info is open to every role, including unauthenticated guests.

Inventory, disease case, and the staff/name-based billing and appointment patterns above are **staff-only** — administrator, veterinarian, or receptionist. (Medical-record and disease-case detail is further restricted within staff: `_clinical_detail_redirect()` gives receptionist an explicit redirect rather than the record content, for both, matching the `vetOrAdmin` boundary elsewhere in the app.)

A pet owner asking a staff-only pattern does not receive an error. The handler declines to claim the question and it falls through to the next candidate handler, and ultimately to normal retrieval, which is already scoped to that owner's own records. The owner gets an answer about their own data, or none, but never clinic-wide operational figures — **except** for the pet-owner self-service patterns above (their own appointments and their own billing balance), which this layer answers directly and exactly, scoped to their own `customer_id`.

---

## Not covered, by design

Left to retrieval:

- FAQs and clinic policy questions
- "Explain this diagnosis / forecast" style questions
- Open-ended clinical questions about a specific case

These are the questions retrieval handles well. There is no benefit in routing them to SQL.

---

## Extending this layer

Add a pattern when testing surfaces a question the assistant answers with a plausible wrong number. The signal is a *confident aggregate that cannot be traced to retrieved content*.

Each addition means a regex for the question shape and a hand-written SQL handler. The model never generates SQL — free-form text-to-SQL was considered and rejected on correctness and security grounds (see [`ai-assistant-problem-solution.md`](ai-assistant-problem-solution.md)). Adding coverage is deliberately manual work, and that constraint is the point.

Known backlog: typo tolerance and fuzzy entity matching, lab report content queries, customer growth queries.