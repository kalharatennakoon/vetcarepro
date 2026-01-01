import express from 'express';
import {
  getCustomers,
  getCustomer,
  createNewCustomer,
  updateCustomerById,
  deleteCustomerById
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

// @route   DELETE /api/customers/:id
// @desc    Delete customer (soft delete)
// @access  Private (Admin only)
router.delete('/:id', adminOnly, deleteCustomerById);

export default router;