import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Welcome from './pages/Welcome';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import AppointmentCreate from './pages/AppointmentCreate';
import Patients from './pages/Patients';
import Users from './pages/Users';
import Customers from './pages/Customers';
import CustomerCreate from './pages/CustomerCreate';
import CustomerDetail from './pages/CustomerDetail';
import CustomerEdit from './pages/CustomerEdit';
import Pets from './pages/Pets';
import PetDetail from './pages/PetDetail';
import PetCreate from './pages/PetCreate';
import PetEdit from './pages/PetEdit';
import MedicalRecords from './pages/MedicalRecords';
import MedicalRecordDetail from './pages/MedicalRecordDetail';
import MedicalRecordCreate from './pages/MedicalRecordCreate';
import MedicalRecordEdit from './pages/MedicalRecordEdit';
import Analytics from './pages/Analytics';
import DiseaseCaseCreate from './pages/DiseaseCaseCreate';
import DiseaseCaseDetail from './pages/DiseaseCaseDetail';
import DiseaseCaseEdit from './pages/DiseaseCaseEdit';
import Inventory from './pages/Inventory';
import InventoryDetail from './pages/InventoryDetail';
import InventoryCreate from './pages/InventoryCreate';
import InventoryEdit from './pages/InventoryEdit';
import Billing from './pages/Billing';
import BillingDetail from './pages/BillingDetail';
import BillingCreate from './pages/BillingCreate';
import Reports from './pages/Reports';
import Profile from './pages/Profile';


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
        path="/appointments/new" 
        element={
          <ProtectedRoute>
            <AppointmentCreate />
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
        path="/customers/new" 
        element={
          <ProtectedRoute>
            <CustomerCreate />
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

      <Route 
        path="/customers/:id/edit" 
        element={
          <ProtectedRoute>
            <CustomerEdit />
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

      {/* Medical Records routes */}
      <Route 
        path="/medical-records" 
        element={
          <ProtectedRoute>
            <MedicalRecords />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/medical-records/new" 
        element={
          <ProtectedRoute requiredRoles={['veterinarian', 'admin']}>
            <MedicalRecordCreate />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/medical-records/:id" 
        element={
          <ProtectedRoute>
            <MedicalRecordDetail />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/medical-records/:id/edit" 
        element={
          <ProtectedRoute requiredRoles={['veterinarian', 'admin']}>
            <MedicalRecordEdit />
          </ProtectedRoute>
        } 
      />


      {/* Analytics & Insights page (unified) */}
      <Route 
        path="/analytics" 
        element={
          <ProtectedRoute requiredRoles={['admin', 'veterinarian']}>
            <Analytics />
          </ProtectedRoute>
        } 
      />

      {/* Inventory routes */}
      <Route 
        path="/inventory" 
        element={
          <ProtectedRoute>
            <Inventory />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/inventory/create" 
        element={
          <ProtectedRoute requiredRoles={['veterinarian', 'admin']}>
            <InventoryCreate />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/inventory/:id" 
        element={
          <ProtectedRoute>
            <InventoryDetail />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/inventory/:id/edit" 
        element={
          <ProtectedRoute requiredRoles={['veterinarian', 'admin']}>
            <InventoryEdit />
          </ProtectedRoute>
        } 
      />

      {/* Billing routes */}
      <Route 
        path="/billing" 
        element={
          <ProtectedRoute>
            <Billing />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/billing/new" 
        element={
          <ProtectedRoute>
            <BillingCreate />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/billing/:id" 
        element={
          <ProtectedRoute>
            <BillingDetail />
          </ProtectedRoute>
        } 
      />

      {/* Reports routes - accessible by admin and veterinarian */}
      <Route 
        path="/reports" 
        element={
          <ProtectedRoute requiredRoles={['admin', 'veterinarian']}>
            <Reports />
          </ProtectedRoute>
        } 
      />



      {/* Profile route - accessible by all authenticated users */}
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <Profile />
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