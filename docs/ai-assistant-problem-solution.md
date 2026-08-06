# AI Assistant — Problem, Solution & Prioritization

Design rationale for the AI assistant layer and mobile extension: the problem addressed, options considered, and what was prioritized.

Related: [`ai-assistant-requirements.md`](ai-assistant-requirements.md) for the resulting requirements; [`SCOPE.md`](SCOPE.md) for the resulting boundaries.

---

## The problem

- VetCare Pro holds rich clinic data — medical records, ML forecasts, care instructions — but reaching it means navigating the web application. There is no conversational way to ask for it.
- ML outputs such as outbreak risk and demand forecasts are technical, and hard for non-technical staff or pet owners to interpret.
- Pet owners and the public have no mobile access; the system is web-only.
- Any AI layer touching clinic data must not leak one customer's or role's data to another, and must never present itself as replacing a veterinarian's judgment.

---

## Double Diamond

### Discover — explore the problem space

- Staff and pet owners both struggle to extract quick answers from clinic data. Testing confirmed that retrieval-augmented generation alone hallucinates on counting and aggregate questions.
- ML outputs exist but are presented as raw numbers and charts, not plain language.
- Three distinct audiences need three distinct data boundaries: the public, pet owners, and clinic staff.
- There is no mobile presence.

### Define — narrow to one problem statement

> VetCare Pro needs an AI layer that makes trusted clinic data and existing ML outputs understandable through natural language — strictly as a decision-support tool, never a replacement for professional veterinary judgment — with data access scoped by role, and reachable from both web and a new mobile app.

### Develop — explore solution options

| Option | Verdict |
|---|---|
| Pure LLM, no grounding in clinic data | **Rejected** — would fabricate medical facts |
| RAG grounded in clinic data | **Selected** for question answering |
| Free-form text-to-SQL for all data questions | **Rejected** — correctness and security risk |
| RAG plus exact-SQL fallback for count and lookup questions | **Selected** — validated in `structured_query.py` |
| Single unscoped data access for all users | **Rejected** — privacy risk across guest, owner, and staff |
| Three-tier access control | **Selected** |
| Web only | **Rejected** — does not reach pet owners or the public |
| Staff access via the mobile app | **Rejected** — staff workflows remain web-only |
| Native iOS app (SwiftUI) | **Selected**, phased separately from the AI layer |

Two rejections carry most of the architecture. Rejecting an ungrounded model produced the retrieval layer; rejecting free-form text-to-SQL produced the pattern-matched structured-query layer, where every query is written in advance and the model only ever fills slots.

### Deliver — what this becomes

- A RAG assistant grounded in pet records, FAQs, and care instructions
- Auto-generated summaries: medical history, consultation notes, owner-friendly aftercare instructions
- Plain-language explanations of ML outputs
- Decision-support framing on every response
- Three access modes: guest, pet owner, staff
- An iOS app extending the above to pet owners and the public

---

## MoSCoW prioritization

### Must have

Cannot ship the AI layer without these.

- **RAG assistant grounded in trusted clinic data** — pet records, FAQs, care instructions; not open-web answers
- **Three-tier role-based access scoping** — guest sees general information only; pet owner sees only their own pets; staff see clinic data per role
- **Decision-support framing on every response** — never phrased as a diagnosis or a replacement for a veterinarian
- **Exact-answer fallback for count and lookup questions** — the hallucination fix, built and validated

### Should have

High value, ships alongside the Must Haves.

- Summaries: medical history, consultation notes, aftercare instructions
- Natural-language explanations of ML outputs
- Guest-mode general pet-care question answering, with no clinic or customer data exposed

### Could have

Next phase, once the AI layer is stable.

- iOS app extending VetCare Pro to pet owners and the public
- Push notifications for appointment reminders and vaccination due dates
- Typo-tolerant and fuzzy matching; lab report content queries; customer growth queries
- Voice input; multi-turn conversational memory

> **Resolved during the programme:** mobile scope is confirmed as an iOS-only native app covering guest and pet-owner modes. Android is out of scope, and staff access remains web-only by design. The mobile build was phased separately so it could never block the AI layer shipping on web first.

### Won't have — this phase

- AI making autonomous clinical decisions or diagnoses — out of scope by design, not by timeline
- Free-form text-to-SQL or arbitrary query generation
- Cross-clinic or multi-tenant support
- An Android application
- Staff access via the mobile app
- Full mobile feature parity with web in the first mobile release

The first item differs in kind from the others. The rest are deferred and could be revisited; autonomous clinical decision-making is a permanent boundary. See [`SCOPE.md`](SCOPE.md) §4.7.

---

## Infographics

Double Diamond and MoSCoW diagrams belong in [`images/`](images/) and should be referenced from this document once produced.