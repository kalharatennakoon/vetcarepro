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

export const getPetLabReports = async (petId) => {
  const customerToken = localStorage.getItem('customerToken');
  const response = await axios.get(`${API_URL}/customer-auth/pets/${petId}/lab-reports`, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  return response.data;
};

// Fetches the file as a blob through the authenticated view route (never the
// public /uploads static path) and saves it to disk via a throwaway <a
// download> link, rather than just opening it in a new tab.
export const downloadPetLabReport = async (reportId, reportName, fileType) => {
  const customerToken = localStorage.getItem('customerToken');
  const response = await axios.get(`${API_URL}/customer-auth/lab-reports/${reportId}/view`, {
    headers: { Authorization: `Bearer ${customerToken}` },
    responseType: 'blob'
  });

  const mimeType = fileType === 'pdf' ? 'application/pdf' : response.data.type;
  const blob = new Blob([response.data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const extension = fileType === 'pdf' ? '.pdf' : '.jpg';
  const safeName = (reportName || 'lab-report').replace(/[^a-z0-9]/gi, '_');

  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeName}${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
