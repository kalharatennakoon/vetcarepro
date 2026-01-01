import { useAuth } from '../context/AuthContext';

const Patients = () => {
  const { user } = useAuth();

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Patients</h1>
      <p style={styles.subtitle}>Manage pet patients and medical records</p>
      <div style={styles.content}>
        <p>Welcome, {user?.full_name}</p>
        <p>Patient management functionality coming soon...</p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '2rem',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#6b7280',
    marginBottom: '2rem',
  },
  content: {
    backgroundColor: '#ffffff',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
};

export default Patients;
