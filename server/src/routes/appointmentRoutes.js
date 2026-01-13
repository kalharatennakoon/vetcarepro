import express from 'express';
import {
  getAppointments,
  getAppointment,
  createNewAppointment,
  updateAppointmentById,
  deleteAppointmentById,
  updateStatus
} from '../controllers/appointmentController.js';
import { authenticate } from '../middleware/auth.js';
import { adminOnly } from '../middleware/roleCheck.js';
import {
  validateAppointmentCreate,
  validateAppointmentUpdate
} from '../middleware/validation.js';

const router = express.Router();

/**
 * Appointment Routes
 * Base path: /api/appointments
 * All routes require authentication
 */

// Apply authentication to all routes
router.use(authenticate);

// @route   GET /api/appointments
// @desc    Get all appointments
// @access  Private
router.get('/', getAppointments);

// @route   GET /api/appointments/:id
// @desc    Get appointment by ID
// @access  Private
router.get('/:id', getAppointment);

// @route   POST /api/appointments
// @desc    Create new appointment
// @access  Private
router.post('/', validateAppointmentCreate, createNewAppointment);

// @route   PUT /api/appointments/:id
// @desc    Update appointment
// @access  Private
router.put('/:id', validateAppointmentUpdate, updateAppointmentById);

// @route   PATCH /api/appointments/:id/status
// @desc    Update appointment status
// @access  Private
router.patch('/:id/status', updateStatus);

// @route   DELETE /api/appointments/:id
// @desc    Delete appointment
// @access  Private (Admin only)
router.delete('/:id', adminOnly, deleteAppointmentById);

export default router;
