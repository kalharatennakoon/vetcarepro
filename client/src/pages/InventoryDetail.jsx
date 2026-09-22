import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import inventoryService from '../services/inventoryService';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import '../styles/InventoryDetailModern.css';

const InventoryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const canManageInventory = isAdmin;
  const { showSuccess, showError } = useNotification();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const errorRef = useRef(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [quantityChange, setQuantityChange] = useState('');
  const [quantityOperation, setQuantityOperation] = useState('add'); // 'add' or 'subtract'

  useEffect(() => {
    loadItem();
  }, [id]);

  const loadItem = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await inventoryService.getById(id);
      setItem(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load inventory item');
      console.error('Error loading item:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to deactivate this item?')) {
      return;
    }

    try {
      await inventoryService.delete(id);
      showSuccess('Item deactivated successfully');
      navigate('/inventory');
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Failed to deactivate item');
    }
  };

  const handleQuantityUpdate = async () => {
    try {
      const change = quantityOperation === 'add'
        ? parseInt(quantityChange)
        : -parseInt(quantityChange);

      await inventoryService.updateQuantity(id, change);
      setShowQuantityModal(false);
      setQuantityChange('');
      loadItem();
      showSuccess('Quantity updated successfully');
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Failed to update quantity');
    }
  };

  const getCategoryLabel = (category) => {
    const categories = {
      pharmaceuticals:       'Pharmaceuticals',
      consumables:           'Consumables',
      surgical_clinical:     'Surgical & Clinical Supplies',
      laboratory_diagnostic: 'Laboratory / Diagnostic Supplies',
      pet_food_nutrition:    'Pet Food & Nutrition',
      retail_otc:            'Retail / OTC Products',
      equipment:             'Equipment',
      accessories:           'Accessories',
      supplements:           'Supplements',
      cleaning_maintenance:  'Cleaning & Maintenance Supplies',
    };
    return categories[category] || category;
  };

  const getStockStatusBadge = (status) => {
    const badges = {
      'OUT_OF_STOCK': <span className="inv-badge out-of-stock"><i className="fas fa-ban"></i> Out of Stock</span>,
      'LOW': <span className="inv-badge low"><i className="fas fa-triangle-exclamation"></i> Low Stock</span>,
      'EXPIRING': <span className="inv-badge expiring"><i className="fas fa-clock"></i> Expiring Soon</span>,
      'NORMAL': <span className="inv-badge normal"><i className="fas fa-check"></i> Normal</span>,
    };
    return badges[status] || null;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return `Rs. ${parseFloat(amount).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="inv-detail-container">
          <div className="inv-empty-state">
            <div className="appts-spinner" style={{ margin: '0 auto 1rem auto', borderTopColor: '#f59e0b' }}></div>
            <p style={{ color: '#64748b' }}>Loading item details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !item) {
    return (
      <Layout>
        <div className="inv-detail-container">
          <div ref={errorRef} className="inv-alert-card low-stock" style={{ marginBottom: '1.5rem' }}>
            <div>
              <i className="fas fa-circle-exclamation" style={{ marginRight: '0.5rem' }}></i>
              {error || 'Item not found'}
            </div>
          </div>
          <Link to="/inventory" className="inv-back-btn">
            ← Back to Inventory
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="inv-detail-container">
        {/* Navigation & Action Header Bar */}
        <div className="inv-detail-topbar">
          <Link to="/inventory" className="inv-back-btn">
            <i className="fas fa-arrow-left"></i> Back to Inventory
          </Link>
          <div className="inv-action-buttons">
            <button
              onClick={() => { setShowQuantityModal(true); if (!isAdmin) setQuantityOperation('subtract'); }}
              className="inv-btn-update-qty"
            >
              <i className="fas fa-arrow-up-right-dots"></i> Update Quantity
            </button>
            {isAdmin && (
              <Link
                to={`/inventory/${id}/edit`}
                className="inv-btn-edit"
              >
                <i className="fas fa-pen-to-square"></i> Edit
              </Link>
            )}
            {isAdmin && (
              <button
                onClick={handleDelete}
                className="inv-btn-danger"
              >
                <i className="fas fa-trash-can"></i> Delete
              </button>
            )}
          </div>
        </div>

        {/* Detail Hero Header */}
        <div className="inv-detail-hero">
          <div className="inv-detail-hero-left">
            <div className="inv-detail-avatar">
              <i className="fas fa-box"></i>
            </div>
            <div>
              <h1 className="inv-detail-title">{item.item_name}</h1>
              <div className="inv-detail-tags">
                {item.item_code && <span className="inv-code-pill">#{item.item_code}</span>}
                <span className="inv-code-pill" style={{ background: '#eff6ff', color: '#2563eb' }}>{getCategoryLabel(item.category)}</span>
                {item.sub_category && <span className="inv-code-pill">{item.sub_category}</span>}
                {getStockStatusBadge(item.stock_status)}
                {item.requires_prescription && (
                  <span className="inv-prescription-tag">
                    <i className="fas fa-file-prescription"></i> Requires Prescription
                  </span>
                )}
              </div>
            </div>
          </div>
          <div>
            <span className={`inv-badge ${item.is_active ? 'normal' : 'low'}`} style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}>
              {item.is_active ? 'Active Item' : 'Inactive Item'}
            </span>
          </div>
        </div>

        {/* 2-Column Grid Layout */}
        <div className="inv-detail-grid">
          {/* Left Main Column */}
          <div className="inv-detail-column">
            {/* Inventory Stock & Levels Card */}
            <div className="inv-glass-card">
              <div className="inv-card-header">
                <h3 className="inv-card-title">
                  <i className="fas fa-warehouse"></i> Stock & Inventory Details
                </h3>
              </div>
              <div className="inv-info-grid">
                <div className="inv-info-item">
                  <div className="inv-info-label">Current Quantity</div>
                  <div className="inv-info-value" style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: 800 }}>
                    {item.quantity} <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{item.unit}</span>
                  </div>
                </div>
                <div className="inv-info-item">
                  <div className="inv-info-label">Unit Type</div>
                  <div className="inv-info-value">{item.unit}</div>
                </div>
                <div className="inv-info-item">
                  <div className="inv-info-label">Reorder Level</div>
                  <div className="inv-info-value">{item.reorder_level}</div>
                </div>
                <div className="inv-info-item">
                  <div className="inv-info-label">Reorder Quantity</div>
                  <div className="inv-info-value">{item.reorder_quantity}</div>
                </div>
                {item.storage_location && (
                  <div className="inv-info-item">
                    <div className="inv-info-label">Storage Location</div>
                    <div className="inv-info-value">{item.storage_location}</div>
                  </div>
                )}
                {item.last_restock_date && (
                  <div className="inv-info-item">
                    <div className="inv-info-label">Last Restock</div>
                    <div className="inv-info-value">{formatDate(item.last_restock_date)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Pricing & Valuation Card */}
            <div className="inv-glass-card">
              <div className="inv-card-header">
                <h3 className="inv-card-title">
                  <i className="fas fa-receipt" style={{ color: '#10b981' }}></i> Pricing & Valuation
                </h3>
              </div>
              <div className="inv-info-grid">
                {isAdmin && (
                  <div className="inv-info-item">
                    <div className="inv-info-label">Unit Cost</div>
                    <div className="inv-info-value" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                      {formatCurrency(item.unit_cost)}
                    </div>
                  </div>
                )}
                <div className="inv-info-item">
                  <div className="inv-info-label">Selling Price</div>
                  <div className="inv-info-value" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#059669' }}>
                    {formatCurrency(item.selling_price)}
                  </div>
                </div>
                {isAdmin && item.unit_cost && item.selling_price && (
                  <div className="inv-info-item">
                    <div className="inv-info-label">Markup Margin</div>
                    <div className="inv-info-value" style={{ color: '#2563eb', fontWeight: 700 }}>
                      {(((parseFloat(item.selling_price) - parseFloat(item.unit_cost)) / parseFloat(item.unit_cost)) * 100).toFixed(2)}%
                    </div>
                  </div>
                )}
              </div>
              {canManageInventory && item.unit_cost && (
                <div className="inv-highlight-tile" style={{ marginTop: '1.25rem' }}>
                  <div className="inv-info-label">Total Inventory Holding Value</div>
                  <div className="inv-highlight-val">
                    {formatCurrency(item.quantity * item.unit_cost)}
                  </div>
                </div>
              )}
            </div>

            {/* Product Batch & Expiry Card */}
            <div className="inv-glass-card">
              <div className="inv-card-header">
                <h3 className="inv-card-title">
                  <i className="fas fa-barcode" style={{ color: '#7c3aed' }}></i> Batch & Product Details
                </h3>
              </div>
              <div className="inv-info-grid">
                {item.batch_number && (
                  <div className="inv-info-item">
                    <div className="inv-info-label">Batch Number</div>
                    <div className="inv-info-value" style={{ fontFamily: 'monospace' }}>{item.batch_number}</div>
                  </div>
                )}
                {item.manufacturing_date && (
                  <div className="inv-info-item">
                    <div className="inv-info-label">Manufacturing Date</div>
                    <div className="inv-info-value">{formatDate(item.manufacturing_date)}</div>
                  </div>
                )}
                {item.expiry_date && (
                  <div className="inv-info-item">
                    <div className="inv-info-label">Expiry Date</div>
                    <div className="inv-info-value" style={{ color: '#d97706', fontWeight: 700 }}>{formatDate(item.expiry_date)}</div>
                  </div>
                )}
              </div>
              {item.description && (
                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                  <div className="inv-info-label" style={{ marginBottom: '0.4rem' }}>Product Description</div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#475569', lineHeight: '1.6' }}>{item.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Supplier & Audit Logs (Admin) */}
          <div className="inv-detail-column">
            {isAdmin && (item.supplier || item.supplier_contact) && (
              <div className="inv-glass-card">
                <div className="inv-card-header">
                  <h3 className="inv-card-title">
                    <i className="fas fa-truck-field" style={{ color: '#0284c7' }}></i> Supplier Information
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {item.supplier && (
                    <div className="inv-info-item">
                      <div className="inv-info-label">Supplier Name</div>
                      <div className="inv-info-value">{item.supplier}</div>
                    </div>
                  )}
                  {item.supplier_contact && (
                    <div className="inv-info-item">
                      <div className="inv-info-label">Contact Details</div>
                      <div className="inv-info-value">{item.supplier_contact}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {isAdmin && (
              <div className="inv-glass-card">
                <div className="inv-card-header">
                  <h3 className="inv-card-title">
                    <i className="fas fa-clock-rotate-left" style={{ color: '#64748b' }}></i> Audit Metadata
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {item.created_by_name && (
                    <div className="inv-info-item">
                      <div className="inv-info-label">Created By</div>
                      <div className="inv-info-value">{item.created_by_name}</div>
                    </div>
                  )}
                  {item.created_at && (
                    <div className="inv-info-item">
                      <div className="inv-info-label">Created At</div>
                      <div className="inv-info-value">{formatDate(item.created_at)}</div>
                    </div>
                  )}
                  {item.updated_by_name && (
                    <div className="inv-info-item">
                      <div className="inv-info-label">Last Updated By</div>
                      <div className="inv-info-value">{item.updated_by_name}</div>
                    </div>
                  )}
                  {item.updated_at && (
                    <div className="inv-info-item">
                      <div className="inv-info-label">Last Updated</div>
                      <div className="inv-info-value">{formatDate(item.updated_at)}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quantity Update Modal */}
        {showQuantityModal && (
          <div className="inv-modal-overlay">
            <div className="inv-modal-card">
              <div className="inv-modal-header">
                <h3 className="inv-modal-title">Update Stock Quantity</h3>
                <button
                  onClick={() => { setShowQuantityModal(false); setQuantityChange(''); }}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.1rem' }}
                >
                  <i className="fas fa-xmark"></i>
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="inv-highlight-tile" style={{ padding: '0.85rem 1rem' }}>
                  <div className="inv-info-label">Current Stock Level</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    {item.quantity} {item.unit}
                  </div>
                </div>

                <div>
                  <label className="inv-form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Stock Operation</label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    {isAdmin && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          value="add"
                          checked={quantityOperation === 'add'}
                          onChange={(e) => setQuantityOperation(e.target.value)}
                        />
                        Add (Restock)
                      </label>
                    )}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        value="subtract"
                        checked={quantityOperation === 'subtract'}
                        onChange={(e) => setQuantityOperation(e.target.value)}
                      />
                      Subtract (Usage)
                    </label>
                  </div>
                </div>

                <div>
                  <label className="inv-form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Quantity to Adjust</label>
                  <input
                    type="number"
                    value={quantityChange}
                    onChange={(e) => setQuantityChange(e.target.value)}
                    min="1"
                    className="inv-form-input"
                    placeholder="Enter quantity amount..."
                  />
                </div>

                {quantityChange && parseInt(quantityChange) > 0 && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.85rem', color: '#15803d', fontWeight: 700 }}>
                    Updated stock will be: {
                      quantityOperation === 'add'
                        ? item.quantity + parseInt(quantityChange)
                        : item.quantity - parseInt(quantityChange)
                    } {item.unit}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    onClick={() => { setShowQuantityModal(false); setQuantityChange(''); }}
                    style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleQuantityUpdate}
                    disabled={!quantityChange || parseInt(quantityChange) <= 0}
                    className="inv-btn-primary"
                    style={{ opacity: (!quantityChange || parseInt(quantityChange) <= 0) ? 0.5 : 1 }}
                  >
                    Update Quantity
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default InventoryDetail;
