import {
  getAllUsers,
  findById,
  updateUser,
  deleteUser,
  emailExists
} from '../models/userModel.js';
import { hashPassword, sanitizeUser } from '../utils/authUtils.js';
import { deleteImageFile } from '../config/multer.js';

/**
 * User Controller
 * Handles CRUD operations for users
 */

/**
 * @route   GET /api/users
 * @desc    Get all users with optional filters
 * @access  Private (Admin, Veterinarian)
 */
export const getUsers = async (req, res) => {
  try {
    const { role, is_active } = req.query;

    const filters = {};
    if (role) filters.role = role;
    if (is_active !== undefined) filters.is_active = is_active === 'true';

    const users = await getAllUsers(filters);

    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching users'
    });
  }
};

/**
 * @route   GET /api/users/:id
 * @desc    Get single user by ID
 * @access  Private
 */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await findById(id);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching user'
    });
  }
};

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private (Admin or own profile)
 */
export const updateUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    // Check if user exists
    const existingUser = await findById(userId);
    if (!existingUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Check permissions
    // Admin can update anyone, others can only update themselves
    if (req.user.role !== 'admin' && req.user.user_id !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to update this user'
      });
    }

    const userData = { ...req.body };

    // If email change is requested, check if it already exists
    if (userData.email && userData.email !== existingUser.email) {
      if (await emailExists(userData.email)) {
        return res.status(400).json({
          status: 'error',
          message: 'Email already exists'
        });
      }
    }

    // If password is being updated, hash it
    if (userData.password) {
      userData.password_hash = await hashPassword(userData.password);
      delete userData.password;
    }

    // Non-admin users cannot change their own role
    if (req.user.role !== 'admin' && userData.role) {
      return res.status(403).json({
        status: 'error',
        message: 'You cannot change your own role'
      });
    }

    const updatedUser = await updateUser(userId, userData, req.user.user_id);

    res.status(200).json({
      status: 'success',
      message: 'User updated successfully',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating user'
    });
  }
};

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (soft delete)
 * @access  Private (Admin only)
 */
export const deleteUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    // Check if user exists
    const existingUser = await findById(userId);
    if (!existingUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Prevent self-deletion
    if (req.user.user_id === userId) {
      return res.status(400).json({
        status: 'error',
        message: 'You cannot delete your own account'
      });
    }

    await deleteUser(userId);

    res.status(200).json({
      status: 'success',
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while deleting user'
    });
  }
};

/**
 * @route   GET /api/users/veterinarians
 * @desc    Get all veterinarians (for appointment scheduling)
 * @access  Private
 */
export const getVeterinarians = async (req, res) => {
  try {
    const veterinarians = await getAllUsers({ role: 'veterinarian', is_active: true });

    res.status(200).json({
      status: 'success',
      results: veterinarians.length,
      data: {
        veterinarians
      }
    });
  } catch (error) {
    console.error('Get veterinarians error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching veterinarians'
    });
  }
};

/**
 * @route   POST /api/users/:id/upload-profile-image
 * @desc    Upload profile image for user
 * @access  Private (Admin or own profile)
 */
export const uploadUserProfileImage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    // Check permissions
    if (req.user.role !== 'admin' && req.user.user_id !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to update this profile image'
      });
    }

    // Check if user exists
    const existingUser = await findById(userId);
    if (!existingUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No image file provided'
      });
    }

    // Delete old profile image if exists
    if (existingUser.profile_image) {
      deleteImageFile(existingUser.profile_image);
    }

    // Update user with new profile image path
    const imagePath = `profile-images/${req.file.filename}`;
    const updatedUser = await updateUser(userId, { profile_image: imagePath }, req.user.user_id);

    res.status(200).json({
      status: 'success',
      message: 'Profile image uploaded successfully',
      data: {
        user: sanitizeUser(updatedUser),
        imageUrl: `/uploads/${imagePath}`
      }
    });
  } catch (error) {
    console.error('Upload profile image error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while uploading profile image'
    });
  }
};

/**
 * @route   DELETE /api/users/:id/profile-image
 * @desc    Delete profile image for user
 * @access  Private (Admin or own profile)
 */
export const deleteUserProfileImage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    // Check permissions
    if (req.user.role !== 'admin' && req.user.user_id !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to delete this profile image'
      });
    }

    // Check if user exists
    const existingUser = await findById(userId);
    if (!existingUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Delete profile image file if exists
    if (existingUser.profile_image) {
      deleteImageFile(existingUser.profile_image);
    }

    // Update user to remove profile image
    const updatedUser = await updateUser(userId, { profile_image: null }, req.user.user_id);

    res.status(200).json({
      status: 'success',
      message: 'Profile image deleted successfully',
      data: {
        user: sanitizeUser(updatedUser)
      }
    });
  } catch (error) {
    console.error('Delete profile image error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while deleting profile image'
    });
  }
};
