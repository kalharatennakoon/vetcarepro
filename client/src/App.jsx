import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Welcome from './pages/Welcome';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import Patients from './pages/Patients';
import Users from './pages/Users';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Pets from './pages/Pets';
import PetDetail from './pages/PetDetail';
import PetCreate from './pages/PetCreate';
import PetEdit from './pages/PetEdit';

function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/" 
        element={!isAuthenticated ? <Welcome /> : <Navigate to="/dashboard" replace />} 
      />

      {/* Protected routes - All authenticated users */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/appointments" 
        element={
          <ProtectedRoute>
            <Appointments />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/patients" 
        element={
          <ProtectedRoute>
            <Patients />
          </ProtectedRoute>
        } 
      />

      {/* Customer routes */}
      <Route 
        path="/customers" 
        element={
          <ProtectedRoute>
            <Customers />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/customers/:id" 
        element={
          <ProtectedRoute>
            <CustomerDetail />
          </ProtectedRoute>
        } 
      />

      {/* Pet routes */}
      <Route 
        path="/pets" 
        element={
          <ProtectedRoute>
            <Pets />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/pets/new" 
        element={
          <ProtectedRoute>
            <PetCreate />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/pets/:id" 
        element={
          <ProtectedRoute>
            <PetDetail />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/pets/:id/edit" 
        element={
          <ProtectedRoute>
            <PetEdit />
          </ProtectedRoute>
        } 
      />

      {/* Admin-only routes */}
      <Route 
        path="/users" 
        element={
          <ProtectedRoute requiredRoles={['admin']}>
            <Users />
          </ProtectedRoute>
        } 
      />

      {/* 404 Not Found */}
      <Route 
        path="*" 
        element={
          <div style={styles.notFound}>
            <h1>404</h1>
            <p>Page not found</p>
            <a href="/dashboard" style={styles.backLink}>Go to Dashboard</a>
          </div>
        } 
      />
    </Routes>
  );
}

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
  notFound: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    textAlign: 'center',
  },
  backLink: {
    marginTop: '1rem',
    color: '#2563eb',
    textDecoration: 'none',
    fontSize: '1rem',
  },
};

export default App;