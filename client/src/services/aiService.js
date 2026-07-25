import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

/**
 * Ask the AI assistant a question (full clinic-data scope, staff only)
 * @param {string} question
 */
export const askAssistant = async (question) => {
  const response = await axios.post(
    `${API_URL}/ai/chat`,
    { question },
    getAuthHeaders()
  );
  return response.data;
};

/**
 * Check whether the local AI assistant (Ollama) is reachable and the
 * required models are installed.
 */
export const checkAssistantHealth = async () => {
  const response = await axios.get(`${API_URL}/ai/health`, getAuthHeaders());
  return response.data;
};

/**
 * Backfill the vector store from all existing medical records (Admin only,
 * one-off / maintenance action).
 */
export const backfillMedicalRecords = async () => {
  const response = await axios.post(
    `${API_URL}/ai/ingest/medical-records`,
    {},
    getAuthHeaders()
  );
  return response.data;
};
