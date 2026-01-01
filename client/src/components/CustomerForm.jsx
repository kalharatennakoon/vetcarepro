import { useState, useEffect } from 'react';
import axios from 'axios';

const CustomerForm = ({ customerId, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    alternate_phone: '',
    address: '',
    city: '',
    postal_code: '',
    nic: '',
    emergency_contact: '',
    emergency_phone: '',
    preferred_contact_method: 'phone',
    notes: ''
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  const isEditMode = !!customerId;

  // Load customer data if editing
  useEffect(() => {
    if (customerId) {
      loadCustomer();
    }
  }, [customerId]);

  const loadCustomer = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const customer = response.data.data.customer;
      
      setFormData({
        first_name: customer.first_name || '',
        last_name: customer.last_name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        alternate_phone: customer.alternate_phone || '',
        address: customer.address || '',
        city: customer.city || '',
        postal_code: customer.postal_code || '',
        nic: customer.nic || '',
        emergency_contact: customer.emergency_contact || '',
        emergency_phone: customer.emergency_phone || '',
        preferred_contact_method: customer.preferred_contact_method || 'phone',
        notes: customer.notes || ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load customer data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Clear error on input change
  };

  const validateForm = () => {
    // Required fields
    if (!formData.first_name.trim()) {
      setError('First name is required');
      return false;
    }
    if (!formData.last_name.trim()) {
      setError('Last name is required');
      return false;
    }
    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return false;
    }

    // Phone format validation
    const phoneRegex = /^\+94[0-9]{9}$/;
    if (!phoneRegex.test(formData.phone)) {
      setError('Phone must be in format +94XXXXXXXXX');
      return false;
    }

    // Alternate phone validation (if provided)
    if (formData.alternate_phone && !phoneRegex.test(formData.alternate_phone)) {
      setError('Alternate phone must be in format +94XXXXXXXXX');
      return false;
    }

    // Emergency phone validation (if provided)
    if (formData.emergency_phone && !phoneRegex.test(formData.emergency_phone)) {
      setError('Emergency phone must be in format +94XXXXXXXXX');
      return false;
    }

    // Email validation (if provided)
    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Please enter a valid email address');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      // Clean up empty strings to null for optional fields
      const cleanedData = { ...formData };
      ['email', 'alternate_phone', 'emergency_phone', 'emergency_contact', 'address', 'city', 'postal_code', 'nic', 'notes'].forEach(field => {
        if (cleanedData[field] === '') {
          cleanedData[field] = null;
        }
      });

      if (isEditMode) {
        // Update existing customer
        await axios.put(`${API_URL}/customers/${customerId}`, cleanedData, config);
      } else {
        // Create new customer
        await axios.post(`${API_URL}/customers`, cleanedData, config);
      }

      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} customer`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading customer data...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>
          {isEditMode ? 'Edit Customer' : 'Add New Customer'}
        </h2>
        <button onClick={onCancel} style={styles.closeButton}>×</button>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {error && (
          <div style={styles.errorBox}>
            {error}
          </div>
        )}

        {/* Personal Information */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Personal Information</h3>
          
          <div style={styles.row}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                First Name <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="Enter first name"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Last Name <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Enter last name"
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>NIC Number</label>
            <input
              type="text"
              name="nic"
              value={formData.nic}
              onChange={handleChange}
              placeholder="Enter NIC number"
              style={styles.input}
            />
          </div>
        </div>

        {/* Contact Information */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Contact Information</h3>
          
          <div style={styles.row}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Phone <span style={styles.required}>*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+94XXXXXXXXX"
                style={styles.input}
                required
              />
              <small style={styles.hint}>Format: +94XXXXXXXXX</small>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Alternate Phone</label>
              <input
                type="tel"
                name="alternate_phone"
                value={formData.alternate_phone}
                onChange={handleChange}
                placeholder="+94XXXXXXXXX"
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="customer@example.com"
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Preferred Contact Method</label>
            <select
              name="preferred_contact_method"
              value={formData.preferred_contact_method}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="phone">Phone</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
          </div>
        </div>

        {/* Address Information */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Address</h3>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Street Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter street address"
              style={{ ...styles.input, ...styles.textarea }}
              rows="2"
            />
          </div>

          <div style={styles.row}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Enter city"
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Postal Code</label>
              <input
                type="text"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleChange}
                placeholder="Enter postal code"
                style={styles.input}
              />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Emergency Contact</h3>
          
          <div style={styles.row}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Emergency Contact Name</label>
              <input
                type="text"
                name="emergency_contact"
                value={formData.emergency_contact}
                onChange={handleChange}
                placeholder="Enter contact name"
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Emergency Phone</label>
              <input
                type="tel"
                name="emergency_phone"
                value={formData.emergency_phone}
                onChange={handleChange}
                placeholder="+94XXXXXXXXX"
                style={styles.input}
              />
            </div>
          </div>
        </div>

        {/* Additional Notes */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Additional Notes</h3>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any additional information..."
              style={{ ...styles.input, ...styles.textarea }}
              rows="3"
            />
          </div>
        </div>

        {/* Form Actions */}
        <div style={styles.actions}>
          <button
            type="button"
            onClick={onCancel}
            style={styles.cancelButton}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Saving...' : (isEditMode ? 'Update Customer' : 'Add Customer')}
          </button>
        </div>
      </form>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    maxWidth: '800px',
    margin: '0 auto',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '2rem',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '0',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    minHeight: '300px',
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #2563eb',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    animation: 'spin 1s linear infinite',
  },
  form: {
    padding: '1.5rem',
    maxHeight: 'calc(100vh - 200px)',
    overflowY: 'auto',
  },
  errorBox: {
    padding: '1rem',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    marginBottom: '1.5rem',
    fontSize: '0.875rem',
    border: '1px solid #fecaca',
  },
  section: {
    marginBottom: '2rem',
  },
  sectionTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#374151',
    paddingBottom: '0.5rem',
    borderBottom: '2px solid #e5e7eb',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '1rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem',
  },
  required: {
    color: '#dc2626',
  },
  input: {
    padding: '0.75rem',
    fontSize: '0.875rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  textarea: {
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  hint: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginTop: '0.25rem',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid #e5e7eb',
  },
  cancelButton: {
    padding: '0.75rem 1.5rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  submitButton: {
    padding: '0.75rem 1.5rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: '#2563eb',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};

export default CustomerForm;
