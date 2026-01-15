import { useState, useEffect } from 'react';
import axios from 'axios';

const MedicalRecordForm = ({ recordId, petId, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pets, setPets] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [veterinarians, setVeterinarians] = useState([]);
  const [formData, setFormData] = useState({
    pet_id: petId || '',
    appointment_id: '',
    veterinarian_id: '',
    visit_date: new Date().toISOString().split('T')[0],
    chief_complaint: '',
    symptoms: '',
    diagnosis: '',
    treatment: '',
    prescription: '',
    lab_tests: '',
    lab_results: '',
    weight: '',
    temperature: '',
    heart_rate: '',
    respiratory_rate: '',
    follow_up_required: false,
    follow_up_date: '',
    notes: ''
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  const isEditMode = !!recordId;

  useEffect(() => {
    if (!petId) {
      fetchPets();
    }
    fetchVeterinarians();
    if (recordId) {
      loadRecord();
    }
  }, [recordId, petId]);

  useEffect(() => {
    if (formData.pet_id) {
      fetchPetAppointments(formData.pet_id);
    }
  }, [formData.pet_id]);

  const fetchPets = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/pets?is_active=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPets(response.data.data.pets || []);
    } catch (err) {
      console.error('Failed to fetch pets:', err);
    }
  };

  const fetchPetAppointments = async (petId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/appointments?pet_id=${petId}&status=completed`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAppointments(response.data.data.appointments || []);
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    }
  };

  const fetchVeterinarians = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/users/veterinarians`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVeterinarians(response.data.data.veterinarians || []);
    } catch (err) {
      console.error('Failed to fetch veterinarians:', err);
    }
  };

  const loadRecord = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/medical-records/${recordId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const record = response.data.data.record;
      
      setFormData({
        pet_id: record.pet_id,
        appointment_id: record.appointment_id || '',
        veterinarian_id: record.veterinarian_id,
        visit_date: record.visit_date,
        chief_complaint: record.chief_complaint || '',
        symptoms: record.symptoms || '',
        diagnosis: record.diagnosis || '',
        treatment: record.treatment || '',
        prescription: record.prescription || '',
        lab_tests: record.lab_tests || '',
        lab_results: record.lab_results || '',
        weight: record.weight || '',
        temperature: record.temperature || '',
        heart_rate: record.heart_rate || '',
        respiratory_rate: record.respiratory_rate || '',
        follow_up_required: record.follow_up_required || false,
        follow_up_date: record.follow_up_date || '',
        notes: record.notes || ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load medical record');
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
    if (!formData.pet_id) {
      setError('Please select a pet');
      return false;
    }
    if (!formData.veterinarian_id) {
      setError('Please select a veterinarian');
      return false;
    }
    if (!formData.visit_date) {
      setError('Visit date is required');
      return false;
    }
    if (!formData.diagnosis.trim()) {
      setError('Diagnosis is required');
      return false;
    }
    
    // Validate vital signs if provided
    if (formData.temperature && (parseFloat(formData.temperature) < 35 || parseFloat(formData.temperature) > 43)) {
      setError('Temperature must be between 35°C and 43°C');
      return false;
    }
    if (formData.heart_rate && (parseInt(formData.heart_rate) < 40 || parseInt(formData.heart_rate) > 220)) {
      setError('Heart rate must be between 40 and 220 bpm');
      return false;
    }
    if (formData.respiratory_rate && (parseInt(formData.respiratory_rate) < 10 || parseInt(formData.respiratory_rate) > 80)) {
      setError('Respiratory rate must be between 10 and 80 breaths/min');
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

      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const recordData = {
        pet_id: parseInt(formData.pet_id),
        appointment_id: formData.appointment_id ? parseInt(formData.appointment_id) : null,
        veterinarian_id: parseInt(formData.veterinarian_id),
        visit_date: formData.visit_date,
        chief_complaint: formData.chief_complaint.trim() || null,
        symptoms: formData.symptoms.trim() || null,
        diagnosis: formData.diagnosis.trim(),
        treatment: formData.treatment.trim() || null,
        prescription: formData.prescription.trim() || null,
        lab_tests: formData.lab_tests.trim() || null,
        lab_results: formData.lab_results.trim() || null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        temperature: formData.temperature ? parseFloat(formData.temperature) : null,
        heart_rate: formData.heart_rate ? parseInt(formData.heart_rate) : null,
        respiratory_rate: formData.respiratory_rate ? parseInt(formData.respiratory_rate) : null,
        follow_up_required: formData.follow_up_required,
        follow_up_date: formData.follow_up_date || null,
        notes: formData.notes.trim() || null
      };

      if (isEditMode) {
        await axios.put(`${API_URL}/medical-records/${recordId}`, recordData, config);
      } else {
        await axios.post(`${API_URL}/medical-records`, recordData, config);
      }

      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} medical record`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading medical record...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>
          {isEditMode ? 'Edit Medical Record' : 'New Medical Record'}
        </h2>
        <button onClick={onCancel} style={styles.closeButton}>×</button>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {error && (
          <div style={styles.errorBox}>
            {error}
          </div>
        )}

        {/* Basic Information */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Visit Information</h3>
          
          <div style={styles.row}>
            {!petId && (
              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Pet <span style={styles.required}>*</span>
                </label>
                <select
                  name="pet_id"
                  value={formData.pet_id}
                  onChange={handleChange}
                  style={styles.input}
                  required
                >
                  <option value="">Select Pet</option>
                  {pets.map(pet => (
                    <option key={pet.pet_id} value={pet.pet_id}>
                      {pet.pet_name} - {pet.owner_first_name} {pet.owner_last_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Veterinarian <span style={styles.required}>*</span>
              </label>
              <select
                name="veterinarian_id"
                value={formData.veterinarian_id}
                onChange={handleChange}
                style={styles.input}
                required
              >
                <option value="">Select Veterinarian</option>
                {veterinarians.map(vet => (
                  <option key={vet.user_id} value={vet.user_id}>
                    {vet.first_name} {vet.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Visit Date <span style={styles.required}>*</span>
              </label>
              <input
                type="date"
                name="visit_date"
                value={formData.visit_date}
                onChange={handleChange}
                style={styles.input}
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Related Appointment</label>
            <select
              name="appointment_id"
              value={formData.appointment_id}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="">No Related Appointment</option>
              {appointments.map(appt => (
                <option key={appt.appointment_id} value={appt.appointment_id}>
                  {new Date(appt.appointment_date).toLocaleDateString()} - {appt.reason}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Clinical Findings */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Clinical Findings</h3>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Chief Complaint</label>
            <input
              type="text"
              name="chief_complaint"
              value={formData.chief_complaint}
              onChange={handleChange}
              placeholder="e.g., Vomiting and lethargy"
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Symptoms</label>
            <textarea
              name="symptoms"
              value={formData.symptoms}
              onChange={handleChange}
              placeholder="Detailed description of symptoms observed..."
              style={{ ...styles.input, ...styles.textarea }}
              rows="3"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Diagnosis <span style={styles.required}>*</span>
            </label>
            <textarea
              name="diagnosis"
              value={formData.diagnosis}
              onChange={handleChange}
              placeholder="Clinical diagnosis..."
              style={{ ...styles.input, ...styles.textarea }}
              rows="3"
              required
            />
          </div>
        </div>

        {/* Vital Signs */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Vital Signs</h3>
          
          <div style={styles.row}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Weight (kg)</label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                placeholder="e.g., 28.5"
                style={styles.input}
                step="0.1"
                min="0"
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Temperature (°C)</label>
              <input
                type="number"
                name="temperature"
                value={formData.temperature}
                onChange={handleChange}
                placeholder="e.g., 38.5"
                style={styles.input}
                step="0.1"
                min="35"
                max="43"
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Heart Rate (bpm)</label>
              <input
                type="number"
                name="heart_rate"
                value={formData.heart_rate}
                onChange={handleChange}
                placeholder="e.g., 95"
                style={styles.input}
                min="40"
                max="220"
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Respiratory Rate (breaths/min)</label>
              <input
                type="number"
                name="respiratory_rate"
                value={formData.respiratory_rate}
                onChange={handleChange}
                placeholder="e.g., 22"
                style={styles.input}
                min="10"
                max="80"
              />
            </div>
          </div>
        </div>

        {/* Treatment & Prescription */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Treatment & Prescription</h3>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Treatment Provided</label>
            <textarea
              name="treatment"
              value={formData.treatment}
              onChange={handleChange}
              placeholder="Description of treatment administered..."
              style={{ ...styles.input, ...styles.textarea }}
              rows="3"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Prescription</label>
            <textarea
              name="prescription"
              value={formData.prescription}
              onChange={handleChange}
              placeholder="Medications prescribed with dosage and frequency..."
              style={{ ...styles.input, ...styles.textarea }}
              rows="3"
            />
          </div>
        </div>

        {/* Lab Tests & Results */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Laboratory</h3>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Lab Tests Ordered</label>
            <textarea
              name="lab_tests"
              value={formData.lab_tests}
              onChange={handleChange}
              placeholder="List of laboratory tests ordered..."
              style={{ ...styles.input, ...styles.textarea }}
              rows="2"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Lab Results</label>
            <textarea
              name="lab_results"
              value={formData.lab_results}
              onChange={handleChange}
              placeholder="Laboratory test results..."
              style={{ ...styles.input, ...styles.textarea }}
              rows="3"
            />
          </div>
        </div>

        {/* Follow-up */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Follow-up</h3>
          
          <div style={styles.inputGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="follow_up_required"
                checked={formData.follow_up_required}
                onChange={handleChange}
                style={styles.checkbox}
              />
              Follow-up Required
            </label>
          </div>

          {formData.follow_up_required && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Follow-up Date</label>
              <input
                type="date"
                name="follow_up_date"
                value={formData.follow_up_date}
                onChange={handleChange}
                style={styles.input}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Additional Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any additional notes or observations..."
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
            {loading ? 'Saving...' : (isEditMode ? 'Update Record' : 'Save Record')}
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
    maxWidth: '1000px',
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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

export default MedicalRecordForm;
