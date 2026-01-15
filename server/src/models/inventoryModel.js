import pool from '../config/database.js';

/**
 * Inventory Model
 * Handles all database operations for inventory items (medicines, vaccines, accessories, etc.)
 */

const inventoryModel = {
  /**
   * Get all inventory items with optional filters
   * @param {Object} filters - Filter criteria (category, search, isActive)
   * @returns {Promise<Array>} Array of inventory items
   */
  async getAll(filters = {}) {
    try {
      let query = `
        SELECT 
          i.*,
          CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
          CONCAT(u2.first_name, ' ', u2.last_name) as updated_by_name,
          CASE 
            WHEN i.quantity <= i.reorder_level THEN 'LOW'
            WHEN i.expiry_date IS NOT NULL AND i.expiry_date <= CURRENT_DATE + INTERVAL '90 days' THEN 'EXPIRING'
            ELSE 'NORMAL'
          END as stock_status
        FROM inventory i
        LEFT JOIN users u ON i.created_by = u.user_id
        LEFT JOIN users u2 ON i.updated_by = u2.user_id
        WHERE 1=1
      `;
      const params = [];
      let paramIndex = 1;

      // Filter by category
      if (filters.category) {
        query += ` AND i.category = $${paramIndex}`;
        params.push(filters.category);
        paramIndex++;
      }

      // Filter by active status
      if (filters.isActive !== undefined) {
        query += ` AND i.is_active = $${paramIndex}`;
        params.push(filters.isActive);
        paramIndex++;
      }

      // Search filter
      if (filters.search) {
        query += ` AND (
          i.item_name ILIKE $${paramIndex} OR 
          i.item_code ILIKE $${paramIndex} OR
          i.description ILIKE $${paramIndex}
        )`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      query += ` ORDER BY i.item_name ASC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error in inventoryModel.getAll:', error);
      throw error;
    }
  },

  /**
   * Get inventory item by ID
   * @param {number} itemId - Inventory item ID
   * @returns {Promise<Object>} Inventory item details
   */
  async getById(itemId) {
    try {
      const query = `
        SELECT 
          i.*,
          CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
          CONCAT(u2.first_name, ' ', u2.last_name) as updated_by_name,
          CASE 
            WHEN i.quantity <= i.reorder_level THEN 'LOW'
            WHEN i.expiry_date IS NOT NULL AND i.expiry_date <= CURRENT_DATE + INTERVAL '90 days' THEN 'EXPIRING'
            ELSE 'NORMAL'
          END as stock_status
        FROM inventory i
        LEFT JOIN users u ON i.created_by = u.user_id
        LEFT JOIN users u2 ON i.updated_by = u2.user_id
        WHERE i.item_id = $1
      `;
      const result = await pool.query(query, [itemId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in inventoryModel.getById:', error);
      throw error;
    }
  },

  /**
   * Create a new inventory item
   * @param {Object} itemData - Inventory item data
   * @returns {Promise<Object>} Created inventory item
   */
  async create(itemData) {
    try {
      const {
        itemCode,
        itemName,
        category,
        subCategory,
        quantity,
        unit,
        unitCost,
        sellingPrice,
        markupPercentage,
        supplier,
        supplierContact,
        reorderLevel,
        reorderQuantity,
        expiryDate,
        manufacturingDate,
        batchNumber,
        storageLocation,
        requiresPrescription,
        description,
        createdBy
      } = itemData;

      const query = `
        INSERT INTO inventory (
          item_code, item_name, category, sub_category, quantity, unit,
          unit_cost, selling_price, markup_percentage, supplier, supplier_contact,
          reorder_level, reorder_quantity, expiry_date, manufacturing_date,
          batch_number, storage_location, requires_prescription, description,
          last_restock_date, created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, CURRENT_DATE, $20, $20
        ) RETURNING *
      `;

      const values = [
        itemCode,
        itemName,
        category,
        subCategory,
        quantity || 0,
        unit || 'pcs',
        unitCost,
        sellingPrice,
        markupPercentage,
        supplier,
        supplierContact,
        reorderLevel || 10,
        reorderQuantity || 50,
        expiryDate,
        manufacturingDate,
        batchNumber,
        storageLocation,
        requiresPrescription || false,
        description,
        createdBy
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error in inventoryModel.create:', error);
      throw error;
    }
  },

  /**
   * Update an inventory item
   * @param {number} itemId - Inventory item ID
   * @param {Object} itemData - Updated inventory item data
   * @returns {Promise<Object>} Updated inventory item
   */
  async update(itemId, itemData) {
    try {
      const {
        itemCode,
        itemName,
        category,
        subCategory,
        quantity,
        unit,
        unitCost,
        sellingPrice,
        markupPercentage,
        supplier,
        supplierContact,
        reorderLevel,
        reorderQuantity,
        expiryDate,
        manufacturingDate,
        batchNumber,
        storageLocation,
        requiresPrescription,
        description,
        isActive,
        updatedBy
      } = itemData;

      const query = `
        UPDATE inventory
        SET 
          item_code = $1,
          item_name = $2,
          category = $3,
          sub_category = $4,
          quantity = $5,
          unit = $6,
          unit_cost = $7,
          selling_price = $8,
          markup_percentage = $9,
          supplier = $10,
          supplier_contact = $11,
          reorder_level = $12,
          reorder_quantity = $13,
          expiry_date = $14,
          manufacturing_date = $15,
          batch_number = $16,
          storage_location = $17,
          requires_prescription = $18,
          description = $19,
          is_active = $20,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = $21
        WHERE item_id = $22
        RETURNING *
      `;

      const values = [
        itemCode,
        itemName,
        category,
        subCategory,
        quantity,
        unit,
        unitCost,
        sellingPrice,
        markupPercentage,
        supplier,
        supplierContact,
        reorderLevel,
        reorderQuantity,
        expiryDate,
        manufacturingDate,
        batchNumber,
        storageLocation,
        requiresPrescription,
        description,
        isActive,
        updatedBy,
        itemId
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error in inventoryModel.update:', error);
      throw error;
    }
  },

  /**
   * Delete (deactivate) an inventory item
   * @param {number} itemId - Inventory item ID
   * @param {number} updatedBy - User ID performing the deletion
   * @returns {Promise<Object>} Deleted inventory item
   */
  async delete(itemId, updatedBy) {
    try {
      const query = `
        UPDATE inventory
        SET 
          is_active = false,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = $1
        WHERE item_id = $2
        RETURNING *
      `;
      const result = await pool.query(query, [updatedBy, itemId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in inventoryModel.delete:', error);
      throw error;
    }
  },

  /**
   * Update inventory quantity (for restocking or usage)
   * @param {number} itemId - Inventory item ID
   * @param {number} quantityChange - Quantity change (positive for restock, negative for usage)
   * @param {number} updatedBy - User ID performing the update
   * @returns {Promise<Object>} Updated inventory item
   */
  async updateQuantity(itemId, quantityChange, updatedBy) {
    try {
      const query = `
        UPDATE inventory
        SET 
          quantity = quantity + $1,
          last_restock_date = CASE WHEN $1 > 0 THEN CURRENT_DATE ELSE last_restock_date END,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = $2
        WHERE item_id = $3
        RETURNING *
      `;
      const result = await pool.query(query, [quantityChange, updatedBy, itemId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in inventoryModel.updateQuantity:', error);
      throw error;
    }
  },

  /**
   * Get low stock items
   * @returns {Promise<Array>} Array of low stock items
   */
  async getLowStockItems() {
    try {
      const query = `
        SELECT 
          i.*,
          CONCAT(u.first_name, ' ', u.last_name) as created_by_name
        FROM inventory i
        LEFT JOIN users u ON i.created_by = u.user_id
        WHERE i.quantity <= i.reorder_level
          AND i.is_active = true
        ORDER BY i.quantity ASC
      `;
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error in inventoryModel.getLowStockItems:', error);
      throw error;
    }
  },

  /**
   * Get expiring items (within 90 days)
   * @returns {Promise<Array>} Array of expiring items
   */
  async getExpiringItems() {
    try {
      const query = `
        SELECT 
          i.*,
          CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
          (i.expiry_date - CURRENT_DATE) as days_until_expiry
        FROM inventory i
        LEFT JOIN users u ON i.created_by = u.user_id
        WHERE i.expiry_date IS NOT NULL
          AND i.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
          AND i.expiry_date >= CURRENT_DATE
          AND i.is_active = true
        ORDER BY i.expiry_date ASC
      `;
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error in inventoryModel.getExpiringItems:', error);
      throw error;
    }
  },

  /**
   * Check if item code exists
   * @param {string} itemCode - Item code to check
   * @param {number} excludeItemId - Item ID to exclude from check (for updates)
   * @returns {Promise<boolean>} True if exists
   */
  async itemCodeExists(itemCode, excludeItemId = null) {
    try {
      let query = 'SELECT item_id FROM inventory WHERE item_code = $1';
      const params = [itemCode];

      if (excludeItemId) {
        query += ' AND item_id != $2';
        params.push(excludeItemId);
      }

      const result = await pool.query(query, params);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error in inventoryModel.itemCodeExists:', error);
      throw error;
    }
  }
};

export default inventoryModel;
