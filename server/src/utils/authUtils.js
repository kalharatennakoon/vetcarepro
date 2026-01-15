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
 * Remove sensitive data from user object
 * Removes sensitive data (password) before sending user data to client
 * @param {Object} user - User object
 * @returns {Object} - User object without sensitive data
 */
export const sanitizeUser = (user) => {
  const { password_hash, ...sanitized } = user;
  return sanitized;
};