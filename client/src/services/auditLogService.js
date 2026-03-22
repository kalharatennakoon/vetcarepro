import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const getAuthHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
});

const auditLogService = {
  getLogs: async (params = {}) => {
    const response = await axios.get(`${API_URL}/audit-logs`, {
      params,
      headers: getAuthHeader()
    });
    return response.data;
  },

  getFilterOptions: async () => {
    const response = await axios.get(`${API_URL}/audit-logs/filter-options`, {
      headers: getAuthHeader()
    });
    return response.data;
  }
};

export default auditLogService;
