import express from 'express';
import inventoryController from '../controllers/inventoryController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize, adminOnly } from '../middleware/roleCheck.js';
import { validateInventoryItem, validateQuantityUpdate } from '../middleware/validation.js';

const router = express.Router();

/**
 * Inventory Routes
 * All routes require authentication
 * Some routes require specific roles (admin, veterinarian)
 */

// Get alerts (low stock and expiring items) - all authenticated users can view
router.get('/alerts/low-stock', authenticate, inventoryController.getLowStockItems);
router.get('/alerts/expiring', authenticate, inventoryController.getExpiringItems);

// Get all inventory items with filters - all authenticated users can view
router.get('/', authenticate, inventoryController.getAllItems);

// Get specific inventory item - all authenticated users can view
router.get('/:id', authenticate, inventoryController.getItemById);

// Create new inventory item - admin only
router.post(
  '/',
  authenticate,
  adminOnly,
  validateInventoryItem,
  inventoryController.createItem
);

// Update inventory item details - admin only
router.put(
  '/:id',
  authenticate,
  adminOnly,
  validateInventoryItem,
  inventoryController.updateItem
);

// Update inventory quantity (restock or usage) - admin, veterinarian, receptionist
router.patch(
  '/:id/quantity',
  authenticate,
  authorize('admin', 'veterinarian', 'receptionist'),
  validateQuantityUpdate,
  inventoryController.updateQuantity
);

// Delete (deactivate) inventory item - only admin
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  inventoryController.deleteItem
);

export default router;
