import {
  getAllBills,
  getBillById,
  createBill,
  updateBill,
  recordPayment,
  getBillCount,
  getRevenueStats,
  getOverdueBills,
  deleteBill
} from '../models/billingModel.js';

import {
  getAllPayments,
  getPaymentById,
  getPaymentStats
} from '../models/paymentModel.js';

/**
 * Billing Controller
 * Handles CRUD operations for billing and payments
 */

/**
 * @route   GET /api/billing
 * @desc    Get all bills with filters
 * @access  Private
 */
export const getBills = async (req, res) => {
  try {
    const { search, payment_status, customer_id, from_date, to_date, limit, offset } = req.query;

    const filters = {};
    if (search) filters.search = search;
    if (payment_status) filters.payment_status = payment_status;
    if (customer_id) filters.customer_id = parseInt(customer_id);
    if (from_date) filters.from_date = from_date;
    if (to_date) filters.to_date = to_date;
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const bills = await getAllBills(filters);
    const totalCount = await getBillCount();

    res.status(200).json({
      status: 'success',
      results: bills.length,
      total: totalCount,
      data: {
        bills
      }
    });
  } catch (error) {
    console.error('Get bills error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching bills'
    });
  }
};

/**
 * @route   GET /api/billing/:id
 * @desc    Get bill by ID with items and payments
 * @access  Private
 */
export const getBill = async (req, res) => {
  try {
    const { id } = req.params;

    const bill = await getBillById(id);

    if (!bill) {
      return res.status(404).json({
        status: 'error',
        message: 'Bill not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        bill
      }
    });
  } catch (error) {
    console.error('Get bill error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching the bill'
    });
  }
};

/**
 * @route   POST /api/billing
 * @desc    Create new bill
 * @access  Private
 */
export const createNewBill = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const billData = req.body;

    // Validate required fields
    if (!billData.customer_id || !billData.items || billData.items.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Customer ID and at least one item are required'
      });
    }

    // Validate items
    for (const item of billData.items) {
      if (!item.item_name || !item.quantity || !item.unit_price) {
        return res.status(400).json({
          status: 'error',
          message: 'Each item must have item_name, quantity, and unit_price'
        });
      }
    }

    const newBill = await createBill(billData, userId);

    res.status(201).json({
      status: 'success',
      message: 'Bill created successfully',
      data: {
        bill: newBill
      }
    });
  } catch (error) {
    console.error('Create bill error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'An error occurred while creating the bill'
    });
  }
};

/**
 * @route   PUT /api/billing/:id
 * @desc    Update bill
 * @access  Private
 */
export const updateExistingBill = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const billData = req.body;

    const updatedBill = await updateBill(id, billData, userId);

    if (!updatedBill) {
      return res.status(404).json({
        status: 'error',
        message: 'Bill not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Bill updated successfully',
      data: {
        bill: updatedBill
      }
    });
  } catch (error) {
    console.error('Update bill error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating the bill'
    });
  }
};

/**
 * @route   POST /api/billing/:id/payments
 * @desc    Record payment for a bill
 * @access  Private
 */
export const addPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const paymentData = req.body;

    // Validate required fields
    if (!paymentData.amount || !paymentData.payment_method) {
      return res.status(400).json({
        status: 'error',
        message: 'Amount and payment method are required'
      });
    }

    if (paymentData.amount <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Payment amount must be greater than 0'
      });
    }

    const payment = await recordPayment(id, paymentData, userId);

    res.status(201).json({
      status: 'success',
      message: 'Payment recorded successfully',
      data: {
        payment
      }
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'An error occurred while recording the payment'
    });
  }
};

/**
 * @route   GET /api/billing/stats/revenue
 * @desc    Get revenue statistics
 * @access  Private (Admin/Receptionist)
 */
export const getRevenue = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;

    const filters = {};
    if (from_date) filters.from_date = from_date;
    if (to_date) filters.to_date = to_date;

    const stats = await getRevenueStats(filters);

    res.status(200).json({
      status: 'success',
      data: {
        stats
      }
    });
  } catch (error) {
    console.error('Get revenue stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching revenue statistics'
    });
  }
};

/**
 * @route   GET /api/billing/overdue
 * @desc    Get overdue bills
 * @access  Private
 */
export const getOverdue = async (req, res) => {
  try {
    const overdueBills = await getOverdueBills();

    res.status(200).json({
      status: 'success',
      results: overdueBills.length,
      data: {
        bills: overdueBills
      }
    });
  } catch (error) {
    console.error('Get overdue bills error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching overdue bills'
    });
  }
};

/**
 * @route   DELETE /api/billing/:id
 * @desc    Delete (cancel) bill
 * @access  Private (Admin only)
 */
export const removeBill = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Only administrators can delete bills'
      });
    }

    const deletedBill = await deleteBill(id, userId);

    if (!deletedBill) {
      return res.status(404).json({
        status: 'error',
        message: 'Bill not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Bill cancelled successfully',
      data: {
        bill: deletedBill
      }
    });
  } catch (error) {
    console.error('Delete bill error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while deleting the bill'
    });
  }
};

/**
 * @route   GET /api/payments
 * @desc    Get all payments with filters
 * @access  Private
 */
export const getPayments = async (req, res) => {
  try {
    const { bill_id, payment_method, from_date, to_date, received_by, limit, offset } = req.query;

    const filters = {};
    if (bill_id) filters.bill_id = parseInt(bill_id);
    if (payment_method) filters.payment_method = payment_method;
    if (from_date) filters.from_date = from_date;
    if (to_date) filters.to_date = to_date;
    if (received_by) filters.received_by = parseInt(received_by);
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const payments = await getAllPayments(filters);

    res.status(200).json({
      status: 'success',
      results: payments.length,
      data: {
        payments
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching payments'
    });
  }
};

/**
 * @route   GET /api/payments/:id
 * @desc    Get payment by ID
 * @access  Private
 */
export const getPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await getPaymentById(id);

    if (!payment) {
      return res.status(404).json({
        status: 'error',
        message: 'Payment not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        payment
      }
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching the payment'
    });
  }
};

/**
 * @route   GET /api/payments/stats/summary
 * @desc    Get payment statistics
 * @access  Private (Admin/Receptionist)
 */
export const getPaymentStatistics = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;

    const filters = {};
    if (from_date) filters.from_date = from_date;
    if (to_date) filters.to_date = to_date;

    const stats = await getPaymentStats(filters);

    res.status(200).json({
      status: 'success',
      data: {
        stats
      }
    });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching payment statistics'
    });
  }
};
