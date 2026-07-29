import crypto from 'crypto';
import pool from '../config/database.js';
import { hashPassword } from '../utils/authUtils.js';

/**
 * Customer Model
 * Database operations for customers table
 */

/**
 * Get all customers with optional filters and search
 */
export const getAllCustomers = async (filters = {}) => {
  let query = `
    SELECT c.*, 
           COUNT(p.pet_id) as pet_count
    FROM customers c
    LEFT JOIN pets p ON c.customer_id = p.customer_id AND p.is_active = true
    WHERE 1=1
  `;
  
  const params = [];
  let paramCount = 1;

  // Search by name, phone, or email
  if (filters.search) {
    query += ` AND (
      c.first_name ILIKE $${paramCount} OR 
      c.last_name ILIKE $${paramCount} OR 
      c.phone ILIKE $${paramCount} OR 
      c.email ILIKE $${paramCount}
    )`;
    params.push(`%${filters.search}%`);
    paramCount++;
  }

  // Filter by active status
  if (filters.is_active !== undefined) {
    query += ` AND c.is_active = $${paramCount}`;
    params.push(filters.is_active);
    paramCount++;
  }

  // Filter by city
  if (filters.city) {
    query += ` AND c.city = $${paramCount}`;
    params.push(filters.city);
    paramCount++;
  }

  query += ` GROUP BY c.customer_id ORDER BY c.created_at DESC`;

  // Pagination
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
 * Get customer by ID with their pets
 */
export const getCustomerById = async (customerId) => {
  const customerQuery = `
    SELECT * FROM customers WHERE customer_id = $1
  `;
  
  const petsQuery = `
    SELECT * FROM pets 
    WHERE customer_id = $1 AND is_active = true
    ORDER BY created_at DESC
  `;

  const customerResult = await pool.query(customerQuery, [customerId]);
  if (customerResult.rows.length === 0) return null;

  const petsResult = await pool.query(petsQuery, [customerId]);

  return {
    ...customerResult.rows[0],
    pets: petsResult.rows
  };
};

/**
 * Create new customer
 * Every new customer starts with password_must_change = true and an
 * unguessable random password hash - they can't log in with it directly.
 * Portal access is unlocked by verifying identity (email + phone) via
 * POST /api/customer-auth/verify-identity and then setting their own
 * password via POST /api/customer-auth/set-password.
 */
export const createCustomer = async (customerData, createdBy) => {
  const randomPassword = crypto.randomBytes(32).toString('hex');
  const defaultPasswordHash = await hashPassword(randomPassword);

  const query = `
    INSERT INTO customers (
      first_name, last_name, email, phone, alternate_phone,
      address, city, postal_code, nic, emergency_contact,
      emergency_phone, preferred_contact_method, notes, created_by,
      password_hash, password_must_change
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true)
    RETURNING *
  `;

  const values = [
    customerData.first_name,
    customerData.last_name,
    customerData.email || null,
    customerData.phone,
    customerData.alternate_phone || null,
    customerData.address || null,
    customerData.city || null,
    customerData.postal_code || null,
    customerData.nic || null,
    customerData.emergency_contact || null,
    customerData.emergency_phone || null,
    customerData.preferred_contact_method || 'phone',
    customerData.notes || null,
    createdBy,
    defaultPasswordHash
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Update customer
 */
export const updateCustomer = async (customerId, customerData, updatedBy) => {
  const fields = [];
  const values = [];
  let paramCount = 1;

  if (customerData.first_name) {
    fields.push(`first_name = $${paramCount}`);
    values.push(customerData.first_name);
    paramCount++;
  }
  if (customerData.last_name) {
    fields.push(`last_name = $${paramCount}`);
    values.push(customerData.last_name);
    paramCount++;
  }
  if (customerData.email !== undefined) {
    fields.push(`email = $${paramCount}`);
    values.push(customerData.email);
    paramCount++;
  }
  if (customerData.phone) {
    fields.push(`phone = $${paramCount}`);
    values.push(customerData.phone);
    paramCount++;
  }
  if (customerData.alternate_phone !== undefined) {
    fields.push(`alternate_phone = $${paramCount}`);
    values.push(customerData.alternate_phone);
    paramCount++;
  }
  if (customerData.address !== undefined) {
    fields.push(`address = $${paramCount}`);
    values.push(customerData.address);
    paramCount++;
  }
  if (customerData.city !== undefined) {
    fields.push(`city = $${paramCount}`);
    values.push(customerData.city);
    paramCount++;
  }
  if (customerData.postal_code !== undefined) {
    fields.push(`postal_code = $${paramCount}`);
    values.push(customerData.postal_code);
    paramCount++;
  }
  if (customerData.nic !== undefined) {
    fields.push(`nic = $${paramCount}`);
    values.push(customerData.nic);
    paramCount++;
  }
  if (customerData.emergency_contact !== undefined) {
    fields.push(`emergency_contact = $${paramCount}`);
    values.push(customerData.emergency_contact);
    paramCount++;
  }
  if (customerData.emergency_phone !== undefined) {
    fields.push(`emergency_phone = $${paramCount}`);
    values.push(customerData.emergency_phone);
    paramCount++;
  }
  if (customerData.preferred_contact_method) {
    fields.push(`preferred_contact_method = $${paramCount}`);
    values.push(customerData.preferred_contact_method);
    paramCount++;
  }
  if (customerData.notes !== undefined) {
    fields.push(`notes = $${paramCount}`);
    values.push(customerData.notes);
    paramCount++;
  }
  if (customerData.is_active !== undefined) {
    fields.push(`is_active = $${paramCount}`);
    values.push(customerData.is_active);
    paramCount++;
  }

  fields.push(`updated_by = $${paramCount}`);
  values.push(updatedBy);
  paramCount++;

  values.push(customerId);

  const query = `
    UPDATE customers 
    SET ${fields.join(', ')}
    WHERE customer_id = $${paramCount}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Delete customer (soft delete)
 */
export const deleteCustomer = async (customerId) => {
  const query = 'UPDATE customers SET is_active = false, deactivated_at = NOW() WHERE customer_id = $1';
  const result = await pool.query(query, [customerId]);
  return result.rowCount > 0;
};

/**
 * Check if phone exists
 */
export const phoneExists = async (phone, excludeCustomerId = null) => {
  let query = 'SELECT 1 FROM customers WHERE phone = $1';
  const params = [phone];
  if (excludeCustomerId) {
    query += ' AND customer_id <> $2';
    params.push(excludeCustomerId);
  }
  const result = await pool.query(query, params);
  return result.rows.length > 0;
};

/**
 * Check if email exists (only when a value is provided)
 */
export const emailExists = async (email, excludeCustomerId = null) => {
  if (!email) return false;
  let query = 'SELECT 1 FROM customers WHERE email = $1';
  const params = [email];
  if (excludeCustomerId) {
    query += ' AND customer_id <> $2';
    params.push(excludeCustomerId);
  }
  const result = await pool.query(query, params);
  return result.rows.length > 0;
};

/**
 * Check if NIC exists (only when a value is provided)
 */
export const nicExists = async (nic, excludeCustomerId = null) => {
  if (!nic) return false;
  let query = 'SELECT 1 FROM customers WHERE nic = $1';
  const params = [nic];
  if (excludeCustomerId) {
    query += ' AND customer_id <> $2';
    params.push(excludeCustomerId);
  }
  const result = await pool.query(query, params);
  return result.rows.length > 0;
};

/**
 * Get customer count
 */
export const getCustomerCount = async () => {
  const query = 'SELECT COUNT(*) as count FROM customers WHERE is_active = true';
  const result = await pool.query(query);
  return parseInt(result.rows[0].count);
};

/**
 * Check if customer can be deleted or must be inactivated
 */
export const checkCustomerDeletability = async (customerId) => {
  const query = `
    SELECT
      (SELECT COUNT(*) FROM appointments a JOIN pets p ON a.pet_id = p.pet_id WHERE p.customer_id = $1 AND a.status IN ('confirmed','in_progress'))::int AS active_appointments,
      (SELECT COUNT(*) FROM appointments a JOIN pets p ON a.pet_id = p.pet_id WHERE p.customer_id = $1)::int AS total_appointments,
      (SELECT COUNT(*) FROM medical_records mr JOIN pets p ON mr.pet_id = p.pet_id WHERE p.customer_id = $1)::int AS medical_records,
      (SELECT COUNT(*) FROM vaccinations v JOIN pets p ON v.pet_id = p.pet_id WHERE p.customer_id = $1)::int AS vaccinations,
      (SELECT COUNT(*) FROM billing b JOIN appointments a ON b.appointment_id = a.appointment_id JOIN pets p ON a.pet_id = p.pet_id WHERE p.customer_id = $1)::int AS billing_records,
      (SELECT COUNT(*) FROM pets WHERE customer_id = $1)::int AS total_pets
  `;
  const result = await pool.query(query, [customerId]);
  return result.rows[0];
};

/**
 * Inactivate customer with reason (audit trail)
 */
export const inactivateCustomer = async (customerId, { reason, additionalNote }, updatedBy) => {
  const reasonLabels = {
    no_longer_customer: 'No longer a customer',
    transferred: 'Transferred to another clinic',
    incorrectly_created: 'Incorrectly created',
    other: 'Other'
  };
  const label = reasonLabels[reason] || reason;
  const dateStr = new Date().toISOString().split('T')[0];
  const auditEntry = `\nINACTIVATED (${label}) on ${dateStr}${additionalNote ? ': ' + additionalNote : ''}`;

  const query = `
    UPDATE customers
    SET
      is_active = false,
      deactivated_at = NOW(),
      notes = COALESCE(notes, '') || $1,
      updated_by = $2
    WHERE customer_id = $3
    RETURNING *
  `;
  const result = await pool.query(query, [auditEntry, updatedBy, customerId]);
  return result.rows[0];
};

/**
 * Hard delete customer (only when no related data)
 */
export const hardDeleteCustomer = async (customerId) => {
  await pool.query('DELETE FROM pets WHERE customer_id = $1', [customerId]);
  const result = await pool.query('DELETE FROM customers WHERE customer_id = $1', [customerId]);
  return result.rowCount > 0;
};

// ============================================================
// Pet-owner portal authentication
// ============================================================

/**
 * Find an active customer by email OR phone (used as the portal username).
 * Includes password_hash - only for use by the auth layer, never returned
 * to the client directly (see sanitizeUser in authUtils.js).
 */
export const findCustomerByEmailOrPhone = async (identifier) => {
  const query = `
    SELECT * FROM customers
    WHERE (email = $1 OR phone = $1) AND is_active = true
    LIMIT 1
  `;
  const result = await pool.query(query, [identifier]);
  return result.rows[0] || null;
};

/**
 * Find an active customer whose email AND phone both match (used by the
 * identity-verification step that unlocks first-time password setup).
 * Requiring both to match, rather than either, is what confirms the
 * requester is the same pet owner on file - not just someone who knows one
 * of the two values.
 */
export const findCustomerByEmailAndPhone = async (email, phone) => {
  const query = `
    SELECT * FROM customers
    WHERE email = $1 AND phone = $2 AND is_active = true
    LIMIT 1
  `;
  const result = await pool.query(query, [email, phone]);
  return result.rows[0] || null;
};

/**
 * Find a customer by ID for auth purposes (includes password_hash).
 * Distinct from getCustomerById(), which also joins pets and is used by
 * the customer-management screens, not the auth layer.
 */
export const findCustomerAuthById = async (customerId) => {
  const result = await pool.query('SELECT * FROM customers WHERE customer_id = $1', [customerId]);
  return result.rows[0] || null;
};

/**
 * Update last_login timestamp after a successful portal login.
 */
export const updateCustomerLastLogin = async (customerId) => {
  await pool.query('UPDATE customers SET last_login = NOW() WHERE customer_id = $1', [customerId]);
};

/**
 * Update a customer's password hash. Optionally clears password_must_change
 * (used by the first-login change-password flow).
 */
export const updateCustomerPassword = async (customerId, passwordHash, { clearMustChange = false } = {}) => {
  const query = clearMustChange
    ? 'UPDATE customers SET password_hash = $1, password_must_change = false WHERE customer_id = $2 RETURNING *'
    : 'UPDATE customers SET password_hash = $1 WHERE customer_id = $2 RETURNING *';
  const result = await pool.query(query, [passwordHash, customerId]);
  return result.rows[0];
};