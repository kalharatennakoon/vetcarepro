import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getBillById, recordPayment } from '../services/billingService';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const BillingDetail = () => {
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
  
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

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
      if (response.data.bill.balance_amount > 0) {
        setPaymentData(prev => ({
          ...prev,
          amount: response.data.bill.balance_amount.toString()
        }));
      }
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
      alert('Payment amount must be greater than 0');
      return;
    }
    
    if (parseFloat(paymentData.amount) > parseFloat(bill.balance_amount)) {
      alert('Payment amount cannot exceed balance amount');
      return;
    }

    try {
      setSubmitting(true);
      await recordPayment(id, {
        ...paymentData,
        amount: parseFloat(paymentData.amount)
      });
      
      alert('Payment recorded successfully');
      setShowPaymentForm(false);
      fetchBill(); // Refresh bill data
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record payment');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
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
      unpaid: { bg: '#FEE2E2', color: '#991B1B', text: 'UNPAID' },
      partially_paid: { bg: '#FEF3C7', color: '#92400E', text: 'PARTIALLY PAID' },
      fully_paid: { bg: '#D1FAE5', color: '#065F46', text: 'FULLY PAID' },
      overdue: { bg: '#FECACA', color: '#7F1D1D', text: 'OVERDUE' }
    };

    const config = statusConfig[status] || statusConfig.unpaid;

    return (
      <span style={{
        ...styles.statusBadge,
        backgroundColor: config.bg,
        color: config.color
      }}>
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading bill details...</p>
        </div>
      </Layout>
    );
  }

  if (error || !bill) {
    return (
      <Layout>
        <div style={styles.errorContainer}>
          <h2>Error</h2>
          <p style={styles.errorText}>{error || 'Bill not found'}</p>
          <button onClick={() => navigate('/billing')} style={styles.backButton}>
            Back to Billing
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
          
          * {
            overflow: visible !important;
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
          
          /* Page settings */
          @page {
            size: A4;
            margin: 15mm;
          }
          
          /* Show invoice container */
          .print-invoice-container {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            page-break-inside: avoid !important;
            overflow: visible !important;
          }
          
          /* Remove shadows for print */
          .invoice-card-print {
            box-shadow: none !important;
            border: 1px solid #000 !important;
            background: white !important;
            overflow: visible !important;
          }
          
          /* Print footer */
          .print-footer {
            display: block !important;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 15px;
            border-top: 2px solid #000;
            text-align: center;
            font-size: 10px;
            background: white;
          }
          
          /* Optimize colors for print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header} className="no-print">
          <button onClick={() => navigate('/billing')} style={styles.backButton}>
            ← Back to Billing
          </button>
          <div style={styles.headerActions}>
            {(user?.role === 'admin' || user?.role === 'receptionist') && bill.payment_status !== 'fully_paid' && (
              <button 
                onClick={() => setShowPaymentForm(!showPaymentForm)} 
                style={styles.paymentButton}
              >
                {showPaymentForm ? 'Cancel' : <><i className="fas fa-credit-card"></i> Record Payment</>}
              </button>
            )}
            {(user?.role === 'admin' || user?.role === 'receptionist') && (
              <button 
                onClick={() => window.print()} 
                style={styles.printButton}
              >
                <i className="fas fa-print"></i> Print Invoice
              </button>
            )}
          </div>
        </div>

        {/* Invoice Card */}
        <div style={styles.invoiceCard} className="print-invoice-container invoice-card-print">
          {/* Invoice Header */}
          <div style={styles.invoiceHeader}>
            <div>
              <h1 style={styles.invoiceTitle}>INVOICE</h1>
              <p style={styles.invoiceNumber}>{bill.bill_number}</p>
            </div>
            <div style={{textAlign: 'right'}}>
              {getStatusBadge(bill.payment_status)}
              <p style={styles.invoiceDate}>
                <strong>Invoice Generated:</strong> {new Date().toLocaleString('en-US', { 
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

          <div style={styles.divider}></div>

          {/* Customer Information */}
          <div style={styles.infoSection}>
            <div>
              <h3 style={styles.sectionTitle}>Bill To:</h3>
              <p style={styles.customerName}>{bill.customer_name}</p>
              {bill.customer_email && <p style={styles.infoText}>{bill.customer_email}</p>}
              {bill.customer_phone && <p style={styles.infoText}>{bill.customer_phone}</p>}
              {bill.customer_address && <p style={styles.infoText}>{bill.customer_address}</p>}
            </div>
            <div style={{textAlign: 'right'}}>
              <h3 style={styles.sectionTitle}>Created By:</h3>
              <p style={styles.infoText}>{bill.created_by_name || 'N/A'}</p>
            </div>
          </div>

          <div style={styles.divider}></div>

          {/* Items Table */}
          <div style={styles.itemsSection}>
            <h3 style={styles.sectionTitle}>Items</h3>
            <table style={styles.itemsTable}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>Item</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.thRight}>Quantity</th>
                  <th style={styles.thRight}>Unit Price</th>
                  <th style={styles.thRight}>Discount</th>
                  <th style={styles.thRight}>Total</th>
                </tr>
              </thead>
              <tbody>
                {bill.items && bill.items.map((item) => (
                  <tr key={item.billing_item_id} style={styles.tableRow}>
                    <td style={styles.td}>{item.item_name}</td>
                    <td style={styles.td}>
                      <span style={styles.itemTypeBadge}>
                        {item.item_type ? item.item_type.replace('_', ' ') : '-'}
                      </span>
                    </td>
                    <td style={styles.tdRight}>{item.quantity}</td>
                    <td style={styles.tdRight}>{formatCurrency(item.unit_price)}</td>
                    <td style={styles.tdRight}>{formatCurrency(item.discount)}</td>
                    <td style={styles.tdRight}><strong>{formatCurrency(item.total_price)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div style={styles.totalsSection}>
            <div style={styles.totalsGrid}>
              <div style={styles.totalRow}>
                <span>Subtotal:</span>
                <span>{formatCurrency(bill.subtotal)}</span>
              </div>
              {bill.discount_amount > 0 && (
                <div style={styles.totalRow}>
                  <span>Discount ({bill.discount_percentage}%):</span>
                  <span style={{color: '#DC2626'}}>-{formatCurrency(bill.discount_amount)}</span>
                </div>
              )}
              {bill.tax_amount > 0 && (
                <div style={styles.totalRow}>
                  <span>Tax ({bill.tax_percentage}%):</span>
                  <span>{formatCurrency(bill.tax_amount)}</span>
                </div>
              )}
              <div style={styles.divider}></div>
              <div style={styles.totalRowLarge}>
                <span>Total Amount:</span>
                <span>{formatCurrency(bill.total_amount)}</span>
              </div>
              <div style={styles.totalRowPaid}>
                <span>Paid Amount:</span>
                <span style={{color: '#059669'}}>{formatCurrency(bill.paid_amount)}</span>
              </div>
              <div style={styles.totalRowBalance}>
                <span>Balance Due:</span>
                <span style={{color: '#DC2626'}}>{formatCurrency(bill.balance_amount)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {bill.notes && (
            <div style={styles.notesSection}>
              <h3 style={styles.sectionTitle}>Notes:</h3>
              <p style={styles.notesText}>{bill.notes}</p>
            </div>
          )}
        </div>

        {/* Payment Form */}
        {showPaymentForm && (
          <div style={styles.paymentFormCard} className="no-print">
            <h2 style={styles.formTitle}>Record Payment</h2>
            <form onSubmit={handlePaymentSubmit}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                    style={styles.input}
                    required
                    max={bill.balance_amount}
                  />
                  <small style={styles.helpText}>
                    Maximum: {formatCurrency(bill.balance_amount)}
                  </small>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Payment Method *</label>
                  <select
                    value={paymentData.payment_method}
                    onChange={(e) => setPaymentData({...paymentData, payment_method: e.target.value})}
                    style={styles.input}
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="mobile_payment">Mobile Payment</option>
                    <option value="insurance">Insurance</option>
                  </select>
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Reference Number</label>
                  <input
                    type="text"
                    value={paymentData.payment_reference}
                    onChange={(e) => setPaymentData({...paymentData, payment_reference: e.target.value})}
                    style={styles.input}
                    placeholder="Transaction ID, Check #, etc."
                  />
                </div>
                {paymentData.payment_method === 'card' && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Card Type</label>
                    <input
                      type="text"
                      value={paymentData.card_type}
                      onChange={(e) => setPaymentData({...paymentData, card_type: e.target.value})}
                      style={styles.input}
                      placeholder="Visa, Mastercard, etc."
                    />
                  </div>
                )}
                {paymentData.payment_method === 'bank_transfer' && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Bank Name</label>
                    <input
                      type="text"
                      value={paymentData.bank_name}
                      onChange={(e) => setPaymentData({...paymentData, bank_name: e.target.value})}
                      style={styles.input}
                      placeholder="Bank name"
                    />
                  </div>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Notes</label>
                <textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                  style={{...styles.input, minHeight: '80px'}}
                  placeholder="Additional payment notes..."
                />
              </div>

              <div style={styles.formActions}>
                <button 
                  type="button" 
                  onClick={() => setShowPaymentForm(false)}
                  style={styles.cancelButton}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={styles.submitButton}
                  disabled={submitting}
                >
                  {submitting ? 'Processing...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Payment History */}
        {bill.payments && bill.payments.length > 0 && (
          <div style={styles.paymentsCard} className="no-print">
            <h2 style={styles.cardTitle}>Payment History</h2>
            <table style={styles.paymentsTable}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Method</th>
                  <th style={styles.th}>Reference</th>
                  <th style={styles.th}>Received By</th>
                  <th style={styles.th}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {bill.payments.map((payment) => (
                  <tr key={payment.payment_id} style={styles.tableRow}>
                    <td style={styles.td}>{formatDate(payment.payment_date)}</td>
                    <td style={styles.td}>
                      <strong style={{color: '#059669'}}>{formatCurrency(payment.amount)}</strong>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.methodBadge}>{payment.payment_method ? payment.payment_method.replace('_', ' ') : '-'}</span>
                    </td>
                    <td style={styles.td}>{payment.payment_reference || '-'}</td>
                    <td style={styles.td}>{payment.received_by_name}</td>
                    <td style={styles.td}>{payment.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Print Footer - Only visible when printing */}
        <div className="print-footer" style={{display: 'none'}}>
          <strong>Pro Pet Animal Hospital</strong><br />
          Mawathagama, Kurunegala, Sri Lanka<br />
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
    </Layout>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  backButton: {
    backgroundColor: '#6B7280',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  headerActions: {
    display: 'flex',
    gap: '12px'
  },
  paymentButton: {
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  printButton: {
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  invoiceCard: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #E5E7EB',
    marginBottom: '24px'
  },
  invoiceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px'
  },
  invoiceTitle: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1F2937',
    margin: '0 0 8px 0'
  },
  invoiceNumber: {
    fontSize: '18px',
    color: '#6B7280',
    margin: 0
  },
  invoiceDate: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '4px 0'
  },
  statusBadge: {
    padding: '8px 16px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
    marginBottom: '12px'
  },
  divider: {
    height: '1px',
    backgroundColor: '#E5E7EB',
    margin: '24px 0'
  },
  infoSection: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '32px',
    marginBottom: '32px'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: '0 0 12px 0'
  },
  customerName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1F2937',
    margin: '0 0 8px 0'
  },
  infoText: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '4px 0'
  },
  itemsSection: {
    marginBottom: '32px'
  },
  itemsTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '16px'
  },
  tableHeader: {
    backgroundColor: '#F9FAFB',
    borderBottom: '2px solid #E5E7EB'
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  thRight: {
    padding: '12px',
    textAlign: 'right',
    fontSize: '12px',
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  tableRow: {
    borderBottom: '1px solid #E5E7EB'
  },
  td: {
    padding: '12px',
    fontSize: '14px',
    color: '#1F2937'
  },
  tdRight: {
    padding: '12px',
    textAlign: 'right',
    fontSize: '14px',
    color: '#1F2937'
  },
  itemTypeBadge: {
    backgroundColor: '#EFF6FF',
    color: '#1E40AF',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '500',
    textTransform: 'capitalize'
  },
  totalsSection: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '32px'
  },
  totalsGrid: {
    minWidth: '350px'
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '14px',
    color: '#6B7280'
  },
  totalRowLarge: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1F2937'
  },
  totalRowPaid: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '16px',
    fontWeight: '600'
  },
  totalRowBalance: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    fontSize: '18px',
    fontWeight: 'bold'
  },
  notesSection: {
    marginTop: '32px',
    padding: '16px',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px'
  },
  notesText: {
    fontSize: '14px',
    color: '#4B5563',
    margin: '8px 0 0 0',
    lineHeight: '1.6'
  },
  paymentFormCard: {
    backgroundColor: 'white',
    padding: '32px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #E5E7EB',
    marginBottom: '24px'
  },
  formTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: '24px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '20px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '8px'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #D1D5DB',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  helpText: {
    fontSize: '12px',
    color: '#6B7280',
    marginTop: '4px',
    display: 'block'
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '24px'
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    color: '#4B5563',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  submitButton: {
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  paymentsCard: {
    backgroundColor: 'white',
    padding: '32px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #E5E7EB'
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: '20px'
  },
  paymentsTable: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  methodBadge: {
    backgroundColor: '#DBEAFE',
    color: '#1E40AF',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '500',
    textTransform: 'capitalize'
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
  errorContainer: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    textAlign: 'center'
  },
  errorText: {
    color: '#DC2626',
    marginBottom: '20px'
  }
};

export default BillingDetail;
