import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

/**
 * Get the AI Daily Briefing for the current staff user's role.
 */
export const getBriefing = async () => {
  const response = await axios.get(`${API_URL}/ml/briefing`, getAuthHeader());
  return response.data;
};
