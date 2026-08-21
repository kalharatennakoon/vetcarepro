import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Customer Portal Appointment Service
 * API calls made by a logged-in pet owner to book/manage their own
 * appointments. Uses the customer-portal token ('customerToken'), never
 * the staff one - mirrors customerPortalService.js.
 */
const authHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('customerToken')}` }
});

export const getMyAppointments = async () => {
  const response = await axios.get(`${API_URL}/customer-auth/appointments`, authHeader());
  return response.data;
};

export const getVeterinarians = async () => {
  const response = await axios.get(`${API_URL}/customer-auth/veterinarians`, authHeader());
  return response.data;
};

export const getAvailability = async (date, veterinarianId) => {
  const params = new URLSearchParams({ date });
  if (veterinarianId) params.set('veterinarian_id', veterinarianId);
  const response = await axios.get(
    `${API_URL}/customer-auth/appointments/availability?${params.toString()}`,
    authHeader()
  );
  return response.data;
};

export const createMyAppointment = async (appointmentData) => {
  const response = await axios.post(`${API_URL}/customer-auth/appointments`, appointmentData, authHeader());
  return response.data;
};

export const updateMyAppointment = async (appointmentId, appointmentData) => {
  const response = await axios.put(
    `${API_URL}/customer-auth/appointments/${appointmentId}`,
    appointmentData,
    authHeader()
  );
  return response.data;
};

export const cancelMyAppointment = async (appointmentId) => {
  const response = await axios.delete(`${API_URL}/customer-auth/appointments/${appointmentId}`, authHeader());
  return response.data;
};
