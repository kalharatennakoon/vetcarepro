import express from 'express';
import {
  getMedicalRecords,
  getMedicalRecord,
  createNewMedicalRecord,
  updateMedicalRecordById,
  deleteMedicalRecordById,
  getPetMedicalRecords,
  getFollowUpRecords,
  getPetVitalSigns
} from '../controllers/medicalRecordController.js';
import { authenticate } from '../middleware/auth.js';
import { adminOnly, vetOrAdmin } from '../middleware/roleCheck.js';

const router = express.Router();

/**
 * Medical Record Routes
 * Base path: /api/medical-records
 * All routes require authentication
 */

// Apply authentication to all routes
router.use(authenticate);

// @route   GET /api/medical-records/follow-up
// @desc    Get records requiring follow-up
// @access  Private
router.get('/follow-up', getFollowUpRecords);

// @route   GET /api/medical-records/pet/:petId/vital-signs
// @desc    Get vital signs history for a pet
// @access  Private
router.get('/pet/:petId/vital-signs', getPetVitalSigns);

// @route   GET /api/medical-records/pet/:petId
// @desc    Get all medical records for a specific pet
// @access  Private
router.get('/pet/:petId', getPetMedicalRecords);

// @route   GET /api/medical-records
// @desc    Get all medical records
// @access  Private
router.get('/', getMedicalRecords);

// @route   GET /api/medical-records/:id
// @desc    Get medical record by ID
// @access  Private
router.get('/:id', getMedicalRecord);

// @route   POST /api/medical-records
// @desc    Create new medical record
// @access  Private (Veterinarian, Admin)
router.post('/', vetOrAdmin, createNewMedicalRecord);

// @route   PUT /api/medical-records/:id
// @desc    Update medical record
// @access  Private (Veterinarian, Admin)
router.put('/:id', vetOrAdmin, updateMedicalRecordById);

// @route   DELETE /api/medical-records/:id
// @desc    Delete medical record
// @access  Private (Admin only)
router.delete('/:id', adminOnly, deleteMedicalRecordById);

export default router;
