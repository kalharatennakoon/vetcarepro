import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Pet Photo Guidance Service
 * Pet-owner-only: submit a pet photo for async AI guidance and poll for the
 * result. Uses the customer-portal token (localStorage 'customerToken'),
 * same as aiService.js's askCustomerAssistant - never the staff 'token'.
 */

const getCustomerAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('customerToken')}` }
});

/**
 * Submit a photo (+ optional note) of one of the customer's own pets for AI
 * guidance. Resolves as soon as the job is recorded (202) - the guidance
 * itself is generated in the background and fetched via getPhotoGuidanceStatus.
 * @param {string} petId
 * @param {File} photoFile
 * @param {string} [note]
 */
export const submitPhotoGuidance = async (petId, photoFile, note) => {
  const formData = new FormData();
  formData.append('photo', photoFile);
  if (note) formData.append('note', note);

  const response = await axios.post(
    `${API_URL}/customer-auth/pets/${petId}/ai-photo-guidance`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('customerToken')}`,
        'Content-Type': 'multipart/form-data'
      }
    }
  );
  return response.data;
};

/**
 * Poll a submitted job's status/result.
 * @param {number} jobId
 */
export const getPhotoGuidanceStatus = async (jobId) => {
  const response = await axios.get(
    `${API_URL}/customer-auth/ai-photo-guidance/${jobId}`,
    getCustomerAuthHeaders()
  );
  return response.data;
};

/**
 * List past AI photo guidance submissions for one of the customer's own pets.
 * @param {string} petId
 */
export const listPhotoGuidanceHistory = async (petId) => {
  const response = await axios.get(
    `${API_URL}/customer-auth/pets/${petId}/ai-photo-guidance`,
    getCustomerAuthHeaders()
  );
  return response.data;
};
