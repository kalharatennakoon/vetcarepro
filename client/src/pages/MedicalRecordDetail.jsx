import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMedicalRecordById, deleteMedicalRecord } from '../services/medicalRecordService';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const MedicalRecordDetail = () => {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this medical record? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteMedicalRecord(id);
      navigate('/medical-records');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete medical record');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString, timeString) => {
    if (!dateString) return '-';
    const date = new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    return timeString ? `${date} at ${timeString}` : date;
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
        <div style={styles.error}>{error || 'Medical record not found'}</div>
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
            <button onClick={handleDelete} style={styles.deleteButton}>
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
              <span style={styles.value}>{record.veterinarian_name}</span>
            </div>
            {record.appointment_id && (
              <div style={styles.infoItem}>
                <span style={styles.label}>Appointment:</span>
                <span style={styles.value}>
                  {formatDateTime(record.appointment_date, record.appointment_time)}
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
              <span style={styles.value}>{record.record_id}</span>
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
};

export default MedicalRecordDetail;
