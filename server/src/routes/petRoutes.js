import express from 'express';
import {
  getPets,
  getPet,
  createNewPet,
  updatePetById,
  deletePetById,
  getPetDeletabilityById,
  inactivatePetById,
  getPetMedicalHistoryById,
  getPetVaccinationsById,
  getSpecies,
  uploadPetImageHandler,
  deletePetImageHandler,
  getBreedingRegistry
} from '../controllers/petController.js';
import { authenticate } from '../middleware/auth.js';
import { adminOnly } from '../middleware/roleCheck.js';
import {
  validatePetCreate,
  validatePetUpdate
} from '../middleware/validation.js';
import { uploadPetImage } from '../config/multer.js';

const router = express.Router();

/**
 * Pet Routes
 * Base path: /api/pets
 * All routes require authentication
 */

// Apply authentication to all routes
router.use(authenticate);

// @route   GET /api/pets/species/list
// @desc    Get list of species
// @access  Private
router.get('/species/list', getSpecies);

// @route   GET /api/pets/breeding/registry
// @desc    Get pets available for breeding
// @access  Private
router.get('/breeding/registry', getBreedingRegistry);

// @route   GET /api/pets
// @desc    Get all pets
// @access  Private
router.get('/', getPets);

// @route   GET /api/pets/:id
// @desc    Get pet by ID
// @access  Private
router.get('/:id', getPet);

// @route   POST /api/pets
// @desc    Create new pet
// @access  Private
router.post('/', validatePetCreate, createNewPet);

// @route   PUT /api/pets/:id
// @desc    Update pet
// @access  Private
router.put('/:id', validatePetUpdate, updatePetById);

// @route   GET /api/pets/:id/deletability
// @desc    Check if pet can be deleted or must be inactivated
// @access  Private
router.get('/:id/deletability', getPetDeletabilityById);

// @route   PATCH /api/pets/:id/inactivate
// @desc    Inactivate pet with reason
// @access  Private
router.patch('/:id/inactivate', inactivatePetById);

// @route   DELETE /api/pets/:id
// @desc    Delete pet (soft delete)
// @access  Private (Admin only)
router.delete('/:id', adminOnly, deletePetById);

// @route   GET /api/pets/:id/medical-history
// @desc    Get pet's medical history
// @access  Private
router.get('/:id/medical-history', getPetMedicalHistoryById);

// @route   GET /api/pets/:id/vaccinations
// @desc    Get pet's vaccination history
// @access  Private
router.get('/:id/vaccinations', getPetVaccinationsById);

// @route   POST /api/pets/:id/upload-image
// @desc    Upload pet image
// @access  Private
router.post('/:id/upload-image', uploadPetImage.single('image'), uploadPetImageHandler);

// @route   DELETE /api/pets/:id/image
// @desc    Delete pet image
// @access  Private
router.delete('/:id/image', deletePetImageHandler);

export default router;

