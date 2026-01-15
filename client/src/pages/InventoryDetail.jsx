import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import inventoryService from '../services/inventoryService';
import Layout from '../components/Layout';

const InventoryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
      navigate('/inventory');
    } catch (err) {
      alert(err.message || 'Failed to delete item');
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
    } catch (err) {
      alert(err.message || 'Failed to update quantity');
    }
  };

  const getCategoryLabel = (category) => {
    const categories = {
      'medicine': 'Medicine',
      'vaccine': 'Vaccine',
      'accessory': 'Accessory',
      'surgical_supply': 'Surgical Supply',
      'diagnostic_equipment': 'Diagnostic Equipment',
      'pet_food': 'Pet Food',
      'supplements': 'Supplements'
    };
    return categories[category] || category;
  };

  const getStockStatusBadge = (status) => {
    const badges = {
      'LOW': <span style={styles.badgeDanger}>Low Stock</span>,
      'EXPIRING': <span style={styles.badgeWarning}>Expiring Soon</span>,
      'NORMAL': <span style={styles.badgeSuccess}>Normal</span>
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
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading item details...</p>
        </div>
      </Layout>
    );
  }

  if (error || !item) {
    return (
      <Layout>
        <div style={styles.container}>
          <div style={styles.errorBox}>
            <p style={styles.errorText}>{error || 'Item not found'}</p>
          </div>
          <div style={styles.backLinkContainer}>
            <Link to="/inventory" style={styles.backLink}>
              ← Back to Inventory
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.headerSection}>
          <Link to="/inventory" style={styles.backLink}>
            ← Back to Inventory
          </Link>
          <div style={styles.headerContent}>
            <div>
              <h1 style={styles.title}>{item.item_name}</h1>
              {item.item_code && (
                <p style={styles.subtitle}>Code: {item.item_code}</p>
              )}
            </div>
            <div style={styles.actionButtons}>
              <button
                onClick={() => setShowQuantityModal(true)}
                style={styles.updateButton}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
              >
                Update Quantity
              </button>
              <Link
                to={`/inventory/${id}/edit`}
                style={styles.editButton}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              >
                Edit
              </Link>
              <button
                onClick={handleDelete}
                style={styles.deleteButton}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={styles.gridContainer}>
          {/* Left Column - Main Details */}
          <div style={styles.leftColumn}>
            {/* Basic Information */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Basic Information</h2>
              <dl style={styles.detailGrid}>
                <div>
                  <dt style={styles.detailLabel}>Category</dt>
                  <dd style={styles.detailValue}>{getCategoryLabel(item.category)}</dd>
                </div>
                {item.sub_category && (
                  <div>
                    <dt style={styles.detailLabel}>Sub-Category</dt>
                    <dd style={styles.detailValue}>{item.sub_category}</dd>
                  </div>
                )}
                <div>
                  <dt style={styles.detailLabel}>Stock Status</dt>
                  <dd style={{marginTop: '0.25rem'}}>{getStockStatusBadge(item.stock_status)}</dd>
                </div>
                <div>
                  <dt style={styles.detailLabel}>Status</dt>
                  <dd style={{marginTop: '0.25rem'}}>
                    <span style={item.is_active ? styles.statusActive : styles.statusInactive}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </dd>
                </div>
                {item.requires_prescription && (
                  <div style={{gridColumn: 'span 2'}}>
                    <span style={styles.prescriptionBadge}>
                      Requires Prescription
                    </span>
                  </div>
                )}
              </dl>
            </div>

            {/* Inventory Details */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Inventory Details</h2>
              <dl style={styles.detailGrid}>
                <div>
                  <dt style={styles.detailLabel}>Current Quantity</dt>
                  <dd style={{...styles.detailValue, fontWeight: '600'}}>
                    {item.quantity} {item.unit}
                  </dd>
                </div>
                <div>
                  <dt style={styles.detailLabel}>Unit</dt>
                  <dd style={styles.detailValue}>{item.unit}</dd>
                </div>
                <div>
                  <dt style={styles.detailLabel}>Reorder Level</dt>
                  <dd style={styles.detailValue}>{item.reorder_level}</dd>
                </div>
                <div>
                  <dt style={styles.detailLabel}>Reorder Quantity</dt>
                  <dd style={styles.detailValue}>{item.reorder_quantity}</dd>
                </div>
                {item.storage_location && (
                  <div>
                    <dt style={styles.detailLabel}>Storage Location</dt>
                    <dd style={styles.detailValue}>{item.storage_location}</dd>
                  </div>
                )}
                {item.last_restock_date && (
                  <div>
                    <dt style={styles.detailLabel}>Last Restock</dt>
                    <dd style={styles.detailValue}>{formatDate(item.last_restock_date)}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Pricing Information */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Pricing Information</h2>
              <dl style={styles.pricingGrid}>
                <div>
                  <dt style={styles.detailLabel}>Unit Cost</dt>
                  <dd style={styles.priceValue}>
                    {formatCurrency(item.unit_cost)}
                  </dd>
                </div>
                <div>
                  <dt style={styles.detailLabel}>Selling Price</dt>
                  <dd style={styles.priceValue}>
                    {formatCurrency(item.selling_price)}
                  </dd>
                </div>
                {item.markup_percentage && (
                  <div>
                    <dt style={styles.detailLabel}>Markup</dt>
                    <dd style={styles.markupValue}>
                      {parseFloat(item.markup_percentage).toFixed(2)}%
                    </dd>
                  </div>
                )}
              </dl>
              <div style={styles.totalValueSection}>
                <dt style={styles.detailLabel}>Total Value</dt>
                <dd style={styles.totalValue}>
                  {formatCurrency(item.quantity * item.unit_cost)}
                </dd>
              </div>
            </div>

            {/* Product Details */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Product Details</h2>
              <dl style={styles.detailGrid}>
                {item.batch_number && (
                  <div>
                    <dt style={styles.detailLabel}>Batch Number</dt>
                    <dd style={styles.detailValue}>{item.batch_number}</dd>
                  </div>
                )}
                {item.manufacturing_date && (
                  <div>
                    <dt style={styles.detailLabel}>Manufacturing Date</dt>
                    <dd style={styles.detailValue}>{formatDate(item.manufacturing_date)}</dd>
                  </div>
                )}
                {item.expiry_date && (
                  <div>
                    <dt style={styles.detailLabel}>Expiry Date</dt>
                    <dd style={styles.detailValue}>{formatDate(item.expiry_date)}</dd>
                  </div>
                )}
              </dl>
              {item.description && (
                <div style={styles.descriptionSection}>
                  <dt style={{...styles.detailLabel, marginBottom: '0.5rem'}}>Description</dt>
                  <dd style={styles.detailValue}>{item.description}</dd>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Supplier & Metadata */}
          <div style={styles.rightColumn}>
            {/* Supplier Information */}
            {(item.supplier || item.supplier_contact) && (
              <div style={styles.card}>
                <h2 style={styles.sideCardTitle}>Supplier</h2>
                <dl style={styles.sideDetailList}>
                  {item.supplier && (
                    <div>
                      <dt style={styles.detailLabel}>Name</dt>
                      <dd style={styles.detailValue}>{item.supplier}</dd>
                    </div>
                  )}
                  {item.supplier_contact && (
                    <div>
                      <dt style={styles.detailLabel}>Contact</dt>
                      <dd style={styles.detailValue}>{item.supplier_contact}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Record Information */}
            <div style={styles.card}>
              <h2 style={styles.sideCardTitle}>Record Information</h2>
              <dl style={styles.sideDetailList}>
                {item.created_by_name && (
                  <div>
                    <dt style={styles.detailLabel}>Created By</dt>
                    <dd style={styles.detailValue}>{item.created_by_name}</dd>
                  </div>
                )}
                {item.created_at && (
                  <div>
                    <dt style={styles.detailLabel}>Created At</dt>
                    <dd style={styles.detailValue}>{formatDate(item.created_at)}</dd>
                  </div>
                )}
                {item.updated_by_name && (
                  <div>
                    <dt style={styles.detailLabel}>Last Updated By</dt>
                    <dd style={styles.detailValue}>{item.updated_by_name}</dd>
                  </div>
                )}
                {item.updated_at && (
                  <div>
                    <dt style={styles.detailLabel}>Last Updated</dt>
                    <dd style={styles.detailValue}>{formatDate(item.updated_at)}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>

        {/* Quantity Update Modal */}
        {showQuantityModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <h3 style={styles.modalTitle}>Update Quantity</h3>
              <div style={styles.modalContent}>
                <div>
                  <label style={styles.modalLabel}>
                    Current Quantity: {item.quantity} {item.unit}
                  </label>
                </div>
                
                <div>
                  <label style={styles.modalLabel}>
                    Operation
                  </label>
                  <div style={styles.radioGroup}>
                    <label style={styles.radioLabel}>
                      <input
                        type="radio"
                        value="add"
                        checked={quantityOperation === 'add'}
                        onChange={(e) => setQuantityOperation(e.target.value)}
                        style={styles.radioInput}
                      />
                      Add (Restock)
                    </label>
                    <label style={styles.radioLabel}>
                      <input
                        type="radio"
                        value="subtract"
                        checked={quantityOperation === 'subtract'}
                        onChange={(e) => setQuantityOperation(e.target.value)}
                        style={styles.radioInput}
                      />
                      Subtract (Usage)
                    </label>
                  </div>
                </div>

                <div>
                  <label style={styles.modalLabel}>
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={quantityChange}
                    onChange={(e) => setQuantityChange(e.target.value)}
                    min="1"
                    style={styles.modalInput}
                    placeholder="Enter quantity"
                  />
                </div>

                {quantityChange && (
                  <div style={styles.infoBox}>
                    <p style={styles.infoText}>
                      New quantity will be: {
                        quantityOperation === 'add' 
                          ? item.quantity + parseInt(quantityChange) 
                          : item.quantity - parseInt(quantityChange)
                      } {item.unit}
                    </p>
                  </div>
                )}
              </div>

              <div style={styles.modalActions}>
                <button
                  onClick={() => {
                    setShowQuantityModal(false);
                    setQuantityChange('');
                  }}
                  style={styles.cancelButton}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuantityUpdate}
                  disabled={!quantityChange || parseInt(quantityChange) <= 0}
                  style={{
                    ...styles.confirmButton,
                    ...((!quantityChange || parseInt(quantityChange) <= 0) && styles.disabledButton)
                  }}
                  onMouseEnter={(e) => {
                    if (quantityChange && parseInt(quantityChange) > 0) {
                      e.currentTarget.style.backgroundColor = '#1d4ed8';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (quantityChange && parseInt(quantityChange) > 0) {
                      e.currentTarget.style.backgroundColor = '#2563eb';
                    }
                  }}
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

const styles = {
  container: {
    maxWidth: '80rem',
    margin: '0 auto',
    padding: '2rem 1rem',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #2563eb',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '1rem',
    color: '#6b7280',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderLeft: '4px solid #ef4444',
    padding: '1rem',
    borderRadius: '0.375rem',
  },
  errorText: {
    color: '#991b1b',
  },
  backLinkContainer: {
    marginTop: '1rem',
  },
  backLink: {
    color: '#2563eb',
    textDecoration: 'none',
    display: 'inline-block',
    marginBottom: '1rem',
  },
  headerSection: {
    marginBottom: '1.5rem',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  title: {
    fontSize: '1.875rem',
    fontWeight: 'bold',
    color: '#111827',
    margin: 0,
  },
  subtitle: {
    marginTop: '0.25rem',
    color: '#6b7280',
  },
  actionButtons: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  updateButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block',
  },
  editButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block',
  },
  deleteButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(1, 1fr)',
    gap: '1.5rem',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '0.75rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    padding: '1.5rem',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '1rem',
  },
  sideCardTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '1rem',
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
  },
  pricingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
  },
  sideDetailList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  detailLabel: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#6b7280',
  },
  detailValue: {
    marginTop: '0.25rem',
    fontSize: '0.875rem',
    color: '#111827',
  },
  priceValue: {
    marginTop: '0.25rem',
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#111827',
  },
  markupValue: {
    marginTop: '0.25rem',
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#10b981',
  },
  totalValueSection: {
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e5e7eb',
  },
  totalValue: {
    marginTop: '0.25rem',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#2563eb',
  },
  descriptionSection: {
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e5e7eb',
  },
  badgeDanger: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.875rem',
    fontWeight: '500',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  badgeWarning: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.875rem',
    fontWeight: '500',
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  badgeSuccess: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.875rem',
    fontWeight: '500',
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  statusActive: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.125rem 0.625rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '500',
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  statusInactive: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.125rem 0.625rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '500',
    backgroundColor: '#f3f4f6',
    color: '#374151',
  },
  prescriptionBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.125rem 0.625rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '500',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(75, 85, 99, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '0.5rem',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    padding: '1.5rem',
    maxWidth: '28rem',
    width: '100%',
    margin: '0 1rem',
  },
  modalTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '1rem',
  },
  modalContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  modalLabel: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.5rem',
  },
  radioGroup: {
    display: 'flex',
    gap: '1rem',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.875rem',
  },
  radioInput: {
    marginRight: '0.5rem',
  },
  modalInput: {
    width: '100%',
    padding: '0.5rem 1rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    outline: 'none',
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '0.375rem',
    padding: '0.75rem',
  },
  infoText: {
    fontSize: '0.875rem',
    color: '#1e3a8a',
    margin: 0,
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '1.5rem',
  },
  cancelButton: {
    padding: '0.5rem 1rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    color: '#374151',
    backgroundColor: 'white',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  confirmButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};

// Add media query for responsive grid
if (window.innerWidth >= 1024) {
  styles.gridContainer.gridTemplateColumns = 'repeat(3, 1fr)';
  styles.leftColumn.gridColumn = 'span 2';
}

export default InventoryDetail;
