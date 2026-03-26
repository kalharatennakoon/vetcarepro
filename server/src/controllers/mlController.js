/**
 * ML Controller
 * Handles ML service endpoints and proxies requests to Python ML service
 */

import * as mlService from '../services/mlService.js';
import { insertAuditLog } from '../models/auditLogModel.js';

/**
 * @desc    Check ML service health
 * @route   GET /api/ml/health
 * @access  Private
 */
const checkHealth = async (req, res) => {
  try {
    const result = await mlService.checkHealth();
    
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(503).json({
        success: false,
        message: result.error
      });
    }
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      message: 'ML service health check failed'
    });
  }
};

/**
 * @desc    Get ML models status
 * @route   GET /api/ml/models/status
 * @access  Private
 */
const getModelsStatus = async (req, res) => {
  try {
    const result = await mlService.getModelsStatus();
    res.json(result.data);
  } catch (error) {
    console.error('Get models status error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Test ML service database connection
 * @route   GET /api/ml/test/db-connection
 * @access  Private (Admin only)
 */
const testDatabaseConnection = async (req, res) => {
  try {
    const result = await mlService.testDatabaseConnection();
    res.json(result.data);
  } catch (error) {
    console.error('Database connection test error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// Disease Prediction Controllers
// ============================================

/**
 * @desc    Predict disease outbreak
 * @route   POST /api/ml/disease/predict
 * @access  Private
 */
const predictDisease = async (req, res) => {
  try {
    const result = await mlService.predictDisease(req.body);
    res.json(result);
  } catch (error) {
    console.error('Disease prediction error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get disease trends
 * @route   GET /api/ml/disease/trends
 * @access  Private
 */
const getDiseaseTrends = async (req, res) => {
  try {
    const result = await mlService.getDiseaseTrends(req.query);
    res.json(result);
  } catch (error) {
    console.error('Get disease trends error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Assess disease activity risk
 * @route   POST /api/ml/disease/outbreak-risk
 * @access  Private
 */
const assessOutbreakRisk = async (req, res) => {
  try {
    const result = await mlService.assessOutbreakRisk(req.body);
    res.json(result);
  } catch (error) {
    console.error('Assess outbreak risk error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get disease activity forecast
 * @route   GET /api/ml/disease/forecast
 * @access  Private
 */
const getDiseaseForecast = async (req, res) => {
  try {
    const result = await mlService.getDiseaseForecast(req.query);
    res.json(result);
  } catch (error) {
    console.error('Get disease forecast error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// Sales Forecasting Controllers (Phase 3)
// ============================================

/**
 * @desc    Train or retrain the sales forecasting model
 * @route   POST /api/ml/sales/train
 * @access  Private (Admin only)
 */
const trainDiseaseModel = async (req, res) => {
  try {
    const result = await mlService.trainDiseaseModel();
    await insertAuditLog({
      userId: req.user?.user_id,
      action: 'TRAIN',
      tableName: 'ml_models',
      newValues: { model: 'disease_prediction', ...result },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    res.json(result);
  } catch (error) {
    console.error('Disease model training error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const trainSalesModel = async (req, res) => {
  try {
    const result = await mlService.trainSalesModel();
    await insertAuditLog({
      userId: req.user?.user_id,
      action: 'TRAIN',
      tableName: 'ml_models',
      newValues: { model: 'sales_forecasting', ...result },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    res.json(result);
  } catch (error) {
    console.error('Sales model training error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Forecast revenue for the next N days
 * @route   GET /api/ml/sales/forecast
 * @access  Private
 */
const forecastSales = async (req, res) => {
  try {
    const result = await mlService.forecastSales(req.query);
    res.json(result);
  } catch (error) {
    console.error('Sales forecast error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Predict revenue for a specific month and year
 * @route   POST /api/ml/sales/predict-month
 * @access  Private
 */
const predictMonthlyRevenue = async (req, res) => {
  try {
    const result = await mlService.predictMonthlyRevenue(req.body);
    res.json(result);
  } catch (error) {
    console.error('Monthly revenue prediction error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get historical sales trends and seasonal patterns
 * @route   GET /api/ml/sales/trends
 * @access  Private
 */
const getSalesTrends = async (req, res) => {
  try {
    const result = await mlService.getSalesTrends(req.query);
    res.json(result);
  } catch (error) {
    console.error('Get sales trends error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get top revenue-generating services and products
 * @route   GET /api/ml/sales/top-services
 * @access  Private
 */
const getTopRevenueServices = async (req, res) => {
  try {
    const result = await mlService.getTopRevenueServices(req.query);
    res.json(result);
  } catch (error) {
    console.error('Get top revenue services error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// Inventory Forecasting Controllers (Phase 3)
// ============================================

/**
 * @desc    Train or retrain the inventory forecasting model
 * @route   POST /api/ml/inventory/train
 * @access  Private (Admin only)
 */
const trainInventoryModel = async (req, res) => {
  try {
    const result = await mlService.trainInventoryModel();
    await insertAuditLog({
      userId: req.user?.user_id,
      action: 'TRAIN',
      tableName: 'ml_models',
      newValues: { model: 'inventory_forecasting', ...result },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    res.json(result);
  } catch (error) {
    console.error('Inventory model training error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Forecast inventory demand for a specific item
 * @route   POST /api/ml/inventory/forecast
 * @access  Private
 */
const forecastInventory = async (req, res) => {
  try {
    const result = await mlService.forecastInventory(req.body);
    res.json(result);
  } catch (error) {
    console.error('Inventory forecast error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get intelligent reorder suggestions for all inventory items
 * @route   GET /api/ml/inventory/reorder-suggestions
 * @access  Private
 */
const getReorderSuggestions = async (req, res) => {
  try {
    const result = await mlService.getReorderSuggestions();
    res.json(result);
  } catch (error) {
    console.error('Get reorder suggestions error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get fast-moving and slow-moving inventory items
 * @route   GET /api/ml/inventory/fast-moving
 * @access  Private
 */
const getFastMovingItems = async (req, res) => {
  try {
    const result = await mlService.getFastMovingItems(req.query);
    res.json(result);
  } catch (error) {
    console.error('Get fast-moving items error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get demand analysis by inventory category
 * @route   GET /api/ml/inventory/category-analysis
 * @access  Private
 */
const getCategoryDemandAnalysis = async (req, res) => {
  try {
    const result = await mlService.getCategoryDemandAnalysis();
    res.json(result);
  } catch (error) {
    console.error('Get category demand analysis error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Predict restock date for a specific item
 * @route   POST /api/ml/inventory/predict-restock
 * @access  Private
 */
const predictRestockDate = async (req, res) => {
  try {
    const result = await mlService.predictRestockDate(req.body);
    res.json(result);
  } catch (error) {
    console.error('Predict restock date error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// Data Loading Controllers (for testing)
// ============================================

/**
 * @desc    Load sales data
 * @route   GET /api/ml/data/sales
 * @access  Private
 */
const loadSalesData = async (req, res) => {
  try {
    const result = await mlService.loadSalesData(req.query);
    res.json(result);
  } catch (error) {
    console.error('Load sales data error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Load inventory data
 * @route   GET /api/ml/data/inventory
 * @access  Private
 */
const loadInventoryData = async (req, res) => {
  try {
    const result = await mlService.loadInventoryData();
    res.json(result);
  } catch (error) {
    console.error('Load inventory data error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Check if any ML model needs retraining based on new record growth
 * @route   GET /api/ml/retrain-check
 * @access  Private/Admin
 */
const getRetrainCheck = async (_req, res) => {
  try {
    const result = await mlService.getRetrainCheck();
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const predictPetRisk = async (req, res) => {
  try {
    const result = await mlService.predictPetRisk(req.body);
    const { pet_id, species, breed, age_months } = req.body;
    await insertAuditLog({
      userId: req.user?.user_id,
      action: 'PREDICT',
      tableName: 'pets',
      recordId: null,
      newValues: { type: 'health_prediction', pet_id, species, breed, age_months },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const predictCancerRisk = async (req, res) => {
  try {
    const result = await mlService.predictCancerRisk(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getOutbreakTrend = async (req, res) => {
  try {
    const result = await mlService.getOutbreakTrend(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPandemicRisk = async (req, res) => {
  try {
    const result = await mlService.getPandemicRisk(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export {
  // Health & Status
  checkHealth,
  getModelsStatus,
  getRetrainCheck,
  testDatabaseConnection,

  // Disease Prediction
  trainDiseaseModel,
  predictDisease,
  getDiseaseTrends,
  assessOutbreakRisk,
  getDiseaseForecast,
  predictPetRisk,
  predictCancerRisk,
  getOutbreakTrend,
  getPandemicRisk,

  // Sales Forecasting (Phase 3)
  trainSalesModel,
  forecastSales,
  predictMonthlyRevenue,
  getSalesTrends,
  getTopRevenueServices,

  // Inventory Forecasting (Phase 3)
  trainInventoryModel,
  forecastInventory,
  getReorderSuggestions,
  getFastMovingItems,
  getCategoryDemandAnalysis,
  predictRestockDate,

  // Data Loading
  loadSalesData,
  loadInventoryData
};
