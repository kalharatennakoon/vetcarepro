# Deliverables

Programme outputs for the AI Launchpad submission.

| Directory | Contents |
|---|---|
| [`presentation/`](presentation/) | Final presentation materials |
| [`wireframes/`](wireframes/) | Low-fidelity wireframes |
| [`diagrams/`](diagrams/) | Use-case and data-flow diagrams |

High-fidelity screen designs live in [`../design/`](../design/) alongside the [design system](../design/design-system.md).

---

## What is and is not a deliverable

Deliverables are documentation, wireframes, and presentation materials. **The source repository is private and is not itself a deliverable** — it is not shared, demonstrated by walkthrough, or submitted.

---

## Wireframe conventions

The low-fidelity set follows a strict convention, applied consistently so that reviewers read structure rather than aesthetics:

- Black and white only
- Bracketed placeholders — `[Pet Name]`, `[Date]` — never sample data
- No real chat content in assistant bubbles; placeholder bar lines only
- Real copy only for fixed interface chrome such as navigation labels and button text

The chat-bubble rule exists because plausible sample dialogue invites review of the assistant's wording rather than the screen's layout, which is not what a low-fidelity wireframe is for.

**Role-differentiated screens are differentiated in substance.** The three staff role wireframes vary by bubble count and breadth of subject matter rather than being structurally identical copies with a changed heading.

---

## Diagram conventions

- SVG preferred, matching [`../images/`](../images/)'s convention — stays legible at any zoom and diffs meaningfully.
- Name files after what they show, not where they appear — e.g. `use-case-diagram.svg`, `dfd-level-0-context.svg`, `dfd-level-1-ai-assistant.svg`.
- Actors and data stores must match the real system: the five roles are admin, veterinarian, receptionist, pet owner, and guest (see [`../rbac.md`](../rbac.md)), not a generic textbook cast. External entities and processes should reflect what's actually in [`../ARCHITECTURE.md`](../ARCHITECTURE.md) — client/server/ML service/Ollama, the customer-vs-staff auth boundary — rather than a simplified stand-in.
- DFDs: a Level 0 (context) diagram is the minimum; add a Level 1 decomposition for the AI assistant/RAG pipeline if the context diagram alone doesn't convey it.