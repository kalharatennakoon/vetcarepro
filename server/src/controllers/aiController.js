/**
 * AI Controller (RAG Assistant)
 * Exposes the AI assistant to authenticated staff (staffChat), authenticated
 * pet owners scoped to their own records (customerChat), and a restricted
 * public/guest endpoint for general (non-clinic-data) questions (publicChat).
 */

import * as aiService from '../services/aiService.js';
import { FAQ_CATEGORIES, FAQS } from '../data/faqData.js';
import {
  createAppointment,
  updateAppointment,
  updateAppointmentStatus,
  getAppointmentById,
  markReminderSent
} from '../models/appointmentModel.js';
import { createCustomer, getCustomerById, phoneExists, emailExists } from '../models/customerModel.js';
import { createPet, getPetById } from '../models/petModel.js';
import { createUser, emailExists as staffEmailExists } from '../models/userModel.js';
import { hashPassword, sanitizeUser, DEFAULT_STAFF_PASSWORD } from '../utils/authUtils.js';
import { logAuditEntry } from '../models/diseaseCaseModel.js';
import { validateRequestedSlot } from './customerAppointmentController.js';
import { sendAppointmentReminder, sendCustomEmail } from '../services/emailService.js';

const VALID_STAFF_ROLES = ['admin', 'veterinarian', 'receptionist'];
// Same clinical-staff set clinical_tools.py/pet_health_intent.py restrict
// send_aftercare_email's proposal to - re-checked here since confirmAction
// is reachable directly with any staff-confirmed action payload.
const CLINICAL_STAFF_ROLES = ['admin', 'veterinarian'];
// Matches server/src/middleware/validation.js's phone format for staff -
// the AI action path writes via createUser() directly, bypassing that
// express-validator chain, so it's re-checked here.
const STAFF_PHONE_RE = /^\+94[0-9]{9}$/;
// Matches the DB CHECK constraint on appointments.appointment_type and the
// same list validation.js's express-validator chain uses for the manual
// REST endpoint - action_intent.py fills this correctly on the happy path,
// but a malformed/tampered action payload would otherwise reach Postgres
// and surface as a raw 500 instead of a clean 400.
const VALID_APPOINTMENT_TYPES = ['checkup', 'vaccination', 'surgery', 'emergency', 'follow_up', 'consultation'];
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const APPOINTMENT_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// Bounds on chat input forwarded to the ML service. The happy path is
// already bounded client-side (AIAssistant.jsx sends history.slice(-6)) and
// server-side (action_intent.py's _conversation_text/_extract_slots_via_llm
// only look at the last 8 turns) - these exist for a crafted request that
// skips the client, so an unbounded array/string can't reach Flask/Ollama.
const MAX_QUESTION_LENGTH = 2000;
const MAX_HISTORY_TURNS = 10;

const normalizeChatInput = (question, history) => ({
  question: String(question).slice(0, MAX_QUESTION_LENGTH),
  history: Array.isArray(history) ? history.slice(-MAX_HISTORY_TURNS) : []
});

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
    const { question: rawQuestion, history: rawHistory, pending_intent } = req.body;
    if (!rawQuestion || !String(rawQuestion).trim()) {
      return res.status(400).json({ success: false, message: 'question is required' });
    }
    const { question, history } = normalizeChatInput(rawQuestion, rawHistory);

    const result = await aiService.askAssistant({
      question,
      role: req.user.role, // enforced server-side from the authenticated user, never trusted from the client
      userId: req.user.user_id, // enables "my"/"mine" appointment charts to scope to this vet
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
 * @desc    Real-time streamed variant of staffChat (Server-Sent Events) -
 *          the admin-only "show model reasoning live" chat view. Proxies
 *          the ML service's SSE stream straight through rather than
 *          buffering it, since the whole point is forwarding each
 *          reasoning_delta event to the client as it arrives.
 * @route   POST /api/ai/chat/stream
 * @access  Private (admin only - enforced by the adminOnly route middleware)
 */
const streamChat = async (req, res) => {
  const { question: rawQuestion, history: rawHistory, pending_intent } = req.body;
  if (!rawQuestion || !String(rawQuestion).trim()) {
    return res.status(400).json({ success: false, message: 'question is required' });
  }
  const { question, history } = normalizeChatInput(rawQuestion, rawHistory);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const upstream = await aiService.askAssistantStream({
      question,
      role: req.user.role, // enforced server-side from the authenticated user, never trusted from the client
      userId: req.user.user_id,
      history,
      pendingIntent: pending_intent
    });

    upstream.on('data', (chunk) => res.write(chunk));
    upstream.on('end', () => res.end());
    upstream.on('error', (error) => {
      console.error('AI stream chat upstream error:', error.message);
      res.end();
    });

    // Client navigated away or aborted mid-stream - stop pulling from
    // Ollama instead of generating a full (possibly minutes-long) answer
    // nobody's listening for.
    req.on('close', () => upstream.destroy());
  } catch (error) {
    console.error('AI stream chat error:', error);
    res.write(`data: ${JSON.stringify({
      type: 'final',
      success: false,
      message: 'Failed to get a response from the AI assistant'
    })}\n\n`);
    res.end();
  }
};

/**
 * @desc    Execute a write action the assistant proposed (book/reschedule/
 *          cancel an appointment, send a reminder, register a customer, add
 *          a pet, or - admin only - register a new staff member) - only
 *          ever called after the staff member has explicitly confirmed the
 *          proposal shown in chat. Re-validates everything the equivalent
 *          manual REST endpoint would (existence, conflicts, duplicates,
 *          and per-action role) rather than trusting the AI-resolved slots
 *          blindly.
 * @route   POST /api/ai/actions/confirm
 * @access  Private (admin, veterinarian, receptionist) - individual action
 *          types may further restrict (e.g. register_staff is admin-only)
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
      case 'register_staff':
        return await executeRegisterStaff(action.slots, req, res);
      default:
        return res.status(400).json({ success: false, message: `Unknown action type: ${action.type}` });
    }
  } catch (error) {
    console.error('AI action confirm error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const executeBookAppointment = async (slots, req, res) => {
  if (!ISO_DATE_RE.test(slots.appointment_date || '')) {
    return res.status(400).json({ success: false, message: 'A valid appointment date is required' });
  }
  if (!APPOINTMENT_TIME_RE.test(slots.appointment_time || '')) {
    return res.status(400).json({ success: false, message: 'A valid appointment time (HH:MM) is required' });
  }
  if (!VALID_APPOINTMENT_TYPES.includes(slots.appointment_type)) {
    return res.status(400).json({ success: false, message: 'Invalid appointment type' });
  }
  if (!slots.reason || !String(slots.reason).trim()) {
    return res.status(400).json({ success: false, message: 'A reason for the visit is required' });
  }

  const customer = await getCustomerById(slots.customer_id);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }
  const pet = await getPetById(slots.pet_id);
  if (!pet) {
    return res.status(404).json({ success: false, message: 'Pet not found' });
  }
  // _find_pet_by_name resolves by name (+ optional owner name) - on a
  // common pet name shared across owners, a wrong row could otherwise slip
  // through. Mirrors appointmentController.js's createNewAppointment check.
  if (pet.customer_id !== slots.customer_id) {
    return res.status(400).json({ success: false, message: 'Pet does not belong to the selected customer' });
  }

  // action_intent.py resolves dates from free text ("next Tuesday") without
  // knowing which day of the week that lands on - clinic-day, hours, and
  // capacity/conflict are only checked here, at the actual write, same as
  // the pet-owner customerAppointmentController.js path. Lead time and the
  // clinic-hours window are both skipped (staff booking directly has never
  // enforced either - see appointmentController.js's createNewAppointment).
  const slotError = await validateRequestedSlot(
    slots.appointment_date, slots.appointment_time, slots.veterinarian_id || null, null,
    { enforceLeadTime: false, enforceClinicHours: false }
  );
  if (slotError) {
    return res.status(slotError.status).json({ success: false, message: slotError.message });
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
  // Reachable via a direct payload even though _resolve_reschedule_appointment
  // always falls back to the old time - guards checkAppointmentConflict
  // below from a NULL appointment_time, which Postgres would otherwise
  // compare with `= NULL` and never match, silently passing the check.
  if (!ISO_DATE_RE.test(slots.appointment_date || '')) {
    return res.status(400).json({ success: false, message: 'A valid appointment date is required' });
  }
  if (!APPOINTMENT_TIME_RE.test(slots.appointment_time || '')) {
    return res.status(400).json({ success: false, message: 'A valid appointment time (HH:MM) is required' });
  }

  const existingAppointment = await getAppointmentById(slots.appointment_id);
  if (!existingAppointment) {
    return res.status(404).json({ success: false, message: 'Appointment not found' });
  }

  const slotError = await validateRequestedSlot(
    slots.appointment_date, slots.appointment_time, existingAppointment.veterinarian_id || null,
    slots.appointment_id, { enforceLeadTime: false, enforceClinicHours: false }
  );
  if (slotError) {
    return res.status(slotError.status).json({ success: false, message: slotError.message });
  }

  const updatedAppointment = await updateAppointment(slots.appointment_id, {
    appointment_date: slots.appointment_date,
    appointment_time: slots.appointment_time
  }, req.user.user_id);

  await logAuditEntry({
    userId: req.user.user_id,
    action: 'UPDATE',
    tableName: 'appointments',
    recordId: slots.appointment_id,
    oldValues: { appointment_date: existingAppointment.appointment_date, appointment_time: existingAppointment.appointment_time },
    newValues: { appointment_date: updatedAppointment.appointment_date, appointment_time: updatedAppointment.appointment_time },
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

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

  await logAuditEntry({
    userId: req.user.user_id,
    action: 'UPDATE',
    tableName: 'appointments',
    recordId: slots.appointment_id,
    oldValues: { status: existingAppointment.status },
    newValues: { status: 'cancelled', cancellation_reason: slots.cancellation_reason || null },
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

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
  // clinical_tools.py only ever proposes this action for CLINICAL_STAFF_ROLES
  // (admin/veterinarian) - confirmAction is reachable directly with any
  // staff-confirmed action payload though, so without this a receptionist
  // could send arbitrary (slots.message is fully client-supplied) email to
  // any customer under the clinic's name.
  if (!CLINICAL_STAFF_ROLES.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Sending aftercare instructions is limited to admin and veterinarian accounts' });
  }

  const customer = await getCustomerById(slots.customer_id);
  if (!customer || !customer.email) {
    return res.status(400).json({ success: false, message: 'This customer has no email on file' });
  }

  await sendCustomEmail({
    to: customer.email,
    customerName: `${customer.first_name} ${customer.last_name}`,
    subject: slots.subject,
    message: slots.message,
    // "Dr." only fits a veterinarian - an admin sending aftercare
    // instructions isn't necessarily a doctor.
    senderName: req.user.role === 'veterinarian'
      ? `Dr. ${req.user.first_name} ${req.user.last_name}`
      : `${req.user.first_name} ${req.user.last_name}`
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

const executeRegisterStaff = async (slots, req, res) => {
  // Defense in depth: action_intent.py already refuses to propose this
  // action for a non-admin, but this endpoint is reachable directly with
  // any staff-confirmed action payload (see staffOnly on the route) - the
  // real REST equivalent (POST /api/users) is adminOnly, so this must be too.
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Only admin accounts can register new staff members' });
  }
  if (!VALID_STAFF_ROLES.includes(slots.role)) {
    return res.status(400).json({ success: false, message: 'role must be admin, veterinarian, or receptionist' });
  }
  if (slots.phone && !STAFF_PHONE_RE.test(slots.phone)) {
    return res.status(400).json({ success: false, message: 'phone must be in format +94XXXXXXXXX' });
  }
  if (await staffEmailExists(slots.email)) {
    return res.status(409).json({ success: false, message: 'A user with this email already exists' });
  }

  // Matches createUserByAdmin's default-password convention (POST /api/users) -
  // the account is created with password_must_change so this is never a
  // standing credential.
  const password_hash = await hashPassword(DEFAULT_STAFF_PASSWORD);

  const newUser = await createUser({
    first_name: slots.first_name,
    last_name: slots.last_name,
    email: slots.email,
    phone: slots.phone || null,
    role: slots.role,
    specialization: slots.specialization || null,
    license_number: slots.license_number || null,
    password_hash,
    password_must_change: true,
    created_by: req.user.user_id
  });

  await logAuditEntry({
    userId: req.user.user_id,
    action: 'CREATE',
    tableName: 'users',
    recordId: newUser.user_id,
    oldValues: null,
    newValues: { email: newUser.email, role: newUser.role, first_name: newUser.first_name, last_name: newUser.last_name },
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    message: `Staff account created for ${newUser.first_name} ${newUser.last_name} (${newUser.role}). ` +
      `Temporary password: ${DEFAULT_STAFF_PASSWORD} - they'll be required to change it on first login.`,
    data: { user: sanitizeUser(newUser) }
  });
};

/**
 * @desc    Ask the AI assistant a question, scoped to the logged-in
 *          customer's own pets/records only
 * @route   POST /api/ai/customer-chat
 * @access  Private (customer / pet owner)
 */
const customerChat = async (req, res) => {
  try {
    const { question: rawQuestion, history: rawHistory, pending_intent } = req.body;
    if (!rawQuestion || !String(rawQuestion).trim()) {
      return res.status(400).json({ success: false, message: 'question is required' });
    }
    const { question, history } = normalizeChatInput(rawQuestion, rawHistory);

    const result = await aiService.askAssistant({
      question,
      role: 'pet_owner', // never trusted from the client
      customerId: req.customer.customer_id, // enforced server-side from the authenticated customer
      // Round-trips a pending pet disambiguation ("which pet do you mean?")
      // across turns, same stateless mechanism as the staff chat endpoint -
      // there's no server-side conversation session, so the client resends
      // this each turn (see rag_service.py's general_qa_disambiguation).
      history,
      pendingIntent: pending_intent
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
    const { question: rawQuestion } = req.body;
    if (!rawQuestion || !String(rawQuestion).trim()) {
      return res.status(400).json({ success: false, message: 'question is required' });
    }
    const { question } = normalizeChatInput(rawQuestion, []);

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
  streamChat,
  customerChat,
  publicChat,
  getFaqs,
  backfillMedicalRecords,
  backfillAll,
  explainOutput,
  confirmAction
};