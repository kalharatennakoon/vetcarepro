import express from 'express';
import {
  getPayments,
  getPayment,
  getPaymentStatistics
} from '../controllers/billingController.js';
import { authenticate } from '../middleware/auth.js';
import { adminOrReceptionist } from '../middleware/roleCheck.js';

const router = express.Router();

/**
 * Payment Routes
 * Base path: /api/payments
 * All routes require authentication
 */

// Apply authentication to all routes
router.use(authenticate);

// Statistics route (must be before :id routes)
// @route   GET /api/payments/stats/summary
// @desc    Get payment statistics
// @access  Private (Admin/Receptionist)
router.get('/stats/summary', adminOrReceptionist, getPaymentStatistics);

// Payment routes
// @route   GET /api/payments
// @desc    Get all payments with filters
// @access  Private
router.get('/', getPayments);

// @route   GET /api/payments/:id
// @desc    Get payment by ID
// @access  Private
router.get('/:id', getPayment);

export default router;
