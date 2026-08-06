# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

VetCare Pro is a full-stack veterinary clinic management system (Pro Pet Animal Hospital): appointments, EMR, billing, inventory, disease-case tracking, plus ML-powered analytics and a RAG-based AI assistant. Proprietary/private codebase — see `LICENSE`.

Four independent services, run together via `./run.sh` (starts `ollama serve`, server, ml, client in parallel):

| Service | Path | Stack | Port |
|---|---|---|---|
| Frontend | `client/` | React 19, Vite, React Router 7 | 5173 |
| Backend API | `server/` | Node/Express 5, PostgreSQL (`pg`), JWT | 3000 |
| ML/RAG service | `ml/` | Python/Flask, scikit-learn, Prophet, Ollama | 5001 |
| iOS app | `mobile/ios/VetCare` | Swift/Xcode, hits the same backend API | — |

## Commands

```bash
# Backend (server/)
npm install && cp .env.example .env
npm run dev              # nodemon, http://localhost:3000
# no test script defined (npm test is a stub)

# Frontend (client/)
npm install
npm run dev               # http://localhost:5173
npm run build              # vite build
npm run lint                # eslint .

# ML service (ml/) — always use start.sh or venv's python, never bare `python app.py`
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
./start.sh                  # or: ./venv/bin/python app.py — http://localhost:5001
python test_setup.py         # verifies DB connection + data loading, not a full test suite

# Database
psql -U postgres -c "CREATE DATABASE vetcarepro;"
psql -U postgres -d vetcarepro -f database/schema.sql
psql -U postgres -d vetcarepro -f database/seed.sql   # or demo_seed.sql for demo data
# one-off changes since schema.sql live in database/migrations/*.sql — apply individually, no runner

# Health checks
curl http://localhost:3000/health
curl http://localhost:5001/api/ml/health
```

There is no automated test suite for `server/` or `client/`. `ml/test_setup.py` only sanity-checks DB connectivity. Verify backend changes via the `/health` endpoints and manual API calls; verify frontend changes with `npm run build` + `npm run lint` and, per the project's UI-change convention, exercising the feature in a browser.

Ollama must be running locally with `nomic-embed-text` and `qwen2.5-coder:7b` pulled for the AI assistant to work; without it, chat endpoints degrade to an "unavailable" message rather than erroring.

## Architecture

### Request flow and auth boundary
`client` never talks to Postgres or Ollama directly — everything goes through `server`, which is the sole source of truth for *who the caller is*. Two entirely separate auth systems coexist and must never cross:
- **Staff auth**: `authenticate` middleware (`server/src/middleware/auth.js`) verifies a JWT and attaches `req.user`; `authorize(...)` / `adminOnly` / `vetOrAdmin` / `staffOnly` (`roleCheck.js`) gate by role (`admin`, `veterinarian`, `receptionist`).
- **Customer (pet-owner) auth**: `authenticateCustomer` verifies a JWT with a distinct `type: 'customer'` claim and attaches `req.customer` — a staff token is rejected here and vice versa. Separate frontend context (`CustomerAuthContext.jsx`) and localStorage key (`customerToken`) from staff (`AuthContext.jsx`, plain `token`).

Route → controller → model layering in `server/src/`: `routes/*Routes.js` wire middleware + controller; `controllers/*Controller.js` handle req/res; `models/*Model.js` hold the raw SQL (via `pg`); `services/` wrap outbound calls to the ML service (`mlService.js`), AI/RAG service (`aiService.js`), and email (`emailService.js`).

Role scoping matters throughout: e.g. `/medical-records` and `/disease-cases` are vet/admin-only, `/inventory` and `/billing` are admin/receptionist, `/reports` is admin-only — mirrored in both `client/src/App.jsx` route guards (`ProtectedRoute requiredRoles={[...]}`) and server-side `authorize(...)` calls. Client-side guarding is UX only; the real enforcement is server-side.

### AI assistant (RAG) — cross-service feature
Full walkthrough: `docs/HOW_THE_AI_ASSISTANT_WORKS.md`. Summary of the pipeline: `client` (`AIAssistant.jsx` for staff, `GuestAIAssistant.jsx`, `PetOwnerAIWidget.jsx`) → `server` (`aiController.js`/`aiRoutes.js`, which resolve role/customerId server-side and forward to Flask via `aiService.js`) → `ml/app.py`'s `/api/ml/rag/chat` → `ml/scripts/rag/`:
- `rag_service.py` — traffic controller: decides action vs. exact-SQL vs. full RAG.
- `action_intent.py` — detects write-intents (book/cancel/reschedule appointment, register customer) via pattern matching, extracts structured fields via the LLM, always requires explicit user confirmation before any DB write.
- `structured_query.py` — answers exact count/list questions (e.g. "how many appointments today?") with deterministic SQL, never via the LLM — retrieval only ever sees a handful of chunks, so counting via RAG would be a guess.
- `retrieval.py` — pgvector similarity search over embedded chunks, filtered by caller role/customer ID at the SQL level (not just hidden in the UI).
- `ingest.py` / `chunking.py` — turn clinic data into embedded chunks (`nomic-embed-text`, 768-dim, via Ollama).
- `ollama_client.py` — talks to Ollama for both embeddings and generation (`qwen2.5-coder:7b`, overridable via `OLLAMA_CHAT_MODEL`).

Three access modes enforced server-side: guest (public FAQs only), pet owner (own records only), staff (full data, further scoped by role — e.g. receptionists don't get clinical diagnosis detail).

### ML analytics (separate from RAG)
`ml/scripts/disease_prediction.py`, `sales_forecasting.py`, `inventory_forecasting.py` are trained offline and pickled into `ml/models/*.pkl` (filename-dated, e.g. `disease_prediction_20260721.pkl`); `ml/app.py` loads the *latest* file per model type (`max(glob(...))`) at startup. `server/src/services/mlService.js` proxies `/api/ml/*` calls from `server` to Flask. Retraining is triggered via an admin-only endpoint, not automatic.

### Database
Schema in `database/schema.sql`, seed data in `database/seed.sql` (or `demo_seed.sql`), incremental changes since then in `database/migrations/*.sql` (no migration runner — apply manually, and check which have already landed against a given DB before assuming schema state). Notable: `pgvector` extension for RAG embeddings (`add_rag_vector_store.sql`), separate `password_hash`/`password_must_change` on `customers` for pet-owner auth (`add_customer_auth.sql`). See `DATABASE.md` for connection details and seeded test credentials.

### Pet-owner portal password flow
New/seeded customers get a default password (`DEFAULT_CUSTOMER_PASSWORD` in `server/src/utils/authUtils.js`) and `password_must_change = true`; first login forces `PetOwnerVerifyIdentity` → `PetOwnerSetPassword` before granting access, driven by `POST /api/customer-auth/verify-identity` and `/set-password`. There's currently no self-service "change password" flow outside that first-login path.

### Uploads
`server/uploads/` (pet images, lab reports) is `multer`-backed, served statically at `/uploads`, and is gitignored — not present after a fresh clone.
