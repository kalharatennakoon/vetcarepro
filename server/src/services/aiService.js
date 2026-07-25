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

/**
 * (Re)ingest disease cases into the vector store.
 */
const ingestDiseaseCase = async (caseId = null) => {
  try {
    const response = await aiClient.post('/api/ml/rag/ingest/disease-cases', {
      ...(caseId ? { case_id: caseId } : {})
    });
    return response.data;
  } catch (error) {
    console.error('RAG disease case ingestion failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * (Re)ingest lab report metadata into the vector store.
 */
const ingestLabReport = async (reportId = null) => {
  try {
    const response = await aiClient.post('/api/ml/rag/ingest/lab-reports', {
      ...(reportId ? { report_id: reportId } : {})
    });
    return response.data;
  } catch (error) {
    console.error('RAG lab report ingestion failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * (Re)ingest a vaccination record into the vector store.
 */
const ingestVaccination = async (vaccinationId = null) => {
  try {
    const response = await aiClient.post('/api/ml/rag/ingest/vaccinations', {
      ...(vaccinationId ? { vaccination_id: vaccinationId } : {})
    });
    return response.data;
  } catch (error) {
    console.error('RAG vaccination ingestion failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * (Re)ingest the static FAQ / care-instruction content.
 */
const ingestFaqs = async () => {
  try {
    const response = await aiClient.post('/api/ml/rag/ingest/faqs');
    return response.data;
  } catch (error) {
    console.error('RAG FAQ ingestion failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Backfill every source type in one call (admin maintenance action).
 */
const ingestAll = async () => {
  try {
    const response = await aiClient.post('/api/ml/rag/ingest/all');
    return response.data;
  } catch (error) {
    console.error('RAG full ingestion failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Explain a raw ML model output (outbreak risk, sales forecast, inventory
 * forecast) in plain language.
 * @param {string} outputType - e.g. 'outbreak_risk', 'sales_forecast', 'inventory_forecast'
 * @param {Object} data - the raw ML output to explain
 */
const explainMlOutput = async (outputType, data) => {
  try {
    const response = await aiClient.post('/api/ml/rag/explain', {
      output_type: outputType,
      data
    });
    return response.data;
  } catch (error) {
    console.error('ML output explanation failed:', error.message);
    throw new Error('Failed to explain ML output');
  }
};

export {
  checkRagHealth,
  askAssistant,
  ingestMedicalRecord,
  ingestDiseaseCase,
  ingestLabReport,
  ingestVaccination,
  ingestFaqs,
  ingestAll,
  explainMlOutput
};