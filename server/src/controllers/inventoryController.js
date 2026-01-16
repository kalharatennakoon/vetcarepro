import inventoryModel from '../models/inventoryModel.js';

/**
 * Inventory Controller
 * Handles business logic and request/response for inventory operations
 */

const inventoryController = {
  /**
   * Get all inventory items with optional filters
   * GET /api/inventory
   */
  async getAllItems(req, res) {
    try {
      const { category, search, isActive } = req.query;
      
      const filters = {};
      if (category) filters.category = category;
      if (search) filters.search = search;
      if (isActive !== undefined) filters.isActive = isActive === 'true';

      const items = await inventoryModel.getAll(filters);
      
      res.status(200).json({
        success: true,
        data: items,
        count: items.length
      });
    } catch (error) {
      console.error('Error in inventoryController.getAllItems:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve inventory items',
        error: error.message
      });
    }
  },

  /**
   * Get inventory item by ID
   * GET /api/inventory/:id
   */
  async getItemById(req, res) {
    try {
      const { id } = req.params;
      const item = await inventoryModel.getById(id);

      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
      }

      res.status(200).json({
        success: true,
        data: item
      });
    } catch (error) {
      console.error('Error in inventoryController.getItemById:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve inventory item',
        error: error.message
      });
    }
  },

  /**
   * Create a new inventory item
   * POST /api/inventory
   */
  async createItem(req, res) {
    try {
      const userId = req.user.userId;
      
      // Check if item code already exists
      if (req.body.itemCode) {
        const exists = await inventoryModel.itemCodeExists(req.body.itemCode);
        if (exists) {
          return res.status(400).json({
            success: false,
            message: 'Item code already exists'
          });
        }
      }

      const itemData = {
        ...req.body,
        createdBy: userId
      };

      const newItem = await inventoryModel.create(itemData);

      res.status(201).json({
        success: true,
        message: 'Inventory item created successfully',
        data: newItem
      });
    } catch (error) {
      console.error('Error in inventoryController.createItem:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create inventory item',
        error: error.message
      });
    }
  },

  /**
   * Update an inventory item
   * PUT /api/inventory/:id
   */
  async updateItem(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      // Log the incoming data for debugging
      console.log('Update request body:', req.body);
      console.log('isActive value:', req.body.isActive, 'type:', typeof req.body.isActive);

      // Check if item exists
      const existingItem = await inventoryModel.getById(id);
      if (!existingItem) {
        return res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
      }

      // Check if item code is being changed and if new code already exists
      if (req.body.itemCode && req.body.itemCode !== existingItem.item_code) {
        const exists = await inventoryModel.itemCodeExists(req.body.itemCode, id);
        if (exists) {
          return res.status(400).json({
            success: false,
            message: 'Item code already exists'
          });
        }
      }

      const itemData = {
        ...req.body,
        updatedBy: userId
      };

      const updatedItem = await inventoryModel.update(id, itemData);

      res.status(200).json({
        success: true,
        message: 'Inventory item updated successfully',
        data: updatedItem
      });
    } catch (error) {
      console.error('Error in inventoryController.updateItem:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update inventory item',
        error: error.message
      });
    }
  },

  /**
   * Delete (deactivate) an inventory item
   * DELETE /api/inventory/:id
   */
  async deleteItem(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const existingItem = await inventoryModel.getById(id);
      if (!existingItem) {
        return res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
      }

      const deletedItem = await inventoryModel.delete(id, userId);

      res.status(200).json({
        success: true,
        message: 'Inventory item deleted successfully',
        data: deletedItem
      });
    } catch (error) {
      console.error('Error in inventoryController.deleteItem:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete inventory item',
        error: error.message
      });
    }
  },

  /**
   * Update inventory quantity
   * PATCH /api/inventory/:id/quantity
   */
  async updateQuantity(req, res) {
    try {
      const { id } = req.params;
      const { quantityChange } = req.body;
      const userId = req.user.userId;

      if (!quantityChange || isNaN(quantityChange)) {
        return res.status(400).json({
          success: false,
          message: 'Valid quantity change is required'
        });
      }

      const existingItem = await inventoryModel.getById(id);
      if (!existingItem) {
        return res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
      }

      // Check if new quantity would be negative
      const newQuantity = existingItem.quantity + parseInt(quantityChange);
      if (newQuantity < 0) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient quantity in stock'
        });
      }

      const updatedItem = await inventoryModel.updateQuantity(id, quantityChange, userId);

      res.status(200).json({
        success: true,
        message: 'Inventory quantity updated successfully',
        data: updatedItem
      });
    } catch (error) {
      console.error('Error in inventoryController.updateQuantity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update inventory quantity',
        error: error.message
      });
    }
  },

  /**
   * Get low stock items
   * GET /api/inventory/alerts/low-stock
   */
  async getLowStockItems(req, res) {
    try {
      const items = await inventoryModel.getLowStockItems();

      res.status(200).json({
        success: true,
        data: items,
        count: items.length
      });
    } catch (error) {
      console.error('Error in inventoryController.getLowStockItems:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve low stock items',
        error: error.message
      });
    }
  },

  /**
   * Get expiring items
   * GET /api/inventory/alerts/expiring
   */
  async getExpiringItems(req, res) {
    try {
      const items = await inventoryModel.getExpiringItems();

      res.status(200).json({
        success: true,
        data: items,
        count: items.length
      });
    } catch (error) {
      console.error('Error in inventoryController.getExpiringItems:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve expiring items',
        error: error.message
      });
    }
  }
};

export default inventoryController;
