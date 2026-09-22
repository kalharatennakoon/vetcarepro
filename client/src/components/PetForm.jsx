import { useState, useEffect, useRef } from 'react';
import { getPetById, createPet, updatePet } from '../services/petService';
import { getCustomers } from '../services/customerService';
import { useNotification } from '../context/NotificationContext';
import '../styles/FormPagesModern.css';

const SPECIES_LIST = [
  'Dog', 'Cat', 'Bird', 'Rabbit', 'Guinea Pig', 'Hamster',
  'Parrot', 'Budgie', 'Pigeon', 'Hen',
  'Cow', 'Goat', 'Pig', 'Sheep',
  'Snake', 'Lizard', 'Turtle',
  'Exotic Animal', 'Monkey', 'Deer',
  'Rescue/Admitted Wildlife', 'Other',
];

const PetForm = ({ petId, customerId, onSuccess, onCancel }) => {
  const { showSuccess } = useNotification();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const errorRef = useRef(null);
  const [customers, setCustomers] = useState([]);
  const [formData, setFormData] = useState({
    customer_id: customerId || '',
    pet_name: '',
    species: '',
    breed: '',
    gender: '',
    date_of_birth: '',
    color: '',
    weight_current: '',
    insurance_provider: '',
    insurance_policy_number: '',
    is_neutered: false,
    allergies: '',
    special_needs: '',
    is_active: true,
    notes: ''
  });

  const isEditMode = !!petId;

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);

  useEffect(() => {
    fetchCustomers();
    if (petId) {
      loadPet();
    }
  }, [petId]);

  const fetchCustomers = async () => {
    try {
      const response = await getCustomers({});
      const list = response.data.customers || [];
      list.sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`));
      setCustomers(list);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  const loadPet = async () => {
    try {
      setLoading(true);
      const response = await getPetById(petId);
      const pet = response.data.pet;
      
      setFormData({
        customer_id: pet.customer_id || '',
        pet_name: pet.pet_name || '',
        species: pet.species || '',
        breed: pet.breed || '',
        gender: pet.gender || '',
        date_of_birth: pet.date_of_birth ? pet.date_of_birth.split('T')[0] : '',
        color: pet.color || '',
        weight_current: pet.weight_current || '',
        insurance_provider: pet.insurance_provider || '',
        insurance_policy_number: pet.insurance_policy_number || '',
        is_neutered: pet.is_neutered || false,
        allergies: pet.allergies || '',
        special_needs: pet.special_needs || '',
        is_active: pet.is_active !== undefined ? pet.is_active : true,
        notes: pet.notes || ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load pet data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.customer_id) {
      setError('Please select an owner');
      return false;
    }
    if (!formData.pet_name.trim()) {
      setError('Pet name is required');
      return false;
    }
    if (!formData.species) {
      setError('Species is required');
      return false;
    }
    if (!formData.gender) {
      setError('Gender is required');
      return false;
    }
    if (!formData.date_of_birth) {
      setError('Date of birth is required');
      return false;
    }

    if (new Date(formData.date_of_birth) > new Date()) {
      setError('Date of birth cannot be in the future');
      return false;
    }

    if (formData.weight_current && (isNaN(formData.weight_current) || parseFloat(formData.weight_current) <= 0)) {
      setError('Weight must be a positive number');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError('');

      const petData = {
        ...formData,
        weight_current: formData.weight_current ? parseFloat(formData.weight_current) : null,
        breed: formData.breed.trim() || null,
        color: formData.color.trim() || null,
        insurance_provider: formData.insurance_provider.trim() || null,
        insurance_policy_number: formData.insurance_policy_number.trim() || null,
        allergies: formData.allergies.trim() || null,
        special_needs: formData.special_needs.trim() || null,
        notes: formData.notes.trim() || null
      };

      if (isEditMode) {
        await updatePet(petId, petData);
        showSuccess('Pet updated successfully');
      } else {
        await createPet(petData);
        showSuccess('Pet added successfully');
      }

      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} pet`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return (
      <div className="form-page-loading">
        <div className="form-page-spinner"></div>
        <p style={{ color: '#64748b', fontWeight: '500' }}>Loading pet patient details...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="form-card-header">
        <div className="form-card-title-group">
          <h2 className="form-card-title">{isEditMode ? 'Edit Pet Patient' : 'Pet Patient Profile'}</h2>
          <p className="form-card-subtitle">Fill in the basic information, medical attributes, and notes below.</p>
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
          <i className="fas fa-info-circle" style={{ color: '#2563eb' }}></i>
          <span>Fields marked with <span className="form-card-required">*</span> are required.</span>
        </div>

        {/* Section 1: Basic Information */}
        <div className="form-section-box">
          <div className="form-section-header">
            <div className="form-section-icon">
              <i className="fas fa-paw"></i>
            </div>
            <h3 className="form-section-title">1. Basic Information & Ownership</h3>
          </div>

          <div className="form-grid-2col">
            <div className="form-group">
              <label className="form-label">
                <span>Owner <span className="form-card-required">*</span></span>
              </label>
              <select
                name="customer_id"
                value={formData.customer_id}
                onChange={handleChange}
                className="form-select"
                required
                disabled={!!customerId}
              >
                <option value="">-- Select Owner --</option>
                {customers.map(customer => (
                  <option key={customer.customer_id} value={customer.customer_id}>
                    {customer.first_name} {customer.last_name} ({customer.phone})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Pet Name <span className="form-card-required">*</span></span>
              </label>
              <input
                type="text"
                name="pet_name"
                value={formData.pet_name}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., Bruno"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Species <span className="form-card-required">*</span></span>
              </label>
              <select
                name="species"
                value={formData.species}
                onChange={handleChange}
                className="form-select"
                required
              >
                <option value="">-- Select Species --</option>
                {SPECIES_LIST.map(species => (
                  <option key={species} value={species}>{species}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label"><span>Breed</span></label>
              <input
                type="text"
                name="breed"
                value={formData.breed}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., Labrador Retriever"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Gender <span className="form-card-required">*</span></span>
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="form-select"
                required
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
                value={formData.date_of_birth}
                onChange={handleChange}
                className="form-input"
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label"><span>Color / Markings</span></label>
              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., Golden / White chest"
              />
            </div>

            <div className="form-group">
              <label className="form-label"><span>Current Weight (kg)</span></label>
              <input
                type="number"
                name="weight_current"
                value={formData.weight_current}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., 28.5"
                step="0.1"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Medical & Insurance */}
        <div className="form-section-box">
          <div className="form-section-header">
            <div className="form-section-icon">
              <i className="fas fa-notes-medical"></i>
            </div>
            <h3 className="form-section-title">2. Medical Attributes & Insurance</h3>
          </div>

          <div className="form-grid-2col">
            <div className="form-group">
              <label className="form-label"><span>Insurance Provider</span></label>
              <input
                type="text"
                name="insurance_provider"
                value={formData.insurance_provider}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., Ceylinco / Fairfirst Pet Insurance"
              />
            </div>

            <div className="form-group">
              <label className="form-label"><span>Policy Number</span></label>
              <input
                type="text"
                name="insurance_policy_number"
                value={formData.insurance_policy_number}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., POL-882319"
              />
            </div>

            <div className="form-group">
              <label className="form-label"><span>Allergies</span></label>
              <input
                type="text"
                name="allergies"
                value={formData.allergies}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., Penicillin, Flea bites"
              />
            </div>

            <div className="form-group">
              <label className="form-label"><span>Special Needs</span></label>
              <input
                type="text"
                name="special_needs"
                value={formData.special_needs}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., Sensitive stomach, Blind in left eye"
              />
            </div>

            <div className="form-group form-group-full">
              <label className="form-checkbox-card">
                <input
                  type="checkbox"
                  name="is_neutered"
                  checked={formData.is_neutered}
                  onChange={handleChange}
                />
                <div>
                  <div className="form-checkbox-label">Neutered / Spayed</div>
                  <div className="form-checkbox-subtext">Check if the pet has undergone reproductive desexing surgery.</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Section 3: Status & Notes */}
        <div className="form-section-box">
          <div className="form-section-header">
            <div className="form-section-icon">
              <i className="fas fa-sticky-note"></i>
            </div>
            <h3 className="form-section-title">3. Status & General Notes</h3>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-checkbox-card">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
              />
              <div>
                <div className="form-checkbox-label">Active Patient Record</div>
                <div className="form-checkbox-subtext">Uncheck if the pet is deceased or no longer receiving treatment at this clinic.</div>
              </div>
            </label>
          </div>

          <div className="form-group">
            <label className="form-label"><span>Additional Notes</span></label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="form-textarea"
              placeholder="Any additional dietary requirements, temperament notes, or handling instructions..."
              rows="3"
            />
          </div>
        </div>

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
            className="form-btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Saving...
              </>
            ) : (
              <>
                <i className={isEditMode ? 'fas fa-save' : 'fas fa-plus'}></i>
                {isEditMode ? 'Update Pet Details' : 'Save New Pet'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PetForm;
