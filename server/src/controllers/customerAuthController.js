import {
  findCustomerByEmailOrPhone,
  findCustomerByEmailAndPhone,
  findCustomerAuthById,
  updateCustomerLastLogin,
  updateCustomerPassword
} from '../models/customerModel.js';
import {
  hashPassword,
  comparePassword,
  generateCustomerToken,
  generateCustomerSetupToken,
  verifyCustomerSetupToken,
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

    if (customer.password_must_change) {
      return res.status(403).json({
        status: 'error',
        message: 'Account setup is not complete. Please verify your identity to set your password.',
        requiresSetup: true
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
 * @route   POST /api/customer-auth/verify-identity
 * @desc    Confirm an email + phone number belong to the same pet owner on
 *          file, and issue a short-lived setup token they can use to set
 *          their password for the first time
 * @access  Public
 */
export const verifyIdentity = async (req, res) => {
  try {
    const { email, phone } = req.body;

    if (!email || !phone) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and phone number are required'
      });
    }

    const customer = await findCustomerByEmailAndPhone(email.trim(), phone.trim());

    if (!customer) {
      return res.status(404).json({
        status: 'error',
        message: "We couldn't find an account matching that email and phone number"
      });
    }

    if (!customer.password_must_change) {
      return res.status(400).json({
        status: 'error',
        message: 'This account is already set up. Please log in instead.'
      });
    }

    const setupToken = generateCustomerSetupToken(customer);

    res.status(200).json({
      status: 'success',
      message: 'Identity verified',
      data: {
        setupToken,
        firstName: customer.first_name
      }
    });
  } catch (error) {
    console.error('Customer verify identity error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while verifying your identity'
    });
  }
};

/**
 * @route   POST /api/customer-auth/set-password
 * @desc    Set a password for the first time using a setup token obtained
 *          from verify-identity, clear password_must_change, and log the
 *          customer in
 * @access  Public (requires a valid setupToken)
 */
export const setPassword = async (req, res) => {
  try {
    const { setupToken, newPassword } = req.body;

    if (!setupToken || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Setup token and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters long'
      });
    }

    let decoded;
    try {
      decoded = verifyCustomerSetupToken(setupToken);
    } catch (err) {
      return res.status(401).json({
        status: 'error',
        message: 'Your verification has expired. Please verify your identity again.'
      });
    }

    const customer = await findCustomerAuthById(decoded.customer_id);
    if (!customer) {
      return res.status(404).json({ status: 'error', message: 'Account not found' });
    }

    const password_hash = await hashPassword(newPassword);
    const updatedCustomer = await updateCustomerPassword(customer.customer_id, password_hash, { clearMustChange: true });

    await updateCustomerLastLogin(updatedCustomer.customer_id);

    const token = generateCustomerToken(updatedCustomer);
    const customerData = sanitizeUser(updatedCustomer);

    res.status(200).json({
      status: 'success',
      message: 'Password set successfully',
      data: {
        customer: customerData,
        token
      }
    });
  } catch (error) {
    console.error('Customer set password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while setting your password'
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
