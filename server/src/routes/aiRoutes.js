/**
 * AI Routes (RAG Assistant)
 */

import express from 'express';
import * as aiController from '../controllers/aiController.js';
import { authenticate, authenticateCustomer } from '../middleware/auth.js';
import { staffOnly, adminOnly } from '../middleware/roleCheck.js';

const router = express.Router();

// @route   POST /api/ai/public-chat
// @desc    Ask a general pet-care question (no clinic data, no login required)
// @access  Public
router.post('/public-chat', aiController.publicChat);

// @route   GET /api/ai/faqs
// @desc    List general pet-care FAQs (guest-safe, no clinic/account data)
// @access  Public
router.get('/faqs', aiController.getFaqs);

// @route   POST /api/ai/customer-chat
// @desc    Ask the AI assistant, scoped to the logged-in customer's own pets
// @access  Private (customer / pet owner)
router.post('/customer-chat', authenticateCustomer, aiController.customerChat);

// @route   POST /api/ai/chat
// @desc    Ask the AI assistant using full clinic-data scope
// @access  Private (admin, veterinarian, receptionist)
router.post('/chat', authenticate, staffOnly, aiController.staffChat);

// @route   POST /api/ai/chat/stream
// @desc    Real-time streamed variant of /chat (Server-Sent Events) - the
//          admin-only "show model reasoning live" chat view. Admin-only
//          because the ML layer only ever turns on thinking mode for that
//          role (see rag_service.py) - no other role has anything to stream.
// @access  Private (admin only)
router.post('/chat/stream', authenticate, adminOnly, aiController.streamChat);

// @route   POST /api/ai/actions/confirm
// @desc    Execute a write action the assistant proposed (book/reschedule/
//          cancel an appointment, send a reminder, register a customer, add
//          a pet, or - admin only - register a new staff member) after
//          explicit staff confirmation
// @access  Private (admin, veterinarian, receptionist) - register_staff is
//          further restricted to admin inside the controller
router.post('/actions/confirm', authenticate, staffOnly, aiController.confirmAction);

// @route   GET /api/ai/health
// @desc    Check AI assistant (Ollama/RAG) health
// @access  Private (staff)
router.get('/health', authenticate, staffOnly, aiController.checkHealth);

// @route   POST /api/ai/ingest/medical-records
// @desc    Backfill the vector store from all existing medical records
// @access  Private (Admin only)
router.post('/ingest/medical-records', authenticate, adminOnly, aiController.backfillMedicalRecords);

// @route   POST /api/ai/ingest/all
// @desc    Backfill every RAG source type (medical records, disease cases, lab reports, FAQs)
// @access  Private (Admin only)
router.post('/ingest/all', authenticate, adminOnly, aiController.backfillAll);

// @route   POST /api/ai/explain
// @desc    Explain a raw ML model output (outbreak risk, sales/inventory forecast) in plain language
// @access  Private (staff)
router.post('/explain', authenticate, staffOnly, aiController.explainOutput);

export default router;