import { body, validationResult } from 'express-validator';

/**
 * Validation Middleware
 * Uses express-validator to validate incoming request data
 */

/**
 * Handle validation errors
 * Call this after validation rules to check for errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  
  next();
};

/**
 * Login validation rules
 */
export const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  
  handleValidationErrors
];

/**
 * User registration validation rules
 */
export const validateUserRegistration = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('first_name')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('last_name')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('phone')
    .optional({ nullable: true })
    .trim()
    .matches(/^\+94[0-9]{9}$/)
    .withMessage('Phone must be in format +94XXXXXXXXX'),
  
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['ADMIN', 'VETERINARIAN', 'RECEPTIONIST'])
    .withMessage('Role must be ADMIN, VETERINARIAN, or RECEPTIONIST'),
  
  body('specialization')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Specialization must not exceed 100 characters'),
  
  body('license_number')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('License number must not exceed 50 characters'),
  
  handleValidationErrors
];

/**
 * User update validation rules
 */
export const validateUserUpdate = [
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),
  
  body('phone')
    .optional({ nullable: true })
    .trim()
    .matches(/^\+94[0-9]{9}$/)
    .withMessage('Phone must be in format +94XXXXXXXXX'),
  
  body('role')
    .optional()
    .isIn(['ADMIN', 'VETERINARIAN', 'RECEPTIONIST'])
    .withMessage('Role must be ADMIN, VETERINARIAN, or RECEPTIONIST'),
  
  body('specialization')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Specialization must not exceed 100 characters'),
  
  body('license_number')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('License number must not exceed 50 characters'),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
  
  body('password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  handleValidationErrors
];

/**
 * Password change validation rules
 */
export const validatePasswordChange = [
  body('current_password')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('new_password')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('confirm_password')
    .notEmpty()
    .withMessage('Password confirmation is required')
    .custom((value, { req }) => value === req.body.new_password)
    .withMessage('Passwords do not match'),
  
  handleValidationErrors
];

/**
 * Customer creation validation rules
 */
export const validateCustomerCreate = [
  body('first_name')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('last_name')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required')
    .matches(/^\+94[0-9]{9}$/)
    .withMessage('Phone must be in format +94XXXXXXXXX'),
  
  body('email')
    .optional({ nullable: true })
    .trim()
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),
  
  body('alternate_phone')
    .optional({ nullable: true })
    .trim()
    .matches(/^\+94[0-9]{9}$/)
    .withMessage('Alternate phone must be in format +94XXXXXXXXX'),
  
  body('emergency_phone')
    .optional({ nullable: true })
    .trim()
    .matches(/^\+94[0-9]{9}$/)
    .withMessage('Emergency phone must be in format +94XXXXXXXXX'),
  
  body('preferred_contact_method')
    .optional()
    .isIn(['phone', 'email', 'sms'])
    .withMessage('Preferred contact method must be phone, email, or sms'),
  
  handleValidationErrors
];

/**
 * Customer update validation rules
 */
export const validateCustomerUpdate = [
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('phone')
    .optional()
    .trim()
    .custom((value) => !value || /^\+94[0-9]{9}$/.test(value))
    .withMessage('Phone must be in format +94XXXXXXXXX'),
  
  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),
  
  body('alternate_phone')
    .optional({ checkFalsy: true })
    .trim()
    .custom((value) => !value || /^\+94[0-9]{9}$/.test(value))
    .withMessage('Alternate phone must be in format +94XXXXXXXXX'),
  
  body('emergency_phone')
    .optional({ checkFalsy: true })
    .trim()
    .custom((value) => !value || /^\+94[0-9]{9}$/.test(value))
    .withMessage('Emergency phone must be in format +94XXXXXXXXX'),
  
  body('preferred_contact_method')
    .optional()
    .isIn(['PHONE', 'EMAIL', 'SMS'])
    .withMessage('Preferred contact method must be PHONE, EMAIL, or SMS'),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
  
  handleValidationErrors
];

/**
 * Pet creation validation
 */
export const validatePetCreate = [
  body('customer_id')
    .notEmpty()
    .withMessage('Customer ID is required')
    .isInt({ min: 1 })
    .withMessage('Customer ID must be a valid number'),
  
  body('pet_name')
    .trim()
    .notEmpty()
    .withMessage('Pet name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Pet name must be between 2 and 50 characters'),
  
  body('species')
    .trim()
    .notEmpty()
    .withMessage('Species is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Species must be between 2 and 50 characters'),
  
  body('gender')
    .optional({ nullable: true })
    .isIn(['Male', 'Female', 'Unknown'])
    .withMessage('Gender must be Male, Female, or Unknown'),
  
  body('date_of_birth')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),
  
  handleValidationErrors
];

/**
 * Pet update validation
 */
export const validatePetUpdate = [
  body('pet_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Pet name must be between 2 and 50 characters'),
  
  body('species')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Species must be between 2 and 50 characters'),
  
  body('gender')
    .optional({ nullable: true })
    .isIn(['MALE', 'FEMALE'])
    .withMessage('Gender must be MALE or FEMALE'),
  
  body('date_of_birth')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),
  
  handleValidationErrors
];

/**
 * Appointment creation validation
 */
export const validateAppointmentCreate = [
  body('customer_id')
    .notEmpty()
    .withMessage('Customer ID is required')
    .isInt({ min: 1 })
    .withMessage('Customer ID must be a valid number'),
  
  body('pet_id')
    .notEmpty()
    .withMessage('Pet ID is required')
    .isInt({ min: 1 })
    .withMessage('Pet ID must be a valid number'),
  
  body('appointment_date')
    .notEmpty()
    .withMessage('Appointment date is required')
    .isISO8601()
    .withMessage('Appointment date must be a valid date'),
  
  body('appointment_time')
    .notEmpty()
    .withMessage('Appointment time is required')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Appointment time must be in HH:MM format'),
  
  body('appointment_type')
    .notEmpty()
    .withMessage('Appointment type is required')
    .isIn(['CHECKUP', 'VACCINATION', 'SURGERY', 'EMERGENCY', 'FOLLOW_UP', 'CONSULTATION'])
    .withMessage('Invalid appointment type'),
  
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Reason for visit is required')
    .isLength({ min: 3, max: 255 })
    .withMessage('Reason must be between 3 and 255 characters'),
  
  body('duration_minutes')
    .optional()
    .isInt({ min: 15, max: 240 })
    .withMessage('Duration must be between 15 and 240 minutes'),
  
  body('veterinarian_id')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Veterinarian ID must be a valid number'),
  
  handleValidationErrors
];

/**
 * Appointment update validation
 */
export const validateAppointmentUpdate = [
  body('customer_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Customer ID must be a valid number'),
  
  body('pet_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Pet ID must be a valid number'),
  
  body('appointment_date')
    .optional()
    .isISO8601()
    .withMessage('Appointment date must be a valid date'),
  
  body('appointment_time')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Appointment time must be in HH:MM format'),
  
  body('appointment_type')
    .optional()
    .isIn(['CHECKUP', 'VACCINATION', 'SURGERY', 'EMERGENCY', 'FOLLOW_UP', 'CONSULTATION'])
    .withMessage('Invalid appointment type'),
  
  body('reason')
    .optional()
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Reason must be between 3 and 255 characters'),
  
  body('duration_minutes')
    .optional()
    .isInt({ min: 15, max: 240 })
    .withMessage('Duration must be between 15 and 240 minutes'),
  
  body('status')
    .optional()
    .isIn(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
    .withMessage('Invalid status'),
  
  body('veterinarian_id')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Veterinarian ID must be a valid number'),
  
  handleValidationErrors
];
