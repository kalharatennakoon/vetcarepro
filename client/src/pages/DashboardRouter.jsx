import { useAuth } from '../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import VetDashboard from './VetDashboard';
import ReceptionistDashboard from './ReceptionistDashboard';

// Routes /dashboard to the dashboard matching the authenticated staff user's role.
const DashboardRouter = () => {
  const { user } = useAuth();

  if (user?.role === 'admin') return <AdminDashboard />;
  if (user?.role === 'veterinarian') return <VetDashboard />;
  return <ReceptionistDashboard />;
};

export default DashboardRouter;
