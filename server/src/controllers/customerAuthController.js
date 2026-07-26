import {
  findCustomerByEmailOrPhone,
  findCustomerAuthById,
  updateCustomerLastLogin,
  updateCustomerPassword
} from '../models/customerModel.js';
import {
  hashPassword,
  comparePassword,
  generateCustomerToken,
  sanitizeUser
} from '../utils/authUtils.js';

/**
 * Customer (Pet Owner) Auth Controller
 * Mirrors authController.js's staff login/change-password pattern, but for
 * the customers table. Kept as a separate controller (rather than branching
 * inside authController.js) so the two auth flows - and the tables/tokens
 * behind them - never get tangled together.
 */

/**
 * @route   POST /api/customer-auth/login
 * @desc    Log in with email or phone as username
 * @access  Public
 */
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email/phone and password are required'
      });
    }

    const customer = await findCustomerByEmailOrPhone(identifier.trim());

    if (!customer) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email/phone or password'
      });
    }

    const isPasswordValid = await comparePassword(password, customer.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email/phone or password'
      });
    }

    await updateCustomerLastLogin(customer.customer_id);

    const token = generateCustomerToken(customer);
    const customerData = sanitizeUser(customer);

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        customer: customerData,
        token
      }
    });
  } catch (error) {
    console.error('Customer login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred during login'
    });
  }
};

/**
 * @route   GET /api/customer-auth/me
 * @desc    Get the currently logged-in customer
 * @access  Private (customer)
 */
export const getCurrentCustomer = async (req, res) => {
  try {
    const customerData = sanitizeUser(req.customer);

    res.status(200).json({
      status: 'success',
      data: {
        customer: customerData
      }
    });
  } catch (error) {
    console.error('Get current customer error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching account data'
    });
  }
};

/**
 * @route   GET /api/customer-auth/me/pets
 * @desc    Get pets belonging to the currently logged-in customer
 * @access  Private (customer)
 */
export const getMyPets = async (req, res) => {
  try {
    const { getAllPets } = await import('../models/petModel.js');
    const pets = await getAllPets({ customer_id: req.customer.customer_id });

    res.status(200).json({
      status: 'success',
      results: pets.length,
      data: { pets }
    });
  } catch (error) {
    console.error('Get my pets error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching your pets'
    });
  }
};

/**
 * @route   POST /api/customer-auth/logout
 * @desc    Logout (client-side token removal; endpoint kept for parity/logging)
 * @access  Private (customer)
 */
export const logout = async (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Logout successful'
  });
};

/**
 * @route   POST /api/customer-auth/change-password-first-login
 * @desc    Set a new password on first login and clear password_must_change
 * @access  Private (customer)
 */
export const changePasswordFirstLogin = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const customerId = req.customer.customer_id;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters long'
      });
    }

    const customer = await findCustomerAuthById(customerId);
    if (!customer) {
      return res.status(404).json({ status: 'error', message: 'Account not found' });
    }

    const password_hash = await hashPassword(newPassword);
    await updateCustomerPassword(customerId, password_hash, { clearMustChange: true });

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Customer change password (first login) error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while changing password'
    });
  }
};

/**
 * @route   POST /api/customer-auth/change-password
 * @desc    Change password (not first-login flow - requires current password)
 * @access  Private (customer)
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const customerId = req.customer.customer_id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'currentPassword and newPassword are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'New password must be at least 6 characters long'
      });
    }

    const customer = await findCustomerAuthById(customerId);
    if (!customer) {
      return res.status(404).json({ status: 'error', message: 'Account not found' });
    }

    const isMatch = await comparePassword(currentPassword, customer.password_hash);
    if (!isMatch) {
      return res.status(401).json({ status: 'error', message: 'Current password is incorrect' });
    }

    const password_hash = await hashPassword(newPassword);
    await updateCustomerPassword(customerId, password_hash, { clearMustChange: false });

    res.status(200).json({ status: 'success', message: 'Password changed successfully' });
  } catch (error) {
    console.error('Customer change password error:', error);
    res.status(500).json({ status: 'error', message: 'An error occurred while changing password' });
  }
};
