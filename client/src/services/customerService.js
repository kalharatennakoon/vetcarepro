import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

/**
 * Customer Service
 * API calls for customer management
 */

/**
 * Get all customers
 */
export const getCustomers = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.is_active !== undefined) params.append('is_active', filters.is_active);
  if (filters.city) params.append('city', filters.city);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);

  const response = await axios.get(`${API_URL}/customers?${params.toString()}`);
  return response.data;
};

/**
 * Get customer by ID
 */
export const getCustomerById = async (id) => {
  const response = await axios.get(`${API_URL}/customers/${id}`);
  return response.data;
};

/**
 * Create new customer
 */
export const createCustomer = async (customerData) => {
  const response = await axios.post(`${API_URL}/customers`, customerData);
  return response.data;
};

/**
 * Update customer
 */
export const updateCustomer = async (id, customerData) => {
  const response = await axios.put(`${API_URL}/customers/${id}`, customerData);
  return response.data;
};

/**
 * Delete customer
 */
export const deleteCustomer = async (id) => {
  const response = await axios.delete(`${API_URL}/customers/${id}`);
  return response.data;
};