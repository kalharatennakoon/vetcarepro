import {
  getAllMedicalRecords,
  getMedicalRecordById,
  createMedicalRecord,
  updateMedicalRecord,
  deleteMedicalRecord,
  getMedicalRecordsByPetId,
  getRecordsRequiringFollowUp,
  getVitalSignsHistory,
  getMedicalRecordCount
} from '../models/medicalRecordModel.js';

/**
 * Medical Record Controller
 * Handles CRUD operations for medical records
 */

/**
 * @route   GET /api/medical-records
 * @desc    Get all medical records with filters
 * @access  Private
 */
export const getMedicalRecords = async (req, res) => {
  try {
    const { pet_id, veterinarian_id, visit_date_from, visit_date_to, diagnosis, follow_up_required, limit, offset } = req.query;

    const filters = {};
    if (pet_id) filters.pet_id = parseInt(pet_id);
    if (veterinarian_id) filters.veterinarian_id = parseInt(veterinarian_id);
    if (visit_date_from) filters.visit_date_from = visit_date_from;
    if (visit_date_to) filters.visit_date_to = visit_date_to;
    if (diagnosis) filters.diagnosis = diagnosis;
    if (follow_up_required !== undefined) filters.follow_up_required = follow_up_required === 'true';
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const records = await getAllMedicalRecords(filters);
    const totalCount = await getMedicalRecordCount();

    res.status(200).json({
      status: 'success',
      results: records.length,
      total: totalCount,
      data: {
        records
      }
    });
  } catch (error) {
    console.error('Get medical records error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching medical records'
    });
  }
};

/**
 * @route   GET /api/medical-records/:id
 * @desc    Get medical record by ID
 * @access  Private
 */
export const getMedicalRecord = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await getMedicalRecordById(id);

    if (!record) {
      return res.status(404).json({
        status: 'error',
        message: 'Medical record not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        record
      }
    });
  } catch (error) {
    console.error('Get medical record error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching medical record'
    });
  }
};

/**
 * @route   POST /api/medical-records
 * @desc    Create new medical record
 * @access  Private (Veterinarian, Admin)
 */
export const createNewMedicalRecord = async (req, res) => {
  try {
    const recordData = req.body;

    const newRecord = await createMedicalRecord(recordData, req.user.user_id);

    res.status(201).json({
      status: 'success',
      message: 'Medical record created successfully',
      data: {
        record: newRecord
      }
    });
  } catch (error) {
    console.error('Create medical record error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while creating medical record'
    });
  }
};

/**
 * @route   PUT /api/medical-records/:id
 * @desc    Update medical record
 * @access  Private (Veterinarian, Admin)
 */
export const updateMedicalRecordById = async (req, res) => {
  try {
    const { id } = req.params;
    const recordData = req.body;

    // Check if record exists
    const existingRecord = await getMedicalRecordById(id);
    if (!existingRecord) {
      return res.status(404).json({
        status: 'error',
        message: 'Medical record not found'
      });
    }

    const updatedRecord = await updateMedicalRecord(
      parseInt(id),
      recordData,
      req.user.user_id
    );

    res.status(200).json({
      status: 'success',
      message: 'Medical record updated successfully',
      data: {
        record: updatedRecord
      }
    });
  } catch (error) {
    console.error('Update medical record error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating medical record'
    });
  }
};

/**
 * @route   DELETE /api/medical-records/:id
 * @desc    Delete medical record
 * @access  Private (Admin only)
 */
export const deleteMedicalRecordById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if record exists
    const existingRecord = await getMedicalRecordById(id);
    if (!existingRecord) {
      return res.status(404).json({
        status: 'error',
        message: 'Medical record not found'
      });
    }

    await deleteMedicalRecord(parseInt(id));

    res.status(200).json({
      status: 'success',
      message: 'Medical record deleted successfully'
    });
  } catch (error) {
    console.error('Delete medical record error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while deleting medical record'
    });
  }
};

/**
 * @route   GET /api/medical-records/pet/:petId
 * @desc    Get all medical records for a specific pet
 * @access  Private
 */
export const getPetMedicalRecords = async (req, res) => {
  try {
    const { petId } = req.params;

    const records = await getMedicalRecordsByPetId(parseInt(petId));

    res.status(200).json({
      status: 'success',
      results: records.length,
      data: {
        records
      }
    });
  } catch (error) {
    console.error('Get pet medical records error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching pet medical records'
    });
  }
};

/**
 * @route   GET /api/medical-records/follow-up
 * @desc    Get records requiring follow-up
 * @access  Private
 */
export const getFollowUpRecords = async (req, res) => {
  try {
    const records = await getRecordsRequiringFollowUp();

    res.status(200).json({
      status: 'success',
      results: records.length,
      data: {
        records
      }
    });
  } catch (error) {
    console.error('Get follow-up records error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching follow-up records'
    });
  }
};

/**
 * @route   GET /api/medical-records/pet/:petId/vital-signs
 * @desc    Get vital signs history for a pet
 * @access  Private
 */
export const getPetVitalSigns = async (req, res) => {
  try {
    const { petId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    const vitalSigns = await getVitalSignsHistory(parseInt(petId), limit);

    res.status(200).json({
      status: 'success',
      results: vitalSigns.length,
      data: {
        vitalSigns
      }
    });
  } catch (error) {
    console.error('Get vital signs error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching vital signs'
    });
  }
};
