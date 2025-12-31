import express from 'express';
import {
  getUsers,
  getUserById,
  updateUserById,
  deleteUserById,
  getVeterinarians
} from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { adminOnly, vetOrAdmin } from '../middleware/roleCheck.js';
import { validateUserUpdate } from '../middleware/validation.js';

const router = express.Router();

/**
 * User Routes
 * Base path: /api/users
 * All routes require authentication
 */

// Apply authentication to all routes
router.use(authenticate);

// @route   GET /api/users/veterinarians
// @desc    Get all active veterinarians
// @access  Private
router.get('/veterinarians', getVeterinarians);

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Admin, Veterinarian)
router.get('/', vetOrAdmin, getUsers);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', getUserById);

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Admin or own profile)
router.put('/:id', validateUserUpdate, updateUserById);

// @route   DELETE /api/users/:id
// @desc    Delete user (soft delete)
// @access  Private (Admin only)
router.delete('/:id', adminOnly, deleteUserById);

export default router;