/**
 * AI Controller (RAG Assistant)
 * Exposes the AI assistant to authenticated staff, and a restricted
 * public/guest endpoint for general (non-clinic-data) questions.
 *
 * NOTE: "Pet Owner" mode is intentionally not exposed yet - the `users`
 * table only supports staff roles (admin/veterinarian/receptionist);
 * `customers` currently has no login/auth. Add that once customer
 * authentication exists (also needed for the mobile app's Owner mode).
 */

import * as aiService from '../services/aiService.js';

/**
 * @desc    Check AI assistant (Ollama/RAG) health
 * @route   GET /api/ai/health
 * @access  Private (staff)
 */
const checkHealth = async (req, res) => {
  try {
    const result = await aiService.checkRagHealth();
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(503).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error('AI health check error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Ask the AI assistant a question, using full clinic-data scope
 * @route   POST /api/ai/chat
 * @access  Private (admin, veterinarian, receptionist)
 */
const staffChat = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, message: 'question is required' });
    }

    const result = await aiService.askAssistant({
      question,
      role: req.user.role // enforced server-side from the authenticated user, never trusted from the client
    });

    res.json(result);
  } catch (error) {
    console.error('Staff AI chat error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Ask the AI assistant a general question (public FAQs / care guides only)
 * @route   POST /api/ai/public-chat
 * @access  Public
 */
const publicChat = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, message: 'question is required' });
    }

    const result = await aiService.askAssistant({ question, role: 'guest' });
    res.json(result);
  } catch (error) {
    console.error('Public AI chat error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    (Re)ingest all existing medical records into the vector store
 * @route   POST /api/ai/ingest/medical-records
 * @access  Private (Admin only) - one-off backfill / maintenance
 */
const backfillMedicalRecords = async (req, res) => {
  try {
    const result = await aiService.ingestMedicalRecord(); // no id = backfill all
    res.json(result);
  } catch (error) {
    console.error('AI ingestion backfill error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Backfill every RAG source type in one call (medical records,
 *          disease cases, lab reports, FAQs)
 * @route   POST /api/ai/ingest/all
 * @access  Private (Admin only)
 */
const backfillAll = async (req, res) => {
  try {
    const result = await aiService.ingestAll();
    res.json(result);
  } catch (error) {
    console.error('AI full ingestion backfill error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Explain a raw ML model output (outbreak risk, sales forecast,
 *          inventory forecast) in plain language
 * @route   POST /api/ai/explain
 * @access  Private (staff)
 */
const explainOutput = async (req, res) => {
  try {
    const { output_type, data } = req.body;
    if (!data) {
      return res.status(400).json({ success: false, message: 'data is required' });
    }

    const result = await aiService.explainMlOutput(output_type, data);
    res.json(result);
  } catch (error) {
    console.error('Explain ML output error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export {
  checkHealth,
  staffChat,
  publicChat,
  backfillMedicalRecords,
  backfillAll,
  explainOutput
};