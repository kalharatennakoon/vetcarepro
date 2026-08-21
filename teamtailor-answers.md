# Teamtailor Submission Answers — VetCare Pro

**Ready to paste.** Verification notes are marked *(internal)* in blockquotes and should **not** be pasted into Teamtailor — they exist so you can defend any claim if a judge asks. Everything else is submission text.

Drafted against predicted question wording. Adapt the opening line of each to the real question when the submission link arrives; the body stands regardless.

Verified 2026-08-21 against the **`main` branch at commit `9fa9513`** — line counts, file contents, DB figures, and commit counts all read directly, not estimated. `main` is the repository's default branch and is what a judge sees at the plain repository URL (confirmed via `gh repo view`). This matters because until earlier today, `main` was an outdated pre-AI-assistant snapshot; PR #38 merged the actual working branch into it — see "Before you submit" for what that fixed. Items marked `[FILL]` need a value from you before submitting.

---

## 1. Project overview

**Full version**

VetCare Pro is a clinic management platform for Pro Pet Animal Hospital, a single-site veterinary clinic in Kurunegala, Sri Lanka. The platform began as a web-based management system replacing the clinic's paper and spreadsheet record-keeping. Under this eight-week AI Launchpad programme it was extended with two additions: a retrieval-augmented AI assistant layered across the existing platform, and a companion iOS application for pet owners and prospective clients.

The problem the AI layer addresses is specific. The management system records what happened but cannot answer questions about it. Staff can retrieve one pet's record, but questions spanning records — which vaccinations fall due this week, whether a disease is trending, how revenue compares to last quarter — require assembling an answer by hand across multiple screens. The information exists; it isn't reachable in the moment someone needs it, which for a receptionist is mid-phone-call.

Five groups experience this differently, and the assistant is scoped accordingly: administrators need operational and financial trends, veterinarians need clinical history at the point of consultation, receptionists need scheduling answers immediately, pet owners need their own animals' records without phoning in, and guests need general clinic information with no access to patient data at all. Access boundaries are enforced server-side, not merely hidden in the interface.

This is not a hypothesis about the clinic's workflow. It comes from direct conversations with Pro Pet Animal Hospital's staff and owner about how they worked before the system existed.

Alongside the assistant, three machine-learning models forecast disease outbreak risk, sales revenue, and inventory demand from the clinic's own history. Every AI feature runs on the clinic's own hardware via Ollama: no patient or clinic data leaves the premises, and there is no per-token API cost.

**Compressed (~400 chars)**

VetCare Pro is a clinic management platform for Pro Pet Animal Hospital (Kurunegala, Sri Lanka), extended under this eight-week programme with a locally-hosted, role-scoped RAG AI assistant and a pet-owner iOS app. The system recorded data but couldn't answer questions across it; the assistant makes that conversationally reachable for five roles with server-side access boundaries. Confirmed real via direct conversations with clinic staff and owner.

> *(internal)* Scope framing taken near-verbatim from `docs/SCOPE.md` §1 — "began as a web-based management system and was extended, under an eight-week AI Launchpad programme, with two additions." Five-role list from `docs/rbac.md` + `docs/SCOPE.md` §3.5. Validation source (interviews/conversations with Pro Pet Animal Hospital staff and owner) — user-confirmed 2026-08-21, not independently repo-verifiable. Exact project title/one-line summary here are a draft — edit freely.

---

## 2. AI usage

**Full version**

Two distinct categories, worth separating because they're routinely conflated.

**AI running inside the shipped product.** The assistant is local inference, not a hosted API wrapper. Ollama hosts `qwen3:8b` for text generation and `qwen3.5:9b` for vision (pet photo guidance), with `nomic-embed-text` producing 768-dimension embeddings into a pgvector index on the existing PostgreSQL instance. In front of that sits a retrieval pipeline with regex-matched intent routing across five handler layers. Three ML models — disease outbreak risk, sales forecasting, inventory demand — run in a separate Python/Flask service. All of this is demonstrated working in the demo video; the point here is that it runs entirely on the clinic's own machine, which is why no clinical data leaves the premises and why there is no per-token cost.

**AI used to build the system.** Claude Code (CLI and VS Code extension) drove most code changes, refactors, and documentation across all four services, working from a maintained context set — a 150-line `CLAUDE.md` plus `docs/ARCHITECTURE.md` — kept current specifically so the tool doesn't re-derive the architecture each session. GitHub Copilot's autonomous coding agent authored 8 of the repository's 402 commits. ChatGPT, Claude (chat), and Claude Cowork were used for planning and problem-solving outside the editor. Claude Design produced the wireframes and design files under `docs/wireframes/` and `docs/design/`. At least one feature (`openspec/changes/add-ai-daily-briefing`) went through OpenSpec, a spec-driven workflow — proposal, design, tasks, spec — rather than ad-hoc prompting. A personal Claude Code skill, `graphify`, converts the codebase into a queryable knowledge graph for architecture comprehension before changes. NotebookLM generated one illustrative graphic.

**Compressed (~400 chars)**

In-product: locally-hosted Ollama running qwen3:8b (text) and qwen3.5:9b (vision), nomic-embed-text embeddings in pgvector, plus three ML forecasting models — local inference, not a hosted API, no per-token cost. Build-time: Claude Code (primary, guided by a maintained CLAUDE.md), GitHub Copilot's agent (8 of 402 commits), ChatGPT/Claude/Cowork for planning, Claude Design for UI, OpenSpec for spec-driven work, NotebookLM for one graphic.

> *(internal)* Model names, embedding dimension (768, cross-checked against the live `rag_chunks.embedding` column type — `vector(768)`), and timeouts — `ml/.env.example`. `CLAUDE.md` = 150 lines (`wc -l`). Commit counts — `git log --format='%an'` on `main` post-merge: 402 total (272 + 122 + 8), 8 by `copilot-swe-agent[bot]`. `openspec/changes/add-ai-daily-briefing/` present, unarchived. NotebookLM credit at `README.md:6`. ChatGPT / Claude / Claude Cowork / Claude Design / graphify — user-confirmed 2026-08-21; these leave no commit trail, so be ready to describe them yourself if a judge asks, especially "Claude Cowork," which isn't independently verifiable from the repo.

---

## 3. Validation

**Full version**

Every AI-suggested code change goes through a manual baseline before it's trusted, documented in `docs/tests/README.md`. Backend changes are checked by hitting `/health` and exercising the affected endpoint directly. Frontend changes require a clean `npm run build` and `npm run lint`, then a check in an actual browser — a clean build is not evidence of a correct feature. ML changes require `python test_setup.py` plus a direct call to the affected `/api/ml/*` route. And the check that is easiest to skip and matters most: any access-control change is confirmed by calling the restricted endpoint with the *wrong* role's token and checking for a 403, because a client-side route guard hides a page but proves nothing about server-side enforcement.

Beyond that general practice, four corrections are built into the assistant's architecture — each one a case of deliberately not trusting the model's raw output.

1. **Output is post-processed, not just prompted.** `qwen3:8b` kept reinserting imperial-unit conversions despite explicit instructions not to. Rather than continuing to tune the prompt, `rag_service.py` strips them with a deterministic regex after generation. A hard guarantee replaced a hope.

2. **The model never counts.** Asking a language model to count from retrieved records produces a confident, plausible, wrong number that is indistinguishable from a right one. Aggregate and count questions are recognized and routed to hand-written SQL in `structured_query.py`, bypassing the model entirely for that step.

3. **Nothing the assistant proposes executes automatically.** `action_intent.py` returns only a *proposed* action — booking, reschedule, cancellation, reminder, registration. `aiController.confirmAction` executes it only after a human explicitly confirms. The model parses intent; it never decides.

4. **A graded test set exists to catch AI failure modes**, not just feature bugs. `docs/ai-assistant-sample-questions.md` defines 35 questions across the assistant's five access modes, including boundary cases where the *correct* output is a refusal — a guest asking what medication to give a scratching dog, a receptionist asking for a clinical diagnosis. The document also names two failure modes that pass on a casual read: a fluent, on-topic answer carrying no source citation, and an answer citing sources belonging to the wrong pet, where entity resolution picked the wrong "Max."

**Compressed (~400 chars)**

Manual baseline (docs/tests/README.md): endpoint checks, build/lint plus browser verification, ML route calls, and restricted endpoints called with the wrong role's token to confirm 403. Assistant-specific: model output is regex-corrected post-generation; counting bypasses the LLM for hand-written SQL; every proposed write requires explicit human confirmation; a 35-question graded set across 5 roles includes deliberate refusal cases.

> *(internal)* Baseline table: `docs/tests/README.md`. Imperial-unit regex: `ml/scripts/rag/rag_service.py:21-27` (rationale comment) and `:28-31` (`_IMPERIAL_ASIDE` compile, corrected from an earlier draft's imprecise line range). Count-bypass design: `docs/rag-query-coverage.md` ("Why this exists"). Confirm-before-write: `ml/scripts/rag/action_intent.py`; `server/src/controllers/aiController.js:168` (`confirmAction` — line verified exact). Question count: 35 (6+8+7+7+7) across 5 role sections, `docs/ai-assistant-sample-questions.md`. **Boundary-case count called out as an internal inconsistency in the source doc itself**: its "Testing notes" section (line 103) names exactly two boundary tests by name (guest medication question, receptionist diagnosis question), but line 61, inside the Receptionist section, separately calls the "graph disease cases by category" scenario "a second boundary test" — a third case the summary doesn't count. The Teamtailor text above says "deliberate refusal cases" without a number for this reason; if a judge asks for an exact count, say 2 per the document's own summary and note the doc has a known inconsistency worth fixing (see "Before you submit").

---

## 4. Links

**Full version**

Repository: **https://github.com/kalharatennakoon/vetcarepro** — public, default branch `main`. No access grant is needed for judges; opening the link shows the full project, including the AI assistant, ML forecasting, and all documentation referenced in these answers.

There is no separately hosted instance. Production deployment was an explicit exclusion for this programme — `docs/SCOPE.md` §4.9 states that production hosting, TLS termination, backups, monitoring, and CI/CD are not included. The architecture reinforces this: all inference runs locally on the clinic's hardware, so a publicly hosted demo would contradict the design rationale. The working application is demonstrated running locally via `./run.sh` in the demo video.

`[FILL]`: demo video link. `[FILL]`: presentation slides link (see Answer 5 — not yet produced).

**Compressed (~400 chars)**

Repository: https://github.com/kalharatennakoon/vetcarepro (public, default branch `main`, no access request needed — full project including the AI assistant and docs). No hosted instance — production deployment was explicitly out of scope, and all inference runs locally by design, so there is no public URL. Working application demonstrated running locally in the demo video. Video: [FILL]. Slides: [FILL].

> *(internal)* Visibility and default branch — `gh repo view --json defaultBranchRef,visibility` → `main`, `"PUBLIC"`, 2026-08-21, checked after merging PR #38. Scope exclusion — `docs/SCOPE.md` §4.9, quoted accurately. Until PR #38 merged today, `main` was a stale pre-AI-assistant snapshot (281 commits, missing `docs/ARCHITECTURE.md`, `client/src/pages/AIAssistant.jsx`, and nearly everything else cited in this document) — confirmed fixed: `docs/ARCHITECTURE.md` and `AIAssistant.jsx` both now present on `main` at `9fa9513`, commit count 402.

---

## 5. Supporting evidence

**Full version**

Committed and checkable directly in the repository: architecture (`docs/ARCHITECTURE.md`, 335 lines), role-based access control (`docs/rbac.md`, 128 lines), scope and known gaps (`docs/SCOPE.md`, 180 lines, including an explicit "Known gaps" table), the ML system (`docs/ml-system-overview.md`), and a document specifying exactly which assistant questions route to deterministic SQL versus semantic retrieval (`docs/rag-query-coverage.md`).

Design and diagram deliverables are committed rather than described: high-fidelity screen designs and a design system (`docs/design/`), low-fidelity wireframes for web and mobile (`docs/wireframes/`), and four architecture, data-flow, and use-case diagrams (`docs/deliverables/diagrams/` — `system-architecture.pdf`, `use-case-diagram.pdf`, `dfd-level-0.pdf`, `dfd-level-1.pdf`), satisfying the mandatory technical diagram requirement.

The database backing the demo is not a toy fixture: 596 billing records, 369 appointments, 389 disease cases, 217 medical records, across 127 customers and 270 pets, spanning 2024-01-05 through 2026-09-11 with no gap in monthly coverage. This matters concretely, not just as a scale claim: the forecasting models train on this history, so a forecast is only as trustworthy as the recency of the data behind it, and the assistant's vector store (`rag_chunks`) holds 701 embedded chunks across six source types (disease cases, medical records, vaccinations, FAQs, staff FAQs, lab reports) for retrieval-grounded answers.

Two gaps, stated rather than smoothed over. There is no automated test suite for any service: the Node backend's `test` script is an unimplemented stub, `ml/test_setup.py` checks database connectivity rather than behaviour, and the Swift test targets are unmodified scaffolding. This is documented as a known gap in `docs/SCOPE.md` §4.10 and §5, not hidden. Separately, `docs/tests/README.md` documents the *procedure* for manual verification, including the 35-question graded assistant set from Answer 3, but raw dated results are gitignored as dataset- and point-in-time-specific, and none exist in the repository as of 2026-08-21. `[FILL]`: either commit a dated results file before submitting, or state plainly that results are shown live in the demo video.

**Compressed (~400 chars)**

Committed: ARCHITECTURE.md, rbac.md, SCOPE.md, ml-system-overview.md, rag-query-coverage.md, plus design files, wireframes, and four architecture/DFD/use-case diagrams (mandatory diagram requirement met). Database: 596 billing, 369 appointments, 389 disease cases, 217 medical records, 127 customers, 270 pets, Jan 2024–Sep 2026, no monthly gaps. Gaps stated: no automated test suite (SCOPE.md §4.10); manual test procedure documented, results [FILL].

> *(internal)* Line counts and gap statements read directly, 2026-08-21. Design/diagram files confirmed tracked and non-placeholder (400KB–1.1MB each, `find`/`ls -la`). DB figures — direct `psql` queries against the live `vetcarepro` database, re-run immediately before finalizing this file to catch drift (the count did in fact drift between an earlier draft and this one — see "Before you submit"). Test-suite gap — `server/package.json`, `ml/test_setup.py`, `mobile/ios/VetCare/VetCareTests`/`VetCareUITests`. No committed results — repo-wide search for `*.json`/`*test-result*`/`*test-report*` under `docs/tests/`: no matches.

---

## Before you submit

**Resolved today — no action needed, kept here for the record:**

- [x] `main` was a stale pre-AI-Launchpad snapshot missing the entire assistant, ML system, and almost all documentation. Fixed via PR #38 (`ai-launchpad/main` → `main`), merged 2026-08-21. `main` is now what judges see at the plain repository link, and Answer 4 above assumes this.

**Must fix before submitting:**

- [ ] `[FILL]` markers resolved — demo video link, presentation slides link, and the test-results decision in Answer 5
- [ ] `docs/deliverables/README.md` states the repository "is not itself a deliverable — it is not shared, demonstrated by walkthrough, or submitted." You are submitting it as the primary evidence link. A judge holding the URL may read that line. Update it or remove it.
- [ ] `README.md:5` references `docs/images/overview.png`, which does not exist on `main` — `docs/images/README.md` self-documents it as a broken image, and the merge did not restore it (it existed at points in history but was absent on the branch that won the merge). It's the first thing a judge sees opening the repo. Restore a working image or remove the line.

**Worth doing, not blocking:**

- [ ] Commit a dated results file from the graded question set (`docs/ai-assistant-sample-questions.md`), so Answer 5 points at evidence rather than at a procedure
- [ ] Fix the boundary-case count inconsistency in `docs/ai-assistant-sample-questions.md` (see the internal note under Answer 3) — cosmetic, but a careful judge could notice it
- [ ] An access-control matrix (role × restricted endpoint × observed status code) would be a strong, cheap addition to Answer 5 — the single most directly verifiable artifact available, since it's just running curl with three tokens

**Non-issues, for your awareness only — do not paste these into Teamtailor:**

- `git log` shows two author identities (`Kalhara Tennakoon`, 272 commits; `kalharatennakoon`, 122) — both you under different git configs on the same machine, not two contributors.
- The database record counts changed slightly between an earlier draft of this file and this final one (disease_cases 337→389, rag_chunks 649→701) — the underlying data was still being finalized on 2026-08-21. The figures in Answer 5 above are the final, re-verified ones as of this version.
