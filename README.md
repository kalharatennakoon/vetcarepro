# VetCare Pro: Veterinary Clinic Management, Extended with a Local RAG AI Assistant

![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red)

![VetCare Pro Overview](docs/images/overview.png)
*Overview generated using [NotebookLM](https://notebooklm.google.com) — for illustrative purposes only.*

A full-stack veterinary clinic management system for Pro Pet Animal Hospital, covering appointment scheduling, electronic medical records, billing, and inventory. Under an eight-week **AI Launchpad** programme it was extended with two additions: a retrieval-augmented AI assistant that answers questions and drafts clinical content grounded in the clinic's own data (never the model's general training), and a companion iOS app giving pet owners and guests their own self-service access. A separate ML layer forecasts disease outbreak risk, sales revenue, and inventory demand from the clinic's history.

---

## Tech Stack

- **Frontend:** React 19, Vite, React Router, Recharts, Axios
- **Backend:** Node.js, Express 5, PostgreSQL, JWT Auth, Multer
- **ML Service:** Python, Flask, scikit-learn, Prophet, Pandas
- **AI Assistant:** Retrieval-Augmented Generation (RAG) over [Ollama](https://ollama.com), running fully local/free (no external API keys or per-token cost)
- **Mobile:** SwiftUI (iOS) — pet-owner and guest client only; no staff-facing mobile app

---

## AI Assistant (RAG)

VetCare Pro includes an AI assistant/copilot built with Retrieval-Augmented Generation, grounded in the clinic's own data rather than the model's general training - positioned strictly as a **decision-support tool, never a replacement for professional veterinary judgment**.

**Models (via [Ollama](https://ollama.com), running locally):**

| Purpose | Model | Notes |
|---|---|---|
| Embeddings | `nomic-embed-text` | 768-dim vectors, stored in Postgres via `pgvector` |
| Chat / generation (text) | `qwen3:8b` | Configurable via the `OLLAMA_CHAT_MODEL` env var |
| Chat / generation (vision, photo guidance only) | `qwen3.5:9b` | Configurable via the `OLLAMA_VISION_MODEL` env var |

Two separate models rather than one vision-capable model for everything, since 16GB of unified memory can't comfortably hold both resident at once - Ollama loads whichever is needed on demand instead.

Install Ollama, then pull all three models before starting the ML service:

```bash
ollama pull nomic-embed-text
ollama pull qwen3:8b
ollama pull qwen3.5:9b
```

**What it does:**
- Answers questions grounded in pet records, FAQs, and care instructions, citing its sources
- For veterinarians and admins: drafts full patient history summaries, consultation notes, owner-friendly aftercare instructions, and pre-appointment briefings from a pet's complete record set — always a draft, nothing saved without human review
- For veterinarians and admins: assesses an individual pet's disease-recurrence/cancer risk and clinic-wide outbreak/pandemic risk, computed live from breed and clinical data rather than guessed from a retrieval sample
- Translates existing ML outputs (disease outbreak risk, sales/inventory forecasts) into clear natural-language explanations
- Generates bar/pie charts (revenue, appointments, disease cases, inventory) on the web app when explicitly asked for one ("chart", "graph", "plot") — a plain question stays a plain answer
- For staff, after an explicit confirmation step: books/reschedules/cancels appointments, sends reminders, and registers new customers, pets, and (admin only) staff conversationally
- For receptionists specifically: also answers billing questions — balances, payment status, price estimates

**Access is scoped by role**, so private clinic data stays protected:
- **Guest** (no login) - general pet-care info only, no clinic/account data
- **Pet owner** (logged in) - own pet/appointment/record data only
- **Clinic staff** (admin/veterinarian/receptionist) - full clinic data, scoped further per role (e.g. receptionists don't get clinical diagnosis detail)

Exact/aggregate questions ("how many appointments today?") are answered via deterministic SQL rather than semantic search, since RAG only ever sees a small sample of matching records and would otherwise risk a confidently-wrong guess at a count.

**Further reading**, under [`docs/`](docs/):
- [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) — full system architecture, the assistant's request pipeline, and where access control is enforced
- [`rbac.md`](docs/rbac.md) — what each staff role can and cannot do
- [`ml-system-overview.md`](docs/ml-system-overview.md) — the four ML/analytics models, in plain terms
- [`rag-query-coverage.md`](docs/rag-query-coverage.md) — exactly which assistant questions get an exact SQL answer vs. AI-generated
- [`ai-assistant-sample-questions.md`](docs/ai-assistant-sample-questions.md) — graded test questions for every access mode (guest, pet owner, and each staff role)
- [`SCOPE.md`](docs/SCOPE.md) — what's in scope, what's deliberately excluded, and known gaps

---

## Running Locally

### Prerequisites

- Node.js v18+
- PostgreSQL v14+
- Python 3.10+

### 1. Database

```bash
psql -U postgres -c "CREATE DATABASE vetcarepro;"
psql -U postgres -d vetcarepro -f database/schema.sql
psql -U postgres -d vetcarepro -f database/seed.sql
```

### 2. Backend

```bash
cd server
npm install
cp .env.example .env
```

Edit `.env` and fill in your values:

```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vetcarepro
DB_USER=postgres
DB_PASSWORD=your_db_password
JWT_SECRET=any_random_secret_string
ML_SERVICE_URL=http://localhost:5001
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

```bash
npm run dev        # runs on http://localhost:3000
```

### 3. Frontend

```bash
cd client
npm install
npm run dev        # runs on http://localhost:5173
```

### 4. ML Service

```bash
cd ml
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` and fill in your database credentials, then:

```bash
python app.py      # runs on http://localhost:5001
```

---

## Default Login Credentials (Seed Data)

| Role          | Email                  | Password      |
|---------------|------------------------|---------------|
| Admin         | admin1@propet.lk       | admin1@pass   |
| Veterinarian  | dulani@propet.lk       | password123   |
| Receptionist  | kumari@propet.lk       | password123   |
| Pet Owner     | kalharatennakoonmck@gmail.com| customer@pass |
| Pet Owner     | kavindra.d@gmail.com   | customer@pass |

    
> These credentials are only available after running the seed file.

Every other pet owner account — whether seeded or created later by staff — starts with no usable password; there is no shared default. To set one, the owner selects **"Set Up Your Account"** on the pet owner login page and confirms the email and phone number the clinic has on file (`POST /api/customer-auth/verify-identity`), then chooses a password (`/set-password`). Both routes live in `server/src/routes/customerAuthRoutes.js`.

---

## Notes

- The ML service is optional - the core app works without it, but analytics features will be unavailable.
- The AI assistant requires Ollama running locally with all three models pulled (see [AI Assistant (RAG)](#ai-assistant-rag) above) - without it, chat requests will return a "currently unavailable" message instead of failing the app.
- Email features require a valid SMTP configuration (e.g. a Gmail app password).
- Uploaded files (pet images, lab reports) are stored in `server/uploads/` and are not included in this repository.

---

## License

This project is proprietary software. See the [LICENSE](LICENSE) file for full terms.

All rights are reserved by the author. You may clone and run this project on your local machine for viewing and testing purposes only.

**Any other use — including deployment, modification, distribution, or commercial use — requires explicit written permission from the author.**

&copy; 2026 Kalhara Tennakoon. All Rights Reserved.
