/**
 * AI Controller (RAG Assistant)
 * Exposes the AI assistant to authenticated staff, and a restricted
 * public/guest endpoint for general (non-clinic-data) questions.
 *
 * NOTE: "Pet Owner" mode is intentionally not exposed yet - the `users`
 * table only supports staff roles (admin/veterinarian/receptionist);
 * `customers` currently has no login/auth. Add that once customer
 * authentication exists (also needed for the mobile app's Owner mode).
 */

import * as aiService from '../services/aiService.js';
import { FAQ_CATEGORIES, FAQS } from '../data/faqData.js';
import {
  createAppointment,
  updateAppointment,
  updateAppointmentStatus,
  checkAppointmentConflict,
  getAppointmentById,
  markReminderSent
} from '../models/appointmentModel.js';
import { createCustomer, getCustomerById, phoneExists, emailExists } from '../models/customerModel.js';
import { createPet, getPetById } from '../models/petModel.js';
import { logAuditEntry } from '../models/diseaseCaseModel.js';
import { sendAppointmentReminder, sendCustomEmail } from '../services/emailService.js';

/**
 * @desc    Check AI assistant (Ollama/RAG) health
 * @route   GET /api/ai/health
 * @access  Private (staff)
 */
const checkHealth = async (req, res) => {
  try {
    const result = await aiService.checkRagHealth();
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(503).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error('AI health check error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Ask the AI assistant a question, using full clinic-data scope
 * @route   POST /api/ai/chat
 * @access  Private (admin, veterinarian, receptionist)
 */
const staffChat = async (req, res) => {
  try {
    const { question, history, pending_intent } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, message: 'question is required' });
    }

    const result = await aiService.askAssistant({
      question,
      role: req.user.role, // enforced server-side from the authenticated user, never trusted from the client
      history,
      pendingIntent: pending_intent
    });

    res.json(result);
  } catch (error) {
    console.error('Staff AI chat error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Execute a write action the assistant proposed (book/reschedule/
 *          cancel an appointment, send a reminder, register a customer, add
 *          a pet) - only ever called after the staff member has explicitly
 *          confirmed the proposal shown in chat. Re-validates everything the
 *          equivalent manual REST endpoint would (existence, conflicts,
 *          duplicates) rather than trusting the AI-resolved slots blindly.
 * @route   POST /api/ai/actions/confirm
 * @access  Private (admin, veterinarian, receptionist)
 */
const confirmAction = async (req, res) => {
  try {
    const { action } = req.body;
    if (!action || !action.type || !action.slots) {
      return res.status(400).json({ success: false, message: 'action (with type and slots) is required' });
    }

    switch (action.type) {
      case 'book_appointment':
        return await executeBookAppointment(action.slots, req, res);
      case 'reschedule_appointment':
        return await executeRescheduleAppointment(action.slots, req, res);
      case 'cancel_appointment':
        return await executeCancelAppointment(action.slots, req, res);
      case 'send_reminder':
        return await executeSendReminder(action.slots, req, res);
      case 'register_customer':
        return await executeRegisterCustomer(action.slots, req, res);
      case 'add_pet':
        return await executeAddPet(action.slots, req, res);
      case 'send_aftercare_email':
        return await executeSendAftercareEmail(action.slots, req, res);
      default:
        return res.status(400).json({ success: false, message: `Unknown action type: ${action.type}` });
    }
  } catch (error) {
    console.error('AI action confirm error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const executeBookAppointment = async (slots, req, res) => {
  const customer = await getCustomerById(slots.customer_id);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }
  const pet = await getPetById(slots.pet_id);
  if (!pet) {
    return res.status(404).json({ success: false, message: 'Pet not found' });
  }

  if (slots.veterinarian_id) {
    const hasConflict = await checkAppointmentConflict({
      veterinarian_id: slots.veterinarian_id,
      appointment_date: slots.appointment_date,
      appointment_time: slots.appointment_time
    });
    if (hasConflict) {
      return res.status(409).json({ success: false, message: 'This time slot is already booked for the selected veterinarian' });
    }
  }

  const newAppointment = await createAppointment({
    customer_id: slots.customer_id,
    pet_id: slots.pet_id,
    veterinarian_id: slots.veterinarian_id || null,
    appointment_date: slots.appointment_date,
    appointment_time: slots.appointment_time,
    appointment_type: slots.appointment_type,
    reason: slots.reason || null
  }, req.user.user_id);

  await logAuditEntry({
    userId: req.user.user_id,
    action: 'CREATE',
    tableName: 'appointments',
    recordId: newAppointment.appointment_id,
    oldValues: null,
    newValues: {
      pet_id: newAppointment.pet_id,
      appointment_date: newAppointment.appointment_date,
      appointment_type: newAppointment.appointment_type,
      status: newAppointment.status
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({ success: true, message: 'Appointment booked successfully', data: { appointment: newAppointment } });
};

const executeRescheduleAppointment = async (slots, req, res) => {
  const existingAppointment = await getAppointmentById(slots.appointment_id);
  if (!existingAppointment) {
    return res.status(404).json({ success: false, message: 'Appointment not found' });
  }

  if (existingAppointment.veterinarian_id) {
    const hasConflict = await checkAppointmentConflict({
      veterinarian_id: existingAppointment.veterinarian_id,
      appointment_date: slots.appointment_date,
      appointment_time: slots.appointment_time
    }, slots.appointment_id);
    if (hasConflict) {
      return res.status(409).json({ success: false, message: 'This time slot is already booked for the selected veterinarian' });
    }
  }

  const updatedAppointment = await updateAppointment(slots.appointment_id, {
    appointment_date: slots.appointment_date,
    appointment_time: slots.appointment_time
  }, req.user.user_id);

  res.status(200).json({ success: true, message: 'Appointment rescheduled successfully', data: { appointment: updatedAppointment } });
};

const executeCancelAppointment = async (slots, req, res) => {
  const existingAppointment = await getAppointmentById(slots.appointment_id);
  if (!existingAppointment) {
    return res.status(404).json({ success: false, message: 'Appointment not found' });
  }

  const updatedAppointment = await updateAppointmentStatus(
    slots.appointment_id, 'cancelled', req.user.user_id, slots.cancellation_reason || null
  );

  res.status(200).json({ success: true, message: 'Appointment cancelled successfully', data: { appointment: updatedAppointment } });
};

const executeSendReminder = async (slots, req, res) => {
  const appointment = await getAppointmentById(slots.appointment_id);
  if (!appointment) {
    return res.status(404).json({ success: false, message: 'Appointment not found' });
  }

  const customer = await getCustomerById(appointment.customer_id);
  if (!customer || !customer.email) {
    return res.status(400).json({ success: false, message: 'This customer has no email on file' });
  }

  await sendAppointmentReminder({
    to: customer.email,
    customerName: `${appointment.customer_first_name} ${appointment.customer_last_name}`,
    petName: appointment.pet_name,
    appointmentDate: appointment.appointment_date,
    appointmentTime: appointment.appointment_time,
    vetName: appointment.veterinarian_name || null,
    reason: appointment.reason || null
  });

  await markReminderSent(slots.appointment_id);

  await logAuditEntry({
    userId: req.user.user_id,
    action: 'UPDATE',
    tableName: 'appointments',
    recordId: slots.appointment_id,
    oldValues: { reminder_sent: false },
    newValues: { reminder_sent: true },
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(200).json({ success: true, message: 'Reminder sent successfully' });
};

const executeSendAftercareEmail = async (slots, req, res) => {
  const customer = await getCustomerById(slots.customer_id);
  if (!customer || !customer.email) {
    return res.status(400).json({ success: false, message: 'This customer has no email on file' });
  }

  await sendCustomEmail({
    to: customer.email,
    customerName: `${customer.first_name} ${customer.last_name}`,
    subject: slots.subject,
    message: slots.message,
    senderName: `Dr. ${req.user.first_name} ${req.user.last_name}`
  });

  await logAuditEntry({
    userId: req.user.user_id,
    action: 'CREATE',
    tableName: 'customers',
    recordId: slots.customer_id,
    oldValues: null,
    newValues: { aftercare_email_sent_for: slots.pet_name },
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(200).json({ success: true, message: 'Aftercare instructions emailed successfully' });
};

const executeRegisterCustomer = async (slots, req, res) => {
  if (await phoneExists(slots.phone)) {
    return res.status(409).json({ success: false, message: 'A customer with this phone number already exists' });
  }
  if (slots.email && await emailExists(slots.email)) {
    return res.status(409).json({ success: false, message: 'A customer with this email already exists' });
  }

  const newCustomer = await createCustomer({
    first_name: slots.first_name,
    last_name: slots.last_name,
    phone: slots.phone,
    email: slots.email || null,
    address: slots.address || null,
    city: slots.city || null
  }, req.user.user_id);

  await logAuditEntry({
    userId: req.user.user_id,
    action: 'CREATE',
    tableName: 'customers',
    recordId: newCustomer.customer_id,
    oldValues: null,
    newValues: { first_name: newCustomer.first_name, last_name: newCustomer.last_name, phone: newCustomer.phone },
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({ success: true, message: 'Customer registered successfully', data: { customer: newCustomer } });
};

const executeAddPet = async (slots, req, res) => {
  const customer = await getCustomerById(slots.customer_id);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  const newPet = await createPet({
    customer_id: slots.customer_id,
    pet_name: slots.pet_name,
    species: slots.species,
    breed: slots.breed || null,
    gender: slots.gender || null,
    date_of_birth: slots.date_of_birth || null
  }, req.user.user_id);

  await logAuditEntry({
    userId: req.user.user_id,
    action: 'CREATE',
    tableName: 'pets',
    recordId: newPet.pet_id,
    oldValues: null,
    newValues: { pet_name: newPet.pet_name, species: newPet.species, customer_id: newPet.customer_id },
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({ success: true, message: 'Pet added successfully', data: { pet: newPet } });
};

/**
 * @desc    Ask the AI assistant a question, scoped to the logged-in
 *          customer's own pets/records only
 * @route   POST /api/ai/customer-chat
 * @access  Private (customer / pet owner)
 */
const customerChat = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, message: 'question is required' });
    }

    const result = await aiService.askAssistant({
      question,
      role: 'pet_owner', // never trusted from the client
      customerId: req.customer.customer_id // enforced server-side from the authenticated customer
    });

    res.json(result);
  } catch (error) {
    console.error('Customer AI chat error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Ask the AI assistant a general question (public FAQs / care guides only)
 * @route   POST /api/ai/public-chat
 * @access  Public
 */
const publicChat = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, message: 'question is required' });
    }

    const result = await aiService.askAssistant({ question, role: 'guest' });
    res.json(result);
  } catch (error) {
    console.error('Public AI chat error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    List general pet-care FAQs (same content backing the guest
 *          RAG assistant) - guest-safe, no clinic/account data
 * @route   GET /api/ai/faqs
 * @access  Public
 */
const getFaqs = async (req, res) => {
  try {
    res.json({ success: true, categories: FAQ_CATEGORIES, faqs: FAQS });
  } catch (error) {
    console.error('Get FAQs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    (Re)ingest all existing medical records into the vector store
 * @route   POST /api/ai/ingest/medical-records
 * @access  Private (Admin only) - one-off backfill / maintenance
 */
const backfillMedicalRecords = async (req, res) => {
  try {
    const result = await aiService.ingestMedicalRecord(); // no id = backfill all
    res.json(result);
  } catch (error) {
    console.error('AI ingestion backfill error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Backfill every RAG source type in one call (medical records,
 *          disease cases, lab reports, FAQs)
 * @route   POST /api/ai/ingest/all
 * @access  Private (Admin only)
 */
const backfillAll = async (req, res) => {
  try {
    const result = await aiService.ingestAll();
    res.json(result);
  } catch (error) {
    console.error('AI full ingestion backfill error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Explain a raw ML model output (outbreak risk, sales forecast,
 *          inventory forecast) in plain language
 * @route   POST /api/ai/explain
 * @access  Private (staff)
 */
const explainOutput = async (req, res) => {
  try {
    const { output_type, data } = req.body;
    if (!data) {
      return res.status(400).json({ success: false, message: 'data is required' });
    }

    const result = await aiService.explainMlOutput(output_type, data);
    res.json(result);
  } catch (error) {
    console.error('Explain ML output error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export {
  checkHealth,
  staffChat,
  customerChat,
  publicChat,
  getFaqs,
  backfillMedicalRecords,
  backfillAll,
  explainOutput,
  confirmAction
};