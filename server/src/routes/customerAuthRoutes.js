import express from 'express';
import {
  login,
  getCurrentCustomer,
  getMyPets,
  logout,
  changePassword,
  changePasswordFirstLogin
} from '../controllers/customerAuthController.js';
import { listMyLabReports, viewMyLabReport } from '../controllers/labReportController.js';
import { authenticateCustomer } from '../middleware/auth.js';

const router = express.Router();

/**
 * Customer (Pet Owner) Auth Routes
 * Base path: /api/customer-auth
 * Kept fully separate from /api/auth (staff) - separate controller,
 * separate middleware, separate token type. See authenticateCustomer in
 * middleware/auth.js and generateCustomerToken in utils/authUtils.js.
 */

// @route   POST /api/customer-auth/login
// @desc    Log in with email or phone as username
// @access  Public
router.post('/login', login);

// @route   GET /api/customer-auth/me
// @desc    Get current logged-in customer
// @access  Private (customer)
router.get('/me', authenticateCustomer, getCurrentCustomer);

// @route   GET /api/customer-auth/me/pets
// @desc    Get pets belonging to the current customer
// @access  Private (customer)
router.get('/me/pets', authenticateCustomer, getMyPets);

// @route   GET /api/customer-auth/pets/:petId/lab-reports
// @desc    Get lab reports for one of the current customer's own pets
// @access  Private (customer)
router.get('/pets/:petId/lab-reports', authenticateCustomer, listMyLabReports);

// @route   GET /api/customer-auth/lab-reports/:reportId/view
// @desc    Stream a lab report file, only if it belongs to one of the
//          current customer's own pets
// @access  Private (customer)
router.get('/lab-reports/:reportId/view', authenticateCustomer, viewMyLabReport);

// @route   POST /api/customer-auth/logout
// @desc    Logout
// @access  Private (customer)
router.post('/logout', authenticateCustomer, logout);

// @route   POST /api/customer-auth/change-password
// @desc    Change own password (requires current password)
// @access  Private (customer)
router.post('/change-password', authenticateCustomer, changePassword);

// @route   POST /api/customer-auth/change-password-first-login
// @desc    Change password for first-time login
// @access  Private (customer)
router.post('/change-password-first-login', authenticateCustomer, changePasswordFirstLogin);

export default router;
