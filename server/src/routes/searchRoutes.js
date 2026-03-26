import express from 'express';
import { universalSearch } from '../controllers/searchController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, universalSearch);

export default router;
