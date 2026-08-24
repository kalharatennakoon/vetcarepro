# Testing

VetCare Pro has no end-to-end test runner (see the root `CLAUDE.md`'s Verification section), but two kinds of testing are committed and repeatable: automated unit tests that run in CI-less local commands, and manual validation procedures for the parts of the system — the AI assistant's role boundaries, appointment self-service, RBAC — that can't be meaningfully unit-tested without a live database and Ollama.

Raw manual-run output (`*.json`) is gitignored per the conventions in [`../README.md`](../README.md); this file is the committed procedure, not the log.

---

## Automated unit tests (56)

| Suite | Runner | Count | Covers |
|---|---|---|---|
| [`server/tests/appointmentRules.test.js`](../../server/tests/appointmentRules.test.js) | `node --test` | 13 | `appointmentRules.js`: open-day check (Mon–Sat, `Date` vs. string), slot-fits-before-close arithmetic, slot generation spacing, 48-hour lead-time enforcement, and that the exported constants still match the documented policy |
| [`server/tests/authUtils.test.js`](../../server/tests/authUtils.test.js) | `node --test` | 10 | Password hashing/salting, staff JWT sign/verify/tamper-detection, that a customer token carries `type: customer` so it can never pass staff auth, the setup-token flow, and that `sanitizeUser` strips `password_hash` |
| [`server/tests/roleCheck.test.js`](../../server/tests/roleCheck.test.js) | `node --test` | 8 | `authorize()` and its shorthands (`adminOnly`, `vetOrAdmin`, `adminOrReceptionist`, `staffOnly`) against every role, matched against the boundaries documented in `docs/rbac.md` |
| [`client/tests/aiChatFormat.test.js`](../../client/tests/aiChatFormat.test.js) | `vitest run` | 10 | The AI chat UI's source-citation labeling (`getSourceLabel`) across all source types, and `allSourcesAreFaq`'s grounding check |
| [`ml/tests/test_ollama_client.py`](../../ml/tests/test_ollama_client.py) | `pytest` | 9 | `ollama_client.py`'s currency post-processing (USD→LKR normalization, foreign-currency figures left alone) and CJK-token stripping from generated English text |
| [`ml/tests/test_rag_service.py`](../../ml/tests/test_rag_service.py) | `pytest` | 6 | `rag_service.py`'s imperial-unit-stripping regex — weight, Fahrenheit, and inches asides removed, metric-only and unrelated text left untouched |

**Run everything:**

```bash
# server/
npm test

# client/
npm test

# ml/ (from an activated venv)
pytest
```

These are unit tests against pure logic (date/time math, token signing, regex post-processing, label formatting) — none of them spin up a database or Ollama, so they run in isolation and belong in any pre-demo check.

---

## Manual validation procedures

### AI assistant — role-boundary walkthrough

[`../ai-assistant-sample-questions.md`](../ai-assistant-sample-questions.md) is the canonical manual test procedure for the RAG pipeline: a fixed question set per access mode (guest, pet owner, receptionist, veterinarian, administrator) plus explicit boundary tests (a guest asking about medication, a receptionist asking for a diagnosis, a receptionist requesting a clinical chart) that must be *declined* to pass. Its "Testing notes" section covers the two failure modes that are easy to miss in a live demo — unsourced-but-fluent answers, and answers citing the wrong pet's records — and the chart/no-chart control pairs needed to confirm the trigger-word gate in `chart_intent.py` isn't over- or under-firing.

Run this pass whenever `rag_service.py`, any module in `ml/scripts/rag/`, or a system prompt changes, and before any live demo.

### Backend — health and endpoint checks

Per the root `CLAUDE.md`: hit `GET /health`, then exercise the specific endpoints touched by the change directly (e.g. `curl`/Postman against the affected `routes/*Routes.js` path) under each relevant role's token. There is no seeded request-fixture set — construct requests from `docs/api/`.

### Frontend — build, lint, browser

`npm run build` and `npm run lint` catch compile/type/lint errors only; per project convention, a UI change is confirmed by exercising the golden path and edge cases in a running browser, not assumed correct from a clean build.

### Appointment self-service — edge cases

Manually exercise booking, reschedule, and cancel against the constants in [`appointmentRules.js`](../../server/src/utils/appointmentRules.js) whenever that flow changes, since the unit tests above cover the arithmetic but not the live endpoints:

- A slot inside the 48-hour lead time is rejected on create, reschedule, *and* cancel.
- A 4th concurrent booking in the same slot (`MAX_CONCURRENT_APPOINTMENTS = 3`) is rejected.
- A booking on a Sunday is rejected; Monday–Saturday 09:00–18:30 is accepted.
- The assistant's clinic-hours answer (`structured_query.py`'s `_clinic_hours`, reading `system_settings`) still matches these hardcoded constants — the two are not code-linked, so a change to one without the other is a silent drift, not a crash.

### RBAC — client/server guard parity

`client/src/App.jsx`'s `ProtectedRoute requiredRoles={[...]}` guards are a UX affordance only; the server-side `authorize(...)` call is the actual enforcement point (see `docs/rbac.md`). When a role-restricted route or endpoint changes, manually confirm both sides agree — a client guard without a matching server check is a real gap the unit tests above cannot catch, since `roleCheck.test.js` only tests `authorize()` in isolation, not that every route actually calls it.
