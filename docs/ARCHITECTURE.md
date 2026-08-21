# Architecture

System architecture of VetCare Pro, a veterinary clinic management platform for Pro Pet Animal Hospital.

**Audience:** developers and reviewers joining the project.
**Companion documents:** [`SCOPE.md`](SCOPE.md) for what is and isn't in scope; [`../DATABASE.md`](../DATABASE.md) for connection and reset procedures.

---

## 1. System overview

VetCare Pro is composed of four independently runnable services. Three form the deployed system; the fourth is a mobile client that consumes the same API.

| Service | Directory | Technology | Port | Role |
|---|---|---|---|---|
| Web frontend | `client/` | React 19, Vite, React Router 7, Recharts | 5173 | Staff console and pet-owner portal |
| Backend API | `server/` | Node.js, Express 5, PostgreSQL, JWT | 3000 | Sole authority for identity, authorization, and persistence |
| ML / RAG service | `ml/` | Python, Flask, scikit-learn, Prophet | 5001 | Predictive analytics and the retrieval-augmented AI assistant |
| iOS app | `mobile/ios/VetCare/` | Swift, SwiftUI | — | Pet-owner and guest client |

A single external dependency, [Ollama](https://ollama.com), runs locally on port 11434 and serves both embeddings and text generation. There is no third-party AI API and no per-token cost.

`./run.sh` at the repository root starts Ollama, the backend, the ML service, and the frontend in parallel; `Ctrl+C` terminates all four.

### Topology

```
┌──────────────┐     ┌──────────────┐
│  Web client  │     │   iOS app    │
│  (React)     │     │  (SwiftUI)   │
└──────┬───────┘     └──────┬───────┘
       │                    │
       └────────┬───────────┘
                │  HTTPS / JSON, Bearer JWT
                ▼
       ┌────────────────────┐
       │   Backend API      │  ← identity, authorization,
       │   (Express)        │    validation, persistence
       └───┬────────────┬───┘
           │            │
           │            │  internal HTTP
           ▼            ▼
    ┌────────────┐  ┌──────────────────┐
    │ PostgreSQL │  │  ML / RAG service│
    │ + pgvector │◄─┤     (Flask)      │
    └────────────┘  └────────┬─────────┘
                             │
                             ▼
                      ┌─────────────┐
                      │   Ollama    │
                      └─────────────┘
```

**Neither client reaches PostgreSQL or Ollama directly.** The ML service holds its own read connection to PostgreSQL for training data and retrieval, but never authenticates a user — it trusts the role and customer identity the backend passes to it, because the backend has already established them.

---

## 2. Authentication and authorization

### Two separate identity systems

Clinic staff and pet owners authenticate through entirely independent paths that must never intersect. Both issue JWTs, but the tokens are not interchangeable.

| | Staff | Pet owner |
|---|---|---|
| Middleware | `authenticate` | `authenticateCustomer` |
| Token claim | *(none)* | `type: 'customer'` |
| Request property | `req.user` | `req.customer` |
| Frontend context | `AuthContext.jsx` | `CustomerAuthContext.jsx` |
| Storage key | `token` | `customerToken` |
| Route prefix | `/api/auth` | `/api/customer-auth` |

`authenticateCustomer` rejects any token lacking the `type: 'customer'` claim, and `authenticate` resolves its subject through the `users` table, so a customer token cannot satisfy it either. The separation is deliberate: a single shared token scheme would make privilege escalation a matter of reaching the right endpoint.

Both middlewares re-read the subject from the database on every request rather than trusting claims embedded in the token, so deactivating an account takes effect immediately rather than at token expiry.

### Staff roles

Three roles are defined: `admin`, `veterinarian`, `receptionist`. `server/src/middleware/roleCheck.js` exposes `authorize(...roles)` plus the shorthands `adminOnly`, `vetOrAdmin`, `adminOrReceptionist`, and `staffOnly`.

| Area | admin | veterinarian | receptionist |
|---|---|---|---|
| Appointments, pets, customers | ✅ | ✅ | ✅ |
| Medical records, disease cases | ✅ | ✅ | ❌ |
| Breeding registry | ✅ | ✅ | ❌ |
| Analytics | ✅ | ✅ | ❌ |
| Inventory, billing | ✅ | ❌ | ✅ |
| Inventory create/edit | ✅ | ❌ | ❌ |
| Reports, user management, audit logs | ✅ | ❌ | ❌ |

These constraints appear twice: as `requiredRoles` on `ProtectedRoute` in `client/src/App.jsx`, and as `authorize(...)` in the corresponding route file.

> **Client-side guards are a usability affordance, not a security boundary.** They prevent a user from navigating to a page they cannot use. The server is the enforcement point. Any new role-restricted feature must be gated in both places, and the server-side gate is the one that matters.

### Pet-owner account setup

Pet owners have no usable password until they establish one themselves; there is no shared default credential.

```
Login page → "Set Up Your Account"
    │
    ▼
POST /api/customer-auth/verify-identity
    Confirms the email and phone the clinic holds on file.
    Issues a setup token: 15-minute expiry, distinct JWT type,
    not accepted by authenticateCustomer.
    │
    ▼
POST /api/customer-auth/set-password
    Consumes the setup token, stores a bcrypt hash, logs the owner in.
```

Subsequent changes go through the authenticated `POST /api/customer-auth/change-password`, which requires the current password.

---

## 3. Backend structure

`server/src/` follows a consistent four-layer split. Each layer has one responsibility, and skipping a layer is the main thing to avoid.

```
routes/*Routes.js        HTTP method, path, middleware chain
controllers/*Controller.js  request/response handling, orchestration
models/*Model.js         raw SQL via pg
services/*Service.js     outbound calls to other systems
```

- **Routes** wire middleware and delegate. Each carries `@route` / `@desc` / `@access` comments that serve as the API reference.
- **Controllers** validate intent, call models and services, and shape the response. They do not contain SQL.
- **Models** own all SQL. Parameterized queries throughout.
- **Services** wrap the ML service (`mlService.js`), the AI/RAG service (`aiService.js`), and SMTP email (`emailService.js`).

Supporting directories: `middleware/` (auth, role checks, `express-validator` schemas), `config/` (connection pool, multer), `utils/` (JWT helpers, appointment rules), `data/` (static FAQ content).

### Response envelope

Every endpoint returns a consistent shape, which lets clients handle errors uniformly:

```json
{ "status": "success" | "error", "message": "...", "data": { } }
```

A global error handler in `app.js` catches unhandled errors and includes a stack trace only when `NODE_ENV=development`.

### Module system

The backend uses ES modules (`"type": "module"`). Relative imports require explicit `.js` extensions.

---

## 4. The AI assistant

The assistant is the most architecturally distinctive part of the system, and the only feature that spans all three services.

### Request path

```
Web: AIAssistant.jsx | GuestAIAssistant.jsx | PetOwnerAIWidget.jsx
iOS: PetOwnerAIView.swift | GuestAIView.swift
    │
    ▼
server: aiRoutes.js → aiController.js
    Resolves role and customerId SERVER-SIDE from the verified token.
    The client never states who it is.
    │
    ▼  aiService.js
ml: POST /api/ml/rag/chat
    Live-model gates (staff only) for outbreak risk, disease forecast,
    revenue forecast, and reorder suggestions short-circuit here if matched.
    │
    ▼
    rag_service.answer_question()
```

Because the backend derives role and customer identity from the token rather than the request body, a client cannot widen its own data access by claiming a different role.

### Live-model gates before the pipeline

Before `rag_service.py` is reached at all, `ml/app.py`'s `/api/ml/rag/chat` route regex-matches the raw question against four live-model question shapes — disease outbreak risk, disease trend forecast, revenue forecast, inventory reorder suggestions — and, for admin and veterinarian, answers directly from the corresponding trained model (`disease_prediction.py` / `sales_forecasting.py` / `inventory_forecasting.py`). A receptionist matches the same gate but gets an explicit "not available for your role" message instead of the model answer — analytics stays admin/vet territory even though receptionist is otherwise a staff role. These are live computations, never ingested into `rag_chunks`, so they're intercepted here rather than left to fall through to retrieval and get stitched from unrelated chunks. Guest and pet-owner questions matching the same phrasing skip these gates entirely and reach the pipeline below instead, since for those roles the question is ordinary general-knowledge/FAQ territory, not a request for the clinic's own live model.

### Routing inside `rag_service.py`

An incoming question is offered to five handlers in a deliberate order. The first that claims it wins; ordering matters because earlier handlers are more specific.

**1. `action_intent.py` — write intents**

Detects requests to book, reschedule, or cancel an appointment; send a reminder; register a customer; add a pet; or register staff (admin only).

This module never writes to the database. It returns a *proposed* action, which `aiController.confirmAction` executes only after the staff member explicitly confirms via `POST /api/ai/actions/confirm`. If a required detail is missing, it asks instead of proceeding.

**2. `clinical_tools.py` — whole-record generation**

Handles requests needing a pet's *complete* record set rather than a retrieval sample: full history summary, consultation-note draft, aftercare instructions, pre-appointment briefing. Fetches every relevant row by SQL first, then makes exactly one generation call.

Restricted to `CLINICAL_STAFF_ROLES` (admin and veterinarian), matching the `vetOrAdmin` boundary elsewhere. Nothing here saves a medical record or sends an email without review.

**3. `pet_health_intent.py` — pet health risk**

An individual pet's disease-recurrence/cancer risk, and clinic-wide pandemic risk, computed live by `PetHealthPredictor` — same "live model, not a chunk sample" reasoning as the pre-pipeline gates above, just resolved inside `rag_service.py` so it can reuse the shared pet-resolution machinery. Restricted to `PET_HEALTH_ROLES` (admin and veterinarian, same set as `CLINICAL_STAFF_ROLES`); returns `None` for guest/pet_owner, or an explicit role-denial for receptionist, so the question falls through.

> **Between 3 and 4: `chart_intent.py` — chart requests.** Not a sixth handler. The five above each own a *class of question*; this one owns a *form of answer*, and intercepts questions the structured layer below would otherwise claim. It fires only when the question contains an explicit trigger word (chart, graph, plot, visualize/visualise), and returns the same dict shape as `structured_query.py` plus a `chart` key the web client renders with recharts. Staff-only, and disease-case charts are `CLINICAL_STAFF_ROLES` only — receptionist gets `_clinical_detail_redirect()`, as everywhere else. It must run *before* `structured_query.py` rather than after: chart questions share their nouns with patterns already covered there ("graph revenue by month" contains the same "revenue" that `BILLING_REVENUE_TIMEFRAME` matches), and whichever runs first claims the question, so the reverse order would answer a chart request with a one-line sentence. The trigger requirement is what makes this safe in both directions — a plain "what's our revenue this month?" never reaches it. See [`rag-query-coverage.md`](rag-query-coverage.md) for the six supported categories.

**4. `structured_query.py` — exact answers**

Answers counting and listing questions ("how many appointments today?"), clinic info (hours/location/contact — every role including guests), and pet-owner self-service (their own appointments, their own billing balance) with deterministic SQL, bypassing embeddings entirely.

**5. `retrieval.py` — semantic search**

pgvector similarity search over `rag_chunks`, then a grounded generation call with source citations.

### Why counting bypasses RAG

Retrieval returns only the top *k* matching chunks — a sample, never the full set. Asking a language model to count from a sample produces a confident, plausible, wrong number. This is the single most damaging failure mode for a clinical tool, because the answer looks authoritative.

Two defences apply. Recognized aggregate questions are routed to SQL. For anything that slips through, the staff system prompt instructs the model to state that it sees only top matches and direct the user to the relevant page, rather than extrapolating.

### Two governing rules

Both recur across `action_intent.py`, `clinical_tools.py`, and `structured_query.py`, and any extension should preserve them:

- **The model parses; it never decides.** A generation call converts free text into a JSON slot object. Every resolution of a pet, customer, veterinarian, appointment, or date is a real SQL lookup or deterministic date arithmetic.
- **Ask rather than guess.** Ambiguity produces a clarifying question. Common pet names collide across owners, so "Max" without an owner is genuinely ambiguous — answering from the wrong pet's records is worse than a follow-up question.

### Conversation state

There is no server-side session. Multi-turn slot filling round-trips a `pending_intent` object (intent type plus slots collected so far) through the client, which echoes it back on the next request. This keeps the ML service stateless and horizontally scalable.

### Access scoping

Three modes, enforced in the retrieval SQL rather than in the interface:

| Mode | Visible chunks |
|---|---|
| Guest | Public FAQ chunks only (`pet_id IS NULL AND customer_id IS NULL`, excluding `staff_faq`) |
| Pet owner | Chunks matching their own `customer_id`, plus public FAQs |
| Receptionist | Clinic-wide, excluding `disease_case`, `lab_report`, `medical_record` |
| Vet / admin | Clinic-wide, including internal `staff_faq` |

Guest retrieval additionally applies a relevance threshold, so a question with no genuine FAQ match does not surface five near-miss articles presented as sources.

### Vector store

Clinic data is chunked and embedded into the `rag_chunks` table (`nomic-embed-text`, 768 dimensions) via `pgvector`. Rows are keyed on `(source_type, source_id)` with upsert semantics, so re-ingestion is idempotent. Admin-only endpoints under `/api/ai/ingest/` remain available for a bulk backfill or after editing static content like `faq_data.py`, but per-record ingestion is otherwise automatic and event-driven: a record's Node controller re-ingests it on create/update, calls `deleteChunk(source_type, source_id)` on delete (there's no FK from `rag_chunks` to `medical_records`/`disease_cases`/`lab_reports`/`vaccinations` to do this automatically), and calls `reingestPet(petId)` when a pet's name/species/breed changes (chunk text embeds those fields at ingestion time).

### Localization constraints

The clinic operates in Sri Lanka. System prompts mandate metric units and Sri Lankan Rupees. Because the local model reinserts imperial conversions regardless of instruction, `rag_service.py` additionally strips them with a regex post-process — a deterministic correction is more reliable than continued prompt tuning against a small model.

---

## 5. Predictive analytics

Separate from the assistant, though the assistant can explain its outputs in plain language via `POST /api/ai/explain`.

| Model | Script | Technique |
|---|---|---|
| Disease prediction and outbreak risk | `disease_prediction.py` | Random Forest, K-Means, Prophet |
| Sales forecasting | `sales_forecasting.py` | Prophet, Random Forest |
| Inventory demand forecasting | `inventory_forecasting.py` | Gradient Boosting |
| Individual pet health risk | `pet_health_predictor.py` | Breed predisposition tables, rule-based scoring |

Models are trained offline and pickled to `ml/models/*.pkl` with dated filenames. `ml/app.py` loads the newest file per model type at startup.

> `*.pkl` files are gitignored and absent from a fresh clone. ML endpoints report models as unavailable until training runs — expected behaviour, not a defect.

Retraining is triggered through admin-only endpoints (`/api/ml/*/train`), never automatically.

---

## 6. Data layer

PostgreSQL, 17 tables in `database/schema.sql`. Principal entities: `users`, `customers`, `pets`, `appointments`, `medical_records`, `vaccinations`, `lab_reports`, `disease_cases`, `inventory`, `billing`, `payments`, `audit_logs`, `system_settings`, `rag_chunks`.

### Migrations

Incremental changes live in `database/migrations/*.sql`.

> **There is no migration runner.** Migrations are applied by hand, and the filesystem is not a record of what any given database has received. Verify the live schema before assuming state.

Notable: `add_rag_vector_store.sql` (pgvector extension and `rag_chunks`), `add_customer_auth.sql` (pet-owner credential columns).

### Configuration

A `system_settings` table exists and is populated by `seed.sql`, but **no application code currently reads from it.** Clinic-policy answers given by the assistant come from the static `STAFF_FAQS` list in `ml/scripts/rag/faq_data.py`, and operational constants live in code. Wiring `system_settings` through to both is outstanding work; until then, policy text can drift from what the clinic has actually configured.

Appointment booking rules are centralized in `server/src/utils/appointmentRules.js` so the booking controller and the availability endpoint cannot diverge: Monday–Saturday, 09:00–18:30, 30-minute slots, up to three concurrent appointments per slot, 48-hour minimum lead time on create, reschedule, and cancel. Change the constants there, never in calling code.

### File uploads

Pet images, profile images, and lab reports are stored on disk under `server/uploads/`, handled by `multer`, and served statically at `/uploads`. Contents are gitignored.

---

## 7. Frontend structure

```
client/src/
├── pages/        route-level components
├── components/   reusable UI and route guards
├── context/      AuthContext, CustomerAuthContext, NotificationContext
├── services/     axios wrappers, one per API domain
├── styles/       page-specific CSS
└── utils/        formatting helpers
```

Routing is declared in `App.jsx`. `ProtectedRoute` guards staff routes and accepts `requiredRoles`; `PetOwnerProtectedRoute` guards portal routes. Guest routes are unguarded.

### Known issue: no design token layer

Styling is currently applied through inline style objects — roughly 1,400 across the JSX — with no CSS custom properties defined anywhere. The codebase contains 146 distinct hex colour values, and the web app uses a blue accent (`#3b82f6` / `#137fec`) while the iOS app uses teal (`#127d8c`), so the two clients are visually divergent.

Consolidating these into a shared token layer is tracked as remediation work; see [`SCOPE.md`](SCOPE.md) §5.

---

## 8. iOS client

SwiftUI, targeting iOS 26.5. Serves pet owners and guests only — there is no staff-facing mobile interface, by design (see [`SCOPE.md`](SCOPE.md) §4).

Key files: `VetCareApp.swift` (entry point, session-based routing), `CustomerSession.swift` (observable auth state injected into the view hierarchy), `APIConfig.swift` (base URL), `APIClient.swift`, `Theme.swift`.

Detailed walkthroughs: `mobile/ios/VetCare/docs/app-flow.md` and `rag-and-ai.md`.

> `APIConfig.baseURL` is hard-coded to a development machine hostname. It must be changed for any other environment.

---

## 9. Cross-cutting decisions

**Local-only inference.** Ollama runs locally, so no clinic data leaves the machine and there is no per-token cost. The trade-off is a smaller model with weaker instruction-following, which is why deterministic post-processing and SQL routing carry more of the correctness burden than prompt engineering does.

**Decision support, never diagnosis.** Every assistant response is positioned as decision support. System prompts forbid stating a diagnosis as fact. No AI-generated clinical content is persisted without explicit review.

**Confirm before write.** No conversational interaction mutates data without an explicit confirmation step.

**Defence in depth on access.** Role restrictions are enforced at the route, in the retrieval SQL, and in the system prompt. The interface layer is never the only barrier.