import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Customer Portal Service
 * API calls made by a logged-in pet owner about their own account/pets.
 * Uses the customer-portal token ('customerToken'), never the staff one -
 * mirrors the pattern in aiService.js's askCustomerAssistant.
 */
export const getMyPets = async () => {
  const customerToken = localStorage.getItem('customerToken');
  const response = await axios.get(`${API_URL}/customer-auth/me/pets`, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  return response.data;
};
