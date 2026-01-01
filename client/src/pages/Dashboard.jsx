import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.logo}>🏥 VetCare Pro</h1>
          <p style={styles.subtitle}>Pro Pet Animal Hospital</p>
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
            <a href="#" style={styles.navItem}>📊 Dashboard</a>
            <a href="#" style={styles.navItem}>🐾 Appointments</a>
            <a href="#" style={styles.navItem}>🐕 Patients</a>
            <a href="#" style={styles.navItem}>👨‍⚕️ Veterinarians</a>
            <a href="#" style={styles.navItem}>💊 Inventory</a>
            <a href="#" style={styles.navItem}>💰 Billing</a>
            <a href="#" style={styles.navItem}>📈 Reports</a>
            <a href="#" style={styles.navItem}>⚙️ Settings</a>
          </nav>
        </aside>

        {/* Content Area */}
        <main style={styles.content}>
          <h2 style={styles.pageTitle}>Dashboard</h2>
          
          {/* Stats Cards */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statIcon}>📅</div>
              <div style={styles.statInfo}>
                <h3 style={styles.statValue}>24</h3>
                <p style={styles.statLabel}>Today's Appointments</p>
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statIcon}>🐾</div>
              <div style={styles.statInfo}>
                <h3 style={styles.statValue}>156</h3>
                <p style={styles.statLabel}>Active Patients</p>
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statIcon}>👨‍⚕️</div>
              <div style={styles.statInfo}>
                <h3 style={styles.statValue}>8</h3>
                <p style={styles.statLabel}>Veterinarians</p>
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statIcon}>💰</div>
              <div style={styles.statInfo}>
                <h3 style={styles.statValue}>LKR 45,000</h3>
                <p style={styles.statLabel}>Today's Revenue</p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Recent Appointments</h3>
            <div style={styles.table}>
              <table style={styles.tableElement}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.th}>Time</th>
                    <th style={styles.th}>Patient</th>
                    <th style={styles.th}>Owner</th>
                    <th style={styles.th}>Doctor</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={styles.tableRow}>
                    <td style={styles.td}>09:00 AM</td>
                    <td style={styles.td}>Max (Dog)</td>
                    <td style={styles.td}>Mr. Silva</td>
                    <td style={styles.td}>Dr. Nimal</td>
                    <td style={styles.td}><span style={styles.statusCompleted}>Completed</span></td>
                  </tr>
                  <tr style={styles.tableRow}>
                    <td style={styles.td}>10:30 AM</td>
                    <td style={styles.td}>Bella (Cat)</td>
                    <td style={styles.td}>Mrs. Fernando</td>
                    <td style={styles.td}>Dr. Ayesha</td>
                    <td style={styles.td}><span style={styles.statusInProgress}>In Progress</span></td>
                  </tr>
                  <tr style={styles.tableRow}>
                    <td style={styles.td}>11:00 AM</td>
                    <td style={styles.td}>Charlie (Rabbit)</td>
                    <td style={styles.td}>Ms. Perera</td>
                    <td style={styles.td}>Dr. Nimal</td>
                    <td style={styles.td}><span style={styles.statusPending}>Pending</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
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
  subtitle: {
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
  content: {
    flex: 1,
    padding: '2rem',
  },
  pageTitle: {
    margin: '0 0 1.5rem 0',
    fontSize: '1.875rem',
    fontWeight: 'bold',
    color: '#111827',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.5rem',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  statIcon: {
    fontSize: '2.5rem',
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  statValue: {
    margin: 0,
    fontSize: '1.875rem',
    fontWeight: 'bold',
    color: '#111827',
  },
  statLabel: {
    margin: '0.25rem 0 0 0',
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  sectionTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#111827',
  },
  table: {
    width: '100%',
    overflowX: 'auto',
  },
  tableElement: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    backgroundColor: '#f9fafb',
  },
  th: {
    padding: '0.75rem',
    textAlign: 'left',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
    borderBottom: '1px solid #e5e7eb',
  },
  tableRow: {
    borderBottom: '1px solid #f3f4f6',
  },
  td: {
    padding: '0.75rem',
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  statusCompleted: {
    padding: '0.25rem 0.75rem',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  statusInProgress: {
    padding: '0.25rem 0.75rem',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  statusPending: {
    padding: '0.25rem 0.75rem',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '500',
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

export default Dashboard;
