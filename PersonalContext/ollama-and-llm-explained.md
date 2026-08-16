# Ollama & the LLM Model — Simple Terms

Everything AI-related in VetCare Pro runs through **Ollama** — a program that runs LLMs *locally* on the machine hosting the ML service, instead of calling an external API like OpenAI or Anthropic. That single choice explains most of the design decisions below: no API keys, no per-token bill, no data leaving the building — but also a smaller, slower model than a hosted frontier model would give you.

## 1. Which models are used, and why

| Model | Job | Why this one |
|---|---|---|
| **`nomic-embed-text`** | Turns text into a 768-number "meaning fingerprint" (embeddings) | Small, fast, free, runs locally, and 768 dimensions is a manageable size for Postgres/pgvector at this app's data volume |
| **`qwen3:8b`** | Everything else — answering questions, drafting notes, explaining ML predictions | See below |

Both are pulled once via `ollama pull nomic-embed-text` and `ollama pull qwen3:8b`, then served locally by `ollama serve`. All calls go through one file: `ml/scripts/rag/ollama_client.py`.

| Setting | Env var | Default |
|---|---|---|
| Ollama server address | `OLLAMA_HOST` | `http://localhost:11434` |
| Embedding model | `OLLAMA_EMBED_MODEL` | `nomic-embed-text` |
| Chat/generation model | `OLLAMA_CHAT_MODEL` | `qwen3:8b` |
| Normal request timeout | `OLLAMA_TIMEOUT` | 60s |
| Timeout when "thinking" is on | `OLLAMA_THINK_TIMEOUT` | 240s (reasoning is ~24x slower — see §3) |

Because the model name is an env var, swapping in a different Ollama model later is a config change, not a code change — as long as the replacement embedding model still outputs 768-dimensional vectors (the Postgres column is fixed at that size).

## 2. Why `qwen3:8b` specifically

| Reason | Explanation |
|---|---|
| **Runs locally, free** | Fits the whole project's "no API keys, no per-token cost" design — everything stays on the clinic's own hardware |
| **8B is a manageable size** | Small enough to run on a normal machine/laptop-class GPU without needing a server farm, while still being a real instruction-following chat model (not a toy) |
| **Hybrid reasoning support** | Qwen3 is one of the few open local models with a genuine on/off "thinking" mode built in (see §3) — most small local models don't offer this at all |
| **Good instruction-following for a small model** | Needed to reliably follow this app's strict prompt rules (JSON-only slot extraction, no medicine names for guests, LKR-only currency, "don't invent counts") |

The tradeoff, acknowledged directly in the code, is speed: an 8B local model on modest hardware is far slower than a hosted frontier model, especially with reasoning turned on — which is exactly why reasoning is switched off by default (§3).

## 3. Qwen3's hybrid reasoning ("thinking") — how it's used here

Qwen3 is a **hybrid reasoning model**: for the same weights, you can ask it to either (a) answer immediately, or (b) first write out an internal chain-of-thought "thinking" pass, then answer — controlled by one flag on the API call: `'think': true/false`.

### How the app uses this switch

| Setting | Behaviour | Used for |
|---|---|---|
| `think=False` (default) | Model answers directly, no internal reasoning pass | Every guest and pet-owner question, and every staff question by default — this is the fast path |
| `think=True` | Model first produces a reasoning trace, then the final answer; both are returned separately | Only for **admin** users, and only on 3 specific question types — see below |

The rule in code (`rag_service.py`, `clinical_tools.py`, `pet_health_intent.py`, `ml/app.py`) is consistently: **`think=(role == 'admin')`**. But that flag only ever gets *evaluated* at three call sites — most admin questions never reach one.

### It's not "every admin question" — only 3 of the 6 pipeline paths ever call it

`rag_service.py`'s `answer_question()` tries each strategy in order (see `rag-explained.md` §2) and returns as soon as one answers. Whether `think` even gets a chance to apply depends entirely on *which* strategy answers:

| Path | Reaches a `think=` call? | Why |
|---|---|---|
| **Action intent** (book/cancel appointment) | No | Returns early — its slot-parsing `generate_answer(...)` call never passes `think` at all, so it's `False` for every role |
| **Structured query** (counts, lists, clinic hours, "how many appointments today") | No | Returns early — pure SQL, and its `generate_answer(...)` phrasing call also never passes `think` |
| **Chart requests** | No | Returns early — just data assembly, no generation call at all |
| **Clinical tools** (full history summary, consultation note, aftercare, briefing) | **Yes** | One of the 3 real generation paths |
| **Pet health risk** (disease recurrence, cancer risk, pandemic risk) | **Yes** | One of the 3 real generation paths |
| **Plain RAG fallback** (open-ended knowledge question, nothing exact to look up) | **Yes** | One of the 3 real generation paths |

So a fast factual admin question ("how many appointments today?") never touches thinking mode regardless of role — it's answered by SQL before the code ever gets near a `think=` flag. Reasoning only activates for the handful of question types where the model is actually synthesizing a judgment worth double-checking (a risk explanation, a note drafted from a full record, an open-ended answer) — not as a blanket "admin gets the slow mode" rule.

### Why it's gated to admin-only, and off by default

- **Measured cost:** turning thinking on made generation **~24x slower** in testing on this app's hardware — that's why `OLLAMA_THINK_TIMEOUT` (240s) is set so much higher than the normal timeout (60s).
- **No accuracy benefit on the fast paths** — action intent, structured query, and charts are already deterministic (SQL/data assembly), so there's nothing for reasoning to improve there, which is exactly why those paths never request it.
- **Real value on the 3 paths that do use it** — clinical note drafts, risk explanations, and open-ended RAG answers are the one place this app asks the model to *synthesize a judgment* rather than just restate a fact. Letting an admin see the reasoning trace behind "why does this pet have elevated cancer risk" or "why did you word this consultation note this way" is a genuine trust/audit feature, not decoration — it's just deliberately restricted to the few places where a judgment is actually being made, and to the one role responsible for reviewing that judgment.

### Two ways reasoning is delivered

| Function | Style | Where used |
|---|---|---|
| `generate_answer()` | One blocking call, returns `(answer, reasoning_or_None)` after the full response is ready | Normal request/response chat calls |
| `stream_chat()` | Streams the response token-by-token as it's generated | The admin-only **live** "show reasoning" chat view — yields `{'type': 'thinking', ...}` events as the model reasons, then `{'type': 'content', ...}` events as it writes the actual answer, then a final `{'type': 'done', ...}` summary |

Both are thin wrappers over the same Ollama `/api/chat` endpoint — `stream_chat` just sets `'stream': True` and reads the response line-by-line instead of waiting for it all at once.

## 4. Other important LLM details in this project

| Detail | Why it matters |
|---|---|
| **Temperature = 0.1** | Set on every generation call. Low temperature means the model sticks closely to the given facts and phrases things consistently rather than being "creative" — appropriate for a clinical/factual assistant, not a chatty one |
| **The LLM never decides facts** | Repeated rule across the whole RAG pipeline (see `rag-explained.md`): the model only ever turns language into structured slots (dates, pet names, intents) or writes prose *from* facts it's handed. Every ID, count, or number always comes from real SQL or a real trained model |
| **Currency normalization is a safety net, not a prompt fix** | Even with explicit system-prompt instructions to use LKR, a small local model sometimes reverts to `$`/`USD` from its training data. `normalize_currency()` in `ollama_client.py` regex-fixes this after generation rather than relying on the prompt alone — described in code as a "model-agnostic safety net" |
| **Graceful degradation without Ollama** | If Ollama isn't running, chat endpoints don't crash — they return an "assistant unavailable" message. `check_health()` reports whether Ollama is reachable and whether both required models are actually pulled, separate from the general `/health` check |
| **Same model, many jobs** | `qwen3:8b` is reused for RAG answers, action-intent slot parsing, clinical note drafting, aftercare instructions, and explaining ML model outputs in plain language — one model instance, many system prompts, rather than separate models per feature |

## 5. How the model's own knowledge is used within RAG

This is the important nuance: **RAG doesn't mean the model's built-in knowledge is switched off** — it means the model is told *when* it's allowed to use its own knowledge versus when it must stick strictly to retrieved facts. That boundary is drawn differently per role:

| Role | What the model is allowed to answer from |
|---|---|
| **Guest** | Retrieved public FAQ chunks *first*; if nothing relevant matches, the prompt explicitly tells the model to **fall back on its own general veterinary knowledge** rather than refuse — this is what lets it answer common pet-care questions the FAQ set doesn't cover. But a hard safety rule rides along with that fallback: **never name a specific medicine, drug, or supplement**, even unbranded, even if directly asked — always redirect to an in-person vet visit instead |
| **Pet owner** | Only their own retrieved records/FAQs — no "fall back to general knowledge" escape hatch, since a wrong guess about *their pet specifically* is a real risk, not a generic tip |
| **Staff** | Retrieved clinic-wide chunks, and explicitly instructed **not** to extrapolate counts/statistics from the small sample of chunks it sees — those questions are routed to real SQL (`structured_query.py`) instead, precisely because the LLM's own sense of "how many" from a handful of text snippets would be a guess dressed up as a fact |

So the model's pretrained knowledge is used deliberately in exactly one place — the guest fallback for general pet-care questions — and is otherwise treated as untrustworthy for anything that must be *exactly right* (facts about this clinic, this pet, or this customer). Everywhere else, "grounding" means the prompt hands the model real retrieved text or real SQL results and instructs it to answer *only* from that, which is also why temperature is kept low (§4) — low temperature keeps the model close to the provided grounding text instead of drifting into its own generative tendencies.
