import { useState, useEffect } from 'react';
import inventoryService from '../services/inventoryService';

const InventoryForm = ({ itemId, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    itemCode: '',
    itemName: '',
    category: '',
    subCategory: '',
    quantity: 0,
    unit: 'pcs',
    unitCost: '',
    sellingPrice: '',
    markupPercentage: '',
    supplier: '',
    supplierContact: '',
    reorderLevel: 10,
    reorderQuantity: 50,
    expiryDate: '',
    manufacturingDate: '',
    batchNumber: '',
    storageLocation: '',
    requiresPrescription: false,
    description: '',
    isActive: true
  });

  const isEditMode = !!itemId;

  const categories = [
    { value: 'medicine', label: 'Medicine' },
    { value: 'vaccine', label: 'Vaccine' },
    { value: 'accessory', label: 'Accessory' },
    { value: 'surgical_supply', label: 'Surgical Supply' },
    { value: 'diagnostic_equipment', label: 'Diagnostic Equipment' },
    { value: 'pet_food', label: 'Pet Food' },
    { value: 'supplements', label: 'Supplements' }
  ];

  const units = [
    { value: 'pcs', label: 'Pieces' },
    { value: 'box', label: 'Box' },
    { value: 'bottle', label: 'Bottle' },
    { value: 'pack', label: 'Pack' },
    { value: 'vial', label: 'Vial' },
    { value: 'kg', label: 'Kilogram' },
    { value: 'g', label: 'Gram' },
    { value: 'ml', label: 'Milliliter' },
    { value: 'l', label: 'Liter' }
  ];

  useEffect(() => {
    if (itemId) {
      loadItem();
    }
  }, [itemId]);

  const loadItem = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await inventoryService.getById(itemId);
      const item = response.data;
      
      setFormData({
        itemCode: item.item_code || '',
        itemName: item.item_name || '',
        category: item.category || '',
        subCategory: item.sub_category || '',
        quantity: item.quantity || 0,
        unit: item.unit || 'pcs',
        unitCost: item.unit_cost || '',
        sellingPrice: item.selling_price || '',
        markupPercentage: item.markup_percentage || '',
        supplier: item.supplier || '',
        supplierContact: item.supplier_contact || '',
        reorderLevel: item.reorder_level || 10,
        reorderQuantity: item.reorder_quantity || 50,
        expiryDate: item.expiry_date ? new Date(item.expiry_date).toISOString().split('T')[0] : '',
        manufacturingDate: item.manufacturing_date ? new Date(item.manufacturing_date).toISOString().split('T')[0] : '',
        batchNumber: item.batch_number || '',
        storageLocation: item.storage_location || '',
        requiresPrescription: item.requires_prescription || false,
        description: item.description || '',
        isActive: item.is_active !== undefined ? item.is_active : true
      });
    } catch (err) {
      setError(err.message || 'Failed to load inventory item');
      console.error('Error loading item:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      
      // Auto-calculate markup percentage when unit cost or selling price changes
      if (name === 'unitCost' || name === 'sellingPrice') {
        const cost = name === 'unitCost' ? parseFloat(value) : parseFloat(formData.unitCost);
        const price = name === 'sellingPrice' ? parseFloat(value) : parseFloat(formData.sellingPrice);
        
        if (cost > 0 && price > 0) {
          const markup = ((price - cost) / cost * 100).toFixed(2);
          setFormData(prev => ({
            ...prev,
            [name]: value,
            markupPercentage: markup
          }));
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isEditMode) {
        await inventoryService.update(itemId, formData);
      } else {
        await inventoryService.create(formData);
      }
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err.message || `Failed to ${isEditMode ? 'update' : 'create'} inventory item`);
      console.error('Error submitting form:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading inventory item...</p>
      </div>
    );
  }

  return (
    <div style={styles.formContainer}>
      <h2 style={styles.formTitle}>
        {isEditMode ? 'Edit Inventory Item' : 'Add New Inventory Item'}
      </h2>

      {error && (
        <div style={styles.errorBox}>
          <p style={styles.errorTitle}>Error</p>
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Basic Information */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Basic Information</h3>
          <div style={styles.grid2}>
            <div>
              <label style={styles.label}>
                Item Code
              </label>
              <input
                type="text"
                name="itemCode"
                value={formData.itemCode}
                onChange={handleChange}
                style={styles.input}
                placeholder="e.g., MED-001"
              />
            </div>

            <div>
              <label style={styles.label}>
                Item Name <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="itemName"
                value={formData.itemName}
                onChange={handleChange}
                required
                style={styles.input}
                placeholder="e.g., Amoxicillin 500mg"
              />
            </div>

            <div>
              <label style={styles.label}>
                Category <span style={styles.required}>*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                style={styles.select}
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={styles.label}>
                Sub-Category
              </label>
              <input
                type="text"
                name="subCategory"
                value={formData.subCategory}
                onChange={handleChange}
                style={styles.input}
                placeholder="e.g., Antibiotic"
              />
            </div>
          </div>
        </div>

        {/* Inventory & Pricing */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Inventory & Pricing</h3>
          <div style={styles.grid3}>
            <div>
              <label style={styles.label}>
                Quantity <span style={styles.required}>*</span>
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                min="0"
                required
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>
                Unit <span style={styles.required}>*</span>
              </label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                required
                style={styles.select}
              >
                {units.map(unit => (
                  <option key={unit.value} value={unit.value}>{unit.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={styles.label}>
                Unit Cost (Rs.) <span style={styles.required}>*</span>
              </label>
              <input
                type="number"
                name="unitCost"
                value={formData.unitCost}
                onChange={handleChange}
                min="0"
                step="0.01"
                required
                style={styles.input}
                placeholder="0.00"
              />
            </div>

            <div>
              <label style={styles.label}>
                Selling Price (Rs.) <span style={styles.required}>*</span>
              </label>
              <input
                type="number"
                name="sellingPrice"
                value={formData.sellingPrice}
                onChange={handleChange}
                min="0"
                step="0.01"
                required
                style={styles.input}
                placeholder="0.00"
              />
            </div>

            <div>
              <label style={styles.label}>
                Markup %
              </label>
              <input
                type="number"
                name="markupPercentage"
                value={formData.markupPercentage}
                onChange={handleChange}
                min="0"
                step="0.01"
                style={styles.inputReadonly}
                placeholder="Auto-calculated"
                readOnly
              />
            </div>

            <div>
              <label style={styles.label}>
                Reorder Level
              </label>
              <input
                type="number"
                name="reorderLevel"
                value={formData.reorderLevel}
                onChange={handleChange}
                min="0"
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>
                Reorder Quantity
              </label>
              <input
                type="number"
                name="reorderQuantity"
                value={formData.reorderQuantity}
                onChange={handleChange}
                min="1"
                style={styles.input}
              />
            </div>
          </div>
        </div>

        {/* Supplier Information */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Supplier Information</h3>
          <div style={styles.grid2}>
            <div>
              <label style={styles.label}>
                Supplier Name
              </label>
              <input
                type="text"
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                style={styles.input}
                placeholder="e.g., MediSupply Corp"
              />
            </div>

            <div>
              <label style={styles.label}>
                Supplier Contact
              </label>
              <input
                type="text"
                name="supplierContact"
                value={formData.supplierContact}
                onChange={handleChange}
                style={styles.input}
                placeholder="Phone or email"
              />
            </div>
          </div>
        </div>

        {/* Product Details */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Product Details</h3>
          <div style={styles.grid2}>
            <div>
              <label style={styles.label}>
                Batch Number
              </label>
              <input
                type="text"
                name="batchNumber"
                value={formData.batchNumber}
                onChange={handleChange}
                style={styles.input}
                placeholder="e.g., BATCH-2024-001"
              />
            </div>

            <div>
              <label style={styles.label}>
                Storage Location
              </label>
              <input
                type="text"
                name="storageLocation"
                value={formData.storageLocation}
                onChange={handleChange}
                style={styles.input}
                placeholder="e.g., Shelf A3"
              />
            </div>

            <div>
              <label style={styles.label}>
                Manufacturing Date
              </label>
              <input
                type="date"
                name="manufacturingDate"
                value={formData.manufacturingDate}
                onChange={handleChange}
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>
                Expiry Date
              </label>
              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.descriptionContainer}>
            <label style={styles.label}>
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              style={styles.textarea}
              placeholder="Additional notes about the item..."
            />
          </div>
        </div>

        {/* Settings */}
        <div>
          <h3 style={styles.sectionTitle}>Settings</h3>
          <div style={styles.checkboxGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="requiresPrescription"
                checked={formData.requiresPrescription}
                onChange={handleChange}
                style={styles.checkbox}
              />
              <span style={styles.checkboxText}>
                Requires Prescription
              </span>
            </label>

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                style={styles.checkbox}
              />
              <span style={styles.checkboxText}>
                Active
              </span>
            </label>
          </div>
        </div>

        {/* Form Actions */}
        <div style={styles.formActions}>
          <button
            type="button"
            onClick={onCancel}
            style={styles.cancelButton}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitButton,
              ...(loading && styles.disabledButton)
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = '#1d4ed8';
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = '#2563eb';
            }}
          >
            {loading ? 'Saving...' : (isEditMode ? 'Update Item' : 'Create Item')}
          </button>
        </div>
      </form>
    </div>
  );
};

const styles = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #2563eb',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '0.5rem',
    color: '#6b7280',
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '0.75rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    padding: '1.5rem',
  },
  formTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '1.5rem',
  },
  errorBox: {
    marginBottom: '1rem',
    padding: '1rem',
    backgroundColor: '#fef2f2',
    borderLeft: '4px solid #ef4444',
    color: '#991b1b',
  },
  errorTitle: {
    fontWeight: '500',
    marginBottom: '0.25rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  section: {
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '1.5rem',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '1rem',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.5rem',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    width: '100%',
    padding: '0.5rem 1rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    outline: 'none',
  },
  select: {
    width: '100%',
    padding: '0.5rem 1rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    outline: 'none',
    backgroundColor: 'white',
  },
  inputReadonly: {
    width: '100%',
    padding: '0.5rem 1rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    outline: 'none',
    backgroundColor: '#f9fafb',
  },
  descriptionContainer: {
    marginTop: '1rem',
  },
  textarea: {
    width: '100%',
    padding: '0.5rem 1rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    outline: 'none',
    resize: 'vertical',
  },
  checkboxGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    cursor: 'pointer',
  },
  checkbox: {
    width: '1rem',
    height: '1rem',
    cursor: 'pointer',
  },
  checkboxText: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid #e5e7eb',
  },
  cancelButton: {
    padding: '0.5rem 1.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    color: '#374151',
    backgroundColor: 'white',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '0.5rem 1.5rem',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};

export default InventoryForm;
