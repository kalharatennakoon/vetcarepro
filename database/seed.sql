-- VetCare Pro - Sample Seed Data
-- Test data for Pro Pet Animal Hospital, Mawathagama, Kurunegala, Sri Lanka
-- All prices in LKR (Sri Lankan Rupees)

-- Insert Users (Staff)
-- Password for all: 'password123' (will be hashed properly in the application)
INSERT INTO users (username, password_hash, full_name, email, phone, role, specialization, license_number, is_active) VALUES
('admin', '$2a$10$YourHashedPasswordHere', 'Dr. Samanthi Jayawardena', 'samanthi@propet.lk', '+94712345001', 'admin', 'Veterinary Administration', 'SLVMC-2015-001', true),
('vet1', '$2a$10$YourHashedPasswordHere', 'Dr. Nimal Amarasinghe', 'nimal@propet.lk', '+94712345002', 'veterinarian', 'Small Animal Medicine', 'SLVMC-2018-045', true),
('vet2', '$2a$10$YourHashedPasswordHere', 'Dr. Ayesha Bandara', 'ayesha@propet.lk', '+94712345003', 'veterinarian', 'Surgery & Emergency Care', 'SLVMC-2019-078', true),
('receptionist1', '$2a$10$YourHashedPasswordHere', 'Kumari Dissanayake', 'kumari@propet.lk', '+94712345004', 'receptionist', NULL, NULL, true);

-- Insert Customers (Pet Owners from Kurunegala district)
INSERT INTO customers (first_name, last_name, email, phone, alternate_phone, address, city, nic, emergency_contact, emergency_phone, preferred_contact_method, created_by) VALUES
('Pradeep', 'Wickramasinghe', 'pradeep.w@gmail.com', '+94771234501', '+94372221001', 'No. 45, Kandy Road, Mawathagama', 'Mawathagama', '881234567V', 'Sanduni Wickramasinghe', '+94771234502', 'phone', 1),
('Nishantha', 'Rajapaksa', 'nishantha.r@gmail.com', '+94772234501', NULL, 'No. 12/A, Main Street, Pothuhera', 'Pothuhera', '901234567V', 'Chamari Rajapaksa', '+94772234502', 'phone', 1),
('Dilini', 'Fernando', 'dilini.f@yahoo.com', '+94773234501', '+94372221002', 'No. 78, Temple Road, Kurunegala', 'Kurunegala', '851234567V', 'Roshan Fernando', '+94773234502', 'email', 1),
('Kasun', 'Perera', 'kasun.p@hotmail.com', '+94774234501', NULL, 'No. 23, Lake View, Ibbagamuwa', 'Ibbagamuwa', '911234567V', 'Amaya Perera', '+94774234502', 'sms', 1),
('Samantha', 'Silva', 'samantha.s@gmail.com', '+94775234501', '+94372221003', 'No. 56, Park Avenue, Mawathagama', 'Mawathagama', '791234567V', 'Nuwan Silva', '+94775234502', 'phone', 1),
('Chandani', 'Gunasekara', 'chandani.g@gmail.com', '+94776234501', NULL, 'No. 89, Colombo Road, Kurunegala', 'Kurunegala', '921234567V', 'Sunil Gunasekara', '+94776234502', 'phone', 1),
('Ruwan', 'Jayasuriya', 'ruwan.j@yahoo.com', '+94777234501', '+94372221004', 'No. 34, School Lane, Galgamuwa', 'Galgamuwa', '871234567V', 'Nimali Jayasuriya', '+94777234502', 'email', 1),
('Thilini', 'Weerasinghe', 'thilini.w@gmail.com', '+94778234501', NULL, 'No. 67, Hospital Road, Wariyapola', 'Wariyapola', '951234567V', 'Ajith Weerasinghe', '+94778234502', 'phone', 1);

-- Insert Pets (Common Sri Lankan pet names and breeds)
INSERT INTO pets (customer_id, pet_name, species, breed, gender, date_of_birth, color, weight_current, microchip_number, is_neutered, allergies, special_needs, created_by) VALUES
(1, 'Bruno', 'Dog', 'Labrador Retriever', 'Male', '2020-05-15', 'Golden', 28.5, 'LK001234567890', true, NULL, NULL, 1),
(1, 'Lassie', 'Dog', 'Mixed Breed', 'Female', '2021-08-20', 'Brown & White', 12.3, 'LK001234567891', false, NULL, NULL, 1),
(2, 'Max', 'Dog', 'German Shepherd', 'Male', '2019-03-10', 'Black & Tan', 35.0, 'LK001234567892', true, 'Penicillin', NULL, 1),
(3, 'Pusa', 'Cat', 'Persian', 'Male', '2021-11-05', 'White', 4.5, NULL, true, NULL, NULL, 1),
(3, 'Malu', 'Cat', 'Mixed Breed', 'Female', '2022-01-15', 'Grey', 3.8, NULL, false, NULL, NULL, 1),
(4, 'Charlie', 'Dog', 'Beagle', 'Male', '2020-07-22', 'Tricolor', 12.0, 'LK001234567893', false, NULL, NULL, 1),
(5, 'Putha', 'Rabbit', 'Dutch Rabbit', 'Female', '2022-09-10', 'Black & White', 1.8, NULL, false, NULL, NULL, 1),
(6, 'Rocky', 'Dog', 'Rottweiler', 'Male', '2019-12-05', 'Black & Brown', 42.0, 'LK001234567894', true, NULL, NULL, 1),
(7, 'Sudu', 'Cat', 'Local Breed', 'Female', '2023-03-20', 'White', 3.2, NULL, true, NULL, NULL, 1),
(8, 'Tommy', 'Dog', 'Pomeranian', 'Male', '2022-06-15', 'Orange', 3.5, 'LK001234567895', false, NULL, 'Sensitive stomach', 1);

-- Insert Appointments
INSERT INTO appointments (customer_id, pet_id, veterinarian_id, appointment_date, appointment_time, duration_minutes, appointment_type, reason, status, created_by) VALUES
(1, 1, 2, '2025-01-05', '09:00:00', 30, 'checkup', 'Annual checkup and vaccination', 'scheduled', 4),
(2, 3, 2, '2025-01-05', '10:00:00', 45, 'checkup', 'Limping on front leg', 'scheduled', 4),
(3, 4, 3, '2025-01-05', '14:00:00', 30, 'vaccination', 'Rabies vaccination due', 'scheduled', 4),
(4, 6, 2, '2025-01-06', '09:30:00', 30, 'checkup', 'Ear infection follow-up', 'scheduled', 4),
(6, 8, 3, '2025-01-06', '11:00:00', 60, 'surgery', 'Neutering procedure', 'scheduled', 4),
(1, 1, 2, '2024-12-15', '10:00:00', 30, 'checkup', 'Regular checkup', 'completed', 4),
(2, 3, 2, '2024-12-20', '11:00:00', 30, 'vaccination', 'Rabies vaccine', 'completed', 4),
(5, 7, 2, '2024-12-28', '15:00:00', 30, 'checkup', 'First visit consultation', 'completed', 4),
(7, 9, 3, '2024-11-10', '10:00:00', 30, 'vaccination', 'Feline vaccines', 'completed', 4);

-- Insert Medical Records
INSERT INTO medical_records (pet_id, appointment_id, veterinarian_id, visit_date, chief_complaint, symptoms, diagnosis, treatment, prescription, weight, temperature, heart_rate, respiratory_rate, notes, created_by) VALUES
(1, 6, 2, '2024-12-15', 'Regular checkup', 'None', 'Healthy, no issues found', 'Continue regular diet and exercise', NULL, 28.0, 38.5, 95, 22, 'Pet is in excellent condition', 2),
(3, 7, 2, '2024-12-20', 'Vaccination', 'None', 'Healthy - Vaccination administered', 'Rabies vaccine administered, monitor for any reactions', NULL, 34.5, 38.3, 88, 20, 'No adverse reactions observed', 2),
(7, 8, 2, '2024-12-28', 'First visit', 'None', 'Healthy rabbit, minor dental issue noted', 'Dietary adjustments recommended', 'Vitamin C supplement - 50mg daily', 1.8, 38.9, NULL, NULL, 'Owner advised about proper diet', 2),
(9, 9, 3, '2024-11-10', 'Vaccination', 'None', 'Healthy - FVRCP vaccine administered', 'Monitor for 24 hours post-vaccination', NULL, 3.1, 38.4, NULL, NULL, 'Cat handled well during procedure', 3);

-- Insert Vaccinations
INSERT INTO vaccinations (pet_id, vaccine_name, vaccine_type, vaccination_date, next_due_date, batch_number, manufacturer, administered_by, notes, created_by) VALUES
(1, 'DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza)', 'Core', '2024-06-15', '2025-06-15', 'ZTS-DHPP-2024-001', 'Zoetis', 2, NULL, 2),
(1, 'Rabies', 'Core', '2024-06-15', '2027-06-15', 'ZTS-RAB-2024-002', 'Zoetis', 2, NULL, 2),
(3, 'Rabies', 'Core', '2024-12-20', '2027-12-20', 'ZTS-RAB-2024-058', 'Zoetis', 2, NULL, 2),
(4, 'FVRCP (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia)', 'Core', '2022-02-05', '2025-02-05', 'ZTS-FVRCP-2022-015', 'Zoetis', 2, NULL, 2),
(9, 'FVRCP', 'Core', '2024-11-10', '2025-11-10', 'ZTS-FVRCP-2024-089', 'Zoetis', 3, NULL, 3),
(6, 'DHPP', 'Core', '2023-08-22', '2024-08-22', 'ZTS-DHPP-2023-067', 'Zoetis', 2, 'Due for renewal', 2);

-- Insert Disease Cases (for ML training - common diseases in Sri Lanka)
INSERT INTO disease_cases (pet_id, disease_name, disease_category, diagnosis_date, species, breed, age_at_diagnosis, severity, outcome, treatment_duration_days, symptoms, region, season, is_contagious, transmission_method, notes, created_by) VALUES
(3, 'Canine Parvovirus', 'infectious', '2024-08-15', 'Dog', 'German Shepherd', 5, 'severe', 'recovered', 14, 'Vomiting, bloody diarrhea, lethargy, dehydration', 'Kurunegala', 'summer', true, 'Fecal-oral', 'Intensive care required, IV fluids administered', 2),
(4, 'Feline Upper Respiratory Infection', 'infectious', '2024-11-10', 'Cat', 'Persian', 3, 'moderate', 'recovered', 10, 'Sneezing, nasal discharge, fever, loss of appetite', 'Kurunegala', 'autumn', true, 'Airborne', 'Common during monsoon season', 3),
(5, 'Ringworm', 'parasitic', '2024-07-20', 'Cat', 'Mixed Breed', 2, 'mild', 'recovered', 21, 'Circular hair loss patches, itching', 'Kurunegala', 'summer', true, 'Direct contact', 'Fungal infection, treated with topical antifungal', 2),
(8, 'Tick Fever (Ehrlichiosis)', 'parasitic', '2024-09-05', 'Dog', 'Rottweiler', 4, 'moderate', 'recovered', 21, 'High fever, lethargy, loss of appetite, bleeding tendencies', 'Kurunegala', 'summer', false, 'Tick bite', 'Common in Sri Lankan climate, doxycycline treatment', 3);

-- Insert Inventory Items (Prices in LKR - Sri Lankan Rupees)
INSERT INTO inventory (item_code, item_name, category, sub_category, quantity, unit, unit_cost, selling_price, supplier, supplier_contact, reorder_level, reorder_quantity, requires_prescription, description, created_by) VALUES
('MED-001', 'Amoxicillin 250mg', 'medicine', 'Antibiotic', 150, 'tablets', 25.00, 50.00, 'MediVet Lanka (Pvt) Ltd', '+94112345001', 50, 200, true, 'Broad-spectrum antibiotic', 1),
('MED-002', 'Metronidazole 200mg', 'medicine', 'Antibiotic', 100, 'tablets', 18.00, 40.00, 'MediVet Lanka (Pvt) Ltd', '+94112345001', 30, 150, true, 'Anti-parasitic antibiotic', 1),
('MED-003', 'Doxycycline 100mg', 'medicine', 'Antibiotic', 80, 'tablets', 35.00, 70.00, 'VetPharm Lanka', '+94112345002', 30, 100, true, 'For tick fever treatment', 1),
('MED-004', 'Ivermectin Injection', 'medicine', 'Anti-parasitic', 50, 'vials', 450.00, 800.00, 'VetPharm Lanka', '+94112345002', 20, 60, true, 'Deworming injection', 1),
('VAC-001', 'Nobivac Rabies Vaccine', 'vaccine', 'Core Vaccine', 45, 'vials', 4500.00, 6500.00, 'Zoetis Lanka (Pvt) Ltd', '+94112345003', 20, 50, true, 'Rabies protection', 1),
('VAC-002', 'Nobivac DHPP Vaccine', 'vaccine', 'Core Vaccine', 38, 'vials', 5500.00, 7500.00, 'Zoetis Lanka (Pvt) Ltd', '+94112345003', 15, 40, true, '4-in-1 dog vaccine', 1),
('VAC-003', 'Nobivac FVRCP Vaccine', 'vaccine', 'Core Vaccine', 32, 'vials', 4800.00, 6800.00, 'Zoetis Lanka (Pvt) Ltd', '+94112345003', 15, 40, true, '3-in-1 cat vaccine', 1),
('FOOD-001', 'Pedigree Adult Dog Food 10kg', 'pet_food', 'Dog Food', 25, 'bags', 8500.00, 12500.00, 'Pet Care Lanka', '+94112345004', 10, 30, false, 'Complete nutrition for adult dogs', 1),
('FOOD-002', 'Royal Canin Kitten Food 2kg', 'pet_food', 'Cat Food', 30, 'bags', 5500.00, 8500.00, 'Pet Care Lanka', '+94112345004', 10, 30, false, 'Specially formulated for kittens', 1),
('FOOD-003', 'Pedigree Puppy Food 3kg', 'pet_food', 'Dog Food', 20, 'bags', 3800.00, 5800.00, 'Pet Care Lanka', '+94112345004', 8, 25, false, 'Growth formula for puppies', 1),
('ACC-001', 'Dog Collar - Medium', 'collar_leash', 'Collar', 45, 'pcs', 350.00, 650.00, 'Pet World Colombo', '+94112345005', 15, 50, false, 'Adjustable nylon collar', 1),
('ACC-002', 'Dog Leash - 1.5m', 'collar_leash', 'Leash', 38, 'pcs', 450.00, 850.00, 'Pet World Colombo', '+94112345005', 15, 40, false, 'Strong nylon leash', 1),
('ACC-003', 'Cat Litter 5kg', 'supply', 'Cat Care', 28, 'bags', 850.00, 1500.00, 'Pet Care Lanka', '+94112345004', 10, 30, false, 'Clumping cat litter', 1),
('TOY-001', 'Dog Chew Toy - Rubber Bone', 'toy', 'Dog Toy', 60, 'pcs', 220.00, 450.00, 'Pet World Colombo', '+94112345005', 20, 60, false, 'Durable chew toy', 1),
('TOY-002', 'Cat Feather Toy', 'toy', 'Cat Toy', 50, 'pcs', 180.00, 350.00, 'Pet World Colombo', '+94112345005', 15, 50, false, 'Interactive cat toy', 1),
('GROOM-001', 'Pet Shampoo - Medicated 500ml', 'grooming', 'Shampoo', 35, 'bottles', 650.00, 1200.00, 'VetCare Products Lanka', '+94112345006', 10, 30, false, 'Anti-fungal shampoo', 1),
('GROOM-002', 'Dog Brush - Slicker', 'grooming', 'Grooming Tool', 25, 'pcs', 450.00, 850.00, 'Pet World Colombo', '+94112345005', 8, 25, false, 'Professional grooming brush', 1),
('SUPP-001', 'Disposable Gloves - Box of 100', 'supply', 'Medical Supply', 20, 'boxes', 1200.00, 1800.00, 'Medical Supplies Lanka', '+94112345007', 5, 20, false, 'Latex examination gloves', 1),
('SUPP-002', 'Syringes 5ml - Pack of 100', 'supply', 'Medical Supply', 15, 'packs', 2500.00, 3500.00, 'Medical Supplies Lanka', '+94112345007', 5, 15, false, 'Sterile disposable syringes', 1),
('SUPP-003', 'Cotton Wool 500g', 'supply', 'Medical Supply', 30, 'packs', 280.00, 450.00, 'Medical Supplies Lanka', '+94112345007', 10, 30, false, 'Medical grade cotton', 1);

-- Insert Sample Billing Records (Amounts in LKR)
INSERT INTO billing (bill_number, customer_id, appointment_id, bill_date, subtotal, discount_amount, tax_amount, total_amount, paid_amount, balance_amount, payment_status, payment_method, notes, created_by) VALUES
('INV-2024-0001', 1, 6, '2024-12-15', 8500.00, 0, 0, 8500.00, 8500.00, 0, 'paid', 'cash', NULL, 4),
('INV-2024-0002', 2, 7, '2024-12-20', 12200.00, 0, 0, 12200.00, 12200.00, 0, 'paid', 'card', NULL, 4),
('INV-2024-0003', 5, 8, '2024-12-28', 5800.00, 500.00, 0, 5300.00, 5300.00, 0, 'paid', 'cash', 'First visit discount applied', 4),
('INV-2024-0004', 7, 9, '2024-11-10', 15800.00, 0, 0, 15800.00, 10000.00, 5800.00, 'partial', 'cash', 'Balance to be paid on next visit', 4),
('INV-2025-0001', 3, NULL, '2025-01-02', 12500.00, 0, 0, 12500.00, 12500.00, 0, 'paid', 'bank_transfer', 'Dog food purchase', 4);

-- Insert Billing Items
INSERT INTO billing_items (bill_id, item_type, item_id, item_name, quantity, unit_price, discount, total_price) VALUES
(1, 'consultation', NULL, 'Routine Checkup - Dr. Nimal', 1, 3500.00, 0, 3500.00),
(1, 'service', NULL, 'General Physical Examination', 1, 2500.00, 0, 2500.00),
(1, 'product', 14, 'Dog Chew Toy - Rubber Bone', 1, 450.00, 0, 450.00),
(1, 'medicine', 1, 'Amoxicillin 250mg', 20, 50.00, 0, 1000.00),
(1, 'product', 16, 'Pet Shampoo - Medicated 500ml', 1, 1200.00, 150.00, 1050.00),
(2, 'consultation', NULL, 'Routine Checkup - Dr. Nimal', 1, 3500.00, 0, 3500.00),
(2, 'vaccine', 5, 'Nobivac Rabies Vaccine', 1, 6500.00, 0, 6500.00),
(2, 'service', NULL, 'Vaccination Administration Fee', 1, 1500.00, 0, 1500.00),
(2, 'medicine', 1, 'Amoxicillin 250mg', 10, 50.00, 0, 500.00),
(3, 'consultation', NULL, 'First Visit Consultation', 1, 3000.00, 500.00, 2500.00),
(3, 'product', 9, 'Royal Canin Kitten Food 2kg', 1, 8500.00, 0, 8500.00),
(3, 'product', 13, 'Cat Litter 5kg', 2, 1500.00, 0, 3000.00),
(4, 'consultation', NULL, 'Routine Checkup - Dr. Ayesha', 1, 3500.00, 0, 3500.00),
(4, 'vaccine', 7, 'Nobivac FVRCP Vaccine', 1, 6800.00, 0, 6800.00),
(4, 'service', NULL, 'Vaccination Administration Fee', 1, 1500.00, 0, 1500.00),
(4, 'product', 9, 'Royal Canin Kitten Food 2kg', 1, 8500.00, 0, 8500.00),
(5, 'product', 8, 'Pedigree Adult Dog Food 10kg', 1, 12500.00, 0, 12500.00);

-- Insert Daily Sales Summary (for reports and ML - Amounts in LKR)
INSERT INTO daily_sales_summary (summary_date, total_bills, total_customers, new_customers, total_appointments, completed_appointments, total_revenue, total_paid, total_pending, cash_payments, card_payments, bank_transfer_payments, services_revenue, products_revenue, medicines_revenue, accessories_revenue) VALUES
('2024-11-10', 1, 1, 0, 1, 1, 15800.00, 10000.00, 5800.00, 10000.00, 0, 0, 11800.00, 8500.00, 0, 0),
('2024-12-15', 1, 1, 0, 1, 1, 8500.00, 8500.00, 0, 8500.00, 0, 0, 6000.00, 1450.00, 1000.00, 0),
('2024-12-20', 1, 1, 0, 1, 1, 12200.00, 12200.00, 0, 0, 12200.00, 0, 11500.00, 0, 500.00, 0),
('2024-12-28', 1, 1, 1, 1, 1, 5300.00, 5300.00, 0, 5300.00, 0, 0, 2500.00, 11500.00, 0, 0),
('2025-01-02', 1, 1, 0, 0, 0, 12500.00, 12500.00, 0, 0, 0, 12500.00, 0, 12500.00, 0, 0);

-- Insert System Settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_editable) VALUES
('clinic_name', 'Pro Pet Animal Hospital', 'string', 'Clinic name', true),
('clinic_address', 'Main Street, Mawathagama, Kurunegala District, North Western Province', 'string', 'Clinic full address', true),
('clinic_phone', '+94372222333', 'string', 'Clinic primary contact number', true),
('clinic_mobile', '+94712220001', 'string', 'Clinic mobile number', true),
('clinic_email', 'info@propet.lk', 'string', 'Clinic email address', true),
('currency', 'LKR', 'string', 'Currency code', false),
('currency_symbol', 'Rs.', 'string', 'Currency symbol', false),
('appointment_duration_default', '30', 'number', 'Default appointment duration in minutes', true),
('consultation_fee_default', '3500', 'number', 'Default consultation fee in LKR', true),
('tax_percentage', '0', 'number', 'Tax percentage (currently 0% for veterinary services)', true),
('low_stock_alert_threshold', '20', 'number', 'Alert when stock falls below this quantity', true),
('expiry_alert_days', '30', 'number', 'Alert X days before item expiry', true),
('business_hours_start', '08:00', 'string', 'Clinic opening time', true),
('business_hours_end', '18:00', 'string', 'Clinic closing time', true),
('working_days', 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday', 'string', 'Comma-separated working days', true);

-- Success message
SELECT 'Seed data inserted successfully! Pro Pet Animal Hospital data loaded.' AS message,
       'All amounts are in Sri Lankan Rupees (LKR)' AS note;