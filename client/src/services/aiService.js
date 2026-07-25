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
 * Backfill the vector store from all existing medical records only.
 */
export const backfillMedicalRecords = async () => {
  const response = await axios.post(
    `${API_URL}/ai/ingest/medical-records`,
    {},
    getAuthHeaders()
  );
  return response.data;
};

/**
 * Backfill every RAG source type in one call (medical records, disease
 * cases, lab reports, FAQs) - Admin only, one-off / maintenance action.
 */
export const backfillAll = async () => {
  const response = await axios.post(`${API_URL}/ai/ingest/all`, {}, getAuthHeaders());
  return response.data;
};

/**
 * Explain a raw ML model output (outbreak risk, sales forecast, inventory
 * forecast) in plain language.
 * @param {string} outputType - e.g. 'outbreak_risk', 'sales_forecast', 'inventory_forecast'
 * @param {Object} data - the raw ML output to explain
 */
export const explainMlOutput = async (outputType, data) => {
  const response = await axios.post(
    `${API_URL}/ai/explain`,
    { output_type: outputType, data },
    getAuthHeaders()
  );
  return response.data;
};