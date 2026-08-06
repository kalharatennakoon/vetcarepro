# VetCare Pro — Documentation

Documentation for VetCare Pro, a veterinary clinic management platform built for Pro Pet Animal Hospital.

New to the project? Read [`SCOPE.md`](SCOPE.md), then [`ARCHITECTURE.md`](ARCHITECTURE.md), then [`setup.md`](setup.md).

---

## Contents

### Foundations

| Document | Purpose |
|---|---|
| [`SCOPE.md`](SCOPE.md) | What the system covers, what it excludes and why, known gaps |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Services, request flow, auth boundary, design decisions |
| [`setup.md`](setup.md) | Running all four services locally |
| [`database-schema.md`](database-schema.md) | Table reference, relationships, migration procedure |
| [`rbac.md`](rbac.md) | What each role can and cannot do |

### AI assistant

| Document | Purpose |
|---|---|
| [`ai-assistant-requirements.md`](ai-assistant-requirements.md) | Requirements, expected outcomes, deferred work |
| [`ai-assistant-problem-solution.md`](ai-assistant-problem-solution.md) | Problem framing, Double Diamond, MoSCoW prioritization |
| [`how-the-ai-assistant-works.md`](how-the-ai-assistant-works.md) | End-to-end pipeline walkthrough |
| [`rag-query-coverage.md`](rag-query-coverage.md) | Which questions bypass RAG for exact SQL |
| [`ai-assistant-sample-questions.md`](ai-assistant-sample-questions.md) | Test and demo question set per role |

### Analytics

| Document | Purpose |
|---|---|
| [`ml-system-overview.md`](ml-system-overview.md) | Models, techniques, training and serving |
| [`decision-support/`](decision-support/) | How to act on model output — one guide per model |

### Reference

| Document | Purpose |
|---|---|
| [`api/`](api/) | REST API reference |
| [`design/design-system.md`](design/design-system.md) | Tokens, typography, component library |

### Deliverables

[`deliverables/`](deliverables/) holds the programme outputs: presentation materials and wireframes.

---

## Conventions

**Naming.** Cross-cutting foundation documents use `UPPERCASE.md`; topic documents use `lowercase-kebab.md`. Directories are lowercase.

**Untracked paths.** `insights/` and `tests/*.json` are gitignored — working notes and raw test output stay local. Committed `.md` files inside `tests/` are tracked normally.

**Source of truth.** Where a document describes behaviour, the code is authoritative. `api/` and `database-schema.md` are generated from route annotations and `schema.sql` respectively; regenerate rather than hand-edit them.

**Not in this directory.** `PersonalContext/PROJECT_NOTES.md` holds private working notes and deployment planning. It is not a deliverable and is not published here.