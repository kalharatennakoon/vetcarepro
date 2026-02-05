import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import AppointmentForm from '../components/AppointmentForm';

const AppointmentCreate = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/appointments');
  };

  const handleCancel = () => {
    navigate('/appointments');
  };

  return (
    <Layout>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <i className="fas fa-calendar-plus" style={styles.headerIcon}></i>
            <div>
              <h2 style={styles.title}>Schedule New Appointment</h2>
              <p style={styles.subtitle}>Book an appointment for a patient</p>
            </div>
          </div>
          <button onClick={handleCancel} style={styles.backButton}>
            <i className="fas fa-arrow-left" style={{marginRight: '0.5rem'}}></i>
            Back to Appointments
          </button>
        </div>

        <div style={styles.formContainer}>
          <AppointmentForm 
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
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #e5e7eb',
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  headerIcon: {
    fontSize: '2rem',
    color: '#3b82f6',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '600',
    margin: 0,
    color: '#111827',
  },
  subtitle: {
    color: '#6b7280',
    margin: '0.25rem 0 0 0',
    fontSize: '0.875rem',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.5rem 1rem',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '0.375rem',
    color: '#374151',
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '0.5rem',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    overflow: 'hidden',
  },
};

export default AppointmentCreate;