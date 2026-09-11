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

let cachedBriefing = null;
let cachedToken = null;

/**
 * Get the AI Daily Briefing for the current staff user's role.
 * Caches in memory to ensure navigating between tabs/dashboard is instant.
 *
 * @param {Object} [options]
 * @param {boolean} [options.forceRefresh=false]
 */
export const getBriefing = async ({ forceRefresh = false } = {}) => {
  const token = localStorage.getItem('token');

  if (!forceRefresh && cachedBriefing && cachedToken === token) {
    return cachedBriefing;
  }

  const authConfig = getAuthHeader();
  const config = {
    ...authConfig,
    headers: {
      ...authConfig.headers,
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    },
    params: {
      t: Date.now()
    }
  };
  const response = await axios.get(`${API_URL}/ml/briefing`, config);

  if (response.data && response.data.success && !response.data.unavailable) {
    cachedBriefing = response.data;
    cachedToken = token;
  }

  return response.data;
};

export const clearBriefingCache = () => {
  cachedBriefing = null;
  cachedToken = null;
};
