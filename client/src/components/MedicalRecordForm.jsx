import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNotification } from '../context/NotificationContext';
import { removeDeferredMedicalReport } from '../services/medicalReportQueue';
import '../styles/MedicalRecordCreateModern.css';

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const MedicalRecordForm = ({ recordId, petId, appointmentData, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const errorRef = useRef(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);
  const { showSuccess } = useNotification();
  const [pets, setPets] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [veterinarians, setVeterinarians] = useState([]);
  const [formData, setFormData] = useState({
    pet_id: String(petId || appointmentData?.pet_id || ''),
    appointment_id: String(appointmentData?.appointment_id || ''),
    veterinarian_id: appointmentData?.veterinarian_id ? String(appointmentData.veterinarian_id) : '',
    visit_date: appointmentData?.appointment_date ? appointmentData.appointment_date.split('T')[0] : localToday(),
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

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const isEditMode = !!recordId;

  useEffect(() => {
    fetchPets();
    fetchVeterinarians();
    if (recordId) {
      loadRecord();
    }
  }, [recordId, petId, appointmentData]);

  useEffect(() => {
    if (formData.pet_id) {
      fetchPetAppointments(formData.pet_id);
    } else {
      setAppointments([]);
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
      const response = await axios.get(`${API_URL}/appointments?pet_id=${petId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const today = localToday();
      const past = (response.data.data.appointments || []).filter(a =>
        a.appointment_date <= today &&
        !['cancelled', 'no_show'].includes(a.status)
      );
      setAppointments(past);
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
    if (name === 'appointment_id') {
      const selected = appointments.find(a => String(a.appointment_id) === String(value));
      setFormData(prev => ({
        ...prev,
        appointment_id: value,
        visit_date: selected ? selected.appointment_date.split('T')[0] : prev.visit_date,
        veterinarian_id: selected ? String(selected.veterinarian_id) : prev.veterinarian_id
      }));
      setError('');
      return;
    }
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'pet_id' ? { appointment_id: '' } : {})
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
    if (!formData.appointment_id) {
      setError('Related Appointment is required');
      return false;
    }
    if (!formData.chief_complaint.trim()) {
      setError('Chief Complaint is required');
      return false;
    }
    if (!formData.symptoms.trim()) {
      setError('Symptoms are required');
      return false;
    }
    if (!formData.diagnosis.trim()) {
      setError('Diagnosis is required');
      return false;
    }
    if (!formData.treatment.trim()) {
      setError('Treatment Provided is required');
      return false;
    }
    if (!formData.prescription.trim()) {
      setError('Prescription is required');
      return false;
    }
    if (formData.follow_up_required && !formData.follow_up_date) {
      setError('Follow-up Date is required when Follow-up Required is checked');
      return false;
    }

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
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const recordData = {
        pet_id: formData.pet_id,
        appointment_id: formData.appointment_id,
        veterinarian_id: parseInt(formData.veterinarian_id),
        visit_date: formData.visit_date,
        chief_complaint: formData.chief_complaint.trim(),
        symptoms: formData.symptoms.trim(),
        diagnosis: formData.diagnosis.trim(),
        treatment: formData.treatment.trim(),
        prescription: formData.prescription.trim(),
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
        const res = await axios.put(`${API_URL}/medical-records/${recordId}`, recordData, config);
        showSuccess('Medical record updated successfully');
        onSuccess?.(res.data.data.record);
      } else {
        const res = await axios.post(`${API_URL}/medical-records`, recordData, config);
        showSuccess('Medical record created successfully');
        if (recordData.appointment_id) {
          removeDeferredMedicalReport(recordData.appointment_id);
        }
        onSuccess?.(res.data.data.record);
      }
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} medical record`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return (
      <div className="medrec-page-loading">
        <div className="medrec-page-spinner"></div>
        <p style={{ color: '#64748b', fontWeight: '500' }}>Loading medical record entry...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="medrec-form-header">
        <div className="medrec-form-title-group">
          <h2 className="medrec-form-title">{isEditMode ? 'Edit Medical Visit Record' : 'Clinical Consultation Record'}</h2>
          <p className="medrec-form-subtitle">Fill in patient visit info, clinical findings, vital signs, and prescriptions.</p>
        </div>
        {onCancel && (
          <button onClick={onCancel} className="medrec-form-close-btn" type="button" title="Close form">
            <i className="fas fa-times"></i>
          </button>
        )}
      </div>

      {error && (
        <div ref={errorRef} className="medrec-form-error">
          <i className="fas fa-exclamation-circle medrec-form-error-icon"></i>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="medrec-form-note">
          <i className="fas fa-info-circle" style={{ color: '#4f46e5' }}></i>
          <span>Fields marked with <span className="medrec-form-required">*</span> are required.</span>
        </div>

        {/* Section 1: Visit Information */}
        <div className="medrec-form-section">
          <div className="medrec-form-section-header">
            <div className="medrec-form-section-icon">
              <i className="fas fa-calendar-check"></i>
            </div>
            <h3 className="medrec-form-section-title">1. Visit & Consultation Context</h3>
          </div>

          <div className="medrec-form-grid-3col" style={{ marginBottom: '1.25rem' }}>
            <div className="medrec-form-group">
              <label className="medrec-form-label">
                <span>Pet Patient <span className="medrec-form-required">*</span></span>
              </label>
              <select
                name="pet_id"
                value={formData.pet_id}
                onChange={handleChange}
                className="medrec-form-select"
                disabled={Boolean(appointmentData)}
                required
              >
                <option value="">-- Select Pet Patient --</option>
                {[...pets].sort((a, b) => a.pet_name.localeCompare(b.pet_name)).map(pet => (
                  <option key={pet.pet_id} value={pet.pet_id}>
                    {pet.pet_name} ({pet.species}) - Owner: {pet.owner_first_name} {pet.owner_last_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="medrec-form-group">
              <label className="medrec-form-label">
                <span>Attending Veterinarian <span className="medrec-form-required">*</span></span>
              </label>
              <select
                name="veterinarian_id"
                value={formData.veterinarian_id}
                onChange={handleChange}
                className="medrec-form-select"
                disabled
                required
              >
                <option value="">-- Select Veterinarian --</option>
                {[...veterinarians].sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)).map(vet => (
                  <option key={vet.user_id} value={vet.user_id}>
                    Dr. {vet.first_name} {vet.last_name}
                  </option>
                ))}
              </select>
              <span className="medrec-form-hint">Auto-filled from selected appointment</span>
            </div>

            <div className="medrec-form-group">
              <label className="medrec-form-label">
                <span>Visit Date <span className="medrec-form-required">*</span></span>
              </label>
              <input
                type="date"
                name="visit_date"
                value={formData.visit_date}
                onChange={handleChange}
                className="medrec-form-input"
                max={localToday()}
                disabled
                required
              />
              <span className="medrec-form-hint">Auto-filled from selected appointment</span>
            </div>
          </div>

          <div className="medrec-form-group">
            <label className="medrec-form-label">
              <span>Related Appointment <span className="medrec-form-required">*</span></span>
            </label>
            <select
              name="appointment_id"
              value={formData.appointment_id}
              onChange={handleChange}
              className="medrec-form-select"
              disabled={Boolean(appointmentData)}
            >
              <option value="">{formData.pet_id ? (appointments.length === 0 ? 'No past appointments found for this pet' : '-- Select Appointment --') : 'Select a pet first'}</option>
              {appointments.map(appt => (
                <option key={appt.appointment_id} value={appt.appointment_id}>
                  {new Date(appt.appointment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} &mdash; {appt.reason} ({appt.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 2: Clinical Findings */}
        <div className="medrec-form-section">
          <div className="medrec-form-section-header">
            <div className="medrec-form-section-icon">
              <i className="fas fa-stethoscope"></i>
            </div>
            <h3 className="medrec-form-section-title">2. Clinical Examination Findings</h3>
          </div>

          <div className="medrec-form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="medrec-form-label">
              <span>Chief Complaint <span className="medrec-form-required">*</span></span>
            </label>
            <input
              type="text"
              name="chief_complaint"
              value={formData.chief_complaint}
              onChange={handleChange}
              placeholder="Primary reason for presentation (e.g., Lethargy, loss of appetite for 2 days)"
              className="medrec-form-input"
              required
            />
          </div>

          <div className="medrec-form-grid-2col">
            <div className="medrec-form-group">
              <label className="medrec-form-label">
                <span>Observed Symptoms <span className="medrec-form-required">*</span></span>
              </label>
              <textarea
                name="symptoms"
                value={formData.symptoms}
                onChange={handleChange}
                placeholder="Detailed physical symptoms, behavior, and physical exam findings..."
                className="medrec-form-textarea"
                rows="3"
                required
              />
            </div>

            <div className="medrec-form-group">
              <label className="medrec-form-label">
                <span>Clinical Diagnosis <span className="medrec-form-required">*</span></span>
              </label>
              <textarea
                name="diagnosis"
                value={formData.diagnosis}
                onChange={handleChange}
                placeholder="Confirmed or differential clinical diagnosis..."
                className="medrec-form-textarea"
                rows="3"
                required
              />
            </div>
          </div>
        </div>

        {/* Section 3: Vital Signs */}
        <div className="medrec-form-section">
          <div className="medrec-form-section-header">
            <div className="medrec-form-section-icon">
              <i className="fas fa-heart-pulse"></i>
            </div>
            <h3 className="medrec-form-section-title">3. Patient Vital Signs</h3>
          </div>

          <div className="medrec-form-grid-4col">
            <div className="vital-input-card">
              <div className="vital-card-header">
                <span className="vital-card-title">Weight</span>
                <span className="vital-card-unit">kg</span>
              </div>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                placeholder="e.g., 28.5"
                className="medrec-form-input"
                step="0.1"
                min="0"
              />
            </div>

            <div className="vital-input-card">
              <div className="vital-card-header">
                <span className="vital-card-title">Temperature</span>
                <span className="vital-card-unit">°C</span>
              </div>
              <input
                type="number"
                name="temperature"
                value={formData.temperature}
                onChange={handleChange}
                placeholder="e.g., 38.5"
                className="medrec-form-input"
                step="0.1"
                min="35"
                max="43"
              />
            </div>

            <div className="vital-input-card">
              <div className="vital-card-header">
                <span className="vital-card-title">Heart Rate</span>
                <span className="vital-card-unit">bpm</span>
              </div>
              <input
                type="number"
                name="heart_rate"
                value={formData.heart_rate}
                onChange={handleChange}
                placeholder="e.g., 95"
                className="medrec-form-input"
                min="40"
                max="220"
              />
            </div>

            <div className="vital-input-card">
              <div className="vital-card-header">
                <span className="vital-card-title">Respiration</span>
                <span className="vital-card-unit">breaths/min</span>
              </div>
              <input
                type="number"
                name="respiratory_rate"
                value={formData.respiratory_rate}
                onChange={handleChange}
                placeholder="e.g., 22"
                className="medrec-form-input"
                min="10"
                max="80"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Treatment & Prescription */}
        <div className="medrec-form-section">
          <div className="medrec-form-section-header">
            <div className="medrec-form-section-icon">
              <i className="fas fa-pills"></i>
            </div>
            <h3 className="medrec-form-section-title">4. Treatment & Prescription Plan</h3>
          </div>

          <div className="medrec-form-grid-2col">
            <div className="medrec-form-group">
              <label className="medrec-form-label">
                <span>Treatment Administered <span className="medrec-form-required">*</span></span>
              </label>
              <textarea
                name="treatment"
                value={formData.treatment}
                onChange={handleChange}
                placeholder="Procedures, injections, fluid therapy, or wound care administered during visit..."
                className="medrec-form-textarea"
                rows="3"
                required
              />
            </div>

            <div className="medrec-form-group">
              <label className="medrec-form-label">
                <span>Prescription & Dosage <span className="medrec-form-required">*</span></span>
              </label>
              <textarea
                name="prescription"
                value={formData.prescription}
                onChange={handleChange}
                placeholder="Medications prescribed, dosage, frequency, and treatment duration (e.g. Amoxicillin 250mg 1 tab bid x 7 days)..."
                className="medrec-form-textarea"
                rows="3"
                required
              />
            </div>
          </div>
        </div>

        {/* Section 5: Laboratory Tests */}
        <div className="medrec-form-section">
          <div className="medrec-form-section-header">
            <div className="medrec-form-section-icon">
              <i className="fas fa-flask"></i>
            </div>
            <h3 className="medrec-form-section-title">5. Laboratory Investigations</h3>
          </div>

          <div className="medrec-form-grid-2col">
            <div className="medrec-form-group">
              <label className="medrec-form-label"><span>Lab Tests Ordered</span></label>
              <textarea
                name="lab_tests"
                value={formData.lab_tests}
                onChange={handleChange}
                placeholder="e.g., Complete Blood Count (CBC), Serum Biochemistry, Urinalysis"
                className="medrec-form-textarea"
                rows="3"
              />
            </div>

            <div className="medrec-form-group">
              <label className="medrec-form-label"><span>Laboratory Results</span></label>
              <textarea
                name="lab_results"
                value={formData.lab_results}
                onChange={handleChange}
                placeholder="Summary of laboratory findings, blood parameters, or pathology notes..."
                className="medrec-form-textarea"
                rows="3"
              />
            </div>
          </div>
        </div>

        {/* Section 6: Follow-up & Notes */}
        <div className="medrec-form-section">
          <div className="medrec-form-section-header">
            <div className="medrec-form-section-icon">
              <i className="fas fa-calendar-plus"></i>
            </div>
            <h3 className="medrec-form-section-title">6. Follow-up Care & Notes</h3>
          </div>

          <div className="medrec-form-grid-2col" style={{ marginBottom: '1rem' }}>
            <div className="medrec-form-group">
              <label className="medrec-checkbox-card">
                <input
                  type="checkbox"
                  name="follow_up_required"
                  checked={formData.follow_up_required}
                  onChange={handleChange}
                />
                <div>
                  <div className="medrec-checkbox-label">Follow-up Consultation Required</div>
                  <span className="medrec-form-hint">Schedule a re-check or suture removal visit date.</span>
                </div>
              </label>
            </div>

            {formData.follow_up_required && (
              <div className="medrec-form-group">
                <label className="medrec-form-label">
                  <span>Follow-up Date <span className="medrec-form-required">*</span></span>
                </label>
                <input
                  type="date"
                  name="follow_up_date"
                  value={formData.follow_up_date}
                  onChange={handleChange}
                  className="medrec-form-input"
                  min={localToday()}
                  required={formData.follow_up_required}
                />
              </div>
            )}
          </div>

          <div className="medrec-form-group">
            <label className="medrec-form-label"><span>General Clinical Notes</span></label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any additional observations, dietary recommendations, or client advice..."
              className="medrec-form-textarea"
              rows="3"
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="medrec-action-footer">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="medrec-btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="medrec-btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Saving...
              </>
            ) : (
              <>
                <i className={isEditMode ? 'fas fa-save' : 'fas fa-file-medical'}></i>
                {isEditMode ? 'Update Medical Record' : 'Save Medical Record'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MedicalRecordForm;
