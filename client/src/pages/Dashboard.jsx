import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { getPets } from '../services/petService';
import { getCustomers } from '../services/customerService';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalPets: 0,
    activePets: 0,
    totalCustomers: 0,
    recentPets: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch pets, customers, and appointments in parallel
      const [petsResponse, customersResponse, appointmentsResponse] = await Promise.all([
        getPets({}),
        getCustomers({}),
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/appointments`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      const pets = petsResponse.data.pets || [];
      const customers = customersResponse.data.customers || [];
      const appointments = appointmentsResponse.data.data.appointments || [];
      
      // Get today's appointments
      const today = new Date().toISOString().split('T')[0];
      const todayAppointments = appointments.filter(a => a.appointment_date === today);

      setStats({
        totalPets: pets.length,
        activePets: pets.filter(p => p.is_active).length,
        totalCustomers: customers.length,
        totalAppointments: appointments.length,
        todayAppointments: todayAppointments.length,
        recentPets: pets.slice(0, 5)
      });
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

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
            <a href="/dashboard" style={styles.navItem}>📊 Dashboard</a>
            <a href="/pets" style={styles.navItem}>🐾 Pets</a>
            <a href="/customers" style={styles.navItem}>👥 Customers</a>
            <a href="/appointments" style={styles.navItem}>📅 Appointments</a>
            {user?.role === 'admin' && (
              <a href="/users" style={styles.navItem}>👨‍⚕️ Staff</a>
            )}
          </nav>
        </aside>

        {/* Content Area */}
        <main style={styles.content}>
          <h2 style={styles.pageTitle}>Dashboard</h2>
          
          {/* Quick Actions */}
          <div style={styles.quickActions}>
            <button onClick={() => navigate('/pets/new')} style={styles.actionButton}>
              ➕ Add New Pet
            </button>
            <button onClick={() => navigate('/customers/new')} style={styles.actionButton}>
              ➕ Add New Customer
            </button>
          </div>

          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p>Loading dashboard data...</p>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div style={styles.statsGrid}>
                <div 
                  style={{...styles.statCard, cursor: 'pointer'}}
                  onClick={() => navigate('/pets')}
                >
                  <div style={styles.statIcon}>🐾</div>
                  <div style={styles.statInfo}>
                    <h3 style={styles.statValue}>{stats.activePets}</h3>
                    <p style={styles.statLabel}>Active Pets</p>
                  </div>
                </div>

                <div 
                  style={{...styles.statCard, cursor: 'pointer'}}
                  onClick={() => navigate('/pets')}
                >
                  <div style={styles.statIcon}>📋</div>
                  <div style={styles.statInfo}>
                    <h3 style={styles.statValue}>{stats.totalPets}</h3>
                    <p style={styles.statLabel}>Total Pets Registered</p>
                  </div>
                </div>

                <div 
                  style={{...styles.statCard, cursor: 'pointer'}}
                  onClick={() => navigate('/customers')}
                >
                  <div style={styles.statIcon}>👥</div>
                  <div style={styles.statInfo}>
                    <h3 style={styles.statValue}>{stats.totalCustomers}</h3>
                    <p style={styles.statLabel}>Total Customers</p>
                  </div>
                </div>

                <div 
                  style={{...styles.statCard, cursor: 'pointer'}}
                  onClick={() => navigate('/appointments')}
                >
                  <div style={styles.statIcon}>📅</div>
                  <div style={styles.statInfo}>
                    <h3 style={styles.statValue}>{stats.todayAppointments}</h3>
                    <p style={styles.statLabel}>Today's Appointments</p>
                  </div>
                </div>

                <div style={styles.statCard}>
                  <div style={styles.statIcon}>👨‍⚕️</div>
                  <div style={styles.statInfo}>
                    <h3 style={styles.statValue}>{user?.role === 'admin' ? 'Admin' : 'Staff'}</h3>
                    <p style={styles.statLabel}>Your Role</p>
                  </div>
                </div>
              </div>

              {/* Recent Pets */}
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <h3 style={styles.sectionTitle}>Recently Registered Pets</h3>
                  <button onClick={() => navigate('/pets')} style={styles.viewAllButton}>
                    View All →
                  </button>
                </div>
                {stats.recentPets.length === 0 ? (
                  <div style={styles.emptyState}>
                    <p>No pets registered yet</p>
                    <button onClick={() => navigate('/pets/new')} style={styles.emptyButton}>
                      Register First Pet
                    </button>
                  </div>
                ) : (
                  <div style={styles.table}>
                    <table style={styles.tableElement}>
                      <thead>
                        <tr style={styles.tableHeader}>
                          <th style={styles.th}>Pet Name</th>
                          <th style={styles.th}>Species</th>
                          <th style={styles.th}>Owner</th>
                          <th style={styles.th}>Registered</th>
                          <th style={styles.th}>Status</th>
                          <th style={styles.th}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentPets.map((pet) => (
                          <tr key={pet.pet_id} style={styles.tableRow}>
                            <td style={styles.td}>{pet.pet_name}</td>
                            <td style={styles.td}>{pet.species}</td>
                            <td style={styles.td}>
                              {pet.owner_first_name} {pet.owner_last_name}
                            </td>
                            <td style={styles.td}>
                              {new Date(pet.created_at).toLocaleDateString()}
                            </td>
                            <td style={styles.td}>
                              <span style={pet.is_active ? styles.statusActive : styles.statusInactive}>
                                {pet.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td style={styles.td}>
                              <button
                                onClick={() => navigate(`/pets/${pet.pet_id}`)}
                                style={styles.viewButton}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
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
  quickActions: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  actionButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '3rem',
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #2563eb',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    animation: 'spin 1s linear infinite',
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
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#111827',
  },
  viewAllButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'transparent',
    color: '#2563eb',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    color: '#6b7280',
  },
  emptyButton: {
    marginTop: '1rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  viewButton: {
    padding: '0.375rem 0.75rem',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  statusActive: {
    padding: '0.25rem 0.75rem',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  statusInactive: {
    padding: '0.25rem 0.75rem',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '500',
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
