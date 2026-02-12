-- VetCare Pro - Demo Data for February 14, 2026 Presentation
-- This script adds additional customers, pets, and appointments for the demo
-- Execute this script after the main seed.sql file

-- Delete existing demo data if it exists (from previous runs)
-- Must delete medical records first due to foreign key constraints
DELETE FROM medical_records WHERE appointment_id IN (SELECT appointment_id FROM appointments WHERE appointment_id LIKE 'APPT-2026-%');
DELETE FROM billing WHERE appointment_id IN (SELECT appointment_id FROM appointments WHERE appointment_id LIKE 'APPT-2026-%');
DELETE FROM appointments WHERE appointment_id LIKE 'APPT-2026-%';
DELETE FROM pets WHERE pet_id IN ('PET-0053', 'PET-0054', 'PET-0055', 'PET-0056', 'PET-0057', 'PET-0058', 'PET-0059', 'PET-0060', 'PET-0061', 'PET-0062');
DELETE FROM customers WHERE customer_id IN ('CUST-0036', 'CUST-0037', 'CUST-0038', 'CUST-0039', 'CUST-0040', 'CUST-0041', 'CUST-0042', 'CUST-0043', 'CUST-0044', 'CUST-0045');

-- ============================================
-- Insert 10 New Customers
-- ============================================
INSERT INTO customers (customer_id, first_name, last_name, email, phone, alternate_phone, address, city, nic, emergency_contact, emergency_phone, preferred_contact_method, created_by) VALUES
('CUST-0036', 'Ravindra', 'Pathirana', 'ravindra.p@gmail.com', '+94716234501', NULL, 'No. 234/C, Hospital Junction, Kuliyapitiya', 'Kuliyapitiya', '893456789V', 'Menaka Pathirana', '+94716234502', 'phone', 1),
('CUST-0037', 'Sandya', 'Wickrama', 'sandya.w@yahoo.com', '+94717234501', '+94372221019', 'No. 78, Market Street, Ridigama', 'Ridigama', '905678901V', 'Lasantha Wickrama', '+94717234502', 'email', 1),
('CUST-0038', 'Niroshan', 'De Silva', 'niroshan.ds@hotmail.com', '+94718234501', NULL, 'No. 156, New Road, Bingiriya', 'Bingiriya', '848765432V', 'Sachini De Silva', '+94718234502', 'phone', 1),
('CUST-0039', 'Rashmi', 'Jayakody', 'rashmi.j@gmail.com', '+94719234501', '+94372221020', 'No. 45/2, Station Road, Nikaweratiya', 'Nikaweratiya', '976789012V', 'Pradeep Jayakody', '+94719234502', 'sms', 1),
('CUST-0040', 'Chamara', 'Lakmal', 'chamara.l@yahoo.com', '+94720234501', NULL, 'No. 89, Temple Road, Alawwa', 'Alawwa', '825678901V', 'Dilrukshi Lakmal', '+94720234502', 'phone', 1),
('CUST-0041', 'Malini', 'Rajapaksa', 'malini.r@gmail.com', '+94721234501', '+94372221021', 'No. 67/4, Lake View, Kurunegala', 'Kurunegala', '918765432V', 'Nalin Rajapaksa', '+94721234502', 'email', 1),
('CUST-0042', 'Dinesh', 'Ranathunga', 'dinesh.rt@hotmail.com', '+94722234501', NULL, 'No. 123, Main Street, Wariyapola', 'Wariyapola', '863456789V', 'Nimali Ranathunga', '+94722234502', 'phone', 1),
('CUST-0043', 'Priyanga', 'Amarasiri', 'priyanga.a@gmail.com', '+94723234501', '+94372221022', 'No. 198/A, Church Road, Pannala', 'Pannala', '945678901V', 'Sumithra Amarasiri', '+94723234502', 'sms', 1),
('CUST-0044', 'Shanthi', 'Gunawardena', 'shanthi.g@yahoo.com', '+94724234501', NULL, 'No. 56/3, Park Avenue, Galgamuwa', 'Galgamuwa', '878765432V', 'Aruna Gunawardena', '+94724234502', 'phone', 1),
('CUST-0045', 'Rajeev', 'Wijeratne', 'rajeev.w@gmail.com', '+94725234501', '+94372221023', 'No. 234, Colombo Road, Kurunegala', 'Kurunegala', '966789012V', 'Nimashi Wijeratne', '+94725234502', 'email', 1);

-- ============================================
-- Insert 10 New Pets
-- ============================================
INSERT INTO pets (pet_id, customer_id, pet_name, species, breed, gender, date_of_birth, color, weight_current, is_neutered, allergies, special_needs, is_active, deceased_date, created_by) VALUES
-- New customers' pets
('PET-0053', 'CUST-0036', 'Buddy', 'Dog', 'Golden Retriever', 'male', '2021-03-15', 'Golden', 29.5, false, NULL, NULL, true, NULL, 1),
('PET-0054', 'CUST-0037', 'Muffin', 'Cat', 'Persian', 'female', '2022-06-20', 'White & Orange', 4.8, true, NULL, NULL, true, NULL, 1),
('PET-0055', 'CUST-0038', 'Rex', 'Dog', 'German Shepherd', 'male', '2020-11-08', 'Black & Tan', 36.0, true, NULL, NULL, true, NULL, 1),
('PET-0056', 'CUST-0039', 'Coco', 'Dog', 'Cocker Spaniel', 'female', '2023-01-25', 'Brown & White', 12.5, false, NULL, NULL, true, NULL, 1),
('PET-0057', 'CUST-0040', 'Whiskers', 'Cat', 'Siamese', 'male', '2021-09-12', 'Seal Point', 4.5, true, NULL, NULL, true, NULL, 1),
-- Pets for existing customers
('PET-0058', 'CUST-0001', 'Luna', 'Cat', 'British Shorthair', 'female', '2023-02-14', 'Grey', 4.2, false, NULL, NULL, true, NULL, 1),
('PET-0059', 'CUST-0005', 'Rocky', 'Dog', 'Beagle', 'male', '2022-04-18', 'Tricolor', 11.8, false, NULL, NULL, true, NULL, 1),
('PET-0060', 'CUST-0010', 'Bella', 'Dog', 'Poodle', 'female', '2021-12-05', 'Apricot', 8.5, true, NULL, NULL, true, NULL, 1),
('PET-0061', 'CUST-0015', 'Milo', 'Cat', 'Maine Coon', 'male', '2022-08-30', 'Brown Tabby', 6.8, true, NULL, NULL, true, NULL, 1),
('PET-0062', 'CUST-0022', 'Max', 'Dog', 'Labrador Retriever', 'male', '2020-10-22', 'Black', 31.0, true, NULL, NULL, true, NULL, 1);

-- ============================================
-- Appointments for February 13-17, 2026
-- ============================================
-- February 13, 2026 (Thursday) - 10 appointments
INSERT INTO appointments (appointment_id, customer_id, pet_id, veterinarian_id, appointment_date, appointment_time, duration_minutes, appointment_type, reason, status, created_by) VALUES
('APPT-2026-0056', 'CUST-0036', 'PET-0053', 1, '2026-02-13', '09:00:00', 30, 'checkup', 'Annual wellness examination', 'scheduled', 4),
('APPT-2026-0057', 'CUST-0037', 'PET-0054', 2, '2026-02-13', '09:30:00', 30, 'checkup', 'Skin condition follow-up', 'scheduled', 4),
('APPT-2026-0058', 'CUST-0005', 'PET-0059', 3, '2026-02-13', '10:00:00', 30, 'vaccination', 'Puppy vaccination series', 'scheduled', 5),
('APPT-2026-0059', 'CUST-0001', 'PET-0001', 1, '2026-02-13', '10:30:00', 45, 'checkup', 'Arthritis follow-up and weight check', 'scheduled', 5),
('APPT-2026-0060', 'CUST-0038', 'PET-0055', 2, '2026-02-13', '11:00:00', 30, 'checkup', 'First visit - new patient', 'scheduled', 4),
('APPT-2026-0061', 'CUST-0010', 'PET-0060', 3, '2026-02-13', '14:00:00', 30, 'checkup', 'Dental examination', 'scheduled', 5),
('APPT-2026-0062', 'CUST-0015', 'PET-0061', 1, '2026-02-13', '14:30:00', 30, 'checkup', 'Routine wellness check', 'scheduled', 4),
('APPT-2026-0063', 'CUST-0039', 'PET-0056', 2, '2026-02-13', '15:00:00', 30, 'vaccination', 'First puppy vaccines', 'scheduled', 5),
('APPT-2026-0064', 'CUST-0003', 'PET-0004', 3, '2026-02-13', '15:30:00', 30, 'checkup', 'Eye examination', 'scheduled', 4),
('APPT-2026-0065', 'CUST-0022', 'PET-0062', 1, '2026-02-13', '16:00:00', 45, 'checkup', 'Senior dog health assessment', 'scheduled', 5),

-- February 14, 2026 (Friday) - Demo Day! 12 appointments
('APPT-2026-0066', 'CUST-0040', 'PET-0057', 2, '2026-02-14', '09:00:00', 30, 'checkup', 'Annual checkup and vaccination', 'scheduled', 4),
('APPT-2026-0067', 'CUST-0001', 'PET-0058', 1, '2026-02-14', '09:30:00', 30, 'checkup', 'New kitten first visit', 'scheduled', 5),
('APPT-2026-0068', 'CUST-0041', 'PET-0053', 3, '2026-02-14', '10:00:00', 30, 'vaccination', 'Annual booster shots', 'scheduled', 4),
('APPT-2026-0069', 'CUST-0006', 'PET-0009', 1, '2026-02-14', '10:30:00', 45, 'surgery', 'Pre-surgical consultation for hip surgery', 'scheduled', 5),
('APPT-2026-0070', 'CUST-0042', 'PET-0055', 2, '2026-02-14', '11:00:00', 30, 'checkup', 'Routine examination', 'scheduled', 4),
('APPT-2026-0071', 'CUST-0009', 'PET-0012', 3, '2026-02-14', '11:30:00', 30, 'checkup', 'Behavioral follow-up', 'scheduled', 5),
('APPT-2026-0072', 'CUST-0043', 'PET-0056', 1, '2026-02-14', '14:00:00', 30, 'vaccination', 'Second puppy vaccine', 'scheduled', 4),
('APPT-2026-0073', 'CUST-0012', 'PET-0016', 2, '2026-02-14', '14:30:00', 30, 'checkup', 'Weight management follow-up', 'scheduled', 5),
('APPT-2026-0074', 'CUST-0044', 'PET-0054', 3, '2026-02-14', '15:00:00', 30, 'consultation', 'Grooming and nail trim', 'scheduled', 4),
('APPT-2026-0075', 'CUST-0020', 'PET-0029', 1, '2026-02-14', '15:30:00', 30, 'checkup', 'Annual wellness exam', 'scheduled', 5),
('APPT-2026-0076', 'CUST-0045', 'PET-0057', 2, '2026-02-14', '16:00:00', 30, 'checkup', 'Vaccination and health check', 'scheduled', 4),
('APPT-2026-0077', 'CUST-0015', 'PET-0022', 3, '2026-02-14', '16:30:00', 30, 'checkup', 'Post-neutering annual follow-up', 'scheduled', 5),

-- February 15, 2026 (Saturday) - Weekend appointments, 8 appointments
('APPT-2026-0078', 'CUST-0002', 'PET-0003', 1, '2026-02-15', '09:00:00', 45, 'checkup', 'Arthritis management review', 'scheduled', 4),
('APPT-2026-0079', 'CUST-0013', 'PET-0018', 2, '2026-02-15', '09:30:00', 30, 'checkup', 'Routine health check', 'scheduled', 5),
('APPT-2026-0080', 'CUST-0005', 'PET-0007', 3, '2026-02-15', '10:00:00', 30, 'checkup', 'Rabbit wellness exam', 'scheduled', 4),
('APPT-2026-0081', 'CUST-0036', 'PET-0053', 1, '2026-02-15', '10:30:00', 30, 'vaccination', 'Rabies and DHPP boosters', 'scheduled', 5),
('APPT-2026-0082', 'CUST-0018', 'PET-0026', 2, '2026-02-15', '11:00:00', 30, 'checkup', 'Puppy progress check', 'scheduled', 4),
('APPT-2026-0083', 'CUST-0025', 'PET-0038', 3, '2026-02-15', '14:00:00', 30, 'checkup', 'Routine wellness visit', 'scheduled', 5),
('APPT-2026-0084', 'CUST-0037', 'PET-0054', 1, '2026-02-15', '14:30:00', 45, 'surgery', 'Spaying surgery', 'scheduled', 4),
('APPT-2026-0085', 'CUST-0027', 'PET-0041', 2, '2026-02-15', '15:00:00', 30, 'checkup', 'Breathing assessment follow-up', 'scheduled', 5),

-- February 16, 2026 (Sunday) - Limited weekend schedule, 6 appointments
('APPT-2026-0086', 'CUST-0004', 'PET-0006', 1, '2026-02-16', '09:00:00', 30, 'checkup', 'Ear infection follow-up', 'scheduled', 4),
('APPT-2026-0087', 'CUST-0039', 'PET-0056', 2, '2026-02-16', '09:30:00', 30, 'vaccination', 'Third puppy vaccine series', 'scheduled', 5),
('APPT-2026-0088', 'CUST-0008', 'PET-0011', 3, '2026-02-16', '10:00:00', 30, 'checkup', 'Weight loss progress check', 'scheduled', 4),
('APPT-2026-0089', 'CUST-0040', 'PET-0057', 1, '2026-02-16', '10:30:00', 30, 'checkup', 'Post-vaccination follow-up', 'scheduled', 5),
('APPT-2026-0090', 'CUST-0033', 'PET-0049', 2, '2026-02-16', '11:00:00', 30, 'checkup', 'Herding dog wellness check', 'scheduled', 4),
('APPT-2026-0091', 'CUST-0041', 'PET-0053', 3, '2026-02-16', '14:00:00', 30, 'checkup', 'Post-vaccination check', 'scheduled', 5),

-- February 17, 2026 (Monday) - Regular schedule, 10 appointments
('APPT-2026-0092', 'CUST-0007', 'PET-0010', 1, '2026-02-17', '09:00:00', 30, 'checkup', 'Annual health examination', 'scheduled', 4),
('APPT-2026-0093', 'CUST-0042', 'PET-0055', 2, '2026-02-17', '09:30:00', 30, 'vaccination', 'Annual vaccines', 'scheduled', 5),
('APPT-2026-0094', 'CUST-0014', 'PET-0021', 3, '2026-02-17', '10:00:00', 30, 'checkup', 'Eye condition follow-up', 'scheduled', 4),
('APPT-2026-0095', 'CUST-0043', 'PET-0056', 1, '2026-02-17', '10:30:00', 30, 'vaccination', 'Final puppy vaccine', 'scheduled', 5),
('APPT-2026-0096', 'CUST-0022', 'PET-0062', 2, '2026-02-17', '11:00:00', 45, 'checkup', 'Senior dog comprehensive exam', 'scheduled', 4),
('APPT-2026-0097', 'CUST-0044', 'PET-0054', 3, '2026-02-17', '14:00:00', 30, 'checkup', 'Grooming follow-up', 'scheduled', 5),
('APPT-2026-0098', 'CUST-0024', 'PET-0036', 1, '2026-02-17', '14:30:00', 30, 'checkup', 'Scottish Fold ear check', 'scheduled', 4),
('APPT-2026-0099', 'CUST-0045', 'PET-0057', 2, '2026-02-17', '15:00:00', 30, 'checkup', 'Follow-up consultation', 'scheduled', 5),
('APPT-2026-0100', 'CUST-0029', 'PET-0043', 3, '2026-02-17', '15:30:00', 30, 'checkup', 'Routine health check', 'scheduled', 4),
('APPT-2026-0101', 'CUST-0001', 'PET-0002', 1, '2026-02-17', '16:00:00', 30, 'checkup', 'Annual wellness exam', 'scheduled', 5);

-- Update sequences to next available values after demo seed data
SELECT setval('customers_id_seq', 46, false);
SELECT setval('pets_id_seq', 63, false);
SELECT setval('appointments_id_seq', 102, false);

-- Success message
SELECT 'Demo seed data inserted successfully!' AS message,
       '10 new customers added (CUST-0036 to CUST-0045)' AS customers,
       '10 new pets added (PET-0053 to PET-0062)' AS pets,
       '46 appointments scheduled for Feb 13-17, 2026' AS appointments,
       'February 13: 10 appointments' AS feb_13,
       'February 14 (Demo Day): 12 appointments' AS feb_14,
       'February 15: 8 appointments' AS feb_15,
       'February 16: 6 appointments' AS feb_16,
       'February 17: 10 appointments' AS feb_17,
       'Ready for your February 14, 2026 demo!' AS status;
