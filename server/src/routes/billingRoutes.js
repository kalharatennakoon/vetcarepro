import express from 'express';
import {
  getBills,
  getBill,
  createNewBill,
  updateExistingBill,
  addPayment,
  getRevenue,
  getOverdue,
  removeBill,
  getPayments,
  getPayment,
  getPaymentStatistics
} from '../controllers/billingController.js';
import { authenticate } from '../middleware/auth.js';
import { adminOnly, adminOrReceptionist } from '../middleware/roleCheck.js';

const router = express.Router();

/**
 * Billing Routes
 * Base path: /api/billing
 * All routes require authentication
 */

// Apply authentication to all routes
router.use(authenticate);

// Statistics routes (must be before :id routes)
// @route   GET /api/billing/stats/revenue
// @desc    Get revenue statistics
// @access  Private (Admin/Receptionist)
router.get('/stats/revenue', adminOrReceptionist, getRevenue);

// @route   GET /api/billing/overdue
// @desc    Get overdue bills
// @access  Private
router.get('/overdue', getOverdue);

// Bill CRUD routes
// @route   GET /api/billing
// @desc    Get all bills
// @access  Private
router.get('/', getBills);

// @route   GET /api/billing/:id
// @desc    Get bill by ID with items and payments
// @access  Private
router.get('/:id', getBill);

// @route   POST /api/billing
// @desc    Create new bill
// @access  Private
router.post('/', createNewBill);

// @route   PUT /api/billing/:id
// @desc    Update bill
// @access  Private
router.put('/:id', updateExistingBill);

// @route   POST /api/billing/:id/payments
// @desc    Record payment for a bill
// @access  Private
router.post('/:id/payments', addPayment);

// @route   DELETE /api/billing/:id
// @desc    Delete (cancel) bill
// @access  Private (Admin only)
router.delete('/:id', adminOnly, removeBill);

export default router;
