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
      COALESCE(dc.species, p.species) as species,
      COALESCE(dc.breed, p.breed) as breed,
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
      COALESCE(dc.species, p.species) as species,
      COALESCE(dc.breed, p.breed) as breed,
      p.pet_name,
      p.gender as pet_gender,
      p.date_of_birth,
      p.color,
      p.photo_url as pet_image_url,
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
      appointment_id,
      medical_record_id,
      disease_name,
      disease_category,
      diagnosis_date,
      diagnosis_method,
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
      requires_followup,
      followup_type,
      next_followup_date,
      followup_notes,
      created_by,
      updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $23)
    RETURNING *
  `;

  const values = [
    caseData.pet_id,
    caseData.appointment_id || null,
    caseData.medical_record_id || null,
    caseData.disease_name,
    caseData.disease_category || null,
    caseData.diagnosis_date,
    caseData.diagnosis_method || null,
    caseData.species || null,
    caseData.breed || null,
    caseData.age_at_diagnosis || null,
    caseData.severity || null,
    caseData.outcome || null,
    caseData.treatment_duration_days || null,
    caseData.symptoms || null,
    caseData.region || null,
    caseData.is_contagious || false,
    caseData.transmission_method || null,
    caseData.notes || null,
    caseData.requires_followup || false,
    caseData.followup_type || null,
    caseData.next_followup_date || null,
    caseData.followup_notes || null,
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
      appointment_id = $1,
      medical_record_id = $2,
      disease_name = $3,
      disease_category = $4,
      diagnosis_date = $5,
      diagnosis_method = $6,
      species = $7,
      breed = $8,
      age_at_diagnosis = $9,
      severity = $10,
      outcome = $11,
      treatment_duration_days = $12,
      symptoms = $13,
      region = $14,
      is_contagious = $15,
      transmission_method = $16,
      notes = $17,
      requires_followup = $18,
      followup_type = $19,
      next_followup_date = $20,
      followup_notes = $21,
      updated_by = $22,
      updated_at = CURRENT_TIMESTAMP
    WHERE case_id = $23
    RETURNING *
  `;

  const values = [
    caseData.appointment_id || null,
    caseData.medical_record_id || null,
    caseData.disease_name,
    caseData.disease_category || null,
    caseData.diagnosis_date,
    caseData.diagnosis_method || null,
    caseData.species || null,
    caseData.breed || null,
    caseData.age_at_diagnosis || null,
    caseData.severity || null,
    caseData.outcome || null,
    caseData.treatment_duration_days || null,
    caseData.symptoms || null,
    caseData.region || null,
    caseData.is_contagious || false,
    caseData.transmission_method || null,
    caseData.notes || null,
    caseData.requires_followup || false,
    caseData.followup_type || null,
    caseData.next_followup_date || null,
    caseData.followup_notes || null,
    userId,
    caseId
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Get all follow-up visit records for a disease case
 */
export const getFollowupsByCaseId = async (caseId) => {
  const query = `
    SELECT
      f.*,
      CONCAT(u.first_name, ' ', u.last_name) as recorded_by_name
    FROM disease_case_followups f
    LEFT JOIN users u ON f.recorded_by = u.user_id
    WHERE f.case_id = $1
    ORDER BY f.visit_date DESC, f.created_at DESC
  `;
  const result = await pool.query(query, [caseId]);
  return result.rows;
};

/**
 * Record a follow-up visit and update the disease case's next follow-up date
 */
export const addFollowupRecord = async (caseId, data, userId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertResult = await client.query(
      `INSERT INTO disease_case_followups (case_id, visit_date, notes, next_followup_date, recorded_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [caseId, data.visit_date, data.notes, data.next_followup_date || null, userId]
    );

    if (data.next_followup_date) {
      await client.query(
        `UPDATE disease_cases
         SET next_followup_date = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
         WHERE case_id = $3`,
        [data.next_followup_date, userId, caseId]
      );
    } else {
      await client.query(
        `UPDATE disease_cases
         SET requires_followup = false, next_followup_date = null, updated_by = $1, updated_at = CURRENT_TIMESTAMP
         WHERE case_id = $2`,
        [userId, caseId]
      );
    }

    await client.query('COMMIT');
    return insertResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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
 * Write a record to audit_logs
 */
export const logAuditEntry = async ({ userId, action, tableName, recordId, oldValues, newValues, ipAddress, userAgent }) => {
  try {
    const query = `
      INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING log_id
    `;
    const result = await pool.query(query, [
      userId,
      action,
      tableName,
      recordId || null,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      ipAddress || null,
      userAgent || null
    ]);
    return result.rows[0];
  } catch (err) {
    console.error('Audit log write failed (non-fatal):', err.message);
  }
};

/**
 * Get disease statistics
 */
export const getDiseaseStatistics = async ({ dateFrom, dateTo } = {}) => {
  const values = [];
  let where = '';
  if (dateFrom) { values.push(dateFrom); where += ` AND diagnosis_date >= $${values.length}`; }
  if (dateTo)   { values.push(dateTo);   where += ` AND diagnosis_date <= $${values.length}`; }

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
    WHERE 1=1${where}
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Get disease cases by category
 */
export const getDiseaseCasesByCategory = async ({ dateFrom, dateTo } = {}) => {
  const values = [];
  let where = 'WHERE disease_category IS NOT NULL';
  if (dateFrom) { values.push(dateFrom); where += ` AND diagnosis_date >= $${values.length}`; }
  if (dateTo)   { values.push(dateTo);   where += ` AND diagnosis_date <= $${values.length}`; }

  const query = `
    SELECT
      disease_category,
      COUNT(*) as case_count,
      COUNT(CASE WHEN is_contagious = true THEN 1 END) as contagious_count,
      AVG(age_at_diagnosis) as avg_age,
      string_agg(DISTINCT species, ', ') as affected_species
    FROM disease_cases
    ${where}
    GROUP BY disease_category
    ORDER BY case_count DESC
  `;

  const result = await pool.query(query, values);
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
