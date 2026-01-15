import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

/**
 * Get auth header with JWT token
 */
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

/**
 * Get all medical records with optional filters
 * @param {Object} filters - Optional filters (pet_id, veterinarian_id, visit_date_from, visit_date_to, diagnosis, follow_up_required)
 * @returns {Promise} Response data
 */
export const getMedicalRecords = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.pet_id) params.append('pet_id', filters.pet_id);
  if (filters.veterinarian_id) params.append('veterinarian_id', filters.veterinarian_id);
  if (filters.visit_date_from) params.append('visit_date_from', filters.visit_date_from);
  if (filters.visit_date_to) params.append('visit_date_to', filters.visit_date_to);
  if (filters.diagnosis) params.append('diagnosis', filters.diagnosis);
  if (filters.follow_up_required !== undefined) params.append('follow_up_required', filters.follow_up_required);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);

  const response = await axios.get(
    `${API_URL}/medical-records?${params.toString()}`,
    getAuthHeader()
  );
  return response.data;
};

/**
 * Get medical record by ID
 * @param {number} id - Medical record ID
 * @returns {Promise} Response data
 */
export const getMedicalRecordById = async (id) => {
  const response = await axios.get(
    `${API_URL}/medical-records/${id}`,
    getAuthHeader()
  );
  return response.data;
};

/**
 * Get all medical records for a specific pet
 * @param {number} petId - Pet ID
 * @returns {Promise} Response data
 */
export const getMedicalRecordsByPet = async (petId) => {
  const response = await axios.get(
    `${API_URL}/medical-records/pet/${petId}`,
    getAuthHeader()
  );
  return response.data;
};

/**
 * Get records requiring follow-up
 * @returns {Promise} Response data
 */
export const getFollowUpRecords = async () => {
  const response = await axios.get(
    `${API_URL}/medical-records/follow-up`,
    getAuthHeader()
  );
  return response.data;
};

/**
 * Get vital signs history for a pet
 * @param {number} petId - Pet ID
 * @param {number} limit - Number of records to return (default: 10)
 * @returns {Promise} Response data
 */
export const getVitalSignsHistory = async (petId, limit = 10) => {
  const response = await axios.get(
    `${API_URL}/medical-records/pet/${petId}/vital-signs?limit=${limit}`,
    getAuthHeader()
  );
  return response.data;
};

/**
 * Create new medical record
 * @param {Object} recordData - Medical record data
 * @returns {Promise} Response data
 */
export const createMedicalRecord = async (recordData) => {
  const response = await axios.post(
    `${API_URL}/medical-records`,
    recordData,
    getAuthHeader()
  );
  return response.data;
};

/**
 * Update medical record
 * @param {number} id - Medical record ID
 * @param {Object} recordData - Updated medical record data
 * @returns {Promise} Response data
 */
export const updateMedicalRecord = async (id, recordData) => {
  const response = await axios.put(
    `${API_URL}/medical-records/${id}`,
    recordData,
    getAuthHeader()
  );
  return response.data;
};

/**
 * Delete medical record
 * @param {number} id - Medical record ID
 * @returns {Promise} Response data
 */
export const deleteMedicalRecord = async (id) => {
  const response = await axios.delete(
    `${API_URL}/medical-records/${id}`,
    getAuthHeader()
  );
  return response.data;
};
