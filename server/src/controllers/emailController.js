import { getAppointmentById } from '../models/appointmentModel.js';
import { getCustomerById } from '../models/customerModel.js';
import { getBillById } from '../models/billingModel.js';
import {
  sendAppointmentConfirmation,
  sendBillEmail,
  sendCustomEmail
} from '../services/emailService.js';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
};

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
};

/**
 * @route   POST /api/email/appointment/:id/confirm
 * @desc    Send appointment confirmation email to customer
 * @access  Private
 */
export const sendAppointmentEmail = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await getAppointmentById(id);
    if (!appointment) {
      return res.status(404).json({ status: 'error', message: 'Appointment not found' });
    }

    const customer = await getCustomerById(appointment.customer_id);
    if (!customer?.email) {
      return res.status(400).json({ status: 'error', message: 'Customer does not have an email address' });
    }

    await sendAppointmentConfirmation({
      to: customer.email,
      customerName: `${customer.first_name} ${customer.last_name}`,
      petName: appointment.pet_name || 'Your pet',
      appointmentDate: formatDate(appointment.appointment_date),
      appointmentTime: formatTime(appointment.appointment_time),
      vetName: appointment.vet_name || null,
      reason: appointment.reason || null
    });

    res.status(200).json({
      status: 'success',
      message: `Appointment confirmation sent to ${customer.email}`
    });
  } catch (error) {
    console.error('Send appointment email error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to send email. Please check SMTP configuration.' });
  }
};

/**
 * @route   POST /api/email/billing/:id/send
 * @desc    Send invoice email to customer
 * @access  Private
 */
export const sendInvoiceEmail = async (req, res) => {
  try {
    const { id } = req.params;

    const bill = await getBillById(id);
    if (!bill) {
      return res.status(404).json({ status: 'error', message: 'Bill not found' });
    }

    const customer = await getCustomerById(bill.customer_id);
    if (!customer?.email) {
      return res.status(400).json({ status: 'error', message: 'Customer does not have an email address' });
    }

    await sendBillEmail({
      to: customer.email,
      customerName: `${customer.first_name} ${customer.last_name}`,
      billId: bill.bill_id,
      billDate: formatDate(bill.bill_date || bill.created_at),
      items: bill.items || [],
      totalAmount: bill.total_amount,
      paidAmount: bill.paid_amount,
      balanceAmount: bill.balance_amount,
      paymentStatus: bill.payment_status
    });

    res.status(200).json({
      status: 'success',
      message: `Invoice sent to ${customer.email}`
    });
  } catch (error) {
    console.error('Send invoice email error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to send email. Please check SMTP configuration.' });
  }
};

/**
 * @route   POST /api/email/send
 * @desc    Send a custom email to a customer
 * @access  Private (receptionist, admin)
 */
export const sendCustomerEmail = async (req, res) => {
  try {
    const { customer_id, subject, message } = req.body;

    if (!customer_id || !subject || !message) {
      return res.status(400).json({ status: 'error', message: 'customer_id, subject, and message are required' });
    }

    const customer = await getCustomerById(customer_id);
    if (!customer) {
      return res.status(404).json({ status: 'error', message: 'Customer not found' });
    }
    if (!customer.email) {
      return res.status(400).json({ status: 'error', message: 'Customer does not have an email address' });
    }

    await sendCustomEmail({
      to: customer.email,
      customerName: `${customer.first_name} ${customer.last_name}`,
      subject,
      message,
      senderName: `${req.user.first_name} ${req.user.last_name}`
    });

    res.status(200).json({
      status: 'success',
      message: `Email sent to ${customer.email}`
    });
  } catch (error) {
    console.error('Send custom email error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to send email. Please check SMTP configuration.' });
  }
};
