# Role-Based Access Control

What each user role can and cannot do in VetCare Pro.

Three staff roles exist: **Admin**, **Veterinarian**, **Receptionist**. Pet owners authenticate through a separate system entirely and are covered in [`ARCHITECTURE.md`](ARCHITECTURE.md) §2.

---

## Enforcement

Role restrictions are declared in two places:

- `client/src/App.jsx` — `ProtectedRoute requiredRoles={[...]}` hides routes a user cannot use
- `server/src/routes/*Routes.js` — `authorize(...)` and its shorthands reject unauthorized requests

> **Only the server-side check is a security boundary.** The client-side guard is a usability affordance: it prevents navigation to an unusable page. It does not prevent a direct API call. Any new role-restricted feature must be gated in both places, and the server-side gate is the one that matters.

A third enforcement point applies to the AI assistant: `ml/scripts/rag/retrieval.py` filters retrievable content by role in SQL, so the assistant cannot surface data the interface would refuse. See [`how-the-ai-assistant-works.md`](how-the-ai-assistant-works.md) §6.

A fourth enforcement point sits alongside it, not inside it: `ml/scripts/rag/structured_query.py` answers exact-SQL questions (counts, clinic info, appointments, billing) without ever going through `retrieval.py`, so it gates access itself rather than inheriting the third point's filtering. It redirects receptionist questions about clinical detail (`_clinical_detail_redirect()`) rather than answering them, and its staff-only handler branches (inventory, disease cases, staff-named billing/appointment lookups) simply decline to claim a pet-owner's question, falling through to the owner's own scoped handlers or retrieval instead of clinic-wide data.

Middleware shorthands in `server/src/middleware/roleCheck.js`: `adminOnly`, `vetOrAdmin`, `adminOrReceptionist`, `staffOnly`.

---

## Admin

The practice manager or system owner. Administrators can do everything in the system.

Beyond what other roles can do:

- Create, edit, and delete staff accounts
- View financial and operational reports
- Train ML models
- Delete any record permanently
- Add, edit, and delete inventory items
- Access all analytics and forecasting

---

## Veterinarian

Handles the clinical side. Full access to patient and medical data; no access to billing creation, user management, or financial reporting.

**Appointments** — view, create, update. Cannot delete.

**Pets** — view, register, update including breeding status and clinical notes. Cannot delete.

**Customers** — view, register, update. Cannot delete.

**Medical records** — view, create, edit. Cannot delete.

**Lab reports** — upload, view, download, email to owners, delete.

**Disease cases** — view, create, edit; view statistics and outbreak analytics. Cannot delete.

**Analytics** — all disease analytics, trends, and predictions.

**Breeding registry** — view and manage.

**Inventory** — view items and stock; adjust quantities when dispensing. Cannot add or edit catalogue entries.

**Billing** — view for reference only. Cannot create or edit invoices.

Cannot: manage staff accounts, view financial reports or sales and inventory forecasting, train models, create or edit invoices, add or edit inventory items, delete appointments, customers, or pets.

---

## Receptionist

Front-desk work: scheduling, client registration, billing. No access to clinical or confidential medical data.

**Appointments** — view, create, update. Cannot delete.

**Customers** — view, register, update. Cannot delete.

**Pets** — view, register, update basic information. Cannot delete.

**Billing** — create invoices, edit and update, process and record payments, view all records.

**Inventory** — view items and stock levels, read-only.

Cannot: view or manage medical records, lab reports, or disease cases; access analytics or ML insights; access the breeding registry; view financial reports; manage staff accounts; delete any record; create or edit inventory items.

---

## Quick reference

| Feature | Admin | Veterinarian | Receptionist |
|---|:---:|:---:|:---:|
| Dashboard | Full | Vet view | Reception view |
| Appointments — view | ✅ | ✅ | ✅ |
| Appointments — create / update | ✅ | ✅ | ✅ |
| Appointments — delete | ✅ | ❌ | ❌ |
| Customers — view / create / edit | ✅ | ✅ | ✅ |
| Customers — delete | ✅ | ❌ | ❌ |
| Pets — view / create / edit | ✅ | ✅ | ✅ |
| Pets — delete | ✅ | ❌ | ❌ |
| Medical records — view / create / edit | ✅ | ✅ | ❌ |
| Medical records — delete | ✅ | ❌ | ❌ |
| Lab reports — upload / view / email | ✅ | ✅ | ❌ |
| Disease cases — view / create / edit | ✅ | ✅ | ❌ |
| Disease cases — delete | ✅ | ❌ | ❌ |
| Analytics and disease insights | ✅ | ✅ | ❌ |
| Sales and inventory forecasting | ✅ | ❌ | ❌ |
| Breeding registry | ✅ | ✅ | ❌ |
| Billing — view | ✅ | ✅ | ✅ |
| Billing — create / edit / process payment | ✅ | ❌ | ✅ |
| Billing — delete | ✅ | ❌ | ❌ |
| Inventory — view | ✅ | ✅ | ✅ |
| Inventory — adjust stock quantity | ✅ | ✅ | ❌ |
| Inventory — add / edit items | ✅ | ❌ | ❌ |
| Inventory — delete items | ✅ | ❌ | ❌ |
| Reports — financial / operational | ✅ | ❌ | ❌ |
| ML model training | ✅ | ❌ | ❌ |
| Staff / user management | ✅ | ❌ | ❌ |
| Own profile | ✅ | ✅ | ✅ |

---

## Rationale

**Permanent deletion is administrator-only, for every record type.** Clinical and financial history has evidentiary value; a cancelled appointment should change status rather than disappear.

**Veterinarians adjust stock but do not manage the catalogue.** Recording dispensed medication is clinical work. Deciding what the clinic stocks and at what price is a management decision.

**Receptionists process payments but do not create clinical invoices.** Front-desk settlement is administrative. Pricing a procedure requires knowing what was clinically performed.

**Clinical data is restricted to veterinarians and administrators.** Medical records, lab reports, and disease cases carry patient confidentiality obligations that front-desk work does not require access to. This is the boundary the AI assistant also enforces — a receptionist who cannot open a medical record cannot obtain its contents by asking.