## 1. Database

- [x] 1.1 Write `database/migrations/add_ai_briefings.sql` creating `ai_briefings` (`id`, `user_id` FK → `users(user_id)`, `role`, `briefing_date`, `content` JSONB, `created_at`), unique on `(user_id, briefing_date)`
- [x] 1.2 Apply the migration by hand against the local dev database and confirm the table exists (no migration runner in this project)

## 2. Close the pre-existing role-gating gap

- [x] 2.1 Grep the frontend for any existing call to `disease/pet-risk`, `disease/cancer-risk`, or `disease/pandemic-risk` and confirm none originate from receptionist-reachable code
- [x] 2.2 Add `vetOrAdmin` to `POST /api/ml/disease/pet-risk`, `POST /api/ml/disease/cancer-risk`, and `GET /api/ml/disease/pandemic-risk` in `server/src/routes/mlRoutes.js`
- [x] 2.3 Manually verify all three routes still work for admin and veterinarian, and now reject receptionist, by hitting them directly

## 3. ML service: summarization endpoint

- [x] 3.1 Add `POST /api/ml/briefing/summarize` in `ml/app.py` accepting a role + aggregated numeric payload, calling `ollama_client.py`'s existing generation function directly (no retrieval, no `rag_service.py` involvement)
- [x] 3.2 Design the prompt to produce a short summary plus 2-4 bullet insights as structured output (e.g. JSON), enforcing the project's existing metric-units / LKR currency conventions
- [x] 3.3 Manually call the route with sample payloads for each role and confirm output shape and graceful failure when Ollama is unreachable

## 4. Backend: briefing aggregation and endpoint

- [x] 4.1 Create `server/src/services/briefingService.js`: given a role, calls the relevant existing `mlService.js` functions in parallel via `Promise.allSettled`, assembles the role-scoped numeric payload per the `ai-daily-briefing` spec's per-role content list
- [x] 4.2 In `briefingService.js`, check `ai_briefings` for a cached row for `(user_id, today)` before doing any aggregation or calling the ML service; on hit, return the cached `content` directly
- [x] 4.3 On cache miss, aggregate the numeric payload, call `POST /api/ml/briefing/summarize` via `mlService.js`, store the result in `ai_briefings`, and return it
- [x] 4.4 Add `mlController.getBriefing` and wire `GET /api/ml/briefing` in `mlRoutes.js`, gated with `authorize('admin', 'veterinarian', 'receptionist')`
- [x] 4.5 Verify server-side that no role's response payload ever contains another role's restricted fields (e.g. receptionist response has no disease/clinical keys at all, not just hidden client-side)
- [x] 4.6 Manually call `GET /api/ml/briefing` as each of the three roles and confirm role-correct content, then call it twice in a row and confirm the second call is served from cache (no second LLM call)

## 5. Frontend: briefing card

- [x] 5.1 Add `getBriefing()` to the relevant `client/src/services/*` file, calling `GET /api/ml/briefing`
- [x] 5.2 Create `client/src/components/dashboard/AiDailyBriefing.jsx`: fetches independently of the main dashboard stat fetch, renders loading / summary+bullets / "insights unavailable" states
- [x] 5.3 Manually verify the card doesn't block or delay the rest of the dashboard when the ML service or Ollama is down (stop Ollama and confirm the rest of the dashboard still renders normally)

## 6. Frontend: dashboard split

- [x] 6.1 Revised per user decision during implementation (see design.md): extracted the shared `fetchDashboardData` logic verbatim into `client/src/hooks/useDashboardStats.js`, plus `client/src/pages/dashboard/dashboardStyles.js` and `dashboardUtils.js` (formatTime/getStatusBadge), so the three dashboards don't re-derive stat math independently
- [x] 6.2 Create `client/src/pages/AdminDashboard.jsx` from the admin branches of the former `Dashboard.jsx`, including `AiDailyBriefing`
- [x] 6.3 Create `client/src/pages/VetDashboard.jsx` from the veterinarian branches of the former `Dashboard.jsx`, including `AiDailyBriefing`
- [x] 6.4 Create `client/src/pages/ReceptionistDashboard.jsx` from the receptionist branches of the former `Dashboard.jsx`, including `AiDailyBriefing`
- [x] 6.5 Update `client/src/App.jsx` routing so `/dashboard` renders the correct component per `user.role` (via new `DashboardRouter.jsx`)
- [x] 6.6 Delete `client/src/pages/Dashboard.jsx` and confirm nothing else imports it

## 7. Verification

- [x] 7.1 `npm run build` and `npm run lint` in `client/` (both pass; the 19 pre-existing lint errors are all in unrelated files this change never touched)
- [x] 7.2 Exercise all three dashboards in a browser as admin, veterinarian, and receptionist test accounts, confirming stat cards, quick actions, and the briefing card all match the role (verified via Playwright screenshots)
- [x] 7.3 Confirm the veterinarian and receptionist dashboards show no data outside their role's scope, per the `staff-dashboards` spec
