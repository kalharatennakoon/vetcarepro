import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCustomers, deleteCustomer } from '../services/customerService';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) {
      return;
    }

    try {
      await deleteCustomer(id);
      fetchCustomers();
    } catch (err) {
      alert('Failed to delete customer');
      console.error(err);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCustomers();
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const formatPhone = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phone;
  };

  // Pagination calculations
  const totalPages = Math.ceil(customers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCustomers = customers.slice(startIndex, endIndex);

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
      {/* Page Header */}
      <div style={styles.pageHeader}>
        <div style={styles.headerInfo}>
          <div style={styles.headerIconWrapper}>
            <i className="fas fa-users" style={styles.headerIcon}></i>
          </div>
          <div>
            <h2 style={styles.title}>Customer Management</h2>
            <p style={styles.subtitle}>Manage pet owners and their information</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/customers/new')}
          style={styles.addButton}
          onMouseOver={(e) => e.target.style.backgroundColor = styles.addButtonHover.backgroundColor}
          onMouseOut={(e) => e.target.style.backgroundColor = styles.addButton.backgroundColor}
        >
          <span style={styles.buttonIcon}>+</span>
          <span>Add Customer</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div style={styles.searchContainer}>
        <div style={styles.searchWrapper}>
          <i className="fas fa-search" style={styles.searchIconSpan}></i>
          <input
            type="text"
            placeholder="Search by name, phone, email, or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={styles.clearButton}
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
        <div style={styles.statsBar}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Total Customers</span>
            <span style={styles.statValue}>{customers.length}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Showing</span>
            <span style={styles.statValue}>
              {customers.length > 0 ? `${startIndex + 1}-${Math.min(endIndex, customers.length)}` : '0'}
            </span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Active</span>
            <span style={styles.statValue}>{customers.filter(c => c.is_active !== false).length}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>With Pets</span>
            <span style={styles.statValue}>{customers.filter(c => c.pet_count > 0).length}</span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={styles.errorBox}>
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading customers...</p>
        </div>
      ) : (
        <>
          {/* Customers Table */}
          <div style={styles.tableContainer}>
            {currentCustomers.length === 0 ? (
              <div style={styles.emptyState}>
                <p>No customers found</p>
                <button 
                  onClick={() => navigate('/customers/new')}
                  style={styles.emptyButton}
                >
                  Add Your First Customer
                </button>
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={{...styles.th, width: '35%'}}>Customer</th>
                    <th style={{...styles.th, width: '20%'}}>Phone</th>
                    <th style={{...styles.th, width: '25%'}}>Email</th>
                    <th style={{...styles.th, width: '10%', textAlign: 'center'}}>Pets</th>
                    <th style={{...styles.th, width: '10%', textAlign: 'right'}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentCustomers.map((customer) => (
                    <tr 
                      key={customer.customer_id} 
                      style={styles.tableRow}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td style={styles.td}>
                        <div style={styles.customerCell}>
                          <div style={styles.avatar}>
                            {getInitials(customer.first_name, customer.last_name)}
                          </div>
                          <div style={styles.customerInfo}>
                            <div style={styles.customerName}>
                              {customer.first_name} {customer.last_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.phoneNumber}>{formatPhone(customer.phone)}</span>
                      </td>
                      <td style={styles.td}>
                        {customer.email ? (
                          <a href={`mailto:${customer.email}`} style={styles.emailLink}>
                            {customer.email}
                          </a>
                        ) : (
                          <span style={styles.noData}>No email</span>
                        )}
                      </td>
                      <td style={{...styles.td, textAlign: 'center'}}>
                        <span style={{
                          ...styles.petCount,
                          ...(customer.pet_count > 0 ? {} : styles.petCountZero)
                        }}>
                          {customer.pet_count || 0}
                        </span>
                      </td>
                      <td style={{...styles.td, textAlign: 'right'}}>
                        <div style={styles.actions}>
                          <button
                            onClick={() => navigate(`/customers/${customer.customer_id}`)}
                            style={styles.viewButton}
                            onMouseOver={(e) => e.target.style.backgroundColor = styles.viewButtonHover.backgroundColor}
                            onMouseOut={(e) => e.target.style.backgroundColor = styles.viewButton.backgroundColor}
                          >
                            View
                          </button>
                          <button
                            onClick={() => navigate(`/customers/${customer.customer_id}/edit`)}
                            style={styles.editButton}
                            onMouseOver={(e) => e.target.style.backgroundColor = styles.editButtonHover.backgroundColor}
                            onMouseOut={(e) => e.target.style.backgroundColor = styles.editButton.backgroundColor}
                          >
                            Edit
                          </button>
                          {user?.role === 'admin' && (
                            <button
                              onClick={() => handleDelete(customer.customer_id)}
                              style={styles.deleteButton}
                              onMouseOver={(e) => e.target.style.backgroundColor = styles.deleteButtonHover.backgroundColor}
                              onMouseOut={(e) => e.target.style.backgroundColor = styles.deleteButton.backgroundColor}
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
            )}
          </div>

          {/* Pagination */}
          {customers.length > itemsPerPage && (
            <div style={styles.paginationContainer}>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  ...styles.paginationButton,
                  ...(currentPage === 1 ? styles.paginationButtonDisabled : {})
                }}
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              
              {getPageNumbers().map((page, index) => (
                page === '...' ? (
                  <span key={`ellipsis-${index}`} style={styles.paginationEllipsis}>...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    style={{
                      ...styles.paginationButton,
                      ...(currentPage === page ? styles.paginationButtonActive : {})
                    }}
                  >
                    {page}
                  </button>
                )
              ))}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  ...styles.paginationButton,
                  ...(currentPage === totalPages ? styles.paginationButtonDisabled : {})
                }}
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          )}
        </>
      )}
    </Layout>
  );
};

const styles = {
  // Page Header
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem',
    paddingBottom: '1.5rem',
    borderBottom: '2px solid #e5e7eb',
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  headerIconWrapper: {
    width: '3.5rem',
    height: '3.5rem',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 6px rgba(102, 126, 234, 0.25)',
  },
  headerIcon: {
    fontSize: '1.5rem',
    color: 'white',
  },
  title: {
    fontSize: '1.875rem',
    fontWeight: '700',
    color: '#111827',
    margin: 0,
    letterSpacing: '-0.025em',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: '0.25rem 0 0 0',
    fontWeight: '400',
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9375rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
  },
  addButtonHover: {
    backgroundColor: '#1d4ed8',
  },
  buttonIcon: {
    fontSize: '1.25rem',
    lineHeight: '1',
  },
  
  // Search Section
  searchContainer: {
    marginBottom: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: '10px',
    border: '2px solid #e5e7eb',
    padding: '0.75rem 1rem',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  searchIconSpan: {
    fontSize: '1rem',
    marginRight: '0.75rem',
    color: '#94a3b8',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '0.9375rem',
    fontWeight: '500',
    color: '#111827',
    backgroundColor: 'transparent',
  },
  clearButton: {
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '50%',
    width: '1.5rem',
    height: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#6b7280',
    transition: 'all 0.2s',
  },
  statsBar: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  statItem: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '0.75rem 1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    flex: '1 1 150px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  },
  statLabel: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#2563eb',
  },
  
  // Error & Loading
  errorBox: {
    padding: '1rem',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    marginBottom: '1rem',
    border: '1px solid #fecaca',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #2563eb',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    animation: 'spin 1s linear infinite',
  },
  
  // Table Styles
  tableContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.08)',
    overflow: 'auto',
    WebkitOverflowScrolling: 'touch',
    border: '1px solid #e5e7eb',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '800px',
    tableLayout: 'fixed',
  },
  tableHeader: {
    backgroundColor: '#f8fafc',
    borderBottom: '2px solid #e5e7eb',
  },
  th: {
    padding: '1rem 1.25rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
  },
  tableRow: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'all 0.15s ease',
    cursor: 'pointer',
  },
  td: {
    padding: '1rem 1.25rem',
    fontSize: '0.875rem',
    color: '#64748b',
    verticalAlign: 'middle',
  },
  customerCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.875rem',
  },
  avatar: {
    width: '2.5rem',
    height: '2.5rem',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '0.875rem',
    fontWeight: '600',
    flexShrink: 0,
    boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)',
  },
  customerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.125rem',
  },
  customerName: {
    fontWeight: '600',
    color: '#111827',
    fontSize: '0.9375rem',
  },
  phoneNumber: {
    fontWeight: '500',
    color: '#111827',
    fontFamily: 'monospace',
  },
  emailLink: {
    color: '#2563eb',
    textDecoration: 'none',
    fontWeight: '500',
    transition: 'color 0.2s',
  },
  noData: {
    color: '#cbd5e1',
    fontStyle: 'italic',
  },
  petCount: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '2rem',
    padding: '0.375rem 0.625rem',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '700',
    boxShadow: '0 1px 2px rgba(37, 99, 235, 0.1)',
  },
  petCountZero: {
    backgroundColor: '#f1f5f9',
    color: '#94a3b8',
  },
  
  // Action Buttons
  actions: {
    display: 'flex',
    gap: '0.375rem',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  viewButton: {
    padding: '0.5rem 0.875rem',
    backgroundColor: '#64748b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.8125rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 2px rgba(100, 116, 139, 0.2)',
    whiteSpace: 'nowrap',
  },
  viewButtonHover: {
    backgroundColor: '#475569',
  },
  editButton: {
    padding: '0.5rem 0.875rem',
    backgroundColor: '#64748b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.8125rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 2px rgba(100, 116, 139, 0.2)',
    whiteSpace: 'nowrap',
  },
  editButtonHover: {
    backgroundColor: '#475569',
  },
  deleteButton: {
    padding: '0.5rem 0.875rem',
    backgroundColor: '#64748b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.8125rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 2px rgba(100, 116, 139, 0.2)',
    whiteSpace: 'nowrap',
  },
  deleteButtonHover: {
    backgroundColor: '#475569',
  },
  
  // Empty State
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
  },
  emptyButton: {
    marginTop: '1.5rem',
    padding: '0.875rem 2rem',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
    transition: 'all 0.2s ease',
  },
  
  // Pagination
  paginationContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '1.5rem',
    padding: '1rem',
  },
  paginationButton: {
    padding: '0.5rem 0.75rem',
    minWidth: '2.5rem',
    backgroundColor: 'white',
    color: '#64748b',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  },
  paginationButtonActive: {
    backgroundColor: '#2563eb',
    color: 'white',
    borderColor: '#2563eb',
    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
  },
  paginationButtonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  paginationEllipsis: {
    padding: '0.5rem 0.25rem',
    color: '#94a3b8',
    fontSize: '0.875rem',
  },
};

export default Customers;