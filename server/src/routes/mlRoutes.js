/**
 * ML Routes
 * Routes for machine learning service endpoints
 */

import express from 'express';
import * as mlController from '../controllers/mlController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();

// All ML routes require authentication
router.use(authenticate);

// ============================================
// Health & Status Routes
// ============================================

// @route   GET /api/ml/health
// @desc    Check ML service health
// @access  Private
router.get('/health', mlController.checkHealth);

// @route   GET /api/ml/models/status
// @desc    Get ML models status
// @access  Private
router.get('/models/status', mlController.getModelsStatus);

// @route   GET /api/ml/test/db-connection
// @desc    Test ML service database connection
// @access  Private (Admin only)
router.get(
  '/test/db-connection',
  authorize('admin'),
  mlController.testDatabaseConnection
);

// ============================================
// Disease Prediction Routes
// ============================================

// @route   POST /api/ml/disease/predict
// @desc    Predict disease outbreak
// @access  Private
router.post('/disease/predict', mlController.predictDisease);

// @route   GET /api/ml/disease/trends
// @desc    Get disease trends
// @access  Private
router.get('/disease/trends', mlController.getDiseaseTrends);

// ============================================
// Sales Forecasting Routes
// ============================================

// @route   POST /api/ml/sales/forecast
// @desc    Forecast sales
// @access  Private
router.post('/sales/forecast', mlController.forecastSales);

// @route   GET /api/ml/sales/trends
// @desc    Get sales trends
// @access  Private
router.get('/sales/trends', mlController.getSalesTrends);

// ============================================
// Inventory Forecasting Routes
// ============================================

// @route   POST /api/ml/inventory/forecast
// @desc    Forecast inventory demand
// @access  Private
router.post('/inventory/forecast', mlController.forecastInventory);

// @route   GET /api/ml/inventory/reorder-suggestions
// @desc    Get intelligent reorder suggestions
// @access  Private
router.get('/inventory/reorder-suggestions', mlController.getReorderSuggestions);

// ============================================
// Data Loading Routes (for testing/development)
// ============================================

// @route   GET /api/ml/data/sales
// @desc    Load sales data
// @access  Private (Admin only for testing)
router.get(
  '/data/sales',
  authorize('admin'),
  mlController.loadSalesData
);

// @route   GET /api/ml/data/inventory
// @desc    Load inventory data
// @access  Private (Admin only for testing)
router.get(
  '/data/inventory',
  authorize('admin'),
  mlController.loadInventoryData
);

export default router;
