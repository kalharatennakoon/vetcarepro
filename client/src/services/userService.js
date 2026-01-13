import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const getAuthHeader = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`
  }
});

/**
 * Get all veterinarians
 */
export const getVeterinarians = async () => {
  const response = await axios.get(`${API_URL}/users?role=veterinarian`, getAuthHeader());
  return response.data;
};

/**
 * Get all users
 */
export const getUsers = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.role) params.append('role', filters.role);
  if (filters.is_active !== undefined) params.append('is_active', filters.is_active);

  const response = await axios.get(`${API_URL}/users?${params.toString()}`, getAuthHeader());
  return response.data;
};

/**
 * Get user by ID
 */
export const getUserById = async (id) => {
  const response = await axios.get(`${API_URL}/users/${id}`, getAuthHeader());
  return response.data;
};

/**
 * Create new user
 */
export const createUser = async (userData) => {
  const response = await axios.post(`${API_URL}/users`, userData, getAuthHeader());
  return response.data;
};

/**
 * Update user
 */
export const updateUser = async (id, userData) => {
  const response = await axios.put(`${API_URL}/users/${id}`, userData, getAuthHeader());
  return response.data;
};

/**
 * Delete user
 */
export const deleteUser = async (id) => {
  const response = await axios.delete(`${API_URL}/users/${id}`, getAuthHeader());
  return response.data;
};
