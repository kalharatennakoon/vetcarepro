import { verifyToken } from '../utils/authUtils.js';
import { findById } from '../models/userModel.js';
import { findCustomerAuthById } from '../models/customerModel.js';

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request object
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'No token provided. Please login to access this resource.'
      });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);

    // Check if user still exists and is active
    const user = await findById(decoded.user_id);

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'User no longer exists'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        status: 'error',
        message: 'User account is deactivated'
      });
    }

    // Attach user to request object
    req.user = user;

    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token. Please login again.'
    });
  }
};

/**
 * Optional Authentication Middleware
 * Attaches user to request if token is present, but doesn't fail if not
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      const user = await findById(decoded.user_id);

      if (user && user.is_active) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Continue without user if token is invalid
    next();
  }
};

/**
 * Customer (Pet Owner) Authentication Middleware
 * Verifies a customer-portal JWT (distinct from staff tokens via the
 * `type: 'customer'` claim - see generateCustomerToken in authUtils.js) and
 * attaches the customer to req.customer. Kept fully separate from
 * `authenticate` so a staff token can never be used to access customer-only
 * routes and vice versa.
 */
export const authenticateCustomer = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'No token provided. Please log in to access this resource.'
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (decoded.type !== 'customer') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token for this resource.'
      });
    }

    const customer = await findCustomerAuthById(decoded.customer_id);

    if (!customer) {
      return res.status(401).json({
        status: 'error',
        message: 'Account no longer exists'
      });
    }

    if (!customer.is_active) {
      return res.status(401).json({
        status: 'error',
        message: 'This account has been deactivated. Please contact the clinic.'
      });
    }

    req.customer = customer;

    next();
  } catch (error) {
    console.error('Customer authentication error:', error.message);
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired session. Please log in again.'
    });
  }
};