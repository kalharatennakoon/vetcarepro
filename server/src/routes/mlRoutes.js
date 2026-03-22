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

// @route   GET /api/ml/retrain-check
// @desc    Check if any model needs retraining based on new record growth
// @access  Private (Admin only)
router.get('/retrain-check', authorize('admin'), mlController.getRetrainCheck);

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

// @route   POST /api/ml/disease/train
// @desc    Train or retrain the disease prediction model
// @access  Private (Admin only)
router.post('/disease/train', authorize('admin'), mlController.trainDiseaseModel);

// @route   POST /api/ml/disease/predict
// @desc    Predict disease outbreak
// @access  Private
router.post('/disease/predict', mlController.predictDisease);

// @route   GET /api/ml/disease/trends
// @desc    Get disease trends
// @access  Private
router.get('/disease/trends', mlController.getDiseaseTrends);

// @route   POST /api/ml/disease/pet-risk
// @desc    Predict individual pet disease risk over time horizons
// @access  Private (vet + admin)
router.post('/disease/pet-risk', mlController.predictPetRisk);

// @route   POST /api/ml/disease/cancer-risk
// @desc    Estimate cancer/tumor risk based on breed and age
// @access  Private (vet + admin)
router.post('/disease/cancer-risk', mlController.predictCancerRisk);

// @route   GET /api/ml/disease/outbreak-trend
// @desc    Project outbreak trend forward (?species=&days_ahead=90)
// @access  Private (vet + admin)
router.get('/disease/outbreak-trend', mlController.getOutbreakTrend);

// @route   GET /api/ml/disease/pandemic-risk
// @desc    Assess pandemic/epidemic potential (?species=)
// @access  Private (vet + admin)
router.get('/disease/pandemic-risk', mlController.getPandemicRisk);

// ============================================
// Sales Forecasting Routes (Phase 3)
// ============================================

// @route   POST /api/ml/sales/train
// @desc    Train or retrain the sales forecasting model
// @access  Private (Admin only)
router.post(
  '/sales/train',
  authorize('admin'),
  mlController.trainSalesModel
);

// @route   GET /api/ml/sales/forecast
// @desc    Forecast revenue for the next N days (?periods=90)
// @access  Private
router.get('/sales/forecast', mlController.forecastSales);

// @route   POST /api/ml/sales/predict-month
// @desc    Predict revenue for a specific month and year
// @access  Private
router.post('/sales/predict-month', mlController.predictMonthlyRevenue);

// @route   GET /api/ml/sales/trends
// @desc    Get historical sales trends and seasonal patterns (?months=12)
// @access  Private
router.get('/sales/trends', mlController.getSalesTrends);

// @route   GET /api/ml/sales/top-services
// @desc    Get top revenue-generating services and products (?limit=10)
// @access  Private
router.get('/sales/top-services', mlController.getTopRevenueServices);

// ============================================
// Inventory Forecasting Routes (Phase 3)
// ============================================

// @route   POST /api/ml/inventory/train
// @desc    Train or retrain the inventory forecasting model
// @access  Private (Admin only)
router.post(
  '/inventory/train',
  authorize('admin'),
  mlController.trainInventoryModel
);

// @route   POST /api/ml/inventory/forecast
// @desc    Forecast inventory demand for a specific item
// @access  Private
router.post('/inventory/forecast', mlController.forecastInventory);

// @route   GET /api/ml/inventory/reorder-suggestions
// @desc    Get intelligent reorder suggestions for all items
// @access  Private
router.get('/inventory/reorder-suggestions', mlController.getReorderSuggestions);

// @route   GET /api/ml/inventory/fast-moving
// @desc    Get fast-moving and slow-moving items (?limit=10)
// @access  Private
router.get('/inventory/fast-moving', mlController.getFastMovingItems);

// @route   GET /api/ml/inventory/category-analysis
// @desc    Get demand analysis by inventory category
// @access  Private
router.get('/inventory/category-analysis', mlController.getCategoryDemandAnalysis);

// @route   POST /api/ml/inventory/predict-restock
// @desc    Predict restock date for a specific item
// @access  Private
router.post('/inventory/predict-restock', mlController.predictRestockDate);

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
