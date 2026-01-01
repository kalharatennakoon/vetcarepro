import pool from '../config/database.js';

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
 */
export const createCustomer = async (customerData, createdBy) => {
  const query = `
    INSERT INTO customers (
      first_name, last_name, email, phone, alternate_phone,
      address, city, postal_code, nic, emergency_contact,
      emergency_phone, preferred_contact_method, notes, created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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
    createdBy
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
  const query = 'UPDATE customers SET is_active = false WHERE customer_id = $1';
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
    query += ' AND customer_id != $2';
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