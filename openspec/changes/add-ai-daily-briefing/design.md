## Context

See `proposal.md` for motivation. Relevant current state:

- `client/src/pages/Dashboard.jsx` is one component, role-branched inline, fetching all its data via one `Promise.all` (`getPets`, `getCustomers`, `/appointments`, `getMedicalRecords`, `/billing`, `inventoryService.getLowStockItems`, `getDiseaseCases`).
- `server/src/services/mlService.js` already proxies every ML endpoint this feature needs (sales/forecast, sales/top-services, inventory/reorder-suggestions, disease/pet-risk, disease/cancer-risk, disease/outbreak-trend, disease/pandemic-risk) — no new Flask routes needed for the numeric data.
- LLM generation only happens today inside `ml/` via `ml/scripts/rag/ollama_client.py`; the Node backend never calls Ollama directly anywhere in the current codebase.
- `server/src/routes/mlRoutes.js` gates most routes with only `authenticate` (comments claim role restrictions that aren't enforced); `authorize(...)` and shorthands like `vetOrAdmin` (`roleCheck.js`) are the existing pattern for enforcing this.
- No migration runner exists; `database/migrations/*.sql` are applied by hand (e.g. `add_rag_vector_store.sql` precedent for adding a new table this way).

## Goals / Non-Goals

**Goals:**
- Reuse existing trained models and the existing Ollama generation path; no new model training, no new retrieval/embedding work.
- Keep the briefing entirely outside the RAG chain (`rag_service.py`) — it's not a chat capability and has no retrieval step, so it must not be bolted onto `answer_question`'s five-path chain per CLAUDE.md's guidance that new RAG capabilities extend that chain, not bypass it.
- Enforce role scoping server-side for both the new briefing endpoint and the three pre-existing ML routes this change touches.
- Keep a slow or unavailable LLM from blocking or slowing the rest of the dashboard.

**Non-Goals:**
- Not a real-time/streaming feature; the briefing is allowed to be up to a day stale.
- Not a notification or alerting system (no push, no email) — purely a passive dashboard card.
- Not a chat feature and not a new RAG module.
- Not changing what data any role is currently authorized to see beyond closing the two flagged gaps.

## Decisions

**One briefing endpoint, branching by role server-side** — `GET /api/ml/briefing`, gated with `authorize('admin', 'veterinarian', 'receptionist')` (i.e. any staff role, matching `staffOnly`), with `mlController.getBriefing` branching internally on `req.user.role` to decide which data to fetch and which prompt to build. Considered three separate routes (`/briefing/admin`, `/briefing/vet`, `/briefing/receptionist`); rejected because the frontend already knows the caller's role from `AuthContext` and gains nothing from selecting the route itself, while a single endpoint keeps the role-branching logic in one server-side place that's easy to audit for cross-role leakage (the `staff-dashboards` spec's "no cross-role data leakage" requirement).

**Aggregation lives in a new `server/src/services/briefingService.js`, not in `ml/app.py`** — it calls the existing `mlService.js` proxy functions in parallel (`Promise.allSettled`, so one failing model doesn't blank the whole briefing) to gather the numeric payload for the caller's role. This matches the existing `routes → controllers → services` layering and keeps `ml/scripts/rag/` scoped to RAG capabilities only, per CLAUDE.md's explicit instruction not to add non-RAG branches into that chain.

**LLM summarization stays behind the ML service, not called from Node** — add one small new Flask route, `POST /api/ml/briefing/summarize` in `ml/app.py`, that takes the aggregated numeric payload and calls `ollama_client.py`'s existing generation function directly (no retrieval, no `rag_service.py` involvement) to produce the summary + bullets. `briefingService.js` calls this route after aggregating the ML numbers. Rationale: Ollama access is confined to `ml/` everywhere else in the system; introducing a second caller (Node) would create a second place needing Ollama connection handling, health-check awareness, and the "AI unavailable" degradation path CLAUDE.md already documents for the ML service.

**Cache the generated briefing per user per day in a new table, not in-memory** — new `ai_briefings` table (migration `database/migrations/add_ai_briefings.sql`): `id`, `user_id` (FK → `users`), `role`, `briefing_date`, `content` (JSONB: summary + bullets), `created_at`, unique on `(user_id, briefing_date)`. `briefingService.js` checks this table first; only calls the ML aggregation + summarization path on a cache miss. Considered an in-memory `Map` in the Node process; rejected because it doesn't survive a restart or work correctly if the backend ever runs more than one instance, and a single indexed row lookup is cheap. This directly satisfies the `ai-daily-briefing` spec's "not regenerated on every render" requirement.

**Briefing fetch is decoupled from the main dashboard data fetch** — the frontend `AiDailyBriefing.jsx` card issues its own request to `GET /api/ml/briefing` independently of the dashboard's existing `Promise.all` stat fetch, rendering its own loading/unavailable state. A slow or failed briefing call never blocks or delays the rest of the dashboard from rendering.

**Close the role-gating gap on three pre-existing routes as part of this change** — add `vetOrAdmin` to `POST /api/ml/disease/pet-risk`, `POST /api/ml/disease/cancer-risk`, and `GET /api/ml/disease/pandemic-risk` in `mlRoutes.js` (reusing the existing shorthand rather than inline `authorize(...)`, for consistency with the rest of the file). This change directly touches these three routes (the veterinarian briefing calls two of them), so fixing the gap here is lower-risk than leaving it for an unrelated change to rediscover.

**Dashboard split: separate page components, shared data hook** — revised during implementation after reading the actual file: `Dashboard.jsx` is 1,748 lines with a single `fetchDashboardData` that computes admin/vet/receptionist derived stats together from one batched fetch, and role ternaries run through most of the JSX, not just a couple of sections. Transcribing that logic independently into three files (the original decision below) would mean retyping intricate date/stat math three times by hand against a page used for live demos — real regression risk for no behavioral benefit. Instead: the existing `fetchDashboardData` body moves verbatim into `client/src/hooks/useDashboardStats.js` (zero logic change), and `AdminDashboard.jsx` / `VetDashboard.jsx` / `ReceptionistDashboard.jsx` each call that hook and render only their own JSX slice, extracted from the current file's role ternaries. This still satisfies the requirement that drove the split — three distinct routed components, no cross-role JSX in any one file — while not re-deriving stats logic that already works.
~~Original decision (superseded above): separate page components, shared presentational pieces only — `AdminDashboard.jsx`, `VetDashboard.jsx`, `ReceptionistDashboard.jsx` each own their own data-fetching independently, mirroring how other list/detail pages in `client/src` work, with only genuinely identical presentational pieces (stat card, quick-action button) moved into `client/src/components/dashboard/`.~~

## Risks / Trade-offs

- **[Risk]** First dashboard load of the day per user pays the full aggregation + LLM latency → **[Mitigation]** Decoupled async card fetch (see above) means this latency is isolated to the briefing card, not the page; subsequent loads that day hit the cache table.
- **[Risk]** Briefing content can go stale within its cache day (e.g. a same-day billing entry changes the revenue picture) → **[Mitigation]** Accepted; the spec explicitly allows this, consistent with the feature being a daily briefing, not a real-time view.
- **[Risk]** Retrofitting `vetOrAdmin` onto the three pre-existing routes could break an as-yet-unnoticed legitimate receptionist caller → **[Mitigation]** Grep the frontend for any current call to `disease/pet-risk`, `disease/cancer-risk`, or `disease/pandemic-risk` before applying the gate, and confirm none originate from receptionist-reachable code paths, per the exploration already done for this change (none found).
- **[Risk]** `Promise.allSettled` masking a partial model outage (e.g. sales forecast down) as a thinner-than-expected briefing rather than a visible error → **[Mitigation]** `ai-daily-briefing` spec requires omitting/noting the specific unavailable insight rather than failing the whole briefing, so this is intentional, not a bug — the frontend should render whatever bullets came back rather than treating a partial result as an error.

## Migration Plan

1. Apply `database/migrations/add_ai_briefings.sql` by hand (per project convention — no migration runner).
2. Add the `vetOrAdmin` gate to the three pre-existing routes in `mlRoutes.js`; verify manually against each role per CLAUDE.md's verification convention before proceeding (no automated test suite exists).
3. Add `POST /api/ml/briefing/summarize` in `ml/app.py` plus the new Node `briefingService.js` and `GET /api/ml/briefing` route/controller.
4. Add `AiDailyBriefing.jsx` and wire it into the three new dashboard pages once they exist (step 5).
5. Split `Dashboard.jsx` into `AdminDashboard.jsx` / `VetDashboard.jsx` / `ReceptionistDashboard.jsx`, update routing in `App.jsx`, remove the old file.
6. Manual verification per role, per CLAUDE.md: hit `/api/ml/briefing` directly as each role, then exercise each dashboard in a browser, including the Ollama-unavailable degraded state.

Rollback: each step is independently revertable; the `ai_briefings` table has no downstream dependents and can be dropped without affecting any other table.

## Open Questions

- Exact prompt wording and bullet-count tuning for the summarization call is left to implementation-time experimentation against the local `qwen3:8b` model's actual output quality — doesn't change the endpoint contract, caching behavior, or role scoping defined above.
