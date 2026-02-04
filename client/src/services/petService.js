import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

/**
 * Pet Service
 * API calls for pet management
 */

/**
 * Get all pets
 */
export const getPets = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.species) params.append('species', filters.species);
  if (filters.customer_id) params.append('customer_id', filters.customer_id);
  if (filters.is_active !== undefined) params.append('is_active', filters.is_active);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);

  const response = await axios.get(`${API_URL}/pets?${params.toString()}`);
  return response.data;
};

/**
 * Get pet by ID
 */
export const getPetById = async (id) => {
  const response = await axios.get(`${API_URL}/pets/${id}`);
  return response.data;
};

/**
 * Create new pet
 */
export const createPet = async (petData) => {
  const response = await axios.post(`${API_URL}/pets`, petData);
  return response.data;
};

/**
 * Update pet
 */
export const updatePet = async (id, petData) => {
  const response = await axios.put(`${API_URL}/pets/${id}`, petData);
  return response.data;
};

/**
 * Delete pet
 */
export const deletePet = async (id) => {
  const response = await axios.delete(`${API_URL}/pets/${id}`);
  return response.data;
};

/**
 * Get pet's medical history
 */
export const getPetMedicalHistory = async (id) => {
  const response = await axios.get(`${API_URL}/pets/${id}/medical-history`);
  return response.data;
};

/**
 * Get pet's vaccinations
 */
export const getPetVaccinations = async (id) => {
  const response = await axios.get(`${API_URL}/pets/${id}/vaccinations`);
  return response.data;
};

/**
 * Get species list
 */
export const getSpeciesList = async () => {
  const response = await axios.get(`${API_URL}/pets/species/list`);
  return response.data;
};

/**
 * Upload pet image
 */
export const uploadPetImage = async (id, imageFile) => {
  const formData = new FormData();
  formData.append('image', imageFile);
  
  const response = await axios.post(`${API_URL}/pets/${id}/upload-image`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

/**
 * Delete pet image
 */
export const deletePetImage = async (id) => {
  const response = await axios.delete(`${API_URL}/pets/${id}/image`);
  return response.data;
};

export default {
  getPets,
  getPetById,
  createPet,
  updatePet,
  deletePet,
  getPetMedicalHistory,
  getPetVaccinations,
  getSpeciesList,
  uploadPetImage,
  deletePetImage
};