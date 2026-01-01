import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requiredRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has required role
  if (requiredRoles && !requiredRoles.includes(user?.role)) {
    return (
      <div style={styles.accessDenied}>
        <h2>Access Denied</h2>
        <p>You don't have permission to access this page.</p>
        <a href="/dashboard" style={styles.backLink}>Go to Dashboard</a>
      </div>
    );
  }

  return children;
};

const styles = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #2563eb',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    animation: 'spin 1s linear infinite',
  },
  accessDenied: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    textAlign: 'center',
    padding: '2rem',
  },
  backLink: {
    marginTop: '1rem',
    color: '#2563eb',
    textDecoration: 'none',
    fontSize: '1rem',
  },
};

export default ProtectedRoute;
