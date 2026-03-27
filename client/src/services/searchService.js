import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export const universalSearch = async (q) => {
  const res = await axios.get(`${API_URL}/search`, { params: { q }, ...getAuthHeader() });
  return res.data;
};
