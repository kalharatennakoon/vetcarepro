import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAppointments, deleteAppointment, updateAppointmentStatus } from '../services/appointmentService';
import { useAuth } from '../context/AuthContext';
import AppointmentForm from '../components/AppointmentForm';
import Layout from '../components/Layout';

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchAppointments();
  }, [filterDate, filterStatus]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (filterDate) filters.date = filterDate;
      if (filterStatus) filters.status = filterStatus;
      
      const response = await getAppointments(filters);
      setAppointments(response.data.appointments || []);
      setError('');
    } catch (err) {
      setError('Failed to load appointments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this appointment?')) {
      return;
    }

    try {
      await deleteAppointment(id);
      fetchAppointments();
    } catch (err) {
      alert('Failed to delete appointment');
      console.error(err);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await updateAppointmentStatus(id, newStatus);
      fetchAppointments();
    } catch (err) {
      alert('Failed to update status');
      console.error(err);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingId(null);
    fetchAppointments();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (id) => {
    setEditingId(id);
    setShowForm(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      scheduled: '#3b82f6',
      confirmed: '#10b981',
      in_progress: '#f59e0b',
      completed: '#6b7280',
      cancelled: '#ef4444',
      no_show: '#dc2626',
      rescheduled: '#8b5cf6'
    };
    return colors[status] || '#6b7280';
  };

  const getTypeEmoji = (type) => {
    const emojis = {
      checkup: '🩺',
      vaccination: '💉',
      surgery: '🏥',
      emergency: '🚨',
      followup: '📋',
      grooming: '✂️'
    };
    return emojis[type] || '📅';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (showForm) {
    return (
      <Layout>
        <AppointmentForm
          appointmentId={editingId}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </Layout>
    );
  }

  return (
    <Layout>
          {/* Page Header */}
          <div style={styles.pageHeader}>
            <div>
              <h2 style={styles.title}>Appointments</h2>
              <p style={styles.subtitle}>Manage clinic appointments and schedules</p>
            </div>
            <button 
              onClick={() => setShowForm(true)}
              style={styles.addButton}
            >
              + Schedule Appointment
            </button>
          </div>

          {/* Filters */}
          <div style={styles.filterContainer}>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Date:</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                style={styles.filterInput}
              />
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
                <option value="rescheduled">Rescheduled</option>
              </select>
            </div>
            {(filterDate || filterStatus) && (
              <button
                onClick={() => {
                  setFilterDate('');
                  setFilterStatus('');
                }}
                style={styles.clearButton}
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div style={styles.errorBox}>
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p>Loading appointments...</p>
            </div>
          ) : (
            <>
              {/* Appointment Count */}
              <div style={styles.countInfo}>
                Total Appointments: <strong>{appointments.length}</strong>
              </div>

              {/* Appointments List */}
              <div style={styles.appointmentsList}>
                {appointments.length === 0 ? (
                  <div style={styles.emptyState}>
                    <p>No appointments found</p>
                    <button 
                      onClick={() => setShowForm(true)}
                      style={styles.emptyButton}
                    >
                      Schedule Your First Appointment
                    </button>
                  </div>
                ) : (
                  <div style={styles.cardsGrid}>
                    {appointments.map((appointment) => (
                      <div key={appointment.appointment_id} style={styles.card}>
                        <div style={styles.cardHeader}>
                          <div style={styles.cardHeaderLeft}>
                            <span style={styles.typeEmoji}>
                              {getTypeEmoji(appointment.appointment_type)}
                            </span>
                            <div>
                              <h3 style={styles.cardTitle}>
                                {appointment.pet_name}
                              </h3>
                              <p style={styles.cardSubtitle}>
                                {appointment.customer_first_name} {appointment.customer_last_name}
                              </p>
                            </div>
                          </div>
                          <span 
                            style={{
                              ...styles.statusBadge,
                              backgroundColor: `${getStatusColor(appointment.status)}20`,
                              color: getStatusColor(appointment.status),
                            }}
                          >
                            {appointment.status}
                          </span>
                        </div>

                        <div style={styles.cardBody}>
                          <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>📅 Date:</span>
                            <span style={styles.infoValue}>{formatDate(appointment.appointment_date)}</span>
                          </div>
                          <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>🕐 Time:</span>
                            <span style={styles.infoValue}>{formatTime(appointment.appointment_time)}</span>
                          </div>
                          <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>⏱️ Duration:</span>
                            <span style={styles.infoValue}>{appointment.duration_minutes} min</span>
                          </div>
                          <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>📝 Type:</span>
                            <span style={styles.infoValue}>{appointment.appointment_type}</span>
                          </div>
                          {appointment.veterinarian_name && (
                            <div style={styles.infoRow}>
                              <span style={styles.infoLabel}>👨‍⚕️ Vet:</span>
                              <span style={styles.infoValue}>{appointment.veterinarian_name}</span>
                            </div>
                          )}
                          <div style={styles.reasonBox}>
                            <strong>Reason:</strong> {appointment.reason}
                          </div>
                        </div>

                        <div style={styles.cardFooter}>
                          {appointment.status === 'scheduled' && (
                            <button
                              onClick={() => handleStatusUpdate(appointment.appointment_id, 'confirmed')}
                              style={styles.confirmButton}
                            >
                              Confirm
                            </button>
                          )}
                          {appointment.status === 'confirmed' && (
                            <button
                              onClick={() => handleStatusUpdate(appointment.appointment_id, 'in_progress')}
                              style={styles.startButton}
                            >
                              Start
                            </button>
                          )}
                          {appointment.status === 'in_progress' && (
                            <button
                              onClick={() => handleStatusUpdate(appointment.appointment_id, 'completed')}
                              style={styles.completeButton}
                            >
                              Complete
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(appointment.appointment_id)}
                            style={styles.editButton}
                          >
                            Edit
                          </button>
                          {user?.role === 'admin' && (
                            <button
                              onClick={() => handleDelete(appointment.appointment_id)}
                              style={styles.deleteButton}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
    </Layout>
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
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
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
    margin: 0,
  },
  addButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  filterContainer: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1.5rem',
    alignItems: 'flex-end',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  filterLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
  },
  filterInput: {
    padding: '0.5rem',
    fontSize: '0.875rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
  },
  filterSelect: {
    padding: '0.5rem',
    fontSize: '0.875rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  clearButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  errorBox: {
    padding: '1rem',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    marginBottom: '1rem',
    border: '1px solid #fecaca',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
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
  countInfo: {
    padding: '1rem',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    marginBottom: '1rem',
    fontSize: '0.875rem',
    color: '#374151',
  },
  appointmentsList: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
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
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '1.5rem',
    padding: '1.5rem',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden',
    transition: 'box-shadow 0.2s',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '1rem',
    borderBottom: '1px solid #f3f4f6',
  },
  cardHeaderLeft: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
  },
  typeEmoji: {
    fontSize: '2rem',
  },
  cardTitle: {
    margin: '0 0 0.25rem 0',
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#111827',
  },
  cardSubtitle: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  statusBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  cardBody: {
    padding: '1rem',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.5rem',
  },
  infoLabel: {
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  infoValue: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#111827',
  },
  reasonBox: {
    marginTop: '0.75rem',
    padding: '0.75rem',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    fontSize: '0.875rem',
    color: '#374151',
  },
  cardFooter: {
    display: 'flex',
    gap: '0.5rem',
    padding: '1rem',
    borderTop: '1px solid #f3f4f6',
    backgroundColor: '#f9fafb',
  },
  confirmButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  startButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  completeButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  editButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.875rem',
    cursor: 'pointer',
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
