import {
  getAllAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  updateAppointmentStatus,
  getAppointmentCount,
  checkAppointmentConflict
} from '../models/appointmentModel.js';
import { getCustomerById } from '../models/customerModel.js';
import { getPetById } from '../models/petModel.js';

/**
 * Appointment Controller
 * Handles CRUD operations for appointments
 */

/**
 * @route   GET /api/appointments
 * @desc    Get all appointments with filters
 * @access  Private
 */
export const getAppointments = async (req, res) => {
  try {
    const { date, status, veterinarian_id, customer_id, pet_id, limit, offset } = req.query;

    const filters = {};
    if (date) filters.date = date;
    if (status) filters.status = status;
    if (veterinarian_id) filters.veterinarian_id = parseInt(veterinarian_id);
    if (customer_id) filters.customer_id = parseInt(customer_id);
    if (pet_id) filters.pet_id = parseInt(pet_id);
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const appointments = await getAllAppointments(filters);
    const totalCount = await getAppointmentCount();

    res.status(200).json({
      status: 'success',
      results: appointments.length,
      total: totalCount,
      data: {
        appointments
      }
    });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching appointments'
    });
  }
};

/**
 * @route   GET /api/appointments/:id
 * @desc    Get appointment by ID
 * @access  Private
 */
export const getAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await getAppointmentById(id);

    if (!appointment) {
      return res.status(404).json({
        status: 'error',
        message: 'Appointment not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        appointment
      }
    });
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching appointment'
    });
  }
};

/**
 * @route   POST /api/appointments
 * @desc    Create new appointment
 * @access  Private
 */
export const createNewAppointment = async (req, res) => {
  try {
    const appointmentData = req.body;

    // Verify customer exists
    const customer = await getCustomerById(appointmentData.customer_id);
    if (!customer) {
      return res.status(404).json({
        status: 'error',
        message: 'Customer not found'
      });
    }

    // Verify pet exists and belongs to customer
    const pet = await getPetById(appointmentData.pet_id);
    if (!pet) {
      return res.status(404).json({
        status: 'error',
        message: 'Pet not found'
      });
    }
    if (pet.customer_id !== appointmentData.customer_id) {
      return res.status(400).json({
        status: 'error',
        message: 'Pet does not belong to the selected customer'
      });
    }

    // Check for appointment conflicts if veterinarian is assigned
    if (appointmentData.veterinarian_id) {
      const hasConflict = await checkAppointmentConflict(appointmentData);
      if (hasConflict) {
        return res.status(409).json({
          status: 'error',
          message: 'This time slot is already booked for the selected veterinarian'
        });
      }
    }

    const newAppointment = await createAppointment(appointmentData, req.user.user_id);

    res.status(201).json({
      status: 'success',
      message: 'Appointment created successfully',
      data: {
        appointment: newAppointment
      }
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while creating appointment'
    });
  }
};

/**
 * @route   PUT /api/appointments/:id
 * @desc    Update appointment
 * @access  Private
 */
export const updateAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const appointmentData = req.body;

    // Check if appointment exists
    const existingAppointment = await getAppointmentById(id);
    if (!existingAppointment) {
      return res.status(404).json({
        status: 'error',
        message: 'Appointment not found'
      });
    }

    // If veterinarian, date, or time is being changed, check for conflicts
    if (appointmentData.veterinarian_id || appointmentData.appointment_date || appointmentData.appointment_time) {
      const checkData = {
        veterinarian_id: appointmentData.veterinarian_id || existingAppointment.veterinarian_id,
        appointment_date: appointmentData.appointment_date || existingAppointment.appointment_date,
        appointment_time: appointmentData.appointment_time || existingAppointment.appointment_time
      };

      if (checkData.veterinarian_id) {
        const hasConflict = await checkAppointmentConflict(checkData, parseInt(id));
        if (hasConflict) {
          return res.status(409).json({
            status: 'error',
            message: 'This time slot is already booked for the selected veterinarian'
          });
        }
      }
    }

    const updatedAppointment = await updateAppointment(
      parseInt(id),
      appointmentData,
      req.user.user_id
    );

    res.status(200).json({
      status: 'success',
      message: 'Appointment updated successfully',
      data: {
        appointment: updatedAppointment
      }
    });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating appointment'
    });
  }
};

/**
 * @route   DELETE /api/appointments/:id
 * @desc    Delete appointment
 * @access  Private
 */
export const deleteAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if appointment exists
    const existingAppointment = await getAppointmentById(id);
    if (!existingAppointment) {
      return res.status(404).json({
        status: 'error',
        message: 'Appointment not found'
      });
    }

    await deleteAppointment(parseInt(id));

    res.status(200).json({
      status: 'success',
      message: 'Appointment deleted successfully'
    });
  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while deleting appointment'
    });
  }
};

/**
 * @route   PATCH /api/appointments/:id/status
 * @desc    Update appointment status
 * @access  Private
 */
export const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Check if appointment exists
    const existingAppointment = await getAppointmentById(id);
    if (!existingAppointment) {
      return res.status(404).json({
        status: 'error',
        message: 'Appointment not found'
      });
    }

    // Validate status
    const validStatuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid status value'
      });
    }

    const updatedAppointment = await updateAppointmentStatus(
      parseInt(id),
      status,
      req.user.user_id
    );

    res.status(200).json({
      status: 'success',
      message: 'Appointment status updated successfully',
      data: {
        appointment: updatedAppointment
      }
    });
  } catch (error) {
    console.error('Update appointment status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating appointment status'
    });
  }
};
