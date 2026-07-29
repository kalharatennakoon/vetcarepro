/**
 * Purpose: Helper functions for password hashing, JWT token generation/verification
 * File: server/src/utils/authUtils.js
 * 
 * What it does:
 * - hashPassword() - Converts plain password to secure hash (used when registering)
 * - comparePassword() - Checks if login password matches stored hash
 * - generateToken() - Creates JWT token after successful login
 * - verifyToken() - Validates JWT token from incoming requests
 * - sanitizeUser() - Removes sensitive data (password) before sending user data to client
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * Hash a plain text password
 * Converts plain password to secure hash (used when registering)
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

/**
 * Compare plain text password with hashed password
 * Checks if login password matches stored hash
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} - True if passwords match
 */
export const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * Generate JWT token for a user
 * Creates JWT token after successful login
 * @param {Object} user - User object
 * @returns {string} - JWT token
 */
export const generateToken = (user) => {
  const payload = {
    user_id: user.user_id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    role: user.role
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/**
 * Verify JWT token
 * Validates JWT token from incoming requests
 * @param {string} token - JWT token
 * @returns {Object} - Decoded token payload
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Generate JWT token for a customer (pet owner)
 * Kept separate from generateToken() so staff and pet-owner sessions never
 * collide - `type: 'customer'` lets authenticateCustomer() distinguish this
 * token from a staff token, and role is always 'pet_owner' for RAG scoping.
 * @param {Object} customer - Customer object
 * @returns {string} - JWT token
 */
export const generateCustomerToken = (customer) => {
  const payload = {
    customer_id: customer.customer_id,
    first_name: customer.first_name,
    last_name: customer.last_name,
    email: customer.email,
    phone: customer.phone,
    type: 'customer',
    role: 'pet_owner'
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/**
 * Generate a short-lived token authorizing a pet owner to set their password
 * for the first time, issued after they verify their email + phone match an
 * account (see verifyIdentity in customerAuthController.js). Deliberately a
 * different token `type` than generateCustomerToken() so it can't be used to
 * access the portal itself - only to call /customer-auth/set-password.
 * @param {Object} customer - Customer object
 * @returns {string} - JWT token, expires in 15 minutes
 */
export const generateCustomerSetupToken = (customer) => {
  const payload = {
    customer_id: customer.customer_id,
    type: 'customer-setup'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
};

/**
 * Verify a customer setup token (see generateCustomerSetupToken)
 * @param {string} token - JWT token
 * @returns {Object} - Decoded token payload
 */
export const verifyCustomerSetupToken = (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.type !== 'customer-setup') {
    throw new Error('Invalid or expired setup token');
  }
  return decoded;
};

/**
 * Remove sensitive data from user object
 * Removes sensitive data (password) before sending user data to client
 * @param {Object} user - User object
 * @returns {Object} - User object without sensitive data
 */
export const sanitizeUser = (user) => {
  const { password_hash, ...sanitized } = user;
  return sanitized;
};