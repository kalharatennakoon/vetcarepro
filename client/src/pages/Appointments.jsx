import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Appointments = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.logo}>🏥 VetCare Pro</h1>
          <p style={styles.headerSubtitle}>Pro Pet Animal Hospital</p>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.userInfo}>
            <span style={styles.userName}>{user?.full_name}</span>
            <span style={styles.userRole}>{user?.role}</span>
          </div>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Sidebar */}
        <aside style={styles.sidebar}>
          <nav style={styles.nav}>
            <a href="/dashboard" style={styles.navItem}>📊 Dashboard</a>
            <a href="/pets" style={styles.navItem}>🐾 Pets</a>
            <a href="/customers" style={styles.navItem}>👥 Customers</a>
            <a href="/appointments" style={{...styles.navItem, ...styles.navItemActive}}>📅 Appointments</a>
            {user?.role === 'admin' && (
              <a href="/users" style={styles.navItem}>👨‍⚕️ Staff</a>
            )}
          </nav>
        </aside>

        {/* Content Area */}
        <main style={styles.content}>
      <h2 style={styles.title}>Appointments</h2>
      <p style={styles.subtitle}>Manage appointments and schedules</p>
      <div style={styles.contentBox}>
        <p>Welcome, {user?.full_name}</p>
        <p>Appointments management functionality coming soon...</p>
      </div>
        </main>
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <p style={styles.footerText}>
          © 2025 VetCare Pro - Pro Pet Animal Hospital, Mawathagama, Kurunegala
        </p>
      </footer>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#f5f7fa',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
  },
  logo: {
    margin: 0,
    fontSize: '1.5rem',
    color: '#1e40af',
    fontWeight: 'bold',
  },
  headerSubtitle: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  userName: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#111827',
  },
  userRole: {
    fontSize: '0.75rem',
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  logoutButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  mainContent: {
    display: 'flex',
    flex: 1,
  },
  sidebar: {
    width: '250px',
    backgroundColor: '#ffffff',
    borderRight: '1px solid #e5e7eb',
    padding: '1.5rem 0',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
  },
  navItem: {
    padding: '0.75rem 1.5rem',
    textDecoration: 'none',
    color: '#374151',
    fontSize: '0.875rem',
    fontWeight: '500',
    transition: 'all 0.2s',
    borderLeft: '3px solid transparent',
  },
  navItemActive: {
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    borderLeft: '3px solid #2563eb',
  },
  content: {
    flex: 1,
    padding: '2rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#111827',
    margin: '0 0 0.5rem 0',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#6b7280',
    margin: '0 0 2rem 0',
  },
  contentBox: {
    backgroundColor: '#ffffff',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  footer: {
    padding: '1rem 2rem',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e5e7eb',
    textAlign: 'center',
  },
  footerText: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#6b7280',
  },
};

export default Appointments;
