import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

/**
 * Ask the AI assistant a question (full clinic-data scope, staff only)
 * @param {string} question
 * @param {Object} [options]
 * @param {Array} [options.history] - recent {role, content} turns, needed for multi-turn
 *   write-action requests (booking, rescheduling, reminders, intake)
 * @param {Object} [options.pendingIntent] - an in-progress write-action proposal echoed back
 *   from the previous turn's response, so slot-filling can continue
 */
export const askAssistant = async (question, { history, pendingIntent } = {}) => {
  const response = await axios.post(
    `${API_URL}/ai/chat`,
    { question, history, pending_intent: pendingIntent },
    getAuthHeaders()
  );
  return response.data;
};

/**
 * Execute a write action the assistant proposed (book/reschedule/cancel an
 * appointment, send a reminder, register a customer, add a pet) - only ever
 * called after the staff member explicitly confirms it in the chat UI.
 * @param {Object} action - the `action` object returned by askAssistant
 *   (`{ type, slots }`)
 */
export const confirmAiAction = async (action) => {
  const response = await axios.post(
    `${API_URL}/ai/actions/confirm`,
    { action },
    getAuthHeaders()
  );
  return response.data;
};

/**
 * Ask the AI assistant a question as a logged-in pet owner (scoped to their
 * own pets/records only). Uses the customer-portal token, not the staff one.
 * @param {string} question
 */
export const askCustomerAssistant = async (question) => {
  const customerToken = localStorage.getItem('customerToken');
  const response = await axios.post(
    `${API_URL}/ai/customer-chat`,
    { question },
    { headers: { Authorization: `Bearer ${customerToken}` } }
  );
  return response.data;
};

/**
 * Ask the AI assistant a general pet-care question as a guest (no login,
 * no clinic-specific data - general info only, backed by the public FAQ/
 * care-instruction sources).
 * @param {string} question
 */
export const askPublicAssistant = async (question) => {
  const response = await axios.post(`${API_URL}/ai/public-chat`, { question });
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