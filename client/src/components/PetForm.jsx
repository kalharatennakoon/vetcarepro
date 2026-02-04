import { useState, useEffect } from 'react';
import { getPetById, createPet, updatePet, getSpeciesList } from '../services/petService';
import { getCustomers } from '../services/customerService';

const PetForm = ({ petId, customerId, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customers, setCustomers] = useState([]);
  const [speciesList, setSpeciesList] = useState([]);
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
    fetchCustomers();
    fetchSpeciesList();
    if (petId) {
      loadPet();
    }
  }, [petId]);

  const fetchCustomers = async () => {
    try {
      const response = await getCustomers({});
      setCustomers(response.data.customers || []);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  const fetchSpeciesList = async () => {
    try {
      const response = await getSpeciesList();
      const speciesNames = response.data.species?.map(s => s.species) || [];
      setSpeciesList(speciesNames);
    } catch (err) {
      console.error('Failed to fetch species list:', err);
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

    // Validate date is not in future
    if (new Date(formData.date_of_birth) > new Date()) {
      setError('Date of birth cannot be in the future');
      return false;
    }

    // Validate weight if provided
    if (formData.weight_current && (isNaN(formData.weight_current) || parseFloat(formData.weight_current) <= 0)) {
      setError('Weight must be a positive number');
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

      // Prepare data
      const petData = {
        ...formData,
        customer_id: parseInt(formData.customer_id),
        weight_current: formData.weight_current ? parseFloat(formData.weight_current) : null,
        // Convert empty strings to null for optional fields
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
      } else {
        await createPet(petData);
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
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading pet data...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>{isEditMode ? 'Edit Pet' : 'Add New Pet'}</h2>
        <button onClick={onCancel} style={styles.cancelButton}><i className="fas fa-times"></i></button>
      </div>

      {error && (
        <div style={styles.errorBox}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Basic Information */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Basic Information</h3>
          
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Owner <span style={styles.required}>*</span>
              </label>
              <select
                name="customer_id"
                value={formData.customer_id}
                onChange={handleChange}
                style={styles.select}
                required
                disabled={!!customerId}
              >
                <option value="">Select Owner</option>
                {customers.map(customer => (
                  <option key={customer.customer_id} value={customer.customer_id}>
                    {customer.first_name} {customer.last_name} ({customer.phone})
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Pet Name <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="pet_name"
                value={formData.pet_name}
                onChange={handleChange}
                style={styles.input}
                placeholder="e.g., Bruno"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Species <span style={styles.required}>*</span>
              </label>
              <select
                name="species"
                value={formData.species}
                onChange={handleChange}
                style={styles.select}
                required
              >
                <option value="">Select Species</option>
                {speciesList.map(species => (
                  <option key={species} value={species}>{species}</option>
                ))}
                <option value="Other">Other</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Breed</label>
              <input
                type="text"
                name="breed"
                value={formData.breed}
                onChange={handleChange}
                style={styles.input}
                placeholder="e.g., Labrador Retriever"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Gender <span style={styles.required}>*</span>
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                style={styles.select}
                required
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Date of Birth <span style={styles.required}>*</span>
              </label>
              <input
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
                style={styles.input}
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Color</label>
              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleChange}
                style={styles.input}
                placeholder="e.g., Golden"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Current Weight (kg)</label>
              <input
                type="number"
                name="weight_current"
                value={formData.weight_current}
                onChange={handleChange}
                style={styles.input}
                placeholder="e.g., 28.5"
                step="0.1"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Medical Information */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Medical Information</h3>
          
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Insurance Provider</label>
              <input
                type="text"
                name="insurance_provider"
                value={formData.insurance_provider}
                onChange={handleChange}
                style={styles.input}
                placeholder="e.g., Pet Insurance Co."
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Insurance Policy Number</label>
              <input
                type="text"
                name="insurance_policy_number"
                value={formData.insurance_policy_number}
                onChange={handleChange}
                style={styles.input}
                placeholder="Policy number"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="is_neutered"
                  checked={formData.is_neutered}
                  onChange={handleChange}
                  style={styles.checkbox}
                />
                Neutered/Spayed
              </label>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Allergies</label>
              <input
                type="text"
                name="allergies"
                value={formData.allergies}
                onChange={handleChange}
                style={styles.input}
                placeholder="e.g., Penicillin"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Special Needs</label>
              <input
                type="text"
                name="special_needs"
                value={formData.special_needs}
                onChange={handleChange}
                style={styles.input}
                placeholder="e.g., Sensitive stomach"
              />
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Additional Information</h3>
          
          <div style={styles.formGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                style={styles.checkbox}
              />
              Active Patient
            </label>
            <p style={styles.helpText}>Uncheck if the pet is deceased or no longer a patient</p>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              style={styles.textarea}
              placeholder="Any additional notes about the pet..."
              rows="4"
            />
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
            {loading ? 'Saving...' : (isEditMode ? 'Update Pet' : 'Add Pet')}
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
    padding: '0.5rem',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '1.5rem',
    color: '#6b7280',
    cursor: 'pointer',
    borderRadius: '4px',
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
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  section: {
    marginBottom: '2rem',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '1rem',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
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
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  helpText: {
    fontSize: '0.75rem',
    color: '#6b7280',
    margin: '0.25rem 0 0 0',
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

export default PetForm;
