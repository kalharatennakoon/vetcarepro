import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getPets } from '../services/petService';
import { createDiseaseCase } from '../services/diseaseCaseService';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';

const DIAGNOSIS_METHODS = [
  { value: 'clinical_examination',  label: 'Clinical Examination — Physical findings by veterinarian' },
  { value: 'blood_test',            label: 'Blood Test / Haematology & Biochemistry' },
  { value: 'urinalysis',            label: 'Urinalysis' },
  { value: 'x_ray',                 label: 'Radiography (X-Ray)' },
  { value: 'ultrasound',            label: 'Ultrasonography' },
  { value: 'biopsy',                label: 'Biopsy / Histopathology' },
  { value: 'culture_sensitivity',   label: 'Culture & Sensitivity Test' },
  { value: 'cytology',              label: 'Cytology / Fine Needle Aspirate (FNA)' },
  { value: 'pcr_test',              label: 'PCR / Molecular Diagnostic Test' },
  { value: 'serology',              label: 'Serology / Antibody Titre Test' },
  { value: 'ecg',                   label: 'Electrocardiogram (ECG)' },
  { value: 'mri_ct',                label: 'MRI / CT Scan' },
  { value: 'endoscopy',             label: 'Endoscopy' },
  { value: 'owner_history',         label: 'Owner History & Clinical Presentation' },
  { value: 'post_mortem',           label: 'Post-Mortem / Necropsy' },
];

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const DiseaseCaseCreate = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pets, setPets] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [formData, setFormData] = useState({
    pet_id: '',
    appointment_id: '',
    disease_name: '',
    disease_category: '',
    diagnosis_date: localToday(),
    diagnosis_method: '',
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
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    fetchPets();
  }, []);

  useEffect(() => {
    if (formData.pet_id) {
      fetchPetAppointments(formData.pet_id);
      setFormData(prev => ({ ...prev, appointment_id: '' }));
    } else {
      setAppointments([]);
    }
  }, [formData.pet_id]);

  const fetchPets = async () => {
    try {
      const response = await getPets();
      setPets(response.data.pets || []);
    } catch (err) {
      setError('Failed to load pets');
      console.error(err);
    }
  };

  const fetchPetAppointments = async (petId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/appointments?pet_id=${petId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const today = localToday();
      const past = (response.data.data.appointments || []).filter(a =>
        a.appointment_date <= today &&
        !['cancelled', 'scheduled', 'no_show'].includes(a.status)
      );
      setAppointments(past);
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'appointment_id') {
      const selected = appointments.find(a => String(a.appointment_id) === String(value));
      setFormData(prev => ({
        ...prev,
        appointment_id: value,
        diagnosis_date: selected ? selected.appointment_date.split('T')[0] : prev.diagnosis_date
      }));
      setError('');
      return;
    }
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
  };

  const validate = () => {
    if (!formData.pet_id)            { setError('Please select a pet'); return false; }
    if (!formData.disease_name)      { setError('Disease Name is required'); return false; }
    if (!formData.disease_category)  { setError('Disease Category is required'); return false; }
    if (!formData.diagnosis_method)  { setError('Diagnosis Method is required'); return false; }
    if (!formData.symptoms.trim())   { setError('Symptoms are required'); return false; }
    if (!formData.outcome)           { setError('Outcome is required'); return false; }
    if (!formData.treatment_duration_days) { setError('Treatment Duration is required'); return false; }
    if (!formData.region.trim())     { setError('Region / Location is required'); return false; }
    if (formData.requires_followup) {
      if (!formData.followup_type.trim())    { setError('Follow-up Type is required when Follow-up is checked'); return false; }
      if (!formData.next_followup_date)      { setError('Next Follow-up Date is required when Follow-up is checked'); return false; }
      if (!formData.followup_notes.trim())   { setError('Follow-up Notes are required when Follow-up is checked'); return false; }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

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
        <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 1rem 0' }}>
          Fields marked with <span style={{ color: '#ef4444' }}>*</span> are required.
        </p>

        {/* Patient Information */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Patient Information</h3>
          <div style={styles.grid2}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Pet <span style={styles.required}>*</span></label>
              <select name="pet_id" value={formData.pet_id} onChange={handleChange} style={styles.select} required>
                <option value="">Select a pet</option>
                {[...pets]
                  .sort((a, b) => (a.pet_name || '').localeCompare(b.pet_name || ''))
                  .map(pet => (
                    <option key={pet.pet_id} value={pet.pet_id}>
                      {pet.pet_name} — {pet.species} ({pet.owner_first_name} {pet.owner_last_name})
                    </option>
                  ))}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Related Appointment</label>
              <select name="appointment_id" value={formData.appointment_id} onChange={handleChange} style={styles.select}>
                <option value="">
                  {!formData.pet_id ? 'Select a pet first' : appointments.length === 0 ? 'No past appointments found' : 'Select an appointment...'}
                </option>
                {appointments.map(appt => (
                  <option key={appt.appointment_id} value={appt.appointment_id}>
                    {new Date(appt.appointment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} — {appt.reason} ({appt.status})
                  </option>
                ))}
              </select>
              {formData.appointment_id && (
                <span style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>Pre-filled from appointment — adjust if diagnosis was confirmed on a different date</span>
              )}
            </div>
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
                placeholder="e.g., Canine Parvovirus, Snake Bite Envenomation"
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
                max={localToday()}
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
            <label style={styles.label}>
              How was the disease diagnosed / identified? <span style={styles.required}>*</span>
            </label>
            <select name="diagnosis_method" value={formData.diagnosis_method} onChange={handleChange} style={styles.select} required>
              <option value="">Select diagnosis method</option>
              {DIAGNOSIS_METHODS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.3rem' }}>
              Accurate diagnosis method improves disease prediction model quality.
            </span>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Symptoms <span style={styles.required}>*</span></label>
            <textarea
              name="symptoms"
              value={formData.symptoms}
              onChange={handleChange}
              rows="3"
              placeholder="Describe all observed symptoms in detail (e.g., haemorrhagic diarrhoea, vomiting, lethargy, fever 40.2°C)..."
              style={styles.textarea}
            />
          </div>
        </div>

        {/* Outcome & Treatment */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Outcome & Treatment</h3>

          <div style={styles.grid2}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Outcome <span style={styles.required}>*</span></label>
              <select name="outcome" value={formData.outcome} onChange={handleChange} style={styles.select} required>
                <option value="">Select outcome</option>
                <option value="recovered">Recovered</option>
                <option value="ongoing_treatment">Ongoing Treatment</option>
                <option value="chronic">Chronic</option>
                <option value="deceased">Deceased</option>
                <option value="transferred">Transferred</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Treatment Duration (days) <span style={styles.required}>*</span></label>
              <input
                type="number"
                name="treatment_duration_days"
                value={formData.treatment_duration_days}
                onChange={handleChange}
                min="0"
                placeholder="e.g., 14"
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.grid2}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Region / Location <span style={styles.required}>*</span></label>
              <input
                type="text"
                name="region"
                value={formData.region}
                onChange={handleChange}
                placeholder="e.g., Colombo, Kandy, Galle"
                style={styles.input}
                required
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
                  <label style={styles.label}>Follow-up Type <span style={styles.required}>*</span></label>
                  <input
                    type="text"
                    name="followup_type"
                    value={formData.followup_type}
                    onChange={handleChange}
                    placeholder="e.g., Kidney function monitoring, Blood recheck"
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Next Follow-up Date <span style={styles.required}>*</span></label>
                  <input
                    type="date"
                    name="next_followup_date"
                    value={formData.next_followup_date}
                    onChange={handleChange}
                    style={styles.input}
                    min={localToday()}
                  />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Follow-up Notes <span style={styles.required}>*</span></label>
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

        {/* Additional Notes */}
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
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem' },
  title: { fontSize: '2rem', fontWeight: '600', color: '#111827', margin: '0 0 0.25rem 0' },
  subtitle: { fontSize: '0.9rem', color: '#6b7280', margin: 0 },
  backButton: { padding: '0.6rem 1.2rem', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' },
  errorBox: { padding: '1rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #fecaca', fontSize: '0.875rem', display: 'flex', alignItems: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  section: { backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', padding: '1.5rem', border: '1px solid #e5e7eb' },
  sectionTitle: { fontSize: '1rem', fontWeight: '600', color: '#374151', margin: '0 0 1.25rem 0', paddingBottom: '0.75rem', borderBottom: '2px solid #e5e7eb' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' },
  formGroup: { display: 'flex', flexDirection: 'column', marginBottom: '1rem' },
  label: { fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' },
  required: { color: '#dc2626' },
  input: { padding: '0.65rem 0.875rem', fontSize: '0.875rem', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none', fontFamily: 'inherit' },
  select: { padding: '0.65rem 0.875rem', fontSize: '0.875rem', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none', backgroundColor: 'white', cursor: 'pointer', fontFamily: 'inherit' },
  textarea: { padding: '0.65rem 0.875rem', fontSize: '0.875rem', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '0.5rem' },
  cancelButton: { padding: '0.75rem 1.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#374151', backgroundColor: '#ffffff', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' },
  submitButton: { padding: '0.75rem 1.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#ffffff', backgroundColor: '#2563eb', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' },
};

export default DiseaseCaseCreate;
