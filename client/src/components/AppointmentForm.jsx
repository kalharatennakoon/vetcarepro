import { useState, useEffect } from 'react';
import { getCustomers } from '../services/customerService';
import { createAppointment, updateAppointment, getAppointmentById } from '../services/appointmentService';
import { getVeterinarians } from '../services/userService';
import axios from 'axios';

const AppointmentForm = ({ appointmentId, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customers, setCustomers] = useState([]);
  const [pets, setPets] = useState([]);
  const [veterinarians, setVeterinarians] = useState([]);
  const [formData, setFormData] = useState({
    customer_id: '',
    pet_id: '',
    appointment_date: '',
    appointment_time: '',
    duration_minutes: 30,
    appointment_type: 'checkup',
    reason: '',
    veterinarian_id: ''
  });

  const isEditMode = !!appointmentId;
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    fetchCustomers();
    fetchVeterinarians();
    if (appointmentId) {
      loadAppointment();
    }
  }, [appointmentId]);

  const fetchCustomers = async () => {
    try {
      const response = await getCustomers({});
      setCustomers(response.data.customers || []);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  const fetchVeterinarians = async () => {
    try {
      const response = await getVeterinarians();
      setVeterinarians(response.data.veterinarians || []);
    } catch (err) {
      console.error('Failed to fetch veterinarians:', err);
    }
  };

  const loadAppointment = async () => {
    try {
      setLoading(true);
      const response = await getAppointmentById(appointmentId);
      const appointment = response.data.appointment;
      setFormData({
        customer_id: appointment.customer_id,
        pet_id: appointment.pet_id,
        appointment_date: appointment.appointment_date,
        appointment_time: appointment.appointment_time.substring(0, 5), // Format HH:MM
        duration_minutes: appointment.duration_minutes,
        appointment_type: appointment.appointment_type,
        reason: appointment.reason,
        veterinarian_id: appointment.veterinarian_id || ''
      });
      // Load pets for the customer
      if (appointment.customer_id) {
        await fetchPetsForCustomer(appointment.customer_id);
      }
    } catch (err) {
      setError('Failed to load appointment');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPetsForCustomer = async (customerId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPets(response.data.data.customer.pets || []);
    } catch (err) {
      console.error('Failed to fetch pets:', err);
      setPets([]);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // When customer changes, fetch their pets
    if (name === 'customer_id') {
      setPets([]);
      setFormData(prev => ({ ...prev, pet_id: '' }));
      if (value) {
        fetchPetsForCustomer(value);
      }
    }
  };

  const validateForm = () => {
    if (!formData.customer_id) {
      setError('Please select a customer');
      return false;
    }
    if (!formData.pet_id) {
      setError('Please select a pet');
      return false;
    }
    if (!formData.appointment_date) {
      setError('Please select an appointment date');
      return false;
    }
    if (!formData.appointment_time) {
      setError('Please select an appointment time');
      return false;
    }
    if (!formData.reason.trim()) {
      setError('Please provide a reason for the visit');
      return false;
    }
    if (formData.reason.trim().length < 3) {
      setError('Reason must be at least 3 characters');
      return false;
    }
    if (formData.reason.trim().length > 255) {
      setError('Reason must not exceed 255 characters');
      return false;
    }

    // Validate date is not in the past
    const appointmentDateTime = new Date(`${formData.appointment_date}T${formData.appointment_time}`);
    const now = new Date();
    if (appointmentDateTime < now && !isEditMode) {
      setError('Appointment date and time cannot be in the past');
      return false;
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

      // Prepare appointment data with proper types and formatting
      const appointmentData = {
        customer_id: formData.customer_id, // Keep as string for new format
        pet_id: formData.pet_id, // Keep as string for new format
        appointment_date: formData.appointment_date, // YYYY-MM-DD format
        appointment_time: formData.appointment_time, // HH:MM format
        duration_minutes: parseInt(formData.duration_minutes),
        appointment_type: formData.appointment_type,
        reason: formData.reason.trim(),
        // Only include veterinarian_id if it has a value
        ...(formData.veterinarian_id && { veterinarian_id: parseInt(formData.veterinarian_id) })
      };

      console.log('Submitting appointment data:', appointmentData); // Debug log

      if (isEditMode) {
        await updateAppointment(appointmentId, appointmentData);
      } else {
        await createAppointment(appointmentData);
      }

      onSuccess();
    } catch (err) {
      console.error('Appointment submission error:', err.response?.data); // Debug log
      
      // Handle validation errors from backend
      if (err.response?.data?.errors) {
        const errorMessages = err.response.data.errors.map(e => e.message).join(', ');
        setError(errorMessages);
      } else {
        setError(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} appointment`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading appointment data...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>{isEditMode ? 'Edit Appointment' : 'Schedule Appointment'}</h2>
        <button onClick={onCancel} style={styles.cancelButton}><i className="fas fa-times"></i></button>
      </div>

      {error && (
        <div style={styles.errorBox}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Customer Selection */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Customer & Pet</h3>
          
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Customer <span style={styles.required}>*</span>
              </label>
              <select
                name="customer_id"
                value={formData.customer_id}
                onChange={handleChange}
                style={styles.select}
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
              <label style={styles.label}>
                Pet <span style={styles.required}>*</span>
              </label>
              <select
                name="pet_id"
                value={formData.pet_id}
                onChange={handleChange}
                style={styles.select}
                required
                disabled={!formData.customer_id}
              >
                <option value="">Select Pet</option>
                {pets.map(pet => (
                  <option key={pet.pet_id} value={pet.pet_id}>
                    {pet.pet_name} ({pet.species})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Appointment Details */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Appointment Details</h3>
          
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Date <span style={styles.required}>*</span>
              </label>
              <input
                type="date"
                name="appointment_date"
                value={formData.appointment_date}
                onChange={handleChange}
                style={styles.input}
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Time <span style={styles.required}>*</span>
              </label>
              <input
                type="time"
                name="appointment_time"
                value={formData.appointment_time}
                onChange={handleChange}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Duration (minutes)</label>
              <select
                name="duration_minutes"
                value={formData.duration_minutes}
                onChange={handleChange}
                style={styles.select}
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Appointment Type <span style={styles.required}>*</span>
              </label>
              <select
                name="appointment_type"
                value={formData.appointment_type}
                onChange={handleChange}
                style={styles.select}
                required
              >
                <option value="checkup">Check-up</option>
                <option value="vaccination">Vaccination</option>
                <option value="surgery">Surgery</option>
                <option value="emergency">Emergency</option>
                <option value="follow_up">Follow-up</option>
                <option value="consultation">Consultation</option>
              </select>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Veterinarian (Optional)</label>
            <select
              name="veterinarian_id"
              value={formData.veterinarian_id}
              onChange={handleChange}
              style={styles.select}
            >
              <option value="">No preference</option>
              {veterinarians.map(vet => (
                <option key={vet.user_id} value={vet.user_id}>
                  {vet.first_name} {vet.last_name} {vet.specialization ? `- ${vet.specialization}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              Reason for Visit <span style={styles.required}>*</span>
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              style={styles.textarea}
              placeholder="Describe the reason for this appointment... (3-255 characters)"
              rows="4"
              required
              maxLength="255"
            />
            <small style={styles.charCount}>
              {formData.reason.length}/255 characters
            </small>
          </div>
        </div>

        {/* Form Actions */}
        <div style={styles.formActions}>
          <button
            type="button"
            onClick={onCancel}
            style={styles.cancelButtonBottom}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Saving...' : (isEditMode ? 'Update Appointment' : 'Schedule Appointment')}
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
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    padding: '2rem',
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    paddingBottom: '1rem',
    borderBottom: '2px solid #e5e7eb',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#111827',
    margin: 0,
  },
  cancelButton: {
    fontSize: '1.5rem',
    color: '#6b7280',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0.5rem',
  },
  errorBox: {
    padding: '1rem',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    marginBottom: '1.5rem',
    border: '1px solid #fecaca',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 0.5rem 0',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid #e5e7eb',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
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
    fontSize: '1rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
  },
  select: {
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  textarea: {
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  charCount: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginTop: '0.25rem',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    marginTop: '2rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid #e5e7eb',
  },
  cancelButtonBottom: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
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
};

export default AppointmentForm;