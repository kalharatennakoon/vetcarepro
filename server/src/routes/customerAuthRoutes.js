import express from 'express';
import {
  login,
  getCurrentCustomer,
  updateMyProfile,
  getMyPets,
  logout,
  changePassword,
  verifyIdentity,
  setPassword
} from '../controllers/customerAuthController.js';
import { listMyLabReports, viewMyLabReport } from '../controllers/labReportController.js';
import { listMyPetVaccinations } from '../controllers/petController.js';
import {
  listVeterinarians,
  listMyAppointments,
  getAvailability,
  createMyAppointment,
  updateMyAppointment,
  cancelMyAppointment
} from '../controllers/customerAppointmentController.js';
import { authenticateCustomer } from '../middleware/auth.js';
import {
  validateCustomerAppointmentCreate,
  validateCustomerAppointmentUpdate,
  validateCustomerProfileUpdate
} from '../middleware/validation.js';

const router = express.Router();

/**
 * Customer (Pet Owner) Auth Routes
 * Base path: /api/customer-auth
 * Kept fully separate from /api/auth (staff) - separate controller,
 * separate middleware, separate token type. See authenticateCustomer in
 * middleware/auth.js and generateCustomerToken in utils/authUtils.js.
 */

// @route   POST /api/customer-auth/login
// @desc    Log in with email or phone as username
// @access  Public
router.post('/login', login);

// @route   POST /api/customer-auth/verify-identity
// @desc    Confirm email + phone match a pet owner on file, issue a setup token
// @access  Public
router.post('/verify-identity', verifyIdentity);

// @route   POST /api/customer-auth/set-password
// @desc    Set a password for the first time using a setup token, then log in
// @access  Public (requires a valid setupToken)
router.post('/set-password', setPassword);

// @route   GET /api/customer-auth/me
// @desc    Get current logged-in customer
// @access  Private (customer)
router.get('/me', authenticateCustomer, getCurrentCustomer);

// @route   PUT /api/customer-auth/me
// @desc    Update own editable contact details (alternate phone, address,
//          city, preferred contact method, emergency contact/phone only)
// @access  Private (customer)
router.put('/me', authenticateCustomer, validateCustomerProfileUpdate, updateMyProfile);

// @route   GET /api/customer-auth/me/pets
// @desc    Get pets belonging to the current customer
// @access  Private (customer)
router.get('/me/pets', authenticateCustomer, getMyPets);

// @route   GET /api/customer-auth/pets/:petId/vaccinations
// @desc    Get vaccination history for one of the current customer's own pets
// @access  Private (customer)
router.get('/pets/:petId/vaccinations', authenticateCustomer, listMyPetVaccinations);

// @route   GET /api/customer-auth/pets/:petId/lab-reports
// @desc    Get lab reports for one of the current customer's own pets
// @access  Private (customer)
router.get('/pets/:petId/lab-reports', authenticateCustomer, listMyLabReports);

// @route   GET /api/customer-auth/lab-reports/:reportId/view
// @desc    Stream a lab report file, only if it belongs to one of the
//          current customer's own pets
// @access  Private (customer)
router.get('/lab-reports/:reportId/view', authenticateCustomer, viewMyLabReport);

// @route   GET /api/customer-auth/veterinarians
// @desc    List active veterinarians a pet owner can pick as their preferred vet
// @access  Private (customer)
router.get('/veterinarians', authenticateCustomer, listVeterinarians);

// @route   GET /api/customer-auth/appointments
// @desc    Get the current customer's own appointments
// @access  Private (customer)
router.get('/appointments', authenticateCustomer, listMyAppointments);

// @route   GET /api/customer-auth/appointments/availability
// @desc    Get bookable time slots for a date (no other owners' details exposed)
// @access  Private (customer)
router.get('/appointments/availability', authenticateCustomer, getAvailability);

// @route   POST /api/customer-auth/appointments
// @desc    Book a new appointment for one of the customer's own pets
// @access  Private (customer)
router.post('/appointments', authenticateCustomer, validateCustomerAppointmentCreate, createMyAppointment);

// @route   PUT /api/customer-auth/appointments/:id
// @desc    Update/reschedule the customer's own appointment (>= 48h out only)
// @access  Private (customer)
router.put('/appointments/:id', authenticateCustomer, validateCustomerAppointmentUpdate, updateMyAppointment);

// @route   DELETE /api/customer-auth/appointments/:id
// @desc    Cancel the customer's own appointment (>= 48h out only)
// @access  Private (customer)
router.delete('/appointments/:id', authenticateCustomer, cancelMyAppointment);

// @route   POST /api/customer-auth/logout
// @desc    Logout
// @access  Private (customer)
router.post('/logout', authenticateCustomer, logout);

// @route   POST /api/customer-auth/change-password
// @desc    Change own password (requires current password)
// @access  Private (customer)
router.post('/change-password', authenticateCustomer, changePassword);

export default router;
