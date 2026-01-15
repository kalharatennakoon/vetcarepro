import pool from '../config/database.js';

/**
 * Medical Record Model
 * Database operations for medical_records table
 */

/**
 * Get all medical records with filters
 */
export const getAllMedicalRecords = async (filters = {}) => {
  let query = `
    SELECT 
      mr.*,
      p.pet_name,
      p.species,
      p.breed,
      c.first_name as owner_first_name,
      c.last_name as owner_last_name,
      CONCAT(u.first_name, ' ', u.last_name) as veterinarian_name,
      a.appointment_date,
      a.appointment_time
    FROM medical_records mr
    INNER JOIN pets p ON mr.pet_id = p.pet_id
    INNER JOIN customers c ON p.customer_id = c.customer_id
    INNER JOIN users u ON mr.veterinarian_id = u.user_id
    LEFT JOIN appointments a ON mr.appointment_id = a.appointment_id
    WHERE 1=1
  `;

  const values = [];
  let paramCount = 1;

  if (filters.pet_id) {
    query += ` AND mr.pet_id = $${paramCount}`;
    values.push(filters.pet_id);
    paramCount++;
  }

  if (filters.veterinarian_id) {
    query += ` AND mr.veterinarian_id = $${paramCount}`;
    values.push(filters.veterinarian_id);
    paramCount++;
  }

  if (filters.visit_date_from) {
    query += ` AND mr.visit_date >= $${paramCount}`;
    values.push(filters.visit_date_from);
    paramCount++;
  }

  if (filters.visit_date_to) {
    query += ` AND mr.visit_date <= $${paramCount}`;
    values.push(filters.visit_date_to);
    paramCount++;
  }

  if (filters.diagnosis) {
    query += ` AND mr.diagnosis ILIKE $${paramCount}`;
    values.push(`%${filters.diagnosis}%`);
    paramCount++;
  }

  if (filters.follow_up_required !== undefined) {
    query += ` AND mr.follow_up_required = $${paramCount}`;
    values.push(filters.follow_up_required);
    paramCount++;
  }

  query += ` ORDER BY mr.visit_date DESC, mr.created_at DESC`;

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
 * Get medical record by ID
 */
export const getMedicalRecordById = async (recordId) => {
  const query = `
    SELECT 
      mr.*,
      p.pet_name,
      p.species,
      p.breed,
      p.gender,
      p.date_of_birth,
      c.customer_id,
      c.first_name as owner_first_name,
      c.last_name as owner_last_name,
      c.phone as owner_phone,
      CONCAT(u.first_name, ' ', u.last_name) as veterinarian_name,
      u.specialization as veterinarian_specialization,
      a.appointment_date,
      a.appointment_time,
      a.reason as appointment_reason
    FROM medical_records mr
    INNER JOIN pets p ON mr.pet_id = p.pet_id
    INNER JOIN customers c ON p.customer_id = c.customer_id
    INNER JOIN users u ON mr.veterinarian_id = u.user_id
    LEFT JOIN appointments a ON mr.appointment_id = a.appointment_id
    WHERE mr.record_id = $1
  `;

  const result = await pool.query(query, [recordId]);
  return result.rows[0] || null;
};

/**
 * Create new medical record
 */
export const createMedicalRecord = async (recordData, createdBy) => {
  const query = `
    INSERT INTO medical_records (
      pet_id, appointment_id, veterinarian_id, visit_date,
      chief_complaint, symptoms, diagnosis, treatment, prescription,
      lab_tests, lab_results, weight, temperature, heart_rate, respiratory_rate,
      follow_up_required, follow_up_date, notes, created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    RETURNING *
  `;

  const values = [
    recordData.pet_id,
    recordData.appointment_id || null,
    recordData.veterinarian_id,
    recordData.visit_date,
    recordData.chief_complaint || null,
    recordData.symptoms || null,
    recordData.diagnosis,
    recordData.treatment || null,
    recordData.prescription || null,
    recordData.lab_tests || null,
    recordData.lab_results || null,
    recordData.weight || null,
    recordData.temperature || null,
    recordData.heart_rate || null,
    recordData.respiratory_rate || null,
    recordData.follow_up_required || false,
    recordData.follow_up_date || null,
    recordData.notes || null,
    createdBy
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Update medical record
 */
export const updateMedicalRecord = async (recordId, recordData, updatedBy) => {
  const fields = [];
  const values = [];
  let paramCount = 1;

  // Build dynamic update query
  const updateFields = [
    'pet_id', 'appointment_id', 'veterinarian_id', 'visit_date',
    'chief_complaint', 'symptoms', 'diagnosis', 'treatment', 'prescription',
    'lab_tests', 'lab_results', 'weight', 'temperature', 'heart_rate', 
    'respiratory_rate', 'follow_up_required', 'follow_up_date', 'notes'
  ];

  updateFields.forEach(field => {
    if (recordData[field] !== undefined) {
      fields.push(`${field} = $${paramCount}`);
      values.push(recordData[field]);
      paramCount++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  fields.push(`updated_by = $${paramCount}`);
  values.push(updatedBy);
  paramCount++;

  values.push(recordId);

  const query = `
    UPDATE medical_records 
    SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE record_id = $${paramCount}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Delete medical record
 */
export const deleteMedicalRecord = async (recordId) => {
  const query = 'DELETE FROM medical_records WHERE record_id = $1 RETURNING *';
  const result = await pool.query(query, [recordId]);
  return result.rows[0];
};

/**
 * Get medical records for a specific pet
 */
export const getMedicalRecordsByPetId = async (petId) => {
  const query = `
    SELECT 
      mr.*,
      CONCAT(u.first_name, ' ', u.last_name) as veterinarian_name,
      a.appointment_date,
      a.appointment_time
    FROM medical_records mr
    INNER JOIN users u ON mr.veterinarian_id = u.user_id
    LEFT JOIN appointments a ON mr.appointment_id = a.appointment_id
    WHERE mr.pet_id = $1
    ORDER BY mr.visit_date DESC, mr.created_at DESC
  `;

  const result = await pool.query(query, [petId]);
  return result.rows;
};

/**
 * Get records requiring follow-up
 */
export const getRecordsRequiringFollowUp = async () => {
  const query = `
    SELECT 
      mr.*,
      p.pet_name,
      p.species,
      c.first_name as owner_first_name,
      c.last_name as owner_last_name,
      c.phone as owner_phone,
      CONCAT(u.first_name, ' ', u.last_name) as veterinarian_name
    FROM medical_records mr
    INNER JOIN pets p ON mr.pet_id = p.pet_id
    INNER JOIN customers c ON p.customer_id = c.customer_id
    INNER JOIN users u ON mr.veterinarian_id = u.user_id
    WHERE mr.follow_up_required = true 
    AND (mr.follow_up_date IS NULL OR mr.follow_up_date >= CURRENT_DATE)
    ORDER BY mr.follow_up_date ASC NULLS LAST
  `;

  const result = await pool.query(query);
  return result.rows;
};

/**
 * Get vital signs history for a pet
 */
export const getVitalSignsHistory = async (petId, limit = 10) => {
  const query = `
    SELECT 
      visit_date,
      weight,
      temperature,
      heart_rate,
      respiratory_rate
    FROM medical_records
    WHERE pet_id = $1
    AND (weight IS NOT NULL OR temperature IS NOT NULL 
         OR heart_rate IS NOT NULL OR respiratory_rate IS NOT NULL)
    ORDER BY visit_date DESC
    LIMIT $2
  `;

  const result = await pool.query(query, [petId, limit]);
  return result.rows;
};

/**
 * Get medical record count
 */
export const getMedicalRecordCount = async () => {
  const query = 'SELECT COUNT(*) as count FROM medical_records';
  const result = await pool.query(query);
  return parseInt(result.rows[0].count);
};
