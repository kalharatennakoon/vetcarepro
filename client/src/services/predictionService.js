import axios from 'axios';

const ML_API_URL = import.meta.env.VITE_ML_API_URL || 'http://localhost:5001/api/ml';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

/**
 * Get sales forecast
 * @param {number} period - Number of days to forecast
 */
export const getSalesForecast = async (period = 30) => {
  const response = await axios.get(
    `${ML_API_URL}/sales/forecast`,
    { params: { periods: period } }
  );
  return response.data;
};

/**
 * Get sales trends analysis
 */
export const getSalesTrends = async () => {
  const response = await axios.get(
    `${ML_API_URL}/sales/trends`
  );
  return response.data;
};

/**
 * Get inventory demand forecast
 * @param {number} days - Number of days to forecast
 * @param {number} itemId - Optional specific item ID
 */
export const getInventoryForecast = async (days = 30, itemId = null) => {
  const response = await axios.post(
    `${ML_API_URL}/inventory/forecast`,
    { days, item_id: itemId }
  );
  return response.data;
};

/**
 * Get intelligent reorder suggestions
 */
export const getReorderSuggestions = async () => {
  const response = await axios.get(
    `${ML_API_URL}/inventory/reorder-suggestions`
  );
  return response.data;
};

/**
 * Train the sales forecasting model (Admin only)
 */
export const trainSalesModel = async () => {
  const response = await axios.post(`${API_URL}/ml/sales/train`, {}, getAuthHeaders());
  return response.data;
};

/**
 * Train the inventory forecasting model (Admin only)
 */
export const trainInventoryModel = async () => {
  const response = await axios.post(`${API_URL}/ml/inventory/train`, {}, getAuthHeaders());
  return response.data;
};
