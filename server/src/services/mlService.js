/**
 * ML Service Integration
 * Handles communication between Node.js backend and Python ML service
 */

import axios from 'axios';

// ML Service Configuration
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
const ML_SERVICE_TIMEOUT = 30000; // 30 seconds

// Create axios instance for ML service
const mlClient = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: ML_SERVICE_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Check ML service health
 */
const checkHealth = async () => {
  try {
    const response = await mlClient.get('/api/ml/health');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('ML Service health check failed:', error.message);
    return {
      success: false,
      error: 'ML service is not available'
    };
  }
};

/**
 * Get status of all ML models
 */
const getModelsStatus = async () => {
  try {
    const response = await mlClient.get('/api/ml/models/status');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Failed to get models status:', error.message);
    throw new Error('Failed to retrieve ML models status');
  }
};

/**
 * Test database connection from ML service
 */
const testDatabaseConnection = async () => {
  try {
    const response = await mlClient.get('/api/ml/test/db-connection');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('ML Service database test failed:', error.message);
    throw new Error('Failed to test database connection');
  }
};

// ============================================
// Disease Prediction Services
// ============================================

/**
 * Predict disease outbreak
 * @param {Object} params - Prediction parameters
 */
const predictDisease = async (params) => {
  try {
    const response = await mlClient.post('/api/ml/disease/predict', params);
    return response.data;
  } catch (error) {
    console.error('Disease prediction failed:', error.message);
    throw new Error('Failed to predict disease outbreak');
  }
};

/**
 * Get disease trends
 * @param {Object} params - Query parameters
 */
const getDiseaseTrends = async (params) => {
  try {
    const response = await mlClient.get('/api/ml/disease/trends', { params });
    return response.data;
  } catch (error) {
    console.error('Failed to get disease trends:', error.message);
    throw new Error('Failed to retrieve disease trends');
  }
};

// ============================================
// Sales Forecasting Services (Phase 3)
// ============================================

/**
 * Train or retrain the disease prediction model
 */
const trainDiseaseModel = async () => {
  try {
    const response = await mlClient.post('/api/ml/disease/train', {});
    return response.data;
  } catch (error) {
    console.error('Disease model training failed:', error.message);
    throw new Error('Failed to train disease prediction model');
  }
};

/**
 * Train or retrain the sales forecasting model
 */
const trainSalesModel = async () => {
  try {
    const response = await mlClient.post('/api/ml/sales/train', {});
    return response.data;
  } catch (error) {
    console.error('Sales model training failed:', error.message);
    throw new Error('Failed to train sales forecasting model');
  }
};

/**
 * Forecast revenue for the next N days
 * @param {Object} params - Query parameters
 * @param {number} params.periods - Number of days to forecast (default: 90)
 */
const forecastSales = async (params = {}) => {
  try {
    const response = await mlClient.get('/api/ml/sales/forecast', { params });
    return response.data;
  } catch (error) {
    console.error('Sales forecast failed:', error.message);
    throw new Error('Failed to forecast sales');
  }
};

/**
 * Predict revenue for a specific month and year
 * @param {Object} params - Prediction parameters
 * @param {number} params.month - Month (1-12)
 * @param {number} params.year - Year (e.g. 2025)
 */
const predictMonthlyRevenue = async (params) => {
  try {
    const response = await mlClient.post('/api/ml/sales/predict-month', params);
    return response.data;
  } catch (error) {
    console.error('Monthly revenue prediction failed:', error.message);
    throw new Error('Failed to predict monthly revenue');
  }
};

/**
 * Get historical sales trends and seasonal patterns
 * @param {Object} params - Query parameters
 * @param {number} params.months - Number of months to analyse (default: 12)
 */
const getSalesTrends = async (params = {}) => {
  try {
    const response = await mlClient.get('/api/ml/sales/trends', { params });
    return response.data;
  } catch (error) {
    console.error('Failed to get sales trends:', error.message);
    throw new Error('Failed to retrieve sales trends');
  }
};

/**
 * Get top revenue-generating services and products
 * @param {Object} params - Query parameters
 * @param {number} params.limit - Number of items to return (default: 10)
 */
const getTopRevenueServices = async (params = {}) => {
  try {
    const response = await mlClient.get('/api/ml/sales/top-services', { params });
    return response.data;
  } catch (error) {
    console.error('Failed to get top revenue services:', error.message);
    throw new Error('Failed to retrieve top revenue services');
  }
};

// ============================================
// Inventory Forecasting Services (Phase 3)
// ============================================

/**
 * Train or retrain the inventory forecasting model
 */
const trainInventoryModel = async () => {
  try {
    const response = await mlClient.post('/api/ml/inventory/train', {});
    return response.data;
  } catch (error) {
    console.error('Inventory model training failed:', error.message);
    throw new Error('Failed to train inventory forecasting model');
  }
};

/**
 * Forecast inventory demand for a specific item
 * @param {Object} params - Forecasting parameters
 * @param {number} params.item_id - Inventory item ID
 * @param {number} params.days - Forecast period in days
 */
const forecastInventory = async (params) => {
  try {
    const response = await mlClient.post('/api/ml/inventory/forecast', params);
    return response.data;
  } catch (error) {
    console.error('Inventory forecast failed:', error.message);
    throw new Error('Failed to forecast inventory demand');
  }
};

/**
 * Get intelligent reorder suggestions for all inventory items
 */
const getReorderSuggestions = async () => {
  try {
    const response = await mlClient.get('/api/ml/inventory/reorder-suggestions');
    return response.data;
  } catch (error) {
    console.error('Failed to get reorder suggestions:', error.message);
    throw new Error('Failed to retrieve reorder suggestions');
  }
};

/**
 * Get fast-moving and slow-moving inventory items
 * @param {Object} params - Query parameters
 * @param {number} params.limit - Number of items per category (default: 10)
 */
const getFastMovingItems = async (params = {}) => {
  try {
    const response = await mlClient.get('/api/ml/inventory/fast-moving', { params });
    return response.data;
  } catch (error) {
    console.error('Failed to get fast-moving items:', error.message);
    throw new Error('Failed to retrieve fast-moving items');
  }
};

/**
 * Get demand analysis by inventory category
 */
const getCategoryDemandAnalysis = async () => {
  try {
    const response = await mlClient.get('/api/ml/inventory/category-analysis');
    return response.data;
  } catch (error) {
    console.error('Failed to get category demand analysis:', error.message);
    throw new Error('Failed to retrieve category demand analysis');
  }
};

/**
 * Predict restock date for a specific item
 * @param {Object} params - Prediction parameters
 * @param {number} params.item_id - Inventory item ID
 */
const predictRestockDate = async (params) => {
  try {
    const response = await mlClient.post('/api/ml/inventory/predict-restock', params);
    return response.data;
  } catch (error) {
    console.error('Failed to predict restock date:', error.message);
    throw new Error('Failed to predict restock date');
  }
};

// ============================================
// Pet Health Prediction Services
// ============================================

const predictPetRisk = async (params) => {
  try {
    const response = await mlClient.post('/api/ml/disease/pet-risk', params);
    return response.data;
  } catch (error) {
    console.error('Pet risk prediction failed:', error.message);
    throw new Error('Failed to predict pet disease risk');
  }
};

const predictCancerRisk = async (params) => {
  try {
    const response = await mlClient.post('/api/ml/disease/cancer-risk', params);
    return response.data;
  } catch (error) {
    console.error('Cancer risk prediction failed:', error.message);
    throw new Error('Failed to predict cancer risk');
  }
};

const assessOutbreakRisk = async (params) => {
  try {
    const response = await mlClient.post('/api/ml/disease/outbreak-risk', params);
    return response.data;
  } catch (error) {
    console.error('Outbreak risk assessment failed:', error.message);
    throw new Error('Failed to assess outbreak risk');
  }
};

const getDiseaseForecast = async (params = {}) => {
  try {
    const response = await mlClient.get('/api/ml/disease/forecast', { params });
    return response.data;
  } catch (error) {
    console.error('Disease forecast failed:', error.message);
    throw new Error('Failed to get disease forecast');
  }
};

const getOutbreakTrend = async (params = {}) => {
  try {
    const response = await mlClient.get('/api/ml/disease/outbreak-trend', { params });
    return response.data;
  } catch (error) {
    console.error('Outbreak trend failed:', error.message);
    throw new Error('Failed to get outbreak trend');
  }
};

const getPandemicRisk = async (params = {}) => {
  try {
    const response = await mlClient.get('/api/ml/disease/pandemic-risk', { params });
    return response.data;
  } catch (error) {
    console.error('Pandemic risk failed:', error.message);
    throw new Error('Failed to assess pandemic risk');
  }
};

// ============================================
// Data Loading Services (for testing)
// ============================================

/**
 * Load sales data
 * @param {Object} params - Query parameters
 */
const loadSalesData = async (params) => {
  try {
    const response = await mlClient.get('/api/ml/data/sales', { params });
    return response.data;
  } catch (error) {
    console.error('Failed to load sales data:', error.message);
    throw new Error('Failed to load sales data');
  }
};

/**
 * Load inventory data
 */
const loadInventoryData = async () => {
  try {
    const response = await mlClient.get('/api/ml/data/inventory');
    return response.data;
  } catch (error) {
    console.error('Failed to load inventory data:', error.message);
    throw new Error('Failed to load inventory data');
  }
};

/**
 * Check if any model needs retraining based on record growth
 */
const getRetrainCheck = async () => {
  try {
    const response = await mlClient.get('/api/ml/retrain-check');
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Retrain check failed:', error.message);
    return { success: false, error: 'Failed to check retraining status' };
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
