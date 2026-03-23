import {
  getAllPets,
  getPetById,
  createPet,
  updatePet,
  checkPetDeletability,
  inactivatePet,
  hardDeletePet,
  getPetMedicalHistory,
  getPetVaccinations,
  getPetCount,
  getSpeciesList,
  getBreedingPets
} from '../models/petModel.js';
import { getCustomerById } from '../models/customerModel.js';
import { deleteImageFile } from '../config/multer.js';
import { logAuditEntry } from '../models/diseaseCaseModel.js';

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

    await logAuditEntry({
      userId: req.user.user_id,
      action: 'CREATE',
      tableName: 'pets',
      recordId: newPet.pet_id,
      oldValues: null,
      newValues: { pet_name: newPet.pet_name, species: newPet.species, breed: newPet.breed, customer_id: newPet.customer_id },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

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
      id,
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

export const getPetDeletabilityById = async (req, res) => {
  try {
    const { id } = req.params;
    const existingPet = await getPetById(id);
    if (!existingPet) {
      return res.status(404).json({ status: 'error', message: 'Pet not found' });
    }
    const data = await checkPetDeletability(id);
    const hasRelatedData = data.total_appointments > 0 || data.medical_records > 0 || data.vaccinations > 0 || data.billing_records > 0;
    res.status(200).json({
      status: 'success',
      data: {
        activeAppointments: data.active_appointments,
        hasRelatedData,
        counts: {
          appointments: data.total_appointments,
          medicalRecords: data.medical_records,
          vaccinations: data.vaccinations,
          billingRecords: data.billing_records
        }
      }
    });
  } catch (error) {
    console.error('Check pet deletability error:', error);
    res.status(500).json({ status: 'error', message: 'An error occurred' });
  }
};

export const inactivatePetById = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, deceased_date, additional_note } = req.body;

    if (!reason) {
      return res.status(400).json({ status: 'error', message: 'Reason is required' });
    }

    const existingPet = await getPetById(id);
    if (!existingPet) {
      return res.status(404).json({ status: 'error', message: 'Pet not found' });
    }

    const data = await checkPetDeletability(id);
    if (data.active_appointments > 0) {
      return res.status(409).json({
        status: 'error',
        message: `Cannot inactivate pet with ${data.active_appointments} active appointment(s). Please cancel or complete them first.`
      });
    }

    if (reason === 'deceased' && !deceased_date) {
      return res.status(400).json({ status: 'error', message: 'Date of death is required when reason is Deceased' });
    }

    const updatedPet = await inactivatePet(id, { reason, deceasedDate: deceased_date, additionalNote: additional_note }, req.user.user_id);

    await logAuditEntry({
      userId: req.user.user_id,
      action: 'INACTIVATE',
      tableName: 'pets',
      recordId: parseInt(id),
      oldValues: { is_active: true },
      newValues: { is_active: false, reason, deceased_date: deceased_date || null, additional_note: additional_note || null },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      status: 'success',
      message: 'Pet inactivated successfully',
      data: { pet: updatedPet }
    });
  } catch (error) {
    console.error('Inactivate pet error:', error);
    res.status(500).json({ status: 'error', message: 'An error occurred while inactivating pet' });
  }
};

/**
 * @route   DELETE /api/pets/:id
 * @desc    Delete pet
 * @access  Private (Admin only)
 */
export const deletePetById = async (req, res) => {
  try {
    const { id } = req.params;

    const existingPet = await getPetById(id);
    if (!existingPet) {
      return res.status(404).json({ status: 'error', message: 'Pet not found' });
    }

    const data = await checkPetDeletability(id);

    if (data.active_appointments > 0) {
      return res.status(409).json({
        status: 'error',
        message: `Cannot delete pet with ${data.active_appointments} active appointment(s). Please cancel or complete them first.`
      });
    }

    const hasRelatedData = data.total_appointments > 0 || data.medical_records > 0 || data.vaccinations > 0 || data.billing_records > 0;
    if (hasRelatedData) {
      return res.status(409).json({
        status: 'error',
        message: 'Pet has related records and cannot be permanently deleted. Use inactivation instead.'
      });
    }

    await logAuditEntry({
      userId: req.user.user_id,
      action: 'DELETE',
      tableName: 'pets',
      recordId: parseInt(id),
      oldValues: existingPet,
      newValues: null,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    await hardDeletePet(id);
    res.status(200).json({ status: 'success', message: 'Pet permanently deleted' });
  } catch (error) {
    console.error('Delete pet error:', error);
    res.status(500).json({ status: 'error', message: 'An error occurred while deleting pet' });
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

/**
 * @route   POST /api/pets/:id/upload-image
 * @desc    Upload pet image
 * @access  Private
 */
export const uploadPetImageHandler = async (req, res) => {
  try {
    const petId = req.params.id; // Use string ID directly (PET-0001)

    // Get existing pet
    const existingPet = await getPetById(petId);
    if (!existingPet) {
      return res.status(404).json({
        status: 'error',
        message: 'Pet not found'
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No image file provided'
      });
    }

    // Delete old pet image if exists
    if (existingPet.photo_url) {
      deleteImageFile(existingPet.photo_url);
    }

    // Update pet with new image path
    const imagePath = `pet-images/${req.file.filename}`;
    const updatedPet = await updatePet(petId, { photo_url: imagePath }, req.user.user_id);

    res.status(200).json({
      status: 'success',
      message: 'Pet image uploaded successfully',
      data: {
        pet: updatedPet,
        imageUrl: `/uploads/${imagePath}`
      }
    });
  } catch (error) {
    console.error('Upload pet image error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while uploading pet image'
    });
  }
};

/**
 * @route   DELETE /api/pets/:id/image
 * @desc    Delete pet image
 * @access  Private
 */
export const deletePetImageHandler = async (req, res) => {
  try {
    const petId = req.params.id;

    // Get existing pet
    const existingPet = await getPetById(petId);
    if (!existingPet) {
      return res.status(404).json({
        status: 'error',
        message: 'Pet not found'
      });
    }

    // Check if pet has an image
    if (!existingPet.photo_url) {
      return res.status(400).json({
        status: 'error',
        message: 'Pet does not have an image'
      });
    }

    // Delete the image file
    deleteImageFile(existingPet.photo_url);

    // Update pet to remove image path
    const updatedPet = await updatePet(petId, { photo_url: null }, req.user.user_id);

    res.status(200).json({
      status: 'success',
      message: 'Pet image deleted successfully',
      data: {
        pet: updatedPet
      }
    });
  } catch (error) {
    console.error('Delete pet image error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while deleting pet image'
    });
  }
};
export const getBreedingRegistry = async (req, res) => {
  try {
    const { species, gender, breed } = req.query;
    const pets = await getBreedingPets({ species, gender, breed });
    res.status(200).json({ status: 'success', data: { pets } });
  } catch (error) {
    console.error('Get breeding registry error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch breeding registry' });
  }
};
