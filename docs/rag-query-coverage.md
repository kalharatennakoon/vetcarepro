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

- Next appointment for a named pet — *"when is Lassie's next appointment?"*. If the name is ambiguous, the normal pet-disambiguation flow (see "Entity resolution" in [`how-the-ai-assistant-works.md`](how-the-ai-assistant-works.md)) asks which one first; this pattern is then re-tried with the resolved pet once the caller answers, since appointments have no RAG fallback to degrade to safely (unlike medical records/vaccinations, they're never ingested into `rag_chunks`).
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

## Charts

Implemented in `ml/scripts/rag/chart_intent.py`, which runs immediately *before* `try_structured_answer()` — see [`how-the-ai-assistant-works.md`](how-the-ai-assistant-works.md) for why that ordering is load-bearing. Same deterministic-SQL principle as everything above: the model never produces chart data.

A chart is returned as a `chart` key alongside the usual answer sentence, and the web client renders it as a bar or pie chart per `chart.type`. **Web-only** — the iOS client ignores the key.

### Explicit trigger only

A chart is produced **only** when the question contains one of: chart, graph, plot, visualize/visualise, visualization/visualisation, pie.

This is the whole design. A plain data question keeps its plain answer — *"what's our revenue this month?"* returns the one-line billing total, and only *"graph revenue by month"* returns a chart. Inferring that a question "looks chart-shaped" would put a visualization in front of someone who asked for a number, and there is no reliable signal for that intent other than the word itself.

The same rule is what makes the ordering safe. Because the chart layer claims nothing without a trigger word, placing it ahead of the structured layer cannot steal a plain question from it.

### Chart type: bar vs pie

Independent of *which* category matched below — bar is the default, and the word *"pie"* anywhere in the question (itself one of the trigger words above) switches the same query's result into a pie instead, e.g. *"pie chart of appointments by status"*. The two-series stock-vs-reorder-level chart is the one category a pie can't fully represent — the client falls back to just the first series (current stock) rather than refusing the request.

### Categories

Dispatched by keyword, most-specific first.

| Category | Example | Notes |
|---|---|---|
| Disease cases by category | *"graph disease cases by category"* | Ordered by count |
| Disease cases by severity | *"chart disease case severity"* | Ordered mild → critical, **not** by count — severity is a scale, and sorting it by frequency scrambles an order the reader already knows |
| Appointments by status | *"chart appointments by status"* | Optional timeframe filter using the shared vocabulary above, and an optional *"my"/"mine"* self-scope (see below) |
| Appointments over time | *"show me my completed appointments this year in a bar chart based on each month"* | Defaults to this month. Grouped by day when the range is ≤31 days, by month beyond that — a multi-month chart at one bar per day is unreadable. An explicit status word (*completed*, *cancelled*, *scheduled*, *confirmed*, *in progress*, *no-show*) narrows the count to that one status instead of blending all of them; an optional *"my"/"mine"* self-scope (see below) narrows it further |
| Inventory stock levels | *"visualize inventory levels"* | Top 10 items closest to or below `reorder_level`; two series (current quantity vs reorder level) |
| Revenue by month | *"chart revenue for the last 3 months"* | *"last N months"* parsed from the question, default 6, clamped to 2–24 |

Both time series are LEFT JOINed onto a generated date series rather than grouping only the rows that exist, so an empty bucket renders as a zero bar instead of vanishing. An omitted month makes a gap look like continuity and turns "no revenue in this window" into the very different-sounding "no revenue data at all". The status and self-scope filters live inside that same `LEFT JOIN`'s `ON` clause rather than a separate `WHERE` — a `WHERE` would turn the `LEFT JOIN` into an effective `INNER JOIN` and silently drop the zero-count buckets back out.

**Self-scope ("my"/"mine").** Only meaningful for a veterinarian, whose appointments have a real owner (`appointments.veterinarian_id`); requires the caller's own `user_id`, threaded through from `req.user.user_id` on the authenticated staff request, the same way `customer_id` is threaded through for pet owners. Admin and receptionist aren't assigned appointments themselves, so "my" is left unscoped for them rather than guessed at.

A trigger word with no recognizable category (*"graph the weather"*), or an appointment breakdown that isn't supported (*"graph appointments by veterinarian"*), returns nothing and falls through rather than being answered with the nearest available chart. Drawing a real chart from real data that answers a different question than the one asked is the failure this avoids.

### Access

Staff-only. Guest and pet-owner questions fall through to the normal pipeline — not an error, exactly as with the staff-only patterns above.

The two disease-case charts are further restricted to administrator and veterinarian; a receptionist asking for one gets `_clinical_detail_redirect()` and no chart, matching how disease-case data is gated throughout this layer.

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