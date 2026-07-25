# AI Launchpad — Problem, Solution & Prioritization

Scope: AI assistant/copilot layer + mobile app extension for VetCare Pro.

---

## The Problem

- VetCare Pro holds rich clinic data (medical records, ML forecasts, care instructions) but it's only reachable by navigating the web app — there's no conversational way to ask for it
- ML outputs (outbreak risk, sales/inventory forecasts) are technical and hard for non-technical staff or pet owners to interpret
- Pet owners and the public have no mobile access at all today — web only
- Any AI layer touching clinic data must not leak one customer's/role's data to another, and must never present itself as replacing a vet's judgment

---

## Double Diamond

### 1. Discover *(explore the problem space)*
- Staff and pet owners both struggle to extract quick answers from clinic data (proven in testing — RAG alone hallucinates on count/aggregate questions)
- ML model outputs exist but are shown as raw numbers/charts, not plain language
- Three distinct audiences need three distinct data boundaries: the public, pet owners, and clinic staff
- No mobile presence — everything is web-only today

### 2. Define *(narrow to one problem statement)*
> VetCare Pro needs an AI layer that makes trusted clinic data and existing ML outputs understandable through natural language — strictly as a decision-support tool, never a replacement for professional veterinary judgment — with data access scoped by role, and reachable from both web and a new mobile app.

### 3. Develop *(explore solution options)*
| Option | Verdict |
|---|---|
| Pure LLM, no grounding in clinic data | Rejected — would fabricate medical facts |
| RAG grounded in clinic data (records, FAQs, care instructions) | **Selected** for Q&A |
| Free-form text-to-SQL for all data questions | Rejected — correctness/security risk |
| RAG + exact-SQL fallback for count/lookup questions | **Selected** — validated in `structured_query.py` |
| Single unscoped data access for all users | Rejected — privacy risk across guest/owner/staff |
| Three-tier RBAC (guest / pet owner / staff) | **Selected** |
| Web-only | Rejected — doesn't reach pet owners/public |
| Native or cross-platform mobile app | **Selected**, phased separately from the AI layer |

### 4. Deliver *(what this becomes)*
- RAG assistant grounded in pet records, FAQs, and care instructions
- Auto-generated summaries: pet medical history, consultation notes, owner-friendly aftercare instructions
- Plain-language explanations of ML outputs: outbreak risk, sales forecasts, inventory predictions
- Every AI response framed as decision-support, never diagnostic or prescriptive
- Three access modes: guest (general pet care info only), pet owner (own pets only), staff (full clinic data per role)
- Mobile app (iOS/Android) extending the above to pet owners and the public

---

## MoSCoW Prioritization

### Must Have — *can't ship the AI layer without these*
- RAG assistant grounded in trusted clinic data — *pet records, FAQs, care instructions, not open-web answers*
- Three-tier role-based access scoping — *guest sees general info only; pet owner sees only their own pets; staff sees full clinic data per role*
- Decision-support framing on every AI response — *never phrased as a diagnosis or a replacement for a vet*
- Exact-answer fallback for count/lookup questions — *the RAG hallucination fix already built and validated*

### Should Have — *high value, ships alongside Must Haves*
- Summaries: pet medical history, consultation notes, owner-friendly aftercare instructions
- Natural-language explanations of ML outputs — *"what does this outbreak risk score mean?"*
- Guest-mode general pet care Q&A — *no clinic-specific or customer data exposed*

### Could Have — *next phase, once the AI layer is stable*
- Mobile app (iOS/Android) extending VetCare Pro to pet owners and the public
- Push notifications via the mobile app — *appointment reminders, vaccine due dates*
- Typo-tolerant / fuzzy matching, lab report queries, customer growth queries *(earlier structured-query backlog)*
- Voice input, multi-turn conversational memory

> **Assumption to confirm:** the mobile app is placed in "Could Have" because it's a separate, large workstream (iOS/Android build) that doesn't block the AI layer shipping on web first. If the mobile app needs to ship in the same phase as the AI assistant, move it to "Should Have" and flag the resourcing implication.

### Won't Have *(this phase)*
- AI making autonomous clinical decisions or diagnoses — explicitly out of scope, by design
- Free-form text-to-SQL / arbitrary query generation
- Cross-clinic / multi-tenant support
- Full mobile feature parity with web in the first mobile release

---

## Infographics

- `docs/ai_launchpad_double_diamond.svg` — Discover → Define → Develop → Deliver, with activities and outputs per stage
- `docs/ai_launchpad_moscow.svg` — Must / Should / Could / Won't, with an example and rationale per item