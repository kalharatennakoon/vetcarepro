import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDiseaseCaseById, updateDiseaseCase, getCaseFollowups } from '../services/diseaseCaseService';
import { getPets } from '../services/petService';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';

const DiseaseCaseEdit = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [petLabel, setPetLabel] = useState('');
  const [followups, setFollowups] = useState([]);
  const [formData, setFormData] = useState({
    pet_id: '',
    disease_name: '',
    disease_category: '',
    diagnosis_date: '',
    symptoms: '',
    severity: 'moderate',
    is_contagious: false,
    outcome: '',
    treatment_duration: '',
    notes: '',
    region: '',
    requires_followup: false,
    followup_type: '',
    next_followup_date: '',
    followup_notes: ''
  });

  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess } = useNotification();

  const isVetOrAdmin = user?.role === 'veterinarian' || user?.role === 'admin';

  useEffect(() => {
    if (!isVetOrAdmin) {
      navigate('/disease-cases');
      return;
    }
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [casesResponse, petsResponse, followupsResponse] = await Promise.all([
        getDiseaseCaseById(id),
        getPets(),
        getCaseFollowups(id)
      ]);
      setFollowups(followupsResponse.data.followups || []);

      const caseData = casesResponse.data.case;
      const petsList = petsResponse.data.pets || [];

      const matchedPet = petsList.find(p => p.pet_id === caseData.pet_id);
      if (matchedPet) {
        setPetLabel(`${matchedPet.name || caseData.pet_name} — ${matchedPet.species} (${matchedPet.owner_first_name} ${matchedPet.owner_last_name})`);
      } else {
        setPetLabel(`${caseData.pet_name} — ${caseData.species}`);
      }

      setFormData({
        pet_id: caseData.pet_id || '',
        disease_name: caseData.disease_name || '',
        disease_category: caseData.disease_category || '',
        diagnosis_date: caseData.diagnosis_date ? caseData.diagnosis_date.split('T')[0] : '',
        symptoms: caseData.symptoms || '',
        severity: caseData.severity || 'moderate',
        is_contagious: caseData.is_contagious || false,
        outcome: caseData.outcome === 'ongoing' ? 'ongoing_treatment' : (caseData.outcome || ''),
        treatment_duration: caseData.treatment_duration_days || caseData.treatment_duration || '',
        notes: caseData.notes || '',
        region: caseData.region || '',
        requires_followup: caseData.requires_followup || false,
        followup_type: caseData.followup_type || '',
        next_followup_date: caseData.next_followup_date ? caseData.next_followup_date.split('T')[0] : '',
        followup_notes: caseData.followup_notes || ''
      });

      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load disease case');
      console.error(err);
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.disease_name.trim()) {
      setError('Please enter a disease name');
      return;
    }
    if (!formData.disease_category) {
      setError('Please select a disease category');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const dataToSubmit = {
        ...formData,
        treatment_duration: formData.treatment_duration ? parseInt(formData.treatment_duration) : null
      };

      await updateDiseaseCase(id, dataToSubmit);
      showSuccess('Disease case updated successfully');
      navigate(`/disease-cases/${id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update disease case');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={styles.loadingWrapper}>
          <i className="fas fa-circle-notch fa-spin" style={styles.loadingIcon}></i>
          <p style={styles.loadingText}>Loading disease case...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <button onClick={() => navigate(`/disease-cases/${id}`)} style={styles.backButton}>
              <i className="fas fa-arrow-left" style={{ marginRight: '0.4rem' }}></i>
              Back to Details
            </button>
            <h1 style={styles.title}>Edit Disease Case</h1>
            <p style={styles.subtitle}>
              <i className="fas fa-hashtag" style={{ marginRight: '0.3rem', fontSize: '0.85rem' }}></i>
              Case ID: CSE-{String(id).padStart(4, '0')}
            </p>
          </div>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <i className="fas fa-circle-exclamation" style={{ marginRight: '0.5rem' }}></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={styles.grid}>

            {/* Left column */}
            <div style={styles.leftColumn}>

              {/* Pet (read-only) */}
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>
                  <i className="fas fa-paw" style={styles.cardTitleIcon}></i>
                  Patient
                </h2>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Pet</label>
                  <div style={styles.readOnlyField}>
                    <i className="fas fa-lock" style={styles.lockIcon}></i>
                    {petLabel}
                  </div>
                  <p style={styles.hint}>Pet cannot be changed after a case is created</p>
                </div>
              </div>

              {/* Disease Details */}
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>
                  <i className="fas fa-virus" style={styles.cardTitleIcon}></i>
                  Disease Details
                </h2>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>
                    Disease Name <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    name="disease_name"
                    value={formData.disease_name}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Parvovirus, Hip Dysplasia"
                    style={styles.input}
                  />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>
                    Disease Category <span style={styles.required}>*</span>
                  </label>
                  <select
                    name="disease_category"
                    value={formData.disease_category}
                    onChange={handleChange}
                    required
                    style={styles.input}
                  >
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

                <div style={styles.twoCol}>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>
                      Diagnosis Date <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="date"
                      name="diagnosis_date"
                      value={formData.diagnosis_date}
                      onChange={handleChange}
                      required
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>
                      Severity <span style={styles.required}>*</span>
                    </label>
                    <select
                      name="severity"
                      value={formData.severity}
                      onChange={handleChange}
                      required
                      style={styles.input}
                    >
                      <option value="mild">Mild</option>
                      <option value="moderate">Moderate</option>
                      <option value="severe">Severe</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Symptoms</label>
                  <textarea
                    name="symptoms"
                    value={formData.symptoms}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Describe observed symptoms..."
                    style={styles.textarea}
                  />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Additional Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Any additional information about the case..."
                    style={styles.textarea}
                  />
                </div>
              </div>
            </div>

            {/* Right column */}
            <div style={styles.rightColumn}>

              {/* Outcome & Treatment */}
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>
                  <i className="fas fa-stethoscope" style={styles.cardTitleIcon}></i>
                  Outcome & Treatment
                </h2>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Outcome</label>
                  <select
                    name="outcome"
                    value={formData.outcome}
                    onChange={handleChange}
                    style={styles.input}
                  >
                    <option value="">Not yet determined</option>
                    <option value="recovered">Recovered</option>
                    <option value="ongoing_treatment">Ongoing Treatment</option>
                    <option value="chronic">Chronic</option>
                    <option value="deceased">Deceased</option>
                    <option value="transferred">Transferred</option>
                  </select>
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Treatment Duration (days)</label>
                  <input
                    type="number"
                    name="treatment_duration"
                    value={formData.treatment_duration}
                    onChange={handleChange}
                    min="0"
                    placeholder="e.g., 14"
                    style={styles.input}
                  />
                </div>
              </div>

              {/* Location & Contagion */}
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>
                  <i className="fas fa-location-dot" style={styles.cardTitleIcon}></i>
                  Location & Contagion
                </h2>

                <div style={styles.fieldGroup}>
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

                <div style={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    id="is_contagious"
                    name="is_contagious"
                    checked={formData.is_contagious}
                    onChange={handleChange}
                    style={styles.checkbox}
                  />
                  <label htmlFor="is_contagious" style={styles.checkboxLabel}>
                    <i className="fas fa-biohazard" style={{ marginRight: '0.4rem', color: '#dc2626' }}></i>
                    Mark as Contagious Disease
                  </label>
                </div>
              </div>

              {/* Follow-up Monitoring */}
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>
                  <i className="fas fa-calendar-check" style={{ ...styles.cardTitleIcon, color: '#f59e0b' }}></i>
                  Follow-up Monitoring
                </h2>

                <div style={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    id="requires_followup"
                    name="requires_followup"
                    checked={formData.requires_followup}
                    onChange={handleChange}
                    style={styles.checkbox}
                  />
                  <label htmlFor="requires_followup" style={styles.checkboxLabel}>
                    <i className="fas fa-bell" style={{ marginRight: '0.4rem', color: '#f59e0b' }}></i>
                    This case requires follow-up monitoring
                  </label>
                </div>

                {formData.requires_followup && (
                  <>
                    <div style={{ ...styles.fieldGroup, marginTop: '0.75rem' }}>
                      <label style={styles.label}>Follow-up Type</label>
                      <select
                        name="followup_type"
                        value={formData.followup_type}
                        onChange={handleChange}
                        style={styles.input}
                      >
                        <option value="">Select type...</option>
                        <option value="kidney_monitoring">Kidney Monitoring (post snake bite)</option>
                        <option value="blood_test">Blood Test</option>
                        <option value="general_checkup">General Checkup</option>
                        <option value="wound_inspection">Wound Inspection</option>
                        <option value="medication_review">Medication Review</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div style={styles.fieldGroup}>
                      <label style={styles.label}>Next Follow-up Date</label>
                      <input
                        type="date"
                        name="next_followup_date"
                        value={formData.next_followup_date}
                        onChange={handleChange}
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.fieldGroup}>
                      <label style={styles.label}>Follow-up Notes</label>
                      <textarea
                        name="followup_notes"
                        value={formData.followup_notes}
                        onChange={handleChange}
                        rows={3}
                        placeholder="e.g. Monitor BUN/creatinine levels weekly for 4 weeks..."
                        style={styles.textarea}
                      />
                    </div>
                  </>
                )}

                {followups.length > 0 && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f3f4f6' }}>
                    <p style={{ margin: '0 0 0.65rem', fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Visit History ({followups.length})
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {followups.map((fu, idx) => (
                        <div key={fu.followup_id} style={{ background: idx === 0 ? '#fffbeb' : '#f9fafb', border: `1px solid ${idx === 0 ? '#fde68a' : '#e5e7eb'}`, borderRadius: '8px', padding: '0.65rem 0.8rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#111827' }}>
                              <i className="fas fa-calendar" style={{ marginRight: '0.35rem', color: '#f59e0b' }}></i>
                              {new Date(fu.visit_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                            {idx === 0 && (
                              <span style={{ fontSize: '0.68rem', background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a', borderRadius: '9999px', padding: '0.1rem 0.5rem', fontWeight: '700' }}>LATEST</span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: '0.3rem' }}>
                            <i className="fas fa-user-doctor" style={{ marginRight: '0.3rem' }}></i>
                            Dr. {fu.recorded_by_name || 'Unknown'}
                          </div>
                          <p style={{ margin: '0 0 0.3rem', fontSize: '0.85rem', color: '#374151', lineHeight: '1.5' }}>{fu.notes}</p>
                          {fu.next_followup_date ? (
                            <div style={{ fontSize: '0.78rem', color: '#2563eb' }}>
                              <i className="fas fa-arrow-right" style={{ marginRight: '0.3rem' }}></i>
                              Next scheduled: {new Date(fu.next_followup_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.78rem', color: '#6b7280', fontStyle: 'italic' }}>
                              <i className="fas fa-check-circle" style={{ marginRight: '0.3rem', color: '#16a34a' }}></i>
                              No further follow-up scheduled
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={styles.actionsCard}>
                <button
                  type="button"
                  onClick={() => navigate(`/disease-cases/${id}`)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ ...styles.saveButton, opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? (
                    <>
                      <i className="fas fa-circle-notch fa-spin" style={{ marginRight: '0.4rem' }}></i>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-floppy-disk" style={{ marginRight: '0.4rem' }}></i>
                      Save Changes
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
};

const styles = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
  },
  loadingWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '1rem',
  },
  loadingIcon: {
    fontSize: '2.5rem',
    color: '#2563eb',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: '1rem',
    margin: 0,
  },
  header: {
    marginBottom: '1.75rem',
  },
  backButton: {
    backgroundColor: 'transparent',
    color: '#2563eb',
    border: 'none',
    padding: '0',
    fontSize: '0.9rem',
    fontWeight: '500',
    cursor: 'pointer',
    marginBottom: '0.75rem',
    display: 'flex',
    alignItems: 'center',
  },
  title: {
    fontSize: '1.875rem',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 0.35rem 0',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#6b7280',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '0.875rem 1rem',
    borderRadius: '8px',
    border: '1px solid #fecaca',
    marginBottom: '1.5rem',
    fontSize: '0.95rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: '1.5rem',
    alignItems: 'start',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 8px rgba(0,0,0,0.04)',
    padding: '1.5rem',
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 1.25rem 0',
    paddingBottom: '0.75rem',
    borderBottom: '2px solid #f3f4f6',
    display: 'flex',
    alignItems: 'center',
  },
  cardTitleIcon: {
    marginRight: '0.5rem',
    color: '#2563eb',
    fontSize: '0.95rem',
  },
  fieldGroup: {
    marginBottom: '1.1rem',
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  label: {
    display: 'block',
    fontSize: '0.78rem',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.4rem',
  },
  required: {
    color: '#dc2626',
  },
  input: {
    width: '100%',
    padding: '0.6rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.9rem',
    color: '#111827',
    backgroundColor: 'white',
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '0.6rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.9rem',
    color: '#111827',
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    lineHeight: '1.5',
  },
  readOnlyField: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 0.75rem',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#f9fafb',
    fontSize: '0.9rem',
    color: '#6b7280',
  },
  lockIcon: {
    color: '#9ca3af',
    fontSize: '0.75rem',
    flexShrink: 0,
  },
  hint: {
    fontSize: '0.78rem',
    color: '#9ca3af',
    margin: '0.3rem 0 0 0',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.75rem',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#fef2f2',
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  checkboxLabel: {
    fontSize: '0.9rem',
    fontWeight: '500',
    color: '#374151',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  actionsCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  saveButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '0.75rem',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  cancelButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '0.75rem',
    backgroundColor: 'white',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
};

export default DiseaseCaseEdit;
