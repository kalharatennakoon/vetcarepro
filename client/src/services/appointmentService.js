import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const getAuthHeader = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`
  }
});

/**
 * Appointment Service
 * API calls for appointment management
 */

/**
 * Get all appointments
 */
export const getAppointments = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.date) params.append('date', filters.date);
  if (filters.status) params.append('status', filters.status);
  if (filters.customer_id) params.append('customer_id', filters.customer_id);
  if (filters.pet_id) params.append('pet_id', filters.pet_id);

  const response = await axios.get(`${API_URL}/appointments?${params.toString()}`, getAuthHeader());
  return response.data;
};

/**
 * Get appointment by ID
 */
export const getAppointmentById = async (id) => {
  const response = await axios.get(`${API_URL}/appointments/${id}`, getAuthHeader());
  return response.data;
};

/**
 * Create new appointment
 */
export const createAppointment = async (appointmentData) => {
  const response = await axios.post(`${API_URL}/appointments`, appointmentData, getAuthHeader());
  return response.data;
};

/**
 * Update appointment
 */
export const updateAppointment = async (id, appointmentData) => {
  const response = await axios.put(`${API_URL}/appointments/${id}`, appointmentData, getAuthHeader());
  return response.data;
};

/**
 * Delete appointment
 */
export const deleteAppointment = async (id) => {
  const response = await axios.delete(`${API_URL}/appointments/${id}`, getAuthHeader());
  return response.data;
};

/**
 * Update appointment status
 */
export const updateAppointmentStatus = async (id, status) => {
  const response = await axios.patch(`${API_URL}/appointments/${id}/status`, { status }, getAuthHeader());
  return response.data;
};
