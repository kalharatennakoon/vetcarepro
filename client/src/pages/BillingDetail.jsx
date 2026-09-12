import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getBillById, recordPayment } from '../services/billingService';
import { sendInvoiceEmail } from '../services/emailService';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';
import '../styles/BillingDetailModern.css';

const BillingDetail = () => {
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const errorRef = useRef(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_method: 'cash',
    payment_reference: '',
    card_type: '',
    bank_name: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [emailNote, setEmailNote] = useState('');
  const [emailSending, setEmailSending] = useState(false);

  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const handleEmailInvoice = async () => {
    setEmailSending(true);
    try {
      const res = await sendInvoiceEmail(id, emailNote);
      showSuccess(res.message || 'Invoice sent successfully');
      setEmailModal(false);
      setEmailNote('');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to send invoice email');
    } finally {
      setEmailSending(false);
    }
  };

  useEffect(() => {
    fetchBill();
  }, [id]);

  useEffect(() => {
    // Check if we should open the payment form
    if (location.state?.openPaymentForm && bill) {
      setShowPaymentForm(true);
    }
  }, [location.state?.openPaymentForm, bill]);

  const fetchBill = async () => {
    try {
      setLoading(true);
      const response = await getBillById(id);
      setBill(response.data.bill);
      setError('');
      
      // Set default payment amount to remaining balance
      setPaymentData(prev => ({
        ...prev,
        amount: response.data.bill.balance_amount > 0
          ? response.data.bill.balance_amount.toString()
          : ''
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load bill');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    
    if (parseFloat(paymentData.amount) <= 0) {
      showError('Payment amount must be greater than 0');
      return;
    }

    if (parseFloat(paymentData.amount) > parseFloat(bill.balance_amount)) {
      showError('Payment amount cannot exceed balance amount');
      return;
    }

    try {
      setSubmitting(true);
      await recordPayment(id, {
        ...paymentData,
        amount: parseFloat(paymentData.amount)
      });
      
      showSuccess('Payment recorded successfully');
      setShowPaymentForm(false);
      setPaymentData({ amount: '', payment_method: 'cash', payment_reference: '', card_type: '', bank_name: '', notes: '' });
      fetchBill(); // Refresh bill data
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to record payment');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatPaymentMethod = (method) => {
    const labels = {
      cash: 'Cash',
      card: 'Debit/Credit Card',
      bank_transfer: 'Bank Transfer',
      mobile_payment: 'Mobile Payment/QR',
      insurance: 'Insurance',
    };
    return labels[method] || method;
  };

  const formatCurrency = (amount) => {
    return 'Rs. ' + new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      unpaid: { bg: '#fee2e2', color: '#991b1b', border: '#fecaca', text: 'UNPAID', icon: 'fa-clock' },
      partially_paid: { bg: '#fef3c7', color: '#92400e', border: '#fde68a', text: 'PARTIALLY PAID', icon: 'fa-adjust' },
      fully_paid: { bg: '#dcfce7', color: '#166534', border: '#bbf7d0', text: 'FULLY PAID', icon: 'fa-circle-check' },
      overdue: { bg: '#fee2e2', color: '#991b1b', border: '#fecaca', text: 'OVERDUE', icon: 'fa-circle-exclamation' },
      cancelled: { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', text: 'CANCELLED', icon: 'fa-ban' }
    };

    const config = statusConfig[status] || statusConfig.unpaid;

    return (
      <span
        className="inv-status-pill"
        style={{
          backgroundColor: config.bg,
          color: config.color,
          border: `1px solid ${config.border}`
        }}
      >
        <i className={`fas ${config.icon}`}></i>
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: '#64748b' }}>
          <div style={{ border: '3px solid #e2e8f0', borderTop: '3px solid #2563eb', borderRadius: '50%', width: '42px', height: '42px', animation: 'spin 1s linear infinite', marginBottom: '1rem' }}></div>
          <p>Loading bill details...</p>
        </div>
      </Layout>
    );
  }

  if (error || !bill) {
    return (
      <Layout>
        <div ref={errorRef} style={{ maxWidth: '600px', margin: '3rem auto', padding: '2rem', background: '#ffffff', border: '1px solid #fee2e2', borderRadius: '16px', textAlign: 'center' }}>
          <h2 style={{ color: '#dc2626', margin: '0 0 1rem 0' }}>Error</h2>
          <p style={{ color: '#4b5563', marginBottom: '1.5rem' }}>{error || 'Bill not found'}</p>
          <button onClick={() => navigate('/billing')} className="inv-detail-back-btn">
            <i className="fas fa-arrow-left"></i> Back to Billing
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <style>{`
        @media print {
          /* Hide everything except invoice */
          nav, header, aside, footer, button, .no-print {
            display: none !important;
          }

          @page {
            size: A4 portrait;
            margin: 8mm;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            overflow: hidden !important;
          }

          /* Scale invoice to fit one page */
          .print-invoice-container {
            display: block !important;
            width: 194mm !important;
            max-width: 194mm !important;
            margin: 0 !important;
            padding: 10px 14px !important;
            box-sizing: border-box !important;
            transform-origin: top left !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            page-break-inside: avoid !important;
          }

          /* Compact spacing for print */
          .print-invoice-container h1 {
            font-size: 22px !important;
            margin: 0 0 4px 0 !important;
          }
          .print-invoice-container h3 {
            font-size: 10px !important;
            margin: 0 0 6px 0 !important;
          }
          .print-invoice-container p,
          .print-invoice-container td,
          .print-invoice-container th,
          .print-invoice-container span {
            font-size: 10px !important;
          }
          .print-invoice-container table {
            font-size: 10px !important;
          }
          .print-invoice-container th,
          .print-invoice-container td {
            padding: 5px 7px !important;
          }
          .print-invoice-container hr,
          .print-invoice-container [style*="margin: 24px 0"],
          .print-invoice-container [style*="margin: 32px"] {
            margin: 8px 0 !important;
          }

          /* Remove shadows for print */
          .invoice-card-print {
            box-shadow: none !important;
            border: 1px solid #ccc !important;
            background: white !important;
          }

          /* Print footer - pinned to bottom of page */
          .print-footer {
            display: block !important;
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            padding: 6px 14px !important;
            border-top: 1px solid #999 !important;
            text-align: center !important;
            font-size: 9px !important;
            background: white !important;
            line-height: 1.5 !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
      <div id="billing-detail-top" className="inv-detail-container">
        {/* Navigation & Action Top Bar */}
        <div className="inv-detail-top-nav no-print">
          <button onClick={() => navigate('/billing')} className="inv-detail-back-btn">
            <i className="fas fa-arrow-left"></i>
            <span>Back to Billing</span>
          </button>
          <div className="inv-detail-actions">
            {(user?.role === 'admin' || user?.role === 'receptionist') && bill.payment_status !== 'fully_paid' && bill.payment_status !== 'cancelled' && !showPaymentForm && (
              <button
                onClick={() => {
                  setShowPaymentForm(true);
                  setTimeout(() => document.getElementById('payment-form-section')?.scrollIntoView({ behavior: 'smooth' }), 50);
                }}
                className="inv-btn-pay"
              >
                <i className="fas fa-credit-card"></i>
                <span>Record Payment</span>
              </button>
            )}
            {(user?.role === 'admin' || user?.role === 'receptionist') && (
              <button
                onClick={() => setEmailModal(true)}
                className="inv-btn-email"
              >
                <i className="fas fa-envelope"></i>
                <span>Email Invoice</span>
              </button>
            )}
            {(user?.role === 'admin' || user?.role === 'receptionist') && (
              <button
                onClick={() => window.print()}
                className="inv-btn-print"
              >
                <i className="fas fa-print"></i>
                <span>Print Invoice</span>
              </button>
            )}
          </div>
        </div>

        {/* Invoice Main Card */}
        <div className="inv-main-card print-invoice-container invoice-card-print">
          {/* Invoice Header */}
          <div className="inv-header-row">
            <div>
              <h1 className="inv-title">INVOICE</h1>
              <p className="inv-number">#{bill.bill_number}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              {getStatusBadge(bill.payment_status)}
              <p className="inv-info-text">
                <strong>Generated:</strong> {new Date().toLocaleString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}
              </p>
            </div>
          </div>

          <div className="inv-divider"></div>

          {/* Customer & Staff Information */}
          <div className="inv-info-grid">
            <div className="inv-info-block">
              <span className="inv-info-header">Bill To:</span>
              <h3 className="inv-customer-name">{bill.customer_name}</h3>
              {bill.customer_email && <p className="inv-info-text"><i className="fas fa-envelope" style={{ marginRight: '0.4rem', color: '#94a3b8' }}></i>{bill.customer_email}</p>}
              {bill.customer_phone && <p className="inv-info-text"><i className="fas fa-phone" style={{ marginRight: '0.4rem', color: '#94a3b8' }}></i>{bill.customer_phone}</p>}
              {bill.customer_address && <p className="inv-info-text"><i className="fas fa-location-dot" style={{ marginRight: '0.4rem', color: '#94a3b8' }}></i>{bill.customer_address}</p>}
            </div>
            <div className="inv-info-block" style={{ textAlign: 'right', alignItems: 'flex-end' }}>
              <span className="inv-info-header">Created By:</span>
              <p className="inv-customer-name" style={{ fontSize: '1rem' }}>{bill.created_by_name || 'N/A'}</p>
              {bill.created_at && <p className="inv-info-text"><strong>Created:</strong> {formatDate(bill.created_at)}</p>}
              {bill.updated_at && bill.updated_at !== bill.created_at && <p className="inv-info-text"><strong>Updated:</strong> {formatDate(bill.updated_at)}</p>}
            </div>
          </div>

          <div className="inv-divider"></div>

          {/* Items Table */}
          <div>
            <span className="inv-info-header" style={{ display: 'block', marginBottom: '0.75rem' }}>Line Items</span>
            <div className="inv-table-wrapper">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th className="inv-th" style={{ textAlign: 'left' }}>Item</th>
                    <th className="inv-th" style={{ textAlign: 'left' }}>Type</th>
                    <th className="inv-th" style={{ textAlign: 'right' }}>Qty</th>
                    <th className="inv-th" style={{ textAlign: 'right' }}>Unit Price</th>
                    <th className="inv-th" style={{ textAlign: 'right' }}>Discount</th>
                    <th className="inv-th" style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.items && bill.items.map((item) => (
                    <tr key={item.billing_item_id} className="inv-table-row">
                      <td className="inv-td" style={{ fontWeight: '600' }}>{item.item_name}</td>
                      <td className="inv-td">
                        <span className="inv-item-type-badge">
                          {item.item_type === 'inventory_item' ? 'Inventory Item' : item.item_type === 'service' ? 'Service' : item.item_type || '-'}
                        </span>
                      </td>
                      <td className="inv-td" style={{ textAlign: 'right' }}>{item.quantity}</td>
                      <td className="inv-td" style={{ textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                      <td className="inv-td" style={{ textAlign: 'right' }}>{formatCurrency(item.discount)}</td>
                      <td className="inv-td" style={{ textAlign: 'right', fontWeight: '700' }}>{formatCurrency(item.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Section */}
          <div className="inv-totals-wrapper">
            <div className="inv-totals-box">
              <div className="inv-total-line">
                <span>Subtotal</span>
                <span>{formatCurrency(bill.subtotal)}</span>
              </div>
              {bill.discount_amount > 0 && (
                <div className="inv-total-line">
                  <span>Discount ({bill.discount_percentage}%)</span>
                  <span style={{ color: '#dc2626' }}>-{formatCurrency(bill.discount_amount)}</span>
                </div>
              )}
              {bill.tax_amount > 0 && (
                <div className="inv-total-line">
                  <span>Tax ({bill.tax_percentage}%)</span>
                  <span>{formatCurrency(bill.tax_amount)}</span>
                </div>
              )}
              <div className="inv-total-line-bold">
                <span>Total Amount</span>
                <span>{formatCurrency(bill.total_amount)}</span>
              </div>
              <div className="inv-total-line" style={{ fontWeight: '600', color: '#166534' }}>
                <span>Paid Amount</span>
                <span>{formatCurrency(bill.paid_amount)}</span>
              </div>
              <div className="inv-total-line-bold" style={{ color: '#dc2626', paddingTop: '0.35rem' }}>
                <span>Balance Due</span>
                <span>{formatCurrency(bill.balance_amount)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {bill.notes && (
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
              <span className="inv-info-header">Notes</span>
              <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.875rem', color: '#334155', lineHeight: '1.5' }}>{bill.notes}</p>
            </div>
          )}
        </div>

        {/* Cancellation Reason (Internal) */}
        {bill.payment_status === 'cancelled' && (
          <div className="inv-sec-card no-print" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fas fa-ban"></i>
              Invoice Cancelled
            </h2>
            <div style={{ fontSize: '0.9rem', color: '#7f1d1d' }}>
              <span className="inv-info-header" style={{ color: '#991b1b' }}>Reason: </span>
              <span>{bill.cancellation_reason}</span>
            </div>
          </div>
        )}

        {/* Linked Appointment (Internal) */}
        {bill.appointment_id && (
          <div className="inv-sec-card no-print" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fas fa-calendar-check" style={{ color: '#2563eb' }}></i>
                Linked Appointment
              </h2>
              <button
                onClick={() => navigate('/appointments', { state: { highlightAppointmentId: bill.appointment_id, appointmentDate: bill.appointment_date, appointmentStatus: 'completed' } })}
                className="inv-detail-back-btn"
                style={{ color: '#1d4ed8', borderColor: '#bfdbfe', background: '#ffffff', padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
              >
                View in Appointments
              </button>
            </div>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div>
                <span className="inv-info-header">Appointment ID</span>
                <p style={{ margin: '0.2rem 0 0 0', fontWeight: '700', color: '#1e3a8a', fontSize: '0.95rem' }}>#{bill.appointment_id}</p>
              </div>
              {bill.pet_name && (
                <div>
                  <span className="inv-info-header">Pet</span>
                  <p style={{ margin: '0.2rem 0 0 0', fontWeight: '700', color: '#1e3a8a', fontSize: '0.95rem' }}>
                    {bill.pet_name}{bill.species && ` (${bill.species.charAt(0).toUpperCase() + bill.species.slice(1)})`}
                  </p>
                </div>
              )}
              {bill.appointment_type && (
                <div>
                  <span className="inv-info-header">Type</span>
                  <p style={{ margin: '0.2rem 0 0 0', fontWeight: '700', color: '#1e3a8a', fontSize: '0.95rem', textTransform: 'capitalize' }}>
                    {bill.appointment_type.replace('_', ' ')}
                  </p>
                </div>
              )}
              {bill.appointment_date && (
                <div>
                  <span className="inv-info-header">Date</span>
                  <p style={{ margin: '0.2rem 0 0 0', fontWeight: '700', color: '#1e3a8a', fontSize: '0.95rem' }}>
                    {new Date(bill.appointment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </div>
              )}
              {bill.veterinarian_name && (
                <div>
                  <span className="inv-info-header">Veterinarian</span>
                  <p style={{ margin: '0.2rem 0 0 0', fontWeight: '700', color: '#1e3a8a', fontSize: '0.95rem' }}>
                    Dr. {bill.veterinarian_name}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment Form (Internal) */}
        {showPaymentForm && (
          <div id="payment-form-section" className="inv-sec-card no-print">
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: '#0f172a' }}>Record Payment</h2>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>Fields marked with <span style={{ color: '#ef4444' }}>*</span> are required.</p>
            <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div>
                  <label className="inv-info-header">Amount <span style={{ color: '#dc2626' }}>*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                    required
                    max={bill.balance_amount}
                  />
                  <small style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                    Maximum: {formatCurrency(bill.balance_amount)}
                  </small>
                </div>
                <div>
                  <label className="inv-info-header">Payment Method <span style={{ color: '#dc2626' }}>*</span></label>
                  <select
                    value={paymentData.payment_method}
                    onChange={(e) => setPaymentData({...paymentData, payment_method: e.target.value})}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', backgroundColor: 'white', boxSizing: 'border-box' }}
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Debit/Credit Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="mobile_payment">Mobile Payment/QR</option>
                    <option value="insurance">Insurance</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div>
                  <label className="inv-info-header">Reference Number</label>
                  <input
                    type="text"
                    value={paymentData.payment_reference}
                    onChange={(e) => setPaymentData({...paymentData, payment_reference: e.target.value})}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                    placeholder="Transaction ID, Check #, etc."
                  />
                </div>
                {paymentData.payment_method === 'card' && (
                  <div>
                    <label className="inv-info-header">Card Type</label>
                    <input
                      type="text"
                      value={paymentData.card_type}
                      onChange={(e) => setPaymentData({...paymentData, card_type: e.target.value})}
                      style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                      placeholder="Visa, Mastercard, etc."
                    />
                  </div>
                )}
                {paymentData.payment_method === 'bank_transfer' && (
                  <div>
                    <label className="inv-info-header">Bank Name</label>
                    <input
                      type="text"
                      value={paymentData.bank_name}
                      onChange={(e) => setPaymentData({...paymentData, bank_name: e.target.value})}
                      style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                      placeholder="Bank name"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="inv-info-header">Notes</label>
                <textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                  rows={2}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  placeholder="Additional payment notes..."
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentForm(false);
                    document.getElementById('billing-detail-top')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inv-detail-back-btn"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="inv-btn-pay"
                  disabled={submitting}
                >
                  <i className={`fas fa-${submitting ? 'circle-notch fa-spin' : 'credit-card'}`}></i>
                  <span>{submitting ? 'Processing...' : 'Record Payment'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Payment History */}
        {bill.payments && bill.payments.length > 0 && (
          <div className="inv-sec-card no-print">
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>Payment History</h2>
            <div className="inv-table-wrapper">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th className="inv-th" style={{ textAlign: 'left' }}>Date</th>
                    <th className="inv-th" style={{ textAlign: 'left' }}>Amount</th>
                    <th className="inv-th" style={{ textAlign: 'left' }}>Method</th>
                    <th className="inv-th" style={{ textAlign: 'left' }}>Reference</th>
                    <th className="inv-th" style={{ textAlign: 'left' }}>Received By</th>
                    <th className="inv-th" style={{ textAlign: 'left' }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.payments.map((payment) => (
                    <tr key={payment.payment_id} className="inv-table-row">
                      <td className="inv-td">{formatDate(payment.payment_date)}</td>
                      <td className="inv-td" style={{ fontWeight: '700', color: '#166534' }}>
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="inv-td">
                        <span style={{ fontSize: '0.72rem', fontWeight: '700', background: '#dbeafe', color: '#1e40af', padding: '0.15rem 0.55rem', borderRadius: '6px' }}>
                          {payment.payment_method ? formatPaymentMethod(payment.payment_method) : '-'}
                        </span>
                      </td>
                      <td className="inv-td" style={{ fontFamily: 'monospace' }}>{payment.payment_reference || '-'}</td>
                      <td className="inv-td">{payment.received_by_name}</td>
                      <td className="inv-td">{payment.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Print Footer - Only visible when printing */}
        <div className="print-footer" style={{ display: 'none' }}>
          <strong>Pro Pet Animal Hospital</strong><br />
          Kurunegala, Sri Lanka<br />
          Phone: +94 37 123 4567 | Email: info@propet.lk<br />
          <small>Printed on: {new Date().toLocaleString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })}</small>
        </div>
      </div>

      {/* Email Invoice Modal */}
      {emailModal && (
        <div className="pet-modal-overlay" onClick={() => setEmailModal(false)}>
          <div className="pet-modal-card" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="pet-modal-header">
              <h3 className="pet-modal-title">
                <i className="fas fa-envelope" style={{ color: '#0d9488' }}></i>
                Email Invoice
              </h3>
              <button onClick={() => setEmailModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.1rem', color: '#64748b', cursor: 'pointer' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="pet-modal-body">
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155' }}>
                Send invoice <strong>#{bill.bill_number}</strong> to <strong>{bill.customer_email || 'Customer'}</strong>.
              </p>
              <div>
                <label className="inv-info-header" style={{ marginBottom: '0.35rem' }}>Note to Customer <span style={{ color: '#94a3b8', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                <textarea
                  value={emailNote}
                  onChange={(e) => setEmailNote(e.target.value)}
                  rows={4}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  placeholder="Add a note or message to include in the email..."
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => { setEmailModal(false); setEmailNote(''); }}
                  className="inv-detail-back-btn"
                  disabled={emailSending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEmailInvoice}
                  className="inv-btn-email"
                  disabled={emailSending}
                >
                  <i className={`fas fa-${emailSending ? 'spinner fa-spin' : 'paper-plane'}`}></i>
                  <span>{emailSending ? 'Sending...' : 'Send Email'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default BillingDetail;
