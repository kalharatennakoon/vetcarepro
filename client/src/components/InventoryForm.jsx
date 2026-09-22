import { useState, useEffect, useRef } from 'react';
import inventoryService from '../services/inventoryService';
import '../styles/InventoryDetailModern.css';

const InventoryForm = ({ itemId, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const errorRef = useRef(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);
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
    { value: 'pharmaceuticals',       label: 'Pharmaceuticals' },
    { value: 'consumables',           label: 'Consumables' },
    { value: 'surgical_clinical',     label: 'Surgical & Clinical Supplies' },
    { value: 'laboratory_diagnostic', label: 'Laboratory / Diagnostic Supplies' },
    { value: 'pet_food_nutrition',    label: 'Pet Food & Nutrition' },
    { value: 'retail_otc',            label: 'Retail / OTC Products' },
    { value: 'equipment',             label: 'Equipment' },
    { value: 'accessories',           label: 'Accessories' },
    { value: 'supplements',           label: 'Supplements' },
    { value: 'cleaning_maintenance',  label: 'Cleaning & Maintenance Supplies' },
  ];

  const subCategories = {
    pharmaceuticals:       ['Medicines', 'Vaccines', 'Dewormers & Flea/Tick Treatments', 'Ointments & Injections'],
    consumables:           ['Syringes & Needles', 'Gloves, Cotton & Gauze', 'Bandages & Tapes', 'IV Fluids & Catheters'],
    surgical_clinical:     ['Surgical Instruments/Kits', 'Sutures', 'Antiseptics & Disinfectants', 'E-Collars (Cones)'],
    laboratory_diagnostic: ['Test Kits', 'Slides & Reagents', 'Sample Collection Tubes'],
    pet_food_nutrition:    ['Prescription Diets', 'Therapeutic Foods', 'Nutritional Supplements'],
    retail_otc:            ['Shampoos & Grooming Items', 'Collars & Leashes', 'Toys & Treats'],
    equipment:             ['Thermometers', 'Weighing Scales', 'Microscopes', 'Surgical Machines'],
    accessories:           ['Pet Carriers', 'Bowls & Cages', 'General Accessories'],
    supplements:           ['Vitamins', 'Skin/Coat Supplements', 'Joint Care Products'],
    cleaning_maintenance:  ['Disinfectants', 'Cleaning Liquids', 'Waste Disposal Items'],
  };

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
        [name]: value,
        ...(name === 'category' ? { subCategory: '' } : {}),
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
      // Prepare data with proper types
      const submitData = {
        ...formData,
        // Convert string numbers to actual numbers
        unitCost: formData.unitCost ? parseFloat(formData.unitCost) : null,
        sellingPrice: formData.sellingPrice ? parseFloat(formData.sellingPrice) : null,
        markupPercentage: formData.markupPercentage ? parseFloat(formData.markupPercentage) : null,
        quantity: formData.quantity ? parseInt(formData.quantity) : 0,
        reorderLevel: formData.reorderLevel ? parseInt(formData.reorderLevel) : null,
        reorderQuantity: formData.reorderQuantity ? parseInt(formData.reorderQuantity) : null,
        // Remove empty strings for optional fields
        itemCode: undefined,
        subCategory: formData.subCategory || undefined,
        supplier: formData.supplier,
        supplierContact: formData.supplierContact,
        expiryDate: formData.expiryDate,
        manufacturingDate: formData.manufacturingDate,
        batchNumber: formData.batchNumber || undefined,
        storageLocation: formData.storageLocation || undefined,
        description: formData.description
      };

      if (isEditMode) {
        await inventoryService.update(itemId, submitData);
      } else {
        await inventoryService.create(submitData);
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
      <div className="inv-empty-state">
        <div className="appts-spinner" style={{ margin: '0 auto 1rem auto', borderTopColor: '#f59e0b' }}></div>
        <p style={{ color: '#64748b' }}>Loading inventory item...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {error && (
        <div ref={errorRef} className="inv-alert-card low-stock">
          <div>
            <i className="fas fa-circle-exclamation" style={{ marginRight: '0.5rem' }}></i>
            {error}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Basic Information Card */}
        <div className="inv-glass-card">
          <div className="inv-card-header">
            <h3 className="inv-card-title">
              <i className="fas fa-box" style={{ color: '#f59e0b' }}></i> Basic Information
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Fields marked with <span style={{ color: '#ef4444' }}>*</span> are required</span>
          </div>

          <div className="inv-form-grid-2">
            {itemId && (
              <div>
                <label className="inv-form-label">Item Code</label>
                <input
                  type="text"
                  value={formData.itemCode}
                  className="inv-form-input"
                  style={{ backgroundColor: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }}
                  readOnly
                />
              </div>
            )}

            <div>
              <label className="inv-form-label">
                Item Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                name="itemName"
                value={formData.itemName}
                onChange={handleChange}
                required
                className="inv-form-input"
                placeholder="e.g., Amoxicillin 500mg"
              />
            </div>

            <div>
              <label className="inv-form-label">
                Category <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="inv-form-input"
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="inv-form-label">Sub-Category</label>
              <select
                name="subCategory"
                value={formData.subCategory}
                onChange={handleChange}
                className="inv-form-input"
                disabled={!formData.category}
              >
                <option value="">Select Sub-Category</option>
                {(subCategories[formData.category] || []).map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Inventory & Pricing Card */}
        <div className="inv-glass-card">
          <div className="inv-card-header">
            <h3 className="inv-card-title">
              <i className="fas fa-sack-dollar" style={{ color: '#10b981' }}></i> Inventory & Pricing
            </h3>
          </div>

          <div className="inv-form-grid-2">
            <div>
              <label className="inv-form-label">
                Quantity <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                min="0"
                required
                className="inv-form-input"
              />
            </div>

            <div>
              <label className="inv-form-label">
                Unit <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                required
                className="inv-form-input"
              >
                {units.map(unit => (
                  <option key={unit.value} value={unit.value}>{unit.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="inv-form-label">
                Unit Cost (Rs.) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                name="unitCost"
                value={formData.unitCost}
                onChange={handleChange}
                min="0"
                step="0.01"
                required
                className="inv-form-input"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="inv-form-label">
                Selling Price (Rs.) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                name="sellingPrice"
                value={formData.sellingPrice}
                onChange={handleChange}
                min="0"
                step="0.01"
                required
                className="inv-form-input"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="inv-form-label">Markup % (Auto-calculated)</label>
              <input
                type="number"
                name="markupPercentage"
                value={formData.markupPercentage}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="inv-form-input"
                style={{ backgroundColor: '#f8fafc', color: '#2563eb', fontWeight: 700 }}
                placeholder="Auto-calculated"
                readOnly
              />
            </div>

            <div>
              <label className="inv-form-label">Reorder Level</label>
              <input
                type="number"
                name="reorderLevel"
                value={formData.reorderLevel}
                onChange={handleChange}
                min="0"
                className="inv-form-input"
              />
            </div>

            <div>
              <label className="inv-form-label">Reorder Quantity</label>
              <input
                type="number"
                name="reorderQuantity"
                value={formData.reorderQuantity}
                onChange={handleChange}
                min="1"
                className="inv-form-input"
              />
            </div>
          </div>
        </div>

        {/* Supplier Information Card */}
        <div className="inv-glass-card">
          <div className="inv-card-header">
            <h3 className="inv-card-title">
              <i className="fas fa-truck-field" style={{ color: '#0284c7' }}></i> Supplier Information
            </h3>
          </div>

          <div className="inv-form-grid-2">
            <div>
              <label className="inv-form-label">
                Supplier Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                required
                className="inv-form-input"
                placeholder="e.g., MediSupply Corp"
              />
            </div>

            <div>
              <label className="inv-form-label">
                Supplier Contact <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                name="supplierContact"
                value={formData.supplierContact}
                onChange={handleChange}
                required
                className="inv-form-input"
                placeholder="Phone number or email address..."
              />
            </div>
          </div>
        </div>

        {/* Product Details & Expiry Card */}
        <div className="inv-glass-card">
          <div className="inv-card-header">
            <h3 className="inv-card-title">
              <i className="fas fa-barcode" style={{ color: '#7c3aed' }}></i> Batch & Product Details
            </h3>
          </div>

          <div className="inv-form-grid-2">
            <div>
              <label className="inv-form-label">Batch Number</label>
              <input
                type="text"
                name="batchNumber"
                value={formData.batchNumber}
                onChange={handleChange}
                className="inv-form-input"
                placeholder="e.g., BATCH-2026-001"
              />
            </div>

            <div>
              <label className="inv-form-label">Storage Location</label>
              <input
                type="text"
                name="storageLocation"
                value={formData.storageLocation}
                onChange={handleChange}
                className="inv-form-input"
                placeholder="e.g., Cold Room Shelf A3"
              />
            </div>

            <div>
              <label className="inv-form-label">
                Manufacturing Date <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="date"
                name="manufacturingDate"
                value={formData.manufacturingDate}
                onChange={handleChange}
                required
                className="inv-form-input"
              />
            </div>

            <div>
              <label className="inv-form-label">
                Expiry Date <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
                required
                className="inv-form-input"
              />
            </div>
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            <label className="inv-form-label">
              Description <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              required
              className="inv-form-textarea"
              placeholder="Describe the item — usage, dosage form, key clinical properties..."
            />
          </div>
        </div>

        {/* Settings Card */}
        <div className="inv-glass-card">
          <div className="inv-card-header">
            <h3 className="inv-card-title">
              <i className="fas fa-sliders" style={{ color: '#64748b' }}></i> Settings & Status
            </h3>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
              <input
                type="checkbox"
                name="requiresPrescription"
                checked={formData.requiresPrescription}
                onChange={handleChange}
              />
              Requires Prescription
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
              />
              Active Item
            </label>
          </div>
        </div>

        {/* Form Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ padding: '0.7rem 1.5rem', borderRadius: '12px', background: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', fontWeight: 600, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inv-btn-primary"
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            <i className={`fas ${isEditMode ? 'fa-check' : 'fa-plus'}`}></i>
            {loading ? 'Saving...' : (isEditMode ? 'Update Item' : 'Create Item')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InventoryForm;
