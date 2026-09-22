import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import inventoryService from '../services/inventoryService';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import '../styles/InventoryModern.css';

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
      return <span className="inv-badge out-of-stock"><i className="fas fa-ban"></i> Out of Stock</span>;
    }
    if (item.stock_status === 'LOW') {
      return <span className="inv-badge low"><i className="fas fa-triangle-exclamation"></i> Low Stock</span>;
    }
    if (item.stock_status === 'EXPIRING') {
      return <span className="inv-badge expiring"><i className="fas fa-clock"></i> Expiring Soon</span>;
    }
    return <span className="inv-badge normal"><i className="fas fa-check"></i> Normal</span>;
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
      <div className="inv-container">
        {/* Page Header Hero */}
        <div className="inv-header-card">
          <div className="inv-header-left">
            <div className="inv-header-icon">
              <i className="fas fa-boxes-stacked"></i>
            </div>
            <div>
              <h1 className="inv-title">Inventory Management</h1>
              <p className="inv-subtitle">Manage medicines, vaccines, accessories, and supplies</p>
            </div>
          </div>
          {canManageInventory ? (
            <button
              onClick={() => navigate('/inventory/create')}
              className="inv-btn-primary"
            >
              <i className="fas fa-plus"></i>
              Add New Item
            </button>
          ) : (
            <div title="Only admins can add inventory items" className="inv-btn-disabled">
              <i className="fas fa-lock"></i>
              Add New Item
            </div>
          )}
        </div>

        {/* Summary Metric Cards */}
        {!initialLoading && inventory.length > 0 && (
          <div className="inv-stats-grid">
            <div className="inv-stat-card">
              <div className="inv-stat-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                <i className="fas fa-cubes"></i>
              </div>
              <div>
                <div className="inv-stat-label">Total Items</div>
                <div className="inv-stat-value">{inventory.length}</div>
              </div>
            </div>
            {canManageInventory && (
              <div className="inv-stat-card">
                <div className="inv-stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                  <i className="fas fa-sack-dollar"></i>
                </div>
                <div>
                  <div className="inv-stat-label">Total Value</div>
                  <div className="inv-stat-value" style={{ fontSize: '1.05rem', color: '#059669' }}>
                    {formatCurrency(inventory.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0))}
                  </div>
                </div>
              </div>
            )}
            <div className="inv-stat-card">
              <div className="inv-stat-icon" style={{ backgroundColor: '#f3e8ff', color: '#7c3aed' }}>
                <i className="fas fa-circle-check"></i>
              </div>
              <div>
                <div className="inv-stat-label">Active Items</div>
                <div className="inv-stat-value" style={{ color: '#7c3aed' }}>
                  {inventory.filter(item => item.is_active && item.quantity > 0).length}
                </div>
              </div>
            </div>
            <div className="inv-stat-card">
              <div className="inv-stat-icon" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
                <i className="fas fa-triangle-exclamation"></i>
              </div>
              <div>
                <div className="inv-stat-label">Out of Stock</div>
                <div className="inv-stat-value" style={{ color: '#d97706' }}>
                  {inventory.filter(item => item.quantity === 0).length}
                </div>
              </div>
            </div>
            <div className="inv-stat-card">
              <div className="inv-stat-icon" style={{ backgroundColor: '#fff1f2', color: '#e11d48' }}>
                <i className="fas fa-eye-slash"></i>
              </div>
              <div>
                <div className="inv-stat-label">Inactive Items</div>
                <div className="inv-stat-value" style={{ color: '#e11d48' }}>
                  {inactiveCount}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alert Summary Banners */}
        {(lowStockCount > 0 || expiringCount > 0 || outOfStockCount > 0) && (
          <div className="inv-alerts-grid">
            {outOfStockCount > 0 && (
              <div className={`inv-alert-card out-of-stock ${alertFilter === 'outOfStock' ? 'active' : ''}`}>
                <div>
                  <strong style={{ fontSize: '1rem' }}>{outOfStockCount}</strong> item(s) are out of stock
                </div>
                <button
                  onClick={handleViewOutOfStock}
                  className="inv-alert-btn out-of-stock"
                >
                  {alertFilter === 'outOfStock' ? 'Show All' : 'View Items'}
                </button>
              </div>
            )}
            {lowStockCount > 0 && (
              <div className={`inv-alert-card low-stock ${alertFilter === 'lowStock' ? 'active' : ''}`}>
                <div>
                  <strong style={{ fontSize: '1rem' }}>{lowStockCount}</strong> item(s) running low
                </div>
                <button
                  onClick={handleViewLowStock}
                  className="inv-alert-btn low-stock"
                >
                  {alertFilter === 'lowStock' ? 'Show All' : 'View Items'}
                </button>
              </div>
            )}
            {expiringCount > 0 && (
              <div className={`inv-alert-card expiring ${alertFilter === 'expiring' ? 'active' : ''}`}>
                <div>
                  <strong style={{ fontSize: '1rem' }}>{expiringCount}</strong> item(s) expiring within 90 days
                </div>
                <button
                  onClick={handleViewExpiring}
                  className="inv-alert-btn expiring"
                >
                  {alertFilter === 'expiring' ? 'Show All' : 'View Items'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error Box */}
        {error && (
          <div ref={errorRef} className="inv-alert-card low-stock" style={{ marginBottom: '1.25rem' }}>
            <div>
              <i className="fas fa-circle-exclamation" style={{ marginRight: '0.5rem' }}></i>
              {error}
            </div>
          </div>
        )}

        {/* Search & Filter Controls */}
        <div className="inv-filter-card">
          <div className="inv-search-bar">
            <i className="fas fa-search inv-search-icon"></i>
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search inventory by item name or item code..."
              className="inv-search-input"
            />
          </div>
          <div className="inv-filter-row">
            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              className="inv-select-input"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            <select
              name="subCategory"
              value={filters.subCategory}
              onChange={handleFilterChange}
              className="inv-select-input"
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
              className="inv-select-input"
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
              className="inv-select-input"
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
                className="inv-select-input"
                disabled={getSupplierOptions().length === 0}
              >
                <option value="">All Suppliers</option>
                {getSupplierOptions().map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
            {hasActiveFilters && (
              <button onClick={handleClearFilters} className="inv-clear-btn">
                <i className="fas fa-times" style={{ marginRight: '0.3rem' }}></i> Clear
              </button>
            )}
          </div>
        </div>

        {/* Active Alert Filter Indicator */}
        {alertFilter && (
          <div className="inv-active-filter-bar">
            <span className="inv-active-filter-badge">
              {alertFilter === 'lowStock' ? (
                <>
                  <i className="fas fa-triangle-exclamation" style={{ color: '#dc2626' }}></i>
                  Showing Low Stock Items
                </>
              ) : alertFilter === 'expiring' ? (
                <>
                  <i className="fas fa-clock" style={{ color: '#d97706' }}></i>
                  Showing Expiring Items
                </>
              ) : (
                <>
                  <i className="fas fa-ban" style={{ color: '#0f172a' }}></i>
                  Showing Out of Stock Items
                </>
              )}
            </span>
            <button onClick={() => setAlertFilter(null)} className="inv-clear-btn">
              Clear Filter
            </button>
          </div>
        )}

        {/* Loading State */}
        {initialLoading ? (
          <div className="inv-empty-state">
            <div className="appts-spinner" style={{ margin: '0 auto 1rem auto', borderTopColor: '#f59e0b' }}></div>
            <p style={{ color: '#64748b' }}>Loading inventory items...</p>
          </div>
        ) : (
          <div className="inv-table-card">
            {inventory.length === 0 ? (
              <div className="inv-empty-state">
                <div className="inv-empty-icon">
                  <i className="fas fa-box-open"></i>
                </div>
                <h3 className="inv-empty-title">No Inventory Items Found</h3>
                <p className="inv-empty-desc">No items match your active filters or search queries.</p>
                {canManageInventory && (
                  <button onClick={() => navigate('/inventory/create')} className="inv-btn-primary">
                    <i className="fas fa-plus"></i> Add Your First Item
                  </button>
                )}
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table className="inv-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Category</th>
                        <th>Quantity</th>
                        {canManageInventory && <th>Unit Cost</th>}
                        <th>Selling Price</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedInventory().map((item) => (
                        <tr key={item.item_id}>
                          <td>
                            <div className="inv-item-name">{item.item_name}</div>
                            {item.item_code && <div className="inv-item-code">#{item.item_code}</div>}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#334155' }}>{getCategoryLabel(item.category)}</div>
                            {item.sub_category && <div className="inv-item-code">{item.sub_category}</div>}
                          </td>
                          <td style={{ fontWeight: 700, color: '#0f172a' }}>
                            {item.quantity} <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>{item.unit}</span>
                          </td>
                          {canManageInventory && (
                            <td style={{ color: '#475569', fontWeight: 600 }}>
                              {formatCurrency(item.unit_cost)}
                            </td>
                          )}
                          <td style={{ color: '#059669', fontWeight: 700 }}>
                            {formatCurrency(item.selling_price)}
                          </td>
                          <td>
                            {getStockStatusBadge(item)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="inv-action-group" style={{ justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => navigate(`/inventory/${item.item_id}`)}
                                className="inv-btn-view"
                              >
                                View
                              </button>
                              {canManageInventory && (
                                <button
                                  onClick={() => handleDelete(item.item_id)}
                                  className="inv-btn-delete"
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
                </div>

                {/* Pagination & Count Bar */}
                <div className="inv-pagination-bar">
                  <div className="inv-pagination-info">
                    Showing <strong>{(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, getFilteredInventory().length)}</strong> of <strong>{getFilteredInventory().length}</strong> items
                  </div>
                  {Math.ceil(getFilteredInventory().length / itemsPerPage) > 1 && (
                    <div className="inv-pagination-pills">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="inv-page-pill"
                      >
                        ←
                      </button>
                      {getPageNumbers().map((page, idx) => (
                        <button
                          key={idx}
                          onClick={() => handlePageChange(page)}
                          disabled={page === '...'}
                          className={`inv-page-pill ${page === currentPage ? 'active' : ''}`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === Math.ceil(getFilteredInventory().length / itemsPerPage)}
                        className="inv-page-pill"
                      >
                        →
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Inventory;
