# Teamtailor Submission Answers — VetCare Pro

Drafted against predicted question wording; adapt phrasing to the real questions when the submission link arrives. Every number below was produced by a query run against the live local Postgres DB (`vetcarepro`) or read from a committed file on 2026-08-21 — see the verification log at the bottom of each answer for the exact source. Anything I could not verify is marked `[VERIFY]`, not estimated.

---

## 1. Project overview

**Full version**

VetCare Pro is a clinic management platform built for Pro Pet Animal Hospital, a single-site veterinary clinic in Kurunegala, Sri Lanka. Before this system, the clinic ran scheduling, medical records, billing, and inventory on paper and spreadsheets. The people affected are the clinic's own staff — administrators, veterinarians, and receptionists — doing that operational and clinical work daily, and the clinic's pet-owner clients, who had no way to check an appointment or a balance without calling in. This is not a hypothesis: it's based on direct conversations with Pro Pet Animal Hospital's staff and owner about how they actually worked before the system existed.

The solution is a single web platform (React/Node.js/PostgreSQL) covering appointment scheduling, electronic medical records, billing, inventory, and financial/operational reporting for staff, plus a companion iOS app giving pet owners and prospective clients their own self-service access (bookings, records, lab results). Layered on top is a locally-hosted AI assistant — retrieval-augmented generation over the clinic's own data via Ollama, scoped by role (guest / pet owner / staff) so nobody sees data they shouldn't — and three machine-learning models forecasting disease outbreak risk, sales revenue, and inventory demand from the clinic's own history.

The value: staff get one system instead of four (paper diary, medical folders, a billing spreadsheet, an inventory count), pet owners get answers and bookings without a phone call, and the clinic gets early-warning signals — outbreak risk, revenue trend, reorder timing — it didn't have before. Every AI feature runs on the clinic's own machine: no patient or clinic data leaves the premises, and there is no per-token API cost.

**Compressed (~400 chars)**

VetCare Pro replaces paper/spreadsheet workflows at Pro Pet Animal Hospital (Kurunegala, Sri Lanka) with one platform: appointments, EMR, billing, inventory, reporting, plus a pet-owner iOS app. Adds a locally-hosted, role-scoped RAG AI assistant (Ollama — no data leaves the premises, no per-token cost) and ML forecasting for outbreak risk, revenue, and inventory. Validated via direct conversations with the clinic's staff and owner.

*Verification: problem/solution/module list — `README.md`, `PROJECT_SUMMARY.md`, `docs/SCOPE.md` §1–3. Validation source — user-confirmed 2026-08-21 (interviews/conversations with Pro Pet Animal Hospital staff and owner).*

---

## 2. AI usage

**Full version**

Two separate things get called "AI" here, and this answer is only about the first: the tools used to *build* the system. The AI *inside* the shipped product (the RAG assistant and the ML forecasting models) is a separate matter, covered in the demo video and in Answer 1 above — it is not re-described here.

Build-time tools: **Claude Code** (both the CLI and the VS Code extension) did the majority of code changes, refactors, and documentation across all four services, working from a maintained context set — a 150-line `CLAUDE.md` plus `docs/ARCHITECTURE.md` and related docs — kept up to date specifically so the tool doesn't re-derive the system's architecture and constraints from scratch every session. **GitHub Copilot's autonomous coding agent** made 8 of the repository's 400 commits. **ChatGPT**, **Claude** (chat), and **Claude Cowork** were used for planning and problem-solving outside the editor. **Claude Design** produced the wireframes and design files under `docs/wireframes/` and `docs/design/`. Feature work for at least one change (`openspec/changes/add-ai-daily-briefing`) went through **OpenSpec**, a spec-driven workflow (proposal → design → tasks → spec) used with Claude Code rather than ad-hoc prompting. A personal Claude Code skill, **graphify**, converts the codebase into a queryable knowledge graph, used for architecture comprehension before making changes. **NotebookLM** generated the illustrative overview graphic referenced in `README.md`.

**Compressed (~400 chars)**

Build tools, distinct from the AI *inside* the product (covered elsewhere): Claude Code (CLI + VS Code extension, primary driver, guided by a maintained CLAUDE.md/ARCHITECTURE.md context set) and GitHub Copilot's agent (8 of 400 commits) for code; ChatGPT, Claude, Claude Cowork for planning; Claude Design for wireframes; OpenSpec for spec-driven planning; a personal "graphify" skill for codebase comprehension; NotebookLM for one graphic.

*Verification: `CLAUDE.md` (tracked, 150 lines), `.claude/skills/openspec-*`, `.claude/commands/opsx/*` — all `git ls-files`-confirmed tracked. Commit counts — `git log --format='%an'` on 2026-08-21: 400 total, 8 by `copilot-swe-agent[bot]`. `openspec/changes/add-ai-daily-briefing/` — present, unarchived. NotebookLM credit — `README.md` line 6. Other tool names (ChatGPT, Claude, Claude Cowork, Claude Design, graphify) — user-confirmed 2026-08-21; not independently verifiable from the repo since they leave no commit trail.*

---

## 3. Validation

**Full version**

Every AI-suggested code change goes through the same manual baseline before it's trusted, documented in `docs/tests/README.md`: backend changes are checked by hitting `/health` and exercising the affected endpoint directly; frontend changes require a clean `npm run build` and `npm run lint`, then a check in an actual browser rather than assuming a clean build means a correct feature; ML changes require `python test_setup.py` plus a direct call to the affected `/api/ml/*` route; and — the check that's easiest to skip and matters most — any access-control change is confirmed by calling the restricted endpoint with the *wrong* role's token and checking for a 403, since a client-side route guard proves nothing about server-side enforcement.

Beyond that general practice, four specific corrections are built into the AI assistant's own architecture, each one a case of *not* trusting the model's raw output:

1. **The local model's output is post-processed, not just prompted.** The chat model (`qwen3:8b`) kept reinserting imperial-unit conversions despite explicit system-prompt instructions not to. Rather than continuing to tune the prompt, `rag_service.py` strips them with a deterministic regex pass after generation — a hard guarantee instead of a hope.
2. **The model never counts.** Asking a language model to count from a handful of retrieved records produces a confident, plausible, wrong number that looks identical to a right one. Aggregate and count questions ("how many appointments today?") are recognized and routed to hand-written SQL (`structured_query.py`) instead, bypassing the model for that step entirely.
3. **Nothing the AI proposes executes automatically.** `action_intent.py` only ever returns a *proposed* booking, reschedule, cancellation, reminder, or registration. `aiController.confirmAction` executes it only after a human explicitly confirms.
4. **A written, graded test set exists specifically to catch AI failure modes**, not just feature bugs. `docs/ai-assistant-sample-questions.md` defines 35 questions across the assistant's 5 access modes (guest, pet owner, receptionist, veterinarian, admin), including 2 deliberate boundary cases where the *correct* output is a refusal — a guest asking what medication to give a scratching dog, and a receptionist asking for a pet's diagnosis. The document also names two failure modes that look like passes on a casual read: a fluent, on-topic answer with no source citation (ungrounded), and an answer that cites sources belonging to the wrong pet (entity resolution picked the wrong "Max").

**Compressed (~400 chars)**

Baseline (docs/tests/README.md): endpoint checks, npm build/lint + browser check, ML route calls, and restricted endpoints called with the wrong role's token to confirm 403 — the most-skipped check. Assistant-specific: local-model output is regex-corrected post-generation, not just prompted; counting bypasses the LLM (SQL only); every AI-proposed write needs human confirm; a 35-question graded set covers 5 roles incl. 2 deliberate refusal cases.

*Verification: manual baseline table — `docs/tests/README.md`. Regex post-process claim and "model parses, never decides" rule — `docs/ARCHITECTURE.md` §4 ("Localization constraints", "Two governing rules"). Count-bypasses-RAG design — `docs/rag-query-coverage.md` ("Why this exists"). Confirm-before-write — `docs/ARCHITECTURE.md` §4 ("action_intent.py") and `docs/SCOPE.md` §4.6. Question/role/boundary-case counts — counted directly from `docs/ai-assistant-sample-questions.md` (6+8+7+7+7=35 questions; 2 boundary cases named explicitly in its "Testing notes" section).*

---

## 4. Links

**Full version**

Repository: **https://github.com/kalharatennakoon/vetcarepro** — confirmed public as of 2026-08-21, so no separate access grant is needed for judges.

There is no separately hosted/deployed instance. Production deployment was an explicit exclusion for this programme (`docs/SCOPE.md` §4.9 — "Production hosting, TLS termination, backups, monitoring, and CI/CD are not included"), so the working application is what the demo video shows running locally via `./run.sh`. `[VERIFY / user to add]`: link to the demo video once recorded, and to the presentation slides once prepared (see Answer 5 — neither exists in the repository yet).

**Compressed (~400 chars)**

Repository: https://github.com/kalharatennakoon/vetcarepro (public, no access request needed). No hosted/deployed link exists — production deployment was explicitly out of scope for this programme; the working application is demonstrated running locally in the demo video. Demo video and slide links: [to be added once produced].

*Verification: repo visibility — `gh repo view kalharatennakoon/vetcarepro --json visibility` → `"PUBLIC"`, 2026-08-21. No-deployment scope decision — `docs/SCOPE.md` §4.9. No-deployed-link fact — user-confirmed 2026-08-21.*

---

## 5. Supporting evidence

**Full version**

Committed and checkable directly in the repository: a written documentation set covering architecture (`docs/ARCHITECTURE.md`, 335 lines), role-based access control (`docs/rbac.md`), project scope and known gaps (`docs/SCOPE.md`, 180 lines, including an explicit "Known gaps" table), the ML system (`docs/ml-system-overview.md`), and exactly which assistant questions route to deterministic SQL versus semantic retrieval (`docs/rag-query-coverage.md`). Design and diagram deliverables are also committed, not just described: high-fidelity screen designs and a design system (`docs/design/` — `web-ui.pdf`, `ios-ui.pdf`, `design-system.md`, plus style-reference PDFs), low-fidelity wireframes (`docs/wireframes/web-wireframes.pdf`, `mobile-wireframes.pdf`), and four architecture/data-flow/use-case diagrams (`docs/deliverables/diagrams/` — `system-architecture.pdf`, `use-case-diagram.pdf`, `dfd-level-0.pdf`, `dfd-level-1.pdf`), which satisfies the submission structure's mandatory technical/workflow diagram requirement.

Two honest gaps, flagged rather than smoothed over: **first**, there is no automated test suite for any service — the Node backend's `npm test` script is an unimplemented stub, `ml/test_setup.py` checks database connectivity only (not behaviour), and the Swift test targets under `VetCareTests/`/`VetCareUITests/` are unmodified scaffolding. This is documented as a known gap (`docs/SCOPE.md` §4.10, §5), not hidden. **Second**, and more specific to "evidence": `docs/tests/README.md` documents the *procedure* for manual testing (including the 35-question graded assistant set from Answer 3), but its raw dated *results* are deliberately gitignored as dataset- and point-in-time-specific, and none exist in the working copy as of 2026-08-21 — so there is currently no committed pass/fail record to link to, only the procedure for producing one. **Recommendation before submitting:** actually run the graded question set from `docs/ai-assistant-sample-questions.md` and either commit a dated results file or show the pass/fail live in the demo video, since neither exists as evidence today.

One more flag unrelated to evidence content: presentation slides are explicitly noted in the repo itself as not yet produced (`docs/deliverables/README.md` — "The final presentation is not yet committed to this repository"), and they're a mandatory submission item.

**Compressed (~400 chars)**

Committed evidence: docs/ARCHITECTURE.md, rbac.md, SCOPE.md, ml-system-overview.md, rag-query-coverage.md; plus design/diagram deliverables (docs/design/, docs/wireframes/, docs/deliverables/diagrams/ — satisfies the mandatory diagram requirement). Flagged gaps: no automated test suite (see SCOPE.md); no committed test results, only the procedure (docs/tests/README.md) — run the graded set before submitting. Slides not yet produced.

*Verification: doc line counts and gap statements — read directly from each file, 2026-08-21. Design/diagram file existence and sizes — `find`/`ls -la` on `docs/design/`, `docs/wireframes/`, `docs/deliverables/diagrams/` (all `git ls-files`-tracked, 400KB–1.1MB each, not placeholders). Test-suite gap — `server/package.json`'s `test` script, `ml/test_setup.py` contents, `mobile/ios/VetCare/VetCareTests`/`VetCareUITests` presence. No results committed — `find` for `*.json`/`*test-result*`/`*test-report*` under `docs/tests/`, repo-wide: no matches. Slides-not-committed statement — `docs/deliverables/README.md` line 9, read verbatim.*

---

## Flagged: unverified, missing, or worth your attention

- **`docs/images/overview.png` is currently broken.** `README.md` line 5 references it as the hero image; `docs/images/README.md` self-documents it as "Missing — currently renders as a broken image." It existed at one point in git history (commit `966e77d`) but is absent now. Not a submission blocker, but the first thing a judge sees when opening the repo is a broken image.
- **`docs/deliverables/README.md` states the source repository "is not itself a deliverable — it is not shared, demonstrated by walkthrough, or submitted."** That's in direct tension with the submission structure's mandatory "Provide the link to your GitHub repository" requirement. The repo is public, so there's no practical blocker — but that doc line reads oddly now that the repo is being submitted, and you may want to update it.
- **Presentation slides do not exist in the repository yet** (mandatory item) — see Answer 5.
- **No committed test-run evidence exists** (only the procedure) — see Answer 5's recommendation to run the graded question set and capture results before recording the demo video.
- **The two `git log` author identities** (`Kalhara Tennakoon` and `kalharatennakoon`, 271 + 121 commits) are both you under different git configs, not two people — noted here only so it doesn't read as a discrepancy if a judge inspects `git log` directly.
- **"Claude Cowork"** is named in Answer 2 exactly as you described it; I could not independently verify what it is or does since it leaves no trace in this repository — if a judge asks about it directly, be ready to describe it yourself.
- **Exact project title and one-line summary in Answer 1** are my draft, not a fixed wording you gave me — edit freely.
