# Test Documentation

Manual test procedures and recorded results.

The project has no automated test suite — see [`../SCOPE.md`](../SCOPE.md) §4.10. Verification is manual, and this directory holds the procedures that make it repeatable.

---

## Contents

Committed `.md` files here describe test procedures and expected outcomes. Raw output — `*.json` — is gitignored, since results are specific to a dataset and a point in time.

For the assistant, the graded question set is [`../ai-assistant-sample-questions.md`](../ai-assistant-sample-questions.md). It includes deliberate boundary tests where the correct outcome is a refusal.

---

## Manual verification baseline

| Area | Procedure |
|---|---|
| Backend | `curl /health`, then exercise affected endpoints directly |
| Frontend | `npm run build` and `npm run lint`, then exercise the feature in a browser |
| ML service | `python test_setup.py`, then call the affected `/api/ml/*` route |
| Assistant | Run the role-appropriate section of the sample question set |
| Access control | Attempt a restricted endpoint with each role's token and confirm 403 |

The last row matters most and is easiest to skip. Client-side route guards hide a page but do not protect an endpoint; only a direct API call with the wrong role's token verifies the server-side check. See [`../rbac.md`](../rbac.md).