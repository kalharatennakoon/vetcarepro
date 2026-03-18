import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { uploadLabReport } from '../config/multer.js';
import {
  listLabReports,
  uploadReport,
  viewReport,
  removeLabReport
} from '../controllers/labReportController.js';

const router = express.Router();

// GET  /api/lab-reports/pet/:petId        — list all reports for a pet
router.get('/pet/:petId', authenticate, listLabReports);

// POST /api/lab-reports/pet/:petId/upload — upload a new report
router.post('/pet/:petId/upload', authenticate, uploadLabReport.single('file'), uploadReport);

// GET  /api/lab-reports/:reportId/view    — serve the file
router.get('/:reportId/view', authenticate, viewReport);

// DELETE /api/lab-reports/:reportId       — delete a report (admin/vet only)
router.delete('/:reportId', authenticate, removeLabReport);

export default router;
