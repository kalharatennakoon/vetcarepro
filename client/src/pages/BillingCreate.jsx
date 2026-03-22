import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBill } from '../services/billingService';
import { useNotification } from '../context/NotificationContext';
import { getCustomers } from '../services/customerService';
import inventoryService from '../services/inventoryService';
import Layout from '../components/Layout';

const BillingCreate = () => {
  const navigate = useNavigate();
  const { showSuccess } = useNotification();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  
  const [formData, setFormData] = useState({
    customer_id: '',
    bill_date: new Date().toISOString().split('T')[0],
    due_date: '',
    discount_percentage: 0,
    tax_percentage: 0,
    paid_amount: 0,
    payment_method: 'cash',
    payment_reference: '',
    notes: ''
  });

  const categoryLabels = {
    pharmaceuticals:       'Pharmaceuticals',
    consumables:           'Consumables',
    surgical_clinical:     'Surgical & Clinical Supplies',
    laboratory_diagnostic: 'Laboratory / Diagnostic Supplies',
    pet_food_nutrition:    'Pet Food & Nutrition',
    retail_otc:            'Retail / OTC Products',
    equipment:             'Equipment',
    accessories:           'Accessories',
    supplements:           'Supplements',
    cleaning_maintenance:  'Cleaning & Maintenance Supplies',
  };

  const [items, setItems] = useState([
    {
      item_type: 'service',
      item_id: null,
      item_name: '',
      quantity: 1,
      unit_price: 0,
      discount: 0,
      inv_category: '',
      inv_subcategory: '',
    }
  ]);

  useEffect(() => {
    fetchCustomers();
    fetchInventory();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await getCustomers({ is_active: true });
      setCustomers(response.data.customers);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  const fetchInventory = async () => {
    try {
      const response = await inventoryService.getAll({ isActive: true });
      setInventoryItems(response.data);
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    }
  };

  const getInvCategories = () => {
    const cats = [...new Set(inventoryItems.map(i => i.category).filter(Boolean))];
    return cats.sort();
  };

  const getInvSubcategories = (category) => {
    const subs = [...new Set(
      inventoryItems
        .filter(i => i.category === category && i.sub_category)
        .map(i => i.sub_category)
    )];
    return subs.sort();
  };

  const getFilteredInventoryItems = (category, subcategory) => {
    return inventoryItems.filter(i => {
      if (i.quantity <= 0) return false;
      if (category && i.category !== category) return false;
      if (subcategory && i.sub_category !== subcategory) return false;
      return true;
    });
  };

  const addItem = () => {
    setItems([...items, {
      item_type: 'service',
      item_id: null,
      item_name: '',
      quantity: 1,
      unit_price: 0,
      discount: 0,
      inv_category: '',
      inv_subcategory: '',
    }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    if (field === 'item_type') {
      newItems[index].item_id = null;
      newItems[index].item_name = '';
      newItems[index].unit_price = 0;
      newItems[index].inv_category = '';
      newItems[index].inv_subcategory = '';
    }

    if (field === 'inv_category') {
      newItems[index].inv_subcategory = '';
      newItems[index].item_id = null;
      newItems[index].item_name = '';
      newItems[index].unit_price = 0;
    }

    if (field === 'inv_subcategory') {
      newItems[index].item_id = null;
      newItems[index].item_name = '';
      newItems[index].unit_price = 0;
    }

    if (field === 'item_id' && value) {
      const inventoryItem = inventoryItems.find(i => i.item_id === parseInt(value));
      if (inventoryItem) {
        newItems[index].item_name = inventoryItem.item_name;
        newItems[index].unit_price = inventoryItem.selling_price;
      }
    }

    setItems(newItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price - (item.discount || 0));
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discountAmount = formData.discount_percentage 
      ? (subtotal * formData.discount_percentage / 100) 
      : 0;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = formData.tax_percentage 
      ? (taxableAmount * formData.tax_percentage / 100) 
      : 0;
    return taxableAmount + taxAmount;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer_id) {
      alert('Please select a customer');
      return;
    }

    if (items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    // Validate items
    for (const item of items) {
      if (!item.item_name || item.quantity <= 0 || item.unit_price < 0) {
        alert('All items must have a name, positive quantity, and valid price');
        return;
      }
      if (item.item_type === 'inventory_item' && item.item_id) {
        const invItem = inventoryItems.find(i => i.item_id === parseInt(item.item_id));
        if (invItem && invItem.quantity <= 0) {
          alert(`"${item.item_name}" is out of stock and cannot be added to an invoice.`);
          return;
        }
      }
    }
    
    // Validate payment method if paid amount is provided
    if (parseFloat(formData.paid_amount) > 0 && !formData.payment_method) {
      alert('Please select a payment method for the initial payment');
      return;
    }

    try {
      setLoading(true);
      const billData = {
        ...formData,
        customer_id: formData.customer_id,
        discount_percentage: parseFloat(formData.discount_percentage) || 0,
        tax_percentage: parseFloat(formData.tax_percentage) || 0,
        paid_amount: parseFloat(formData.paid_amount) || 0,
        items: items.map(item => ({
          ...item,
          item_id: item.item_id ? parseInt(item.item_id) : null,
          quantity: parseInt(item.quantity),
          unit_price: parseFloat(item.unit_price),
          discount: parseFloat(item.discount) || 0
        }))
      };

      const response = await createBill(billData);
      showSuccess('Invoice created successfully');
      navigate(`/billing/${response.data.bill.bill_id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create invoice');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return 'Rs. ' + new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  return (
    <Layout>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Create New Invoice</h2>
            <p style={styles.subtitle}>Generate invoice for services or products</p>
          </div>
          <button 
            onClick={() => navigate('/billing')} 
            style={styles.cancelButton}
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 1rem 0' }}>Fields marked with <span style={{ color: '#ef4444' }}>*</span> are required.</p>
          {/* Basic Information */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Invoice Information</h3>
            
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Customer<span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span></label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({...formData, customer_id: e.target.value})}
                  style={styles.input}
                  required
                >
                  <option value="">Select Customer</option>
                  {customers.map(customer => (
                    <option key={customer.customer_id} value={customer.customer_id}>
                      {customer.first_name} {customer.last_name} - {customer.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Invoice Date<span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span></label>
                <input
                  type="date"
                  value={formData.bill_date}
                  onChange={(e) => setFormData({...formData, bill_date: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>
            </div>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Due Date</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Notes</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  style={styles.input}
                  placeholder="Optional notes..."
                />
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div style={styles.card}>
            <div style={styles.itemsHeader}>
              <h3 style={styles.cardTitle}>Items</h3>
              <button 
                type="button" 
                onClick={addItem} 
                style={styles.addButton}
              >
                + Add Item
              </button>
            </div>

            <div style={styles.itemsTable}>
              {items.map((item, index) => (
                <div key={index} style={styles.itemRow}>
                  <div style={styles.itemFields}>
                    <div style={styles.itemField}>
                      <label style={styles.label}>Type</label>
                      <select
                        value={item.item_type}
                        onChange={(e) => updateItem(index, 'item_type', e.target.value)}
                        style={styles.input}
                      >
                        <option value="consultation">Consultation</option>
                        <option value="service">Service / Procedure</option>
                        <option value="inventory_item">Inventory Item</option>
                      </select>
                    </div>

                    {item.item_type === 'inventory_item' && (
                      <>
                        <div style={styles.itemField}>
                          <label style={styles.label}>Category</label>
                          <select
                            value={item.inv_category}
                            onChange={(e) => updateItem(index, 'inv_category', e.target.value)}
                            style={styles.input}
                          >
                            <option value="">All Categories</option>
                            {getInvCategories().map(cat => (
                              <option key={cat} value={cat}>{categoryLabels[cat] || cat}</option>
                            ))}
                          </select>
                        </div>

                        {item.inv_category && getInvSubcategories(item.inv_category).length > 0 && (
                          <div style={styles.itemField}>
                            <label style={styles.label}>Sub-Category</label>
                            <select
                              value={item.inv_subcategory}
                              onChange={(e) => updateItem(index, 'inv_subcategory', e.target.value)}
                              style={styles.input}
                            >
                              <option value="">All Sub-Categories</option>
                              {getInvSubcategories(item.inv_category).map(sub => (
                                <option key={sub} value={sub}>{sub}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div style={styles.itemField}>
                          <label style={styles.label}>Select Item</label>
                          <select
                            value={item.item_id || ''}
                            onChange={(e) => updateItem(index, 'item_id', e.target.value)}
                            style={styles.input}
                          >
                            <option value="">Select from inventory</option>
                            {getFilteredInventoryItems(item.inv_category, item.inv_subcategory).map(invItem => (
                              <option key={invItem.item_id} value={invItem.item_id}>
                                {invItem.item_name} - {formatCurrency(invItem.selling_price)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}


                    <div style={styles.itemField}>
                      <label style={styles.label}>Item Name<span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span></label>
                      <input
                        type="text"
                        value={item.item_name}
                        onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                        style={styles.input}
                        placeholder="Item description"
                        required
                      />
                    </div>

                    <div style={styles.itemFieldSmall}>
                      <label style={styles.label}>Qty<span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span></label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        style={styles.input}
                        min="1"
                        required
                      />
                    </div>

                    <div style={styles.itemField}>
                      <label style={styles.label}>Unit Price<span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span></label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                        style={styles.input}
                        min="0"
                        required
                      />
                    </div>

                    <div style={styles.itemField}>
                      <label style={styles.label}>Discount</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.discount}
                        onChange={(e) => updateItem(index, 'discount', e.target.value)}
                        style={styles.input}
                        min="0"
                      />
                    </div>

                    <div style={styles.itemField}>
                      <label style={styles.label}>Total</label>
                      <div style={styles.totalDisplay}>
                        {formatCurrency(item.quantity * item.unit_price - (item.discount || 0))}
                      </div>
                    </div>
                  </div>

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      style={styles.removeButton}
                      title="Remove item"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Totals and Payment */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Totals & Payment</h3>
            
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Discount (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({...formData, discount_percentage: e.target.value})}
                  style={styles.input}
                  min="0"
                  max="100"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Tax (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.tax_percentage}
                  onChange={(e) => setFormData({...formData, tax_percentage: e.target.value})}
                  style={styles.input}
                  min="0"
                  max="100"
                />
              </div>
            </div>

            <div style={styles.totalsBox}>
              <div style={styles.totalRow}>
                <span>Subtotal:</span>
                <span>{formatCurrency(calculateSubtotal())}</span>
              </div>
              {formData.discount_percentage > 0 && (
                <div style={styles.totalRow}>
                  <span>Discount ({formData.discount_percentage}%):</span>
                  <span style={{color: '#DC2626'}}>
                    -{formatCurrency(calculateSubtotal() * formData.discount_percentage / 100)}
                  </span>
                </div>
              )}
              {formData.tax_percentage > 0 && (
                <div style={styles.totalRow}>
                  <span>Tax ({formData.tax_percentage}%):</span>
                  <span>
                    {formatCurrency((calculateSubtotal() - (calculateSubtotal() * formData.discount_percentage / 100)) * formData.tax_percentage / 100)}
                  </span>
                </div>
              )}
              <div style={styles.totalRowLarge}>
                <span>Total Amount:</span>
                <span>{formatCurrency(calculateTotal())}</span>
              </div>
            </div>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Paid Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.paid_amount}
                  onChange={(e) => setFormData({...formData, paid_amount: e.target.value})}
                  style={styles.input}
                  min="0"
                  max={calculateTotal()}
                />
              </div>

              {formData.paid_amount > 0 && (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Payment Method<span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span></label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                      style={styles.input}
                      required
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Debit/Credit Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="mobile_payment">Mobile Payment/QR</option>
                      <option value="insurance">Insurance</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Payment Reference</label>
                    <input
                      type="text"
                      value={formData.payment_reference}
                      onChange={(e) => setFormData({...formData, payment_reference: e.target.value})}
                      style={styles.input}
                      placeholder="Transaction ID, Check #, etc."
                    />
                  </div>
                </>
              )}
            </div>

            {formData.paid_amount > 0 && (
              <div style={styles.balanceBox}>
                <span>Balance Due:</span>
                <span style={{color: '#DC2626', fontSize: '20px', fontWeight: 'bold'}}>
                  {formatCurrency(calculateTotal() - formData.paid_amount)}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            <button 
              type="button" 
              onClick={() => navigate('/billing')}
              style={styles.cancelButtonLarge}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              style={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Creating Invoice...' : 'Create Invoice'}
            </button>
          </div>
        </form>
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
    marginBottom: '24px'
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
  cancelButton: {
    backgroundColor: '#6B7280',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  card: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #E5E7EB',
    marginBottom: '24px'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: '20px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '8px'
  },
  input: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #D1D5DB',
    fontSize: '14px',
    outline: 'none'
  },
  itemsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  addButton: {
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  itemsTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  itemRow: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px',
    border: '1px solid #E5E7EB'
  },
  itemFields: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    flex: 1
  },
  itemField: {
    display: 'flex',
    flexDirection: 'column'
  },
  itemFieldSmall: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '100px'
  },
  totalDisplay: {
    padding: '10px 12px',
    backgroundColor: '#EFF6FF',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#1E40AF',
    marginTop: '28px'
  },
  removeButton: {
    backgroundColor: '#DC2626',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    height: 'fit-content',
    marginTop: '28px'
  },
  totalsBox: {
    backgroundColor: '#F9FAFB',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px'
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
    color: '#1F2937',
    borderTop: '2px solid #E5E7EB',
    marginTop: '8px',
    paddingTop: '12px'
  },
  balanceBox: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#FEF2F2',
    borderRadius: '8px',
    marginTop: '16px'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end'
  },
  cancelButtonLarge: {
    backgroundColor: '#F3F4F6',
    color: '#4B5563',
    border: 'none',
    padding: '12px 32px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    padding: '12px 32px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  }
};

export default BillingCreate;
