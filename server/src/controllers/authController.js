import {
  findByEmail,
  createUser,
  updateLastLogin,
  emailExists
} from '../models/userModel.js';
import {
  hashPassword,
  comparePassword,
  generateToken,
  sanitizeUser
} from '../utils/authUtils.js';

/**
 * Auth Controller
 * Handles authentication operations: login, register, logout, get current user
 */

/**
 * @route   POST /api/auth/login
 * @desc    Login user and return JWT token
 * @access  Public
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await findByEmail(email);

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        status: 'error',
        message: 'Your account has been deactivated. Please contact administrator.'
      });
    }

    // Compare passwords
    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    // Update last login timestamp
    await updateLastLogin(user.user_id);

    // Generate JWT token
    const token = generateToken(user);

    // Remove sensitive data
    const userData = sanitizeUser(user);

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: userData,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred during login'
    });
  }
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (Admin only)
 * @access  Private (Admin)
 */
export const register = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      password,
      email,
      phone,
      role,
      specialization,
      license_number
    } = req.body;

    // Check if email already exists
    if (await emailExists(email)) {
      return res.status(400).json({
        status: 'error',
        message: 'Email already exists'
      });
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Create user
    const newUser = await createUser({
      first_name,
      last_name,
      password_hash,
      email,
      phone,
      role,
      specialization,
      license_number,
      created_by: req.user ? req.user.user_id : null
    });

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: newUser
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred during registration'
    });
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged-in user
 * @access  Private
 */
export const getCurrentUser = async (req, res) => {
  try {
    // User is already attached to req by authenticate middleware
    const userData = sanitizeUser(req.user);

    res.status(200).json({
      status: 'success',
      data: {
        user: userData
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching user data'
    });
  }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal, this is just for logging purposes)
 * @access  Private
 */
export const logout = async (req, res) => {
  try {
    // In JWT authentication, logout is handled client-side by removing the token
    // This endpoint is mainly for logging purposes or future session management
    
    res.status(200).json({
      status: 'success',
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred during logout'
    });
  }
};