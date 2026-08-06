# Project Scope

Boundaries of the VetCare Pro project: what the system covers, what it deliberately excludes, and why.

**Companion documents:** [`ARCHITECTURE.md`](ARCHITECTURE.md) for how the system is built.

---

## 1. Context

VetCare Pro is a veterinary clinic management platform built for Pro Pet Animal Hospital, a single-site clinic in Sri Lanka. It began as a web-based management system and was extended, under an eight-week AI Launchpad programme, with two additions:

1. A retrieval-augmented AI assistant layered across the existing platform.
2. A companion iOS application for pet owners and prospective clients.

The clinic operates Monday to Saturday, 09:00–18:30, with three staff roles: administrators, veterinarians, and receptionists.

---

## 2. Objectives

**Primary.** Replace paper and spreadsheet record-keeping with a single system covering the clinical and commercial operations of the practice.

**Secondary.** Demonstrate that clinic data can be made conversationally accessible — safely, with access controls preserved and without a language model being permitted to state clinical conclusions or fabricate figures.

**Constraint on both.** The system is decision support. It informs professional judgement; it does not substitute for it.

---

## 3. In scope

### 3.1 Clinical records

- Customer (pet owner) records with contact details and relationship to pets
- Pet profiles: species, breed, sex, date of birth, weight, photograph
- Medical records: presenting complaint, examination findings, diagnosis, treatment, prescriptions
- Vaccination history and due-date tracking
- Lab report upload, storage, and retrieval
- Disease case tracking with follow-ups, supporting outbreak analysis
- Breeding registry

### 3.2 Appointments

- Staff-side scheduling, rescheduling, and cancellation
- Pet-owner self-service booking, subject to the rules in `appointmentRules.js`
- Availability lookup that exposes free slots without revealing other owners' details
- Email confirmations and reminders

Self-service booking constraints: clinic open days only; 30-minute slots between 09:00 and 18:30; a maximum of three concurrent appointments per slot; and a 48-hour minimum lead time on booking, rescheduling, and cancellation. Staff are not bound by the lead-time rule.

### 3.3 Commercial operations

- Inventory with stock levels, transactions, and reorder points
- Billing with line items, invoice generation, and email delivery
- Payment recording against invoices
- Financial and operational reporting, exportable to CSV and PDF

### 3.4 Predictive analytics

- Disease activity prediction and outbreak risk assessment
- Individual pet health and cancer risk indicators
- Sales revenue forecasting
- Inventory demand forecasting and restock-date prediction
- Plain-language explanation of any of the above via the AI assistant

Models are retrained on demand through admin-only endpoints, not on a schedule.

### 3.5 AI assistant

Three access modes:

| Mode | Audience | Data visible |
|---|---|---|
| Guest | Public, no login | General pet-care information and public FAQs only |
| Pet owner | Authenticated owner | Their own pets, appointments, and records |
| Staff | Authenticated staff | Clinic-wide, scoped further by role |

Capabilities:

- Questions answered from clinic records, with source citations
- Exact counts and lists answered by SQL rather than semantic retrieval
- Clinical generation for veterinarians and administrators: full history summaries, consultation-note drafts, owner-facing aftercare instructions, pre-appointment briefings
- Conversational write actions for staff — booking, rescheduling, cancelling, reminders, customer and pet registration, staff registration (admin only) — each requiring explicit confirmation before execution
- Receptionist support: clinic hours and policy lookups, outstanding balances, price estimates
- Natural-language explanation of machine-learning outputs

### 3.6 Platform administration

- User management and role assignment
- Audit logging of significant actions
- Configurable clinic settings (hours, fees) read at runtime
- Universal search across records

### 3.7 iOS application

Pet owner and guest features: account setup and login, pet profiles with vaccination and lab history, appointment viewing and booking, profile management, and the guest and pet-owner AI assistants.

---

## 4. Out of scope

Each exclusion below is a decision, not an oversight.

### 4.1 Android application

**Excluded.** The programme timeline allowed one mobile platform built well rather than two built adequately. iOS was selected for its single deployment target and the availability of a test device. The backend is platform-neutral, so an Android client would require no server changes.

### 4.2 Staff access on mobile

**Excluded.** Clinical work happens at a workstation, where the full interface is available. A staff mobile client would duplicate every role-based access rule on a second surface for marginal benefit. The mobile app therefore serves pet owners and the public only.

### 4.3 Multi-clinic and multi-tenancy

**Excluded.** The system targets a single practice. There is no organization entity, no tenant isolation, and no cross-site reporting. Introducing multi-tenancy later would require a tenant key on nearly every table and a corresponding filter in every query — a schema-level change, deliberately deferred rather than half-built.

### 4.4 Payment gateway integration

**Excluded.** Payments are *recorded* against invoices; they are not *processed*. The clinic settles in cash and by card terminal. Online payment would introduce PCI obligations disproportionate to the project.

### 4.5 Prescription refill requests via the assistant

**Excluded deliberately.** This was evaluated against the other receptionist capabilities and rejected. A refill request is a clinical decision requiring a veterinarian's review of the patient's current state; routing it through a conversational interface risks creating an expectation of automatic approval. Owners request refills through the clinic directly.

### 4.6 Autonomous AI actions

**Excluded by design.** The assistant never writes to the database without explicit user confirmation, never persists generated clinical content without review, and never sends an email without approval. Removing the confirmation step is out of scope regardless of how reliable the model appears in testing.

### 4.7 Diagnosis

**Excluded absolutely.** The assistant does not diagnose. System prompts forbid stating a clinical conclusion as fact. Every response is positioned as decision support for a qualified veterinarian. This boundary is not subject to future relaxation.

### 4.8 Cloud-hosted language models

**Excluded.** Inference runs locally through Ollama. Clinic records — including medical histories and owner contact details — never leave the machine, and the system carries no per-token cost. The trade-off is a smaller, less capable model, which the architecture compensates for with SQL routing and deterministic post-processing.

### 4.9 Production deployment and operations

**Excluded.** The project targets a working local development environment. Production hosting, TLS termination, backups, monitoring, and CI/CD are not included.

### 4.10 Automated test suite

**Not implemented.** There is no unit or integration test suite for any service. Verification is manual: health endpoints, direct API calls, `npm run build` and `npm run lint` for the frontend, and browser confirmation of UI changes. This is a known gap rather than a design decision — see §5.

---

## 5. Known gaps

Honest limitations of the system as it stands.

| Gap | Impact | Notes |
|---|---|---|
| No automated tests | Regressions surface only through manual checking | `server` has a stub `test` script; `ml/test_setup.py` checks connectivity, not behaviour; Swift test targets are scaffolding |
| No migration runner | Database state must be verified before assuming it | Migrations in `database/migrations/` are applied by hand |
| No design token layer | Visual inconsistency; costly restyling | ~1,400 inline style objects, 146 distinct hex colours, no CSS custom properties |
| Web/iOS brand divergence | The two clients do not look like one product | Web uses blue (`#3b82f6`, `#137fec`); iOS uses teal (`#127d8c`) |
| Credentials in tracked files | Acceptable privately; unacceptable if the repository is opened | Plaintext passwords in `DATABASE.md` and `README.md` |
| Hard-coded iOS base URL | App cannot reach any other environment unmodified | `APIConfig.baseURL` points at a development machine hostname |
| Appointment capacity is a stand-in | Concurrency is a row count, not veterinarian availability | `MAX_CONCURRENT_APPOINTMENTS = 3`; genuine per-vet scheduling is not implemented |
| Uploads stored on local disk | No redundancy; lost with the machine | `server/uploads/`, gitignored |
| `system_settings` unused | Clinic policy is held in code and static text, not configuration | Table is created and seeded, but no code reads it |
| Stale staff FAQ content | The assistant can state clinic policy that is no longer true | `STAFF_FAQS` entry `staff-002` still describes a default pet-owner password; the actual flow is self-service setup |

---

## 6. Deliverables

Programme deliverables are documentation, wireframes, and presentation materials. The source repository is private and is not itself a deliverable.

- Architecture and scope documentation (this set)
- Design specification: tokens, component library, screen designs
- Low-fidelity wireframes
- Final presentation

---

## 7. Assumptions

- Single clinic, single physical site
- Staff operate on workstations with reliable local network access
- Pet owners have email and a mobile phone number on file, enabling identity verification at account setup
- Clinic hours and fee structure change rarely — currently rare enough that they are held in code and static FAQ text rather than read from `system_settings` (see §5)
- A machine capable of running a 7B-parameter model locally is available to host the ML service