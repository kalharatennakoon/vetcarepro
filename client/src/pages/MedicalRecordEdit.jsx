import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MedicalRecordForm from '../components/MedicalRecordForm';
import Layout from '../components/Layout';

const MedicalRecordEdit = () => {
  const [error, setError] = useState('');
  const { id } = useParams();
  const navigate = useNavigate();

  const handleSuccess = (updatedRecord) => {
    navigate(`/medical-records/${id}`);
  };

  const handleCancel = () => {
    navigate(`/medical-records/${id}`);
  };

  return (
    <Layout>
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate(`/medical-records/${id}`)} style={styles.backButton}>
          ← Back to Record
        </button>
        <h1 style={styles.title}>Edit Medical Record</h1>
        <p style={styles.subtitle}>Update medical visit information</p>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.formContainer}>
        <MedicalRecordForm
          recordId={parseInt(id)}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
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
  error: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    border: '1px solid #fecaca',
  },
  formContainer: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
};

export default MedicalRecordEdit;
