import express from 'express';
import { listAuditLogs, getFilterOptions } from '../controllers/auditLogController.js';
import { authenticate } from '../middleware/auth.js';
import { adminOnly } from '../middleware/roleCheck.js';

const router = express.Router();

router.use(authenticate);
router.use(adminOnly);

router.get('/', listAuditLogs);
router.get('/filter-options', getFilterOptions);

export default router;
