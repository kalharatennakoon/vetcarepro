/**
 * Purpose: Database operations for the users table
 * File: server/src/models/userModel.js
 * 
 * What this does:
 * - Provides functions to interact with the users table
 * - findByUsername(), findByEmail(), findById() - Fetch user data
 * - getAllUsers() - Get list of all users with optional filters
 * - createUser() - Insert new user into database
 * - updateUser() - Update existing user
 * - deleteUser() - Soft delete (sets is_active = false)
 * - updateLastLogin() - Updates timestamp when user logs in
 */

import pool from '../config/database.js';

/**
 * Find user by username
 * Fetch user data by username
 * @param {string} username
 * @returns {Promise<Object|null>} User object or null
 */
export const findByUsername = async (username) => {
  const query = 'SELECT * FROM users WHERE username = $1';
  const result = await pool.query(query, [username]);
  return result.rows[0] || null;
};

/**
 * Find user by email
 * Fetch user data by email
 * @param {string} email
 * @returns {Promise<Object|null>} User object or null
 */
export const findByEmail = async (email) => {
  const query = 'SELECT * FROM users WHERE email = $1';
  const result = await pool.query(query, [email]);
  return result.rows[0] || null;
};

/**
 * Find user by ID
 * Fetch user data by user ID
 * @param {number} userId
 * @returns {Promise<Object|null>} User object or null
 */
export const findById = async (userId) => {
  const query = `
    SELECT user_id, username, full_name, email, phone, role, 
           specialization, license_number, is_active, 
           last_login, created_at, updated_at
    FROM users 
    WHERE user_id = $1
  `;
  const result = await pool.query(query, [userId]);
  return result.rows[0] || null;
};

/**
 * Get all users (excluding password)
 * Get list of all users with optional filters
 * @param {Object} filters - Optional filters (role, is_active)
 * @returns {Promise<Array>} Array of user objects
 */
export const getAllUsers = async (filters = {}) => {
  let query = `
    SELECT user_id, username, full_name, email, phone, role, 
           specialization, license_number, is_active, 
           last_login, created_at, updated_at
    FROM users 
    WHERE 1=1
  `;
  
  const params = [];
  let paramCount = 1;

  // Apply filters
  if (filters.role) {
    query += ` AND role = $${paramCount}`;
    params.push(filters.role);
    paramCount++;
  }

  if (filters.is_active !== undefined) {
    query += ` AND is_active = $${paramCount}`;
    params.push(filters.is_active);
    paramCount++;
  }

  query += ' ORDER BY created_at DESC';

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Create new user
 * Insert new user into database
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user object
 */
export const createUser = async (userData) => {
  const query = `
    INSERT INTO users (
      username, password_hash, full_name, email, phone, 
      role, specialization, license_number, created_by
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING user_id, username, full_name, email, phone, role, 
              specialization, license_number, is_active, created_at
  `;
  
  const values = [
    userData.username,
    userData.password_hash,
    userData.full_name,
    userData.email,
    userData.phone || null,
    userData.role,
    userData.specialization || null,
    userData.license_number || null,
    userData.created_by || null
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Update user
 * Update existing user data
 * @param {number} userId
 * @param {Object} userData - Fields to update
 * @param {number} updatedBy - ID of user making the update
 * @returns {Promise<Object>} Updated user object
 */
export const updateUser = async (userId, userData, updatedBy) => {
  const fields = [];
  const values = [];
  let paramCount = 1;

  // Build dynamic UPDATE query based on provided fields
  if (userData.full_name) {
    fields.push(`full_name = $${paramCount}`);
    values.push(userData.full_name);
    paramCount++;
  }
  if (userData.email) {
    fields.push(`email = $${paramCount}`);
    values.push(userData.email);
    paramCount++;
  }
  if (userData.phone !== undefined) {
    fields.push(`phone = $${paramCount}`);
    values.push(userData.phone);
    paramCount++;
  }
  if (userData.role) {
    fields.push(`role = $${paramCount}`);
    values.push(userData.role);
    paramCount++;
  }
  if (userData.specialization !== undefined) {
    fields.push(`specialization = $${paramCount}`);
    values.push(userData.specialization);
    paramCount++;
  }
  if (userData.license_number !== undefined) {
    fields.push(`license_number = $${paramCount}`);
    values.push(userData.license_number);
    paramCount++;
  }
  if (userData.is_active !== undefined) {
    fields.push(`is_active = $${paramCount}`);
    values.push(userData.is_active);
    paramCount++;
  }
  if (userData.password_hash) {
    fields.push(`password_hash = $${paramCount}`);
    values.push(userData.password_hash);
    paramCount++;
  }

  fields.push(`updated_by = $${paramCount}`);
  values.push(updatedBy);
  paramCount++;

  // Add userId as last parameter
  values.push(userId);

  const query = `
    UPDATE users 
    SET ${fields.join(', ')}
    WHERE user_id = $${paramCount}
    RETURNING user_id, username, full_name, email, phone, role, 
              specialization, license_number, is_active, updated_at
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Delete user (soft delete - set is_active to false)
 * Soft delete (sets is_active = false)
 * @param {number} userId
 * @returns {Promise<boolean>} Success status
 */
export const deleteUser = async (userId) => {
  const query = 'UPDATE users SET is_active = false WHERE user_id = $1';
  const result = await pool.query(query, [userId]);
  return result.rowCount > 0;
};

/**
 * Update last login timestamp
 * Updates timestamp when user logs in
 * @param {number} userId
 * @returns {Promise<void>}
 */
export const updateLastLogin = async (userId) => {
  const query = 'UPDATE users SET last_login = NOW() WHERE user_id = $1';
  await pool.query(query, [userId]);
};

/**
 * Check if username exists
 * @param {string} username
 * @returns {Promise<boolean>}
 */
export const usernameExists = async (username) => {
  const query = 'SELECT 1 FROM users WHERE username = $1';
  const result = await pool.query(query, [username]);
  return result.rows.length > 0;
};

/**
 * Check if email exists
 * @param {string} email
 * @returns {Promise<boolean>}
 */
export const emailExists = async (email) => {
  const query = 'SELECT 1 FROM users WHERE email = $1';
  const result = await pool.query(query, [email]);
  return result.rows.length > 0;
};