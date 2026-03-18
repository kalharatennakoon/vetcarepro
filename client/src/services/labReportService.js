import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

export const getLabReports = async (petId) => {
  const response = await axios.get(`${API_URL}/lab-reports/pet/${petId}`, getAuthHeader());
  return response.data;
};

export const uploadLabReport = async (petId, formData) => {
  const token = localStorage.getItem('token');
  const response = await axios.post(
    `${API_URL}/lab-reports/pet/${petId}/upload`,
    formData,
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
};

export const openLabReport = async (reportId, fileType) => {
  const token = localStorage.getItem('token');
  const response = await axios.get(
    `${API_URL}/lab-reports/${reportId}/view`,
    { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' }
  );
  const mimeType = fileType === 'pdf' ? 'application/pdf' : response.data.type;
  const blob = new Blob([response.data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
};

export const deleteLabReport = async (reportId) => {
  const response = await axios.delete(`${API_URL}/lab-reports/${reportId}`, getAuthHeader());
  return response.data;
};

export const emailLabReport = async (reportId, message) => {
  const response = await axios.post(
    `${API_URL}/lab-reports/${reportId}/email`,
    { message },
    getAuthHeader()
  );
  return response.data;
};
