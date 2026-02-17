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
// Sales Forecasting Services
// ============================================

/**
 * Forecast sales
 * @param {Object} params - Forecasting parameters
 * @param {number} params.period - Forecast period in days
 */
const forecastSales = async (params) => {
  try {
    const response = await mlClient.post('/api/ml/sales/forecast', params);
    return response.data;
  } catch (error) {
    console.error('Sales forecast failed:', error.message);
    throw new Error('Failed to forecast sales');
  }
};

/**
 * Get sales trends
 * @param {Object} params - Query parameters
 */
const getSalesTrends = async (params) => {
  try {
    const response = await mlClient.get('/api/ml/sales/trends', { params });
    return response.data;
  } catch (error) {
    console.error('Failed to get sales trends:', error.message);
    throw new Error('Failed to retrieve sales trends');
  }
};

// ============================================
// Inventory Forecasting Services
// ============================================

/**
 * Forecast inventory demand
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
 * Get intelligent reorder suggestions
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
