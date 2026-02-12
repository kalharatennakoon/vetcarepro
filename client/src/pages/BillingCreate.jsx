import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBill } from '../services/billingService';
import { getCustomers } from '../services/customerService';
import inventoryService from '../services/inventoryService';
import Layout from '../components/Layout';

const BillingCreate = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [vaccinations, setVaccinations] = useState([
    { id: 1, name: 'Rabies Vaccine', price: 2500.00 },
    { id: 2, name: 'DHPP Vaccine (Distemper, Hepatitis, Parvovirus, Parainfluenza)', price: 3500.00 },
    { id: 3, name: 'Bordetella Vaccine (Kennel Cough)', price: 2000.00 },
    { id: 4, name: 'Leptospirosis Vaccine', price: 2800.00 },
    { id: 5, name: 'Canine Influenza Vaccine', price: 3000.00 },
    { id: 6, name: 'Lyme Disease Vaccine', price: 3200.00 },
    { id: 7, name: 'FVRCP Vaccine (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia)', price: 3000.00 },
    { id: 8, name: 'FeLV Vaccine (Feline Leukemia)', price: 2800.00 },
    { id: 9, name: 'FIV Vaccine (Feline Immunodeficiency Virus)', price: 3500.00 }
  ]);
  
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

  const [items, setItems] = useState([
    {
      item_type: 'service',
      item_id: null,
      item_name: '',
      quantity: 1,
      unit_price: 0,
      discount: 0
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

  const addItem = () => {
    setItems([...items, {
      item_type: 'service',
      item_id: null,
      item_name: '',
      quantity: 1,
      unit_price: 0,
      discount: 0
    }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // If selecting inventory item, auto-fill details
    if (field === 'item_id' && value) {
      const inventoryItem = inventoryItems.find(item => item.item_id === parseInt(value));
      if (inventoryItem) {
        newItems[index].item_name = inventoryItem.item_name;
        newItems[index].unit_price = inventoryItem.selling_price;
        newItems[index].item_type = 'inventory_item';
      }
    }
    
    // If selecting vaccination, auto-fill details
    if (field === 'vaccination_id' && value) {
      const vaccination = vaccinations.find(v => v.id === parseInt(value));
      if (vaccination) {
        newItems[index].item_name = vaccination.name;
        newItems[index].unit_price = vaccination.price;
        newItems[index].item_type = 'vaccination';
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
        customer_id: parseInt(formData.customer_id),
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
      alert('Invoice created successfully');
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
          {/* Basic Information */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Invoice Information</h3>
            
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Customer *</label>
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
                <label style={styles.label}>Invoice Date *</label>
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
                        <option value="service">Service</option>
                        <option value="inventory_item">Inventory Item</option>
                        <option value="consultation">Consultation</option>
                        <option value="vaccination">Vaccination</option>
                      </select>
                    </div>

                    {item.item_type === 'inventory_item' && (
                      <div style={styles.itemField}>
                        <label style={styles.label}>Select Item</label>
                        <select
                          value={item.item_id || ''}
                          onChange={(e) => updateItem(index, 'item_id', e.target.value)}
                          style={styles.input}
                        >
                          <option value="">Select from inventory</option>
                          {inventoryItems.map(invItem => (
                            <option key={invItem.item_id} value={invItem.item_id}>
                              {invItem.item_name} - {formatCurrency(invItem.selling_price)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {item.item_type === 'vaccination' && (
                      <div style={styles.itemField}>
                        <label style={styles.label}>Select Vaccination</label>
                        <select
                          value={item.vaccination_id || ''}
                          onChange={(e) => updateItem(index, 'vaccination_id', e.target.value)}
                          style={styles.input}
                        >
                          <option value="">Select vaccination type</option>
                          {vaccinations.map(vacc => (
                            <option key={vacc.id} value={vacc.id}>
                              {vacc.name} - {formatCurrency(vacc.price)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div style={styles.itemField}>
                      <label style={styles.label}>Item Name *</label>
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
                      <label style={styles.label}>Qty *</label>
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
                      <label style={styles.label}>Unit Price *</label>
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
                    <label style={styles.label}>Payment Method *</label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
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
