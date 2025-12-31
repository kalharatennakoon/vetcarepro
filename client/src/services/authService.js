import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Auth Service
 * API calls for authentication
 */

/**
 * Login user
 */
export const loginUser = async (username, password) => {
  const response = await axios.post(`${API_URL}/auth/login`, {
    username,
    password
  });
  return response.data;
};

/**
 * Get current user
 */
export const getCurrentUser = async () => {
  const response = await axios.get(`${API_URL}/auth/me`);
  return response.data;
};

/**
 * Logout user
 */
export const logoutUser = async () => {
  const response = await axios.post(`${API_URL}/auth/logout`);
  return response.data;
};