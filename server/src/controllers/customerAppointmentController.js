import {
  getAppointmentsByCustomer,
  getSlotBookingCount,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  updateAppointmentStatus,
  checkAppointmentConflict
} from '../models/appointmentModel.js';
import { getPetById } from '../models/petModel.js';
import { getAllUsers, getActiveVeterinarianById } from '../models/userModel.js';
import {
  isClinicOpenDay,
  isWithinClinicHours,
  generateTimeSlots,
  meetsLeadTime,
  APPOINTMENT_DURATION_MINUTES,
  MAX_CONCURRENT_APPOINTMENTS,
  MIN_LEAD_HOURS
} from '../utils/appointmentRules.js';

/**
 * Customer (Pet Owner) Appointment Controller
 * Self-service booking for the pet owner portal. Kept separate from
 * appointmentController.js (the staff CRUD) because the rules are
 * different: owners can only touch their own appointments, can't assign
 * a vet or see anyone else's booking, and are bound by the 48-hour /
 * clinic-hours / v1 capacity rules in utils/appointmentRules.js.
 */

const ACTIVE_STATUSES = ['scheduled', 'confirmed'];

/**
 * @route   GET /api/customer-auth/veterinarians
 * @desc    List active veterinarians a pet owner can choose as a preferred
 *          vet when booking - only name/specialization, no PII
 * @access  Private (customer)
 */
export const listVeterinarians = async (req, res) => {
  try {
    const veterinarians = await getAllUsers({ role: 'veterinarian', is_active: true });
    res.status(200).json({
      status: 'success',
      data: {
        veterinarians: veterinarians.map((v) => ({
          veterinarian_id: v.user_id,
          first_name: v.first_name,
          last_name: v.last_name,
          specialization: v.specialization
        }))
      }
    });
  } catch (error) {
    console.error('List veterinarians error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching veterinarians'
    });
  }
};

/**
 * @route   GET /api/customer-auth/appointments
 * @desc    List the current customer's own appointments
 * @access  Private (customer)
 */
export const listMyAppointments = async (req, res) => {
  try {
    const appointments = await getAppointmentsByCustomer(req.customer.customer_id);
    res.status(200).json({
      status: 'success',
      results: appointments.length,
      data: { appointments }
    });
  } catch (error) {
    console.error('List my appointments error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching your appointments'
    });
  }
};

/**
 * @route   GET /api/customer-auth/appointments/availability?date=YYYY-MM-DD&veterinarian_id=12
 * @desc    Get bookable time slots for a date - only exposes whether each
 *          slot is full, never who (if anyone) has booked it. When a
 *          veterinarian_id is given, checks that specific vet's own
 *          calendar instead of the generic v1 capacity pool.
 * @access  Private (customer)
 */
export const getAvailability = async (req, res) => {
  try {
    const { date } = req.query;
    const veterinarianId = req.query.veterinarian_id ? parseInt(req.query.veterinarian_id, 10) : null;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ status: 'error', message: 'A valid date (YYYY-MM-DD) is required' });
    }
    if (veterinarianId && !(await getActiveVeterinarianById(veterinarianId))) {
      return res.status(404).json({ status: 'error', message: 'Veterinarian not found' });
    }

    const isClinicDay = isClinicOpenDay(date);
    const slots = [];

    if (isClinicDay) {
      for (const time of generateTimeSlots()) {
        const leadTimeOk = meetsLeadTime(date, time);
        let remainingCapacity;

        if (veterinarianId) {
          const hasConflict = await checkAppointmentConflict({ veterinarian_id: veterinarianId, appointment_date: date, appointment_time: time });
          remainingCapacity = hasConflict ? 0 : 1;
        } else {
          const bookedCount = await getSlotBookingCount(date, time);
          remainingCapacity = Math.max(MAX_CONCURRENT_APPOINTMENTS - bookedCount, 0);
        }

        slots.push({
          time,
          remainingCapacity,
          available: remainingCapacity > 0 && leadTimeOk,
          meetsLeadTime: leadTimeOk
        });
      }
    }

    res.status(200).json({
      status: 'success',
      data: { date, isClinicDay, slots }
    });
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while checking availability'
    });
  }
};

/**
 * Validates clinic-day, clinic-hours, 48-hour lead time, and slot capacity
 * for a requested date/time. When veterinarianId is given, checks that
 * vet's own calendar (mirrors the staff-side conflict check and the DB's
 * (veterinarian_id, appointment_date, appointment_time) uniqueness
 * constraint); otherwise falls back to the v1 shared capacity pool.
 * Returns `{ message, status }` on failure, or null if OK - `status` lets
 * each caller return 400 for "this request can never work" (closed day,
 * outside hours, too little lead time) vs 409 for "this exact slot is
 * taken right now" (vet conflict, capacity), matching the distinction the
 * routes made before this function was shared.
 *
 * Exported for aiController.js's confirmAction (the AI assistant's
 * book/reschedule-appointment actions) - day and capacity apply to every
 * booking path regardless of who/what initiates it, but the 48-hour lead
 * time and clinic-hours window are both skipped for staff/AI callers via
 * `enforceLeadTime: false` / `enforceClinicHours: false`, matching the
 * staff manual-booking path (appointmentController.js createNewAppointment),
 * which has never enforced either - staff and the AI assistant routinely
 * book same-day/emergency/after-hours visits. Only the self-service
 * pet-owner portal enforces both (the defaults below).
 */
export const validateRequestedSlot = async (
  date, time, veterinarianId = null, excludeAppointmentId = null,
  { enforceLeadTime = true, enforceClinicHours = true } = {}
) => {
  if (!isClinicOpenDay(date)) {
    return { message: 'The clinic is closed on that day. Please choose a date from Monday to Saturday.', status: 400 };
  }
  if (enforceClinicHours && !isWithinClinicHours(time, APPOINTMENT_DURATION_MINUTES)) {
    return { message: 'Please choose a time between 9:00 AM and 6:30 PM.', status: 400 };
  }
  if (enforceLeadTime && !meetsLeadTime(date, time)) {
    return { message: `Appointments must be booked at least ${MIN_LEAD_HOURS} hours in advance.`, status: 400 };
  }

  if (veterinarianId) {
    const hasConflict = await checkAppointmentConflict(
      { veterinarian_id: veterinarianId, appointment_date: date, appointment_time: time },
      excludeAppointmentId
    );
    if (hasConflict) {
      return { message: 'That veterinarian is not available at this time. Please choose another time or vet.', status: 409 };
    }
    return null;
  }

  const bookedCount = await getSlotBookingCount(date, time, excludeAppointmentId);
  if (bookedCount >= MAX_CONCURRENT_APPOINTMENTS) {
    return { message: 'That time slot is fully booked. Please choose another time.', status: 409 };
  }
  return null;
};

/**
 * @route   POST /api/customer-auth/appointments
 * @desc    Book a new appointment for one of the customer's own pets
 * @access  Private (customer)
 */
export const createMyAppointment = async (req, res) => {
  try {
    const { pet_id, appointment_date, appointment_time, appointment_type, reason, veterinarian_id } = req.body;

    const pet = await getPetById(pet_id);
    if (!pet || pet.customer_id !== req.customer.customer_id) {
      return res.status(404).json({ status: 'error', message: 'Pet not found on your account' });
    }

    let veterinarianId = null;
    if (veterinarian_id !== undefined && veterinarian_id !== null && veterinarian_id !== '') {
      veterinarianId = parseInt(veterinarian_id, 10);
      if (!(await getActiveVeterinarianById(veterinarianId))) {
        return res.status(404).json({ status: 'error', message: 'Selected veterinarian not found' });
      }
    }

    const slotError = await validateRequestedSlot(appointment_date, appointment_time, veterinarianId);
    if (slotError) {
      return res.status(slotError.status).json({ status: 'error', message: slotError.message });
    }

    const newAppointment = await createAppointment({
      customer_id: req.customer.customer_id,
      pet_id,
      veterinarian_id: veterinarianId,
      appointment_date,
      appointment_time,
      duration_minutes: APPOINTMENT_DURATION_MINUTES,
      appointment_type,
      reason,
      status: 'confirmed'
    }, null);

    const fullAppointment = await getAppointmentById(newAppointment.appointment_id);

    res.status(201).json({
      status: 'success',
      message: 'Appointment booked successfully',
      data: { appointment: fullAppointment }
    });
  } catch (error) {
    console.error('Create my appointment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while booking your appointment'
    });
  }
};

/**
 * @route   PUT /api/customer-auth/appointments/:id
 * @desc    Update/reschedule the customer's own appointment
 * @access  Private (customer)
 */
export const updateMyAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await getAppointmentById(id);

    if (!existing || existing.customer_id !== req.customer.customer_id) {
      return res.status(404).json({ status: 'error', message: 'Appointment not found' });
    }
    if (!ACTIVE_STATUSES.includes(existing.status)) {
      return res.status(400).json({ status: 'error', message: 'This appointment can no longer be changed' });
    }
    if (!meetsLeadTime(existing.appointment_date, existing.appointment_time)) {
      return res.status(403).json({
        status: 'error',
        message: `Appointments can only be changed at least ${MIN_LEAD_HOURS} hours before their scheduled time`
      });
    }

    const newDate = req.body.appointment_date || existing.appointment_date;
    const newTime = req.body.appointment_time || existing.appointment_time;

    let newVeterinarianId = existing.veterinarian_id;
    if ('veterinarian_id' in req.body) {
      const raw = req.body.veterinarian_id;
      newVeterinarianId = (raw === null || raw === '') ? null : parseInt(raw, 10);
      if (newVeterinarianId && !(await getActiveVeterinarianById(newVeterinarianId))) {
        return res.status(404).json({ status: 'error', message: 'Selected veterinarian not found' });
      }
    }

    const slotError = await validateRequestedSlot(newDate, newTime, newVeterinarianId, id);
    if (slotError) {
      return res.status(slotError.status).json({ status: 'error', message: slotError.message });
    }

    await updateAppointment(id, {
      appointment_date: newDate,
      appointment_time: newTime,
      appointment_type: req.body.appointment_type,
      reason: req.body.reason,
      veterinarian_id: newVeterinarianId
    }, null);

    const fullAppointment = await getAppointmentById(id);

    res.status(200).json({
      status: 'success',
      message: 'Appointment updated successfully',
      data: { appointment: fullAppointment }
    });
  } catch (error) {
    console.error('Update my appointment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating your appointment'
    });
  }
};

/**
 * @route   DELETE /api/customer-auth/appointments/:id
 * @desc    Cancel the customer's own appointment (soft-delete via status,
 *          since billing/medical_records may reference the row)
 * @access  Private (customer)
 */
export const cancelMyAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await getAppointmentById(id);

    if (!existing || existing.customer_id !== req.customer.customer_id) {
      return res.status(404).json({ status: 'error', message: 'Appointment not found' });
    }
    if (!ACTIVE_STATUSES.includes(existing.status)) {
      return res.status(400).json({ status: 'error', message: 'This appointment can no longer be cancelled' });
    }
    if (!meetsLeadTime(existing.appointment_date, existing.appointment_time)) {
      return res.status(403).json({
        status: 'error',
        message: `Appointments can only be cancelled at least ${MIN_LEAD_HOURS} hours before their scheduled time`
      });
    }

    const cancelledAppointment = await updateAppointmentStatus(id, 'cancelled', null, 'Cancelled by pet owner');

    res.status(200).json({
      status: 'success',
      message: 'Appointment cancelled successfully',
      data: { appointment: cancelledAppointment }
    });
  } catch (error) {
    console.error('Cancel my appointment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while cancelling your appointment'
    });
  }
};
