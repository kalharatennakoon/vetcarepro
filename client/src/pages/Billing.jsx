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
  
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchBills();
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
      <div style={styles.pageHeader}>
        <div>
          <h2 style={styles.title}>Billing & Invoices</h2>
          <p style={styles.subtitle}>Manage invoices and track payments</p>
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
        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search by invoice number, customer name, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        
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
                    <th style={styles.th}>Paid</th>
                    <th style={styles.th}>Balance</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((bill) => (
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
                      <td style={styles.td}>{formatCurrency(bill.paid_amount)}</td>
                      <td style={styles.td}>
                        <span style={{
                          color: parseFloat(bill.balance_amount) > 0 ? '#DC2626' : '#059669',
                          fontWeight: '600'
                        }}>
                          {formatCurrency(bill.balance_amount)}
                        </span>
                      </td>
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
                              style={styles.payButton}
                              title="Record Payment"
                            >
                              Pay
                            </button>
                          )}
                          {user?.role === 'admin' && (
                            <button
                              onClick={() => handleDelete(bill.bill_id)}
                              style={styles.deleteButton}
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
            </div>
          )}
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
    marginBottom: '32px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1F2937',
    margin: 0
  },
  subtitle: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '4px 0 0 0'
  },
  addButton: {
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'background-color 0.2s'
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  statCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #E5E7EB'
  },
  statLabel: {
    fontSize: '14px',
    color: '#6B7280',
    marginBottom: '8px'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1F2937'
  },
  filtersContainer: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    flexWrap: 'wrap'
  },
  searchContainer: {
    flex: 1,
    minWidth: '300px'
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #D1D5DB',
    fontSize: '14px',
    outline: 'none'
  },
  filterSelect: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #D1D5DB',
    fontSize: '14px',
    backgroundColor: 'white',
    cursor: 'pointer',
    outline: 'none'
  },
  overdueButton: {
    backgroundColor: '#DC2626',
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    border: '1px solid #FCA5A5',
    color: '#991B1B',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '60px 20px',
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
    padding: '60px 20px',
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #E5E7EB'
  },
  emptyStateButton: {
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    marginTop: '16px'
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
    border: '1px solid #E5E7EB'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    backgroundColor: '#F9FAFB',
    padding: '14px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid #E5E7EB'
  },
  tr: {
    borderBottom: '1px solid #E5E7EB',
    transition: 'background-color 0.2s'
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#1F2937'
  },
  billNumber: {
    fontWeight: '600',
    color: '#3B82F6'
  },
  customerName: {
    fontWeight: '500',
    marginBottom: '2px'
  },
  customerPhone: {
    fontSize: '12px',
    color: '#6B7280'
  },
  badge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    display: 'inline-block'
  },
  actionButtons: {
    display: 'flex',
    gap: '8px'
  },
  viewButton: {
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500'
  },
  payButton: {
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500'
  },
  deleteButton: {
    backgroundColor: '#DC2626',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500'
  }
};

export default Billing;
