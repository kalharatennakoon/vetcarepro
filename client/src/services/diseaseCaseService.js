import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const ML_API_URL = import.meta.env.VITE_ML_API_URL || 'http://localhost:5001/api/ml';

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
 * Get all disease cases with optional filters
 */
export const getDiseaseCases = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.pet_id) params.append('pet_id', filters.pet_id);
  if (filters.species) params.append('species', filters.species);
  if (filters.disease_category) params.append('disease_category', filters.disease_category);
  if (filters.severity) params.append('severity', filters.severity);
  if (filters.is_contagious !== undefined && filters.is_contagious !== '') params.append('is_contagious', filters.is_contagious);
  if (filters.outcome) params.append('outcome', filters.outcome);
  if (filters.region) params.append('region', filters.region);
  if (filters.diagnosis_date_from) params.append('diagnosis_date_from', filters.diagnosis_date_from);
  if (filters.diagnosis_date_to) params.append('diagnosis_date_to', filters.diagnosis_date_to);
  if (filters.search) params.append('search', filters.search);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);

  const response = await axios.get(
    `${API_URL}/disease-cases?${params.toString()}`,
    getAuthHeader()
  );
  return response.data;
};

/**
 * Get disease case by ID
 */
export const getDiseaseCaseById = async (id) => {
  const response = await axios.get(
    `${API_URL}/disease-cases/${id}`,
    getAuthHeader()
  );
  return response.data;
};

/**
 * Get all disease cases for a specific pet
 */
export const getDiseaseCasesByPet = async (petId) => {
  const response = await axios.get(
    `${API_URL}/disease-cases/pet/${petId}`,
    getAuthHeader()
  );
  return response.data;
};

/**
 * Create new disease case
 */
export const createDiseaseCase = async (caseData) => {
  const response = await axios.post(
    `${API_URL}/disease-cases`,
    caseData,
    getAuthHeader()
  );
  return response.data;
};

/**
 * Update disease case
 */
export const updateDiseaseCase = async (id, caseData) => {
  const response = await axios.put(
    `${API_URL}/disease-cases/${id}`,
    caseData,
    getAuthHeader()
  );
  return response.data;
};

/**
 * Delete disease case (requires reason for audit trail)
 */
export const deleteDiseaseCase = async (id, reason, additionalNotes = '') => {
  const response = await axios.delete(
    `${API_URL}/disease-cases/${id}`,
    {
      headers: getAuthHeader().headers,
      data: { reason, additional_notes: additionalNotes }
    }
  );
  return response.data;
};

/**
 * Get disease statistics overview
 */
export const getDiseaseStatistics = async ({ dateFrom, dateTo } = {}) => {
  const params = new URLSearchParams();
  if (dateFrom) params.append('date_from', dateFrom);
  if (dateTo)   params.append('date_to', dateTo);
  const response = await axios.get(
    `${API_URL}/disease-cases/statistics/overview${params.toString() ? `?${params}` : ''}`,
    getAuthHeader()
  );
  return response.data;
};

/**
 * Get disease cases by category
 */
export const getDiseaseCasesByCategory = async ({ dateFrom, dateTo } = {}) => {
  const params = new URLSearchParams();
  if (dateFrom) params.append('date_from', dateFrom);
  if (dateTo)   params.append('date_to', dateTo);
  const response = await axios.get(
    `${API_URL}/disease-cases/statistics/by-category${params.toString() ? `?${params}` : ''}`,
    getAuthHeader()
  );
  return response.data;
};

/**
 * Get recent disease cases
 */
export const getRecentDiseaseCases = async (days = 30, limit = 10) => {
  const response = await axios.get(
    `${API_URL}/disease-cases/recent?days=${days}&limit=${limit}`,
    getAuthHeader()
  );
  return response.data;
};

// ML Service APIs

/**
 * Predict disease category
 */
export const predictDiseaseCategory = async (data) => {
  const response = await axios.post(
    `${ML_API_URL}/disease/predict`,
    data
  );
  return response.data;
};

/**
 * Assess outbreak risk
 */
export const assessOutbreakRisk = async (filters = {}) => {
  const response = await axios.post(
    `${ML_API_URL}/disease/outbreak-risk`,
    filters
  );
  return response.data;
};

/**
 * Forecast future disease trends
 */
export const forecastDiseaseActivity = async ({ periods = 12, species = null, disease_category = null } = {}) => {
  const params = { periods };
  if (species) params.species = species;
  if (disease_category) params.disease_category = disease_category;
  const response = await axios.get(`${ML_API_URL}/disease/forecast`, { params });
  return response.data;
};

/**
 * Analyze disease patterns
 */
export const analyzeDiseasePatterns = async () => {
  const response = await axios.get(
    `${ML_API_URL}/disease/patterns`
  );
  return response.data;
};

/**
 * Get species trends
 */
export const getSpeciesTrends = async (species = null) => {
  const url = species 
    ? `${ML_API_URL}/disease/trends?species=${species}`
    : `${ML_API_URL}/disease/trends`;
  
  const response = await axios.get(url);
  return response.data;
};

/**
 * Get geographic distribution
 */
export const getGeographicDistribution = async () => {
  const response = await axios.get(
    `${ML_API_URL}/disease/geographic`
  );
  return response.data;
};

/**
 * Get ML model status
 */
export const  getMLModelStatus = async () => {
  const response = await axios.get(
    `${ML_API_URL}/models/status`
  );
  return response.data;
};

/**
 * Predict individual pet disease risk over time horizons
 */
export const predictPetRisk = async (data) => {
  const response = await axios.post(
    `${API_URL}/ml/disease/pet-risk`,
    data,
    getAuthHeader()
  );
  return response.data;
};

/**
 * Predict cancer/tumor risk based on species, breed, age
 */
export const predictCancerRisk = async (data) => {
  const response = await axios.post(
    `${API_URL}/ml/disease/cancer-risk`,
    data,
    getAuthHeader()
  );
  return response.data;
};

/**
 * Get outbreak trend projection
 */
export const getOutbreakTrend = async (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const response = await axios.get(
    `${API_URL}/ml/disease/outbreak-trend${qs ? `?${qs}` : ''}`,
    getAuthHeader()
  );
  return response.data;
};

/**
 * Assess pandemic risk
 */
export const getPandemicRisk = async (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const response = await axios.get(
    `${API_URL}/ml/disease/pandemic-risk${qs ? `?${qs}` : ''}`,
    getAuthHeader()
  );
  return response.data;
};

/**
 * Train ML model
 */
export const trainMLModel = async () => {
  const response = await axios.post(
    `${API_URL}/ml/disease/train`,
    {},
    getAuthHeader()
  );
  return response.data;
};

/**
 * Get ML service health status
 */
export const getMLHealth = async () => {
  const response = await axios.get(
    `${ML_API_URL}/health`
  );
  return response.data;
};

/**
 * Test ML database connection
 */
export const testMLDatabase = async () => {
  const response = await axios.get(
    `${ML_API_URL}/test/db-connection`
  );
  return response.data;
};
