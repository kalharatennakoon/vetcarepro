import express from 'express';
import { sendAppointmentEmail, sendInvoiceEmail, sendCustomerEmail } from '../controllers/emailController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// @route   POST /api/email/appointment/:id/confirm
// @desc    Send appointment confirmation email
// @access  Private
router.post('/appointment/:id/confirm', sendAppointmentEmail);

// @route   POST /api/email/billing/:id/send
// @desc    Send invoice email
// @access  Private
router.post('/billing/:id/send', sendInvoiceEmail);

// @route   POST /api/email/send
// @desc    Send custom email to a customer
// @access  Private
router.post('/send', sendCustomerEmail);

export default router;
