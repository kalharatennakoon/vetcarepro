import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMedicalRecordById, deleteMedicalRecord } from '../services/medicalRecordService';
import { getAppointmentById } from '../services/appointmentService';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

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
    const icons = { checkup: 'fa-stethoscope', vaccination: 'fa-syringe', surgery: 'fa-procedures', emergency: 'fa-ambulance', follow_up: 'fa-redo', consultation: 'fa-comments' };
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
      <div style={styles.container}>
        <div style={styles.loading}>Loading medical record...</div>
      </div>
      </Layout>
    );
  }

  if (error || !record) {
    return (
      <Layout>
      <div style={styles.container}>
        <div ref={errorRef} style={styles.error}>{error || 'Medical record not found'}</div>
        <button onClick={() => navigate('/medical-records')} style={styles.backButton}>
          ← Back to Medical Records
        </button>
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
          <button onClick={() => navigate('/medical-records')} style={styles.backButton}>
            ← Back to Medical Records
          </button>
          <h1 style={styles.title}>Medical Record Details</h1>
          <p style={styles.subtitle}>Visit on {formatDate(record.visit_date)}</p>
        </div>
        {isVetOrAdmin && (
          <div style={styles.actions}>
            <button onClick={() => navigate(`/medical-records/${id}/edit`)} style={styles.editButton}>
              Edit Record
            </button>
            <button onClick={() => setShowDeleteModal(true)} style={styles.deleteButton}>
              Delete Record
            </button>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div style={styles.grid}>
        {/* Pet Information */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Pet Information</h2>
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.label}>Pet Name:</span>
              <span
                style={styles.linkValue}
                onClick={() => navigate(`/pets/${record.pet_id}`)}
              >
                {record.pet_name}
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.label}>Species:</span>
              <span style={styles.value}>{record.species || '-'}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.label}>Breed:</span>
              <span style={styles.value}>{record.breed || '-'}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.label}>Gender:</span>
              <span style={styles.value}>{record.gender || '-'}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.label}>Date of Birth:</span>
              <span style={styles.value}>{formatDate(record.date_of_birth)}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.label}>Owner:</span>
              <span style={styles.value}>
                {record.owner_first_name} {record.owner_last_name}
              </span>
            </div>
          </div>
        </div>

        {/* Visit Information */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Visit Information</h2>
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.label}>Visit Date:</span>
              <span style={styles.value}>{formatDate(record.visit_date)}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.label}>Veterinarian:</span>
              <span style={styles.value}>{record.veterinarian_name ? `Dr. ${record.veterinarian_name}` : '—'}</span>
            </div>
            {record.appointment_id && (
              <div style={styles.infoItem}>
                <span style={styles.label}>Related Appointment:</span>
                <span
                  style={{ ...styles.linkValue, fontSize: '0.95rem' }}
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
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Chief Complaint & Symptoms</h2>
          <div style={styles.infoItem}>
            <span style={styles.label}>Chief Complaint:</span>
            <p style={styles.textContent}>{record.chief_complaint || 'Not specified'}</p>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.label}>Symptoms:</span>
            <p style={styles.textContent}>{record.symptoms || 'Not specified'}</p>
          </div>
        </div>

        {/* Vital Signs */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Vital Signs</h2>
          <div style={styles.vitalGrid}>
            <div style={styles.vitalCard}>
              <div style={styles.vitalLabel}>Weight</div>
              <div style={styles.vitalValue}>{record.weight ? `${record.weight} kg` : '-'}</div>
            </div>
            <div style={styles.vitalCard}>
              <div style={styles.vitalLabel}>Temperature</div>
              <div style={styles.vitalValue}>{record.temperature ? `${record.temperature}°C` : '-'}</div>
            </div>
            <div style={styles.vitalCard}>
              <div style={styles.vitalLabel}>Heart Rate</div>
              <div style={styles.vitalValue}>{record.heart_rate ? `${record.heart_rate} bpm` : '-'}</div>
            </div>
            <div style={styles.vitalCard}>
              <div style={styles.vitalLabel}>Respiratory Rate</div>
              <div style={styles.vitalValue}>{record.respiratory_rate ? `${record.respiratory_rate} bpm` : '-'}</div>
            </div>
          </div>
        </div>

        {/* Diagnosis & Treatment */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Diagnosis & Treatment</h2>
          <div style={styles.infoItem}>
            <span style={styles.label}>Diagnosis:</span>
            <p style={styles.textContent}>{record.diagnosis}</p>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.label}>Treatment:</span>
            <p style={styles.textContent}>{record.treatment || 'Not specified'}</p>
          </div>
        </div>

        {/* Prescription */}
        {record.prescription && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Prescription</h2>
            <p style={styles.textContent}>{record.prescription}</p>
          </div>
        )}

        {/* Lab Tests & Results */}
        {(record.lab_tests || record.lab_results) && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Laboratory Tests & Results</h2>
            {record.lab_tests && (
              <div style={styles.infoItem}>
                <span style={styles.label}>Tests Conducted:</span>
                <p style={styles.textContent}>{record.lab_tests}</p>
              </div>
            )}
            {record.lab_results && (
              <div style={styles.infoItem}>
                <span style={styles.label}>Results:</span>
                <p style={styles.textContent}>{record.lab_results}</p>
              </div>
            )}
          </div>
        )}

        {/* Follow-up */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Follow-up</h2>
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.label}>Follow-up Required:</span>
              <span style={record.follow_up_required ? styles.followUpYes : styles.followUpNo}>
                {record.follow_up_required ? 'Yes' : 'No'}
              </span>
            </div>
            {record.follow_up_required && record.follow_up_date && (
              <div style={styles.infoItem}>
                <span style={styles.label}>Follow-up Date:</span>
                <span style={styles.value}>{formatDate(record.follow_up_date)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Additional Notes */}
        {record.notes && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Additional Notes</h2>
            <p style={styles.textContent}>{record.notes}</p>
          </div>
        )}

        {/* Record Metadata */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Record Information</h2>
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.label}>Record ID:</span>
              <span style={styles.value}>MRC-{String(record.record_id).padStart(4, '0')}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.label}>Created At:</span>
              <span style={styles.value}>{formatDate(record.created_at)}</span>
            </div>
            {record.updated_at && record.updated_at !== record.created_at && (
              <div style={styles.infoItem}>
                <span style={styles.label}>Last Updated:</span>
                <span style={styles.value}>{formatDate(record.updated_at)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {showDeleteModal && (
      <div style={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
        <div style={{ ...styles.modalContent, maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <h3 style={styles.modalTitle}>
              <i className="fas fa-trash" style={{ marginRight: '0.5rem', color: '#dc2626' }}></i>
              Delete Medical Record
            </h3>
            <button onClick={() => setShowDeleteModal(false)} style={styles.modalCloseButton}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <p style={{ margin: '0 0 1.5rem', color: '#374151', fontSize: '0.95rem' }}>
              Are you sure you want to delete this medical record? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{ padding: '0.5rem 1.1rem', borderRadius: '7px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#374151', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{ padding: '0.5rem 1.1rem', borderRadius: '7px', border: 'none', backgroundColor: '#dc2626', color: '#fff', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}
              >
                <i className="fas fa-trash" style={{ marginRight: '0.4rem' }}></i>
                Delete Record
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    {/* Appointment Detail Modal */}
    {apptModal !== null && (
      <div style={styles.modalOverlay} onClick={() => setApptModal(null)}>
        <div style={{ ...styles.modalContent, maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <h3 style={styles.modalTitle}>
              {!apptModalLoading && apptModal.appointment_type && (
                <i className={`fas ${getTypeIcon(apptModal.appointment_type)}`} style={{ marginRight: '0.5rem', color: '#3b82f6' }}></i>
              )}
              Appointment Details
            </h3>
            <button onClick={() => setApptModal(null)} style={styles.modalCloseButton}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div style={{ padding: '1.5rem' }}>
            {apptModalLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Loading...</div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ backgroundColor: `${getStatusColor(apptModal.status)}20`, color: getStatusColor(apptModal.status), fontSize: '0.875rem', padding: '0.3rem 0.75rem', borderRadius: '9999px', fontWeight: '600' }}>
                    {apptModal.status?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#6b7280', textTransform: 'capitalize' }}>{apptModal.appointment_type?.replace('_', ' ')}</span>
                </div>
                {[
                  { icon: 'fa-paw',         label: 'Pet',          value: apptModal.pet_name },
                  { icon: 'fa-user',        label: 'Owner',        value: `${apptModal.customer_first_name || ''} ${apptModal.customer_last_name || ''}`.trim() },
                  apptModal.veterinarian_name ? { icon: 'fa-user-md', label: 'Veterinarian', value: `Dr. ${apptModal.veterinarian_name}` } : null,
                  { icon: 'fa-calendar',    label: 'Date',         value: formatDate(apptModal.appointment_date) },
                  { icon: 'fa-clock',       label: 'Time',         value: formatTime(apptModal.appointment_time) },
                  { icon: 'fa-hourglass-half', label: 'Duration',  value: `${apptModal.duration_minutes} min` },
                ].filter(Boolean).map((row, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6', alignItems: 'center' }}>
                    <i className={`fas ${row.icon}`} style={{ width: '16px', color: '#9ca3af', fontSize: '0.8rem' }}></i>
                    <span style={{ fontSize: '0.8rem', color: '#6b7280', minWidth: '90px' }}>{row.label}</span>
                    <span style={{ fontSize: '0.875rem', color: '#111827', fontWeight: '500' }}>{row.value}</span>
                  </div>
                ))}
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '6px', fontSize: '0.875rem', color: '#374151' }}>
                  <strong>Reason:</strong> {apptModal.reason}
                </div>
                {apptModal.notes && (
                  <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '6px', fontSize: '0.875rem', color: '#374151' }}>
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

const styles = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
  },
  backButton: {
    backgroundColor: 'transparent',
    color: '#2563eb',
    border: 'none',
    padding: '0.5rem 0',
    fontSize: '0.95rem',
    fontWeight: '500',
    cursor: 'pointer',
    marginBottom: '1rem',
    display: 'block',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '600',
    margin: '0 0 0.5rem 0',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: '#6b7280',
    margin: 0,
  },
  actions: {
    display: 'flex',
    gap: '1rem',
  },
  editButton: {
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    fontSize: '0.95rem',
    fontWeight: '500',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    fontSize: '0.95rem',
    fontWeight: '500',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  loading: {
    textAlign: 'center',
    padding: '3rem',
    fontSize: '1.1rem',
    color: '#6b7280',
  },
  error: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    border: '1px solid #fecaca',
  },
  grid: {
    display: 'grid',
    gap: '1.5rem',
  },
  card: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '1rem',
    paddingBottom: '0.75rem',
    borderBottom: '2px solid #e5e7eb',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  value: {
    fontSize: '1rem',
    color: '#1f2937',
  },
  linkValue: {
    fontSize: '1rem',
    color: '#2563eb',
    cursor: 'pointer',
    fontWeight: '500',
  },
  textContent: {
    fontSize: '1rem',
    color: '#1f2937',
    lineHeight: '1.6',
    margin: '0.5rem 0 0 0',
    whiteSpace: 'pre-wrap',
  },
  vitalGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
  },
  vitalCard: {
    backgroundColor: '#f9fafb',
    padding: '1rem',
    borderRadius: '8px',
    textAlign: 'center',
    border: '1px solid #e5e7eb',
  },
  vitalLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: '0.5rem',
  },
  vitalValue: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1f2937',
  },
  followUpYes: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    display: 'inline-block',
  },
  followUpNo: {
    fontSize: '1rem',
    color: '#6b7280',
  },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', width: '90%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb' },
  modalTitle: { margin: 0, fontSize: '1.125rem', fontWeight: '600', color: '#111827' },
  modalCloseButton: { background: 'none', border: 'none', fontSize: '1.25rem', color: '#6b7280', cursor: 'pointer', padding: '0.25rem' },
};

export default MedicalRecordDetail;
