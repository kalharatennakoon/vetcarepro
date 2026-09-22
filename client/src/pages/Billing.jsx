import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBills, deleteBill, getOverdueBills } from '../services/billingService';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import '../styles/BillingModern.css';

const Billing = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [showOverdue, setShowOverdue] = useState(false);
  const [error, setError] = useState('');
  const errorRef = useRef(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);
  const [stats, setStats] = useState({ total: 0, totalRevenue: 0, totalPaid: 0, totalPending: 0 });
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [pendingCancelId, setPendingCancelId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchBills();
    setCurrentPage(1);
  }, [search, paymentStatus, showOverdue]);

  const fetchBills = async () => {
    try {
      setLoading(true);

      // Fetch filtered list for the table
      let response;
      if (showOverdue) {
        response = await getOverdueBills();
      } else {
        const filters = {};
        if (search) filters.search = search;
        if (paymentStatus) filters.payment_status = paymentStatus;
        response = await getBills(filters);
      }
      setBills(response.data.bills);

      // Fetch all bills (no filter) for stats — always reflects full picture
      const allResponse = await getBills({});
      const activeBills = allResponse.data.bills.filter(b => b.payment_status !== 'cancelled');
      const totalRevenue = activeBills.reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0);
      const totalPaid = activeBills.reduce((sum, b) => sum + parseFloat(b.paid_amount || 0), 0);
      const totalPending = activeBills.reduce((sum, b) => sum + parseFloat(b.balance_amount || 0), 0);
      setStats({ total: activeBills.length, totalRevenue, totalPaid, totalPending });

      setError('');
    } catch (err) {
      setError('Failed to load bills');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    setPendingCancelId(id);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const confirmCancelBill = async () => {
    if (!cancelReason) return;
    try {
      await deleteBill(pendingCancelId, cancelReason);
      setShowCancelModal(false);
      setPendingCancelId(null);
      setCancelReason('');
      setCancelSuccess(true);
      setTimeout(() => setCancelSuccess(false), 4000);
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

  const getStatusBadge = (status, dueDate) => {
    const isOverdue =
      (status === 'unpaid' || status === 'partially_paid') &&
      dueDate &&
      new Date(dueDate) < new Date(new Date().toDateString());
    const effectiveStatus = isOverdue ? 'overdue' : status;

    const statusClasses = {
      unpaid: 'billing-status-badge status-unpaid',
      partially_paid: 'billing-status-badge status-partially-paid',
      fully_paid: 'billing-status-badge status-fully-paid',
      overdue: 'billing-status-badge status-overdue',
      cancelled: 'billing-status-badge status-cancelled'
    };

    return (
      <span className={statusClasses[effectiveStatus] || 'billing-status-badge'}>
        {effectiveStatus.replace('_', ' ').toUpperCase()}
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
      <div className="billing-container">
        {/* Page Header */}
        <div className="billing-header-card">
          <div className="billing-header-content">
            <div className="billing-header-icon">
              <i className="fas fa-receipt"></i>
            </div>
            <div>
              <h1 className="billing-header-title">Billing & Invoices</h1>
              <p className="billing-header-subtitle">Manage invoices and track payments</p>
            </div>
          </div>
          {(user?.role === 'admin' || user?.role === 'receptionist') ? (
            <button
              onClick={() => navigate('/billing/new')}
              className="billing-btn-create"
            >
              <i className="fas fa-plus"></i> Create Invoice
            </button>
          ) : (
            <div title="Only admins and receptionists can create invoices" className="billing-disabled-badge">
              <i className="fas fa-lock"></i>
              Create Invoice
            </div>
          )}
        </div>

        {/* Stats Cards — admin only */}
        {user?.role === 'admin' && (
          <div className="billing-stats-grid">
            <div className="billing-stat-card stat-total">
              <div className="billing-stat-label">Total Invoices</div>
              <div className="billing-stat-value">{stats.total}</div>
            </div>
            <div className="billing-stat-card stat-revenue">
              <div className="billing-stat-label">Total Revenue</div>
              <div className="billing-stat-value val-revenue">{formatCurrency(stats.totalRevenue)}</div>
            </div>
            <div className="billing-stat-card stat-paid">
              <div className="billing-stat-label">Total Paid</div>
              <div className="billing-stat-value val-paid">{formatCurrency(stats.totalPaid)}</div>
            </div>
            <div className="billing-stat-card stat-pending">
              <div className="billing-stat-label">Pending Payment</div>
              <div className="billing-stat-value val-pending">{formatCurrency(stats.totalPending)}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="billing-filters-card">
          <div className="billing-search-box">
            <i className="fas fa-search billing-search-icon"></i>
            <input
              type="text"
              placeholder="Search by invoice number, customer name, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="billing-search-input"
            />
          </div>
          
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="billing-filter-select"
          >
            <option value="">All Status</option>
            <option value="unpaid">Unpaid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="fully_paid">Fully Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <button 
            onClick={() => {
              setShowOverdue(!showOverdue);
              setPaymentStatus('');
              setSearch('');
            }}
            className={`billing-btn-overdue ${showOverdue ? 'is-active' : 'is-inactive'}`}
          >
            <i className="fas fa-exclamation-triangle"></i>
            {showOverdue ? 'Show All' : 'View Overdue'}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div ref={errorRef} className="billing-alert-error">
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}

        {/* Cancel Success Notification */}
        {cancelSuccess && (
          <div className="billing-alert-success">
            <i className="fas fa-check-circle"></i>
            Bill cancelled successfully.
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="billing-loading-box">
            <div className="billing-spinner"></div>
            <p>Loading bills...</p>
          </div>
        ) : (
          <>
            {/* Bills Table */}
            {bills.length === 0 ? (
              <div className="billing-empty-card">
                <i className="fas fa-receipt billing-empty-icon"></i>
                <div className="billing-empty-text">No bills found</div>
                {!showOverdue && (user?.role === 'admin' || user?.role === 'receptionist') && (
                  <button
                    onClick={() => navigate('/billing/new')}
                    className="billing-btn-create"
                  >
                    <i className="fas fa-plus"></i> Create First Invoice
                  </button>
                )}
              </div>
            ) : (
              <div className="billing-table-card">
                <div className="billing-table-wrapper">
                  <table className="billing-table">
                    <thead>
                      <tr>
                        <th style={{ width: '13%' }}>Invoice #</th>
                        <th style={{ width: '14%' }}>Date</th>
                        <th style={{ width: '22%' }}>Customer</th>
                        <th style={{ width: '13%' }}>Total</th>
                        <th style={{ width: '13%' }}>Status</th>
                        <th style={{ width: '25%', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentBills.map((bill) => (
                        <tr key={bill.bill_id}>
                          <td>
                            <span className="billing-num-badge">{bill.bill_number}</span>
                          </td>
                          <td>{formatDate(bill.bill_date)}</td>
                          <td>
                            <div>
                              <div className="billing-cust-name">{bill.customer_name}</div>
                              <div className="billing-cust-phone">
                                <i className="fas fa-phone-alt"></i>
                                {bill.customer_phone}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="billing-amount-text">
                              {(() => {
                                const isOverdue =
                                  (bill.payment_status === 'unpaid' || bill.payment_status === 'partially_paid') &&
                                  bill.due_date &&
                                  new Date(bill.due_date) < new Date(new Date().toDateString());
                                return formatCurrency(
                                  isOverdue && parseFloat(bill.paid_amount) > 0
                                    ? bill.balance_amount
                                    : bill.total_amount
                                );
                              })()}
                            </span>
                          </td>
                          <td>
                            {getStatusBadge(bill.payment_status, bill.due_date)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="billing-actions-cell">
                              <button
                                onClick={() => navigate(`/billing/${bill.bill_id}`)}
                                className="billing-btn-act-view"
                                title="View Details"
                              >
                                <i className="fas fa-eye"></i> View
                              </button>
                              {(user?.role === 'admin' || user?.role === 'receptionist') && bill.payment_status !== 'fully_paid' && bill.payment_status !== 'cancelled' && (
                                <button
                                  onClick={() => navigate(`/billing/${bill.bill_id}`, { state: { openPaymentForm: true } })}
                                  className="billing-btn-act-pay"
                                  title="Record Payment"
                                >
                                  <i className="fas fa-credit-card"></i> Pay
                                </button>
                              )}
                              {user?.role === 'admin' && bill.payment_status === 'unpaid' && (
                                <button
                                  onClick={() => handleDelete(bill.bill_id)}
                                  className="billing-btn-act-cancel"
                                  title="Cancel Invoice"
                                >
                                  <i className="fas fa-ban"></i> Cancel
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Results Summary */}
                {bills.length > 0 && (
                  <div className="billing-summary-footer">
                    <div>
                      Showing <strong>{startIndex + 1}–{Math.min(endIndex, bills.length)}</strong> of <strong>{bills.length}</strong> records
                    </div>
                  </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="billing-pagination-bar">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="billing-pag-btn"
                    >
                      <i className="fas fa-chevron-left"></i>
                    </button>

                    {getPageNumbers().map((pageNum, index) => (
                      <span key={index}>
                        {pageNum === '...' ? (
                          <span className="billing-pag-ellipsis">...</span>
                        ) : (
                          <button
                            onClick={() => handlePageChange(pageNum)}
                            className={`billing-pag-btn ${currentPage === pageNum ? 'is-active' : ''}`}
                          >
                            {pageNum}
                          </button>
                        )}
                      </span>
                    ))}

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="billing-pag-btn"
                    >
                      <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Cancel Modal */}
        {showCancelModal && (
          <div className="billing-modal-backdrop" onClick={() => { setShowCancelModal(false); setPendingCancelId(null); setCancelReason(''); }}>
            <div className="billing-modal-box" onClick={e => e.stopPropagation()}>
              <div className="billing-modal-head">
                <h3 className="billing-modal-title">
                  <i className="fas fa-ban" style={{ color: '#e11d48' }}></i>
                  Cancel Bill
                </h3>
                <button onClick={() => { setShowCancelModal(false); setPendingCancelId(null); setCancelReason(''); }} className="billing-modal-close">
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="billing-modal-body">
                <p className="billing-modal-desc">
                  Are you sure you want to cancel this bill? This action cannot be undone.
                </p>
                <div className="billing-form-group">
                  <label className="billing-form-label">
                    Reason for cancellation <span style={{ color: '#e11d48' }}>*</span>
                  </label>
                  <select
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    className="billing-form-select"
                  >
                    <option value="">Select a reason...</option>
                    <option value="Duplicate bill">Duplicate bill</option>
                    <option value="Billing error">Billing error</option>
                    <option value="Customer request">Customer request</option>
                    <option value="Service not rendered">Service not rendered</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="billing-modal-actions">
                  <button
                    onClick={() => { setShowCancelModal(false); setPendingCancelId(null); setCancelReason(''); }}
                    className="billing-btn-modal-cancel"
                  >
                    Back
                  </button>
                  <button
                    onClick={confirmCancelBill}
                    disabled={!cancelReason}
                    className="billing-btn-modal-confirm"
                  >
                    <i className="fas fa-ban"></i>
                    Cancel Bill
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

export default Billing;
