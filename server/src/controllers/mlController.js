/**
 * ML Controller
 * Handles ML service endpoints and proxies requests to Python ML service
 */

import * as mlService from '../services/mlService.js';

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

// ============================================
// Sales Forecasting Controllers
// ============================================

/**
 * @desc    Forecast sales
 * @route   POST /api/ml/sales/forecast
 * @access  Private
 */
const forecastSales = async (req, res) => {
  try {
    const result = await mlService.forecastSales(req.body);
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
 * @desc    Get sales trends
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

// ============================================
// Inventory Forecasting Controllers
// ============================================

/**
 * @desc    Forecast inventory demand
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
 * @desc    Get reorder suggestions
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

export {
  // Health & Status
  checkHealth,
  getModelsStatus,
  testDatabaseConnection,
  
  // Disease Prediction
  predictDisease,
  getDiseaseTrends,
  
  // Sales Forecasting
  forecastSales,
  getSalesTrends,
  
  // Inventory Forecasting
  forecastInventory,
  getReorderSuggestions,
  
  // Data Loading
  loadSalesData,
  loadInventoryData
};
