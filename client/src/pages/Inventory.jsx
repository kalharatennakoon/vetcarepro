import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import inventoryService from '../services/inventoryService';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const Inventory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const canManageInventory = user?.role === 'admin';
  const [inventory, setInventory] = useState([]);
  const [allItems, setAllItems] = useState([]); // unfiltered, used for subcategory dropdown options
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const errorRef = useRef(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);
  const [filters, setFilters] = useState({
    category: '',
    subCategory: '',
    item: '',
    search: '',
    isActive: '',
    supplier: location.state?.filterSupplier || ''
  });
  const [lowStockCount, setLowStockCount] = useState(0);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [expiringCount, setExpiringCount] = useState(0);
  const [expiringItems, setExpiringItems] = useState([]);
  const [alertFilter, setAlertFilter] = useState(null); // 'lowStock', 'expiring', or 'outOfStock'
  const [inactiveCount, setInactiveCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const categories = [
    { value: '', label: 'All Categories' },
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

  const subCategoryMap = {
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

  useEffect(() => {
    // Load all items once for subcategory dropdown population
    inventoryService.getAll({})
      .then(res => setAllItems(res.data || []))
      .catch(() => {});
    inventoryService.getAll({ isActive: false })
      .then(res => setInactiveCount(res.data?.length || 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadInventory();
    loadAlerts();
  }, [filters]);

  const loadInventory = async () => {
    try {
      setError('');
      const response = await inventoryService.getAll(filters);
      setInventory(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load inventory');
      console.error('Error loading inventory:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const [lowStockRes, expiringRes] = await Promise.all([
        inventoryService.getLowStockItems(),
        inventoryService.getExpiringItems()
      ]);
      setLowStockCount(lowStockRes.count || 0);
      setLowStockItems(lowStockRes.data || []);
      setExpiringCount(expiringRes.count || 0);
      setExpiringItems(expiringRes.data || []);
    } catch (err) {
      console.error('Error loading alerts:', err);
    }
  };

  const outOfStockItems = allItems.filter(i => i.quantity === 0);
  const outOfStockCount = outOfStockItems.length;

  const getSupplierOptions = () =>
    [...new Set(allItems.map(i => i.supplier).filter(Boolean))].sort();

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'category' ? { subCategory: '', item: '' } : {}),
    ...(name === 'subCategory' ? { item: '' } : {}),
    }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({ category: '', subCategory: '', item: '', search: '', isActive: '', supplier: '' });
    setCurrentPage(1);
    setAlertFilter(null);
  };

  const hasActiveFilters = filters.category || filters.subCategory || filters.item || filters.search || filters.isActive || filters.supplier;

  const handleViewLowStock = () => {
    setAlertFilter(alertFilter === 'lowStock' ? null : 'lowStock');
    setCurrentPage(1);
  };

  const handleViewExpiring = () => {
    setAlertFilter(alertFilter === 'expiring' ? null : 'expiring');
    setCurrentPage(1);
  };

  const handleViewOutOfStock = () => {
    setAlertFilter(alertFilter === 'outOfStock' ? null : 'outOfStock');
    setCurrentPage(1);
  };

  const getFilteredInventory = () => {
    let base;
    if (alertFilter === 'lowStock') base = lowStockItems;
    else if (alertFilter === 'expiring') {
      base = expiringItems;
    }
    else if (alertFilter === 'outOfStock') base = outOfStockItems;
    else base = inventory;

    if (filters.subCategory) base = base.filter(i => i.sub_category === filters.subCategory);
    if (filters.item) base = base.filter(i => i.item_id === Number(filters.item));
    if (filters.supplier) base = base.filter(i => i.supplier === filters.supplier);
    return base;
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
    if (item.stock_status === 'OUT_OF_STOCK') {
      return <span style={styles.badgeOutOfStock}>Out of Stock</span>;
    }
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
    const filteredInventory = getFilteredInventory();
    const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
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
    const filteredInventory = getFilteredInventory();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredInventory.slice(startIndex, endIndex);
  };

  return (
    <Layout>
      {/* Page Header */}
      <div style={styles.pageHeader}>
        <div>
          <h2 style={styles.title}>Inventory Management</h2>
          <p style={styles.subtitle}>Manage medicines, vaccines, accessories, and supplies</p>
        </div>
        {canManageInventory ? (
          <button
            onClick={() => navigate('/inventory/create')}
            style={styles.addButton}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          >
            + Add New Item
          </button>
        ) : (
          <div title="Only admins can add inventory items" style={styles.disabledButton}>
            <i className="fas fa-lock" style={{ marginRight: '0.4rem', fontSize: '0.75rem' }}></i>
            Add New Item
          </div>
        )}
      </div>

      {/* Summary at Top */}
      {!initialLoading && inventory.length > 0 && (
        <div style={styles.summaryContainer}>
          <h3 style={styles.summaryTitle}>Inventory Summary</h3>
          <div style={styles.summaryGrid}>
            <div style={{ ...styles.summarySubCard, borderTop: '4px solid #3b82f6' }}>
              <span style={styles.summarySubLabel}>Total Items</span>
              <strong style={styles.summarySubValue}>{inventory.length}</strong>
            </div>
            {canManageInventory && (
              <div style={{ ...styles.summarySubCard, borderTop: '4px solid #10b981' }}>
                <span style={styles.summarySubLabel}>Total Value</span>
                <strong style={{ ...styles.summarySubValue, fontSize: '0.95rem' }}>
                  {formatCurrency(inventory.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0))}
                </strong>
              </div>
            )}
            <div style={{ ...styles.summarySubCard, borderTop: '4px solid #8b5cf6' }}>
              <span style={styles.summarySubLabel}>Active Items</span>
              <strong style={{ ...styles.summarySubValue, color: '#059669' }}>
                {inventory.filter(item => item.is_active && item.quantity > 0).length}
              </strong>
            </div>
            <div style={{ ...styles.summarySubCard, borderTop: '4px solid #f59e0b' }}>
              <span style={styles.summarySubLabel}>Out of Stock</span>
              <strong style={{ ...styles.summarySubValue, color: '#d97706' }}>
                {inventory.filter(item => item.quantity === 0).length}
              </strong>
            </div>
            <div style={{ ...styles.summarySubCard, borderTop: '4px solid #ef4444' }}>
              <span style={styles.summarySubLabel}>Inactive Items</span>
              <strong style={{ ...styles.summarySubValue, color: '#dc2626' }}>
                {inactiveCount}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Alert Summary */}
      {(lowStockCount > 0 || expiringCount > 0 || outOfStockCount > 0) && (
        <div style={styles.alertContainer}>
          {outOfStockCount > 0 && (
            <div style={alertFilter === 'outOfStock' ? styles.alertOutOfStockActive : styles.alertOutOfStock}>
              <div style={styles.alertContent}>
                <div>
                  <strong>{outOfStockCount}</strong> item(s) are out of stock
                </div>
                <button
                  onClick={handleViewOutOfStock}
                  style={styles.alertButtonOutOfStock}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#111827'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1f2937'}
                >
                  {alertFilter === 'outOfStock' ? 'Show All' : 'View Items'}
                </button>
              </div>
            </div>
          )}
          {lowStockCount > 0 && (
            <div style={alertFilter === 'lowStock' ? styles.alertDangerActive : styles.alertDanger}>
              <div style={styles.alertContent}>
                <div>
                  <strong>{lowStockCount}</strong> item(s) are running low on stock
                </div>
                <button
                  onClick={handleViewLowStock}
                  style={styles.alertButton}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                >
                  {alertFilter === 'lowStock' ? 'Show All' : 'View Items'}
                </button>
              </div>
            </div>
          )}
          {expiringCount > 0 && (
            <div style={alertFilter === 'expiring' ? styles.alertWarningActive : styles.alertWarning}>
              <div style={styles.alertContent}>
                <div>
                  <strong>{expiringCount}</strong> item(s) expiring within 90 days
                </div>
                <button
                  onClick={handleViewExpiring}
                  style={styles.alertButtonWarning}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b45309'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#d97706'}
                >
                  {alertFilter === 'expiring' ? 'Show All' : 'View Items'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div ref={errorRef} style={styles.errorBox}>
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
        <div style={styles.filterRow}>
          <select
            name="category"
            value={filters.category}
            onChange={handleFilterChange}
            style={{ ...styles.filterSelect, ...styles.filterRowSelect }}
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
          <select
            name="subCategory"
            value={filters.subCategory}
            onChange={handleFilterChange}
            style={{ ...styles.filterSelect, ...styles.filterRowSelect }}
            disabled={!filters.category}
          >
            <option value="">All Sub-Categories</option>
            {(subCategoryMap[filters.category] || []).map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
          <select
            name="item"
            value={filters.item}
            onChange={handleFilterChange}
            style={{ ...styles.filterSelect, ...styles.filterRowSelect }}
            disabled={!filters.category && !filters.subCategory}
          >
            <option value="">All Items</option>
            {allItems
              .filter(i =>
                (!filters.category || i.category === filters.category) &&
                (!filters.subCategory || i.sub_category === filters.subCategory)
              )
              .sort((a, b) => a.item_name.localeCompare(b.item_name))
              .map(i => (
                <option key={i.item_id} value={i.item_id}>{i.item_name}</option>
              ))}
          </select>
          <select
            name="isActive"
            value={filters.isActive}
            onChange={handleFilterChange}
            style={{ ...styles.filterSelect, ...styles.filterRowSelect }}
          >
            <option value="">All Status</option>
            <option value={true}>Active</option>
            <option value={false}>Inactive</option>
          </select>
          {canManageInventory && (
            <select
              name="supplier"
              value={filters.supplier}
              onChange={handleFilterChange}
              style={{ ...styles.filterSelect, ...styles.filterRowSelect }}
              disabled={getSupplierOptions().length === 0}
            >
              <option value="">All Suppliers</option>
              {getSupplierOptions().map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
          {hasActiveFilters && (
            <button onClick={handleClearFilters} style={styles.clearFilterLink}>Clear</button>
          )}
        </div>
      </div>

      {/* Active Filter Indicator */}
      {alertFilter && (
        <div style={styles.activeFilterIndicator}>
          <span style={styles.filterBadge}>
            {alertFilter === 'lowStock' ? (
              <>
                <i className="fas fa-exclamation-triangle" style={{ marginRight: '0.5rem' }}></i>
                Showing Low Stock Items
              </>
            ) : (
              <>
                <i className="fas fa-clock" style={{ marginRight: '0.5rem' }}></i>
                Showing Expiring Items
              </>
            )}
          </span>
          <button
            onClick={() => setAlertFilter(null)}
            style={styles.clearFilterButton}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#64748b'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#94a3b8'}
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* Loading State */}
      {initialLoading ? (
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
                      {canManageInventory && <th style={styles.th}>Unit Cost</th>}
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
                      {canManageInventory && (
                        <td style={styles.td}>
                          {formatCurrency(item.unit_cost)}
                        </td>
                      )}
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
                          >
                            View
                          </button>
                          {canManageInventory && (
                            <button
                              onClick={() => handleDelete(item.item_id)}
                              style={styles.deleteButton}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    ))}
                  </tbody>
                </table>

                {/* Results Summary */}
                {getFilteredInventory().length > 0 && (
                  <div style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', color: '#6b7280', borderTop: '1px solid #e5e7eb' }}>
                    Showing <strong>{(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, getFilteredInventory().length)}</strong> of <strong>{getFilteredInventory().length}</strong> items
                  </div>
                )}

                {/* Pagination */}
                {Math.ceil(getFilteredInventory().length / itemsPerPage) > 1 && (
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
                      disabled={currentPage === Math.ceil(getFilteredInventory().length / itemsPerPage)}
                      style={currentPage === Math.ceil(getFilteredInventory().length / itemsPerPage) ? styles.paginationButtonDisabled : styles.paginationButton}
                      onMouseEnter={(e) => {
                        if (currentPage !== Math.ceil(getFilteredInventory().length / itemsPerPage)) e.currentTarget.style.backgroundColor = '#667eea';
                      }}
                      onMouseLeave={(e) => {
                        if (currentPage !== Math.ceil(getFilteredInventory().length / itemsPerPage)) e.currentTarget.style.backgroundColor = 'transparent';
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
  disabledButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#f3f4f6',
    color: '#9ca3af',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'not-allowed',
    display: 'inline-flex',
    alignItems: 'center',
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
  alertDangerActive: {
    padding: '1rem 1.5rem',
    backgroundColor: '#fecaca',
    color: '#991b1b',
    borderRadius: '8px',
    borderLeft: '4px solid #dc2626',
    fontSize: '0.875rem',
    boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)',
  },
  alertOutOfStock: {
    padding: '1rem 1.5rem',
    backgroundColor: '#f3f4f6',
    color: '#111827',
    borderRadius: '8px',
    borderLeft: '4px solid #1f2937',
    fontSize: '0.875rem',
  },
  alertOutOfStockActive: {
    padding: '1rem 1.5rem',
    backgroundColor: '#e5e7eb',
    color: '#111827',
    borderRadius: '8px',
    borderLeft: '4px solid #111827',
    fontSize: '0.875rem',
    boxShadow: '0 2px 4px rgba(17, 24, 39, 0.2)',
  },
  alertButtonOutOfStock: {
    padding: '0.5rem 1rem',
    backgroundColor: '#1f2937',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  alertWarning: {
    padding: '1rem 1.5rem',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '8px',
    borderLeft: '4px solid #f59e0b',
    fontSize: '0.875rem',
  },
  alertWarningActive: {
    padding: '1rem 1.5rem',
    backgroundColor: '#fde68a',
    color: '#92400e',
    borderRadius: '8px',
    borderLeft: '4px solid #d97706',
    fontSize: '0.875rem',
    boxShadow: '0 2px 4px rgba(217, 119, 6, 0.2)',
  },
  alertContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
  },
  alertButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  alertButtonWarning: {
    padding: '0.5rem 1rem',
    backgroundColor: '#d97706',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
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
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '2rem',
  },
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  filterRowSelect: {
    flex: '1 1 160px',
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
  activeFilterIndicator: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    marginBottom: '1rem',
    border: '1px solid #cbd5e1',
  },
  filterBadge: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#475569',
  },
  clearFilterLink: {
    backgroundColor: 'transparent',
    color: '#3B82F6',
    border: 'none',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  clearFilterButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#94a3b8',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
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
  badgeOutOfStock: {
    padding: '0.375rem 0.75rem',
    backgroundColor: '#1f2937',
    color: '#f9fafb',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    display: 'inline-block',
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
    backgroundColor: '#2563eb',
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
  summarySubCard: {
    background: '#ffffff',
    padding: '1rem 1.25rem',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  summarySubLabel: {
    fontSize: '0.72rem',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  summarySubValue: {
    fontSize: '1.375rem',
    fontWeight: '700',
    color: '#111827',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  paginationContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1rem',
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
