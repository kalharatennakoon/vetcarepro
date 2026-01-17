-- Add medical records for pets without any

-- Medical records for Bruno (pet_id 21) - Dog
INSERT INTO medical_records (pet_id, veterinarian_id, visit_date, chief_complaint, symptoms, diagnosis, treatment, prescription, weight, temperature, heart_rate, respiratory_rate, notes, created_by) VALUES 
(21, 2, CURRENT_DATE - INTERVAL '30 days', 'Annual checkup', 'None', 'Healthy, no issues found', 'Continue regular diet and exercise', NULL, 28.0, 38.5, 95, 22, 'Pet is in excellent condition', 2),
(21, 3, CURRENT_DATE - INTERVAL '15 days', 'Vaccination', 'None', 'Healthy - DHPP vaccine administered', 'Monitor for 24 hours post-vaccination', NULL, 28.2, 38.4, 92, 20, 'No adverse reactions', 3);

-- Medical records for Max (pet_id 23) - Dog
INSERT INTO medical_records (pet_id, veterinarian_id, visit_date, chief_complaint, symptoms, diagnosis, treatment, prescription, weight, temperature, heart_rate, respiratory_rate, notes, created_by) VALUES 
(23, 2, CURRENT_DATE - INTERVAL '20 days', 'Vaccination', 'None', 'Healthy - Rabies vaccine administered', 'Monitor for any reactions', NULL, 34.5, 38.3, 88, 20, 'Vaccination completed', 2),
(23, 3, CURRENT_DATE - INTERVAL '5 days', 'Minor injury check', 'Limping on front left paw', 'Minor sprain, no fracture', 'Rest for 5-7 days, anti-inflammatory medication', 'Carprofen 75mg - twice daily for 5 days', 34.3, 38.6, 90, 22, 'Follow-up if no improvement', 3);

-- Medical records for Sudu (pet_id 29) - Cat
INSERT INTO medical_records (pet_id, veterinarian_id, visit_date, chief_complaint, symptoms, diagnosis, treatment, prescription, weight, temperature, notes, created_by) VALUES 
(29, 3, CURRENT_DATE - INTERVAL '25 days', 'First visit', 'None', 'Healthy kitten, all vitals normal', 'Continue current diet', NULL, 3.1, 38.4, 'Cat handled well during examination', 3),
(29, 2, CURRENT_DATE - INTERVAL '10 days', 'Vaccination', 'None', 'Healthy - FVRCP vaccine administered', 'Monitor for 24 hours', NULL, 3.3, 38.5, 'No adverse reactions observed', 2);

-- Medical records for Pusa (pet_id 24) - Cat
INSERT INTO medical_records (pet_id, veterinarian_id, visit_date, chief_complaint, symptoms, diagnosis, treatment, prescription, weight, temperature, notes, created_by) VALUES 
(24, 2, CURRENT_DATE - INTERVAL '18 days', 'Upper respiratory symptoms', 'Sneezing, nasal discharge', 'Feline upper respiratory infection', 'Antibiotics and supportive care', 'Doxycycline 50mg - once daily for 10 days', 4.2, 39.1, 'Owner advised to isolate from other cats', 2);

-- Medical records for Lassie (pet_id 22) - Dog
INSERT INTO medical_records (pet_id, veterinarian_id, visit_date, chief_complaint, symptoms, diagnosis, treatment, prescription, weight, temperature, heart_rate, respiratory_rate, notes, created_by) VALUES 
(22, 3, CURRENT_DATE - INTERVAL '12 days', 'Dental cleaning', 'Bad breath, tartar buildup', 'Periodontal disease - stage 2', 'Dental cleaning performed, tooth extraction (1 molar)', NULL, 22.5, 38.7, 85, 18, 'Post-op care instructions provided', 3);

-- Medical records for Rocky (pet_id 28) - Dog
INSERT INTO medical_records (pet_id, veterinarian_id, visit_date, chief_complaint, symptoms, diagnosis, treatment, prescription, weight, temperature, heart_rate, respiratory_rate, notes, created_by) VALUES 
(28, 2, CURRENT_DATE - INTERVAL '8 days', 'Skin irritation', 'Scratching, red patches on skin', 'Allergic dermatitis', 'Topical treatment and dietary changes', 'Hydrocortisone cream - apply twice daily; Antihistamine tablets', 45.2, 38.8, 92, 24, 'Avoid chicken-based foods', 2);

-- Medical records for Charlie (pet_id 26) - Dog
INSERT INTO medical_records (pet_id, veterinarian_id, visit_date, chief_complaint, symptoms, diagnosis, treatment, prescription, weight, temperature, heart_rate, respiratory_rate, notes, created_by) VALUES 
(26, 3, CURRENT_DATE - INTERVAL '28 days', 'Regular checkup', 'None', 'Healthy, slightly overweight', 'Recommend weight management program', NULL, 32.8, 38.6, 88, 22, 'Target weight: 30kg. Reduce food portions by 15%', 3);

-- Medical records for Malu (pet_id 25) - Cat
INSERT INTO medical_records (pet_id, veterinarian_id, visit_date, chief_complaint, symptoms, diagnosis, treatment, prescription, weight, temperature, notes, created_by) VALUES 
(25, 2, CURRENT_DATE - INTERVAL '14 days', 'Spay surgery follow-up', 'None', 'Healing well post-surgery', 'Remove stitches in 3 days', NULL, 3.8, 38.3, 'Recovery progressing normally', 2);

-- Medical records for Tommy (pet_id 30) - Dog
INSERT INTO medical_records (pet_id, veterinarian_id, visit_date, chief_complaint, symptoms, diagnosis, treatment, prescription, weight, temperature, heart_rate, respiratory_rate, notes, created_by) VALUES 
(30, 3, CURRENT_DATE - INTERVAL '22 days', 'Puppy checkup', 'None', 'Healthy puppy, all vitals normal', 'Continue puppy food, schedule next vaccination', NULL, 8.5, 38.7, 110, 28, 'Very energetic and playful', 3);
