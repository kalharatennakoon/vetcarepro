# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## Overview

VetCare Pro is a veterinary clinic management system for Pro Pet Animal Hospital, covering appointments, electronic medical records, billing, inventory, and disease-case tracking, plus ML-driven analytics and a RAG-based AI assistant. The codebase is proprietary and private — see `LICENSE`.

Four services make up the system. `./run.sh` from the repository root starts `ollama serve`, the backend, the ML service, and the frontend in parallel (Ctrl+C stops all four).

| Service | Path | Stack | Port |
|---|---|---|---|
| Frontend | `client/` | React 19, Vite, React Router 7, Recharts | 5173 |
| Backend API | `server/` | Node.js, Express 5, PostgreSQL (`pg`), JWT | 3000 |
| ML / RAG service | `ml/` | Python, Flask, scikit-learn, Prophet, Ollama | 5001 |
| iOS app | `mobile/ios/VetCare/` | Swift, SwiftUI, Xcode | — |

The iOS app is a pet-owner and guest client only; it consumes the same backend API and has no staff-facing screens. Its own documentation lives in `mobile/ios/VetCare/docs/` (`app-flow.md`, `rag-and-ai.md`).

## Commands

```bash
# Backend — server/
npm install && cp .env.example .env
npm run dev                    # nodemon, http://localhost:3000
npm start                      # node src/server.js

# Frontend — client/
npm install
npm run dev                    # http://localhost:5173
npm run build                  # vite build
npm run lint                   # eslint .

# ML service — ml/
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
./start.sh                     # http://localhost:5001
python test_setup.py           # DB connectivity + data-loading sanity check

# Database
psql -U postgres -c "CREATE DATABASE vetcarepro;"
psql -U postgres -d vetcarepro -f database/schema.sql
psql -U postgres -d vetcarepro -f database/seed.sql      # or demo_seed.sql

# Health checks
curl http://localhost:3000/health
curl http://localhost:5001/api/ml/health
```

Run the ML service via `./start.sh` or the venv's interpreter (`./venv/bin/python app.py`) rather than a bare `python app.py`, which will resolve against the system interpreter and fail on missing dependencies.

### Verification

There is no automated test suite. `server/package.json`'s `test` script is an unimplemented stub, `server/tests/` contains only a bcrypt scratch script, and `ml/test_setup.py` checks database connectivity rather than behaviour. The Swift test targets under `VetCareTests/` and `VetCareUITests/` are the scaffolded defaults.

Verify changes accordingly:

- **Backend** — hit `/health` and exercise the affected endpoints directly.
- **Frontend** — `npm run build` and `npm run lint`, then exercise the feature in a browser. Per project convention, UI changes are confirmed visually rather than assumed correct from a clean build.
- **ML / RAG** — `python test_setup.py`, then call the affected `/api/ml/*` route.

### Ollama dependency

The AI assistant requires Ollama running locally with both models pulled:

```bash
ollama pull nomic-embed-text          # embeddings, 768-dim
ollama pull qwen2.5:7b-instruct       # generation; override via OLLAMA_CHAT_MODEL
```

Without Ollama, chat endpoints degrade to an "unavailable" message rather than erroring — a passing health check does not imply the assistant is functional.

## Architecture

### Request flow and the auth boundary

The frontend and iOS app never reach PostgreSQL or Ollama directly. Everything routes through `server/`, which is the sole authority on caller identity. Two independent authentication systems coexist and must never intersect:

- **Staff auth** — `authenticate` (`server/src/middleware/auth.js`) verifies the JWT and attaches `req.user`. `authorize(...)` and its shorthands `adminOnly`, `vetOrAdmin`, `adminOrReceptionist`, `staffOnly` (`roleCheck.js`) gate by role: `admin`, `veterinarian`, `receptionist`.
- **Customer (pet-owner) auth** — `authenticateCustomer` verifies a JWT carrying a distinct `type: 'customer'` claim and attaches `req.customer`. A staff token is rejected here and vice versa. The frontend keeps these separate too: `CustomerAuthContext.jsx` with a `customerToken` localStorage key, versus `AuthContext.jsx` with a plain `token`.

Layering in `server/src/` is consistent: `routes/*Routes.js` wire middleware and controllers, `controllers/*Controller.js` handle request and response, `models/*Model.js` hold the raw SQL, and `services/` wrap outbound calls to the ML service (`mlService.js`), the AI/RAG service (`aiService.js`), and email (`emailService.js`).

Role scoping runs throughout. Medical records and disease cases are vet/admin only; inventory and billing are admin/receptionist; reports are admin only. These constraints are mirrored in `client/src/App.jsx` route guards (`ProtectedRoute requiredRoles={[...]}`) and in server-side `authorize(...)` calls. **Client-side guarding is a UX affordance only — the server is the enforcement point.** When adding a role-restricted feature, change both.

### AI assistant (RAG)

The pipeline crosses all three services: `client` (`AIAssistant.jsx` for staff, `GuestAIAssistant.jsx`, `PetOwnerAIWidget.jsx`) → `server` (`aiRoutes.js` / `aiController.js`, which resolve role and `customerId` server-side and forward via `aiService.js`) → `ml/app.py`'s `/api/ml/rag/chat` → the modules in `ml/scripts/rag/`.

Before any of that pipeline runs, `/api/ml/rag/chat` itself regex-matches the raw question against four live-model question shapes — disease outbreak risk, disease trend forecast, revenue forecast, and inventory reorder suggestions — and, for staff roles, answers directly from the corresponding trained model (`ml/scripts/disease_prediction.py` / `sales_forecasting.py` / `inventory_forecasting.py`) via `explain_ml_output`, short-circuiting before `rag_service.answer_question` is ever called. Guest and pet_owner questions matching those same phrasings (e.g. "what should I do during a dog disease outbreak?") deliberately fall through to the normal pipeline instead, since for those roles it's ordinary general-knowledge/FAQ territory, not a request for the clinic's live risk model. Anyone adding a new live-model-backed question needs to add its gate here, in `ml/app.py`, not inside `rag_service.py`.

`rag_service.py` then orchestrates the pipeline proper, attempting five paths in a deliberate order:

1. **`action_intent.py`** — detects staff write-intents (book, reschedule, or cancel an appointment; send a reminder; register a customer; add a pet; register staff, admin only). It never writes to the database itself: it proposes an action that `aiController.js`'s `confirmAction` executes only after explicit user confirmation, or asks a follow-up when a slot is unfilled.
2. **`clinical_tools.py`** — capabilities needing a pet's *complete* record set rather than a top-k sample: full history summary, consultation-note draft, aftercare instructions, and pre-appointment briefing. Restricted to `CLINICAL_STAFF_ROLES` (admin and veterinarian). Nothing here saves a record or sends an email without review.
3. **`pet_health_intent.py`** — an individual pet's disease-recurrence/cancer risk, and clinic-wide pandemic risk, computed live by `PetHealthPredictor` — never through RAG retrieval, same "live model, not a text sample" reasoning as the pre-pipeline gates above. Admin-only (`PET_HEALTH_ADMIN_ROLES`); the module gates internally and returns `None` for any other role so the question falls through to the next path.
4. **`structured_query.py`** — answers exact count/list questions ("how many appointments today?"), clinic info (hours/location/contact, read from `system_settings` — every role including guests, checked first within it), and pet-owner self-service (their own upcoming appointments, their own billing balance, scoped to `customer_id` directly) with deterministic SQL, never through the LLM.
   - **`chart_intent.py`** is dispatched from `answer_question` immediately *before* this one, and is not a sixth path — the five here each own a class of question, while it owns a form of answer, returning the same dict shape plus a `chart` key the web client renders with recharts (staff-only, web-only; disease-case charts are `CLINICAL_STAFF_ROLES` only). It claims a question only when an explicit trigger word is present (chart/graph/plot/visualize), which is what keeps "what's our revenue this month?" a sentence. The ordering is load-bearing in one direction only: chart questions reuse nouns this handler already matches ("revenue", "appointments … status"), so running it second would answer a chart request as a one-line sentence — while the trigger requirement means it can never steal a plain question in return.
5. **`retrieval.py`** — pgvector similarity search over embedded chunks, filtered by role and customer ID *in the SQL*, not in the UI.

Supporting modules: `ingest.py` and `chunking.py` convert clinic data into embedded chunks; `ollama_client.py` handles both embeddings and generation; `faq_data.py` holds the seed FAQ content.

Two design rules recur across these modules and should be preserved in any extension:

- **The LLM parses; it never decides.** One generation call turns free text into a JSON slot object. Every resolution of a pet, customer, veterinarian, appointment, or date is a real SQL lookup or deterministic date arithmetic.
- **Ask rather than guess.** An ambiguous pet name (common names such as "Max" collide across owners) or a missing slot produces a clarifying question, not a best guess. There is no server-side conversation session — multi-turn slot filling round-trips a `pending_intent` object through the client.

Three access modes are enforced server-side and again at the retrieval SQL layer: **guest**, **pet owner** (own records only), and **staff** (clinic-wide, scoped further by role — receptionists are excluded from clinical detail, matching the `vetOrAdmin` boundary in the rest of the app). Guest retrieval is scoped to public FAQs only, but generation is not context-only the way owner/staff answers are: when no FAQ matches, the guest prompt deliberately falls back to the model's general veterinary knowledge rather than deflecting — under a strict rule never to name any medicine, drug, or supplement (even unbranded, even if directly asked), always redirecting to an in-person vet visit instead. Preserve that fallback-plus-safety-rule pairing in any change to `GUEST_SYSTEM_PROMPT` — the fallback is what makes the guest assistant useful for common pet-care questions the FAQ set doesn't cover, and the rule is what keeps that fallback safe.

Aggregate questions are routed to SQL because retrieval only ever surfaces a handful of chunks; the staff system prompt additionally instructs the model to decline counts rather than extrapolate from its sample. Prompts also enforce metric units and Sri Lankan Rupees, with a regex post-process in `rag_service.py` stripping imperial asides the local model reinserts regardless of instruction — currency normalization is skipped specifically on the guest general-knowledge fallback path (no FAQ chunk matched), since a genuinely foreign-currency figure there would otherwise be relabeled into Rs. at the same digit value, misstating it by orders of magnitude.

### ML analytics

Distinct from RAG. `ml/scripts/disease_prediction.py`, `sales_forecasting.py`, `inventory_forecasting.py`, and `pet_health_predictor.py` are trained offline and pickled into `ml/models/*.pkl` with dated filenames (for example `disease_prediction_20260721.pkl`). `ml/app.py` loads the newest file per model type via `max(glob(...))` at startup.

The `.pkl` files are gitignored and absent from a fresh clone, so ML endpoints will report models as unavailable until training runs. Retraining is triggered through admin-only endpoints (`/api/ml/*/train`), never automatically. `server/src/services/mlService.js` proxies `/api/ml/*` calls from the backend to Flask.

### Database

Schema lives in `database/schema.sql` (17 tables), seed data in `seed.sql` or `demo_seed.sql`. Incremental changes since the base schema sit in `database/migrations/*.sql`.

**There is no migration runner.** Migrations are applied by hand, and the filesystem is not a record of what a given database has actually received — check the live schema before assuming state. Notable migrations include `add_rag_vector_store.sql` (the `pgvector` extension and `rag_chunks` table) and `add_customer_auth.sql` (pet-owner credential columns on `customers`).

See `DATABASE.md` for connection details and seeded test credentials.

### Pet-owner account setup

Pet owners have no usable password until they complete setup themselves; there is no shared default. From the login page they choose "Set Up Your Account", confirm the email and phone the clinic holds on file (`POST /api/customer-auth/verify-identity`, which issues a short-lived 15-minute setup token with its own JWT `type`), then choose a password (`/set-password`). A separate authenticated `/change-password` route handles subsequent changes.

### Appointment rules

`server/src/utils/appointmentRules.js` centralizes self-service booking constraints so the booking controller and the availability endpoint cannot drift: clinic open Monday–Saturday 09:00–18:30, 30-minute slots, up to three concurrent appointments per slot, and a 48-hour minimum lead time on create, reschedule, and cancel. Change the constants there rather than in calling code.

`appointmentRules.js`'s hardcoded constants are authoritative for what the booking flow actually enforces. `system_settings.business_hours_start`/`business_hours_end` (read by the AI assistant's clinic-hours answer, see `structured_query.py`'s `_clinic_hours`) is a separate, admin-editable copy of the same fact with no code path keeping the two in sync — if you change one, change the other, or the assistant will confidently quote hours the portal doesn't honor. `system_settings.lunch_break_start`/`lunch_break_end` is informational only; nothing in `appointmentRules.js` blocks booking during that window, so the assistant's answer deliberately omits it rather than implying a restriction that isn't real.

### Uploads

`server/uploads/` holds pet images, profile images, and lab reports, is `multer`-backed, and is served statically at `/uploads`. Its contents are gitignored and absent after a fresh clone.

## Conventions

- API responses follow a consistent envelope: `{ status: 'success' | 'error', message, data }`.
- The backend uses ES modules (`"type": "module"`); imports require explicit `.js` extensions.
- SQL belongs in `models/`, not in controllers.
- New RAG capabilities extend the existing module chain in `ml/scripts/rag/` rather than adding branches to `rag_service.answer_question` directly.
- Every RAG-ingested source type must wire its full `rag_chunks` lifecycle, via the `ingest*`/`reingestPet`/`deleteChunk` wrappers in `server/src/services/aiService.js` (backed by `ml/scripts/rag/ingest.py`): re-ingest on create/update, call `deleteChunk(source_type, source_id)` on delete (`rag_chunks` has no FK to `medical_records`/`disease_cases`/`lab_reports`/`vaccinations` — only to `pets`/`customers`, which cascade automatically — so a skipped delete hook leaves the assistant citing data that no longer exists), and call `reingestPet(pet_id)` after a pet's name/species/breed changes (chunk text embeds those fields at ingestion time and won't otherwise pick up the new value). Editing `faq_data.py` also needs a manual `POST /api/ml/rag/ingest/faqs` re-run — the Python list alone isn't what the assistant retrieves from.
- `PersonalContext/` holds the author's working notes and is not part of the application.