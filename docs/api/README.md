# API Reference

REST API exposed by the Node/Express backend at `http://localhost:3000`.

> **Generated from `@route` / `@desc` / `@access` annotations in `server/src/routes/`.** Regenerate rather than hand-editing. Modules showing no table are not yet annotated — annotate the source rather than documenting them here.

---

## Conventions

**Base URL.** `http://localhost:3000` in development.

**Response envelope.** Every endpoint returns the same shape:

```json
{ "status": "success" | "error", "message": "...", "data": { } }
```

Stack traces are included on errors only when `NODE_ENV=development`.

**Authentication.** Bearer token in the `Authorization` header:

```
Authorization: Bearer <token>
```

Two token types exist and are **not** interchangeable. Staff tokens come from `/api/auth/login`; pet-owner tokens come from `/api/customer-auth/login` and carry a `type: 'customer'` claim. Presenting one where the other is required returns 401. See [`ARCHITECTURE.md`](../ARCHITECTURE.md) §2.

**Authorization.** The `Access` column states the requirement. Role names refer to the staff roles in [`rbac.md`](../rbac.md).

**Status codes.** 200 success · 201 created · 400 validation failure · 401 missing or invalid token · 403 authenticated but insufficient role · 404 not found · 500 server error.

---

## Unauthenticated endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service health and environment |
| `GET` | `/api` | API index |
| `POST` | `/api/auth/login` | Staff login |
| `POST` | `/api/customer-auth/login` | Pet-owner login |
| `POST` | `/api/customer-auth/verify-identity` | Begin pet-owner account setup |
| `POST` | `/api/customer-auth/set-password` | Complete account setup |
| `POST` | `/api/ai/public-chat` | Guest AI assistant |
| `GET` | `/api/ai/faqs` | Public FAQ list |

Everything else requires a token.

---

## Endpoints by module


### Staff Authentication — `/api/auth`

| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/login` | Login user | Public |
| `POST` | `/api/auth/register` | Register new user (Admin only) | Private (Admin) |
| `GET` | `/api/auth/me` | Get current logged-in user | Private |
| `POST` | `/api/auth/logout` | Logout user | Private |
| `POST` | `/api/auth/change-password` | Change own password (requires current password) | Private |
| `POST` | `/api/auth/change-password-first-login` | Change password for first-time login | Private |

### Pet Owner Portal — `/api/customer-auth`

| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/api/customer-auth/login` | Log in with email or phone as username | Public |
| `POST` | `/api/customer-auth/verify-identity` | Confirm email + phone match a pet owner on file, issue a setup token | Public |
| `POST` | `/api/customer-auth/set-password` | Set a password for the first time using a setup token, then log in | Public (requires a valid setupToken) |
| `GET` | `/api/customer-auth/me` | Get current logged-in customer | Private (customer) |
| `PUT` | `/api/customer-auth/me` | Update own editable contact details (alternate phone, address, city, preferred contact method, emergency contact/phone only) | Private (customer) |
| `GET` | `/api/customer-auth/me/pets` | Get pets belonging to the current customer | Private (customer) |
| `GET` | `/api/customer-auth/pets/:petId/vaccinations` | Get vaccination history for one of the current customer's own pets | Private (customer) |
| `GET` | `/api/customer-auth/pets/:petId/lab-reports` | Get lab reports for one of the current customer's own pets | Private (customer) |
| `GET` | `/api/customer-auth/lab-reports/:reportId/view` | Stream a lab report file, only if it belongs to one of the current customer's own pets | Private (customer) |
| `GET` | `/api/customer-auth/veterinarians` | List active veterinarians a pet owner can pick as their preferred vet | Private (customer) |
| `GET` | `/api/customer-auth/appointments` | Get the current customer's own appointments | Private (customer) |
| `GET` | `/api/customer-auth/appointments/availability` | Get bookable time slots for a date (no other owners' details exposed) | Private (customer) |
| `POST` | `/api/customer-auth/appointments` | Book a new appointment for one of the customer's own pets | Private (customer) |
| `PUT` | `/api/customer-auth/appointments/:id` | Update/reschedule the customer's own appointment (>= 48h out only) | Private (customer) |
| `DELETE` | `/api/customer-auth/appointments/:id` | Cancel the customer's own appointment (>= 48h out only) | Private (customer) |
| `POST` | `/api/customer-auth/logout` | Logout | Private (customer) |
| `POST` | `/api/customer-auth/change-password` | Change own password (requires current password) | Private (customer) |

### Users (Staff) — `/api/users`

| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/api/users` | Create new user (Admin only) | Private (Admin only) |
| `GET` | `/api/users/veterinarians` | Get all active veterinarians | Private |
| `GET` | `/api/users` | Get all users | Private (Admin, Veterinarian) |
| `GET` | `/api/users/:id/stats` | Get activity stats for a user | Private (Admin or own profile) |
| `POST` | `/api/users/:id/reset-password` | Reset user password (Admin only, not for other admins) | Private (Admin only) |
| `GET` | `/api/users/:id` | Get user by ID | Private |
| `PUT` | `/api/users/:id` | Update user | Private (Admin or own profile) |
| `PATCH` | `/api/users/:id/deactivate` | Deactivate user (soft deactivation) | Private (Admin only) |
| `DELETE` | `/api/users/:id` | Delete user (soft delete) | Private (Admin only) |
| `POST` | `/api/users/:id/upload-profile-image` | Upload profile image | Private (Admin or own profile) |
| `DELETE` | `/api/users/:id/profile-image` | Delete profile image | Private (Admin or own profile) |

### Customers — `/api/customers`

| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/api/customers` | Get all customers | Private |
| `GET` | `/api/customers/:id` | Get customer by ID | Private |
| `POST` | `/api/customers` | Create new customer | Private |
| `PUT` | `/api/customers/:id` | Update customer | Private |
| `GET` | `/api/customers/:id/pets` | Get all pets belonging to a customer | Private |
| `GET` | `/api/customers/:id/deletability` | Check if customer can be deleted or must be inactivated | Private |
| `PATCH` | `/api/customers/:id/inactivate` | Inactivate customer with reason | Private |
| `DELETE` | `/api/customers/:id` | Delete customer (soft delete) | Private (Admin only) |

### Pets — `/api/pets`

| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/api/pets/species/list` | Get list of species | Private |
| `GET` | `/api/pets/breeding/registry` | Get pets available for breeding | Private |
| `GET` | `/api/pets` | Get all pets | Private |
| `GET` | `/api/pets/:id` | Get pet by ID | Private |
| `POST` | `/api/pets` | Create new pet | Private |
| `PUT` | `/api/pets/:id` | Update pet | Private |
| `GET` | `/api/pets/:id/deletability` | Check if pet can be deleted or must be inactivated | Private |
| `PATCH` | `/api/pets/:id/inactivate` | Inactivate pet with reason | Private |
| `DELETE` | `/api/pets/:id` | Delete pet (soft delete) | Private (Admin only) |
| `GET` | `/api/pets/:id/medical-history` | Get pet's medical history | Private |
| `GET` | `/api/pets/:id/vaccinations` | Get pet's vaccination history | Private |
| `POST` | `/api/pets/:id/vaccinations` | Add vaccination record | Private (Vet/Admin) |
| `PUT` | `/api/pets/:id/vaccinations/:vaccinationId` | Update vaccination record | Private (Vet/Admin) |
| `DELETE` | `/api/pets/:id/vaccinations/:vaccinationId` | Delete vaccination record | Private (Admin only) |
| `POST` | `/api/pets/:id/upload-image` | Upload pet image | Private |
| `DELETE` | `/api/pets/:id/image` | Delete pet image | Private |

### Appointments — `/api/appointments`

| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/api/appointments` | Get all appointments | Private |
| `GET` | `/api/appointments/:id` | Get appointment by ID | Private |
| `POST` | `/api/appointments` | Create new appointment | Private |
| `PUT` | `/api/appointments/:id` | Update appointment | Private |
| `PATCH` | `/api/appointments/:id/status` | Update appointment status | Private |
| `DELETE` | `/api/appointments/:id` | Delete appointment | Private (Admin only) |

### Medical Records — `/api/medical-records`

| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/api/medical-records/follow-up` | Get records requiring follow-up | Private |
| `GET` | `/api/medical-records/pet/:petId/vital-signs` | Get vital signs history for a pet | Private |
| `GET` | `/api/medical-records/pet/:petId` | Get all medical records for a specific pet | Private |
| `GET` | `/api/medical-records` | Get all medical records | Private |
| `GET` | `/api/medical-records/:id` | Get medical record by ID | Private |
| `POST` | `/api/medical-records` | Create new medical record | Private (Veterinarian, Admin) |
| `PUT` | `/api/medical-records/:id` | Update medical record | Private (Veterinarian, Admin) |
| `DELETE` | `/api/medical-records/:id` | Delete medical record | Private (Admin only) |

### Lab Reports — `/api/lab-reports`

_Routes in this module are not annotated; see the source file._


### Disease Cases — `/api/disease-cases`

| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/api/disease-cases/statistics/overview` | Get disease statistics overview | Private (Veterinarian, Admin) |
| `GET` | `/api/disease-cases/statistics/by-category` | Get disease cases grouped by category | Private (Veterinarian, Admin) |
| `GET` | `/api/disease-cases/recent` | Get recent disease cases | Private (Veterinarian, Admin) |
| `GET` | `/api/disease-cases/pet/:petId` | Get all disease cases for a specific pet | Private (Veterinarian, Admin) |
| `GET` | `/api/disease-cases` | Get all disease cases with filters | Private (Veterinarian, Admin) |
| `GET` | `/api/disease-cases/:id` | Get disease case by ID | Private (Veterinarian, Admin) |
| `GET` | `/api/disease-cases/:id/followups` | Get all follow-up visit records for a disease case | Private (Veterinarian, Admin) |
| `POST` | `/api/disease-cases/:id/followups` | Record a follow-up visit for a disease case | Private (Veterinarian, Admin) |
| `POST` | `/api/disease-cases` | Create new disease case | Private (Veterinarian, Admin) |
| `PUT` | `/api/disease-cases/:id` | Update disease case | Private (Veterinarian, Admin) |
| `DELETE` | `/api/disease-cases/:id` | Delete disease case | Private (Admin only) |

### Inventory — `/api/inventory`

_Routes in this module are not annotated; see the source file._


### Billing — `/api/billing`

| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/api/billing/stats/revenue` | Get revenue statistics | Private (Admin/Receptionist) |
| `GET` | `/api/billing/overdue` | Get overdue bills | Private |
| `GET` | `/api/billing` | Get all bills | Private |
| `GET` | `/api/billing/:id` | Get bill by ID with items and payments | Private |
| `POST` | `/api/billing` | Create new bill | Private (Admin, Receptionist) |
| `PUT` | `/api/billing/:id` | Update bill | Private (Admin, Receptionist) |
| `POST` | `/api/billing/:id/payments` | Record payment for a bill | Private (Admin, Receptionist) |
| `DELETE` | `/api/billing/:id` | Delete (cancel) bill | Private (Admin only) |

### Payments — `/api/payments`

| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/api/payments/stats/summary` | Get payment statistics | Private (Admin/Receptionist) |
| `GET` | `/api/payments` | Get all payments with filters | Private |
| `GET` | `/api/payments/:id` | Get payment by ID | Private |

### Reports — `/api/reports`

_Routes in this module are not annotated; see the source file._


### Machine Learning — `/api/ml`

| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/api/ml/health` | Check ML service health | Private |
| `GET` | `/api/ml/models/status` | Get ML models status | Private |
| `GET` | `/api/ml/retrain-check` | Check if any model needs retraining based on new record growth | Private (Admin only) |
| `GET` | `/api/ml/test/db-connection` | Test ML service database connection | Private (Admin only) |
| `POST` | `/api/ml/disease/train` | Train or retrain the disease prediction model | Private (Admin only) |
| `POST` | `/api/ml/disease/predict` | Predict disease outbreak | Private |
| `GET` | `/api/ml/disease/trends` | Get disease trends | Private |
| `POST` | `/api/ml/disease/pet-risk` | Predict individual pet disease risk over time horizons | Private (vet + admin) |
| `POST` | `/api/ml/disease/cancer-risk` | Estimate cancer/tumor risk based on breed and age | Private (vet + admin) |
| `POST` | `/api/ml/disease/outbreak-risk` | Assess disease activity risk based on recent cases | Private |
| `GET` | `/api/ml/disease/forecast` | Get monthly disease activity forecast | Private |
| `GET` | `/api/ml/disease/outbreak-trend` | Project outbreak trend forward (?species=&days_ahead=90) | Private (vet + admin) |
| `GET` | `/api/ml/disease/pandemic-risk` | Assess pandemic/epidemic potential (?species=) | Private (vet + admin) |
| `POST` | `/api/ml/sales/train` | Train or retrain the sales forecasting model | Private (Admin only) |
| `GET` | `/api/ml/sales/forecast` | Forecast revenue for the next N days (?periods=90) | Private |
| `POST` | `/api/ml/sales/predict-month` | Predict revenue for a specific month and year | Private |
| `GET` | `/api/ml/sales/trends` | Get historical sales trends and seasonal patterns (?months=12) | Private |
| `GET` | `/api/ml/sales/top-services` | Get top revenue-generating services and products (?limit=10) | Private |
| `POST` | `/api/ml/inventory/train` | Train or retrain the inventory forecasting model | Private (Admin only) |
| `POST` | `/api/ml/inventory/forecast` | Forecast inventory demand for a specific item | Private |
| `GET` | `/api/ml/inventory/reorder-suggestions` | Get intelligent reorder suggestions for all items | Private |
| `GET` | `/api/ml/inventory/fast-moving` | Get fast-moving and slow-moving items (?limit=10) | Private |
| `GET` | `/api/ml/inventory/category-analysis` | Get demand analysis by inventory category | Private |
| `POST` | `/api/ml/inventory/predict-restock` | Predict restock date for a specific item | Private |
| `GET` | `/api/ml/data/sales` | Load sales data | Private (Admin only for testing) |
| `GET` | `/api/ml/data/inventory` | Load inventory data | Private (Admin only for testing) |

### AI Assistant — `/api/ai`

| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/api/ai/public-chat` | Ask a general pet-care question (no clinic data, no login required) | Public |
| `GET` | `/api/ai/faqs` | List general pet-care FAQs (guest-safe, no clinic/account data) | Public |
| `POST` | `/api/ai/customer-chat` | Ask the AI assistant, scoped to the logged-in customer's own pets | Private (customer / pet owner) |
| `POST` | `/api/ai/chat` | Ask the AI assistant using full clinic-data scope | Private (admin, veterinarian, receptionist) |
| `POST` | `/api/ai/actions/confirm` | Execute a write action the assistant proposed (book/reschedule/ cancel an appointment, send a reminder, register a customer, add a pet, or - admin only - register a new staff member) after explicit staff confirmation | Private (admin, veterinarian, receptionist) - register_staff is |
| `GET` | `/api/ai/health` | Check AI assistant (Ollama/RAG) health | Private (staff) |
| `POST` | `/api/ai/ingest/medical-records` | Backfill the vector store from all existing medical records | Private (Admin only) |
| `POST` | `/api/ai/ingest/all` | Backfill every RAG source type (medical records, disease cases, lab reports, vaccinations, FAQs, staff FAQs) | Private (Admin only) |
| `POST` | `/api/ai/explain` | Explain a raw ML model output (outbreak risk, sales/inventory forecast) in plain language | Private (staff) |

### Email — `/api/email`

| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/api/email/appointment/:id/confirm` | Send appointment confirmation email | Private |
| `POST` | `/api/email/billing/:id/send` | Send invoice email | Private |
| `POST` | `/api/email/send` | Send custom email to a customer | Private |

### Audit Logs — `/api/audit-logs`

_Routes in this module are not annotated; see the source file._


### Search — `/api/search`

_Routes in this module are not annotated; see the source file._


---

## Notes

**`/api/ml/*`** is proxied by the backend to the Flask service on port 5001. The Flask service is not exposed directly to clients and performs no authentication of its own — it trusts the role and customer identity the backend supplies, because the backend has already established them from a verified token.

**`/api/ai/actions/confirm`** executes a write action the assistant proposed. The assistant itself never writes; it returns a proposal that this endpoint applies after explicit user confirmation. `register_staff` is further restricted to administrators inside the controller.

**`/api/ai/ingest/*`** rebuilds the vector store and is administrator-only. Ingestion is idempotent.

**Vector-store lifecycle beyond `/api/ai/ingest/*`** — most `rag_chunks` writes aren't a client-callable route at all; they're a side effect of other Node routes. `server/src/services/aiService.js` calls the Flask ML service directly (never exposed under `/api/ai`, same internal-only pattern as the rest of `/api/ml/*`): `POST /api/ml/rag/chunks/delete` fires from the medical-record, disease-case, lab-report, and vaccination delete handlers so a deleted record's chunk doesn't stay retrievable; `POST /api/ml/rag/ingest/pet` fires from `PUT /api/pets/:id` when a pet's name/species/breed changes, so its chunks pick up the new value instead of citing the old one until the next manual backfill.

**Pet-owner appointment routes** enforce the constraints in `server/src/utils/appointmentRules.js` — clinic open days, 30-minute slots between 09:00 and 18:30, three concurrent appointments per slot, and a 48-hour minimum lead time on create, reschedule, and cancel. Staff routes are not bound by the lead-time rule.

**Unannotated modules** — `auditLogRoutes.js`, `inventoryRoutes.js`, `labReportRoutes.js`, `reportRoutes.js`, and `searchRoutes.js` lack `@route` annotations, so they produce no table above. Their paths are `/api/audit-logs`, `/api/inventory`, `/api/lab-reports`, `/api/reports`, and `/api/search` respectively. Adding annotations to those files is the fix; documenting them by hand here would immediately drift.