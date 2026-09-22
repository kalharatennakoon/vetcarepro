import { useState, useEffect, useRef, useCallback } from 'react';
import { getCustomers } from '../services/customerService';
import { createAppointment, updateAppointment, getAppointmentById } from '../services/appointmentService';
import { getVeterinarians } from '../services/userService';
import { useNotification } from '../context/NotificationContext';
import axios from 'axios';
import '../styles/AppointmentCreateModern.css';

const AppointmentForm = ({ appointmentId, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const errorRef = useRef(null);
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
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const { showSuccess } = useNotification();

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);

  const loadAppointment = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAppointmentById(appointmentId);
      const appointment = response.data.appointment;
      
      // Extract date in YYYY-MM-DD format without timezone conversion
      const appointmentDate = appointment.appointment_date.split('T')[0];
      
      setFormData({
        customer_id: appointment.customer_id,
        pet_id: appointment.pet_id,
        appointment_date: appointmentDate,
        appointment_time: appointment.appointment_time.substring(0, 5), // Format HH:MM
        duration_minutes: appointment.duration_minutes,
        appointment_type: appointment.appointment_type,
        reason: appointment.reason,
        veterinarian_id: appointment.veterinarian_id || ''
      });
      // Load pets for the customer
      if (appointment.customer_id) {
        fetchPetsForCustomer(appointment.customer_id);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load appointment details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    fetchCustomers();
    fetchVeterinarians();
    if (appointmentId) {
      loadAppointment();
    }
  }, [appointmentId, loadAppointment]);

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
    if (new Date(`${formData.appointment_date}T00:00:00`).getDay() === 0) {
      setError('The clinic is closed on Sundays - please choose another date');
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

    if (formData.appointment_type?.toLowerCase().includes('emergency') && !formData.veterinarian_id) {
      setError('A veterinarian must be assigned for emergency appointments');
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

      const appointmentData = {
        customer_id: formData.customer_id,
        pet_id: formData.pet_id,
        appointment_date: formData.appointment_date,
        appointment_time: formData.appointment_time,
        duration_minutes: parseInt(formData.duration_minutes),
        appointment_type: formData.appointment_type,
        reason: formData.reason.trim(),
        ...(formData.veterinarian_id && { veterinarian_id: parseInt(formData.veterinarian_id) })
      };

      if (isEditMode) {
        await updateAppointment(appointmentId, appointmentData);
        showSuccess('Appointment updated successfully');
      } else {
        await createAppointment(appointmentData);
        showSuccess('Appointment created successfully');
      }

      onSuccess();
    } catch (err) {
      console.error('Appointment submission error:', err.response?.data);
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
      <div className="apt-form-loading">
        <div className="apt-form-spinner"></div>
        <p style={{ color: '#64748b', fontWeight: '500' }}>Loading appointment details...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="apt-form-header">
        <div className="apt-form-title-group">
          <h2 className="apt-form-title">{isEditMode ? 'Edit Appointment Details' : 'Appointment Information'}</h2>
          <p className="apt-form-subtitle">Select the customer, pet, and scheduled date/time for the consultation.</p>
        </div>
        {onCancel && (
          <button onClick={onCancel} className="apt-form-close-btn" type="button" title="Close form">
            <i className="fas fa-times"></i>
          </button>
        )}
      </div>

      {error && (
        <div ref={errorRef} className="apt-form-error">
          <i className="fas fa-exclamation-circle apt-form-error-icon"></i>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="apt-form-note">
          <i className="fas fa-info-circle" style={{ color: '#3b82f6' }}></i>
          <span>Fields marked with <span className="apt-form-required">*</span> are required.</span>
        </div>

        {/* Section 1: Customer & Pet */}
        <div className="apt-form-section">
          <div className="apt-form-section-header">
            <div className="apt-form-section-icon">
              <i className="fas fa-user-check"></i>
            </div>
            <h3 className="apt-form-section-title">1. Customer & Patient Selection</h3>
          </div>
          
          <div className="apt-form-grid">
            <div className="apt-form-group">
              <label className="apt-form-label">
                <span>Customer <span className="apt-form-required">*</span></span>
              </label>
              <select
                name="customer_id"
                value={formData.customer_id}
                onChange={handleChange}
                className="apt-form-select"
                required
              >
                <option value="">-- Select Customer --</option>
                {[...customers].sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)).map(customer => (
                  <option key={customer.customer_id} value={customer.customer_id}>
                    {customer.first_name} {customer.last_name} ({customer.phone})
                  </option>
                ))}
              </select>
            </div>

            <div className="apt-form-group">
              <label className="apt-form-label">
                <span>Pet <span className="apt-form-required">*</span></span>
              </label>
              <select
                name="pet_id"
                value={formData.pet_id}
                onChange={handleChange}
                className="apt-form-select"
                required
                disabled={!formData.customer_id}
              >
                <option value="">{formData.customer_id ? '-- Select Pet --' : '-- Select Customer First --'}</option>
                {pets.map(pet => (
                  <option key={pet.pet_id} value={pet.pet_id}>
                    {pet.pet_name} ({pet.species}{pet.breed ? ` - ${pet.breed}` : ''})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Appointment Details */}
        <div className="apt-form-section">
          <div className="apt-form-section-header">
            <div className="apt-form-section-icon">
              <i className="fas fa-calendar-day"></i>
            </div>
            <h3 className="apt-form-section-title">2. Date, Time & Staff Allocation</h3>
          </div>
          
          <div className="apt-form-grid">
            <div className="apt-form-group">
              <label className="apt-form-label">
                <span>Date <span className="apt-form-required">*</span></span>
              </label>
              <input
                type="date"
                name="appointment_date"
                value={formData.appointment_date}
                onChange={handleChange}
                className="apt-form-input"
                required
                min={new Date().toISOString().split('T')[0]}
              />
              <span className="apt-form-hint">Clinic open Monday &ndash; Saturday</span>
            </div>

            <div className="apt-form-group">
              <label className="apt-form-label">
                <span>Time <span className="apt-form-required">*</span></span>
              </label>
              <input
                type="time"
                name="appointment_time"
                value={formData.appointment_time}
                onChange={handleChange}
                className="apt-form-input"
                required
              />
              <span className="apt-form-hint">Operating hours: 08:30 AM &ndash; 05:30 PM</span>
            </div>

            <div className="apt-form-group">
              <label className="apt-form-label">
                <span>Duration</span>
              </label>
              <select
                name="duration_minutes"
                value={formData.duration_minutes}
                onChange={handleChange}
                className="apt-form-select"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </select>
            </div>

            <div className="apt-form-group">
              <label className="apt-form-label">
                <span>Appointment Type <span className="apt-form-required">*</span></span>
              </label>
              <select
                name="appointment_type"
                value={formData.appointment_type}
                onChange={handleChange}
                className="apt-form-select"
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

            <div className="apt-form-group apt-form-group-full">
              <label className="apt-form-label">
                <span>Assigned Veterinarian</span>
              </label>
              <select
                name="veterinarian_id"
                value={formData.veterinarian_id}
                onChange={handleChange}
                className="apt-form-select"
              >
                <option value="">No preference (Any Available Vet)</option>
                {[...veterinarians].sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)).map(vet => (
                  <option key={vet.user_id} value={vet.user_id}>
                    Dr. {vet.first_name} {vet.last_name} {vet.specialization ? `- ${vet.specialization}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Reason for Visit */}
        <div className="apt-form-section">
          <div className="apt-form-section-header">
            <div className="apt-form-section-icon">
              <i className="fas fa-notes-medical"></i>
            </div>
            <h3 className="apt-form-section-title">3. Reason for Visit</h3>
          </div>

          <div className="apt-form-group">
            <label className="apt-form-label">
              <span>Symptoms or Reason <span className="apt-form-required">*</span></span>
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              className="apt-form-textarea"
              placeholder="Describe the reason for this appointment, symptoms, or special requests... (3-255 characters)"
              rows="3"
              required
              maxLength="255"
            />
            <div className="apt-form-char-count">
              {formData.reason.length}/255 characters
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="apt-form-actions">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="apt-form-btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="apt-form-btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Saving...
              </>
            ) : (
              <>
                <i className={isEditMode ? 'fas fa-save' : 'fas fa-calendar-check'}></i>
                {isEditMode ? 'Update Appointment' : 'Schedule Appointment'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AppointmentForm;