import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMedicalRecordById, deleteMedicalRecord } from '../services/medicalRecordService';
import { getAppointmentById } from '../services/appointmentService';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import '../styles/MedicalRecordDetailModern.css';

const MedicalRecordDetail = () => {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const errorRef = useRef(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [apptModal, setApptModal] = useState(null);
  const [apptModalLoading, setApptModalLoading] = useState(false);

  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isVetOrAdmin = user?.role === 'admin' || user?.role === 'veterinarian';

  useEffect(() => {
    fetchRecord();
  }, [id]);

  const fetchRecord = async () => {
    try {
      setLoading(true);
      const response = await getMedicalRecordById(id);
      setRecord(response.data.record);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load medical record');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteMedicalRecord(id);
      navigate('/medical-records');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete medical record');
    }
  };

  const openApptModal = async (appointmentId) => {
    try {
      setApptModalLoading(true);
      setApptModal({});
      const response = await getAppointmentById(appointmentId);
      setApptModal(response.data.appointment);
    } catch (err) {
      console.error('Failed to load appointment:', err);
      setApptModal(null);
    } finally {
      setApptModalLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = { confirmed: '#10b981', in_progress: '#f59e0b', completed: '#6b7280', cancelled: '#ef4444', no_show: '#8b5cf6' };
    return colors[status] || '#6b7280';
  };

  const getTypeIcon = (type) => {
    const icons = { checkup: 'fa-stethoscope', vaccination: 'fa-syringe', surgery: 'fa-hospital', emergency: 'fa-ambulance', follow_up: 'fa-redo', consultation: 'fa-comments' };
    return icons[type] || 'fa-calendar-check';
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    const [h, m] = timeString.split(':');
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour < 12 ? 'AM' : 'PM'}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="med-detail-container">
          <div className="med-records-empty-card">
            <div className="appts-spinner" style={{ margin: '0 auto 1rem auto' }}></div>
            <p style={{ color: '#64748b', margin: 0 }}>Loading medical record...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !record) {
    return (
      <Layout>
        <div className="med-detail-container">
          <button onClick={() => navigate('/medical-records')} className="med-detail-back-btn">
            <i className="fas fa-arrow-left"></i> Back to Medical Records
          </button>
          <div ref={errorRef} className="med-records-alert-error">
            <i className="fas fa-exclamation-circle"></i>
            {error || 'Medical record not found'}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="med-detail-container">
        {/* Top Header Card */}
        <div className="med-detail-header-card">
          <div>
            <button onClick={() => navigate('/medical-records')} className="med-detail-back-btn">
              <i className="fas fa-arrow-left"></i> Back to Medical Records
            </button>
            <h1 className="med-detail-title">Medical Record Details</h1>
            <p className="med-detail-subtitle">
              <i className="far fa-calendar-alt" style={{ marginRight: '0.4rem' }}></i>
              Visit on {formatDate(record.visit_date)}
            </p>
          </div>
          {isVetOrAdmin && (
            <div className="med-detail-actions">
              <button onClick={() => navigate(`/medical-records/${id}/edit`)} className="med-detail-btn-edit">
                <i className="fas fa-edit"></i> Edit Record
              </button>
              <button onClick={() => setShowDeleteModal(true)} className="med-detail-btn-delete">
                <i className="fas fa-trash"></i> Delete Record
              </button>
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="med-detail-grid">
          {/* Pet Information */}
          <div className="med-detail-card">
            <h2 className="med-detail-card-title">
              <i className="fas fa-paw" style={{ color: '#3b82f6' }}></i>
              Pet Information
            </h2>
            <div className="med-detail-info-grid">
              <div className="med-detail-info-item">
                <span className="med-detail-label">Pet Name</span>
                <span
                  className="med-detail-link-value"
                  onClick={() => navigate(`/pets/${record.pet_id}`)}
                >
                  {record.pet_name}
                </span>
              </div>
              <div className="med-detail-info-item">
                <span className="med-detail-label">Species</span>
                <span className="med-detail-value">{record.species || '-'}</span>
              </div>
              <div className="med-detail-info-item">
                <span className="med-detail-label">Breed</span>
                <span className="med-detail-value">{record.breed || '-'}</span>
              </div>
              <div className="med-detail-info-item">
                <span className="med-detail-label">Gender</span>
                <span className="med-detail-value">{record.gender || '-'}</span>
              </div>
              <div className="med-detail-info-item">
                <span className="med-detail-label">Date of Birth</span>
                <span className="med-detail-value">{formatDate(record.date_of_birth)}</span>
              </div>
              <div className="med-detail-info-item">
                <span className="med-detail-label">Owner</span>
                <span className="med-detail-value">
                  {record.owner_first_name} {record.owner_last_name}
                </span>
              </div>
            </div>
          </div>

          {/* Visit Information */}
          <div className="med-detail-card">
            <h2 className="med-detail-card-title">
              <i className="fas fa-hospital-user" style={{ color: '#06b6d4' }}></i>
              Visit Information
            </h2>
            <div className="med-detail-info-grid">
              <div className="med-detail-info-item">
                <span className="med-detail-label">Visit Date</span>
                <span className="med-detail-value">{formatDate(record.visit_date)}</span>
              </div>
              <div className="med-detail-info-item">
                <span className="med-detail-label">Veterinarian</span>
                <span className="med-detail-value">{record.veterinarian_name ? `Dr. ${record.veterinarian_name}` : '—'}</span>
              </div>
              {record.appointment_id && (
                <div className="med-detail-info-item">
                  <span className="med-detail-label">Related Appointment</span>
                  <span
                    className="med-detail-link-value"
                    onClick={() => openApptModal(record.appointment_id)}
                  >
                    {record.appointment_date
                      ? `${formatDate(record.appointment_date)}${record.appointment_time ? ' at ' + record.appointment_time.slice(0, 5) : ''}${record.appointment_reason ? ' — ' + record.appointment_reason : ''}`
                      : record.appointment_id}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Chief Complaint & Symptoms */}
          <div className="med-detail-card">
            <h2 className="med-detail-card-title">
              <i className="fas fa-stethoscope" style={{ color: '#6366f1' }}></i>
              Chief Complaint & Symptoms
            </h2>
            <div style={{ marginBottom: '1.25rem' }}>
              <span className="med-detail-label">Chief Complaint</span>
              <p className="med-detail-text-content">{record.chief_complaint || 'Not specified'}</p>
            </div>
            <div>
              <span className="med-detail-label">Symptoms</span>
              <p className="med-detail-text-content">{record.symptoms || 'Not specified'}</p>
            </div>
          </div>

          {/* Vital Signs */}
          <div className="med-detail-card">
            <h2 className="med-detail-card-title">
              <i className="fas fa-heartbeat" style={{ color: '#e11d48' }}></i>
              Vital Signs
            </h2>
            <div className="med-detail-vitals-grid">
              <div className="med-detail-vital-card">
                <div className="med-detail-vital-label">Weight</div>
                <div className="med-detail-vital-value">{record.weight ? `${record.weight} kg` : '-'}</div>
              </div>
              <div className="med-detail-vital-card">
                <div className="med-detail-vital-label">Temperature</div>
                <div className="med-detail-vital-value">{record.temperature ? `${record.temperature}°C` : '-'}</div>
              </div>
              <div className="med-detail-vital-card">
                <div className="med-detail-vital-label">Heart Rate</div>
                <div className="med-detail-vital-value">{record.heart_rate ? `${record.heart_rate} bpm` : '-'}</div>
              </div>
              <div className="med-detail-vital-card">
                <div className="med-detail-vital-label">Respiratory Rate</div>
                <div className="med-detail-vital-value">{record.respiratory_rate ? `${record.respiratory_rate} bpm` : '-'}</div>
              </div>
            </div>
          </div>

          {/* Diagnosis & Treatment */}
          <div className="med-detail-card">
            <h2 className="med-detail-card-title">
              <i className="fas fa-user-md" style={{ color: '#10b981' }}></i>
              Diagnosis & Treatment
            </h2>
            <div style={{ marginBottom: '1.25rem' }}>
              <span className="med-detail-label">Diagnosis</span>
              <p className="med-detail-text-content">{record.diagnosis}</p>
            </div>
            <div>
              <span className="med-detail-label">Treatment</span>
              <p className="med-detail-text-content">{record.treatment || 'Not specified'}</p>
            </div>
          </div>

          {/* Prescription */}
          {record.prescription && (
            <div className="med-detail-card">
              <h2 className="med-detail-card-title">
                <i className="fas fa-pills" style={{ color: '#8b5cf6' }}></i>
                Prescription
              </h2>
              <p className="med-detail-text-content">{record.prescription}</p>
            </div>
          )}

          {/* Lab Tests & Results */}
          {(record.lab_tests || record.lab_results) && (
            <div className="med-detail-card">
              <h2 className="med-detail-card-title">
                <i className="fas fa-flask" style={{ color: '#f59e0b' }}></i>
                Laboratory Tests & Results
              </h2>
              {record.lab_tests && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <span className="med-detail-label">Tests Conducted</span>
                  <p className="med-detail-text-content">{record.lab_tests}</p>
                </div>
              )}
              {record.lab_results && (
                <div>
                  <span className="med-detail-label">Results</span>
                  <p className="med-detail-text-content">{record.lab_results}</p>
                </div>
              )}
            </div>
          )}

          {/* Follow-up */}
          <div className="med-detail-card">
            <h2 className="med-detail-card-title">
              <i className="fas fa-calendar-check" style={{ color: '#0284c7' }}></i>
              Follow-up
            </h2>
            <div className="med-detail-info-grid">
              <div className="med-detail-info-item">
                <span className="med-detail-label">Follow-up Required</span>
                <div>
                  <span className={record.follow_up_required ? 'med-detail-follow-yes' : 'med-detail-follow-no'}>
                    {record.follow_up_required ? 'Yes — Follow-up Required' : 'No'}
                  </span>
                </div>
              </div>
              {record.follow_up_required && record.follow_up_date && (
                <div className="med-detail-info-item">
                  <span className="med-detail-label">Follow-up Date</span>
                  <span className="med-detail-value">{formatDate(record.follow_up_date)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Additional Notes */}
          {record.notes && (
            <div className="med-detail-card">
              <h2 className="med-detail-card-title">
                <i className="fas fa-sticky-note" style={{ color: '#64748b' }}></i>
                Additional Notes
              </h2>
              <p className="med-detail-text-content">{record.notes}</p>
            </div>
          )}

          {/* Record Metadata */}
          <div className="med-detail-card">
            <h2 className="med-detail-card-title">
              <i className="fas fa-info-circle" style={{ color: '#94a3b8' }}></i>
              Record Information
            </h2>
            <div className="med-detail-info-grid">
              <div className="med-detail-info-item">
                <span className="med-detail-label">Record ID</span>
                <span className="med-detail-value">MRC-{String(record.record_id).padStart(4, '0')}</span>
              </div>
              <div className="med-detail-info-item">
                <span className="med-detail-label">Created At</span>
                <span className="med-detail-value">{formatDate(record.created_at)}</span>
              </div>
              {record.updated_at && record.updated_at !== record.created_at && (
                <div className="med-detail-info-item">
                  <span className="med-detail-label">Last Updated</span>
                  <span className="med-detail-value">{formatDate(record.updated_at)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Record Modal */}
      {showDeleteModal && (
        <div className="med-detail-modal-backdrop" onClick={() => setShowDeleteModal(false)}>
          <div className="med-detail-modal-box" onClick={e => e.stopPropagation()}>
            <div className="med-detail-modal-head">
              <h3 className="med-detail-modal-title">
                <i className="fas fa-trash" style={{ color: '#e11d48' }}></i>
                Delete Medical Record
              </h3>
              <button onClick={() => setShowDeleteModal(false)} className="med-detail-modal-close">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ margin: '0 0 1.5rem', color: '#475569', fontSize: '0.925rem' }}>
                Are you sure you want to delete this medical record? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  style={{ padding: '0.5rem 1.1rem', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  style={{ padding: '0.5rem 1.1rem', borderRadius: '10px', border: 'none', backgroundColor: '#e11d48', color: '#fff', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <i className="fas fa-trash"></i>
                  Delete Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Detail Modal */}
      {apptModal !== null && (
        <div className="med-detail-modal-backdrop" onClick={() => setApptModal(null)}>
          <div className="med-detail-modal-box" onClick={e => e.stopPropagation()}>
            <div className="med-detail-modal-head">
              <h3 className="med-detail-modal-title">
                {!apptModalLoading && apptModal.appointment_type && (
                  <i className={`fas ${getTypeIcon(apptModal.appointment_type)}`} style={{ color: '#3b82f6' }}></i>
                )}
                Appointment Details
              </h3>
              <button onClick={() => setApptModal(null)} className="med-detail-modal-close">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {apptModalLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading...</div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ backgroundColor: `${getStatusColor(apptModal.status)}1b`, color: getStatusColor(apptModal.status), fontSize: '0.825rem', padding: '0.35rem 0.8rem', borderRadius: '9999px', fontWeight: '700', border: `1px solid ${getStatusColor(apptModal.status)}40` }}>
                      {apptModal.status?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'capitalize', fontWeight: 600 }}>{apptModal.appointment_type?.replace('_', ' ')}</span>
                  </div>
                  {[
                    { icon: 'fa-paw',         label: 'Pet',          value: apptModal.pet_name },
                    { icon: 'fa-user',        label: 'Owner',        value: `${apptModal.customer_first_name || ''} ${apptModal.customer_last_name || ''}`.trim() },
                    apptModal.veterinarian_name ? { icon: 'fa-user-md', label: 'Veterinarian', value: `Dr. ${apptModal.veterinarian_name}` } : null,
                    { icon: 'fa-calendar',    label: 'Date',         value: formatDate(apptModal.appointment_date) },
                    { icon: 'fa-clock',       label: 'Time',         value: formatTime(apptModal.appointment_time) },
                    { icon: 'fa-hourglass-half', label: 'Duration',  value: `${apptModal.duration_minutes} min` },
                  ].filter(Boolean).map((row, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
                      <i className={`fas ${row.icon}`} style={{ width: '16px', color: '#94a3b8', fontSize: '0.8rem' }}></i>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', minWidth: '90px', fontWeight: 500 }}>{row.label}</span>
                      <span style={{ fontSize: '0.875rem', color: '#0f172a', fontWeight: '600' }}>{row.value}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', backgroundColor: '#f8fafc', borderRadius: '10px', fontSize: '0.875rem', color: '#334155', border: '1px solid #e2e8f0' }}>
                    <strong>Reason:</strong> {apptModal.reason}
                  </div>
                  {apptModal.notes && (
                    <div style={{ marginTop: '0.5rem', padding: '0.75rem 1rem', backgroundColor: '#f8fafc', borderRadius: '10px', fontSize: '0.875rem', color: '#334155', border: '1px solid #e2e8f0' }}>
                      <strong>Notes:</strong> {apptModal.notes}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default MedicalRecordDetail;
