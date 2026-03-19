import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPets } from '../services/petService';
import { createDiseaseCase } from '../services/diseaseCaseService';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';

const DiseaseCaseCreate = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pets, setPets] = useState([]);
  const [formData, setFormData] = useState({
    pet_id: '',
    disease_name: '',
    disease_category: '',
    diagnosis_date: new Date().toISOString().split('T')[0],
    symptoms: '',
    severity: 'moderate',
    is_contagious: false,
    transmission_method: '',
    outcome: '',
    treatment_duration_days: '',
    notes: '',
    region: '',
    requires_followup: false,
    followup_type: '',
    next_followup_date: '',
    followup_notes: ''
  });

  const navigate = useNavigate();
  const { showSuccess } = useNotification();

  useEffect(() => {
    fetchPets();
  }, []);

  const fetchPets = async () => {
    try {
      const response = await getPets();
      setPets(response.data.pets || []);
    } catch (err) {
      setError('Failed to load pets');
      console.error(err);
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.pet_id) { setError('Please select a pet'); return; }
    if (!formData.disease_name) { setError('Please enter disease name'); return; }
    if (!formData.disease_category) { setError('Please select disease category'); return; }

    try {
      setLoading(true);
      setError('');

      const dataToSubmit = {
        ...formData,
        treatment_duration_days: formData.treatment_duration_days ? parseInt(formData.treatment_duration_days) : null
      };

      await createDiseaseCase(dataToSubmit);
      showSuccess('Disease case created successfully');
      navigate('/analytics');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create disease case');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div style={styles.pageHeader}>
        <div>
          <h2 style={styles.title}>Create Disease Case</h2>
          <p style={styles.subtitle}>Record a new disease case for ML training and tracking</p>
        </div>
        <button onClick={() => navigate('/analytics')} style={styles.backButton}>
          <i className="fas fa-arrow-left" style={{ marginRight: '0.5rem' }}></i>
          Back to Analytics
        </button>
      </div>

      {error && (
        <div style={styles.errorBox}>
          <i className="fas fa-exclamation-circle" style={{ marginRight: '0.5rem' }}></i>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Pet Selection */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Patient Information</h3>
          <div style={styles.formGroup}>
            <label style={styles.label}>Pet <span style={styles.required}>*</span></label>
            <select
              name="pet_id"
              value={formData.pet_id}
              onChange={handleChange}
              style={styles.select}
              required
            >
              <option value="">Select a pet</option>
              {[...pets]
                .sort((a, b) => (a.pet_name || a.name || '').localeCompare(b.pet_name || b.name || ''))
                .map(pet => (
                  <option key={pet.pet_id} value={pet.pet_id}>
                    {pet.pet_name || pet.name} — {pet.species} ({pet.owner_first_name} {pet.owner_last_name})
                  </option>
                ))
              }
            </select>
          </div>
        </div>

        {/* Disease Information */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Disease Information</h3>

          <div style={styles.grid2}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Disease Name <span style={styles.required}>*</span></label>
              <input
                type="text"
                name="disease_name"
                value={formData.disease_name}
                onChange={handleChange}
                placeholder="e.g., Snake bite envenomation, Parvovirus"
                style={styles.input}
                required
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Disease Category <span style={styles.required}>*</span></label>
              <select name="disease_category" value={formData.disease_category} onChange={handleChange} style={styles.select} required>
                <option value="">Select category</option>
                <option value="infectious">Infectious</option>
                <option value="parasitic">Parasitic</option>
                <option value="metabolic">Metabolic</option>
                <option value="genetic">Genetic</option>
                <option value="immune_mediated">Immune Mediated</option>
                <option value="neoplastic">Neoplastic (Cancer)</option>
                <option value="traumatic">Traumatic</option>
                <option value="nutritional">Nutritional</option>
              </select>
            </div>
          </div>

          <div style={styles.grid2}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Diagnosis Date <span style={styles.required}>*</span></label>
              <input
                type="date"
                name="diagnosis_date"
                value={formData.diagnosis_date}
                onChange={handleChange}
                style={styles.input}
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Severity <span style={styles.required}>*</span></label>
              <select name="severity" value={formData.severity} onChange={handleChange} style={styles.select} required>
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Symptoms</label>
            <textarea
              name="symptoms"
              value={formData.symptoms}
              onChange={handleChange}
              rows="3"
              placeholder="Describe observed symptoms..."
              style={styles.textarea}
            />
          </div>
        </div>

        {/* Outcome & Treatment */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Outcome & Treatment</h3>

          <div style={styles.grid2}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Outcome</label>
              <select name="outcome" value={formData.outcome} onChange={handleChange} style={styles.select}>
                <option value="">Not yet determined</option>
                <option value="recovered">Recovered</option>
                <option value="ongoing_treatment">Ongoing Treatment</option>
                <option value="chronic">Chronic</option>
                <option value="deceased">Deceased</option>
                <option value="transferred">Transferred</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Treatment Duration (days)</label>
              <input
                type="number"
                name="treatment_duration_days"
                value={formData.treatment_duration_days}
                onChange={handleChange}
                min="0"
                placeholder="e.g., 14"
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.grid2}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Region / Location</label>
              <input
                type="text"
                name="region"
                value={formData.region}
                onChange={handleChange}
                placeholder="e.g., Colombo, Kandy"
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '1.75rem' }}>
                <input
                  type="checkbox"
                  name="is_contagious"
                  checked={formData.is_contagious}
                  onChange={handleChange}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                Contagious Disease
              </label>
            </div>
          </div>

          {formData.is_contagious && (
            <div style={styles.formGroup}>
              <label style={styles.label}>Transmission Method</label>
              <input
                type="text"
                name="transmission_method"
                value={formData.transmission_method}
                onChange={handleChange}
                placeholder="e.g., Direct contact, Airborne, Vector-borne"
                style={styles.input}
              />
            </div>
          )}
        </div>

        {/* Follow-up */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Follow-up</h3>

          <div style={styles.formGroup}>
            <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="requires_followup"
                checked={formData.requires_followup}
                onChange={handleChange}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              Follow-up Required
            </label>
          </div>

          {formData.requires_followup && (
            <>
              <div style={styles.grid2}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Follow-up Type</label>
                  <input
                    type="text"
                    name="followup_type"
                    value={formData.followup_type}
                    onChange={handleChange}
                    placeholder="e.g., Kidney function monitoring, Blood test"
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Next Follow-up Date</label>
                  <input
                    type="date"
                    name="next_followup_date"
                    value={formData.next_followup_date}
                    onChange={handleChange}
                    style={styles.input}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Follow-up Notes</label>
                <textarea
                  name="followup_notes"
                  value={formData.followup_notes}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Instructions or observations for the follow-up visit..."
                  style={styles.textarea}
                />
              </div>
            </>
          )}
        </div>

        {/* Notes */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Additional Notes</h3>
          <div style={styles.formGroup}>
            <label style={styles.label}>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="4"
              placeholder="Any additional information about the case..."
              style={styles.textarea}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button type="button" onClick={() => navigate('/analytics')} style={styles.cancelButton} disabled={loading}>
            Cancel
          </button>
          <button type="submit" style={styles.submitButton} disabled={loading}>
            {loading ? (
              <><i className="fas fa-circle-notch fa-spin" style={{ marginRight: '0.5rem' }}></i>Creating...</>
            ) : (
              <><i className="fas fa-plus" style={{ marginRight: '0.5rem' }}></i>Create Disease Case</>
            )}
          </button>
        </div>
      </form>
    </Layout>
  );
};

const styles = {
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    gap: '1rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 0.25rem 0',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#6b7280',
    margin: 0,
  },
  backButton: {
    padding: '0.6rem 1.2rem',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
  },
  errorBox: {
    padding: '1rem',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    border: '1px solid #fecaca',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
    padding: '1.5rem',
    border: '1px solid #e5e7eb',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 1.25rem 0',
    paddingBottom: '0.75rem',
    borderBottom: '2px solid #e5e7eb',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1rem',
    marginBottom: '1rem',
  },
  formGroup: {
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
    padding: '0.65rem 0.875rem',
    fontSize: '0.875rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    fontFamily: 'inherit',
  },
  select: {
    padding: '0.65rem 0.875rem',
    fontSize: '0.875rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  textarea: {
    padding: '0.65rem 0.875rem',
    fontSize: '0.875rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    paddingTop: '0.5rem',
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
  },
  submitButton: {
    padding: '0.75rem 1.75rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: '#2563eb',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
};

export default DiseaseCaseCreate;
