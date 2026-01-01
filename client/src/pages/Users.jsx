import { useAuth } from '../context/AuthContext';

const Users = () => {
  const { user } = useAuth();

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>User Management</h1>
      <p style={styles.subtitle}>Manage staff users and permissions</p>
      <div style={styles.content}>
        <p>Welcome, {user?.full_name}</p>
        <p>User management functionality coming soon...</p>
        <p style={styles.note}>This page is only accessible to administrators.</p>
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
  note: {
    marginTop: '1rem',
    padding: '0.75rem',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '6px',
    fontSize: '0.875rem',
  },
};

export default Users;
