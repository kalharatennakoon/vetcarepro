# Structured Query Coverage

Questions matching these patterns are answered with an exact SQL lookup rather than semantic retrieval. Anything not listed falls through to normal RAG.

Implemented in `ml/scripts/rag/structured_query.py`. For why this layer exists, see [`how-the-ai-assistant-works.md`](how-the-ai-assistant-works.md) §4.

---

## Why this exists

Retrieval returns a sample of matching chunks, never the complete set. A model asked to count from a sample produces a number that is confident, well-formatted, and wrong — and unlike an invented medication name, a wrong count is indistinguishable from a right one.

These patterns route to hand-written SQL instead. The result is exact by construction.

---

## Coverage

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

### Inventory

- Low stock items — *"which items are low on stock?"*
- Out of stock items — *"what's out of stock?"*
- Expiring items — *"what's expiring in the next 30 days?"*

### Appointments

- Count by timeframe — *"how many appointments today?"*, *"…this month?"*
- Count no-shows — *"how many no-shows this month?"*
- Count by veterinarian — *"how many appointments does Dr. Silva have?"*
- Count by status — *"how many appointments are cancelled?"*

### Disease cases

- Contagious case count — *"how many contagious cases are there?"*
- Count by category — *"how many infectious cases?"*
- Count by severity — *"how many critical cases this month?"*

### Billing

- Unpaid bills — *"how many unpaid bills are there?"*
- Revenue by timeframe — *"what's the total revenue this month?"*
- Count by payment method — *"how many bills were paid by cash?"*

Shared timeframe vocabulary across appointments, disease cases, and billing: today, yesterday, tomorrow, last week, this week, last month, this month, this year.

---

## Access restrictions

Inventory, appointment, disease case, and billing queries are **staff-only** — administrator, veterinarian, or receptionist.

A pet owner asking one of these does not receive an error. The handler declines to claim the question and it falls through to normal retrieval, which is already scoped to that owner's own records. The owner gets an answer about their own data, or none, but never clinic-wide operational figures.

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