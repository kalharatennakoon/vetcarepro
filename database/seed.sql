-- VetCare Pro - Sample Seed Data
-- Database: Pro Pet Animal Hospital, Kurunegala District, Sri Lanka
-- This script populates the database with initial data for testing and development purposes.

-- Insert Users (Staff)
-- Passwords: password123 for all users
-- Hash generated using bcrypt with 10 rounds
INSERT INTO users (first_name, last_name, password_hash, email, phone, role, specialization, license_number, is_active) VALUES
('Dulani', 'Gunathilake', '$2b$10$pYYBWaW1oe70cLoosN8H1.3DqfYM5aNwZ.DuNAHflkf8..zEtdv9q', 'dulani@propet.lk', '+94712345001', 'veterinarian', 'Small Animal Medicine', 'SLVMC-2015-001', true),
('Nimal', 'Amarasinghe', '$2b$10$pYYBWaW1oe70cLoosN8H1.3DqfYM5aNwZ.DuNAHflkf8..zEtdv9q', 'nimal@propet.lk', '+94712345002', 'veterinarian', 'Small Animal Medicine', 'SLVMC-2018-045', true),
('Ayesha', 'Bandara', '$2b$10$pYYBWaW1oe70cLoosN8H1.3DqfYM5aNwZ.DuNAHflkf8..zEtdv9q', 'ayesha@propet.lk', '+94712345003', 'veterinarian', 'Surgery & Emergency Care', 'SLVMC-2019-078', true),
('Kumari', 'Dissanayake', '$2b$10$pYYBWaW1oe70cLoosN8H1.3DqfYM5aNwZ.DuNAHflkf8..zEtdv9q', 'kumari@propet.lk', '+94712345004', 'receptionist', NULL, NULL, true),
('Sanduni', 'Perera', '$2b$10$pYYBWaW1oe70cLoosN8H1.3DqfYM5aNwZ.DuNAHflkf8..zEtdv9q', 'sanduni@propet.lk', '+94712345005', 'receptionist', NULL, NULL, true),
('Admin', 'User 1', '$2b$10$aZ.3tPh6cIievJUzRWgZl.JDvLpbJtgPvWXxoAE6PofjsCtRkvkTe', 'admin1@propet.lk', '+94771111111', 'admin', 'System Administration', NULL, true),
('Admin', 'User 2', '$2b$10$JqO.p74JUJY1IrSTVli2.ODgxcOKRdyUUfE5EBnT7GO8gSBiAP9py', 'admin2@propet.lk', '+94772222222', 'admin', 'System Administration', NULL, true);
-- Set sequence values for formatted ID generation
SELECT setval('customers_id_seq', 1, false);
SELECT setval('pets_id_seq', 1, false);
SELECT setval('appointments_id_seq', 1, false);

-- Insert Customers (Pet Owners from Kurunegala district)
INSERT INTO customers (customer_id, first_name, last_name, email, phone, alternate_phone, address, city, nic, emergency_contact, emergency_phone, preferred_contact_method, created_by) VALUES
('CUST-0001', 'Pradeep', 'Wickramasinghe', 'pradeep.w@gmail.com', '+94771234501', '+94372221001', 'No. 45, Kandy Road, Mawathagama', 'Mawathagama', '881234567V', 'Sanduni Wickramasinghe', '+94771234502', 'phone', 1),
('CUST-0002', 'Nishantha', 'Rajapaksa', 'nishantha.r@gmail.com', '+94772234501', NULL, 'No. 12/A, Main Street, Pothuhera', 'Pothuhera', '901234567V', 'Chamari Rajapaksa', '+94772234502', 'phone', 1),
('CUST-0003', 'Dilini', 'Fernando', 'dilini.f@yahoo.com', '+94773234501', '+94372221002', 'No. 78, Temple Road, Kurunegala', 'Kurunegala', '851234567V', 'Roshan Fernando', '+94773234502', 'email', 1),
('CUST-0004', 'Kasun', 'Perera', 'kasun.p@hotmail.com', '+94774234501', NULL, 'No. 23, Lake View, Ibbagamuwa', 'Ibbagamuwa', '911234567V', 'Amaya Perera', '+94774234502', 'sms', 1),
('CUST-0005', 'Samantha', 'Silva', 'samantha.s@gmail.com', '+94775234501', '+94372221003', 'No. 56, Park Avenue, Mawathagama', 'Mawathagama', '791234567V', 'Nuwan Silva', '+94775234502', 'phone', 1),
('CUST-0006', 'Chandani', 'Gunasekara', 'chandani.g@gmail.com', '+94776234501', NULL, 'No. 89, Colombo Road, Kurunegala', 'Kurunegala', '921234567V', 'Sunil Gunasekara', '+94776234502', 'phone', 1),
('CUST-0007', 'Ruwan', 'Jayasuriya', 'ruwan.j@yahoo.com', '+94777234501', '+94372221004', 'No. 34, School Lane, Galgamuwa', 'Galgamuwa', '871234567V', 'Nimali Jayasuriya', '+94777234502', 'email', 1),
('CUST-0008', 'Thilini', 'Weerasinghe', 'thilini.w@gmail.com', '+94778234501', NULL, 'No. 67, Hospital Road, Wariyapola', 'Wariyapola', '951234567V', 'Ajith Weerasinghe', '+94778234502', 'phone', 1),
('CUST-0009', 'Mahesh', 'Bandara', 'mahesh.b@gmail.com', '+94779234501', '+94372221005', 'No. 156, Church Road, Mawathagama', 'Mawathagama', '831245678V', 'Nilmini Bandara', '+94779234502', 'phone', 1),
('CUST-0010', 'Shalini', 'Dissanayake', 'shalini.d@yahoo.com', '+94770234501', NULL, 'No. 25/B, Station Road, Kurunegala', 'Kurunegala', '895432167V', 'Lasith Dissanayake', '+94770234502', 'email', 1),
('CUST-0011', 'Chathura', 'Alwis', 'chathura.a@hotmail.com', '+94781234501', '+94372221006', 'No. 78/1, Anamaduwa Road, Galgamuwa', 'Galgamuwa', '942345678V', 'Hasini Alwis', '+94781234502', 'sms', 1),
('CUST-0012', 'Janaki', 'Ranasinghe', 'janaki.r@gmail.com', '+94782234501', NULL, 'No. 43, New Town, Narammala', 'Narammala', '877654321V', 'Anil Ranasinghe', '+94782234502', 'phone', 1),
('CUST-0013', 'Dinesh', 'Mendis', 'dinesh.m@yahoo.com', '+94783234501', '+94372221007', 'No. 190, Dambulla Road, Ibbagamuwa', 'Ibbagamuwa', '913456789V', 'Gayani Mendis', '+94783234502', 'phone', 1),
('CUST-0014', 'Nethmi', 'Jayawardena', 'nethmi.j@gmail.com', '+94784234501', NULL, 'No. 67/3, Market Street, Pannala', 'Pannala', '965678901V', 'Dilan Jayawardena', '+94784234502', 'email', 1),
('CUST-0015', 'Tharindu', 'Samaraweera', 'tharindu.s@hotmail.com', '+94785234501', '+94372221008', 'No. 112, Lake Road, Kurunegala', 'Kurunegala', '898765432V', 'Anusha Samaraweera', '+94785234502', 'phone', 1),
('CUST-0016', 'Madhavi', 'Wijesinghe', 'madhavi.w@gmail.com', '+94786234501', NULL, 'No. 34/A, Temple Lane, Mawathagama', 'Mawathagama', '825678901V', 'Sandeepa Wijesinghe', '+94786234502', 'sms', 1),
('CUST-0017', 'Buddhika', 'Gamage', 'buddhika.g@yahoo.com', '+94787234501', '+94372221009', 'No. 201, Main Road, Pothuhera', 'Pothuhera', '933456789V', 'Shanthi Gamage', '+94787234502', 'phone', 1),
('CUST-0018', 'Anuradha', 'Kumara', 'anuradha.k@gmail.com', '+94788234501', NULL, 'No. 89, Canal Road, Wariyapola', 'Wariyapola', '866789012V', 'Mahinda Kumara', '+94788234502', 'email', 1),
('CUST-0019', 'Upul', 'Senanayake', 'upul.s@hotmail.com', '+94789234501', '+94372221010', 'No. 145, Old Road, Melsiripura', 'Melsiripura', '925678901V', 'Kanthi Senanayake', '+94789234502', 'phone', 1),
('CUST-0020', 'Champa', 'Abeysekara', 'champa.a@gmail.com', '+94790234501', NULL, 'No. 67/5, School Street, Kurunegala', 'Kurunegala', '888765432V', 'Gamini Abeysekara', '+94790234502', 'phone', 1),
('CUST-0021', 'Ajith', 'Priyankara', 'ajith.p@yahoo.com', '+94791234501', '+94372221011', 'No. 234, Dalugama Road, Mawathagama', 'Mawathagama', '813456789V', 'Sunethra Priyankara', '+94791234502', 'email', 1),
('CUST-0022', 'Nalini', 'Rathnayake', 'nalini.r@gmail.com', '+94792234501', NULL, 'No. 98, Central Avenue, Alawwa', 'Alawwa', '935678901V', 'Prasanna Rathnayake', '+94792234502', 'sms', 1),
('CUST-0023', 'Chaminda', 'Herath', 'chaminda.h@hotmail.com', '+94793234501', '+94372221012', 'No. 56/2, Railway Road, Galgamuwa', 'Galgamuwa', '898765432V', 'Dilrukshi Herath', '+94793234502', 'phone', 1),
('CUST-0024', 'Kushani', 'Liyanage', 'kushani.l@gmail.com', '+94794234501', NULL, 'No. 178, Kadawatha Road, Ibbagamuwa', 'Ibbagamuwa', '926789012V', 'Dulaj Liyanage', '+94794234502', 'email', 1),
('CUST-0025', 'Lakshman', 'Withanage', 'lakshman.w@yahoo.com', '+94795234501', '+94372221013', 'No. 45/A, Bus Stand, Narammala', 'Narammala', '865678901V', 'Malini Withanage', '+94795234502', 'phone', 1),
('CUST-0026', 'Hemali', 'Edirisinghe', 'hemali.e@gmail.com', '+94796234501', NULL, 'No. 123, New Road, Pannala', 'Pannala', '948765432V', 'Kamal Edirisinghe', '+94796234502', 'phone', 1),
('CUST-0027', 'Gamini', 'Nanayakkara', 'gamini.n@hotmail.com', '+94797234501', '+94372221014', 'No. 67, Kuliyapitiya Road, Kurunegala', 'Kurunegala', '823456789V', 'Kusuma Nanayakkara', '+94797234502', 'sms', 1),
('CUST-0028', 'Shirani', 'Karunaratne', 'shirani.k@gmail.com', '+94798234501', NULL, 'No. 234/B, Hospital Junction, Mawathagama', 'Mawathagama', '915678901V', 'Asanka Karunaratne', '+94798234501', 'email', 1),
('CUST-0029', 'Priyantha', 'Dharmasena', 'priyantha.d@yahoo.com', '+94799234501', '+94372221015', 'No. 89/3, Grove Street, Pothuhera', 'Pothuhera', '888765432V', 'Nirosha Dharmasena', '+94799234502', 'phone', 1),
('CUST-0030', 'Yashodha', 'Amarasuriya', 'yashodha.a@gmail.com', '+94710234501', NULL, 'No. 156/A, Market Road, Wariyapola', 'Wariyapola', '936789012V', 'Udara Amarasuriya', '+94710234502', 'phone', 1),
('CUST-0031', 'Sunil', 'Wijesuriya', 'sunil.w@hotmail.com', '+94711234501', '+94372221016', 'No. 78/4, Temple Street, Galgamuwa', 'Galgamuwa', '855678901V', 'Mangala Wijesuriya', '+94711234502', 'email', 1),
('CUST-0032', 'Damayanthi', 'Siriwardena', 'damayanthi.s@gmail.com', '+94712234501', NULL, 'No. 45, Ring Road, Melsiripura', 'Melsiripura', '928765432V', 'Thilak Siriwardena', '+94712234502', 'sms', 1),
('CUST-0033', 'Anura', 'Gunasena', 'anura.g@yahoo.com', '+94713234501', '+94372221017', 'No. 123/B, Station Lane, Kurunegala', 'Kurunegala', '813456789V', 'Manori Gunasena', '+94713234502', 'phone', 1),
('CUST-0034', 'Ruvini', 'Hettiarachchi', 'ruvini.h@gmail.com', '+94714234501', NULL, 'No. 234, Beach Road, Mawathagama', 'Mawathagama', '975678901V', 'Roshan Hettiarachchi', '+94714234502', 'phone', 1),
('CUST-0035', 'Sanjeewa', 'Ratnayaka', 'sanjeewa.r@hotmail.com', '+94715234501', '+94372221018', 'No. 67/1, Park Lane, Ibbagamuwa', 'Ibbagamuwa', '898765432V', 'Indrani Ratnayaka', '+94715234502', 'email', 1);

-- Insert Pets (Diverse pet names and breeds)
INSERT INTO pets (pet_id, customer_id, pet_name, species, breed, gender, date_of_birth, color, weight_current, is_neutered, allergies, special_needs, is_active, deceased_date, created_by) VALUES
-- Customer 1: Pradeep - 2 dogs
('PET-0001', 'CUST-0001', 'Bruno', 'Dog', 'Labrador Retriever', 'male', '2020-05-15', 'Golden', 28.5, true, NULL, NULL, true, NULL, 1),
('PET-0002', 'CUST-0001', 'Bella', 'Dog', 'Golden Retriever', 'female', '2021-08-20', 'Light Golden', 24.3, false, NULL, NULL, true, NULL, 1),
-- Customer 2: Nishantha - 1 dog
('PET-0003', 'CUST-0002', 'Max', 'Dog', 'German Shepherd', 'male', '2019-03-10', 'Black & Tan', 35.0, true, 'Penicillin', NULL, true, NULL, 1),
-- Customer 3: Dilini - 2 cats
('PET-0004', 'CUST-0003', 'Luna', 'Cat', 'Persian', 'female', '2021-11-05', 'White', 4.5, true, NULL, NULL, true, NULL, 1),
('PET-0005', 'CUST-0003', 'Oliver', 'Cat', 'Mixed Breed', 'male', '2022-01-15', 'Grey Tabby', 3.8, false, NULL, NULL, true, NULL, 1),
-- Customer 4: Kasun - 1 dog
('PET-0006', 'CUST-0004', 'Charlie', 'Dog', 'Beagle', 'male', '2020-07-22', 'Tricolor', 12.0, false, NULL, NULL, true, NULL, 1),
-- Customer 5: Samantha - 2 pets (rabbit + cat)
('PET-0007', 'CUST-0005', 'Thumper', 'Rabbit', 'Dutch Rabbit', 'female', '2022-09-10', 'Black & White', 1.8, false, NULL, NULL, true, NULL, 1),
('PET-0008', 'CUST-0005', 'Whiskers', 'Cat', 'Siamese', 'male', '2021-05-22', 'Cream & Brown', 4.2, true, NULL, NULL, true, NULL, 1),
-- Customer 6: Chandani - 1 dog
('PET-0009', 'CUST-0006', 'Rocky', 'Dog', 'Rottweiler', 'male', '2019-12-05', 'Black & Brown', 42.0, true, NULL, NULL, true, NULL, 1),
-- Customer 7: Ruwan - 1 cat
('PET-0010', 'CUST-0007', 'Mittens', 'Cat', 'Local Breed', 'female', '2023-03-20', 'White & Grey', 3.2, true, NULL, NULL, true, NULL, 1),
-- Customer 8: Thilini  - 1 dog
('PET-0011', 'CUST-0008', 'Tommy', 'Dog', 'Pomeranian', 'male', '2022-06-15', 'Orange', 3.5, false, NULL, 'Sensitive stomach', true, NULL, 1),
-- Customer 9: Mahesh - 2 dogs
('PET-0012', 'CUST-0009', 'Duke', 'Dog', 'Doberman', 'male', '2020-02-18', 'Black & Rust', 38.0, true, NULL, NULL, true, NULL, 1),
('PET-0013', 'CUST-0009', 'Daisy', 'Dog', 'Cocker Spaniel', 'female', '2021-11-30', 'Brown', 13.5, false, NULL, NULL, true, NULL, 1),
-- Customer 10: Shalini - 1 cat
('PET-0014', 'CUST-0010', 'Smokey', 'Cat', 'Russian Blue', 'male', '2020-09-12', 'Grey', 5.0, true, NULL, NULL, true, NULL, 1),
-- Customer 11: Chathura - 1 dog (deceased)
('PET-0015', 'CUST-0011', 'Rex', 'Dog', 'German Shepherd', 'male', '2015-04-10', 'Black & Tan', 36.0, true, NULL, NULL, false, '2024-08-15', 1),
-- Customer 12: Janaki - 2 cats
('PET-0016', 'CUST-0012', 'Tiger', 'Cat', 'Bengal', 'male', '2021-02-20', 'Orange Spotted', 5.5, true, NULL, NULL, true, NULL, 1),
('PET-0017', 'CUST-0012', 'Chloe', 'Cat', 'Maine Coon', 'female', '2020-07-08', 'Brown Tabby', 6.2, true, NULL, NULL, true, NULL, 1),
-- Customer 13: Dinesh - 3 pets (dog, cat, rabbit)
('PET-0018', 'CUST-0013', 'Buddy', 'Dog', 'Boxer', 'male', '2019-12-25', 'Fawn', 28.0, true, NULL, NULL, true, NULL, 1),
('PET-0019', 'CUST-0013', 'Ginger', 'Cat', 'Orange Tabby', 'female', '2022-03-15', 'Orange', 3.9, false, NULL, NULL, true, NULL, 1),
('PET-0020', 'CUST-0013', 'Cotton', 'Rabbit', 'Lionhead', 'female', '2023-01-10', 'White', 1.5, false, NULL, NULL, true, NULL, 1),
-- Customer 14: Nethmi - 1 cat
('PET-0021', 'CUST-0014', 'Felix', 'Cat', 'British Shorthair', 'male', '2021-06-18', 'Grey', 5.8, true, NULL, NULL, true, NULL, 1),
-- Customer 15: Tharindu - 2 dogs
('PET-0022', 'CUST-0015', 'Zeus', 'Dog', 'Husky', 'male', '2020-08-05', 'Grey & White', 26.5, true, NULL, NULL, true, NULL, 1),
('PET-0023', 'CUST-0015', 'Shadow', 'Dog', 'Black Labrador', 'male', '2019-11-20', 'Black', 32.0, true, NULL, NULL, true, NULL, 1),
-- Customer 16: Madhavi - 1 dog
('PET-0024', 'CUST-0016', 'Cooper', 'Dog', 'Bulldog', 'male', '2021-04-12', 'White & Brown', 22.0, false, NULL, 'Hip dysplasia', true, NULL, 1),
-- Customer 17: Buddhika - 1 cat (deceased)
('PET-0025', 'CUST-0017', 'Princess', 'Cat', 'Persian', 'female', '2016-02-14', 'White', 4.0, true, NULL, NULL, false, '2024-10-22', 1),
-- Customer 18: Anuradha - 2 pets (dog + bird)
('PET-0026', 'CUST-0018', 'Toby', 'Dog', 'Shih Tzu', 'male', '2022-01-08', 'White & Gold', 6.5, false, NULL, NULL, true, NULL, 1),
('PET-0027', 'CUST-0018', 'Kiwi', 'Bird', 'Budgerigar', 'male', '2023-05-20', 'Green & Yellow', 0.035, false, NULL, NULL, true, NULL, 1),
-- Customer 19: Upul - 1 dog
('PET-0028', 'CUST-0019', 'Bear', 'Dog', 'Chow Chow', 'male', '2020-03-30', 'Brown', 27.0, true, NULL, NULL, true, NULL, 1),
-- Customer 20: Champa - 2 cats
('PET-0029', 'CUST-0020', 'Oreo', 'Cat', 'Tuxedo', 'male', '2021-09-15', 'Black & White', 4.3, true, NULL, NULL, true, NULL, 1),
('PET-0030', 'CUST-0020', 'Nala', 'Cat', 'Calico', 'female', '2022-05-28', 'Calico Mix', 3.7, false, NULL, NULL, true, NULL, 1),
-- Customer 21: Ajith - 1 dog
('PET-0031', 'CUST-0021', 'Leo', 'Dog', 'Dalmatian', 'male', '2021-07-10', 'White with Black Spots', 25.0, true, NULL, NULL, true, NULL, 1),
-- Customer 22: Nalini - 3 pets (cat, rabbit, guinea pig)
('PET-0032', 'CUST-0022', 'Jasper', 'Cat', 'Ragdoll', 'male', '2020-10-05', 'Cream & Brown', 5.5, true, NULL, NULL, true, NULL, 1),
('PET-0033', 'CUST-0022', 'Snowball', 'Rabbit', 'Angora', 'female', '2022-07-18', 'White', 2.0, false, NULL, NULL, true, NULL, 1),
('PET-0034', 'CUST-0022', 'Caramel', 'Guinea Pig', 'American', 'female', '2023-02-14', 'Brown & White', 0.9, false, NULL, NULL, true, NULL, 1),
-- Customer 23: Chaminda - 1 dog
('PET-0035', 'CUST-0023', 'Thor', 'Dog', 'Great Dane', 'male', '2019-05-22', 'Harlequin', 68.0, true, NULL, 'Joint supplements needed', true, NULL, 1),
-- Customer 24: Kushani - 2 cats
('PET-0036', 'CUST-0024', 'Misty', 'Cat', 'Scottish Fold', 'female', '2021-12-01', 'Grey', 4.6, true, NULL, NULL, true, NULL, 1),
('PET-0037', 'CUST-0024', 'Chester', 'Cat', 'American Shorthair', 'male', '2022-08-20', 'Silver Tabby', 5.0, false, NULL, NULL, true, NULL, 1),
-- Customer 25: Lakshman - 1 dog
('PET-0038', 'CUST-0025', 'Simba', 'Dog', 'Chow Chow', 'male', '2020-11-15', 'Red', 24.0, true, NULL, NULL, true, NULL, 1),
-- Customer 26: Hemali - 2 pets (dog + rabbit)
('PET-0039', 'CUST-0026', 'Bailey', 'Dog', 'Cavalier King Charles', 'female', '2021-03-25', 'Tricolor', 8.5, false, NULL, NULL, true, NULL, 1),
('PET-0040', 'CUST-0026', 'Fluffy', 'Rabbit', 'Flemish Giant', 'male', '2022-10-12', 'Grey', 5.5, false, NULL, NULL, true, NULL, 1),
-- Customer 27: Gamini - 1 dog
('PET-0041', 'CUST-0027', 'Oscar', 'Dog', 'Pug', 'male', '2021-06-08', 'Fawn', 7.2, false, NULL, 'Breathing issues', true, NULL, 1),
-- Customer 28: Shirani - 1 cat
('PET-0042', 'CUST-0028', 'Lucy', 'Cat', 'Exotic Shorthair', 'female', '2022-02-19', 'Cream', 4.0, true, NULL, NULL, true, NULL, 1),
-- Customer 29: Priyantha - 2 dogs
('PET-0043', 'CUST-0029', 'Jack', 'Dog', 'Jack Russell Terrier', 'male', '2020-09-30', 'White & Brown', 7.0, true, NULL, NULL, true, NULL, 1),
('PET-0044', 'CUST-0029', 'Rosie', 'Dog', 'Beagle', 'female', '2021-05-17', 'Tricolor', 11.5, false, NULL, NULL, true, NULL, 1),
-- Customer 30: Yashodha - 1 bird
('PET-0045', 'CUST-0030', 'Sunny', 'Bird', 'Cockatiel', 'male', '2022-11-03', 'Yellow & Grey', 0.09, false, NULL, NULL, true, NULL, 1),
-- Customer 31: Sunil - 1 dog (deceased)
('PET-0046', 'CUST-0031', 'King', 'Dog', 'Rottweiler', 'male', '2014-07-20', 'Black & Brown', 45.0, true, NULL, NULL, false, '2024-06-10', 1),
-- Customer 32: Damayanthi - 2 cats
('PET-0047', 'CUST-0032', 'Pepper', 'Cat', 'Bombay', 'male', '2021-08-14', 'Black', 4.8, true, NULL, NULL, true, NULL, 1),
('PET-0048', 'CUST-0032', 'Willow', 'Cat', 'Norwegian Forest', 'female', '2020-12-22', 'Grey & White', 5.9, true, NULL, NULL, true, NULL, 1),
-- Customer 33: Anura - 1 dog
('PET-0049', 'CUST-0033', 'Tucker', 'Dog', 'Border Collie', 'male', '2019-10-18', 'Black & White', 18.0, true, NULL, NULL, true, NULL, 1),
-- Customer 34: Ruvini - 2 pets (cat + hamster)
('PET-0050', 'CUST-0034', 'Milo', 'Cat', 'Birman', 'male', '2021-04-05', 'Seal Point', 5.2, true, NULL, NULL, true, NULL, 1),
('PET-0051', 'CUST-0034', 'Nibbles', 'Hamster', 'Syrian', 'female', '2023-06-15', 'Golden', 0.15, false, NULL, NULL, true, NULL, 1),
-- Customer 35: Sanjeewa - 1 dog
('PET-0052', 'CUST-0035', 'Lucky', 'Dog', 'Mixed Breed', 'male', '2020-01-28', 'Brown & White', 16.5, true, NULL, NULL, true, NULL, 1);

-- Insert Appointments
INSERT INTO appointments (appointment_id, customer_id, pet_id, veterinarian_id, appointment_date, appointment_time, duration_minutes, appointment_type, reason, status, created_by) VALUES
-- Completed Appointments from 2024
('APPT-2024-0001', 'CUST-0001', 'PET-0001', 1, '2024-06-15', '09:00:00', 30, 'checkup', 'Annual checkup and vaccination', 'completed', 4),
('APPT-2024-0002', 'CUST-0001', 'PET-0002', 2, '2024-08-20', '10:30:00', 30, 'checkup', 'First wellness exam', 'completed', 4),
('APPT-2024-0003', 'CUST-0002', 'PET-0003', 1, '2024-09-10', '14:00:00', 45, 'checkup', 'Joint pain assessment', 'completed', 5),
('APPT-2024-0004', 'CUST-0003', 'PET-0004', 3, '2024-07-22', '11:00:00', 30, 'vaccination', 'Annual vaccines', 'completed', 4),
('APPT-2024-0005', 'CUST-0003', 'PET-0005', 2, '2024-08-15', '15:00:00', 30, 'checkup', 'Skin irritation', 'completed', 5),
('APPT-2024-0006', 'CUST-0004', 'PET-0006', 1, '2024-10-05', '09:30:00', 30, 'checkup', 'Ear infection follow-up', 'completed', 4),
('APPT-2024-0007', 'CUST-0005', 'PET-0007', 2, '2024-11-12', '10:00:00', 30, 'checkup', 'Dental check', 'completed', 5),
('APPT-2024-0008', 'CUST-0005', 'PET-0008', 3, '2024-09-25', '13:30:00', 30, 'vaccination', 'Rabies and FVRCP', 'completed', 4),
('APPT-2024-0009', 'CUST-0006', 'PET-0009', 1, '2024-08-30', '08:30:00', 45, 'checkup', 'Hip dysplasia monitoring', 'completed', 5),
('APPT-2024-0010', 'CUST-0007', 'PET-0010', 2, '2024-10-18', '11:30:00', 30, 'checkup', 'Routine wellness check', 'completed', 4),
('APPT-2024-0011', 'CUST-0008', 'PET-0011', 3, '2024-07-15', '14:00:00', 30, 'checkup', 'Weight management consultation', 'completed', 5),
('APPT-2024-0012', 'CUST-0009', 'PET-0012', 1, '2024-09-22', '10:00:00', 45, 'checkup', 'Behavioral concerns', 'completed', 4),
('APPT-2024-0013', 'CUST-0009', 'PET-0013', 2, '2024-11-05', '09:00:00', 30, 'vaccination', 'Booster shots', 'completed', 5),
('APPT-2024-0014', 'CUST-0010', 'PET-0014', 3, '2024-08-12', '15:30:00', 30, 'checkup', 'Respiratory issues', 'completed', 4),
('APPT-2024-0015', 'CUST-0011', 'PET-0015', 1, '2024-05-20', '10:30:00', 45, 'emergency', 'Severe lethargy and loss of appetite', 'completed', 5),
('APPT-2024-0016', 'CUST-0012', 'PET-0016', 2, '2024-10-28', '13:00:00', 30, 'checkup', 'Annual wellness exam', 'completed', 4),
('APPT-2024-0017', 'CUST-0012', 'PET-0017', 3, '2024-09-14', '11:00:00', 30, 'consultation', 'Nail trim and grooming', 'completed', 5),
('APPT-2024-0018', 'CUST-0013', 'PET-0018', 1, '2024-11-20', '08:30:00', 45, 'checkup', 'Post-neutering follow-up', 'completed', 4),
('APPT-2024-0019', 'CUST-0013', 'PET-0019', 2, '2024-10-10', '14:30:00', 30, 'vaccination', 'Rabies vaccine', 'completed', 5),
('APPT-2024-0020', 'CUST-0014', 'PET-0021', 3, '2024-09-05', '10:00:00', 30, 'checkup', 'Eye discharge', 'completed', 4),
('APPT-2024-0021', 'CUST-0015', 'PET-0022', 1, '2024-11-15', '09:30:00', 60, 'surgery', 'Neutering procedure', 'completed', 5),
('APPT-2024-0022', 'CUST-0015', 'PET-0023', 2, '2024-08-25', '11:00:00', 30, 'checkup', 'Skin allergy check', 'completed', 4),
('APPT-2024-0023', 'CUST-0016', 'PET-0024', 3, '2024-10-22', '13:30:00', 45, 'checkup', 'Hip dysplasia evaluation', 'completed', 5),
('APPT-2024-0024', 'CUST-0018', 'PET-0026', 1, '2024-09-18', '10:30:00', 30, 'checkup', 'First puppy exam', 'completed', 4),
('APPT-2024-0025', 'CUST-0019', 'PET-0028', 2, '2024-11-08', '14:00:00', 30, 'checkup', 'Dental cleaning', 'completed', 5),
('APPT-2024-0026', 'CUST-0020', 'PET-0029', 3, '2024-10-15', '09:00:00', 30, 'checkup', 'Routine wellness exam', 'completed', 4),
('APPT-2024-0027', 'CUST-0020', 'PET-0030', 1, '2024-08-20', '11:30:00', 30, 'vaccination', 'Kitten vaccines', 'completed', 5),
('APPT-2024-0028', 'CUST-0021', 'PET-0031', 2, '2024-09-28', '13:00:00', 45, 'checkup', 'Skin spots evaluation', 'completed', 4),
('APPT-2024-0029', 'CUST-0022', 'PET-0032', 3, '2024-11-25', '10:00:00', 30, 'checkup', 'Annual health check', 'completed', 5),
('APPT-2024-0030', 'CUST-0024', 'PET-0036', 1, '2024-10-30', '14:30:00', 30, 'checkup', 'Ear fold examination', 'completed', 4),
('APPT-2024-0031', 'CUST-0025', 'PET-0038', 2, '2024-09-12', '09:30:00', 30, 'vaccination', 'Annual vaccines', 'completed', 5),
('APPT-2024-0032', 'CUST-0026', 'PET-0039', 3, '2024-11-18', '11:00:00', 30, 'checkup', 'Heart murmur check', 'completed', 4),
('APPT-2024-0033', 'CUST-0027', 'PET-0041', 1, '2024-10-25', '13:30:00', 30, 'checkup', 'Breathing difficulties', 'completed', 5),
('APPT-2024-0034', 'CUST-0029', 'PET-0044', 2, '2024-09-20', '10:00:00', 45, 'checkup', 'Skin condition assessment', 'completed', 4),
('APPT-2024-0035', 'CUST-0031', 'PET-0047', 3, '2024-04-15', '11:30:00', 60, 'emergency', 'Acute kidney failure symptoms', 'completed', 5),
('APPT-2024-0036', 'CUST-0032', 'PET-0048', 1, '2024-11-22', '09:00:00', 30, 'checkup', 'Weight loss concern', 'completed', 4),
('APPT-2024-0037', 'CUST-0033', 'PET-0050', 2, '2024-10-12', '14:00:00', 30, 'checkup', 'Routine herding dog exam', 'completed', 5),
-- Cancelled/No-show Appointments
('APPT-2024-0038', 'CUST-0007', 'PET-0010', 1, '2024-12-01', '10:00:00', 30, 'checkup', 'Follow-up exam', 'cancelled', 4),
('APPT-2024-0039', 'CUST-0014', 'PET-0021', 2, '2024-11-28', '13:00:00', 30, 'consultation', 'Nail trim', 'no_show', 5),
('APPT-2024-0040', 'CUST-0023', 'PET-0035', 3, '2024-12-05', '09:30:00', 45, 'checkup', 'Joint supplement consultation', 'cancelled', 4),
-- Scheduled Appointments for Future (2025-2026)
('APPT-2025-0041', 'CUST-0001', 'PET-0001', 1, '2025-06-20', '09:00:00', 30, 'checkup', 'Annual checkup and vaccination renewal', 'scheduled', 4),
('APPT-2025-0042', 'CUST-0002', 'PET-0003', 2, '2025-09-15', '10:00:00', 45, 'checkup', 'Senior dog wellness exam', 'scheduled', 5),
('APPT-2025-0043', 'CUST-0003', 'PET-0004', 3, '2025-02-10', '14:00:00', 30, 'vaccination', 'FVRCP booster due', 'scheduled', 4),
('APPT-2026-0044', 'CUST-0004', 'PET-0006', 1, '2026-01-15', '09:30:00', 30, 'checkup', 'Routine checkup', 'scheduled', 5),
('APPT-2025-0045', 'CUST-0006', 'PET-0009', 2, '2025-08-30', '11:00:00', 45, 'checkup', 'Hip dysplasia recheck', 'scheduled', 4),
('APPT-2025-0046', 'CUST-0008', 'PET-0011', 3, '2025-07-20', '13:30:00', 30, 'checkup', 'Diet and weight follow-up', 'scheduled', 5),
('APPT-2025-0047', 'CUST-0010', 'PET-0014', 1, '2025-03-15', '10:30:00', 30, 'checkup', 'Respiratory follow-up', 'scheduled', 4),
('APPT-2025-0048', 'CUST-0013', 'PET-0018', 2, '2025-11-25', '09:00:00', 30, 'checkup', 'Annual wellness exam', 'scheduled', 5),
('APPT-2026-0049', 'CUST-0015', 'PET-0022', 3, '2026-05-15', '14:00:00', 30, 'checkup', 'Post-neutering annual check', 'scheduled', 4),
('APPT-2025-0050', 'CUST-0018', 'PET-0026', 1, '2025-09-20', '11:00:00', 30, 'checkup', 'Puppy progress check', 'scheduled', 5),
('APPT-2025-0051', 'CUST-0022', 'PET-0032', 2, '2025-11-30', '10:00:00', 30, 'checkup', 'Annual wellness exam', 'scheduled', 4),
('APPT-2025-0052', 'CUST-0025', 'PET-0038', 3, '2025-09-15', '13:00:00', 30, 'vaccination', 'Booster vaccines', 'scheduled', 5),
('APPT-2025-0053', 'CUST-0028', 'PET-0042', 1, '2025-08-25', '09:30:00', 30, 'checkup', 'Routine health check', 'scheduled', 4),
('APPT-2025-0054', 'CUST-0030', 'PET-0046', 2, '2025-11-10', '14:30:00', 30, 'checkup', 'Bird wellness exam', 'scheduled', 5),
('APPT-2025-0055', 'CUST-0034', 'PET-0051', 3, '2025-04-10', '10:00:00', 30, 'checkup', 'Annual cat checkup', 'scheduled', 4);

-- Insert Medical Records
INSERT INTO medical_records (pet_id, appointment_id, veterinarian_id, visit_date, chief_complaint, symptoms, diagnosis, treatment, prescription, weight, temperature, heart_rate, respiratory_rate, notes, created_by) VALUES
('PET-0001', 'APPT-2024-0001', 1, '2024-06-15', 'Annual checkup', 'None', 'Healthy, all vitals normal', 'Continue current diet and exercise routine', NULL, 28.5, 38.6, 92, 24, 'Pet in excellent health. Vaccinations administered.', 1),
('PET-0002', 'APPT-2024-0002', 2, '2024-08-20', 'First wellness exam', 'None', 'Healthy puppy, minor ear wax buildup', 'Ear cleaning demonstrated to owner', 'Ear cleaning solution - as needed', 24.3, 38.7, 98, 26, 'Owner educated on ear care', 2),
('PET-0003', 'APPT-2024-0003', 1, '2024-09-10', 'Joint pain', 'Limping on hind leg, reluctance to jump', 'Early signs of arthritis', 'Joint supplement recommended, monitor activity', 'Glucosamine & Chondroitin - 1 tablet daily', 35.0, 38.4, 86, 22, 'Advised weight management and gentle exercise', 1),
('PET-0004', 'APPT-2024-0004', 3, '2024-07-22', 'Annual vaccines', 'None', 'Healthy, vaccinations up to date', 'FVRCP vaccine administered', NULL, 4.5, 38.5, 180, 28, 'No adverse reactions observed', 3),
('PET-0005', 'APPT-2024-0005', 2, '2024-08-15', 'Skin irritation', 'Scratching, redness on belly', 'Allergic dermatitis', 'Antihistamine and medicated shampoo', 'Cetirizine 5mg - twice daily for 7 days, Medicated shampoo - weekly', 3.8, 38.3, 175, 32, 'Follow up in 2 weeks if no improvement', 2),
('PET-0006', 'APPT-2024-0006', 1, '2024-10-05', 'Ear infection follow-up', 'Slight discharge resolved', 'Ear infection resolved', 'Continue ear cleaning as prevention', NULL, 12.0, 38.4, 110, 26, 'Owner compliant with treatment. Ears healthy.', 1),
('PET-0007', 'APPT-2024-0007', 2, '2024-11-12', 'Dental check', 'Bad breath noted by owner', 'Early dental tartar buildup', 'Dental cleaning scheduled, daily tooth brushing recommended', 'Dental treats - daily', 1.8, 38.8, NULL, 45, 'Owner taught proper tooth brushing technique', 2),
('PET-0008', 'APPT-2024-0008', 3, '2024-09-25', 'Vaccination', 'None', 'Healthy, vaccines administered', 'Rabies and FVRCP vaccines given', NULL, 4.2, 38.6, 185, 30, 'Cat handled well during procedure', 3),
('PET-0009', 'APPT-2024-0009', 1, '2024-08-30', 'Hip monitoring', 'Occasional stiffness after rest', 'Hip dysplasia - mild', 'Joint supplements, weight management critical', 'Carprofen 25mg - as needed for pain, Omega-3 supplement daily', 42.0, 38.5, 84, 20, 'X-rays show mild dysplasia. Monitor closely.', 1),
('PET-0010', 'APPT-2024-0010', 2, '2024-10-18', 'Routine wellness', 'None', 'Healthy, all systems normal', 'Continue current care', NULL, 3.2, 38.4, 190, 34, 'Cat in good health', 2),
('PET-0011', 'APPT-2024-0011', 3, '2024-07-15', 'Weight management', 'Weight gain noticed', 'Obesity', 'Dietary changes, increased activity', 'Prescription diet food - measured portions', 3.5, 38.7, 115, 28, 'Target weight is 2.8kg. Recheck in 4 weeks.', 3),
('PET-0012', 'APPT-2024-0012', 1, '2024-09-22', 'Behavioral concerns', 'Excessive barking, anxiety', 'Separation anxiety', 'Behavioral training recommended, consider anxiety medication', 'Fluoxetine 10mg - daily', 38.0, 38.6, 95, 24, 'Referred to certified dog trainer', 1),
('PET-0013', 'APPT-2024-0013', 2, '2024-11-05', 'Booster shots', 'None', 'Healthy, vaccinations updated', 'DHPP booster administered', NULL, 13.5, 38.5, 105, 26, 'No adverse reactions', 2),
('PET-0014', 'APPT-2024-0014', 3, '2024-08-12', 'Respiratory issues', 'Sneezing, nasal discharge', 'Upper respiratory infection', 'Antibiotics, isolation from other cats', 'Amoxicillin 250mg - twice daily for 10 days', 5.0, 39.2, 200, 40, 'Owner advised to monitor temperature. Recheck in 1 week.', 3),
('PET-0015', 'APPT-2024-0015', 1, '2024-05-20', 'Emergency - lethargy', 'Severe weakness, not eating', 'Acute kidney disease', 'Hospitalization, IV fluids, supportive care', 'Multiple medications during hospitalization', 36.0, 39.5, 110, 30, 'Critical condition. Prognosis poor. Died June 10, 2024.', 1),
('PET-0016', 'APPT-2024-0016', 2, '2024-10-28', 'Annual wellness', 'None', 'Healthy adult cat', 'Continue current care', NULL, 5.5, 38.5, 185, 30, 'Cat in excellent condition', 2),
('PET-0017', 'APPT-2024-0017', 3, '2024-09-14', 'Grooming', 'Matted fur', 'Coat maintenance needed', 'Full grooming completed, brushing routine discussed', NULL, 6.2, 38.4, 180, 28, 'Owner advised daily brushing for Maine Coon', 3),
('PET-0018', 'APPT-2024-0018', 1, '2024-11-20', 'Post-neutering check', 'Healing well', 'Surgical site healing normally', 'Continue activity restriction for 3 more days', NULL, 28.0, 38.6, 88, 22, 'Sutures dissolving properly. No complications.', 1),
('PET-0019', 'APPT-2024-0019', 2, '2024-10-10', 'Vaccination', 'None', 'Healthy, rabies vaccine given', 'Rabies vaccine administered', NULL, 3.9, 38.5, 195, 32, 'No adverse reactions', 2),
('PET-0021', 'APPT-2024-0020', 3, '2024-09-05', 'Eye discharge', 'Watery eyes, slight redness', 'Mild conjunctivitis', 'Antibiotic eye drops', 'Terramycin eye ointment - 3 times daily for 7 days', 5.8, 38.4, 175, 30, 'Owner demonstrated proper application', 3),
('PET-0022', 'APPT-2024-0021', 1, '2024-11-15', 'Neutering surgery', 'Pre-surgical', 'Healthy for surgery', 'Neutering performed successfully', 'Pain medication - 5 days, Antibiotic - 7 days', 26.5, 38.5, 90, 24, 'Surgery completed without complications. Discharge instructions given.', 1),
('PET-0023', 'APPT-2024-0022', 2, '2024-08-25', 'Skin allergy', 'Itching, red patches', 'Atopic dermatitis', 'Antihistamine, hypoallergenic diet trial', 'Cetirizine 10mg - daily, Prescription hypoallergenic food', 32.0, 38.7, 92, 22, 'Diet trial for 8 weeks. Recheck after trial.', 2),
('PET-0024', 'APPT-2024-0023', 3, '2024-10-22', 'Hip evaluation', 'Difficulty rising', 'Hip dysplasia progression', 'Pain management, consider surgery consultation', 'Carprofen 50mg - twice daily, Joint supplement', 22.0, 38.6, 100, 26, 'Discussed surgical options with owner. Decision pending.', 3),
('PET-0026', 'APPT-2024-0024', 1, '2024-09-18', 'First puppy exam', 'None', 'Healthy puppy', 'First vaccinations given, deworming', 'Dewormer - single dose', 6.5, 38.8, 120, 32, 'Puppy care and training discussed with owner', 1),
('PET-0028', 'APPT-2024-0025', 2, '2024-11-08', 'Dental cleaning', 'Tartar buildup', 'Periodontal disease - early stage', 'Professional dental cleaning under anesthesia', 'Dental care products', 27.0, 38.5, 85, 20, 'Dental cleaning successful. 2 teeth extracted. Daily brushing essential.', 2),
('PET-0029', 'APPT-2024-0026', 3, '2024-10-15', 'Routine wellness', 'None', 'Healthy adult cat', 'Continue current care', NULL, 4.3, 38.6, 180, 28, 'All vitals normal', 3),
('PET-0030', 'APPT-2024-0027', 1, '2024-08-20', 'Kitten vaccines', 'None', 'Healthy kitten', 'First FVRCP vaccine given', NULL, 3.7, 38.7, 200, 35, 'Next vaccine due in 3-4 weeks', 1),
('PET-0031', 'APPT-2024-0028', 2, '2024-09-28', 'Skin spots check', 'Owner noticed new spots', 'Normal dalmatian markings', 'No treatment needed, reassurance given', NULL, 25.0, 38.5, 95, 24, 'Explained breed-specific coat patterns', 2),
('PET-0032', 'APPT-2024-0029', 3, '2024-11-25', 'Annual health check', 'None', 'Healthy adult cat', 'Continue current care', NULL, 5.5, 38.4, 175, 30, 'Cat in excellent health', 3),
('PET-0036', 'APPT-2024-0030', 1, '2024-10-30', 'Ear fold exam', 'Owner concerned about folded ears', 'Normal Scottish Fold anatomy', 'Regular ear cleaning recommended', 'Ear cleaning solution', 4.6, 38.5, 185, 32, 'Explained breed characteristics. Ears healthy.', 1),
('PET-0038', 'APPT-2024-0031', 2, '2024-09-12', 'Annual vaccines', 'None', 'Healthy adult dog', 'DHPP and Rabies vaccines given', NULL, 24.0, 38.6, 88, 22, 'No adverse reactions', 2),
('PET-0039', 'APPT-2024-0032', 3, '2024-11-18', 'Heart murmur check', 'Murmur detected previously', 'Grade 2/6 heart murmur - stable', 'Monitor, no treatment needed currently', NULL, 8.5, 38.7, 115, 28, 'Murmur unchanged from last exam. Continue monitoring.', 3),
('PET-0041', 'APPT-2024-0033', 1, '2024-10-25', 'Breathing difficulties', 'Snorting, difficulty breathing after exercise', 'Brachycephalic syndrome', 'Weight management, avoid heat/stress', NULL, 7.2, 38.9, 110, 30, 'Discussed surgical options. Owner declined. Management plan in place.', 1),
('PET-0044', 'APPT-2024-0034', 2, '2024-09-20', 'Skin condition', 'Hot spots, excessive scratching', 'Flea allergy dermatitis', 'Flea treatment, anti-inflammatory', 'Flea prevention monthly, Prednisolone 5mg - daily for 7 days', 7.0, 38.6, 105, 26, 'Discussed strict flea control. Improvement expected in 1-2 weeks.', 2),
('PET-0047', 'APPT-2024-0035', 3, '2024-04-15', 'Emergency - kidney failure', 'Not eating, vomiting, extreme lethargy', 'Acute renal failure', 'Intensive care, IV fluids, multiple medications', 'Various emergency medications', 45.0, 40.1, 120, 36, 'Critical condition. Despite aggressive treatment, died June 10, 2024.', 3),
('PET-0048', 'APPT-2024-0036', 1, '2024-11-22', 'Weight loss', 'Owner reports weight loss', 'Weight loss - mild, no other abnormalities', 'Monitor, increase food portions', 'High-calorie supplement', 4.8, 38.5, 190, 32, 'Recheck weight in 2 weeks', 1),
('PET-0050', 'APPT-2024-0037', 2, '2024-10-12', 'Herding dog exam', 'None', 'Healthy, high energy', 'Continue current exercise regimen', NULL, 18.0, 38.6, 95, 24, 'Excellent condition for working breed', 2),
-- Additional medical records for Max (PET-0003)
('PET-0003', 'APPT-2025-0038', 1, '2025-02-18', 'Arthritis follow-up', 'Mild improvement in mobility, occasional stiffness in cold weather', 'Arthritis - responding well to treatment', 'Continue glucosamine, add physiotherapy exercises', 'Glucosamine & Chondroitin - continue, Carprofen 25mg - as needed', 34.2, 38.5, 88, 24, 'Weight reduced by 0.8kg. Owner reports improved activity levels. Demonstrated physiotherapy exercises.', 1),
('PET-0003', 'APPT-2025-0041', 2, '2025-09-15', 'Senior wellness exam', 'Generally good, some morning stiffness persists', 'Arthritis - stable, age-related changes noted', 'Continue current management, monitor for progression', 'Glucosamine & Chondroitin - daily, Omega-3 fatty acids added', 33.8, 38.7, 90, 26, 'Senior blood panel normal. Discussed advanced pain management options. Quality of life good.', 2),
('PET-0003', 'APPT-2026-0001', 1, '2026-01-15', 'Joint pain reassessment', 'Increased difficulty with stairs, slower on walks', 'Arthritis progression - moderate', 'Adjust pain management, consider joint injections', 'Carprofen 50mg - twice daily, Tramadol 25mg - as needed for flare-ups', 33.5, 38.6, 85, 23, 'X-rays show progression of joint degeneration. Discussed quality of life measures and advanced treatment options with owner.', 1);

-- Insert Vaccinations
INSERT INTO vaccinations (pet_id, vaccine_name, vaccine_type, vaccination_date, next_due_date, batch_number, manufacturer, administered_by, notes, created_by) VALUES
-- Dog Vaccinations
('PET-0001', 'DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza)', 'Core', '2024-06-15', '2025-06-15', 'ZTS-DHPP-2024-045', 'Zoetis', 1, NULL, 1),
('PET-0001', 'Rabies', 'Core', '2024-06-15', '2027-06-15', 'ZTS-RAB-2024-078', 'Zoetis', 1, NULL, 1),
('PET-0002', 'DHPP', 'Core', '2024-08-20', '2025-08-20', 'ZTS-DHPP-2024-089', 'Zoetis', 2, 'First puppy vaccine', 2),
('PET-0003', 'DHPP', 'Core', '2023-03-10', '2024-03-10', 'ZTS-DHPP-2023-023', 'Zoetis', 1, 'Due for renewal', 1),
('PET-0003', 'Rabies', 'Core', '2022-03-10', '2025-03-10', 'ZTS-RAB-2022-034', 'Zoetis', 2, NULL, 2),
('PET-0006', 'DHPP', 'Core', '2023-07-22', '2024-07-22', 'ZTS-DHPP-2023-067', 'Zoetis', 1, 'Due for renewal', 1),
('PET-0006', 'Rabies', 'Core', '2023-07-22', '2026-07-22', 'ZTS-RAB-2023-089', 'Zoetis', 1, NULL, 1),
('PET-0009', 'DHPP', 'Core', '2023-12-05', '2024-12-05', 'ZTS-DHPP-2023-125', 'Zoetis', 1, NULL, 1),
('PET-0009', 'Rabies', 'Core', '2022-12-05', '2025-12-05', 'ZTS-RAB-2022-156', 'Zoetis', 2, NULL, 2),
('PET-0011', 'DHPP', 'Core', '2023-06-15', '2024-06-15', 'ZTS-DHPP-2023-056', 'Zoetis', 3, 'Due for renewal', 3),
('PET-0012', 'DHPP', 'Core', '2024-02-18', '2025-02-18', 'ZTS-DHPP-2024-015', 'Zoetis', 1, NULL, 1),
('PET-0012', 'Rabies', 'Core', '2023-02-18', '2026-02-18', 'ZTS-RAB-2023-018', 'Zoetis', 1, NULL, 1),
('PET-0013', 'DHPP', 'Core', '2024-11-05', '2025-11-05', 'ZTS-DHPP-2024-134', 'Zoetis', 2, NULL, 2),
('PET-0013', 'Rabies', 'Core', '2022-11-30', '2025-11-30', 'ZTS-RAB-2022-145', 'Zoetis', 3, NULL, 3),
('PET-0018', 'DHPP', 'Core', '2023-12-25', '2024-12-25', 'ZTS-DHPP-2023-189', 'Zoetis', 1, 'Due for renewal', 1),
('PET-0018', 'Rabies', 'Core', '2023-12-25', '2026-12-25', 'ZTS-RAB-2023-203', 'Zoetis', 1, NULL, 1),
('PET-0022', 'DHPP', 'Core', '2023-08-05', '2024-08-05', 'ZTS-DHPP-2023-098', 'Zoetis', 2, 'Due for renewal', 2),
('PET-0022', 'Rabies', 'Core', '2023-08-05', '2026-08-05', 'ZTS-RAB-2023-112', 'Zoetis', 2, NULL, 2),
('PET-0023', 'DHPP', 'Core', '2023-11-20', '2024-11-20', 'ZTS-DHPP-2023-167', 'Zoetis', 1, 'Due for renewal', 1),
('PET-0023', 'Rabies', 'Core', '2022-11-20', '2025-11-20', 'ZTS-RAB-2022-178', 'Zoetis', 1, NULL, 1),
('PET-0024', 'DHPP', 'Core', '2022-04-12', '2023-04-12', 'ZTS-DHPP-2022-045', 'Zoetis', 3, 'Overdue', 3),
('PET-0026', 'DHPP', 'Core', '2024-09-18', '2025-09-18', 'ZTS-DHPP-2024-112', 'Zoetis', 1, 'First puppy vaccine', 1),
('PET-0028', 'DHPP', 'Core', '2024-03-30', '2025-03-30', 'ZTS-DHPP-2024-034', 'Zoetis', 2, NULL, 2),
('PET-0028', 'Rabies', 'Core', '2023-03-30', '2026-03-30', 'ZTS-RAB-2023-045', 'Zoetis', 2, NULL, 2),
('PET-0031', 'DHPP', 'Core', '2024-07-10', '2025-07-10', 'ZTS-DHPP-2024-078', 'Zoetis', 2, NULL, 2),
('PET-0031', 'Rabies', 'Core', '2024-07-10', '2027-07-10', 'ZTS-RAB-2024-089', 'Zoetis', 2, NULL, 2),
('PET-0038', 'DHPP', 'Core', '2024-09-12', '2025-09-12', 'ZTS-DHPP-2024-105', 'Zoetis', 2, NULL, 2),
('PET-0038', 'Rabies', 'Core', '2024-09-12', '2027-09-12', 'ZTS-RAB-2024-123', 'Zoetis', 2, NULL, 2),
('PET-0039', 'DHPP', 'Core', '2022-03-25', '2023-03-25', 'ZTS-DHPP-2022-034', 'Zoetis', 3, 'Overdue', 3),
('PET-0041', 'DHPP', 'Core', '2022-06-08', '2023-06-08', 'ZTS-DHPP-2022-067', 'Zoetis', 1, 'Overdue', 1),
('PET-0044', 'DHPP', 'Core', '2023-09-30', '2024-09-30', 'ZTS-DHPP-2023-134', 'Zoetis', 2, 'Due for renewal', 2),
('PET-0044', 'Rabies', 'Core', '2023-09-30', '2026-09-30', 'ZTS-RAB-2023-145', 'Zoetis', 2, NULL, 2),
('PET-0050', 'DHPP', 'Core', '2023-10-18', '2024-10-18', 'ZTS-DHPP-2023-145', 'Zoetis', 2, 'Due for renewal', 2),
('PET-0050', 'Rabies', 'Core', '2022-10-18', '2025-10-18', 'ZTS-RAB-2022-167', 'Zoetis', 1, NULL, 1),
('PET-0052', 'DHPP', 'Core', '2021-01-28', '2022-01-28', 'ZTS-DHPP-2021-012', 'Zoetis', 1, 'Overdue', 1),
-- Cat Vaccinations
('PET-0004', 'FVRCP (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia)', 'Core', '2024-07-22', '2025-07-22', 'ZTS-FVRCP-2024-078', 'Zoetis', 3, NULL, 3),
('PET-0004', 'Rabies', 'Core', '2024-07-22', '2027-07-22', 'ZTS-RAB-2024-089', 'Zoetis', 3, NULL, 3),
('PET-0005', 'FVRCP', 'Core', '2023-01-15', '2024-01-15', 'ZTS-FVRCP-2023-012', 'Zoetis', 2, 'Due for renewal', 2),
('PET-0008', 'FVRCP', 'Core', '2024-09-25', '2025-09-25', 'ZTS-FVRCP-2024-112', 'Zoetis', 3, NULL, 3),
('PET-0008', 'Rabies', 'Core', '2024-09-25', '2027-09-25', 'ZTS-RAB-2024-134', 'Zoetis', 3, NULL, 3),
('PET-0010', 'FVRCP', 'Core', '2024-03-20', '2025-03-20', 'ZTS-FVRCP-2024-034', 'Zoetis', 2, NULL, 2),
('PET-0010', 'Rabies', 'Core', '2023-03-20', '2026-03-20', 'ZTS-RAB-2023-045', 'Zoetis', 2, NULL, 2),
('PET-0014', 'FVRCP', 'Core', '2023-09-12', '2024-09-12', 'ZTS-FVRCP-2023-123', 'Zoetis', 3, 'Due for renewal', 3),
('PET-0014', 'Rabies', 'Core', '2023-09-12', '2026-09-12', 'ZTS-RAB-2023-134', 'Zoetis', 3, NULL, 3),
('PET-0016', 'FVRCP', 'Core', '2022-02-20', '2023-02-20', 'ZTS-FVRCP-2022-023', 'Zoetis', 2, 'Overdue', 2),
('PET-0016', 'Rabies', 'Core', '2023-02-20', '2026-02-20', 'ZTS-RAB-2023-034', 'Zoetis', 2, NULL, 2),
('PET-0017', 'FVRCP', 'Core', '2021-07-08', '2022-07-08', 'ZTS-FVRCP-2021-078', 'Zoetis', 3, 'Overdue', 3),
('PET-0017', 'Rabies', 'Core', '2023-07-08', '2026-07-08', 'ZTS-RAB-2023-089', 'Zoetis', 3, NULL, 3),
('PET-0019', 'FVRCP', 'Core', '2024-10-10', '2025-10-10', 'ZTS-FVRCP-2024-134', 'Zoetis', 2, NULL, 2),
('PET-0019', 'Rabies', 'Core', '2024-10-10', '2027-10-10', 'ZTS-RAB-2024-156', 'Zoetis', 2, NULL, 2),
('PET-0021', 'FVRCP', 'Core', '2022-06-18', '2023-06-18', 'ZTS-FVRCP-2022-067', 'Zoetis', 3, 'Overdue', 3),
('PET-0029', 'FVRCP', 'Core', '2022-09-15', '2023-09-15', 'ZTS-FVRCP-2022-123', 'Zoetis', 3, 'Overdue', 3),
('PET-0029', 'Rabies', 'Core', '2024-09-15', '2027-09-15', 'ZTS-RAB-2024-145', 'Zoetis', 3, NULL, 3),
('PET-0030', 'FVRCP', 'Core', '2024-08-20', '2025-08-20', 'ZTS-FVRCP-2024-098', 'Zoetis', 1, 'First kitten vaccine', 1),
('PET-0032', 'FVRCP', 'Core', '2022-10-05', '2023-10-05', 'ZTS-FVRCP-2022-134', 'Zoetis', 3, 'Overdue', 3),
('PET-0032', 'Rabies', 'Core', '2023-10-05', '2026-10-05', 'ZTS-RAB-2023-156', 'Zoetis', 3, NULL, 3),
('PET-0036', 'FVRCP', 'Core', '2022-12-01', '2023-12-01', 'ZTS-FVRCP-2022-167', 'Zoetis', 1, 'Overdue', 1),
('PET-0037', 'FVRCP', 'Core', '2023-08-20', '2024-08-20', 'ZTS-FVRCP-2023-112', 'Zoetis', 3, 'Due for renewal', 3),
('PET-0042', 'FVRCP', 'Core', '2023-02-19', '2024-02-19', 'ZTS-FVRCP-2023-023', 'Zoetis', 1, 'Due for renewal', 1),
('PET-0048', 'FVRCP', 'Core', '2022-08-14', '2023-08-14', 'ZTS-FVRCP-2022-098', 'Zoetis', 1, 'Overdue', 1),
('PET-0048', 'Rabies', 'Core', '2024-08-14', '2027-08-14', 'ZTS-RAB-2024-112', 'Zoetis', 1, NULL, 1);
('PET-0048', 'Rabies', 'Core', '2023-12-22', '2026-12-22', 'ZTS-RAB-2023-189', 'Zoetis', 3, NULL, 3),
('PET-0050', 'FVRCP', 'Core', '2022-04-05', '2023-04-05', 'ZTS-FVRCP-2022-045', 'Zoetis', 1, 'Overdue', 1),
('PET-0050', 'Rabies', 'Core', '2024-04-05', '2027-04-05', 'ZTS-RAB-2024-056', 'Zoetis', 1, NULL, 1);

-- Insert Disease Cases (for ML training - common diseases in Sri Lanka)
INSERT INTO disease_cases (pet_id, disease_name, disease_category, diagnosis_date, species, breed, age_at_diagnosis, severity, outcome, treatment_duration_days, symptoms, region, is_contagious, transmission_method, notes, created_by) VALUES
('PET-0003', 'Osteoarthritis', 'metabolic', '2024-09-10', 'Dog', 'German Shepherd', 5, 'moderate', 'ongoing_treatment', NULL, 'Limping, joint stiffness, reluctance to jump', 'Kurunegala', false, NULL, 'Degenerative joint disease, requires long-term management', 1),
('PET-0005', 'Allergic Dermatitis', 'immune_mediated', '2024-08-15', 'Cat', 'Mixed Breed', 2, 'mild', 'recovered', 14, 'Scratching, redness on belly, hair loss', 'Kurunegala', false, NULL, 'Environmental allergies, responded well to antihistamine', 2),
('PET-0009', 'Hip Dysplasia', 'genetic', '2024-08-30', 'Dog', 'Rottweiler', 4, 'moderate', 'ongoing_treatment', NULL, 'Stiffness, difficulty rising, reduced activity', 'Mawathagama', false, NULL, 'Congenital condition, managing with supplements and pain relief', 1),
('PET-0011', 'Obesity', 'metabolic', '2024-07-15', 'Dog', 'Pomeranian', 2, 'moderate', 'ongoing_treatment', 90, 'Overweight, reduced mobility', 'Wariyapola', false, NULL, 'Weight management program initiated', 3),
('PET-0012', 'Separation Anxiety', 'immune_mediated', '2024-09-22', 'Dog', 'Doberman', 4, 'moderate', 'ongoing_treatment', 60, 'Excessive barking, destructive behavior when alone', 'Mawathagama', false, NULL, 'Behavioral modification and medication prescribed', 1),
('PET-0014', 'Upper Respiratory Infection', 'infectious', '2024-08-12', 'Cat', 'Russian Blue', 4, 'moderate', 'recovered', 10, 'Sneezing, nasal discharge, fever', 'Kurunegala', true, 'Airborne', 'Viral infection, treated with antibiotics for secondary infection', 3),
('PET-0015', 'Chronic Kidney Disease', 'metabolic', '2024-05-20', 'Dog', 'German Shepherd', 9, 'severe', 'deceased', 21, 'Loss of appetite, vomiting, extreme lethargy, dehydration', 'Galgamuwa', false, NULL, 'Advanced stage at diagnosis. Died on June 10, 2024', 1),
('PET-0021', 'Conjunctivitis', 'infectious', '2024-09-05', 'Cat', 'British Shorthair', 3, 'mild', 'recovered', 7, 'Watery eyes, redness, discharge', 'Pannala', false, NULL, 'Bacterial infection cleared with antibiotic ointment', 3),
('PET-0023', 'Atopic Dermatitis', 'immune_mediated', '2024-08-25', 'Dog', 'Black Labrador', 4, 'moderate', 'ongoing_treatment', NULL, 'Itching, red patches, skin inflammation', 'Kurunegala', false, NULL, 'Chronic allergic condition, diet trial ongoing', 2),
('PET-0024', 'Hip Dysplasia', 'genetic', '2024-10-22', 'Dog', 'Bulldog', 3, 'moderate', 'ongoing_treatment', NULL, 'Difficulty rising, lameness, reduced activity', 'Mawathagama', false, NULL, 'Progressive condition, surgery being considered', 3),
('PET-0041', 'Brachycephalic Airway Syndrome', 'genetic', '2024-10-25', 'Dog', 'Pug', 3, 'moderate', 'ongoing_treatment', NULL, 'Snorting, difficulty breathing, heat intolerance', 'Kurunegala', false, NULL, 'Breed-related anatomical condition, managing conservatively', 1),
('PET-0044', 'Flea Allergy Dermatitis', 'parasitic', '2024-09-20', 'Dog', 'Jack Russell Terrier', 4, 'moderate', 'recovered', 14, 'Hot spots, excessive scratching, hair loss', 'Pothuhera', false, 'Flea bite', 'Flea hypersensitivity treated with prevention and steroids', 2),
('PET-0047', 'Acute Renal Failure', 'metabolic', '2024-04-15', 'Dog', 'Rottweiler', 10, 'severe', 'deceased', 56, 'Anorexia, vomiting, severe lethargy, dehydration', 'Melsiripura', false, NULL, 'Despite intensive treatment, died on June 10, 2024', 3),
('PET-0028', 'Periodontal Disease', 'metabolic', '2024-11-08', 'Dog', 'Chow Chow', 4, 'moderate', 'recovered', 1, 'Tartar buildup, gingivitis, bad breath', 'Ibbagamuwa', false, NULL, 'Dental cleaning performed, 2 teeth extracted', 2),
('PET-0039', 'Heart Murmur - Grade 2', 'metabolic', '2024-11-18', 'Dog', 'Cavalier King Charles', 3, 'mild', 'ongoing_treatment', NULL, 'Murmur detected on auscultation, no clinical signs', 'Pannala', false, NULL, 'Monitoring recommended, no treatment needed currently', 3),
('PET-0048', 'Weight Loss - Unexplained', 'metabolic', '2024-11-22', 'Cat', 'Bombay', 3, 'mild', 'ongoing_treatment', NULL, 'Gradual weight loss over 2 months', 'Melsiripura', false, NULL, 'Diagnostic workup ongoing, increased caloric intake prescribed', 1);

-- Insert Inventory Items (Prices in LKR - Sri Lankan Rupees)
INSERT INTO inventory (item_code, item_name, category, sub_category, quantity, unit, unit_cost, selling_price, supplier, supplier_contact, reorder_level, reorder_quantity, requires_prescription, description, created_by) VALUES
('MED-001', 'Amoxicillin 250mg', 'medicine', 'Antibiotic', 500, 'tablets', 25.00, 50.00, 'MediVet Lanka (Pvt) Ltd', '+94112345001', 100, 300, true, 'Broad-spectrum antibiotic for infections', 1),
('MED-002', 'Cetirizine 10mg', 'medicine', 'Antihistamine', 350, 'tablets', 18.00, 35.00, 'MediVet Lanka (Pvt) Ltd', '+94112345001', 80, 250, true, 'For allergic reactions and dermatitis', 1),
('MED-003', 'Carprofen 75mg', 'medicine', 'NSAID', 280, 'tablets', 65.00, 120.00, 'VetPharm Lanka', '+94112345002', 60, 200, true, 'Pain relief and anti-inflammatory', 1),
('MED-004', 'Glucosamine Supplement', 'medicine', 'Joint Supplement', 420, 'tablets', 42.00, 80.00, 'VetPharm Lanka', '+94112345002', 100, 300, false, 'Joint health and arthritis support', 1),
('MED-005', 'Eye Drops (Antibiotic)', 'medicine', 'Ophthalmic', 85, 'bottles', 350.00, 650.00, 'MediVet Lanka (Pvt) Ltd', '+94112345001', 25, 50, true, 'For eye infections and conjunctivitis', 1),
('MED-006', 'Frontline Plus (3 doses)', 'medicine', 'Anti-parasitic', 110, 'boxes', 2200.00, 4000.00, 'VetPharm Lanka', '+94112345002', 30, 80, false, 'Flea and tick treatment', 1),
('MED-007', 'Metronidazole 200mg', 'medicine', 'Antibiotic', 180, 'tablets', 18.00, 40.00, 'MediVet Lanka (Pvt) Ltd', '+94112345001', 50, 150, true, 'Anti-parasitic antibiotic', 1),
('MED-008', 'Doxycycline 100mg', 'medicine', 'Antibiotic', 120, 'tablets', 35.00, 70.00, 'VetPharm Lanka', '+94112345002', 40, 100, true, 'For respiratory infections and tick fever', 1),
('VAC-001', 'Nobivac DHPP Vaccine', 'vaccine', 'Core Vaccine', 75, 'vials', 3500.00, 6500.00, 'Zoetis Lanka (Pvt) Ltd', '+94112345003', 25, 60, true, '4-in-1 dog vaccine (Distemper, Hepatitis, Parvovirus, Parainfluenza)', 1),
('VAC-005', 'Nobivac Rabies Vaccine', 'vaccine', 'Core Vaccine', 68, 'vials', 3200.00, 6000.00, 'Zoetis Lanka (Pvt) Ltd', '+94112345003', 25, 60, true, 'Rabies protection for dogs', 1),
('VAC-007', 'Nobivac FVRCP Vaccine', 'vaccine', 'Core Vaccine', 62, 'vials', 3600.00, 6800.00, 'Zoetis Lanka (Pvt) Ltd', '+94112345003', 20, 50, true, '3-in-1 cat vaccine (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia)', 1),
('VAC-008', 'Nobivac Rabies Vaccine (Cat)', 'vaccine', 'Core Vaccine', 58, 'vials', 3200.00, 6000.00, 'Zoetis Lanka (Pvt) Ltd', '+94112345003', 20, 50, true, 'Rabies protection for cats', 1),
('FOOD-008', 'Pedigree Adult Dog Food 10kg', 'pet_food', 'Dog Food', 42, 'bags', 8200.00, 12500.00, 'Pet Care Lanka', '+94112345004', 15, 40, false, 'Complete nutrition for adult dogs (1+ years)', 1),
('FOOD-008B', 'Pedigree Puppy Food 3kg', 'pet_food', 'Dog Food', 35, 'bags', 3100.00, 4750.00, 'Pet Care Lanka', '+94112345004', 12, 35, false, 'Growth formula for puppies (2-12 months)', 1),
('FOOD-009', 'Royal Canin Kitten Food 2kg', 'pet_food', 'Cat Food', 38, 'bags', 2400.00, 3700.00, 'Pet Care Lanka', '+94112345004', 15, 40, false, 'Specially formulated for kittens (4-12 months)', 1),
('FOOD-009B', 'Royal Canin Adult Cat Food 4kg', 'pet_food', 'Cat Food', 32, 'bags', 3600.00, 5500.00, 'Pet Care Lanka', '+94112345004', 12, 35, false, 'Complete nutrition for adult cats (1-7 years)', 1),
('FOOD-010', 'Whiskas Cat Food 1.4kg', 'pet_food', 'Cat Food', 48, 'bags', 1300.00, 2000.00, 'Pet Care Lanka', '+94112345004', 15, 40, false, 'Dry cat food with tuna flavor', 1),
('FOOD-011', 'Hill''s Science Diet (Weight Management) 7kg', 'pet_food', 'Prescription Diet', 18, 'bags', 5200.00, 7800.00, 'Pet Care Lanka', '+94112345004', 8, 20, false, 'Weight management formula for overweight pets', 1),
('ACC-012', 'Cat Collar - Reflective', 'accessory', 'Collar', 42, 'pcs', 1650.00, 2500.00, 'Pet World Colombo', '+94112345005', 15, 40, false, 'Safety collar with reflective strip', 1),
('ACC-013', 'Cat Litter 5kg', 'accessory', 'Cat Care', 65, 'bags', 980.00, 1500.00, 'Pet Care Lanka', '+94112345004', 20, 50, false, 'Premium clumping cat litter with odor control', 1),
('ACC-014', 'Dog Chew Toy - Rubber Bone', 'accessory', 'Dog Toy', 85, 'pcs', 580.00, 1050.00, 'Pet World Colombo', '+94112345005', 25, 70, false, 'Durable rubber chew toy for dental health', 1),
('ACC-015', 'Dog Leash & Collar Set', 'accessory', 'Leash', 38, 'sets', 2300.00, 3500.00, 'Pet World Colombo', '+94112345005', 12, 30, false, 'Premium leather leash and collar set', 1),
('GROOM-016', 'Pet Shampoo - Medicated 500ml', 'accessory', 'Shampoo', 58, 'bottles', 980.00, 1500.00, 'VetCare Products Lanka', '+94112345006', 15, 40, false, 'Anti-fungal and antibacterial shampoo for skin conditions', 1),
('ACC-017', 'Dog Collar - Medium', 'accessory', 'Collar', 55, 'pcs', 380.00, 750.00, 'Pet World Colombo', '+94112345005', 20, 50, false, 'Adjustable nylon collar for medium dogs', 1),
('ACC-018', 'Dog Leash - 1.5m', 'accessory', 'Leash', 48, 'pcs', 480.00, 900.00, 'Pet World Colombo', '+94112345005', 18, 45, false, 'Strong nylon leash with foam handle', 1),
('TOY-019', 'Cat Feather Toy', 'accessory', 'Cat Toy', 62, 'pcs', 220.00, 450.00, 'Pet World Colombo', '+94112345005', 20, 55, false, 'Interactive feather wand toy for cats', 1),
('GROOM-020', 'Dog Brush - Slicker', 'accessory', 'Grooming Tool', 35, 'pcs', 550.00, 950.00, 'Pet World Colombo', '+94112345005', 12, 30, false, 'Professional slicker brush for detangling', 1),
('SUPP-021', 'Disposable Gloves - Box of 100', 'surgical_supply', 'Medical Supply', 28, 'boxes', 1150.00, 1800.00, 'Medical Supplies Lanka', '+94112345007', 8, 25, false, 'Latex examination gloves - Size M', 1),
('SUPP-022', 'Syringes 5ml - Pack of 100', 'surgical_supply', 'Medical Supply', 22, 'packs', 2350.00, 3500.00, 'Medical Supplies Lanka', '+94112345007', 8, 20, false, 'Sterile disposable syringes with needles', 1),
('SUPP-023', 'Cotton Wool 500g', 'surgical_supply', 'Medical Supply', 45, 'packs', 280.00, 480.00, 'Medical Supplies Lanka', '+94112345007', 15, 35, false, 'Medical grade absorbent cotton', 1),
('SUPP-024', 'Surgical Sutures - Absorbable', 'surgical_supply', 'Surgical', 35, 'packs', 850.00, 1350.00, 'Medical Supplies Lanka', '+94112345007', 10, 25, false, 'Absorbable sutures for internal stitches', 1),
('SUPP-025', 'Surgical Sutures - Non-Absorbable', 'surgical_supply', 'Surgical', 30, 'packs', 750.00, 1200.00, 'Medical Supplies Lanka', '+94112345007', 10, 25, false, 'Non-absorbable sutures for skin closure', 1),
('SUPP-026', 'IV Fluid - Ringer''s Lactate 500ml', 'surgical_supply', 'IV Fluids', 68, 'bottles', 380.00, 650.00, 'Medical Supplies Lanka', '+94112345007', 25, 60, false, 'For fluid therapy and rehydration', 1),
('SUPP-027', 'Bandage Rolls - 3 inch', 'surgical_supply', 'Medical Supply', 85, 'rolls', 120.00, 250.00, 'Medical Supplies Lanka', '+94112345007', 30, 70, false, 'Elastic bandage for wound dressing', 1),
('SUPP-028', 'Surgical Masks - Box of 50', 'surgical_supply', 'Medical Supply', 25, 'boxes', 650.00, 1100.00, 'Medical Supplies Lanka', '+94112345007', 8, 20, false, '3-ply disposable surgical masks', 1);

-- Insert Sample Billing Records (Amounts in LKR)
INSERT INTO billing (bill_number, customer_id, appointment_id, bill_date, subtotal, discount_amount, tax_amount, total_amount, paid_amount, balance_amount, payment_status, payment_method, notes, created_by) VALUES
('INV-2024-0001', 'CUST-0001', 'APPT-2024-0001', '2024-06-15', 14500.00, 0, 0, 14500.00, 14500.00, 0, 'fully_paid', 'card', 'Annual checkup with vaccinations', 4),
('INV-2024-0002', 'CUST-0001', 'APPT-2024-0002', '2024-08-20', 6200.00, 0, 0, 6200.00, 6200.00, 0, 'fully_paid', 'cash', NULL, 4),
('INV-2024-0003', 'CUST-0002', 'APPT-2024-0003', '2024-09-10', 8800.00, 0, 0, 8800.00, 8800.00, 0, 'fully_paid', 'card', 'Joint health consultation', 5),
('INV-2024-0004', 'CUST-0003', 'APPT-2024-0004', '2024-07-22', 11300.00, 0, 0, 11300.00, 11300.00, 0, 'fully_paid', 'bank_transfer', NULL, 4),
('INV-2024-0005', 'CUST-0003', 'APPT-2024-0005', '2024-08-15', 5900.00, 0, 0, 5900.00, 5900.00, 0, 'fully_paid', 'cash', NULL, 5),
('INV-2024-0006', 'CUST-0004', 'APPT-2024-0006', '2024-10-05', 3800.00, 0, 0, 3800.00, 3800.00, 0, 'fully_paid', 'card', 'Follow-up visit', 4),
('INV-2024-0007', 'CUST-0005', 'APPT-2024-0007', '2024-11-12', 5500.00, 0, 0, 5500.00, 5500.00, 0, 'fully_paid', 'cash', NULL, 5),
('INV-2024-0008', 'CUST-0005', 'APPT-2024-0008', '2024-09-25', 14800.00, 0, 0, 14800.00, 14800.00, 0, 'fully_paid', 'card', 'Vaccinations for cat', 4),
('INV-2024-0009', 'CUST-0006', 'APPT-2024-0009', '2024-08-30', 12500.00, 0, 0, 12500.00, 12500.00, 0, 'fully_paid', 'bank_transfer', 'Hip dysplasia management', 5),
('INV-2024-0010', 'CUST-0007', 'APPT-2024-0010', '2024-10-18', 4200.00, 0, 0, 4200.00, 4200.00, 0, 'fully_paid', 'cash', NULL, 4),
('INV-2024-0011', 'CUST-0008', 'APPT-2024-0011', '2024-07-15', 9800.00, 500.00, 0, 9300.00, 9300.00, 0, 'fully_paid', 'card', 'Weight management program discount', 5),
('INV-2024-0012', 'CUST-0009', 'APPT-2024-0012', '2024-09-22', 7200.00, 0, 0, 7200.00, 7200.00, 0, 'fully_paid', 'cash', 'Behavioral consultation', 4),
('INV-2024-0013', 'CUST-0009', 'APPT-2024-0013', '2024-11-05', 8500.00, 0, 0, 8500.00, 8500.00, 0, 'fully_paid', 'card', NULL, 5),
('INV-2024-0014', 'CUST-0010', 'APPT-2024-0014', '2024-08-12', 6700.00, 0, 0, 6700.00, 6700.00, 0, 'fully_paid', 'bank_transfer', 'Respiratory infection treatment', 4),
('INV-2024-0015', 'CUST-0011', 'APPT-2024-0015', '2024-05-20', 45000.00, 0, 0, 45000.00, 45000.00, 0, 'fully_paid', 'bank_transfer', 'Emergency hospitalization 3 days', 5),
('INV-2024-0016', 'CUST-0012', 'APPT-2024-0016', '2024-10-28', 5200.00, 0, 0, 5200.00, 5200.00, 0, 'fully_paid', 'card', NULL, 4),
('INV-2024-0017', 'CUST-0012', 'APPT-2024-0017', '2024-09-14', 3800.00, 0, 0, 3800.00, 3800.00, 0, 'fully_paid', 'cash', 'Grooming service', 5),
('INV-2024-0018', 'CUST-0013', 'APPT-2024-0018', '2024-11-20', 4500.00, 0, 0, 4500.00, 4500.00, 0, 'fully_paid', 'card', 'Post-surgical checkup', 4),
('INV-2024-0019', 'CUST-0013', 'APPT-2024-0019', '2024-10-10', 8000.00, 0, 0, 8000.00, 8000.00, 0, 'fully_paid', 'cash', NULL, 5),
('INV-2024-0020', 'CUST-0014', 'APPT-2024-0020', '2024-09-05', 4800.00, 0, 0, 4800.00, 4800.00, 0, 'fully_paid', 'card', 'Eye infection treatment', 4),
('INV-2024-0021', 'CUST-0015', 'APPT-2024-0021', '2024-11-15', 18500.00, 0, 0, 18500.00, 18500.00, 0, 'fully_paid', 'bank_transfer', 'Neutering surgery package', 5),
('INV-2024-0022', 'CUST-0015', 'APPT-2024-0022', '2024-08-25', 11200.00, 0, 0, 11200.00, 11200.00, 0, 'fully_paid', 'card', 'Allergy management', 4),
('INV-2024-0023', 'CUST-0016', 'APPT-2024-0023', '2024-10-22', 9500.00, 0, 0, 9500.00, 9500.00, 0, 'fully_paid', 'cash', 'Hip dysplasia evaluation', 5),
('INV-2024-0024', 'CUST-0018', 'APPT-2024-0024', '2024-09-18', 11500.00, 1000.00, 0, 10500.00, 10500.00, 0, 'fully_paid', 'card', 'New puppy package discount', 4),
('INV-2024-0025', 'CUST-0019', 'APPT-2024-0025', '2024-11-08', 22000.00, 0, 0, 22000.00, 22000.00, 0, 'fully_paid', 'bank_transfer', 'Dental cleaning under anesthesia', 5),
('INV-2024-0026', 'CUST-0020', 'APPT-2024-0026', '2024-10-15', 4000.00, 0, 0, 4000.00, 4000.00, 0, 'fully_paid', 'cash', NULL, 4),
('INV-2024-0027', 'CUST-0020', 'APPT-2024-0027', '2024-08-20', 8500.00, 0, 0, 8500.00, 8500.00, 0, 'fully_paid', 'card', 'Kitten first vaccines', 5),
('INV-2024-0028', 'CUST-0021', 'APPT-2024-0028', '2024-09-28', 3500.00, 0, 0, 3500.00, 3500.00, 0, 'fully_paid', 'cash', 'Consultation only', 4),
('INV-2024-0029', 'CUST-0022', 'APPT-2024-0029', '2024-11-25', 5800.00, 0, 0, 5800.00, 5800.00, 0, 'fully_paid', 'card', NULL, 5),
('INV-2024-0030', 'CUST-0024', 'APPT-2024-0030', '2024-10-30', 4100.00, 0, 0, 4100.00, 4100.00, 0, 'fully_paid', 'cash', 'Scottish Fold checkup', 4),
('INV-2024-0031', 'CUST-0025', 'APPT-2024-0031', '2024-09-12', 14500.00, 0, 0, 14500.00, 14500.00, 0, 'fully_paid', 'card', 'Annual vaccines', 5),
('INV-2024-0032', 'CUST-0026', 'APPT-2024-0032', '2024-11-18', 4500.00, 0, 0, 4500.00, 4500.00, 0, 'fully_paid', 'cash', 'Heart checkup', 4),
('INV-2024-0033', 'CUST-0027', 'APPT-2024-0033', '2024-10-25', 6200.00, 0, 0, 6200.00, 6200.00, 0, 'fully_paid', 'card', 'Breathing assessment', 5),
('INV-2024-0034', 'CUST-0029', 'APPT-2024-0034', '2024-09-20', 7500.00, 0, 0, 7500.00, 7500.00, 0, 'fully_paid', 'cash', 'Flea treatment', 4),
('INV-2024-0035', 'CUST-0031', 'APPT-2024-0035', '2024-04-15', 38000.00, 0, 0, 38000.00, 38000.00, 0, 'fully_paid', 'bank_transfer', 'Emergency treatment - 2 days', 5),
('INV-2024-0036', 'CUST-0032', 'APPT-2024-0036', '2024-11-22', 5400.00, 0, 0, 5400.00, 5400.00, 0, 'fully_paid', 'card', NULL, 4),
('INV-2024-0037', 'CUST-0033', 'APPT-2024-0037', '2024-10-12', 3800.00, 0, 0, 3800.00, 3800.00, 0, 'fully_paid', 'cash', NULL, 5),
-- Walk-in purchases (no appointment)
('INV-2024-0038', 'CUST-0001', NULL, '2024-11-28', 12500.00, 0, 0, 12500.00, 12500.00, 0, 'fully_paid', 'card', 'Dog food purchase', 4),
('INV-2024-0039', 'CUST-0005', NULL, '2024-10-20', 8500.00, 0, 0, 8500.00, 8500.00, 0, 'fully_paid', 'cash', 'Cat food and litter', 5),
('INV-2024-0040', 'CUST-0013', NULL, '2024-09-30', 5800.00, 0, 0, 5800.00, 5800.00, 0, 'fully_paid', 'card', 'Puppy food', 4),
('INV-2024-0041', 'CUST-0022', NULL, '2024-11-15', 4500.00, 0, 0, 4500.00, 4500.00, 0, 'fully_paid', 'cash', 'Pet supplies', 5),
('INV-2024-0042', 'CUST-0009', NULL, '2024-12-01', 15000.00, 0, 0, 15000.00, 10000.00, 5000.00, 'partially_paid', 'cash', 'Large food order - partial payment', 4);

-- Insert Billing Items
INSERT INTO billing_items (bill_id, item_type, item_id, item_name, quantity, unit_price, discount, total_price) VALUES
-- Bill 1: Annual checkup with vaccinations
(1, 'consultation', NULL, 'Annual Health Checkup - Dr. Dulani', 1, 3500.00, 0, 3500.00),
(1, 'vaccination', 1, 'Nobivac DHPP Vaccine', 1, 6500.00, 0, 6500.00),
(1, 'vaccination', 5, 'Nobivac Rabies Vaccine', 1, 6000.00, 0, 6000.00),
(1, 'service', NULL, 'Vaccination Administration Fee', 2, 750.00, 0, 1500.00),
-- Bill 2: Follow-up visit with medicine
(2, 'consultation', NULL, 'Follow-up Consultation - Dr. Dulani', 1, 3000.00, 0, 3000.00),
(2, 'inventory_item', 1, 'Amoxicillin 250mg', 30, 50.00, 0, 1500.00),
(2, 'inventory_item', 2, 'Cetirizine 10mg', 20, 35.00, 0, 700.00),
(2, 'inventory_item', 10, 'Whiskas Cat Food 1.4kg', 1, 2000.00, 0, 2000.00),
-- Bill 3: Joint health consultation 
(3, 'consultation', NULL, 'Joint Health Consultation - Dr. Nimal', 1, 3500.00, 0, 3500.00),
(3, 'inventory_item', 4, 'Glucosamine Supplement', 60, 80.00, 0, 4800.00),
(3, 'service', NULL, 'X-Ray Examination', 1, 2500.00, 0, 2500.00),
-- Bill 4: Grooming and vaccines
(4, 'consultation', NULL, 'Health Check - Dr. Ayesha', 1, 3500.00, 0, 3500.00),
(4, 'vaccination', 7, 'Nobivac FVRCP Vaccine', 1, 6800.00, 0, 6800.00),
(4, 'service', NULL, 'Grooming Service - Full Package', 1, 2000.00, 0, 2000.00),
-- Bill 5: Follow-up consultation
(5, 'consultation', NULL, 'Follow-up Visit - Dr. Ayesha', 1, 3000.00, 0, 3000.00),
(5, 'inventory_item', 2, 'Cetirizine 10mg', 40, 35.00, 0, 1400.00),
(5, 'inventory_item', 16, 'Pet Shampoo - Medicated 500ml', 1, 1500.00, 0, 1500.00),
-- Bill 6: Senior dog checkup
(6, 'consultation', NULL, 'Senior Pet Consultation - Dr. Nimal', 1, 3500.00, 0, 3500.00),
(6, 'service', NULL, 'Blood Test - Complete Panel', 1, 1800.00, 0, 1800.00),
-- Bill 7: Skin condition treatment
(7, 'consultation', NULL, 'Dermatology Consultation - Dr. Dulani', 1, 3500.00, 0, 3500.00),
(7, 'inventory_item', 3, 'Carprofen 75mg', 30, 120.00, 0, 3600.00),
(7, 'inventory_item', 16, 'Pet Shampoo - Medicated 500ml', 1, 1500.00, 0, 1500.00),
-- Bill 8: Cat vaccines and checkup
(8, 'consultation', NULL, 'Routine Check - Dr. Dulani', 1, 3000.00, 0, 3000.00),
(8, 'vaccination', 7, 'Nobivac FVRCP Vaccine', 1, 6800.00, 0, 6800.00),
(8, 'vaccination', 8, 'Nobivac Rabies Vaccine (Cat)', 1, 6000.00, 0, 6000.00),
(8, 'service', NULL, 'Vaccination Administration Fee', 2, 750.00, 0, 1500.00),
-- Bill 9: Hip dysplasia management
(9, 'consultation', NULL, 'Orthopedic Consultation - Dr. Nimal', 1, 3500.00, 0, 3500.00),
(9, 'inventory_item', 4, 'Glucosamine Supplement', 90, 80.00, 0, 7200.00),
(9, 'service', NULL, 'X-Ray Examination - Hip', 1, 2800.00, 0, 2800.00),
-- Bill 10: Routine checkup
(10, 'consultation', NULL, 'Wellness Check - Dr. Ayesha', 1, 3500.00, 0, 3500.00),
(10, 'inventory_item', 14, 'Dog Chew Toy - Rubber Bone', 1, 700.00, 0, 700.00),
-- Bill 11: Weight management with discount
(11, 'consultation', NULL, 'Weight Management Program - Dr. Dulani', 1, 3500.00, 0, 3500.00),
(11, 'service', NULL, 'Diet Plan & Follow-up (3 months)', 1, 4500.00, 500.00, 4000.00),
(11, 'inventory_item', 11, 'Hill''s Science Diet (Weight Management) 7kg', 1, 7800.00, 0, 7800.00),
-- Bill 12: Behavioral consultation
(12, 'consultation', NULL, 'Behavioral Consultation - Dr. Nimal', 1, 4500.00, 0, 4500.00),
(12, 'service', NULL, 'Behavioral Training Session', 1, 2700.00, 0, 2700.00),
-- Bill 13: Follow-up behavioral visit
(13, 'consultation', NULL, 'Behavioral Follow-up - Dr. Nimal', 1, 3000.00, 0, 3000.00),
(13, 'service', NULL, 'Training Program (Phase 2)', 1, 5500.00, 0, 5500.00),
-- Bill 14: Respiratory infection treatment
(14, 'consultation', NULL, 'Respiratory Consultation - Dr. Ayesha', 1, 3500.00, 0, 3500.00),
(14, 'inventory_item', 1, 'Amoxicillin 250mg', 40, 50.00, 0, 2000.00),
(14, 'service', NULL, 'Nebulization Treatment', 1, 1200.00, 0, 1200.00),
-- Bill 15: Emergency hospitalization
(15, 'consultation', NULL, 'Emergency Consultation - Dr. Dulani', 1, 5000.00, 0, 5000.00),
(15, 'service', NULL, 'Hospitalization (3 days)', 3, 8000.00, 0, 24000.00),
(15, 'service', NULL, 'IV Fluid Therapy', 3, 3000.00, 0, 9000.00),
(15, 'inventory_item', 1, 'Amoxicillin 250mg', 60, 50.00, 0, 3000.00),
(15, 'service', NULL, 'Blood Test - Renal Panel', 1, 4000.00, 0, 4000.00),
-- Bill 16: Regular checkup
(16, 'consultation', NULL, 'Health Check - Dr. Nimal', 1, 3500.00, 0, 3500.00),
(16, 'inventory_item', 9, 'Royal Canin Kitten Food 2kg', 1, 3700.00, 0, 3700.00),
-- Bill 17: Grooming service
(17, 'service', NULL, 'Grooming Service - Premium', 1, 3800.00, 0, 3800.00),
-- Bill 18: Post-surgical checkup
(18, 'consultation', NULL, 'Post-Op Check - Dr. Ayesha', 1, 3000.00, 0, 3000.00),
(18, 'service', NULL, 'Wound Dressing', 1, 1500.00, 0, 1500.00),
-- Bill 19: Surgery follow-up
(19, 'consultation', NULL, 'Surgical Follow-up - Dr. Ayesha', 1, 3500.00, 0, 3500.00),
(19, 'inventory_item', 1, 'Amoxicillin 250mg', 30, 50.00, 0, 1500.00),
(19, 'service', NULL, 'Suture Removal', 1, 1500.00, 0, 1500.00),
(19, 'inventory_item', 12, 'Cat Collar - Reflective', 1, 2500.00, 0, 2500.00),
-- Bill 20: Eye infection treatment
(20, 'consultation', NULL, 'Ophthalmology Consultation - Dr. Nimal', 1, 3500.00, 0, 3500.00),
(20, 'inventory_item', 5, 'Eye Drops (Antibiotic)', 2, 650.00, 0, 1300.00),
-- Bill 21: Neutering surgery
(21, 'consultation', NULL, 'Pre-Surgical Consultation - Dr. Dulani', 1, 3500.00, 0, 3500.00),
(21, 'service', NULL, 'Neutering Surgery', 1, 12000.00, 0, 12000.00),
(21, 'service', NULL, 'Anesthesia', 1, 3000.00, 0, 3000.00),
-- Bill 22: Allergy management
(22, 'consultation', NULL, 'Allergy Consultation - Dr. Nimal', 1, 3500.00, 0, 3500.00),
(22, 'inventory_item', 2, 'Cetirizine 10mg', 60, 35.00, 0, 2100.00),
(22, 'inventory_item', 16, 'Pet Shampoo - Medicated 500ml', 2, 1500.00, 0, 3000.00),
(22, 'service', NULL, 'Allergy Test Panel', 1, 2600.00, 0, 2600.00),
-- Bill 23: Hip evaluation
(23, 'consultation', NULL, 'Orthopedic Evaluation - Dr. Ayesha', 1, 3500.00, 0, 3500.00),
(23, 'service', NULL, 'X-Ray - Hip Joint (Both sides)', 1, 3500.00, 0, 3500.00),
(23, 'inventory_item', 3, 'Carprofen 75mg', 30, 120.00, 0, 3600.00),
-- Bill 24: New puppy package with discount
(24, 'consultation', NULL, 'Puppy First Visit - Dr. Dulani', 1, 3500.00, 0, 3500.00),
(24, 'vaccination', 1, 'Nobivac DHPP Vaccine', 1, 6500.00, 0, 6500.00),
(24, 'service', NULL, 'Vaccination Administration Fee', 1, 750.00, 0, 750.00),
(24, 'inventory_item', 8, 'Pedigree Puppy Food 3kg', 1, 4750.00, 1000.00, 3750.00),
-- Bill 25: Dental cleaning
(25, 'consultation', NULL, 'Dental Consultation - Dr. Nimal', 1, 3500.00, 0, 3500.00),
(25, 'service', NULL, 'Dental Cleaning Under Anesthesia', 1, 15000.00, 0, 15000.00),
(25, 'service', NULL, 'Anesthesia', 1, 3500.00, 0, 3500.00),
-- Bill 26: Routine checkup
(26, 'consultation', NULL, 'Health Check - Dr. Ayesha', 1, 3500.00, 0, 3500.00),
(26, 'service', NULL, 'Nail Trimming', 1, 500.00, 0, 500.00),
-- Bill 27: Kitten vaccines
(27, 'consultation', NULL, 'Kitten First Visit - Dr. Nimal', 1, 3000.00, 0, 3000.00),
(27, 'vaccination', 7, 'Nobivac FVRCP Vaccine', 1, 6800.00, 0, 6800.00),
(27, 'service', NULL, 'Vaccination Administration Fee', 1, 750.00, 0, 750.00),
-- Bill 28: Consultation only
(28, 'consultation', NULL, 'General Consultation - Dr. Dulani', 1, 3500.00, 0, 3500.00),
-- Bill 29: Routine visit
(29, 'consultation', NULL, 'Wellness Check - Dr. Ayesha', 1, 3500.00, 0, 3500.00),
(29, 'inventory_item', 10, 'Whiskas Cat Food 1.4kg', 1, 2000.00, 0, 2000.00),
(29, 'service', NULL, 'Ear Cleaning', 1, 800.00, 0, 800.00),
-- Bill 30: Scottish Fold checkup
(30, 'consultation', NULL, 'Breed-Specific Check - Dr. Nimal', 1, 3500.00, 0, 3500.00),
(30, 'service', NULL, 'Joint Examination', 1, 1600.00, 0, 1600.00),
-- Bill 31: Annual vaccines
(31, 'consultation', NULL, 'Annual Health Check - Dr. Dulani', 1, 3500.00, 0, 3500.00),
(31, 'vaccination', 1, 'Nobivac DHPP Vaccine', 1, 6500.00, 0, 6500.00),
(31, 'vaccination', 5, 'Nobivac Rabies Vaccine', 1, 6000.00, 0, 6000.00),
(31, 'service', NULL, 'Vaccination Administration Fee', 2, 750.00, 0, 1500.00),
-- Bill 32: Heart checkup
(32, 'consultation', NULL, 'Cardiology Consultation - Dr. Ayesha', 1, 3500.00, 0, 3500.00),
(32, 'service', NULL, 'ECG Examination', 1, 2000.00, 0, 2000.00),
-- Bill 33: Breathing assessment
(33, 'consultation', NULL, 'Respiratory Assessment - Dr. Nimal', 1, 3500.00, 0, 3500.00),
(33, 'service', NULL, 'X-Ray - Chest', 1, 2700.00, 0, 2700.00),
-- Bill 34: Flea treatment
(34, 'consultation', NULL, 'Parasite Consultation - Dr. Dulani', 1, 3500.00, 0, 3500.00),
(34, 'inventory_item', 6, 'Frontline Plus (3 doses)', 1, 4000.00, 0, 4000.00),
-- Bill 35: Emergency treatment
(35, 'consultation', NULL, 'Emergency Consultation - Dr. Ayesha', 1, 5000.00, 0, 5000.00),
(35, 'service', NULL, 'Hospitalization (2 days)', 2, 8000.00, 0, 16000.00),
(35, 'service', NULL, 'IV Fluid Therapy', 2, 3000.00, 0, 6000.00),
(35, 'service', NULL, 'Blood Test - Emergency Panel', 1, 5000.00, 0, 5000.00),
(35, 'inventory_item', 1, 'Amoxicillin 250mg', 40, 50.00, 0, 2000.00),
(35, 'service', NULL, 'Supportive Care', 2, 2000.00, 0, 4000.00),
-- Bill 36: Regular checkup
(36, 'consultation', NULL, 'Health Check - Dr. Nimal', 1, 3500.00, 0, 3500.00),
(36, 'inventory_item', 10, 'Whiskas Cat Food 1.4kg', 1, 2000.00, 0, 2000.00),
-- Bill 37: Simple consultation
(37, 'consultation', NULL, 'General Consultation - Dr. Dulani', 1, 3500.00, 0, 3500.00),
(37, 'service', NULL, 'Nail Trimming', 1, 300.00, 0, 300.00),
-- Bill 38: Dog food purchase (walk-in)
(38, 'inventory_item', 8, 'Pedigree Adult Dog Food 10kg', 1, 12500.00, 0, 12500.00),
-- Bill 39: Cat food and litter (walk-in)
(39, 'inventory_item', 9, 'Royal Canin Adult Cat Food 4kg', 1, 5500.00, 0, 5500.00),
(39, 'inventory_item', 13, 'Cat Litter 5kg', 2, 1500.00, 0, 3000.00),
-- Bill 40: Puppy food (walk-in)
(40, 'inventory_item', 8, 'Pedigree Puppy Food 3kg', 1, 4750.00, 0, 4750.00),
(40, 'inventory_item', 14, 'Dog Chew Toy - Rubber Bone', 1, 1050.00, 0, 1050.00),
-- Bill 41: Pet supplies (walk-in)
(41, 'inventory_item', 12, 'Cat Collar - Reflective', 1, 2500.00, 0, 2500.00),
(41, 'inventory_item', 13, 'Cat Litter 5kg', 1, 1500.00, 0, 1500.00),
(41, 'inventory_item', 15, 'Dog Leash & Collar Set', 1, 3500.00, 0, 3500.00),
-- Bill 42: Large food order (walk-in, partial payment)
(42, 'inventory_item', 8, 'Pedigree Adult Dog Food 10kg', 1, 12500.00, 0, 12500.00),
(42, 'inventory_item', 9, 'Royal Canin Adult Cat Food 4kg', 1, 5500.00, 0, 5500.00);

-- Insert Daily Sales Summary (for reports and ML - Amounts in LKR)
INSERT INTO daily_sales_summary (summary_date, total_bills, total_customers, new_customers, total_appointments, completed_appointments, total_revenue, total_paid, total_pending, cash_payments, card_payments, bank_transfer_payments, services_revenue, products_revenue, medicines_revenue, accessories_revenue) VALUES
('2024-04-15', 1, 1, 0, 1, 1, 38000.00, 38000.00, 0, 0, 0, 38000.00, 33000.00, 0, 3000.00, 2000.00),
('2024-05-20', 1, 1, 0, 1, 1, 45000.00, 45000.00, 0, 0, 0, 45000.00, 38000.00, 0, 7000.00, 0),
('2024-06-15', 1, 1, 0, 1, 1, 14500.00, 14500.00, 0, 0, 14500.00, 0, 11750.00, 2000.00, 750.00, 0),
('2024-07-15', 1, 1, 0, 1, 1, 9300.00, 9300.00, 0, 0, 9300.00, 0, 7500.00, 7800.00, 0, 0),
('2024-07-22', 1, 1, 0, 1, 1, 11300.00, 11300.00, 0, 0, 0, 11300.00, 5250.00, 3700.00, 0, 0),
('2024-08-12', 1, 1, 0, 1, 1, 6700.00, 6700.00, 0, 0, 0, 6700.00, 4700.00, 0, 2000.00, 0),
('2024-08-15', 1, 1, 0, 1, 1, 5900.00, 5900.00, 0, 5900.00, 0, 0, 3000.00, 0, 1500.00, 1400.00),
('2024-08-20', 2, 2, 0, 2, 2, 15000.00, 15000.00, 0, 6200.00, 8800.00, 0, 8600.00, 2000.00, 750.00, 0),
('2024-08-25', 1, 1, 0, 1, 1, 11200.00, 11200.00, 0, 0, 11200.00, 0, 6100.00, 3000.00, 2100.00, 0),
('2024-08-30', 1, 1, 0, 1, 1, 12500.00, 12500.00, 0, 0, 0, 12500.00, 6300.00, 0, 10800.00, 0),
('2024-09-05', 1, 1, 0, 1, 1, 4800.00, 4800.00, 0, 0, 4800.00, 0, 3500.00, 0, 1300.00, 0),
('2024-09-10', 1, 1, 0, 1, 1, 8800.00, 8800.00, 0, 0, 8800.00, 0, 6000.00, 0, 7200.00, 0),
('2024-09-12', 1, 1, 0, 1, 1, 14500.00, 14500.00, 0, 0, 14500.00, 0, 5250.00, 0, 0, 0),
('2024-09-14', 1, 1, 0, 1, 1, 3800.00, 3800.00, 0, 3800.00, 0, 0, 3800.00, 0, 0, 0),
('2024-09-18', 1, 1, 0, 1, 1, 10500.00, 10500.00, 0, 0, 10500.00, 0, 4250.00, 3750.00, 0, 0),
('2024-09-20', 1, 1, 0, 1, 1, 7500.00, 7500.00, 0, 7500.00, 0, 0, 3500.00, 4000.00, 0, 0),
('2024-09-22', 1, 1, 0, 1, 1, 7200.00, 7200.00, 0, 7200.00, 0, 0, 7200.00, 0, 0, 0),
('2024-09-25', 1, 1, 0, 1, 1, 14800.00, 14800.00, 0, 0, 14800.00, 0, 11800.00, 0, 0, 0),
('2024-09-28', 1, 1, 0, 1, 1, 3500.00, 3500.00, 0, 3500.00, 0, 0, 3500.00, 0, 0, 0),
('2024-09-30', 1, 1, 0, 0, 0, 5800.00, 5800.00, 0, 0, 5800.00, 0, 0, 5800.00, 0, 0),
('2024-10-05', 1, 1, 0, 1, 1, 3800.00, 3800.00, 0, 0, 3800.00, 0, 3500.00, 700.00, 0, 0),
('2024-10-10', 1, 1, 0, 1, 1, 8000.00, 8000.00, 0, 8000.00, 0, 0, 5000.00, 2500.00, 1500.00, 0),
('2024-10-12', 1, 1, 0, 1, 1, 3800.00, 3800.00, 0, 3800.00, 0, 0, 3800.00, 0, 0, 0),
('2024-10-15', 1, 1, 0, 1, 1, 4000.00, 4000.00, 0, 4000.00, 0, 0, 4000.00, 0, 0, 0),
('2024-10-18', 1, 1, 0, 1, 1, 4200.00, 4200.00, 0, 4200.00, 0, 0, 3500.00, 700.00, 0, 0),
('2024-10-20', 1, 1, 0, 0, 0, 8500.00, 8500.00, 0, 8500.00, 0, 0, 0, 8500.00, 0, 0),
('2024-10-22', 1, 1, 0, 1, 1, 9500.00, 9500.00, 0, 9500.00, 0, 0, 7000.00, 0, 3600.00, 0),
('2024-10-25', 1, 1, 0, 1, 1, 6200.00, 6200.00, 0, 0, 6200.00, 0, 6200.00, 0, 0, 0),
('2024-10-28', 1, 1, 0, 1, 1, 5200.00, 5200.00, 0, 0, 5200.00, 0, 3500.00, 3700.00, 0, 0),
('2024-10-30', 1, 1, 0, 1, 1, 4100.00, 4100.00, 0, 4100.00, 0, 0, 5100.00, 0, 0, 0),
('2024-11-05', 1, 1, 0, 1, 1, 8500.00, 8500.00, 0, 0, 8500.00, 0, 8500.00, 0, 0, 0),
('2024-11-08', 1, 1, 0, 1, 1, 22000.00, 22000.00, 0, 0, 0, 22000.00, 22000.00, 0, 0, 0),
('2024-11-12', 1, 1, 0, 1, 1, 5500.00, 5500.00, 0, 5500.00, 0, 0, 3500.00, 0, 3600.00, 1500.00),
('2024-11-15', 2, 2, 0, 1, 1, 23000.00, 23000.00, 0, 4500.00, 0, 18500.00, 15000.00, 4500.00, 0, 3500.00),
('2024-11-18', 1, 1, 0, 1, 1, 4500.00, 4500.00, 0, 4500.00, 0, 0, 5500.00, 0, 0, 0),
('2024-11-20', 1, 1, 0, 1, 1, 4500.00, 4500.00, 0, 0, 4500.00, 0, 4500.00, 0, 0, 0),
('2024-11-22', 1, 1, 0, 1, 1, 5400.00, 5400.00, 0, 0, 5400.00, 0, 3500.00, 2000.00, 0, 0),
('2024-11-25', 1, 1, 0, 1, 1, 5800.00, 5800.00, 0, 0, 5800.00, 0, 4300.00, 2000.00, 0, 0),
('2024-11-28', 1, 1, 0, 0, 0, 12500.00, 12500.00, 0, 0, 12500.00, 0, 0, 12500.00, 0, 0),
('2024-12-01', 1, 1, 0, 0, 0, 15000.00, 10000.00, 5000.00, 10000.00, 0, 0, 0, 18000.00, 0, 0);

-- Insert System Settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_editable) VALUES
('clinic_name', 'Pro Pet Animal Hospital', 'string', 'Clinic name', true),
('clinic_address', 'Main Street, Mawathagama, Kurunegala District, North Western Province', 'string', 'Clinic full address', true),
('clinic_phone', '+94372222333', 'string', 'Clinic primary contact number', true),
('clinic_mobile', '+94712220001', 'string', 'Clinic mobile number', true),
('clinic_email', 'info@propet.lk', 'string', 'Clinic email address', true),
('clinic_website', 'www.propet.lk', 'string', 'Clinic website URL', true),
('clinic_registration_no', 'VET-NWP-2019-0145', 'string', 'Veterinary clinic registration number', false),
('currency', 'LKR', 'string', 'Currency code', false),
('currency_symbol', 'Rs.', 'string', 'Currency symbol', false),
('appointment_duration_default', '30', 'number', 'Default appointment duration in minutes', true),
('max_appointments_per_slot', '3', 'number', 'Maximum concurrent appointments per time slot', true),
('consultation_fee_default', '3500', 'number', 'Default consultation fee in LKR', true),
('followup_consultation_fee', '3000', 'number', 'Follow-up consultation fee in LKR', true),
('emergency_consultation_fee', '5000', 'number', 'Emergency consultation fee in LKR', true),
('tax_percentage', '0', 'number', 'Tax percentage (currently 0% for veterinary services)', true),
('low_stock_alert_threshold', '20', 'number', 'Alert when stock falls below this quantity', true),
('expiry_alert_days', '30', 'number', 'Alert X days before item expiry', true),
('vaccination_reminder_days', '7', 'number', 'Days before due date to send vaccination reminders', true),
('appointment_reminder_hours', '24', 'number', 'Hours before appointment to send reminders', true),
('business_hours_start', '08:00', 'string', 'Clinic opening time', true),
('business_hours_end', '18:00', 'string', 'Clinic closing time', true),
('lunch_break_start', '13:00', 'string', 'Lunch break start time', true),
('lunch_break_end', '14:00', 'string', 'Lunch break end time', true),
('working_days', 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday', 'string', 'Comma-separated working days', true),
('enable_sms_notifications', 'true', 'boolean', 'Enable SMS notifications for appointments and reminders', true),
('enable_email_notifications', 'true', 'boolean', 'Enable email notifications', true),
('invoice_footer_text', 'Thank you for choosing Pro Pet Animal Hospital. Your pet''s health is our priority!', 'string', 'Footer text on invoices and receipts', true),
('payment_terms_days', '0', 'number', 'Payment terms in days (0 for immediate payment)', true);

-- Update sequences to next available values after seed data
SELECT setval('customers_id_seq', 36, false);
SELECT setval('pets_id_seq', 53, false);
SELECT setval('appointments_id_seq', 56, false);

-- Success message
SELECT 'Seed data inserted successfully! Pro Pet Animal Hospital data loaded.' AS message,
       'All amounts are in Sri Lankan Rupees (LKR)' AS note;