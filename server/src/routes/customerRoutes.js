import express from 'express';
import {
  getCustomers,
  getCustomer,
  createNewCustomer,
  updateCustomerById,
  deleteCustomerById,
  getCustomerDeletabilityById,
  inactivateCustomerById
} from '../controllers/customerController.js';
import { authenticate } from '../middleware/auth.js';
import { adminOnly } from '../middleware/roleCheck.js';
import {
  validateCustomerCreate,
  validateCustomerUpdate
} from '../middleware/validation.js';

const router = express.Router();

/**
 * Customer Routes
 * Base path: /api/customers
 * All routes require authentication
 */

// Apply authentication to all routes
router.use(authenticate);

// @route   GET /api/customers
// @desc    Get all customers
// @access  Private
router.get('/', getCustomers);

// @route   GET /api/customers/:id
// @desc    Get customer by ID
// @access  Private
router.get('/:id', getCustomer);

// @route   POST /api/customers
// @desc    Create new customer
// @access  Private
router.post('/', validateCustomerCreate, createNewCustomer);

// @route   PUT /api/customers/:id
// @desc    Update customer
// @access  Private
router.put('/:id', validateCustomerUpdate, updateCustomerById);

// @route   GET /api/customers/:id/deletability
// @desc    Check if customer can be deleted or must be inactivated
// @access  Private
router.get('/:id/deletability', getCustomerDeletabilityById);

// @route   PATCH /api/customers/:id/inactivate
// @desc    Inactivate customer with reason
// @access  Private
router.patch('/:id/inactivate', inactivateCustomerById);

// @route   DELETE /api/customers/:id
// @desc    Delete customer (soft delete)
// @access  Private (Admin only)
router.delete('/:id', adminOnly, deleteCustomerById);

export default router;