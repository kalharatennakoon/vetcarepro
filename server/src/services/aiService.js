/**
 * AI Service (RAG Assistant)
 * Handles communication between Node.js backend and the Flask ML service's
 * RAG endpoints (Ollama-backed, local + free).
 */

import axios from 'axios';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
const AI_SERVICE_TIMEOUT = 60000; // generation can be slower than ML predictions

const aiClient = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: AI_SERVICE_TIMEOUT,
  headers: { 'Content-Type': 'application/json' }
});

/**
 * Check RAG/Ollama health
 */
const checkRagHealth = async () => {
  try {
    const response = await aiClient.get('/api/ml/rag/health');
    return { success: true, data: response.data };
  } catch (error) {
    console.error('RAG health check failed:', error.message);
    return { success: false, error: 'AI assistant service is not available' };
  }
};

/**
 * Ask the AI assistant a question, scoped by role/customer.
 * @param {Object} params
 * @param {string} params.question
 * @param {string} params.role - 'admin' | 'veterinarian' | 'receptionist' | 'pet_owner' | 'guest'
 * @param {string} [params.customerId] - required when role === 'pet_owner'
 */
const askAssistant = async ({ question, role, customerId }) => {
  try {
    const response = await aiClient.post('/api/ml/rag/chat', {
      question,
      role,
      customer_id: customerId
    });
    return response.data;
  } catch (error) {
    console.error('AI assistant chat failed:', error.message);
    throw new Error('Failed to get a response from the AI assistant');
  }
};

/**
 * (Re)ingest medical records into the vector store.
 * Called after a medical record is created/updated (single record_id),
 * or manually to backfill everything (no record_id).
 */
const ingestMedicalRecord = async (recordId = null) => {
  try {
    const response = await aiClient.post('/api/ml/rag/ingest/medical-records', {
      ...(recordId ? { record_id: recordId } : {})
    });
    return response.data;
  } catch (error) {
    // Ingestion failures shouldn't break the main request flow (e.g. saving
    // a medical record) - log and continue rather than throwing.
    console.error('RAG ingestion failed:', error.message);
    return { success: false, error: error.message };
  }
};

export {
  checkRagHealth,
  askAssistant,
  ingestMedicalRecord
};
