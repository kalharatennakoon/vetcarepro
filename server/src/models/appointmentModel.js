import pool from '../config/database.js';

/**
 * Appointment Model
 * Database operations for appointments table
 */

/**
 * Get all appointments with filters
 */
export const getAllAppointments = async (filters = {}) => {
  let query = `
    SELECT 
      a.*,
      c.first_name as customer_first_name,
      c.last_name as customer_last_name,
      c.phone as customer_phone,
      p.pet_name,
      p.species,
      CONCAT(u.first_name, ' ', u.last_name) as veterinarian_name
    FROM appointments a
    INNER JOIN customers c ON a.customer_id = c.customer_id
    INNER JOIN pets p ON a.pet_id = p.pet_id
    LEFT JOIN users u ON a.veterinarian_id = u.user_id
    WHERE 1=1
  `;
  
  const params = [];
  let paramCount = 1;

  if (filters.date) {
    query += ` AND a.appointment_date = $${paramCount}`;
    params.push(filters.date);
    paramCount++;
  }

  if (filters.status) {
    query += ` AND a.status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  }

  if (filters.veterinarian_id) {
    query += ` AND a.veterinarian_id = $${paramCount}`;
    params.push(filters.veterinarian_id);
    paramCount++;
  }

  if (filters.customer_id) {
    query += ` AND a.customer_id = $${paramCount}`;
    params.push(filters.customer_id);
    paramCount++;
  }

  if (filters.pet_id) {
    query += ` AND a.pet_id = $${paramCount}`;
    params.push(filters.pet_id);
    paramCount++;
  }

  query += ` ORDER BY a.appointment_date DESC, a.appointment_time DESC`;

  if (filters.limit) {
    query += ` LIMIT $${paramCount}`;
    params.push(filters.limit);
    paramCount++;
  }

  if (filters.offset) {
    query += ` OFFSET $${paramCount}`;
    params.push(filters.offset);
    paramCount++;
  }

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Get appointment by ID
 */
export const getAppointmentById = async (appointmentId) => {
  const query = `
    SELECT 
      a.*,
      c.first_name as customer_first_name,
      c.last_name as customer_last_name,
      c.phone as customer_phone,
      p.pet_name,
      p.species,
      CONCAT(u.first_name, ' ', u.last_name) as veterinarian_name
    FROM appointments a
    INNER JOIN customers c ON a.customer_id = c.customer_id
    INNER JOIN pets p ON a.pet_id = p.pet_id
    LEFT JOIN users u ON a.veterinarian_id = u.user_id
    WHERE a.appointment_id = $1
  `;

  const result = await pool.query(query, [appointmentId]);
  return result.rows[0] || null;
};

/**
 * Create new appointment
 */
export const createAppointment = async (appointmentData, createdBy) => {
  const query = `
    INSERT INTO appointments (
      customer_id, pet_id, veterinarian_id, appointment_date,
      appointment_time, duration_minutes, appointment_type,
      reason, estimated_cost, status, notes, created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `;

  const values = [
    appointmentData.customer_id,
    appointmentData.pet_id,
    appointmentData.veterinarian_id || null,
    appointmentData.appointment_date,
    appointmentData.appointment_time,
    appointmentData.duration_minutes || 30,
    appointmentData.appointment_type,
    appointmentData.reason,
    appointmentData.estimated_cost || null,
    appointmentData.status || 'scheduled',
    appointmentData.notes || null,
    createdBy
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Update appointment
 */
export const updateAppointment = async (appointmentId, appointmentData, updatedBy) => {
  const fields = [];
  const values = [];
  let paramCount = 1;

  if (appointmentData.customer_id !== undefined) {
    fields.push(`customer_id = $${paramCount}`);
    values.push(appointmentData.customer_id);
    paramCount++;
  }
  if (appointmentData.pet_id !== undefined) {
    fields.push(`pet_id = $${paramCount}`);
    values.push(appointmentData.pet_id);
    paramCount++;
  }
  if (appointmentData.veterinarian_id !== undefined) {
    fields.push(`veterinarian_id = $${paramCount}`);
    values.push(appointmentData.veterinarian_id);
    paramCount++;
  }
  if (appointmentData.appointment_date !== undefined) {
    fields.push(`appointment_date = $${paramCount}`);
    values.push(appointmentData.appointment_date);
    paramCount++;
  }
  if (appointmentData.appointment_time !== undefined) {
    fields.push(`appointment_time = $${paramCount}`);
    values.push(appointmentData.appointment_time);
    paramCount++;
  }
  if (appointmentData.duration_minutes !== undefined) {
    fields.push(`duration_minutes = $${paramCount}`);
    values.push(appointmentData.duration_minutes);
    paramCount++;
  }
  if (appointmentData.appointment_type !== undefined) {
    fields.push(`appointment_type = $${paramCount}`);
    values.push(appointmentData.appointment_type);
    paramCount++;
  }
  if (appointmentData.reason !== undefined) {
    fields.push(`reason = $${paramCount}`);
    values.push(appointmentData.reason);
    paramCount++;
  }
  if (appointmentData.estimated_cost !== undefined) {
    fields.push(`estimated_cost = $${paramCount}`);
    values.push(appointmentData.estimated_cost);
    paramCount++;
  }
  if (appointmentData.status !== undefined) {
    fields.push(`status = $${paramCount}`);
    values.push(appointmentData.status);
    paramCount++;
  }
  if (appointmentData.notes !== undefined) {
    fields.push(`notes = $${paramCount}`);
    values.push(appointmentData.notes);
    paramCount++;
  }
  if (appointmentData.cancellation_reason !== undefined) {
    fields.push(`cancellation_reason = $${paramCount}`);
    values.push(appointmentData.cancellation_reason);
    paramCount++;
  }

  fields.push(`updated_by = $${paramCount}`);
  values.push(updatedBy);
  paramCount++;

  values.push(appointmentId);

  const query = `
    UPDATE appointments 
    SET ${fields.join(', ')}
    WHERE appointment_id = $${paramCount}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Delete appointment
 */
export const deleteAppointment = async (appointmentId) => {
  const query = 'DELETE FROM appointments WHERE appointment_id = $1';
  const result = await pool.query(query, [appointmentId]);
  return result.rowCount > 0;
};

/**
 * Update appointment status
 */
export const updateAppointmentStatus = async (appointmentId, status, updatedBy) => {
  const query = `
    UPDATE appointments 
    SET status = $1, updated_by = $2
    WHERE appointment_id = $3
    RETURNING *
  `;

  const result = await pool.query(query, [status, updatedBy, appointmentId]);
  return result.rows[0];
};

/**
 * Get appointment count
 */
export const getAppointmentCount = async () => {
  const query = 'SELECT COUNT(*) as count FROM appointments';
  const result = await pool.query(query);
  return parseInt(result.rows[0].count);
};

/**
 * Check for appointment conflicts
 */
export const checkAppointmentConflict = async (appointmentData, excludeId = null) => {
  let query = `
    SELECT 1 FROM appointments
    WHERE veterinarian_id = $1
    AND appointment_date = $2
    AND appointment_time = $3
    AND status NOT IN ('cancelled', 'no_show')
  `;
  
  const params = [
    appointmentData.veterinarian_id,
    appointmentData.appointment_date,
    appointmentData.appointment_time
  ];

  if (excludeId) {
    query += ' AND appointment_id != $4';
    params.push(excludeId);
  }

  const result = await pool.query(query, params);
  return result.rows.length > 0;
};
