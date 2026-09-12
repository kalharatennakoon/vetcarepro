import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNotification } from '../context/NotificationContext';
import { createPet } from '../services/petService';
import '../styles/FormPagesModern.css';

const SPECIES_LIST = [
  'Dog', 'Cat', 'Bird', 'Rabbit', 'Guinea Pig', 'Hamster',
  'Parrot', 'Budgie', 'Pigeon', 'Hen',
  'Cow', 'Goat', 'Pig', 'Sheep',
  'Snake', 'Lizard', 'Turtle',
  'Exotic Animal', 'Monkey', 'Deer',
  'Rescue/Admitted Wildlife', 'Other',
];

const CustomerForm = ({ customerId, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const errorRef = useRef(null);
  const [addPet, setAddPet] = useState(false);
  const [petData, setPetData] = useState({
    pet_name: '',
    species: '',
    breed: '',
    gender: '',
    date_of_birth: '',
    color: '',
    weight_current: ''
  });
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

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const isEditMode = !!customerId;
  const { showSuccess } = useNotification();

  useEffect(() => {
    if (customerId) {
      loadCustomer();
    }
  }, [customerId]);

  useEffect(() => {
    if (error) {
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

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
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handlePetChange = (e) => {
    const { name, value } = e.target;
    setPetData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const validateForm = () => {
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

    const phoneRegex = /^\+94[0-9]{9}$/;
    if (!phoneRegex.test(formData.phone)) {
      setError('Phone must be in format +94XXXXXXXXX');
      return false;
    }

    if (formData.alternate_phone && !phoneRegex.test(formData.alternate_phone)) {
      setError('Alternate phone must be in format +94XXXXXXXXX');
      return false;
    }

    if (formData.emergency_phone && !phoneRegex.test(formData.emergency_phone)) {
      setError('Emergency phone must be in format +94XXXXXXXXX');
      return false;
    }

    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Please enter a valid email address');
        return false;
      }
    }

    if (!isEditMode && addPet) {
      if (!petData.pet_name.trim()) { setError('Pet name is required'); return false; }
      if (!petData.species) { setError('Pet species is required'); return false; }
      if (!petData.gender) { setError('Pet gender is required'); return false; }
      if (!petData.date_of_birth) { setError('Pet date of birth is required'); return false; }
      if (new Date(petData.date_of_birth) > new Date()) { setError('Pet date of birth cannot be in the future'); return false; }
      if (petData.weight_current && (isNaN(petData.weight_current) || parseFloat(petData.weight_current) <= 0)) {
        setError('Pet weight must be a positive number'); return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const cleanedData = { ...formData };
      ['email', 'alternate_phone', 'emergency_phone', 'emergency_contact', 'address', 'city', 'postal_code', 'nic', 'notes'].forEach(field => {
        if (cleanedData[field] === '') cleanedData[field] = null;
      });

      let newCustomerId = null;
      if (isEditMode) {
        await axios.put(`${API_URL}/customers/${customerId}`, cleanedData, config);
        showSuccess('Customer details updated successfully');
      } else {
        const res = await axios.post(`${API_URL}/customers`, cleanedData, config);
        newCustomerId = res.data.data.customer.customer_id;
        if (addPet) {
          await createPet({
            customer_id: newCustomerId,
            pet_name: petData.pet_name.trim(),
            species: petData.species,
            breed: petData.breed.trim() || null,
            gender: petData.gender,
            date_of_birth: petData.date_of_birth,
            color: petData.color.trim() || null,
            weight_current: petData.weight_current ? parseFloat(petData.weight_current) : null
          });
          showSuccess('Customer and pet added successfully');
        } else {
          showSuccess('Customer added successfully');
        }
      }

      onSuccess?.(newCustomerId);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} customer`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return (
      <div className="form-page-loading">
        <div className="form-page-spinner"></div>
        <p style={{ color: '#64748b', fontWeight: '500' }}>Loading customer profile...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="form-card-header">
        <div className="form-card-title-group">
          <h2 className="form-card-title">{isEditMode ? 'Edit Customer Profile' : 'Customer Account Information'}</h2>
          <p className="form-card-subtitle">Fill in personal information, contact records, and address details below.</p>
        </div>
        {onCancel && (
          <button onClick={onCancel} className="form-card-close-btn" type="button" title="Close form">
            <i className="fas fa-times"></i>
          </button>
        )}
      </div>

      {error && (
        <div ref={errorRef} className="form-card-error">
          <i className="fas fa-exclamation-circle form-card-error-icon"></i>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-card-note">
          <i className="fas fa-info-circle" style={{ color: '#4f46e5' }}></i>
          <span>Fields marked with <span className="form-card-required">*</span> are required.</span>
        </div>

        {/* Section 1: Personal Information */}
        <div className="form-section-box">
          <div className="form-section-header">
            <div className="form-section-icon form-section-icon-purple">
              <i className="fas fa-user"></i>
            </div>
            <h3 className="form-section-title">1. Personal Identification</h3>
          </div>

          <div className="form-grid-2col">
            <div className="form-group">
              <label className="form-label">
                <span>First Name <span className="form-card-required">*</span></span>
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="e.g., Suneth"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Last Name <span className="form-card-required">*</span></span>
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="e.g., Perera"
                className="form-input"
                required
              />
            </div>

            <div className="form-group form-group-full">
              <label className="form-label"><span>National Identity Card (NIC)</span></label>
              <input
                type="text"
                name="nic"
                value={formData.nic}
                onChange={handleChange}
                placeholder="e.g., 199012345678 or 901234567V"
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Contact Information */}
        <div className="form-section-box">
          <div className="form-section-header">
            <div className="form-section-icon form-section-icon-purple">
              <i className="fas fa-phone"></i>
            </div>
            <h3 className="form-section-title">2. Contact Numbers & Preferences</h3>
          </div>

          <div className="form-grid-2col">
            <div className="form-group">
              <label className="form-label">
                <span>Primary Phone <span className="form-card-required">*</span></span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+94771234567"
                className="form-input"
                required
              />
              <span className="form-hint">Format: +94XXXXXXXXX</span>
            </div>

            <div className="form-group">
              <label className="form-label"><span>Alternate Phone</span></label>
              <input
                type="tel"
                name="alternate_phone"
                value={formData.alternate_phone}
                onChange={handleChange}
                placeholder="+94112345678"
                className="form-input"
              />
              <span className="form-hint">Format: +94XXXXXXXXX</span>
            </div>

            <div className="form-group">
              <label className="form-label"><span>Email Address</span></label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="customer@example.com"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label"><span>Preferred Contact Method</span></label>
              <select
                name="preferred_contact_method"
                value={formData.preferred_contact_method}
                onChange={handleChange}
                className="form-select"
              >
                <option value="phone">Phone Call</option>
                <option value="email">Email</option>
                <option value="sms">SMS Text</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Address Details */}
        <div className="form-section-box">
          <div className="form-section-header">
            <div className="form-section-icon form-section-icon-purple">
              <i className="fas fa-map-marker-alt"></i>
            </div>
            <h3 className="form-section-title">3. Residential Address</h3>
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label"><span>Street Address</span></label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="e.g., No. 42, Kandy Road"
              className="form-textarea"
              rows="2"
            />
          </div>

          <div className="form-grid-2col">
            <div className="form-group">
              <label className="form-label"><span>City</span></label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g., Kurunegala"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label"><span>Postal Code</span></label>
              <input
                type="text"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleChange}
                placeholder="e.g., 60000"
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Emergency Contact */}
        <div className="form-section-box">
          <div className="form-section-header">
            <div className="form-section-icon form-section-icon-purple">
              <i className="fas fa-heart-pulse"></i>
            </div>
            <h3 className="form-section-title">4. Emergency Contact</h3>
          </div>

          <div className="form-grid-2col">
            <div className="form-group">
              <label className="form-label"><span>Emergency Contact Person</span></label>
              <input
                type="text"
                name="emergency_contact"
                value={formData.emergency_contact}
                onChange={handleChange}
                placeholder="e.g., Nimal Perera (Spouse)"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label"><span>Emergency Phone</span></label>
              <input
                type="tel"
                name="emergency_phone"
                value={formData.emergency_phone}
                onChange={handleChange}
                placeholder="+94719876543"
                className="form-input"
              />
              <span className="form-hint">Format: +94XXXXXXXXX</span>
            </div>
          </div>
        </div>

        {/* Section 5: Additional Notes */}
        <div className="form-section-box">
          <div className="form-section-header">
            <div className="form-section-icon form-section-icon-purple">
              <i className="fas fa-clipboard"></i>
            </div>
            <h3 className="form-section-title">5. Administrative Notes</h3>
          </div>

          <div className="form-group">
            <label className="form-label"><span>Account Notes</span></label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any administrative notes regarding this customer..."
              className="form-textarea"
              rows="3"
            />
          </div>
        </div>

        {/* Section 6: Optional Initial Pet Registration */}
        {!isEditMode && (
          <div className="form-section-box">
            <div className="form-add-pet-toggle" onClick={() => setAddPet(!addPet)}>
              <div className="form-add-pet-left">
                <div className="form-add-pet-icon">
                  <i className="fas fa-paw"></i>
                </div>
                <div>
                  <h4 className="form-add-pet-title">Register First Pet Now (Optional)</h4>
                  <p className="form-add-pet-sub">Shortcut to register a pet patient along with this customer account.</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={addPet}
                onChange={e => setAddPet(e.target.checked)}
                onClick={e => e.stopPropagation()}
                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#2563eb' }}
              />
            </div>

            {!addPet && (
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
                <i className="fas fa-info-circle" style={{ marginRight: '0.35rem', color: '#3b82f6' }}></i>
                You can also register pets later at any time from the customer profile page.
              </p>
            )}

            {addPet && (
              <div className="form-grid-2col" style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">
                    <span>Pet Name <span className="form-card-required">*</span></span>
                  </label>
                  <input
                    type="text"
                    name="pet_name"
                    value={petData.pet_name}
                    onChange={handlePetChange}
                    placeholder="e.g., Milo"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span>Species <span className="form-card-required">*</span></span>
                  </label>
                  <select
                    name="species"
                    value={petData.species}
                    onChange={handlePetChange}
                    className="form-select"
                  >
                    <option value="">-- Select Species --</option>
                    {SPECIES_LIST.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label"><span>Breed</span></label>
                  <input
                    type="text"
                    name="breed"
                    value={petData.breed}
                    onChange={handlePetChange}
                    placeholder="e.g., Persian / Golden Retriever"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span>Gender <span className="form-card-required">*</span></span>
                  </label>
                  <select
                    name="gender"
                    value={petData.gender}
                    onChange={handlePetChange}
                    className="form-select"
                  >
                    <option value="">-- Select Gender --</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span>Date of Birth <span className="form-card-required">*</span></span>
                  </label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={petData.date_of_birth}
                    onChange={handlePetChange}
                    max={new Date().toISOString().split('T')[0]}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label"><span>Color</span></label>
                  <input
                    type="text"
                    name="color"
                    value={petData.color}
                    onChange={handlePetChange}
                    placeholder="e.g. Brown & White"
                    className="form-input"
                  />
                </div>

                <div className="form-group form-group-full">
                  <label className="form-label"><span>Weight (kg)</span></label>
                  <input
                    type="number"
                    name="weight_current"
                    value={petData.weight_current}
                    onChange={handlePetChange}
                    placeholder="e.g. 4.5"
                    min="0"
                    step="0.1"
                    className="form-input"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Form Actions */}
        <div className="form-action-footer">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="form-btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="form-btn-primary form-btn-purple"
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Saving...
              </>
            ) : (
              <>
                <i className={isEditMode ? 'fas fa-save' : 'fas fa-user-check'}></i>
                {isEditMode ? 'Update Customer Profile' : 'Save New Customer'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CustomerForm;
