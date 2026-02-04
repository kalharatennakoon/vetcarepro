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
  const itemsPerPage = 10;

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
    marginBottom: '2rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#111827',
    margin: '0 0 0.5rem 0',
    lineHeight: '1.2',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#6b7280',
    margin: 0,
  },
  addButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(59, 130, 246, 0.3)',
  },
  alertContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  alertDanger: {
    padding: '1rem 1.5rem',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '8px',
    borderLeft: '4px solid #ef4444',
    fontSize: '0.875rem',
  },
  alertWarning: {
    padding: '1rem 1.5rem',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '8px',
    borderLeft: '4px solid #f59e0b',
    fontSize: '0.875rem',
  },
  errorBox: {
    padding: '1rem',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '8px',
    marginBottom: '1rem',
    border: '1px solid #fecaca',
    fontSize: '0.875rem',
  },
  filterContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  searchInput: {
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
  },
  filterSelect: {
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
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
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    maxHeight: 'calc(100vh - 340px)',
    overflow: 'auto',
    border: '1px solid #e5e7eb',
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
  },
  emptyButton: {
    marginTop: '1rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
    minWidth: '900px',
  },
  tableHeader: {
    backgroundColor: '#f9fafb',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  th: {
    padding: '1rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#6b7280',
    borderBottom: '1px solid #e5e7eb',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  tableRow: {
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '1rem',
    fontSize: '0.875rem',
    color: '#374151',
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
    padding: '0.375rem 0.75rem',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    display: 'inline-block',
  },
  badgeWarning: {
    padding: '0.375rem 0.75rem',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    display: 'inline-block',
  },
  badgeSuccess: {
    padding: '0.375rem 0.75rem',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    display: 'inline-block',
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
  },
  viewButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  editButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#DC2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  summaryContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '1.5rem',
    marginBottom: '2rem',
    border: '1px solid #e5e7eb',
  },
  summaryTitle: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: '1rem',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1.5rem',
  },
  summaryCardBlue: {
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    padding: '1.25rem 1.5rem',
    border: '1px solid #dbeafe',
  },
  summaryCardGreen: {
    backgroundColor: '#f0fdf4',
    borderRadius: '8px',
    padding: '1.25rem 1.5rem',
    border: '1px solid #d1fae5',
  },
  summaryCardPurple: {
    backgroundColor: '#faf5ff',
    borderRadius: '8px',
    padding: '1.25rem 1.5rem',
    border: '1px solid #e9d5ff',
  },
  summaryCardYellow: {
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    padding: '1.25rem 1.5rem',
    border: '1px solid #fde68a',
  },
  summaryLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    margin: '0 0 0.5rem 0',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  summaryValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#111827',
    margin: 0,
  },
  paginationContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1rem',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: 'white',
  },
  paginationButton: {
    backgroundColor: 'white',
    color: '#374151',
    border: '1px solid #d1d5db',
    padding: '0.5rem 0.75rem',
    minWidth: '40px',
    fontSize: '0.875rem',
    fontWeight: '600',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  paginationButtonActive: {
    backgroundColor: '#3B82F6',
    color: 'white',
    border: '1px solid #3B82F6',
    padding: '0.5rem 0.75rem',
    minWidth: '40px',
    fontSize: '0.875rem',
    fontWeight: '600',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  paginationButtonDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#D1D5DB',
    border: '1px solid #D1D5DB',
    padding: '0.5rem 0.75rem',
    minWidth: '40px',
    fontSize: '0.875rem',
    fontWeight: '500',
    borderRadius: '6px',
    cursor: 'not-allowed',
  },
  paginationEllipsis: {
    color: '#9ca3af',
    padding: '0.5rem',
    fontSize: '0.875rem',
    cursor: 'default',
  },
};

export default Inventory;
