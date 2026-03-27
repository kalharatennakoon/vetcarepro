import express from 'express';
import {
  getDiseaseCases,
  getDiseaseCase,
  addDiseaseCase,
  modifyDiseaseCase,
  removeDiseaseCase,
  getDiseaseCasesByPet,
  getStatistics,
  getCasesByCategory,
  getRecentCases,
  getCaseFollowups,
  addCaseFollowup
} from '../controllers/diseaseCaseController.js';
import { authenticate } from '../middleware/auth.js';
import { adminOnly, vetOrAdmin } from '../middleware/roleCheck.js';

const router = express.Router();

/**
 * Disease Case Routes
 * Base path: /api/disease-cases
 * All routes require authentication
 */

// Apply authentication to all routes
router.use(authenticate);

// @route   GET /api/disease-cases/statistics/overview
// @desc    Get disease statistics overview
// @access  Private (Veterinarian, Admin)
router.get('/statistics/overview', vetOrAdmin, getStatistics);

// @route   GET /api/disease-cases/statistics/by-category
// @desc    Get disease cases grouped by category
// @access  Private (Veterinarian, Admin)
router.get('/statistics/by-category', vetOrAdmin, getCasesByCategory);

// @route   GET /api/disease-cases/recent
// @desc    Get recent disease cases
// @access  Private (Veterinarian, Admin)
router.get('/recent', vetOrAdmin, getRecentCases);

// @route   GET /api/disease-cases/pet/:petId
// @desc    Get all disease cases for a specific pet
// @access  Private (Veterinarian, Admin)
router.get('/pet/:petId', vetOrAdmin, getDiseaseCasesByPet);

// @route   GET /api/disease-cases
// @desc    Get all disease cases with filters
// @access  Private (Veterinarian, Admin)
router.get('/', vetOrAdmin, getDiseaseCases);

// @route   GET /api/disease-cases/:id
// @desc    Get disease case by ID
// @access  Private (Veterinarian, Admin)
router.get('/:id', vetOrAdmin, getDiseaseCase);

// @route   GET /api/disease-cases/:id/followups
// @desc    Get all follow-up visit records for a disease case
// @access  Private (Veterinarian, Admin)
router.get('/:id/followups', vetOrAdmin, getCaseFollowups);

// @route   POST /api/disease-cases/:id/followups
// @desc    Record a follow-up visit for a disease case
// @access  Private (Veterinarian, Admin)
router.post('/:id/followups', vetOrAdmin, addCaseFollowup);

// @route   POST /api/disease-cases
// @desc    Create new disease case
// @access  Private (Veterinarian, Admin)
router.post('/', vetOrAdmin, addDiseaseCase);

// @route   PUT /api/disease-cases/:id
// @desc    Update disease case
// @access  Private (Veterinarian, Admin)
router.put('/:id', vetOrAdmin, modifyDiseaseCase);

// @route   DELETE /api/disease-cases/:id
// @desc    Delete disease case
// @access  Private (Admin only)
router.delete('/:id', adminOnly, removeDiseaseCase);

export default router;
