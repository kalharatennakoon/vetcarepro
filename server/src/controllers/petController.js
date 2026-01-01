import {
  getAllPets,
  getPetById,
  createPet,
  updatePet,
  deletePet,
  getPetMedicalHistory,
  getPetVaccinations,
  getPetCount,
  getSpeciesList
} from '../models/petModel.js';
import { getCustomerById } from '../models/customerModel.js';

/**
 * Pet Controller
 * Handles CRUD operations for pets
 */

/**
 * @route   GET /api/pets
 * @desc    Get all pets with filters
 * @access  Private
 */
export const getPets = async (req, res) => {
  try {
    const { search, species, customer_id, is_active, limit, offset } = req.query;

    const filters = {};
    if (search) filters.search = search;
    if (species) filters.species = species;
    if (customer_id) filters.customer_id = parseInt(customer_id);
    if (is_active !== undefined) filters.is_active = is_active === 'true';
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const pets = await getAllPets(filters);
    const totalCount = await getPetCount();

    res.status(200).json({
      status: 'success',
      results: pets.length,
      total: totalCount,
      data: {
        pets
      }
    });
  } catch (error) {
    console.error('Get pets error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching pets'
    });
  }
};

/**
 * @route   GET /api/pets/:id
 * @desc    Get pet by ID with full details
 * @access  Private
 */
export const getPet = async (req, res) => {
  try {
    const { id } = req.params;

    const pet = await getPetById(id);

    if (!pet) {
      return res.status(404).json({
        status: 'error',
        message: 'Pet not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        pet
      }
    });
  } catch (error) {
    console.error('Get pet error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching pet'
    });
  }
};

/**
 * @route   POST /api/pets
 * @desc    Create new pet
 * @access  Private
 */
export const createNewPet = async (req, res) => {
  try {
    const petData = req.body;

    // Verify customer exists
    const customer = await getCustomerById(petData.customer_id);
    if (!customer) {
      return res.status(404).json({
        status: 'error',
        message: 'Customer not found'
      });
    }

    const newPet = await createPet(petData, req.user.user_id);

    res.status(201).json({
      status: 'success',
      message: 'Pet created successfully',
      data: {
        pet: newPet
      }
    });
  } catch (error) {
    console.error('Create pet error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while creating pet'
    });
  }
};

/**
 * @route   PUT /api/pets/:id
 * @desc    Update pet
 * @access  Private
 */
export const updatePetById = async (req, res) => {
  try {
    const { id } = req.params;
    const petData = req.body;

    // Check if pet exists
    const existingPet = await getPetById(id);
    if (!existingPet) {
      return res.status(404).json({
        status: 'error',
        message: 'Pet not found'
      });
    }

    const updatedPet = await updatePet(
      parseInt(id),
      petData,
      req.user.user_id
    );

    res.status(200).json({
      status: 'success',
      message: 'Pet updated successfully',
      data: {
        pet: updatedPet
      }
    });
  } catch (error) {
    console.error('Update pet error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating pet'
    });
  }
};

/**
 * @route   DELETE /api/pets/:id
 * @desc    Delete pet (soft delete)
 * @access  Private
 */
export const deletePetById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if pet exists
    const existingPet = await getPetById(id);
    if (!existingPet) {
      return res.status(404).json({
        status: 'error',
        message: 'Pet not found'
      });
    }

    await deletePet(parseInt(id));

    res.status(200).json({
      status: 'success',
      message: 'Pet deactivated successfully'
    });
  } catch (error) {
    console.error('Delete pet error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while deleting pet'
    });
  }
};

/**
 * @route   GET /api/pets/:id/medical-history
 * @desc    Get pet's medical history
 * @access  Private
 */
export const getPetMedicalHistoryById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if pet exists
    const pet = await getPetById(id);
    if (!pet) {
      return res.status(404).json({
        status: 'error',
        message: 'Pet not found'
      });
    }

    const medicalHistory = await getPetMedicalHistory(id);

    res.status(200).json({
      status: 'success',
      results: medicalHistory.length,
      data: {
        medical_history: medicalHistory
      }
    });
  } catch (error) {
    console.error('Get pet medical history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching medical history'
    });
  }
};

/**
 * @route   GET /api/pets/:id/vaccinations
 * @desc    Get pet's vaccination history
 * @access  Private
 */
export const getPetVaccinationsById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if pet exists
    const pet = await getPetById(id);
    if (!pet) {
      return res.status(404).json({
        status: 'error',
        message: 'Pet not found'
      });
    }

    const vaccinations = await getPetVaccinations(id);

    res.status(200).json({
      status: 'success',
      results: vaccinations.length,
      data: {
        vaccinations
      }
    });
  } catch (error) {
    console.error('Get pet vaccinations error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching vaccinations'
    });
  }
};

/**
 * @route   GET /api/pets/species/list
 * @desc    Get list of species
 * @access  Private
 */
export const getSpecies = async (req, res) => {
  try {
    const species = await getSpeciesList();

    res.status(200).json({
      status: 'success',
      results: species.length,
      data: {
        species
      }
    });
  } catch (error) {
    console.error('Get species error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching species list'
    });
  }
};