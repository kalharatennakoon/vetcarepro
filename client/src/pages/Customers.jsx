import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCustomers } from '../services/customerService';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import '../styles/ManagementPages.css';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const errorRef = useRef(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [statusFilter, setStatusFilter] = useState('all');

  const navigate = useNavigate();
  useAuth();

  useEffect(() => {
    fetchCustomers();
    setCurrentPage(1); // Reset to first page when search changes
  }, [search]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await getCustomers({ search });
      setCustomers(response.data.customers);
      setError('');
    } catch (err) {
      setError('Failed to load customers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const activeCount = customers.filter(c => c.is_active !== false).length;
  const inactiveCount = customers.filter(c => c.is_active === false).length;

  const filteredCustomers = customers.filter(c => {
    if (statusFilter === 'active') return c.is_active !== false;
    if (statusFilter === 'inactive') return c.is_active === false;
    return true;
  });

  const statusTabs = [
    { key: 'all', label: 'All', count: customers.length },
    { key: 'active', label: 'Active', count: activeCount },
    { key: 'inactive', label: 'Inactive', count: inactiveCount },
  ];

  // Pagination calculations
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCustomers = filteredCustomers.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <Layout>
      <div className="mgmt-page-container">
        {/* Page Header */}
        <div className="mgmt-header-card">
          <div className="mgmt-header-left">
            <div className="mgmt-header-icon-box mgmt-header-icon-customers">
              <i className="fas fa-users"></i>
            </div>
            <div className="mgmt-header-text">
              <h2 className="mgmt-title">Customer Management</h2>
              <p className="mgmt-subtitle">Manage pet owners and their information</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/customers/new')}
            className="mgmt-add-btn mgmt-add-btn-purple"
          >
            <span>+</span>
            <span>Add Customer</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="mgmt-control-card">
          <div className="mgmt-search-row">
            <div className="mgmt-search-wrapper">
              <i className="fas fa-search mgmt-search-icon"></i>
              <input
                type="text"
                placeholder="Search by name, phone, email, or city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mgmt-search-input"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="mgmt-search-clear-btn"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
          </div>

          <div className="mgmt-stats-grid">
            <div className="mgmt-stat-card">
              <span className="mgmt-stat-label">Total Customers</span>
              <span className="mgmt-stat-value">{customers.length}</span>
            </div>
            <div className="mgmt-stat-card">
              <span className="mgmt-stat-label">Active</span>
              <span className="mgmt-stat-value active-color">{activeCount}</span>
            </div>
            <div className="mgmt-stat-card">
              <span className="mgmt-stat-label">Inactive</span>
              <span className="mgmt-stat-value inactive-color">{inactiveCount}</span>
            </div>
            <div className="mgmt-stat-card">
              <span className="mgmt-stat-label">Showing</span>
              <span className="mgmt-stat-value">
                {filteredCustomers.length > 0 ? `${startIndex + 1}-${Math.min(endIndex, filteredCustomers.length)}` : '0'}
              </span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div ref={errorRef} style={styles.errorBox}>
            {error}
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="mgmt-status-tabs">
          {statusTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setStatusFilter(tab.key); setCurrentPage(1); }}
              className={`mgmt-status-tab ${statusFilter === tab.key ? 'active' : ''}`}
            >
              {tab.label}
              <span className="mgmt-tab-count">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p>Loading customers...</p>
          </div>
        ) : (
          <>
            {/* Customers Table Card */}
            <div className="mgmt-table-card">
              {currentCustomers.length === 0 ? (
                <div className="mgmt-empty-card">
                  <i className="fas fa-users mgmt-empty-icon"></i>
                  <p className="mgmt-empty-text">No customers found</p>
                  <button 
                    onClick={() => navigate('/customers/new')}
                    className="mgmt-add-btn mgmt-add-btn-purple"
                  >
                    Add Your First Customer
                  </button>
                </div>
              ) : (
                <table className="mgmt-table">
                  <thead>
                    <tr>
                      <th className="mgmt-th" style={{ width: '30%' }}>Customer</th>
                      <th className="mgmt-th" style={{ width: '20%' }}>Phone</th>
                      <th className="mgmt-th" style={{ width: '26%' }}>Email</th>
                      <th className="mgmt-th" style={{ width: '10%', textAlign: 'center' }}>Pets</th>
                      <th className="mgmt-th" style={{ width: '14%', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentCustomers.map((customer) => (
                      <tr key={customer.customer_id} className="mgmt-tr">
                        <td className="mgmt-td">
                          <div className="mgmt-item-cell">
                            <div className="mgmt-avatar-initials mgmt-avatar-initials-purple">
                              {getInitials(customer.first_name, customer.last_name)}
                            </div>
                            <div className="mgmt-item-info">
                              <div className="mgmt-item-name">
                                <span>{customer.first_name} {customer.last_name}</span>
                                {customer.is_active === false && <span className="mgmt-badge-inactive">Inactive</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="mgmt-td">
                          <span style={{ fontFamily: 'monospace', fontWeight: '500' }}>{customer.phone}</span>
                        </td>
                        <td className="mgmt-td">
                          {customer.email ? (
                            <a href={`mailto:${customer.email}`} className="mgmt-owner-link">
                              {customer.email}
                            </a>
                          ) : (
                            <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>No email</span>
                          )}
                        </td>
                        <td className="mgmt-td" style={{ textAlign: 'center' }}>
                          <span className={`mgmt-count-badge ${customer.pet_count > 0 ? '' : 'zero'}`}>
                            {customer.pet_count || 0}
                          </span>
                        </td>
                        <td className="mgmt-td" style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => navigate(`/customers/${customer.customer_id}`)}
                            className="mgmt-view-btn"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Container */}
            {filteredCustomers.length > itemsPerPage && (
              <div className="mgmt-pagination-container">
                <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredCustomers.length)} of {filteredCustomers.length} entries
                </div>
                <div className="mgmt-pagination-btns">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="mgmt-page-btn"
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>

                  {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} style={{ padding: '0 0.25rem', color: '#94a3b8' }}>...</span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`mgmt-page-btn ${currentPage === page ? 'active' : ''}`}
                      >
                        {page}
                      </button>
                    )
                  ))}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="mgmt-page-btn"
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

const styles = {
  errorBox: {
    padding: '1rem',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '8px',
    border: '1px solid #fecaca',
    fontSize: '0.875rem',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    color: '#64748b',
  },
  spinner: {
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #4f46e5',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    marginBottom: '1rem',
  },
};

export default Customers;