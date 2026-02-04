import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBills, deleteBill, getOverdueBills } from '../services/billingService';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const Billing = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [showOverdue, setShowOverdue] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ total: 0, totalRevenue: 0, totalPaid: 0, totalPending: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchBills();
    setCurrentPage(1);
  }, [search, paymentStatus, showOverdue]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      let response;
      
      if (showOverdue) {
        response = await getOverdueBills();
        setBills(response.data.bills);
      } else {
        const filters = {};
        if (search) filters.search = search;
        if (paymentStatus) filters.payment_status = paymentStatus;
        
        response = await getBills(filters);
        setBills(response.data.bills);
      }
      
      // Calculate stats
      const totalRevenue = response.data.bills.reduce((sum, bill) => sum + parseFloat(bill.total_amount || 0), 0);
      const totalPaid = response.data.bills.reduce((sum, bill) => sum + parseFloat(bill.paid_amount || 0), 0);
      const totalPending = response.data.bills.reduce((sum, bill) => sum + parseFloat(bill.balance_amount || 0), 0);
      
      setStats({
        total: response.total || response.data.bills.length,
        totalRevenue,
        totalPaid,
        totalPending
      });
      
      setError('');
    } catch (err) {
      setError('Failed to load bills');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this bill?')) {
      return;
    }

    try {
      await deleteBill(id);
      fetchBills();
    } catch (err) {
      alert('Failed to cancel bill');
      console.error(err);
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(bills.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBills = bills.slice(startIndex, endIndex);

  // Helper functions for pagination
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      unpaid: { backgroundColor: '#FEE2E2', color: '#991B1B' },
      partially_paid: { backgroundColor: '#FEF3C7', color: '#92400E' },
      fully_paid: { backgroundColor: '#D1FAE5', color: '#065F46' },
      overdue: { backgroundColor: '#FECACA', color: '#7F1D1D' }
    };

    return (
      <span style={{
        ...styles.badge,
        ...statusStyles[status]
      }}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const formatCurrency = (amount) => {
    return 'Rs. ' + new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Layout>
      {/* Page Header */}
      <div style={styles.header}>
        <div style={styles.pageHeaderContent}>
          <i className="fas fa-receipt" style={styles.headerIcon}></i>
          <div>
            <h1 style={styles.title}>Billing & Invoices</h1>
            <p style={styles.subtitle}>Manage invoices and track payments</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/billing/new')}
          style={styles.addButton}
        >
          + Create Invoice
        </button>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Invoices</div>
          <div style={styles.statValue}>{stats.total}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Revenue</div>
          <div style={{...styles.statValue, color: '#059669'}}>{formatCurrency(stats.totalRevenue)}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Paid</div>
          <div style={{...styles.statValue, color: '#0891B2'}}>{formatCurrency(stats.totalPaid)}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Pending Payment</div>
          <div style={{...styles.statValue, color: '#DC2626'}}>{formatCurrency(stats.totalPending)}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filtersContainer}>
        <input
          type="text"
          placeholder="Search by invoice number, customer name, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        
        <select
          value={paymentStatus}
          onChange={(e) => setPaymentStatus(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Status</option>
          <option value="unpaid">Unpaid</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="fully_paid">Fully Paid</option>
        </select>

        <button 
          onClick={() => {
            setShowOverdue(!showOverdue);
            setPaymentStatus('');
            setSearch('');
          }}
          style={{...styles.overdueButton, backgroundColor: showOverdue ? '#DC2626' : '#EF4444'}}
        >
          {showOverdue ? 'Show All' : 'View Overdue'}
        </button>
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
          <p>Loading bills...</p>
        </div>
      ) : (
        <>
          {/* Bills Table */}
          {bills.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No bills found</p>
              <button 
                onClick={() => navigate('/billing/new')}
                style={styles.emptyStateButton}
              >
                Create First Invoice
              </button>
            </div>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Invoice #</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Customer</th>
                    <th style={styles.th}>Total</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentBills.map((bill) => (
                    <tr key={bill.bill_id} style={styles.tr}>
                      <td style={styles.td}>
                        <span style={styles.billNumber}>{bill.bill_number}</span>
                      </td>
                      <td style={styles.td}>{formatDate(bill.bill_date)}</td>
                      <td style={styles.td}>
                        <div>
                          <div style={styles.customerName}>{bill.customer_name}</div>
                          <div style={styles.customerPhone}>{bill.customer_phone}</div>
                        </div>
                      </td>
                      <td style={styles.td}>{formatCurrency(bill.total_amount)}</td>
                      <td style={styles.td}>
                        {getStatusBadge(bill.payment_status)}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionButtons}>
                          <button
                            onClick={() => navigate(`/billing/${bill.bill_id}`)}
                            style={styles.viewButton}
                            title="View Details"
                          >
                            View
                          </button>
                          {(user?.role === 'admin' || user?.role === 'receptionist') && bill.payment_status !== 'fully_paid' && (
                            <button
                              onClick={() => navigate(`/billing/${bill.bill_id}`)}
                              style={styles.viewButton}
                              title="Record Payment"
                            >
                              Pay
                            </button>
                          )}
                          {user?.role === 'admin' && (
                            <button
                              onClick={() => handleDelete(bill.bill_id)}
                              style={styles.viewButton}
                              title="Cancel Invoice"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={styles.paginationContainer}>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={currentPage === 1 ? styles.paginationButtonDisabled : styles.paginationButton}
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>

                  {getPageNumbers().map((pageNum, index) => (
                    <span key={index}>
                      {pageNum === '...' ? (
                        <span style={styles.paginationEllipsis}>...</span>
                      ) : (
                        <button
                          onClick={() => handlePageChange(pageNum)}
                          style={currentPage === pageNum ? styles.paginationButtonActive : styles.paginationButton}
                        >
                          {pageNum}
                        </button>
                      )}
                    </span>
                  ))}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={currentPage === totalPages ? styles.paginationButtonDisabled : styles.paginationButton}
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Layout>
  );
};

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '0.75rem',
    gap: '1rem',
  },
  pageHeaderContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  headerIcon: {
    fontSize: '30px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1F2937',
    margin: 0
  },
  subtitle: {
    fontSize: '12px',
    color: '#6B7280',
    margin: '2px 0 0 0'
  },
  addButton: {
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'background-color 0.2s',
    whiteSpace: 'nowrap',
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '6px',
    marginBottom: '0.75rem'
  },
  statCard: {
    backgroundColor: 'white',
    padding: '8px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #E5E7EB'
  },
  statLabel: {
    fontSize: '11px',
    color: '#6B7280',
    marginBottom: '4px',
    fontWeight: '500',
  },
  statValue: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1F2937'
  },
  filtersContainer: {
    display: 'flex',
    gap: '6px',
    marginBottom: '0.75rem',
    flexWrap: 'wrap',
  },
  searchContainer: {
    flex: '1 1 150px',
    minWidth: '0',
  },
  searchInput: {
    width: '100%',
    padding: '5px',
    borderRadius: '6px',
    border: '1px solid #D1D5DB',
    fontSize: '12px',
    outline: 'none'
  },
  filterSelect: {
    padding: '5px',
    borderRadius: '6px',
    border: '1px solid #D1D5DB',
    fontSize: '12px',
    backgroundColor: 'white',
    cursor: 'pointer',
    outline: 'none'
  },
  overdueButton: {
    backgroundColor: '#DC2626',
    color: 'white',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    border: '1px solid #FCA5A5',
    color: '#991B1B',
    padding: '8px',
    borderRadius: '6px',
    marginBottom: '0.75rem',
    fontSize: '12px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem 1rem',
    color: '#6B7280'
  },
  spinner: {
    border: '4px solid #E5E7EB',
    borderTop: '4px solid #3B82F6',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '2rem 1rem',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #E5E7EB'
  },
  emptyStateButton: {
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    marginTop: '1rem'
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 240px)',
    border: '1px solid #E5E7EB'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
    flex: 1,
    overflow: 'auto',
  },
  th: {
    backgroundColor: '#F9FAFB',
    padding: '6px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: '600',
    color: '#6B7280',
    borderBottom: '1px solid #E5E7EB',
    whiteSpace: 'nowrap',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  tr: {
    borderBottom: '1px solid #E5E7EB',
    transition: 'background-color 0.2s'
  },
  td: {
    padding: '6px',
    fontSize: '12px',
    color: '#1F2937'
  },
  billNumber: {
    fontWeight: '600',
    color: '#3B82F6'
  },
  customerName: {
    fontWeight: '500',
    marginBottom: '1px'
  },
  customerPhone: {
    fontSize: '11px',
    color: '#6B7280'
  },
  badge: {
    padding: '2px 6px',
    borderRadius: '8px',
    fontSize: '10px',
    fontWeight: '600',
    display: 'inline-block'
  },
  actionButtons: {
    display: 'flex',
    gap: '3px',
    flexWrap: 'wrap',
  },
  viewButton: {
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    padding: '3px 7px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '10px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
  },
  payButton: {
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    padding: '3px 7px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '10px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
  },
  deleteButton: {
    backgroundColor: '#DC2626',
    color: 'white',
    border: 'none',
    padding: '3px 7px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '10px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
  },
  paginationContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '3px',
    padding: '8px',
    borderTop: '1px solid #E5E7EB',
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
  },
};

export default Billing;
