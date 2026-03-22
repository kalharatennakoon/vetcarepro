import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { vetOrAdmin } from '../middleware/roleCheck.js';
import { uploadLabReport } from '../config/multer.js';
import {
  listLabReports,
  uploadReport,
  viewReport,
  removeLabReport,
  emailLabReport
} from '../controllers/labReportController.js';

const router = express.Router();

// GET  /api/lab-reports/pet/:petId        — list all reports for a pet (vet/admin only)
router.get('/pet/:petId', authenticate, vetOrAdmin, listLabReports);

// POST /api/lab-reports/pet/:petId/upload — upload a new report (vet/admin only)
router.post('/pet/:petId/upload', authenticate, vetOrAdmin, uploadLabReport.single('file'), uploadReport);

// GET  /api/lab-reports/:reportId/view    — serve the file (vet/admin only)
router.get('/:reportId/view', authenticate, vetOrAdmin, viewReport);

// POST /api/lab-reports/:reportId/email   — email report to pet owner (vet/admin only)
router.post('/:reportId/email', authenticate, vetOrAdmin, emailLabReport);

// DELETE /api/lab-reports/:reportId       — delete a report (vet/admin only)
router.delete('/:reportId', authenticate, vetOrAdmin, removeLabReport);

export default router;
