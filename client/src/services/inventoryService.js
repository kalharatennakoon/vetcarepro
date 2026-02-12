import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

/**
 * Inventory Service
 * Handles all API calls related to inventory management
 */

/**
 * Get authentication headers with token
 * @returns {Object} Headers object with Authorization token
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

const inventoryService = {
  /**
   * Get all inventory items with optional filters
   * @param {Object} filters - Filter options (category, search, isActive)
   * @returns {Promise} API response with inventory items
   */
  async getAll(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);
      if (filters.isActive !== undefined) params.append('isActive', filters.isActive);

      const response = await axios.get(
        `${API_URL}/inventory?${params.toString()}`,
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching inventory items:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get inventory item by ID
   * @param {number} itemId - Inventory item ID
   * @returns {Promise} API response with inventory item details
   */
  async getById(itemId) {
    try {
      const response = await axios.get(
        `${API_URL}/inventory/${itemId}`,
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching inventory item:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Create a new inventory item
   * @param {Object} itemData - Inventory item data
   * @returns {Promise} API response with created item
   */
  async create(itemData) {
    try {
      const response = await axios.post(
        `${API_URL}/inventory`,
        itemData,
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error creating inventory item:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Update an inventory item
   * @param {number} itemId - Inventory item ID
   * @param {Object} itemData - Updated inventory item data
   * @returns {Promise} API response with updated item
   */
  async update(itemId, itemData) {
    try {
      console.log('Sending update request for item:', itemId);
      console.log('Update data:', JSON.stringify(itemData, null, 2));
      const response = await axios.put(
        `${API_URL}/inventory/${itemId}`,
        itemData,
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error updating inventory item:', error);
      console.error('Error response:', error.response?.data);
      if (error.response?.data?.errors) {
        console.error('Validation errors details:', error.response.data.errors);
      }
      throw error.response?.data || error;
    }
  },

  /**
   * Delete (deactivate) an inventory item
   * @param {number} itemId - Inventory item ID
   * @returns {Promise} API response
   */
  async delete(itemId) {
    try {
      const response = await axios.delete(
        `${API_URL}/inventory/${itemId}`,
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Update inventory quantity (restock or usage)
   * @param {number} itemId - Inventory item ID
   * @param {number} quantityChange - Quantity change (positive for restock, negative for usage)
   * @returns {Promise} API response with updated item
   */
  async updateQuantity(itemId, quantityChange) {
    try {
      const response = await axios.patch(
        `${API_URL}/inventory/${itemId}/quantity`,
        { quantityChange },
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error updating inventory quantity:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get low stock items
   * @returns {Promise} API response with low stock items
   */
  async getLowStockItems() {
    try {
      const response = await axios.get(
        `${API_URL}/inventory/alerts/low-stock`,
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching low stock items:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get expiring items (within 90 days)
   * @returns {Promise} API response with expiring items
   */
  async getExpiringItems() {
    try {
      const response = await axios.get(
        `${API_URL}/inventory/alerts/expiring`,
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching expiring items:', error);
      throw error.response?.data || error;
    }
  }
};

export default inventoryService;
