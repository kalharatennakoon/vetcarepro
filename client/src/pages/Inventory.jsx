import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import inventoryService from '../services/inventoryService';
import Layout from '../components/Layout';

const Inventory = () => {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    search: '',
    isActive: true
  });
  const [lowStockCount, setLowStockCount] = useState(0);
  const [expiringCount, setExpiringCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'medicine', label: 'Medicine' },
    { value: 'vaccine', label: 'Vaccine' },
    { value: 'accessory', label: 'Accessory' },
    { value: 'surgical_supply', label: 'Surgical Supply' },
    { value: 'diagnostic_equipment', label: 'Diagnostic Equipment' },
    { value: 'pet_food', label: 'Pet Food' },
    { value: 'supplements', label: 'Supplements' }
  ];

  useEffect(() => {
    loadInventory();
    loadAlerts();
  }, [filters]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await inventoryService.getAll(filters);
      setInventory(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load inventory');
      console.error('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const [lowStockRes, expiringRes] = await Promise.all([
        inventoryService.getLowStockItems(),
        inventoryService.getExpiringItems()
      ]);
      setLowStockCount(lowStockRes.count || 0);
      setExpiringCount(expiringRes.count || 0);
    } catch (err) {
      console.error('Error loading alerts:', err);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDelete = async (itemId) => {
    if (!confirm('Are you sure you want to deactivate this item?')) {
      return;
    }

    try {
      await inventoryService.delete(itemId);
      loadInventory();
    } catch (err) {
      alert(err.message || 'Failed to delete item');
    }
  };

  const getCategoryLabel = (category) => {
    const cat = categories.find(c => c.value === category);
    return cat ? cat.label : category;
  };

  const getStockStatusBadge = (item) => {
    if (item.stock_status === 'LOW') {
      return <span style={styles.badgeDanger}>Low Stock</span>;
    }
    if (item.stock_status === 'EXPIRING') {
      return <span style={styles.badgeWarning}>Expiring Soon</span>;
    }
    return <span style={styles.badgeSuccess}>Normal</span>;
  };

  const formatCurrency = (amount) => {
    return `Rs. ${parseFloat(amount).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getPageNumbers = () => {
    const totalPages = Math.ceil(inventory.length / itemsPerPage);
    const pages = [];
    const maxPagesToShow = 7;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 4) pages.push('...');
      for (let i = Math.max(2, currentPage - 2); i <= Math.min(totalPages - 1, currentPage + 2); i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (currentPage < totalPages - 3) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const handlePageChange = (page) => {
    if (typeof page === 'number') {
      setCurrentPage(page);
    }
  };

  const getPaginatedInventory = () => {
    const totalPages = Math.ceil(inventory.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return inventory.slice(startIndex, endIndex);
  };

  return (
    <Layout>
      {/* Page Header */}
      <div style={styles.pageHeader}>
        <div>
          <h2 style={styles.title}>Inventory Management</h2>
          <p style={styles.subtitle}>Manage medicines, vaccines, accessories, and supplies</p>
        </div>
        <button 
          onClick={() => navigate('/inventory/create')} 
          style={styles.addButton}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
        >
          + Add New Item
        </button>
      </div>

      {/* Summary at Top */}
      {!loading && inventory.length > 0 && (
        <div style={styles.summaryContainer}>
          <h3 style={styles.summaryTitle}>Inventory Summary</h3>
          <div style={styles.summaryGrid}>
            <div style={styles.summaryCardBlue}>
              <p style={styles.summaryLabel}>Total Items</p>
              <p style={styles.summaryValue}>{inventory.length}</p>
            </div>
            <div style={styles.summaryCardGreen}>
              <p style={styles.summaryLabel}>Total Value</p>
              <p style={styles.summaryValue}>
                {formatCurrency(inventory.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0))}
              </p>
            </div>
            <div style={styles.summaryCardPurple}>
              <p style={styles.summaryLabel}>Active Items</p>
              <p style={styles.summaryValue}>
                {inventory.filter(item => item.is_active && item.quantity > 0).length}
              </p>
            </div>
            <div style={styles.summaryCardYellow}>
              <p style={styles.summaryLabel}>Out of Stock</p>
              <p style={styles.summaryValue}>
                {inventory.filter(item => item.quantity === 0).length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Alert Summary */}
      {(lowStockCount > 0 || expiringCount > 0) && (
        <div style={styles.alertContainer}>
          {lowStockCount > 0 && (
            <div style={styles.alertDanger}>
              <strong>{lowStockCount}</strong> item(s) are running low on stock
            </div>
          )}
          {expiringCount > 0 && (
            <div style={styles.alertWarning}>
              <strong>{expiringCount}</strong> item(s) expiring within 90 days
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={styles.errorBox}>
          {error}
        </div>
      )}

      {/* Filters */}
      <div style={styles.filterContainer}>
        <input
          type="text"
          name="search"
          value={filters.search}
          onChange={handleFilterChange}
          placeholder="Search by name or code..."
          style={styles.searchInput}
        />
        <select
          name="category"
          value={filters.category}
          onChange={handleFilterChange}
          style={styles.filterSelect}
        >
          {categories.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
        <select
          name="isActive"
          value={filters.isActive}
          onChange={handleFilterChange}
          style={styles.filterSelect}
        >
          <option value={true}>Active</option>
          <option value={false}>Inactive</option>
        </select>
      </div>

      {/* Loading State */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading inventory...</p>
        </div>
      ) : (
        <>
          {/* Inventory Table */}
          <div style={styles.tableContainer}>
            {inventory.length === 0 ? (
              <div style={styles.emptyState}>
                <p>No inventory items found</p>
                <button 
                  onClick={() => navigate('/inventory/create')} 
                  style={styles.emptyButton}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                >
                  Add Your First Item
                </button>
              </div>
            ) : (
              <>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      <th style={styles.th}>Item</th>
                      <th style={styles.th}>Category</th>
                      <th style={styles.th}>Quantity</th>
                      <th style={styles.th}>Unit Cost</th>
                      <th style={styles.th}>Selling Price</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPaginatedInventory().map((item) => (
                    <tr key={item.item_id} style={styles.tableRow}>
                      <td style={styles.td}>
                        <div style={styles.itemName}>{item.item_name}</div>
                        {item.item_code && <div style={styles.itemCode}>{item.item_code}</div>}
                      </td>
                      <td style={styles.td}>
                        <div>{getCategoryLabel(item.category)}</div>
                        {item.sub_category && <div style={styles.itemCode}>{item.sub_category}</div>}
                      </td>
                      <td style={styles.td}>
                        {item.quantity} {item.unit}
                      </td>
                      <td style={styles.td}>
                        {formatCurrency(item.unit_cost)}
                      </td>
                      <td style={styles.td}>
                        {formatCurrency(item.selling_price)}
                      </td>
                      <td style={styles.td}>
                        {getStockStatusBadge(item)}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          <button
                            onClick={() => navigate(`/inventory/${item.item_id}`)}
                            style={styles.viewButton}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                          >
                            View
                          </button>
                          <button
                            onClick={() => navigate(`/inventory/${item.item_id}/edit`)}
                            style={styles.editButton}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d97706'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f59e0b'}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.item_id)}
                            style={styles.deleteButton}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {Math.ceil(inventory.length / itemsPerPage) > 1 && (
                  <div style={styles.paginationContainer}>
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      style={currentPage === 1 ? styles.paginationButtonDisabled : styles.paginationButton}
                      onMouseEnter={(e) => {
                        if (currentPage !== 1) e.currentTarget.style.backgroundColor = '#667eea';
                      }}
                      onMouseLeave={(e) => {
                        if (currentPage !== 1) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      ← Prev
                    </button>

                    {getPageNumbers().map((page, idx) => (
                      <button
                        key={idx}
                        onClick={() => handlePageChange(page)}
                        disabled={page === '...'}
                        style={page === currentPage ? styles.paginationButtonActive : page === '...' ? styles.paginationEllipsis : styles.paginationButton}
                        onMouseEnter={(e) => {
                          if (page !== '...' && page !== currentPage) e.currentTarget.style.backgroundColor = '#667eea';
                        }}
                        onMouseLeave={(e) => {
                          if (page !== '...' && page !== currentPage) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === Math.ceil(inventory.length / itemsPerPage)}
                      style={currentPage === Math.ceil(inventory.length / itemsPerPage) ? styles.paginationButtonDisabled : styles.paginationButton}
                      onMouseEnter={(e) => {
                        if (currentPage !== Math.ceil(inventory.length / itemsPerPage)) e.currentTarget.style.backgroundColor = '#667eea';
                      }}
                      onMouseLeave={(e) => {
                        if (currentPage !== Math.ceil(inventory.length / itemsPerPage)) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </Layout>
  );
};

const styles = {
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    paddingBottom: '8px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#111827',
    margin: 0,
    lineHeight: '1.2',
  },
  subtitle: {
    fontSize: '11px',
    color: '#6b7280',
    margin: 0,
  },
  addButton: {
    padding: '6px 12px',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  alertContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '6px',
    marginBottom: '8px',
  },
  alertDanger: {
    padding: '6px 10px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '5px',
    borderLeft: '3px solid #ef4444',
    fontSize: '11px',
  },
  alertWarning: {
    padding: '6px 10px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '5px',
    borderLeft: '3px solid #f59e0b',
    fontSize: '11px',
  },
  errorBox: {
    padding: '8px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '5px',
    marginBottom: '8px',
    border: '1px solid #fecaca',
    fontSize: '11px',
  },
  filterContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '6px',
    marginBottom: '8px',
  },
  searchInput: {
    padding: '5px 10px',
    fontSize: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '5px',
    outline: 'none',
  },
  filterSelect: {
    padding: '5px 10px',
    fontSize: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '5px',
    outline: 'none',
    backgroundColor: 'white',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
  },
  spinner: {
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #2563eb',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
  },
  countInfo: {
    padding: '6px 10px',
    backgroundColor: '#f9fafb',
    borderRadius: '5px',
    marginBottom: '8px',
    fontSize: '11px',
    color: '#374151',
  },
  tableContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    maxHeight: 'calc(100vh - 240px)',
    overflow: 'auto',
    border: '1px solid #e5e7eb',
  },
  emptyState: {
    textAlign: 'center',
    padding: '30px 15px',
  },
  emptyButton: {
    marginTop: '10px',
    padding: '6px 12px',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
    minWidth: '800px',
  },
  tableHeader: {
    backgroundColor: '#f9fafb',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  th: {
    padding: '6px 10px',
    textAlign: 'left',
    fontSize: '10px',
    fontWeight: '600',
    color: '#374151',
    borderBottom: '1px solid #e5e7eb',
    textTransform: 'uppercase',
  },
  tableRow: {
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '6px 10px',
    fontSize: '12px',
    color: '#6b7280',
  },
  itemName: {
    fontWeight: '500',
    color: '#111827',
    fontSize: '12px',
  },
  itemCode: {
    fontSize: '10px',
    color: '#9ca3af',
  },
  badgeDanger: {
    padding: '2px 6px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '3px',
    fontSize: '10px',
    fontWeight: '500',
    display: 'inline-block',
  },
  badgeWarning: {
    padding: '2px 6px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '3px',
    fontSize: '10px',
    fontWeight: '500',
    display: 'inline-block',
  },
  badgeSuccess: {
    padding: '2px 6px',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    borderRadius: '3px',
    fontSize: '10px',
    fontWeight: '500',
    display: 'inline-block',
  },
  actions: {
    display: 'flex',
    gap: '3px',
  },
  viewButton: {
    padding: '3px 7px',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    fontSize: '10px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  editButton: {
    padding: '3px 7px',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    fontSize: '10px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '3px 7px',
    backgroundColor: '#DC2626',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    fontSize: '10px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  summaryContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    padding: '10px',
    marginBottom: '8px',
  },
  summaryTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '6px',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '6px',
  },
  summaryCardBlue: {
    backgroundColor: '#eff6ff',
    borderRadius: '5px',
    padding: '6px 10px',
  },
  summaryCardGreen: {
    backgroundColor: '#f0fdf4',
    borderRadius: '5px',
    padding: '6px 10px',
  },
  summaryCardPurple: {
    backgroundColor: '#faf5ff',
    borderRadius: '5px',
    padding: '6px 10px',
  },
  summaryCardYellow: {
    backgroundColor: '#fef3c7',
    borderRadius: '5px',
    padding: '6px 10px',
  },
  summaryLabel: {
    fontSize: '10px',
    color: '#6b7280',
    margin: '0 0 2px 0',
  },
  summaryValue: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#111827',
    margin: 0,
  },
  paginationContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '3px',
    padding: '8px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  paginationButton: {
    backgroundColor: 'white',
    color: '#1F2937',
    border: '1px solid #1F2937',
    padding: '4px 6px',
    minWidth: '28px',
    fontSize: '11px',
    fontWeight: '600',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  paginationButtonActive: {
    backgroundColor: '#1F2937',
    color: 'white',
    border: '1px solid #1F2937',
    padding: '4px 6px',
    minWidth: '28px',
    fontSize: '11px',
    fontWeight: '600',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  paginationButtonDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#D1D5DB',
    border: '1px solid #D1D5DB',
    padding: '4px 6px',
    minWidth: '28px',
    fontSize: '11px',
    fontWeight: '500',
    borderRadius: '4px',
    cursor: 'not-allowed',
  },
  paginationEllipsis: {
    color: '#9ca3af',
    padding: '0 3px',
    fontSize: '11px',
    cursor: 'default',
  },
};

export default Inventory;
