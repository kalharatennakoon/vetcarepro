import express from 'express';
import {
  login,
  register,
  getCurrentUser,
  logout
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { adminOnly } from '../middleware/roleCheck.js';
import {
  validateLogin,
  validateUserRegistration
} from '../middleware/validation.js';

const router = express.Router();

/**
 * Auth Routes
 * Base path: /api/auth
 */

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validateLogin, login);

// @route   POST /api/auth/register
// @desc    Register new user (Admin only)
// @access  Private (Admin)
router.post('/register', authenticate, adminOnly, validateUserRegistration, register);

// @route   GET /api/auth/me
// @desc    Get current logged-in user
// @access  Private
router.get('/me', authenticate, getCurrentUser);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', authenticate, logout);

export default router;