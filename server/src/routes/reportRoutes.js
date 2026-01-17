import express from 'express';
import * as reportController from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Financial reports (accessible by admin and veterinarian)
router.get('/financial', 
  authorize('admin', 'veterinarian'), 
  reportController.getFinancialReports
);

// Operational reports (accessible by admin and veterinarian)
router.get('/operational', 
  authorize('admin', 'veterinarian'), 
  reportController.getOperationalReports
);

// Dashboard summary (accessible by all authenticated users)
router.get('/dashboard-summary', 
  reportController.getDashboardSummary
);

// Export report to CSV (accessible by admin and veterinarian)
router.get('/export', 
  authorize('admin', 'veterinarian'), 
  reportController.exportReport
);

export default router;
