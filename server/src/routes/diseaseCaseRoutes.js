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
  getRecentCases
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
// @access  Private
router.get('/statistics/overview', getStatistics);

// @route   GET /api/disease-cases/statistics/by-category
// @desc    Get disease cases grouped by category
// @access  Private
router.get('/statistics/by-category', getCasesByCategory);

// @route   GET /api/disease-cases/recent
// @desc    Get recent disease cases
// @access  Private
router.get('/recent', getRecentCases);

// @route   GET /api/disease-cases/pet/:petId
// @desc    Get all disease cases for a specific pet
// @access  Private
router.get('/pet/:petId', getDiseaseCasesByPet);

// @route   GET /api/disease-cases
// @desc    Get all disease cases with filters
// @access  Private
router.get('/', getDiseaseCases);

// @route   GET /api/disease-cases/:id
// @desc    Get disease case by ID
// @access  Private
router.get('/:id', getDiseaseCase);

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
