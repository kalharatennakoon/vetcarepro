# Database Schema

PostgreSQL schema for VetCare Pro. 17 tables defined in `database/schema.sql`.

For connection details and reset procedures see [`../DATABASE.md`](../DATABASE.md). For setup order see [`setup.md`](setup.md).

> **Generated from `database/schema.sql`.** Regenerate rather than hand-editing when the schema changes.

---

## Migration policy

Changes made after the base schema live in `database/migrations/*.sql`.

**There is no migration runner.** Files are applied by hand, in no enforced order, with no record of what has been applied to a given database. The presence of a file says nothing about whether a particular database has received it — inspect the live schema before assuming.

| Migration | Effect |
|---|---|
| `add_rag_vector_store.sql` | `pgvector` extension and the `rag_chunks` table |
| `add_customer_auth.sql` | Pet-owner credential columns on `customers` |
| `add_password_must_change.sql` | First-login password change flag |
| `add_gender_to_users.sql` | Gender column on `users` |
| `add_disease_case_followups.sql` | Follow-up tracking on disease cases |
| `add_medical_record_id_to_disease_cases.sql` | Links a disease case to its originating record |
| `add_unique_constraints_customers.sql` | Uniqueness on customer identifiers |
| `add_unique_address_emergency_phone_customers.sql` | Further customer uniqueness constraints |
| `populate_disease_cases.sql` | Backfills disease cases from existing records |
| `add_ai_briefings.sql` | `ai_briefings` table caching the staff dashboard's AI daily briefing |
| `add_ai_briefings_data_hash.sql` | `data_hash` column on `ai_briefings` so same-day data changes invalidate the cache |
| `add_pet_photo_guidance.sql` | `pet_photo_guidance` table backing the pet-owner photo AI guidance job queue |
| `fix_business_hours_setting.sql` | Corrects seeded `business_hours_start`/`end` to match `appointmentRules.js` |
| `fix_rag_vector_index.sql` | Replaces the `rag_chunks` ivfflat index with HNSW to fix retrieval recall |

Adding a migration means writing the `.sql` file *and* noting it here.

---

## Entity relationships

```
customers ──< pets ──< medical_records ──< disease_cases
    │           │              │
    │           │              └──< lab_reports
    │           ├──< vaccinations
    │           └──< appointments >── users (veterinarian)
    │
    └──< billing ──< billing_items
             └──< payments

inventory ──< inventory_transactions
users ──< audit_logs
rag_chunks ─ ─ ─ references pets / customers for access scoping
```

Cardinality in brief: a customer owns many pets; a pet has many medical records, vaccinations, and appointments; a medical record may produce lab reports and a disease case; billing belongs to a customer and holds many line items and payments.

---

## Domain groupings

| Domain | Tables |
|---|---|
| Identity | `users`, `customers` |
| Clinical | `pets`, `medical_records`, `vaccinations`, `lab_reports`, `disease_cases` |
| Operations | `appointments`, `inventory`, `inventory_transactions` |
| Commercial | `billing`, `billing_items`, `payments`, `daily_sales_summary` |
| Platform | `audit_logs`, `system_settings`, `model_metadata` |
| AI | `rag_chunks` |

---

## Notes on selected tables

**`users`** — clinic staff only. The `role` column is constrained to `admin`, `veterinarian`, `receptionist` and drives every authorization check in the application.

**`customers`** — pet owners. Carries its own `password_hash`, independent of `users`, supporting the separate portal authentication described in [`ARCHITECTURE.md`](ARCHITECTURE.md).

**`rag_chunks`** — the vector store. Holds embedded content with `pet_id` and `customer_id` for access scoping, and a `source_type` discriminator. Unique on `(source_type, source_id)` so ingestion can upsert idempotently. Retrieval filters on these columns in SQL, which is where the assistant's data boundaries are actually enforced.

**`system_settings`** — read by the AI assistant: `ml/scripts/rag/structured_query.py`'s `_get_clinic_settings()` queries eleven keys (clinic name/address/phone/mobile/email/website, business hours, working days) to answer clinic-info questions for every role, including guests. Not the source of truth for booking enforcement, though — `server/src/utils/appointmentRules.js` hardcodes its own copy of the opening/closing hours for that, with no code path keeping the two in sync (see [`SCOPE.md`](SCOPE.md) §5). Fee-related keys (e.g. `consultation_fee_default`) remain unread; the assistant's price estimates average historical `billing` rows instead.

**`audit_logs`** — records significant actions with the acting user.

**`daily_sales_summary`** — pre-aggregated revenue, used by forecasting rather than computed per request.

**`model_metadata`** — tracks trained model versions, supporting the retrain-check endpoint.

---

## Table reference


#### `users` (19 columns)

| Column | Definition |
|---|---|
| `user_id` | `SERIAL PRIMARY KEY` |
| `first_name` | `VARCHAR(50) NOT NULL` |
| `last_name` | `VARCHAR(50) NOT NULL` |
| `password_hash` | `VARCHAR(255) NOT NULL` |
| `email` | `VARCHAR(100) UNIQUE NOT NULL` |
| `phone` | `VARCHAR(20)` |
| `gender` | `VARCHAR(10) CHECK (gender IN ('male', 'female', 'other'))` |
| `role` | `VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'veterinarian', 'receptionist'))` |
| `specialization` | `VARCHAR(100), -- For veterinarians (e.g., "Small Animals", "Surgery")` |
| `license_number` | `VARCHAR(50), -- Professional license for vets` |
| `profile_image` | `VARCHAR(255), -- Profile image path` |
| `is_active` | `BOOLEAN DEFAULT true` |
| `password_must_change` | `BOOLEAN DEFAULT false, -- Flag for first-time login password change` |
| `last_login` | `TIMESTAMP` |
| `deactivated_at` | `TIMESTAMP,                   -- Set when is_active is set to false` |
| `created_at` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |
| `updated_at` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |
| `created_by` | `INTEGER REFERENCES users(user_id)` |
| `updated_by` | `INTEGER REFERENCES users(user_id)` |

#### `customers` (20 columns)

| Column | Definition |
|---|---|
| `customer_id` | `VARCHAR(50) PRIMARY KEY DEFAULT 'CUST-' \|\| LPAD(nextval('customers_id_seq')::TEXT, 4, '0')` |
| `first_name` | `VARCHAR(50) NOT NULL` |
| `last_name` | `VARCHAR(50) NOT NULL` |
| `email` | `VARCHAR(100)` |
| `phone` | `VARCHAR(20) NOT NULL` |
| `alternate_phone` | `VARCHAR(20)` |
| `address` | `TEXT` |
| `city` | `VARCHAR(50)` |
| `postal_code` | `VARCHAR(10)` |
| `nic` | `VARCHAR(20)` |
| `emergency_contact` | `VARCHAR(100)` |
| `emergency_phone` | `VARCHAR(20)` |
| `preferred_contact_method` | `VARCHAR(20) CHECK (preferred_contact_method IN ('phone', 'email', 'sms'))` |
| `notes` | `TEXT` |
| `is_active` | `BOOLEAN DEFAULT true` |
| `deactivated_at` | `TIMESTAMP,                   -- Set when is_active is set to false` |
| `created_at` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |
| `updated_at` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |
| `created_by` | `INTEGER REFERENCES users(user_id)` |
| `updated_by` | `INTEGER REFERENCES users(user_id)` |

#### `pets` (25 columns)

| Column | Definition |
|---|---|
| `pet_id` | `VARCHAR(50) PRIMARY KEY DEFAULT 'PET-' \|\| LPAD(nextval('pets_id_seq')::TEXT, 4, '0')` |
| `customer_id` | `VARCHAR(50) NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE` |
| `pet_name` | `VARCHAR(50) NOT NULL` |
| `photo_url` | `VARCHAR(255)` |
| `species` | `VARCHAR(50) NOT NULL` |
| `breed` | `VARCHAR(50)` |
| `gender` | `VARCHAR(10) CHECK (gender IN ('male', 'female', 'unknown'))` |
| `date_of_birth` | `DATE` |
| `color` | `VARCHAR(50)` |
| `weight_current` | `DECIMAL(5,2), -- Current weight in kg` |
| `insurance_provider` | `VARCHAR(100)` |
| `insurance_policy_number` | `VARCHAR(50)` |
| `is_neutered` | `BOOLEAN DEFAULT false` |
| `allergies` | `TEXT` |
| `special_needs` | `TEXT` |
| `is_active` | `BOOLEAN DEFAULT true` |
| `deceased_date` | `DATE` |
| `deactivated_at` | `TIMESTAMP,                   -- Set when is_active is set to false` |
| `notes` | `TEXT` |
| `breeding_available` | `BOOLEAN DEFAULT false` |
| `breeding_notes` | `TEXT` |
| `created_at` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |
| `updated_at` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |
| `created_by` | `INTEGER REFERENCES users(user_id)` |
| `updated_by` | `INTEGER REFERENCES users(user_id)` |

#### `appointments` (20 columns)

| Column | Definition |
|---|---|
| `appointment_id` | `VARCHAR(50) PRIMARY KEY` |
| `customer_id` | `VARCHAR(50) NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE` |
| `pet_id` | `VARCHAR(50) NOT NULL REFERENCES pets(pet_id) ON DELETE CASCADE` |
| `veterinarian_id` | `INTEGER REFERENCES users(user_id)` |
| `appointment_date` | `DATE NOT NULL` |
| `appointment_time` | `TIME NOT NULL` |
| `duration_minutes` | `INTEGER DEFAULT 30` |
| `appointment_type` | `VARCHAR(50) CHECK (appointment_type IN ('checkup', 'vaccination', 'surgery', 'emergency', 'follow_up', 'consultation'))` |
| `reason` | `VARCHAR(255) NOT NULL` |
| `estimated_cost` | `DECIMAL(10,2)` |
| `status` | `VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'))` |
| `cancellation_reason` | `TEXT` |
| `reminder_sent` | `BOOLEAN DEFAULT false` |
| `started_at` | `TIMESTAMP` |
| `completed_at` | `TIMESTAMP` |
| `notes` | `TEXT` |
| `created_at` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |
| `updated_at` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |
| `created_by` | `INTEGER REFERENCES users(user_id)` |
| `updated_by` | `INTEGER REFERENCES users(user_id)` |

#### `medical_records` (23 columns)

| Column | Definition |
|---|---|
| `record_id` | `SERIAL PRIMARY KEY` |
| `pet_id` | `VARCHAR(50) NOT NULL REFERENCES pets(pet_id) ON DELETE CASCADE` |
| `appointment_id` | `VARCHAR(50) REFERENCES appointments(appointment_id)` |
| `veterinarian_id` | `INTEGER NOT NULL REFERENCES users(user_id)` |
| `visit_date` | `DATE NOT NULL` |
| `chief_complaint` | `VARCHAR(255)` |
| `symptoms` | `TEXT` |
| `diagnosis` | `TEXT NOT NULL` |
| `treatment` | `TEXT` |
| `prescription` | `TEXT` |
| `lab_tests` | `TEXT` |
| `lab_results` | `TEXT` |
| `weight` | `DECIMAL(5,2)` |
| `temperature` | `DECIMAL(4,2)` |
| `heart_rate` | `INTEGER` |
| `respiratory_rate` | `INTEGER` |
| `follow_up_required` | `BOOLEAN DEFAULT false` |
| `follow_up_date` | `DATE` |
| `notes` | `TEXT` |
| `created_at` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |
| `updated_at` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |
| `created_by` | `INTEGER REFERENCES users(user_id)` |
| `updated_by` | `INTEGER REFERENCES users(user_id)` |

#### `vaccinations` (19 columns)

| Column | Definition |
|---|---|
| `vaccination_id` | `SERIAL PRIMARY KEY` |
| `pet_id` | `VARCHAR(50) NOT NULL REFERENCES pets(pet_id) ON DELETE CASCADE` |
| `vaccine_name` | `VARCHAR(100) NOT NULL` |
| `vaccine_type` | `VARCHAR(50), -- e.g., "Core", "Non-core", "Required by law"` |
| `vaccination_date` | `DATE NOT NULL` |
| `next_due_date` | `DATE` |
| `batch_number` | `VARCHAR(50)` |
| `manufacturer` | `VARCHAR(100)` |
| `expiry_date` | `DATE` |
| `site_of_injection` | `VARCHAR(50)` |
| `adverse_reaction` | `BOOLEAN DEFAULT false` |
| `reaction_details` | `TEXT` |
| `administered_by` | `INTEGER NOT NULL REFERENCES users(user_id)` |
| `reminder_sent` | `BOOLEAN DEFAULT false` |
| `notes` | `TEXT` |
| `created_at` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |
| `updated_at` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |
| `created_by` | `INTEGER REFERENCES users(user_id)` |
| `updated_by` | `INTEGER REFERENCES users(user_id)` |

#### `disease_cases` (24 columns)

| Column | Definition |
|---|---|
| `case_id` | `SERIAL PRIMARY KEY` |
| `pet_id` | `VARCHAR(50) NOT NULL REFERENCES pets(pet_id) ON DELETE CASCADE` |
| `disease_name` | `VARCHAR(100) NOT NULL` |
| `disease_category` | `VARCHAR(50) CHECK (disease_category IN ('infectious', 'parasitic', 'metabolic', 'genetic', 'immune_mediated', 'neoplastic', 'traumatic', 'nutritional'))` |
| `diagnosis_date` | `DATE NOT NULL` |
| `species` | `VARCHAR(50)` |
| `breed` | `VARCHAR(50)` |
| `age_at_diagnosis` | `INTEGER` |
| `severity` | `VARCHAR(20) CHECK (severity IN ('mild', 'moderate', 'severe', 'critical'))` |
| `outcome` | `VARCHAR(30) CHECK (outcome IN ('recovered', 'ongoing_treatment', 'chronic', 'deceased', 'transferred'))` |
| `treatment_duration_days` | `INTEGER` |
| `symptoms` | `TEXT` |
| `region` | `VARCHAR(50)` |
| `is_contagious` | `BOOLEAN DEFAULT false` |
| `transmission_method` | `VARCHAR(50)` |
| `notes` | `TEXT` |
| `created_at` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |
| `updated_at` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |
| `created_by` | `INTEGER REFERENCES users(user_id)` |
| `updated_by` | `INTEGER REFERENCES users(user_id)` |
| `requires_followup` | `BOOLEAN DEFAULT false` |
| `followup_type` | `VARCHAR(100)` |
| `next_followup_date` | `DATE` |
| `followup_notes` | `TEXT` |

#### `lab_reports` (10 columns)

| Column | Definition |
|---|---|
| `report_id` | `SERIAL PRIMARY KEY` |
| `pet_id` | `VARCHAR(50) NOT NULL REFERENCES pets(pet_id) ON DELETE CASCADE` |
| `report_name` | `VARCHAR(255) NOT NULL` |
| `report_type` | `VARCHAR(50) NOT NULL CHECK (report_type IN ('blood_test', 'urinalysis', 'kidney_panel', 'x_ray', 'ultrasound', 'cytology', 'biopsy', 'culture', 'other'))` |
| `file_path` | `VARCHAR(500) NOT NULL` |
| `file_type` | `VARCHAR(10) NOT NULL CHECK (file_type IN ('pdf', 'image'))` |
| `notes` | `TEXT` |
| `related_case_id` | `INTEGER REFERENCES disease_cases(case_id) ON DELETE SET NULL` |
| `uploaded_by` | `INTEGER REFERENCES users(user_id)` |
| `created_at` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |

#### `inventory` (28 columns)

| Column | Definition |
|---|---|
| `item_id` | `SERIAL PRIMARY KEY` |
| `item_code` | `VARCHAR(50) NOT NULL UNIQUE` |
| `item_name` | `VARCHAR(100) NOT NULL` |
| `category` | `VARCHAR(50) NOT NULL CHECK (category IN (` |
| `sub_category` | `VARCHAR(50)` |
| `quantity` | `INTEGER NOT NULL DEFAULT 0` |
| `unit` | `VARCHAR(20) DEFAULT 'pcs'` |
| `unit_cost` | `DECIMAL(10,2) NOT NULL` |
| `selling_price` | `DECIMAL(10,2) NOT NULL` |
| `markup_percentage` | `DECIMAL(5,2)` |
| `supplier` | `VARCHAR(100)` |
| `supplier_contact` | `VARCHAR(50)` |
| `reorder_level` | `INTEGER DEFAULT 10` |
| `reorder_quantity` | `INTEGER DEFAULT 50` |
| `lead_time_days` | `INTEGER DEFAULT 7` |
| `expiry_date` | `DATE NOT NULL` |
| `manufacturing_date` | `DATE NOT NULL` |
| `batch_number` | `VARCHAR(50)` |
| `storage_location` | `VARCHAR(50)` |
| `requires_prescription` | `BOOLEAN DEFAULT false` |
| `description` | `TEXT` |
| `is_active` | `BOOLEAN DEFAULT true` |
| `deactivated_at` | `TIMESTAMP,                   -- Set when is_active is set to false` |
| `last_restock_date` | `DATE` |
| `created_at` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |
| `updated_at` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |
| `created_by` | `INTEGER REFERENCES users(user_id)` |
| `updated_by` | `INTEGER REFERENCES users(user_id)` |

#### `billing` (22 columns)

| Column | Definition |
|---|---|
| `bill_id` | `SERIAL PRIMARY KEY` |
| `bill_number` | `VARCHAR(50) UNIQUE NOT NULL` |
| `customer_id` | `VARCHAR(50) NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE` |
| `appointment_id` | `VARCHAR(50) REFERENCES appointments(appointment_id)` |
| `bill_date` | `DATE NOT NULL DEFAULT CURRENT_DATE` |
| `due_date` | `DATE` |
| `subtotal` | `DECIMAL(10,2) NOT NULL` |
| `discount_percentage` | `DECIMAL(5,2) DEFAULT 0` |
| `discount_amount` | `DECIMAL(10,2) DEFAULT 0` |
| `tax_percentage` | `DECIMAL(5,2) DEFAULT 0` |
| `tax_amount` | `DECIMAL(10,2) DEFAULT 0` |
| `total_amount` | `DECIMAL(10,2) NOT NULL` |
| `paid_amount` | `DECIMAL(10,2) DEFAULT 0` |
| `balance_amount` | `DECIMAL(10,2) NOT NULL` |
| `payment_status` | `VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partially_paid', 'fully_paid', 'overdue', 'refunded'))` |
| `payment_method` | `VARCHAR(20) CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'mobile_payment', 'insurance'))` |
| `payment_reference` | `VARCHAR(100)` |
| `notes` | `TEXT` |
| `created_at` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |
| `updated_at` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |
| `created_by` | `INTEGER NOT NULL REFERENCES users(user_id)` |
| `updated_by` | `INTEGER REFERENCES users(user_id)` |

#### `payments` (14 columns)

| Column | Definition |
|---|---|
| `payment_id` | `SERIAL PRIMARY KEY` |
| `bill_id` | `INTEGER NOT NULL REFERENCES billing(bill_id) ON DELETE CASCADE` |
| `payment_date` | `TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP` |
| `amount` | `DECIMAL(10,2) NOT NULL` |
| `payment_method` | `VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'mobile_payment', 'insurance'))` |
| `payment_reference` | `VARCHAR(100)` |
| `card_type` | `VARCHAR(20)` |
| `bank_name` | `VARCHAR(100)` |
| `notes` | `TEXT` |
| `received_by` | `INTEGER NOT NULL REFERENCES users(user_id)` |
| `created_by` | `INTEGER REFERENCES users(user_id)` |
| `updated_by` | `INTEGER REFERENCES users(user_id)` |
| `created_at` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |
| `updated_at` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |

#### `billing_items` (10 columns)

| Column | Definition |
|---|---|
| `billing_item_id` | `SERIAL PRIMARY KEY` |
| `bill_id` | `INTEGER NOT NULL REFERENCES billing(bill_id) ON DELETE CASCADE` |
| `item_type` | `VARCHAR(20) CHECK (item_type IN ('consultation', 'service', 'inventory_item'))` |
| `item_id` | `INTEGER REFERENCES inventory(item_id)` |
| `item_name` | `VARCHAR(100) NOT NULL` |
| `quantity` | `INTEGER NOT NULL DEFAULT 1` |
| `unit_price` | `DECIMAL(10,2) NOT NULL` |
| `discount` | `DECIMAL(10,2) DEFAULT 0` |
| `total_price` | `DECIMAL(10,2) NOT NULL` |
| `created_at` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |

#### `daily_sales_summary` (20 columns)

| Column | Definition |
|---|---|
| `summary_id` | `SERIAL PRIMARY KEY` |
| `summary_date` | `DATE NOT NULL UNIQUE` |
| `total_bills` | `INTEGER DEFAULT 0` |
| `total_customers` | `INTEGER DEFAULT 0` |
| `new_customers` | `INTEGER DEFAULT 0` |
| `total_appointments` | `INTEGER DEFAULT 0` |
| `completed_appointments` | `INTEGER DEFAULT 0` |
| `cancelled_appointments` | `INTEGER DEFAULT 0` |
| `total_revenue` | `DECIMAL(10,2) DEFAULT 0` |
| `total_paid` | `DECIMAL(10,2) DEFAULT 0` |
| `total_pending` | `DECIMAL(10,2) DEFAULT 0` |
| `cash_payments` | `DECIMAL(10,2) DEFAULT 0` |
| `card_payments` | `DECIMAL(10,2) DEFAULT 0` |
| `bank_transfer_payments` | `DECIMAL(10,2) DEFAULT 0` |
| `services_revenue` | `DECIMAL(10,2) DEFAULT 0` |
| `products_revenue` | `DECIMAL(10,2) DEFAULT 0` |
| `medicines_revenue` | `DECIMAL(10,2) DEFAULT 0` |
| `accessories_revenue` | `DECIMAL(10,2) DEFAULT 0` |
| `created_at` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |
| `updated_at` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |

#### `system_settings` (9 columns)

| Column | Definition |
|---|---|
| `setting_id` | `SERIAL PRIMARY KEY` |
| `setting_key` | `VARCHAR(100) UNIQUE NOT NULL` |
| `setting_value` | `TEXT NOT NULL` |
| `setting_type` | `VARCHAR(20) CHECK (setting_type IN ('string', 'number', 'boolean', 'json'))` |
| `description` | `TEXT` |
| `is_editable` | `BOOLEAN DEFAULT true` |
| `created_at` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |
| `updated_at` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |
| `updated_by` | `INTEGER REFERENCES users(user_id)` |

#### `audit_logs` (10 columns)

| Column | Definition |
|---|---|
| `log_id` | `SERIAL PRIMARY KEY` |
| `user_id` | `INTEGER REFERENCES users(user_id)` |
| `action` | `VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, LOGOUT` |
| `table_name` | `VARCHAR(50) NOT NULL` |
| `record_id` | `VARCHAR(50)` |
| `old_values` | `JSONB` |
| `new_values` | `JSONB` |
| `ip_address` | `VARCHAR(50)` |
| `user_agent` | `TEXT` |
| `timestamp` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |

#### `inventory_transactions` (10 columns)

| Column | Definition |
|---|---|
| `transaction_id` | `SERIAL PRIMARY KEY` |
| `item_id` | `INTEGER NOT NULL REFERENCES inventory(item_id)` |
| `transaction_type` | `VARCHAR(20) NOT NULL CHECK (transaction_type IN ('dispensed','restocked','adjusted','expired','wasted'))` |
| `quantity` | `NUMERIC(10,2) NOT NULL` |
| `transaction_date` | `TIMESTAMP NOT NULL DEFAULT NOW()` |
| `reference_id` | `INTEGER` |
| `reference_type` | `VARCHAR(20) CHECK (reference_type IN ('billing','appointment','manual'))` |
| `notes` | `TEXT` |
| `created_by` | `INTEGER REFERENCES users(user_id)` |
| `created_at` | `TIMESTAMP DEFAULT NOW()` |

#### `model_metadata` (9 columns)

| Column | Definition |
|---|---|
| `id` | `SERIAL PRIMARY KEY` |
| `model_name` | `VARCHAR(50) NOT NULL UNIQUE` |
| `last_trained_at` | `TIMESTAMP` |
| `records_at_last_train` | `INTEGER DEFAULT 0` |
| `current_accuracy` | `NUMERIC(6,4)` |
| `cv_accuracy` | `NUMERIC(6,4)` |
| `model_version` | `INTEGER DEFAULT 1` |
| `notes` | `TEXT` |
| `updated_at` | `TIMESTAMP DEFAULT NOW()` |