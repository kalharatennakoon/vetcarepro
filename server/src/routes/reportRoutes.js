import express from 'express';
import * as reportController from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Financial reports (admin only)
router.get('/financial',
  authorize('admin'),
  reportController.getFinancialReports
);

// Operational reports (admin only)
router.get('/operational',
  authorize('admin'),
  reportController.getOperationalReports
);

// Dashboard summary (admin only)
router.get('/dashboard-summary',
  authorize('admin'),
  reportController.getDashboardSummary
);

// Export report to CSV (admin only)
router.get('/export',
  authorize('admin'),
  reportController.exportReport
);

// Export report to PDF (admin only)
router.get('/export-pdf',
  authorize('admin'),
  reportController.exportReportPDF
);

export default router;
