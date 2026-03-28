import express from 'express';
import {
  createUserByAdmin,
  getUsers,
  getUserById,
  updateUserById,
  deleteUserById,
  getVeterinarians,
  uploadUserProfileImage,
  deleteUserProfileImage,
  getUserStats,
  resetUserPassword
} from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { adminOnly, vetOrAdmin } from '../middleware/roleCheck.js';
import { validateUserCreation, validateUserUpdate } from '../middleware/validation.js';
import { uploadProfileImage } from '../config/multer.js';

const router = express.Router();

/**
 * User Routes
 * Base path: /api/users
 * All routes require authentication
 */

// Apply authentication to all routes
router.use(authenticate);

// @route   POST /api/users
// @desc    Create new user (Admin only)
// @access  Private (Admin only)
router.post('/', adminOnly, validateUserCreation, createUserByAdmin);

// @route   GET /api/users/veterinarians
// @desc    Get all active veterinarians
// @access  Private
router.get('/veterinarians', getVeterinarians);

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Admin, Veterinarian)
router.get('/', vetOrAdmin, getUsers);

// @route   GET /api/users/:id/stats
// @desc    Get activity stats for a user
// @access  Private (Admin or own profile)
router.get('/:id/stats', getUserStats);

// @route   POST /api/users/:id/reset-password
// @desc    Reset user password (Admin only, not for other admins)
// @access  Private (Admin only)
router.post('/:id/reset-password', adminOnly, resetUserPassword);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', getUserById);

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Admin or own profile)
router.put('/:id', validateUserUpdate, updateUserById);

// @route   PATCH /api/users/:id/deactivate
// @desc    Deactivate user (soft deactivation)
// @access  Private (Admin only)
router.patch('/:id/deactivate', adminOnly, deleteUserById);

// @route   DELETE /api/users/:id
// @desc    Delete user (soft delete)
// @access  Private (Admin only)
router.delete('/:id', adminOnly, deleteUserById);

// @route   POST /api/users/:id/upload-profile-image
// @desc    Upload profile image
// @access  Private (Admin or own profile)
router.post('/:id/upload-profile-image', uploadProfileImage.single('image'), uploadUserProfileImage);

// @route   DELETE /api/users/:id/profile-image
// @desc    Delete profile image
// @access  Private (Admin or own profile)
router.delete('/:id/profile-image', deleteUserProfileImage);

export default router;