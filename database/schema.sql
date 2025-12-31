-- VetCare Pro Database Schema
-- PostgreSQL Database for Pro Pet Animal Hospital
-- Enhanced schema supporting: UML diagrams, audit trails, inheritance patterns
-- Supports: Functional, Non-functional, Domain, Hidden & Future requirements

-- Drop tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS disease_cases CASCADE;
DROP TABLE IF EXISTS daily_sales_summary CASCADE;
DROP TABLE IF EXISTS billing_items CASCADE;
DROP TABLE IF EXISTS billing CASCADE;
DROP TABLE IF EXISTS vaccinations CASCADE;
DROP TABLE IF EXISTS medical_records CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS pets CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users Table (Staff: Admin, Receptionists, Veterinarians)
-- Supports: Authentication, Role-based access, Audit trail
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'veterinarian', 'receptionist')),
    specialization VARCHAR(100), -- For veterinarians (e.g., "Small Animals", "Surgery")
    license_number VARCHAR(50), -- Professional license for vets
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(user_id),
    updated_by INTEGER REFERENCES users(user_id)
);

-- Customers Table (Pet Owners)
-- Supports: Customer management, Contact tracking
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    alternate_phone VARCHAR(20),
    address TEXT,
    city VARCHAR(50),
    postal_code VARCHAR(10),
    nic VARCHAR(20),
    emergency_contact VARCHAR(100),
    emergency_phone VARCHAR(20),
    preferred_contact_method VARCHAR(20) CHECK (preferred_contact_method IN ('phone', 'email', 'sms')),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(user_id),
    updated_by INTEGER REFERENCES users(user_id)
);

-- Pets Table
-- Supports: Pet profiles, Medical history tracking, Species-specific data
CREATE TABLE pets (
    pet_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    pet_name VARCHAR(50) NOT NULL,
    species VARCHAR(50) NOT NULL,
    breed VARCHAR(50),
    gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Unknown')),
    date_of_birth DATE,
    color VARCHAR(50),
    weight_current DECIMAL(5,2), -- Current weight in kg
    microchip_number VARCHAR(50) UNIQUE,
    insurance_provider VARCHAR(100),
    insurance_policy_number VARCHAR(50),
    is_neutered BOOLEAN DEFAULT false,
    allergies TEXT,
    special_needs TEXT,
    is_active BOOLEAN DEFAULT true,
    deceased_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(user_id),
    updated_by INTEGER REFERENCES users(user_id)
);

-- Appointments Table
-- Supports: Scheduling, State transitions, Conflict prevention
CREATE TABLE appointments (
    appointment_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    pet_id INTEGER NOT NULL REFERENCES pets(pet_id) ON DELETE CASCADE,
    veterinarian_id INTEGER REFERENCES users(user_id),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    appointment_type VARCHAR(50) CHECK (appointment_type IN ('checkup', 'vaccination', 'surgery', 'emergency', 'followup', 'grooming')),
    reason VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled')),
    cancellation_reason TEXT,
    reminder_sent BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(user_id),
    updated_by INTEGER REFERENCES users(user_id),
    CONSTRAINT no_overlap UNIQUE (veterinarian_id, appointment_date, appointment_time)
);

-- Medical Records Table
-- Supports: Complete medical history, Clinical data, Prescriptions
CREATE TABLE medical_records (
    record_id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(pet_id) ON DELETE CASCADE,
    appointment_id INTEGER REFERENCES appointments(appointment_id),
    veterinarian_id INTEGER NOT NULL REFERENCES users(user_id),
    visit_date DATE NOT NULL,
    chief_complaint VARCHAR(255),
    symptoms TEXT,
    diagnosis TEXT NOT NULL,
    treatment TEXT,
    prescription TEXT,
    lab_tests TEXT,
    lab_results TEXT,
    weight DECIMAL(5,2),
    temperature DECIMAL(4,2),
    heart_rate INTEGER,
    respiratory_rate INTEGER,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(user_id),
    updated_by INTEGER REFERENCES users(user_id)
);

-- Vaccinations Table
-- Supports: Vaccination schedules, Reminder system, Batch tracking
CREATE TABLE vaccinations (
    vaccination_id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(pet_id) ON DELETE CASCADE,
    vaccine_name VARCHAR(100) NOT NULL,
    vaccine_type VARCHAR(50), -- e.g., "Core", "Non-core", "Required by law"
    vaccination_date DATE NOT NULL,
    next_due_date DATE,
    batch_number VARCHAR(50),
    manufacturer VARCHAR(100),
    expiry_date DATE,
    site_of_injection VARCHAR(50),
    adverse_reaction BOOLEAN DEFAULT false,
    reaction_details TEXT,
    administered_by INTEGER NOT NULL REFERENCES users(user_id),
    reminder_sent BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(user_id),
    updated_by INTEGER REFERENCES users(user_id)
);

-- Disease Cases Table (For ML: Disease/Pandemic Predictions)
-- Supports: Epidemiological tracking, Pattern analysis, ML training data
CREATE TABLE disease_cases (
    case_id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(pet_id) ON DELETE CASCADE,
    disease_name VARCHAR(100) NOT NULL,
    disease_category VARCHAR(50) CHECK (disease_category IN ('infectious', 'parasitic', 'chronic', 'genetic', 'nutritional', 'other')),
    diagnosis_date DATE NOT NULL,
    species VARCHAR(50),
    breed VARCHAR(50),
    age_at_diagnosis INTEGER,
    severity VARCHAR(20) CHECK (severity IN ('mild', 'moderate', 'severe', 'critical')),
    outcome VARCHAR(20) CHECK (outcome IN ('recovered', 'ongoing', 'deceased', 'chronic', 'unknown')),
    treatment_duration_days INTEGER,
    symptoms TEXT,
    region VARCHAR(50),
    season VARCHAR(20) CHECK (season IN ('spring', 'summer', 'autumn', 'winter')),
    is_contagious BOOLEAN DEFAULT false,
    transmission_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(user_id),
    updated_by INTEGER REFERENCES users(user_id)
);

-- Inventory Table (Medicines, Vaccines, Accessories, Pet Food, Supplies)
-- Supports: Stock management, Reorder alerts, Expiry tracking, Sales forecasting data
CREATE TABLE inventory (
    item_id SERIAL PRIMARY KEY,
    item_code VARCHAR(50) UNIQUE,
    item_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'medicine', 'vaccine', 'pet_food', 'pet_accessory', 
        'collar_leash', 'grooming', 'toy', 'supply', 'equipment'
    )),
    sub_category VARCHAR(50),
    quantity INTEGER NOT NULL DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'pcs',
    unit_cost DECIMAL(10,2) NOT NULL,
    selling_price DECIMAL(10,2) NOT NULL,
    markup_percentage DECIMAL(5,2),
    supplier VARCHAR(100),
    supplier_contact VARCHAR(50),
    reorder_level INTEGER DEFAULT 10,
    reorder_quantity INTEGER DEFAULT 50,
    expiry_date DATE,
    manufacturing_date DATE,
    batch_number VARCHAR(50),
    storage_location VARCHAR(50),
    requires_prescription BOOLEAN DEFAULT false,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    last_restock_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(user_id),
    updated_by INTEGER REFERENCES users(user_id)
);

-- Billing Table (Main invoice)
-- Supports: Payment tracking, Multiple payment methods, Financial reports
CREATE TABLE billing (
    bill_id SERIAL PRIMARY KEY,
    bill_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    appointment_id INTEGER REFERENCES appointments(appointment_id),
    bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal DECIMAL(10,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_percentage DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    balance_amount DECIMAL(10,2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'cancelled', 'refunded')),
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'cheque', 'other')),
    payment_reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL REFERENCES users(user_id),
    updated_by INTEGER REFERENCES users(user_id)
);

-- Billing Items Table (Individual items in each bill)
-- Supports: Itemized billing, Sales analysis, Inventory deduction
CREATE TABLE billing_items (
    billing_item_id SERIAL PRIMARY KEY,
    bill_id INTEGER NOT NULL REFERENCES billing(bill_id) ON DELETE CASCADE,
    item_type VARCHAR(20) CHECK (item_type IN ('service', 'product', 'medicine', 'vaccine', 'accessory', 'consultation')),
    item_id INTEGER REFERENCES inventory(item_id),
    item_name VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily Sales Summary Table (For faster report generation & ML: Sales Forecasting)
-- Supports: Pre-calculated metrics, Dashboard KPIs, Trend analysis
CREATE TABLE daily_sales_summary (
    summary_id SERIAL PRIMARY KEY,
    summary_date DATE NOT NULL UNIQUE,
    total_bills INTEGER DEFAULT 0,
    total_customers INTEGER DEFAULT 0,
    new_customers INTEGER DEFAULT 0,
    total_appointments INTEGER DEFAULT 0,
    completed_appointments INTEGER DEFAULT 0,
    cancelled_appointments INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    total_paid DECIMAL(10,2) DEFAULT 0,
    total_pending DECIMAL(10,2) DEFAULT 0,
    cash_payments DECIMAL(10,2) DEFAULT 0,
    card_payments DECIMAL(10,2) DEFAULT 0,
    bank_transfer_payments DECIMAL(10,2) DEFAULT 0,
    services_revenue DECIMAL(10,2) DEFAULT 0,
    products_revenue DECIMAL(10,2) DEFAULT 0,
    medicines_revenue DECIMAL(10,2) DEFAULT 0,
    accessories_revenue DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System Settings Table (For application configuration)
-- Supports: Configurable parameters, Domain rules, Business logic
CREATE TABLE system_settings (
    setting_id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(20) CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    is_editable BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(user_id)
);

-- Audit Logs Table (For tracking all system changes)
-- Supports: Audit trail, Compliance, Security monitoring, Hidden requirement
CREATE TABLE audit_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, LOGOUT
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for better query performance
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_active ON customers(is_active);
CREATE INDEX idx_pets_customer ON pets(customer_id);
CREATE INDEX idx_pets_species ON pets(species);
CREATE INDEX idx_pets_active ON pets(is_active);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_appointments_pet ON appointments(pet_id);
CREATE INDEX idx_appointments_vet ON appointments(veterinarian_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_medical_records_pet ON medical_records(pet_id);
CREATE INDEX idx_medical_records_date ON medical_records(visit_date);
CREATE INDEX idx_medical_records_vet ON medical_records(veterinarian_id);
CREATE INDEX idx_vaccinations_pet ON vaccinations(pet_id);
CREATE INDEX idx_vaccinations_due_date ON vaccinations(next_due_date);
CREATE INDEX idx_disease_cases_disease ON disease_cases(disease_name);
CREATE INDEX idx_disease_cases_date ON disease_cases(diagnosis_date);
CREATE INDEX idx_disease_cases_species ON disease_cases(species);
CREATE INDEX idx_disease_cases_category ON disease_cases(disease_category);
CREATE INDEX idx_inventory_category ON inventory(category);
CREATE INDEX idx_inventory_quantity ON inventory(quantity);
CREATE INDEX idx_inventory_code ON inventory(item_code);
CREATE INDEX idx_inventory_active ON inventory(is_active);
CREATE INDEX idx_billing_customer ON billing(customer_id);
CREATE INDEX idx_billing_date ON billing(bill_date);
CREATE INDEX idx_billing_number ON billing(bill_number);
CREATE INDEX idx_billing_status ON billing(payment_status);
CREATE INDEX idx_billing_items_bill ON billing_items(bill_id);
CREATE INDEX idx_daily_sales_date ON daily_sales_summary(summary_date);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pets_updated_at BEFORE UPDATE ON pets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medical_records_updated_at BEFORE UPDATE ON medical_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vaccinations_updated_at BEFORE UPDATE ON vaccinations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_disease_cases_updated_at BEFORE UPDATE ON disease_cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_billing_updated_at BEFORE UPDATE ON billing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_sales_updated_at BEFORE UPDATE ON daily_sales_summary FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();