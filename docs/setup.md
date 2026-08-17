# Setup

Running VetCare Pro locally. Covers all four services plus the local language model.

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 18+ | Backend and frontend |
| PostgreSQL | 14+ | `pgvector` extension required for the AI assistant |
| Python | 3.10+ | ML and RAG service |
| Ollama | latest | Local embeddings and generation |
| Xcode | 16+ | iOS app only; macOS required |

The ML service runs a 7B-parameter model locally. Allow roughly 8 GB of free memory while it is loaded.

---

## 1. Database

```bash
psql -U postgres -c "CREATE DATABASE vetcarepro;"
psql -U postgres -d vetcarepro -f database/schema.sql
psql -U postgres -d vetcarepro -f database/seed.sql
```

Use `demo_seed.sql` in place of `seed.sql` for a larger demonstration dataset.

### Migrations

Changes made after the base schema live in `database/migrations/*.sql`. **There is no migration runner** — apply them individually:

```bash
psql -U postgres -d vetcarepro -f database/migrations/add_rag_vector_store.sql
```

The filesystem is not a record of what any given database has received. Verify the live schema before assuming state:

```bash
psql -d vetcarepro -c "\dt"
psql -d vetcarepro -c "\d rag_chunks"
```

`add_rag_vector_store.sql` requires the `pgvector` extension and will fail without it. Install it through your package manager (`brew install pgvector` on macOS) before applying.

See [`database-schema.md`](database-schema.md) for the table reference.

---

## 2. Backend

```bash
cd server
npm install
cp .env.example .env
```

Fill in `.env`:

```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vetcarepro
DB_USER=postgres
DB_PASSWORD=your_db_password
JWT_SECRET=any_random_secret_string
ML_SERVICE_URL=http://localhost:5001
CLIENT_URL=http://localhost:5173
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

```bash
npm run dev          # nodemon, http://localhost:3000
```

The server tests its database connection before binding a port and exits if it fails, so a startup failure here is almost always a database configuration problem.

Email features need valid SMTP credentials — a Gmail app password works. Without them the rest of the system runs normally; only sending fails.

---

## 3. Frontend

```bash
cd client
npm install
npm run dev          # http://localhost:5173
```

---

## 4. ML and RAG service

### Install Ollama models first

```bash
ollama pull nomic-embed-text      # embeddings, 768-dimension
ollama pull qwen3.5:9b             # generation (text and vision)
ollama serve
```

### Start the service

```bash
cd ml
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # fill in database credentials
./start.sh                        # http://localhost:5001
```

> Always start through `./start.sh` or the virtual environment's interpreter (`./venv/bin/python app.py`). A bare `python app.py` resolves against the system interpreter and fails on missing dependencies.

### Populate the vector store

The assistant cannot answer from clinic data until content is embedded. With the backend running, call the admin-only ingest endpoint:

```bash
curl -X POST http://localhost:3000/api/ai/ingest/all \
  -H "Authorization: Bearer <admin_token>"
```

Ingestion is idempotent — rows are keyed on `(source_type, source_id)` and upserted, so re-running is safe.

---

## 5. All services at once

From the repository root:

```bash
./run.sh
```

Starts Ollama, backend, ML service, and frontend in parallel. `Ctrl+C` stops all four. Prerequisites and `.env` files must already be in place.

---

## 6. iOS app

```bash
open mobile/ios/VetCare/VetCare.xcodeproj
```

Build and run against the iOS Simulator, which shares the host machine's network.

> `APIConfig.baseURL` in `mobile/ios/VetCare/APIConfig.swift` is hard-coded to a development machine hostname. Change it to your own machine's address before running. On a physical device use your LAN IP — `http://192.168.1.20:3000/api` — since `localhost` resolves to the device itself.

---

## Verifying the installation

```bash
curl http://localhost:3000/health
curl http://localhost:5001/api/ml/health
```

Then sign in through the web app with a seeded staff account (credentials are in `DATABASE.md`) and confirm the dashboard loads.

### What "healthy" does not cover

- **A passing ML health check does not mean models are loaded.** Trained `.pkl` files are gitignored and absent from a fresh clone. Analytics endpoints report models as unavailable until training is triggered through the admin-only `/api/ml/*/train` endpoints. This is expected, not a fault.
- **A passing health check does not mean the assistant works.** Without Ollama running, chat endpoints return an "unavailable" message rather than an error. Check `ollama list` shows both models.
- **An empty vector store looks like a working assistant giving unhelpful answers.** If responses are vague or cite no sources, run the ingest step above.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Server exits immediately at startup | Database unreachable or credentials wrong in `server/.env` |
| `ModuleNotFoundError` in the ML service | Started with the system interpreter instead of the venv |
| Assistant replies "currently unavailable" | Ollama not running, or models not pulled |
| Assistant answers vaguely and cites nothing | Vector store empty — run `/api/ai/ingest/all` |
| Analytics show "model unavailable" | No trained `.pkl` files; trigger retraining |
| `relation "rag_chunks" does not exist` | `add_rag_vector_store.sql` not applied |
| CORS errors in the browser | `CLIENT_URL` in `server/.env` does not match the frontend origin |
| iOS app cannot reach the API | `APIConfig.baseURL` still points at the original development machine |