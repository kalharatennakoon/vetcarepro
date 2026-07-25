/**
 * AI Routes (RAG Assistant)
 */

import express from 'express';
import * as aiController from '../controllers/aiController.js';
import { authenticate } from '../middleware/auth.js';
import { staffOnly, adminOnly } from '../middleware/roleCheck.js';

const router = express.Router();

// @route   POST /api/ai/public-chat
// @desc    Ask a general pet-care question (no clinic data, no login required)
// @access  Public
router.post('/public-chat', aiController.publicChat);

// @route   POST /api/ai/chat
// @desc    Ask the AI assistant using full clinic-data scope
// @access  Private (admin, veterinarian, receptionist)
router.post('/chat', authenticate, staffOnly, aiController.staffChat);

// @route   GET /api/ai/health
// @desc    Check AI assistant (Ollama/RAG) health
// @access  Private (staff)
router.get('/health', authenticate, staffOnly, aiController.checkHealth);

// @route   POST /api/ai/ingest/medical-records
// @desc    Backfill the vector store from all existing medical records
// @access  Private (Admin only)
router.post('/ingest/medical-records', authenticate, adminOnly, aiController.backfillMedicalRecords);

export default router;
