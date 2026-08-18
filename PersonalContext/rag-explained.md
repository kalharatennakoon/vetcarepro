# How RAG Works in VetCare Pro (Simple Terms)

**RAG = Retrieval-Augmented Generation.** Instead of letting the AI just make things up, the system first *looks up* real facts from the database, then asks the AI to *write an answer using only those facts*. That's why the assistant can say "Max's last vaccination was on 2026-07-15" instead of guessing.

## 1. The journey of one question

| Step | Where | What happens |
|---|---|---|
| 1 | **Browser / iOS app** | User types a question in the AI chat widget |
| 2 | **`server/` (Node backend)** | Figures out *who's asking* (guest, pet owner, or staff+role) and forwards the question — never trusts the client to say who it is |
| 3 | **`ml/app.py` (Flask)** | Before anything else, checks: is this asking for a live ML prediction (disease outbreak, revenue forecast, inventory reorder)? If yes and caller is staff, answers straight from the trained model and stops here |
| 4 | **`rag_service.py`** | The main brain — tries 5 different strategies in order (see table below) until one can answer |
| 5 | **Back to browser** | Answer + (if relevant) source citations or a chart |

## 2. The 5 strategies, tried in order

Think of these as five specialists the question gets shown to, one after another, until one says "I've got this."

| # | Module | Handles | Example question |
|---|---|---|---|
| 1 | `action_intent.py` | Staff wants to **do** something (book/cancel appointment, add a customer) | "Book Max in for 3pm Tuesday" |
| 2 | `clinical_tools.py` | Vet/admin needs a pet's **complete** record, not a sample | "Summarize this pet's full history" |
| 3 | `pet_health_intent.py` | A **live risk prediction** for one pet or the whole clinic | "What's this dog's cancer risk?" |
| 4 | `structured_query.py` (+ `chart_intent.py`) | An **exact fact** answerable by SQL — counts, lists, clinic hours, a pet owner's own bill | "How many appointments today?" / "Graph revenue by month" |
| 5 | `retrieval.py` | Nothing above matched → fall back to **semantic search** over embedded documents | "What's the best food for a senior cat?" |

**Why this order?** Steps 1–4 are *exact and deterministic* (real SQL, real live models) — much more trustworthy than guessing from text. Retrieval (step 5) is the fallback because it only ever sees a handful of matching snippets, so it's best used for open-ended, knowledge-style questions rather than facts/numbers.

## 3. Who can see what

| Role | Can retrieve |
|---|---|
| Guest (not logged in) | Public FAQs only |
| Pet owner | Their own pets/records + public FAQs |
| Receptionist | Clinic-wide, but **not** clinical detail (no medical records, disease cases, lab reports) |
| Vet / Admin | Everything clinic-wide, including internal staff notes |

This filtering happens **inside the SQL query itself**, not just hidden in the UI — so there's no way to trick the frontend into showing someone else's data.

## 4. What each file in `ml/scripts/rag/` does

| File | Lines | Simple job |
|---|---|---|
| `rag_service.py` | 821 | The **conductor** — receives the question, tries the 5 strategies in order, builds the final prompt, calls the AI, cleans up the answer (fixes units/currency) |
| `ollama_client.py` | 239 | The **phone line to the AI** — thin wrapper that talks to the local Ollama server for both embeddings (turning text into numbers) and generating chat answers |
| `retrieval.py` | 200 | The **librarian** — does the semantic search: finds the most relevant stored document chunks for a question, filtered by who's asking |
| `chunking.py` | 229 | The **document chopper** — turns a raw database row (e.g. a medical record) into a clean, embeddable paragraph of text |
| `ingest.py` | 375 | The **filing clerk** — pulls records from Postgres, sends them through chunking + embedding, and stores/updates/deletes them in `rag_chunks` |
| `faq_data.py` | 328 | A **static list** of general pet-care FAQs and clinic policy answers (public content, visible even to guests) |
| `action_intent.py` | 847 | Detects when staff want to **do** something (book/reschedule/cancel appointments, add customer/pet/staff) and proposes the action — never executes it itself |
| `clinical_tools.py` | 780 | Vet-only deep tools: full pet history summary, consultation note drafting, aftercare instructions, pre-appointment briefing |
| `pet_health_intent.py` | 316 | Routes admin questions about **live risk predictions** (disease recurrence, cancer risk, pandemic risk) to the actual prediction model instead of text search |
| `structured_query.py` | 2987 | The **calculator/fact-checker** — answers exact counts, lists, clinic info, and self-service questions with real SQL instead of guessing from text |
| `chart_intent.py` | 775 | Detects explicit "chart/graph/plot" requests and returns chart-ready data (bar or pie) instead of a sentence |
| `__init__.py` | 0 | Empty — just marks this folder as a Python package |

**One rule that ties it all together:** *the AI only ever parses language into structured data (like "which pet, which date") — it never decides facts itself.* Every actual fact, ID lookup, or number always comes from a real SQL query or a real model, never from the AI's imagination.

## 5. Embeddings, vector database, semantic search — how these actually happen here

These three ideas are the machinery behind strategy #5 (`retrieval.py`) in the table above. Here's what each one *means*, and exactly where it happens in this codebase.

### Embeddings — turning text into numbers

**Simple idea:** An embedding is a list of numbers that captures the *meaning* of a piece of text. Two sentences that mean similar things end up with similar number-lists, even if they don't share a single word.

| In this project | Detail |
|---|---|
| Who creates them | `ollama_client.py`'s `embed_text()` function |
| How | Sends the text to the local Ollama server, using the **`nomic-embed-text`** model |
| Output | A list of **768 numbers** for every piece of text (this size is fixed — `EMBEDDING_DIM = 768` in `ollama_client.py`, and the database column is built to match exactly) |
| Cost | Free and fully local — no API key, no per-token billing, since it never leaves your machine |
| When it runs | Twice: (1) once per chunk, when clinic data is first turned into `rag_chunks` (`ingest.py`), and (2) once per question, right when a user asks something (`retrieval.py` calls `embed_text(question)`) |

Think of it like a "meaning fingerprint" — every medical record, FAQ, and question gets one, so they can all be compared on the same footing.

### Vector database — where the embeddings are stored

**Simple idea:** A normal database column holds text or numbers you compare with `=`. A *vector* column holds one of these 768-number fingerprints, and you compare rows with "how close are these fingerprints," not exact matching.

| In this project | Detail |
|---|---|
| Which database | The **same Postgres database** as everything else — no separate vector database product. Postgres gets a plugin (`CREATE EXTENSION vector` — the **pgvector** extension) that adds the vector data type |
| Which table | `rag_chunks` (see `database/migrations/add_rag_vector_store.sql`) |
| What a row looks like | `content` (the chunk's actual text) + `embedding` (its 768-number fingerprint) + `source_type`/`source_id` (what it came from — a medical record, FAQ, etc.) + `pet_id`/`customer_id` (who it's allowed to be shown to, nullable for public content) |
| How it's indexed | An **HNSW index** (`idx_rag_chunks_embedding`) — a search structure built specifically for "find the closest fingerprints fast" instead of scanning every row one by one |

So "the vector database" in this project isn't a separate system to run or maintain — it's just one more table in the Postgres database you already have, with a special column type and a special index.

### Semantic search — finding the closest matches

**Simple idea:** Instead of searching for exact keywords, semantic search finds the stored chunks whose *fingerprint* is mathematically closest to the *question's* fingerprint — so it can match "when should I book a checkup" to a chunk about "annual wellness visit frequency" even though they don't share key words.

| In this project | Detail |
|---|---|
| Where it happens | `retrieval.py`'s `retrieve_chunks()` |
| Step 1 | Embed the incoming question with `embed_text(question)` → its own 768-number fingerprint |
| Step 2 | Run a SQL query using Postgres's `<=>` operator (cosine distance) to sort every allowed `rag_chunks` row by how close its `embedding` is to the question's fingerprint |
| Step 3 | Take the closest `top_k` (usually 5) — these become the "sources" the AI is allowed to write its answer from |
| Access control | The `WHERE` clause in that same query filters by role/`pet_id`/`customer_id` *before* ranking — so a pet owner's search can never even see another owner's chunks, regardless of how similar the fingerprints are |
| Extra safety net | For guest (unauthenticated) users, a minimum closeness score (`GUEST_RELEVANCE_THRESHOLD`) throws out weak matches, so a random unrelated FAQ doesn't get cited as a "source" just because it was the least-bad option in the top 5 |

**Put together:** a question comes in → gets turned into numbers (embedding) → those numbers are compared against every allowed row's numbers already sitting in Postgres (vector database) → the closest ones win (semantic search) → those winning chunks get handed to the AI as the *only* facts it's allowed to answer from.
