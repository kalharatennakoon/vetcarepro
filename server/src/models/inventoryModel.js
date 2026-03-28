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
          NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), '') as created_by_name,
          NULLIF(TRIM(CONCAT(u2.first_name, ' ', u2.last_name)), '') as updated_by_name,
          CASE
            WHEN i.quantity = 0 THEN 'OUT_OF_STOCK'
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
          NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), '') as created_by_name,
          NULLIF(TRIM(CONCAT(u2.first_name, ' ', u2.last_name)), '') as updated_by_name,
          CASE
            WHEN i.quantity = 0 THEN 'OUT_OF_STOCK'
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

  async generateItemCode(category, client) {
    const prefixMap = {
      pharmaceuticals:       'PHARM',
      consumables:           'CONS',
      surgical_clinical:     'SURG',
      laboratory_diagnostic: 'LAB',
      pet_food_nutrition:    'FOOD',
      retail_otc:            'RETAIL',
      equipment:             'EQUIP',
      accessories:           'PETACC',
      supplements:           'VITSUP',
      cleaning_maintenance:  'CLEAN',
    };
    const prefix = prefixMap[category] || 'ITEM';

    // Lock all rows with this prefix to prevent concurrent duplicates
    const existing = await client.query(
      `SELECT item_code FROM inventory WHERE item_code LIKE $1 FOR UPDATE`,
      [`${prefix}-%`]
    );

    let nextNum = 1;
    if (existing.rows.length > 0) {
      const nums = existing.rows
        .map(r => { const m = r.item_code.match(/-(\d+)$/); return m ? parseInt(m[1]) : 0; })
        .filter(n => n > 0);
      if (nums.length > 0) nextNum = Math.max(...nums) + 1;
    }

    return `${prefix}-${String(nextNum).padStart(3, '0')}`;
  },

  /**
   * Create a new inventory item with auto-generated item code
   * @param {Object} itemData - Inventory item data
   * @returns {Promise<Object>} Created inventory item
   */
  async create(itemData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const {
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

      const itemCode = await this.generateItemCode(category, client);

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

      const result = await client.query(query, values);
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in inventoryModel.create:', error);
      throw error;
    } finally {
      client.release();
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
          item_name = $1,
          category = $2,
          sub_category = $3,
          quantity = $4,
          unit = $5,
          unit_cost = $6,
          selling_price = $7,
          markup_percentage = $8,
          supplier = $9,
          supplier_contact = $10,
          reorder_level = $11,
          reorder_quantity = $12,
          expiry_date = $13,
          manufacturing_date = $14,
          batch_number = $15,
          storage_location = $16,
          requires_prescription = $17,
          description = $18,
          is_active = $19,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = $20
        WHERE item_id = $21
        RETURNING *
      `;

      const values = [
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
          deactivated_at = NOW(),
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
          CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
          'LOW' as stock_status
        FROM inventory i
        LEFT JOIN users u ON i.created_by = u.user_id
        WHERE i.quantity > 0
          AND i.quantity <= i.reorder_level
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
   * Get expiring items (within 90 days) — excludes out-of-stock and low-stock items
   * @returns {Promise<Array>} Array of expiring items
   */
  async getExpiringItems() {
    try {
      const query = `
        SELECT
          i.*,
          CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
          (i.expiry_date - CURRENT_DATE) as days_until_expiry,
          'EXPIRING' as stock_status
        FROM inventory i
        LEFT JOIN users u ON i.created_by = u.user_id
        WHERE i.expiry_date IS NOT NULL
          AND i.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
          AND i.expiry_date >= CURRENT_DATE
          AND i.quantity > i.reorder_level
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
