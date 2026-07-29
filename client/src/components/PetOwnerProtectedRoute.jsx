import { Navigate } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';

const PetOwnerProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useCustomerAuth();

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/pet-owner/login" replace />;
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
    borderTop: '4px solid #137fec',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    animation: 'spin 1s linear infinite',
  },
};

export default PetOwnerProtectedRoute;
