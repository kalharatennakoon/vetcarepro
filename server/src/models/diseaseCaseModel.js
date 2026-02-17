import pool from '../config/database.js';

/**
 * Disease Case Model
 * Database operations for disease_cases table
 */

/**
 * Get all disease cases with filters
 */
export const getAllDiseaseCases = async (filters = {}) => {
  let query = `
    SELECT 
      dc.*,
      p.pet_name,
      p.gender as pet_gender,
      p.date_of_birth,
      p.color,
      c.customer_id,
      c.first_name as owner_first_name,
      c.last_name as owner_last_name,
      c.phone as owner_phone,
      c.email as owner_email,
      c.address as owner_address,
      c.city as owner_city,
      CONCAT(created_user.first_name, ' ', created_user.last_name) as created_by_name,
      CONCAT(updated_user.first_name, ' ', updated_user.last_name) as updated_by_name
    FROM disease_cases dc
    INNER JOIN pets p ON dc.pet_id = p.pet_id
    INNER JOIN customers c ON p.customer_id = c.customer_id
    LEFT JOIN users created_user ON dc.created_by = created_user.user_id
    LEFT JOIN users updated_user ON dc.updated_by = updated_user.user_id
    WHERE 1=1
  `;

  const values = [];
  let paramCount = 1;

  if (filters.pet_id) {
    query += ` AND dc.pet_id = $${paramCount}`;
    values.push(filters.pet_id);
    paramCount++;
  }

  if (filters.species) {
    query += ` AND dc.species = $${paramCount}`;
    values.push(filters.species);
    paramCount++;
  }

  if (filters.disease_category) {
    query += ` AND dc.disease_category = $${paramCount}`;
    values.push(filters.disease_category);
    paramCount++;
  }

  if (filters.severity) {
    query += ` AND dc.severity = $${paramCount}`;
    values.push(filters.severity);
    paramCount++;
  }

  if (filters.is_contagious !== undefined) {
    query += ` AND dc.is_contagious = $${paramCount}`;
    values.push(filters.is_contagious);
    paramCount++;
  }

  if (filters.outcome) {
    query += ` AND dc.outcome = $${paramCount}`;
    values.push(filters.outcome);
    paramCount++;
  }

  if (filters.region) {
    query += ` AND dc.region = $${paramCount}`;
    values.push(filters.region);
    paramCount++;
  }

  if (filters.diagnosis_date_from) {
    query += ` AND dc.diagnosis_date >= $${paramCount}`;
    values.push(filters.diagnosis_date_from);
    paramCount++;
  }

  if (filters.diagnosis_date_to) {
    query += ` AND dc.diagnosis_date <= $${paramCount}`;
    values.push(filters.diagnosis_date_to);
    paramCount++;
  }

  if (filters.search) {
    query += ` AND (dc.disease_name ILIKE $${paramCount} OR dc.symptoms ILIKE $${paramCount} OR dc.notes ILIKE $${paramCount})`;
    values.push(`%${filters.search}%`);
    paramCount++;
  }

  query += ` ORDER BY dc.diagnosis_date DESC, dc.created_at DESC`;

  if (filters.limit) {
    query += ` LIMIT $${paramCount}`;
    values.push(filters.limit);
    paramCount++;
  }

  if (filters.offset) {
    query += ` OFFSET $${paramCount}`;
    values.push(filters.offset);
  }

  const result = await pool.query(query, values);
  return result.rows;
};

/**
 * Get total count of disease cases with filters
 */
export const getDiseaseCaseCount = async (filters = {}) => {
  let query = `
    SELECT COUNT(*) as total
    FROM disease_cases dc
    WHERE 1=1
  `;

  const values = [];
  let paramCount = 1;

  if (filters.species) {
    query += ` AND dc.species = $${paramCount}`;
    values.push(filters.species);
    paramCount++;
  }

  if (filters.disease_category) {
    query += ` AND dc.disease_category = $${paramCount}`;
    values.push(filters.disease_category);
    paramCount++;
  }

  if (filters.severity) {
    query += ` AND dc.severity = $${paramCount}`;
    values.push(filters.severity);
    paramCount++;
  }

  if (filters.is_contagious !== undefined) {
    query += ` AND dc.is_contagious = $${paramCount}`;
    values.push(filters.is_contagious);
    paramCount++;
  }

  if (filters.search) {
    query += ` AND (dc.disease_name ILIKE $${paramCount} OR dc.symptoms ILIKE $${paramCount} OR dc.notes ILIKE $${paramCount})`;
    values.push(`%${filters.search}%`);
    paramCount++;
  }

  const result = await pool.query(query, values);
  return parseInt(result.rows[0].total);
};

/**
 * Get disease case by ID
 */
export const getDiseaseCaseById = async (caseId) => {
  const query = `
    SELECT 
      dc.*,
      p.pet_name,
      p.gender as pet_gender,
      p.date_of_birth,
      p.color,
      p.image_url as pet_image_url,
      c.customer_id,
      c.first_name as owner_first_name,
      c.last_name as owner_last_name,
      c.phone as owner_phone,
      c.email as owner_email,
      c.address as owner_address,
      c.city as owner_city,
      c.state as owner_state,
      c.zip_code as owner_zip,
      CONCAT(created_user.first_name, ' ', created_user.last_name) as created_by_name,
      CONCAT(updated_user.first_name, ' ', updated_user.last_name) as updated_by_name
    FROM disease_cases dc
    INNER JOIN pets p ON dc.pet_id = p.pet_id
    INNER JOIN customers c ON p.customer_id = c.customer_id
    LEFT JOIN users created_user ON dc.created_by = created_user.user_id
    LEFT JOIN users updated_user ON dc.updated_by = updated_user.user_id
    WHERE dc.case_id = $1
  `;

  const result = await pool.query(query, [caseId]);
  return result.rows[0];
};

/**
 * Get disease cases by pet ID
 */
export const getDiseaseCasesByPetId = async (petId) => {
  const query = `
    SELECT 
      dc.*,
      p.pet_name,
      p.species,
      p.breed
    FROM disease_cases dc
    INNER JOIN pets p ON dc.pet_id = p.pet_id
    WHERE dc.pet_id = $1
    ORDER BY dc.diagnosis_date DESC
  `;

  const result = await pool.query(query, [petId]);
  return result.rows;
};

/**
 * Create new disease case
 */
export const createDiseaseCase = async (caseData, userId) => {
  const query = `
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
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16)
    RETURNING *
  `;

  const values = [
    caseData.pet_id,
    caseData.disease_name,
    caseData.disease_category,
    caseData.diagnosis_date,
    caseData.species,
    caseData.breed,
    caseData.age_at_diagnosis,
    caseData.severity,
    caseData.outcome,
    caseData.treatment_duration_days,
    caseData.symptoms,
    caseData.region,
    caseData.is_contagious || false,
    caseData.transmission_method,
    caseData.notes,
    userId
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Update disease case
 */
export const updateDiseaseCase = async (caseId, caseData, userId) => {
  const query = `
    UPDATE disease_cases
    SET
      disease_name = $1,
      disease_category = $2,
      diagnosis_date = $3,
      species = $4,
      breed = $5,
      age_at_diagnosis = $6,
      severity = $7,
      outcome = $8,
      treatment_duration_days = $9,
      symptoms = $10,
      region = $11,
      is_contagious = $12,
      transmission_method = $13,
      notes = $14,
      updated_by = $15,
      updated_at = CURRENT_TIMESTAMP
    WHERE case_id = $16
    RETURNING *
  `;

  const values = [
    caseData.disease_name,
    caseData.disease_category,
    caseData.diagnosis_date,
    caseData.species,
    caseData.breed,
    caseData.age_at_diagnosis,
    caseData.severity,
    caseData.outcome,
    caseData.treatment_duration_days,
    caseData.symptoms,
    caseData.region,
    caseData.is_contagious,
    caseData.transmission_method,
    caseData.notes,
    userId,
    caseId
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Delete disease case
 */
export const deleteDiseaseCase = async (caseId) => {
  const query = 'DELETE FROM disease_cases WHERE case_id = $1 RETURNING *';
  const result = await pool.query(query, [caseId]);
  return result.rows[0];
};

/**
 * Get disease statistics
 */
export const getDiseaseStatistics = async () => {
  const query = `
    SELECT 
      COUNT(*) as total_cases,
      COUNT(DISTINCT pet_id) as affected_pets,
      COUNT(DISTINCT species) as species_count,
      COUNT(DISTINCT disease_category) as category_count,
      COUNT(CASE WHEN is_contagious = true THEN 1 END) as contagious_cases,
      COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_cases,
      COUNT(CASE WHEN outcome = 'recovered' THEN 1 END) as recovered_cases,
      AVG(age_at_diagnosis) as avg_age_at_diagnosis,
      AVG(treatment_duration_days) as avg_treatment_duration
    FROM disease_cases
  `;

  const result = await pool.query(query);
  return result.rows[0];
};

/**
 * Get disease cases by category
 */
export const getDiseaseCasesByCategory = async () => {
  const query = `
    SELECT 
      disease_category,
      COUNT(*) as case_count,
      COUNT(CASE WHEN is_contagious = true THEN 1 END) as contagious_count,
      AVG(age_at_diagnosis) as avg_age,
      string_agg(DISTINCT species, ', ') as affected_species
    FROM disease_cases
    WHERE disease_category IS NOT NULL
    GROUP BY disease_category
    ORDER BY case_count DESC
  `;

  const result = await pool.query(query);
  return result.rows;
};

/**
 * Get recent disease cases
 */
export const getRecentDiseaseCases = async (days = 30, limit = 10) => {
  const query = `
    SELECT 
      dc.*,
      p.pet_name,
      p.species,
      p.breed,
      c.first_name as owner_first_name,
      c.last_name as owner_last_name,
      c.city as owner_city
    FROM disease_cases dc
    INNER JOIN pets p ON dc.pet_id = p.pet_id
    INNER JOIN customers c ON p.customer_id = c.customer_id
    WHERE dc.diagnosis_date >= CURRENT_DATE - INTERVAL '${days} days'
    ORDER BY dc.diagnosis_date DESC, dc.created_at DESC
    LIMIT $1
  `;

  const result = await pool.query(query, [limit]);
  return result.rows;
};
