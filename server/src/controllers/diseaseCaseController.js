import {
  getAllDiseaseCases,
  getDiseaseCaseById,
  createDiseaseCase,
  updateDiseaseCase,
  deleteDiseaseCase,
  getDiseaseCasesByPetId,
  getDiseaseStatistics,
  getDiseaseCasesByCategory,
  getRecentDiseaseCases,
  getDiseaseCaseCount
} from '../models/diseaseCaseModel.js';

/**
 * Disease Case Controller
 * Handles CRUD operations for disease cases
 */

/**
 * @route   GET /api/disease-cases
 * @desc    Get all disease cases with filters
 * @access  Private
 */
export const getDiseaseCases = async (req, res) => {
  try {
    const {
      pet_id,
      species,
      disease_category,
      severity,
      is_contagious,
      outcome,
      region,
      diagnosis_date_from,
      diagnosis_date_to,
      search,
      limit,
      offset
    } = req.query;

    const filters = {};
    if (pet_id) filters.pet_id = pet_id;
    if (species) filters.species = species;
    if (disease_category) filters.disease_category = disease_category;
    if (severity) filters.severity = severity;
    if (is_contagious !== undefined) filters.is_contagious = is_contagious === 'true';
    if (outcome) filters.outcome = outcome;
    if (region) filters.region = region;
    if (diagnosis_date_from) filters.diagnosis_date_from = diagnosis_date_from;
    if (diagnosis_date_to) filters.diagnosis_date_to = diagnosis_date_to;
    if (search) filters.search = search;
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const cases = await getAllDiseaseCases(filters);
    const totalCount = await getDiseaseCaseCount(filters);

    res.status(200).json({
      status: 'success',
      results: cases.length,
      total: totalCount,
      data: {
        cases
      }
    });
  } catch (error) {
    console.error('Get disease cases error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching disease cases'
    });
  }
};

/**
 * @route   GET /api/disease-cases/:id
 * @desc    Get disease case by ID
 * @access  Private
 */
export const getDiseaseCase = async (req, res) => {
  try {
    const { id } = req.params;

    const diseaseCase = await getDiseaseCaseById(id);

    if (!diseaseCase) {
      return res.status(404).json({
        status: 'error',
        message: 'Disease case not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        case: diseaseCase
      }
    });
  } catch (error) {
    console.error('Get disease case error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching disease case'
    });
  }
};

/**
 * @route   GET /api/disease-cases/pet/:petId
 * @desc    Get disease cases by pet ID
 * @access  Private
 */
export const getDiseaseCasesByPet = async (req, res) => {
  try {
    const { petId } = req.params;

    const cases = await getDiseaseCasesByPetId(petId);

    res.status(200).json({
      status: 'success',
      results: cases.length,
      data: {
        cases
      }
    });
  } catch (error) {
    console.error('Get disease cases by pet error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching disease cases'
    });
  }
};

/**
 * @route   POST /api/disease-cases
 * @desc    Create new disease case
 * @access  Private
 */
export const addDiseaseCase = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const caseData = req.body;

    // Validate required fields
    if (!caseData.pet_id || !caseData.disease_name || !caseData.diagnosis_date) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: pet_id, disease_name, diagnosis_date'
      });
    }

    const newCase = await createDiseaseCase(caseData, userId);

    res.status(201).json({
      status: 'success',
      message: 'Disease case created successfully',
      data: {
        case: newCase
      }
    });
  } catch (error) {
    console.error('Create disease case error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while creating disease case'
    });
  }
};

/**
 * @route   PUT /api/disease-cases/:id
 * @desc    Update disease case
 * @access  Private
 */
export const modifyDiseaseCase = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const caseData = req.body;

    // Check if disease case exists
    const existingCase = await getDiseaseCaseById(id);
    if (!existingCase) {
      return res.status(404).json({
        status: 'error',
        message: 'Disease case not found'
      });
    }

    const updatedCase = await updateDiseaseCase(id, caseData, userId);

    res.status(200).json({
      status: 'success',
      message: 'Disease case updated successfully',
      data: {
        case: updatedCase
      }
    });
  } catch (error) {
    console.error('Update disease case error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating disease case'
    });
  }
};

/**
 * @route   DELETE /api/disease-cases/:id
 * @desc    Delete disease case
 * @access  Private (Admin only)
 */
export const removeDiseaseCase = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if disease case exists
    const existingCase = await getDiseaseCaseById(id);
    if (!existingCase) {
      return res.status(404).json({
        status: 'error',
        message: 'Disease case not found'
      });
    }

    await deleteDiseaseCase(id);

    res.status(200).json({
      status: 'success',
      message: 'Disease case deleted successfully'
    });
  } catch (error) {
    console.error('Delete disease case error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while deleting disease case'
    });
  }
};

/**
 * @route   GET /api/disease-cases/statistics/overview
 * @desc    Get disease statistics overview
 * @access  Private
 */
export const getStatistics = async (req, res) => {
  try {
    const statistics = await getDiseaseStatistics();

    res.status(200).json({
      status: 'success',
      data: {
        statistics
      }
    });
  } catch (error) {
    console.error('Get disease statistics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching disease statistics'
    });
  }
};

/**
 * @route   GET /api/disease-cases/statistics/by-category
 * @desc    Get disease cases grouped by category
 * @access  Private
 */
export const getCasesByCategory = async (req, res) => {
  try {
    const categoryData = await getDiseaseCasesByCategory();

    res.status(200).json({
      status: 'success',
      data: {
        categories: categoryData
      }
    });
  } catch (error) {
    console.error('Get cases by category error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching disease cases by category'
    });
  }
};

/**
 * @route   GET /api/disease-cases/recent
 * @desc    Get recent disease cases
 * @access  Private
 */
export const getRecentCases = async (req, res) => {
  try {
    const { days = 30, limit = 10 } = req.query;

    const cases = await getRecentDiseaseCases(parseInt(days), parseInt(limit));

    res.status(200).json({
      status: 'success',
      results: cases.length,
      data: {
        cases
      }
    });
  } catch (error) {
    console.error('Get recent disease cases error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching recent disease cases'
    });
  }
};
