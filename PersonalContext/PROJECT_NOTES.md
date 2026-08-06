# VetCare Pro — Project Notes (Personal)

These are my own working notes, not the official docs. The real, up-to-date documentation lives in [`docs/`](../docs/) — this file only keeps things that aren't already written there, kept in simple language.

*Simplified 2026-08-06: this file used to be a full copy-paste of every note I'd written, including things now covered properly in `docs/`. Cut down so it doesn't go stale twice.*

---

## 1. Where to find things

| I want to know about... | Go to |
|---|---|
| Running the whole project locally | [`docs/setup.md`](../docs/setup.md) |
| What the AI assistant is supposed to do | [`docs/ai-assistant-requirements.md`](../docs/ai-assistant-requirements.md) |
| Why the AI assistant was built this way | [`docs/ai-assistant-problem-solution.md`](../docs/ai-assistant-problem-solution.md) |
| How the AI assistant works, step by step | [`docs/how-the-ai-assistant-works.md`](../docs/how-the-ai-assistant-works.md) |
| Which questions get an exact SQL answer vs. AI-generated | [`docs/rag-query-coverage.md`](../docs/rag-query-coverage.md) |
| Test questions for each login type | [`docs/ai-assistant-sample-questions.md`](../docs/ai-assistant-sample-questions.md) |
| How pet-owner login works today | [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) §2 |
| What each ML model does, in plain terms | [`docs/ml-system-overview.md`](../docs/ml-system-overview.md) |
| Disease prediction API endpoints | [`docs/api/disease-prediction.md`](../docs/api/disease-prediction.md), [`docs/api/README.md`](../docs/api/README.md) |
| Reading disease analytics output | [`docs/decision-support/disease-analytics.md`](../docs/decision-support/disease-analytics.md) |
| Reading sales forecasts | [`docs/decision-support/sales-forecasting.md`](../docs/decision-support/sales-forecasting.md) |
| Reading inventory forecasts | [`docs/decision-support/inventory-forecasting.md`](../docs/decision-support/inventory-forecasting.md) |
| Who (admin/vet/receptionist) can do what | [`docs/rbac.md`](../docs/rbac.md) |
| Whole system architecture | [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) |
| What's in scope / out of scope, and known gaps | [`docs/SCOPE.md`](../docs/SCOPE.md) |

If I'm ever tempted to write clinic-facing documentation here again — don't. It belongs in `docs/`.

---

## 2. Simple glossary (for my own memory)

Terms I kept having to look up while learning about the AI assistant:

- **LLM** — an AI model trained on huge amounts of text, good at writing natural-sounding language, but it doesn't "know" our clinic's data unless we hand it that data directly.
- **RAG (Retrieval-Augmented Generation)** — look up real data first, then let the AI write an answer using only that data. Like an open-book exam instead of a memory quiz.
- **Embedding / vector** — a list of numbers standing in for the *meaning* of a piece of text. Similar meanings end up as similar numbers.
- **pgvector** — a Postgres add-on that stores those number-lists and quickly finds the closest ones.
- **Cosine similarity** — the maths used to measure "how close" two embeddings are. Bigger number = more related meaning.
- **Chunk** — a small piece of text (one FAQ answer, one medical record) stored with its embedding, ready to be looked up.
- **Hallucination** — when an AI model confidently says something false because it's guessing instead of using real data.
- **Ollama** — free software that runs AI models on our own machine, instead of calling a paid company's API over the internet.

---

## 3. Pet-owner login — how it started

Early version: every pet owner got the same default password (`VetCare@123`) and had to change it the first time they logged in. **This has since been replaced** — each pet owner now sets their own password by confirming the email and phone the clinic already has on file. See [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) §2 for how it actually works now.

Keeping this note so I remember why an old default-password constant might still turn up in git history.

---

## 4. ML models — technical notes not written up in `docs/`

`docs/ml-system-overview.md` explains *what* each model does and why. These notes are the *how* — the actual libraries, settings, and formulas — since that level of detail isn't in the formal docs.

### Disease prediction (`ml/scripts/disease_prediction.py`)

- Learns from the `disease_cases` table: species, breed, category, severity, age, whether it's contagious.
- **Naive Bayes** (scikit-learn) guesses which disease category a new case probably belongs to. Only switches on once there are at least 30 cases and at least 3 different categories. Uses an 80/20 train/test split.
- **K-Means** (scikit-learn) groups similar cases into clusters — if one animal in a group gets sick, staff know to watch the others. Switches on once there are at least 20 cases.
- Outbreak risk is **not** learned — it's a simple point-scoring formula: more recent cases, more contagious cases, more severe cases, a repeating disease, or a rising trend all add points. Score under 4 = Low, 4–6 = Medium, 7–9 = High, 10+ = Critical.
- Accuracy depends on how much data exists: under 30 cases = unreliable, 30–99 = roughly 60–75%, 100–199 = roughly 75–85%, 200+ = roughly 85–95%.
- Saved to `ml/models/disease_prediction_<date>.pkl`.

### Sales forecasting (`ml/scripts/sales_forecasting.py`)

- Learns from `billing`, `billing_items`, and `daily_sales_summary`.
- **Prophet** (Meta's forecasting library) spots weekly and yearly patterns in daily revenue. Needs at least 14 days of history.
- **Random Forest** predicts revenue month by month, using the last few months as clues plus the time of year.
- If Prophet isn't available or there's too little data, it falls back to a simple straight-line trend.
- Accuracy is checked with MAE (average size of the error) and R² (how well the model explains the pattern — closer to 1 is better).

### Inventory forecasting (`ml/scripts/inventory_forecasting.py`)

- Learns from `inventory` (current stock) and `billing_items` (what was actually sold/used, standing in for what was used).
- **Gradient Boosting** (scikit-learn) predicts how much of each item will be needed over the next 30 days.
- Reorder point formula: `safety stock = 1.65 × (how much daily usage varies) × √(delivery lead time in days)`. The 1.65 gives roughly a 95% chance of not running out while waiting for a delivery.
- Items get flagged **Urgent** (already low, or will run out before the next delivery), **Reorder Soon** (will run out a bit after that), or **Sufficient**.
- Default delivery lead time: 7 days, same for every item — not tracked per supplier yet.

### Shared facts

| Model | Technique | Needs at least |
|---|---|---|
| Disease category | Naive Bayes | 30 cases, 3 categories |
| Disease clusters | K-Means | 20 cases |
| Sales (daily) | Prophet | 14 days of history |
| Sales (monthly) | Random Forest | 6 months (else uses everything it has) |
| Inventory | Gradient Boosting | 6 items with history (else uses everything it has) |

Every model is saved as a `.pkl` file in `ml/models/` and only retrained by hand, through the admin-only `/train` endpoints — never automatically.

**Known limits:** inventory usage is guessed from billing, not a separate dispensing log; the disease model had only 54 recorded cases last time I checked, which isn't much; delivery lead time is a flat 7 days for everything rather than per supplier.

**Handy command:** if the ML service won't start because port 5001 is already taken — `lsof -i :5001`, then `kill -9 <PID>`, then `./start.sh` again.

---

## 5. Turning this into a paid product (ideas only — not built)

Not in `docs/` because it's explicitly out of scope for the current project — see [`docs/SCOPE.md`](../docs/SCOPE.md) §4.9. Keeping the thinking here for later.

**Hosting.** Put the frontend, backend, and ML service each into their own Docker container, run them with Kubernetes on Azure (AKS) or AWS (EKS), and use a managed database (Azure Database for PostgreSQL / AWS RDS) instead of running Postgres in a container.

**Biggest decision — one clinic per deployment, or many clinics sharing one system?**
- **Single-tenant** (one deployment per clinic) — simpler, better data privacy, costs more per client. Good for premium or enterprise clients.
- **Multi-tenant** (all clinics share one system) — needs a `clinic_id` column on every table, and every single query has to filter by it. Cheaper to run at scale, good for a subscription product with many small clinics. Postgres Row-Level Security can help make sure one clinic never sees another's data.

**What's missing before this could be sold:**
- Dockerfiles for each service, plus a `docker-compose.yml` for local testing
- Every hardcoded `localhost` URL replaced with an environment variable
- `clinic_id` on every table (multi-tenant only)
- A sign-up flow for new clinics
- Payment/subscription billing (e.g. Stripe)
- A super-admin dashboard to manage all clinics
- A CI/CD pipeline (test → build Docker images → push → deploy)
- CORS updated for the real production domain
- Legal/compliance paperwork

**Compliance to check, depending on target market:** GDPR (EU), Sri Lanka's PDPA, HIPAA (US, only if handling human health data). Minimum needed regardless: a privacy policy, encryption in transit and at rest, a way to delete a clinic's data on request, and audit logs (already built).

**Possible pricing models:** monthly subscription, discounted annual subscription, per-user pricing, one-time licence, white-label licence for resellers, pay-as-you-go, managed hosting add-on, freemium.

**Suggested first steps:** write the Dockerfiles and test with docker-compose → replace `localhost` URLs with env vars → pick a cloud provider and set up a managed database → set up the Kubernetes cluster → set up a domain and HTTPS → build sign-up and billing once the infrastructure is stable.
