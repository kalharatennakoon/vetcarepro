-- Migration: Populate disease_cases from medical_records
-- Purpose: Extract historical disease data for ML training
-- Date: 2026-02-17
-- Phase: Disease Prediction ML - Phase 2

-- This migration extracts disease information from medical_records and populates disease_cases
-- It uses intelligent classification based on diagnosis, symptoms, and treatment data

-- Step 1: Insert disease cases from medical records with basic classification
INSERT INTO disease_cases (
    pet_id,
    disease_name,
    disease_category,
    diagnosis_date,
    species,
    breed,
    age_at_diagnosis,
    severity,
    outcome,
    treatment_duration_days,
    symptoms,
    region,
    is_contagious,
    transmission_method,
    notes,
    created_by,
    updated_by
)
SELECT 
    mr.pet_id,
    -- Extract disease name from diagnosis
    COALESCE(mr.diagnosis, 'Unknown Condition') as disease_name,
    
    -- Classify disease category based on keywords in diagnosis
    CASE 
        -- Infectious diseases
        WHEN LOWER(mr.diagnosis) LIKE '%infection%' 
          OR LOWER(mr.diagnosis) LIKE '%viral%'
          OR LOWER(mr.diagnosis) LIKE '%bacterial%'
          OR LOWER(mr.diagnosis) LIKE '%fungal%'
          OR LOWER(mr.diagnosis) LIKE '%sepsis%'
          OR LOWER(mr.diagnosis) LIKE '%pneumonia%'
          OR LOWER(mr.diagnosis) LIKE '%parvovirus%'
          OR LOWER(mr.diagnosis) LIKE '%distemper%'
          OR LOWER(mr.diagnosis) LIKE '%kennel cough%'
        THEN 'infectious'
        
        -- Parasitic diseases
        WHEN LOWER(mr.diagnosis) LIKE '%parasite%'
          OR LOWER(mr.diagnosis) LIKE '%worm%'
          OR LOWER(mr.diagnosis) LIKE '%flea%'
          OR LOWER(mr.diagnosis) LIKE '%tick%'
          OR LOWER(mr.diagnosis) LIKE '%mange%'
          OR LOWER(mr.diagnosis) LIKE '%heartworm%'
        THEN 'parasitic'
        
        -- Metabolic diseases
        WHEN LOWER(mr.diagnosis) LIKE '%diabetes%'
          OR LOWER(mr.diagnosis) LIKE '%thyroid%'
          OR LOWER(mr.diagnosis) LIKE '%kidney%'
          OR LOWER(mr.diagnosis) LIKE '%liver%'
          OR LOWER(mr.diagnosis) LIKE '%metabolic%'
          OR LOWER(mr.diagnosis) LIKE '%cushings%'
          OR LOWER(mr.diagnosis) LIKE '%addison%'
        THEN 'metabolic'
        
        -- Genetic/Congenital diseases
        WHEN LOWER(mr.diagnosis) LIKE '%genetic%'
          OR LOWER(mr.diagnosis) LIKE '%congenital%'
          OR LOWER(mr.diagnosis) LIKE '%hereditary%'
          OR LOWER(mr.diagnosis) LIKE '%hip dysplasia%'
          OR LOWER(mr.diagnosis) LIKE '%heart defect%'
        THEN 'genetic'
        
        -- Immune-mediated diseases
        WHEN LOWER(mr.diagnosis) LIKE '%allerg%'
          OR LOWER(mr.diagnosis) LIKE '%immune%'
          OR LOWER(mr.diagnosis) LIKE '%autoimmune%'
          OR LOWER(mr.diagnosis) LIKE '%dermatitis%'
        THEN 'immune_mediated'
        
        -- Neoplastic (Cancer)
        WHEN LOWER(mr.diagnosis) LIKE '%cancer%'
          OR LOWER(mr.diagnosis) LIKE '%tumor%'
          OR LOWER(mr.diagnosis) LIKE '%neoplasm%'
          OR LOWER(mr.diagnosis) LIKE '%lymphoma%'
          OR LOWER(mr.diagnosis) LIKE '%carcinoma%'
        THEN 'neoplastic'
        
        -- Traumatic injuries
        WHEN LOWER(mr.diagnosis) LIKE '%fracture%'
          OR LOWER(mr.diagnosis) LIKE '%wound%'
          OR LOWER(mr.diagnosis) LIKE '%injury%'
          OR LOWER(mr.diagnosis) LIKE '%trauma%'
          OR LOWER(mr.diagnosis) LIKE '%bite%'
          OR LOWER(mr.diagnosis) LIKE '%laceration%'
        THEN 'traumatic'
        
        -- Nutritional
        WHEN LOWER(mr.diagnosis) LIKE '%nutrition%'
          OR LOWER(mr.diagnosis) LIKE '%deficiency%'
          OR LOWER(mr.diagnosis) LIKE '%malnutrition%'
          OR LOWER(mr.diagnosis) LIKE '%obesity%'
        THEN 'nutritional'
        
        -- Default to metabolic if no clear category
        ELSE 'metabolic'
    END as disease_category,
    
    -- Diagnosis date from visit date
    mr.visit_date as diagnosis_date,
    
    -- Get species from pet table
    p.species,
    p.breed,
    
    -- Calculate age at diagnosis (in months)
    EXTRACT(YEAR FROM AGE(mr.visit_date, p.date_of_birth)) * 12 + 
    EXTRACT(MONTH FROM AGE(mr.visit_date, p.date_of_birth)) as age_at_diagnosis,
    
    -- Determine severity from symptoms and vital signs
    CASE
        WHEN mr.temperature > 40.5 OR mr.temperature < 37.0 
          OR mr.heart_rate > 180 OR mr.heart_rate < 60
          OR mr.respiratory_rate > 40 OR mr.respiratory_rate < 10
        THEN 'severe'
        WHEN mr.temperature > 39.5 OR mr.temperature < 37.5
          OR mr.heart_rate > 150 OR mr.heart_rate < 80
          OR mr.respiratory_rate > 30 OR mr.respiratory_rate < 15
        THEN 'moderate'
        WHEN mr.temperature IS NOT NULL OR mr.symptoms IS NOT NULL
        THEN 'mild'
        ELSE 'moderate'
    END as severity,
    
    -- Default outcome (can be updated later)
    CASE
        WHEN mr.follow_up_required = true THEN 'ongoing_treatment'
        ELSE 'recovered'
    END as outcome,
    
    -- Treatment duration (if follow-up date exists)
    CASE 
        WHEN mr.follow_up_date IS NOT NULL 
        THEN EXTRACT(DAY FROM (mr.follow_up_date - mr.visit_date))::INTEGER
        ELSE NULL
    END as treatment_duration_days,
    
    -- Symptoms from medical record
    mr.symptoms as symptoms,
    
    -- Get region from customer address
    c.city as region,
    
    -- Determine if contagious based on disease type
    CASE 
        WHEN LOWER(mr.diagnosis) LIKE '%infection%'
          OR LOWER(mr.diagnosis) LIKE '%viral%'
          OR LOWER(mr.diagnosis) LIKE '%bacterial%'
          OR LOWER(mr.diagnosis) LIKE '%parvovirus%'
          OR LOWER(mr.diagnosis) LIKE '%distemper%'
          OR LOWER(mr.diagnosis) LIKE '%kennel cough%'
          OR LOWER(mr.diagnosis) LIKE '%contagious%'
        THEN true
        ELSE false
    END as is_contagious,
    
    -- Transmission method for contagious diseases
    CASE 
        WHEN LOWER(mr.diagnosis) LIKE '%airborne%' OR LOWER(mr.diagnosis) LIKE '%respiratory%'
          OR LOWER(mr.diagnosis) LIKE '%kennel cough%'
        THEN 'airborne'
        WHEN LOWER(mr.diagnosis) LIKE '%contact%' OR LOWER(mr.diagnosis) LIKE '%skin%'
        THEN 'direct_contact'
        WHEN LOWER(mr.diagnosis) LIKE '%fecal%' OR LOWER(mr.diagnosis) LIKE '%oral%'
          OR LOWER(mr.diagnosis) LIKE '%parvovirus%'
        THEN 'fecal_oral'
        WHEN LOWER(mr.diagnosis) LIKE '%vector%' OR LOWER(mr.diagnosis) LIKE '%tick%'
          OR LOWER(mr.diagnosis) LIKE '%mosquito%'
        THEN 'vector_borne'
        ELSE NULL
    END as transmission_method,
    
    -- Combine chief complaint and notes
    CONCAT_WS(' | ', 
        'Chief Complaint: ' || mr.chief_complaint,
        'Treatment: ' || mr.treatment,
        'Prescription: ' || mr.prescription,
        'Notes: ' || mr.notes
    ) as notes,
    
    -- Created by the vet who made the record
    mr.veterinarian_id as created_by,
    mr.veterinarian_id as updated_by

FROM medical_records mr
JOIN pets p ON mr.pet_id = p.pet_id
JOIN customers c ON p.customer_id = c.customer_id
WHERE mr.diagnosis IS NOT NULL 
  AND mr.diagnosis != ''
  AND mr.diagnosis != 'N/A'
  -- Avoid duplicates
  AND NOT EXISTS (
    SELECT 1 FROM disease_cases dc 
    WHERE dc.pet_id = mr.pet_id 
      AND dc.disease_name = mr.diagnosis
      AND dc.diagnosis_date = mr.visit_date
  )
ORDER BY mr.visit_date DESC;
    infectious_count INTEGER;
    parasitic_count INTEGER;
    metabolic_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_cases FROM disease_cases;
    SELECT COUNT(*) INTO infectious_count FROM disease_cases WHERE disease_category = 'infectious';
    SELECT COUNT(*) INTO parasitic_count FROM disease_cases WHERE disease_category = 'parasitic';
    SELECT COUNT(*) INTO metabolic_count FROM disease_cases WHERE disease_category = 'metabolic';
    
    RAISE NOTICE '=== Disease Cases Migration Summary ===';
    RAISE NOTICE 'Total disease cases imported: %', total_cases;
    RAISE NOTICE 'Infectious diseases: %', infectious_count;
    RAISE NOTICE 'Parasitic diseases: %', parasitic_count;
    RAISE NOTICE 'Metabolic diseases: %', metabolic_count;
    RAISE NOTICE '====================================';
END $$;

-- Step 3: Verify data quality
SELECT 
    disease_category,
    COUNT(*) as case_count,
    COUNT(DISTINCT species) as species_affected,
    AVG(age_at_diagnosis)::INTEGER as avg_age_months,
    SUM(CASE WHEN is_contagious THEN 1 ELSE 0 END) as contagious_cases
FROM disease_cases
GROUP BY disease_category
ORDER BY case_count DESC;
