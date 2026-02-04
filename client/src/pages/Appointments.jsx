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
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'list'
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedVet, setSelectedVet] = useState('');
  const [lastSearchQuery, setLastSearchQuery] = useState('');
  const [lastFilterStatus, setLastFilterStatus] = useState('');
  const [lastSelectedVet, setLastSelectedVet] = useState('');
  
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchAppointments();
  }, [filterDate, filterStatus, viewMode]);

  // Navigate calendar to selected date when date filter changes in calendar view
  useEffect(() => {
    if (viewMode === 'calendar' && filterDate) {
      const selectedDate = new Date(filterDate + 'T00:00:00');
      setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
  }, [filterDate, viewMode]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const filters = {};
      // In calendar view, don't send date filter to API - fetch all appointments
      // In list view, apply date filter if set
      if (viewMode === 'list' && filterDate) filters.date = filterDate;
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

  // Filter appointments based on search query, date, status, and vet
  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = !searchQuery || 
      appointment.pet_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.customer_first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.customer_last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.veterinarian_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // In list view, apply date filter if set
    // In calendar view, show all appointments (no date filtering)
    const matchesDate = viewMode === 'list' ? (!filterDate || getISTDate(appointment.appointment_date) === filterDate) : true;
    const matchesStatus = !filterStatus || appointment.status === filterStatus;
    const matchesVet = !selectedVet || appointment.veterinarian_id === parseInt(selectedVet);
    
    return matchesSearch && matchesDate && matchesStatus && matchesVet;
  });

  // Helper function to format date as YYYY-MM-DD in IST timezone
  const formatDateLocal = (date) => {
    // Convert to IST (UTC+5:30)
    const istDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const year = istDate.getFullYear();
    const month = String(istDate.getMonth() + 1).padStart(2, '0');
    const day = String(istDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to convert UTC timestamp string to IST date string (YYYY-MM-DD)
  const getISTDate = (utcDateString) => {
    const date = new Date(utcDateString);
    return formatDateLocal(date);
  };

  // Navigate to first filtered appointment when search/filters change in calendar view
  useEffect(() => {
    const filtersChanged = searchQuery !== lastSearchQuery || 
                          filterStatus !== lastFilterStatus || 
                          selectedVet !== lastSelectedVet;
    
    if (viewMode === 'calendar' && filtersChanged && filteredAppointments.length > 0) {
      const firstApt = filteredAppointments[0];
      const aptDateStr = getISTDate(firstApt.appointment_date);
      const aptDate = new Date(aptDateStr + 'T00:00:00');
      setCurrentMonth(new Date(aptDate.getFullYear(), aptDate.getMonth(), 1));
      
      setLastSearchQuery(searchQuery);
      setLastFilterStatus(filterStatus);
      setLastSelectedVet(selectedVet);
    }
  }, [viewMode, searchQuery, filterStatus, selectedVet, filteredAppointments.length]);

  // Get calendar grid data
  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 35; i++) {
      const dateStr = formatDateLocal(current);
      const dayAppointments = filteredAppointments.filter(apt => {
        const aptDate = getISTDate(apt.appointment_date);
        return aptDate === dateStr;
      });
      
      days.push({
        date: new Date(current),
        dateStr: dateStr,
        isCurrentMonth: current.getMonth() === month,
        isToday: dateStr === formatDateLocal(new Date()),
        isSelectedDate: filterDate && dateStr === filterDate,
        appointments: dayAppointments
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentMonth(newDate);
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
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

  const getStatusBorderColor = (status) => {
    const colors = {
      scheduled: '#3b82f6',
      confirmed: '#10b981',
      in_progress: '#f59e0b',
      completed: '#6b7280',
      cancelled: '#6b7280',
      no_show: '#dc2626',
      rescheduled: '#8b5cf6'
    };
    return colors[status] || '#6b7280';
  };

  const getTypeIcon = (type) => {
    const icons = {
      checkup: 'fa-stethoscope',
      vaccination: 'fa-syringe',
      surgery: 'fa-hospital',
      emergency: 'fa-ambulance',
      followup: 'fa-calendar-check',
      grooming: 'fa-cut'
    };
    return icons[type] || 'fa-calendar';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Kolkata'
    });
  };

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatMonthYear = () => {
    return currentMonth.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
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
              <i className="fas fa-plus" style={{ marginRight: '0.5rem' }}></i>
              Schedule Appointment
            </button>
          </div>

          {/* Toolbar */}
          <div style={styles.toolbar}>
            {/* Search Bar */}
            <div style={styles.searchContainer}>
              <i className="fas fa-search" style={styles.searchIcon}></i>
              <input
                type="text"
                placeholder="Search appointments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
            </div>

            {/* Filters */}
            <div style={styles.filterGroup}>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
                <option value="rescheduled">Rescheduled</option>
              </select>
            </div>

            {/* Date Filter */}
            <div style={styles.filterGroup}>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                style={styles.filterInput}
                placeholder="Filter by date"
              />
            </div>

            {/* View Toggle */}
            <div style={styles.viewToggle}>
              <button
                onClick={() => setViewMode('calendar')}
                style={{
                  ...styles.viewToggleButton,
                  ...(viewMode === 'calendar' ? styles.viewToggleButtonActive : {})
                }}
              >
                <i className="far fa-calendar" style={{ marginRight: '0.5rem' }}></i>
                Calendar
              </button>
              <button
                onClick={() => setViewMode('list')}
                style={{
                  ...styles.viewToggleButton,
                  ...(viewMode === 'list' ? styles.viewToggleButtonActive : {})
                }}
              >
                <i className="fas fa-list" style={{ marginRight: '0.5rem' }}></i>
                List
              </button>
            </div>
          </div>

          {/* Active Filters Display */}
          {(filterStatus || searchQuery || filterDate) && (
            <div style={styles.activeFilters}>
              <span style={styles.activeFiltersLabel}>Active filters:</span>
              {filterStatus && (
                <span style={styles.filterPill}>
                  Status: {filterStatus}
                  <button
                    onClick={() => setFilterStatus('')}
                    style={styles.filterPillClose}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </span>
              )}
              {searchQuery && (
                <span style={styles.filterPill}>
                  Search: "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery('')}
                    style={styles.filterPillClose}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </span>
              )}
              {filterDate && (
                <span style={styles.filterPill}>
                  Date: {filterDate}
                  <button
                    onClick={() => setFilterDate('')}
                    style={styles.filterPillClose}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setFilterStatus('');
                  setSearchQuery('');
                  setFilterDate('');
                }
}
                style={styles.clearAllButton}
              >
                Clear all
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={styles.errorBox}>
              <i className="fas fa-exclamation-circle" style={{ marginRight: '0.5rem' }}></i>
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
              {viewMode === 'calendar' ? (
                /* Calendar View */
                <div style={styles.calendarContainer}>
                  <div style={styles.calendarHeader}>
                    <h3 style={styles.calendarTitle}>{formatMonthYear()}</h3>
                    <div style={styles.calendarControls}>
                      <button onClick={goToToday} style={styles.todayButton}>
                        <i className="fas fa-calendar-day" style={{ marginRight: '0.5rem' }}></i>
                        Today
                      </button>
                      <button onClick={() => navigateMonth(-1)} style={styles.navButton}>
                        <i className="fas fa-chevron-left"></i>
                      </button>
                      <button onClick={() => navigateMonth(1)} style={styles.navButton}>
                        <i className="fas fa-chevron-right"></i>
                      </button>
                    </div>
                  </div>

                  <div style={styles.calendarGrid}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} style={styles.dayHeader}>{day}</div>
                    ))}

                    {getCalendarDays().map((day, index) => (
                      <div
                        key={index}
                        style={{
                          ...styles.calendarDay,
                          ...(day.isCurrentMonth ? {} : styles.calendarDayOtherMonth),
                          ...(day.isToday ? styles.calendarDayToday : {}),
                          ...(day.isSelectedDate ? styles.calendarDaySelected : {})
                        }}
                      >
                        <div style={styles.calendarDayNumber}>
                          {day.date.getDate()}
                        </div>
                        <div style={styles.appointmentsInDay}>
                          {day.appointments.slice(0, 3).map(apt => (
                            <div
                              key={apt.appointment_id}
                              style={{
                                ...styles.appointmentCard,
                                borderLeftColor: getStatusBorderColor(apt.status)
                              }}
                              onClick={() => handleEdit(apt.appointment_id)}
                            >
                              <div style={styles.appointmentCardTime}>
                                {formatTime(apt.appointment_time)}
                              </div>
                              <div style={styles.appointmentCardTitle}>
                                {apt.pet_name}
                              </div>
                              <div style={styles.appointmentCardSubtitle}>
                                {apt.customer_first_name} {apt.customer_last_name}
                              </div>
                            </div>
                          ))}
                          {day.appointments.length > 3 && (
                            <div style={styles.moreAppointments}>
                              +{day.appointments.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* List View */
                <>
                  {/* Appointment Count */}
                  <div style={styles.countInfo}>
                    <i className="fas fa-calendar-check" style={{ marginRight: '0.5rem' }}></i>
                    Total Appointments: <strong>{filteredAppointments.length}</strong>
                  </div>

              {/* Appointments List */}
              <div style={styles.appointmentsList}>
                {filteredAppointments.length === 0 ? (
                  <div style={styles.emptyState}>
                    <i className="far fa-calendar-times" style={{ fontSize: '3rem', color: '#d1d5db', marginBottom: '1rem' }}></i>
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
                    {filteredAppointments.map((appointment) => (
                      <div key={appointment.appointment_id} style={styles.card}>
                        <div style={styles.cardHeader}>
                          <div style={styles.cardHeaderLeft}>
                            <i className={`fas ${getTypeIcon(appointment.appointment_type)}`} style={styles.typeIcon}></i>
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
                            <span style={styles.infoLabel}><i className="far fa-calendar"></i> Date:</span>
                            <span style={styles.infoValue}>{formatDate(appointment.appointment_date)}</span>
                          </div>
                          <div style={styles.infoRow}>
                            <span style={styles.infoLabel}><i className="far fa-clock"></i> Time:</span>
                            <span style={styles.infoValue}>{formatTime(appointment.appointment_time)}</span>
                          </div>
                          <div style={styles.infoRow}>
                            <span style={styles.infoLabel}><i className="fas fa-hourglass-half"></i> Duration:</span>
                            <span style={styles.infoValue}>{appointment.duration_minutes} min</span>
                          </div>
                          <div style={styles.infoRow}>
                            <span style={styles.infoLabel}><i className="fas fa-clipboard"></i> Type:</span>
                            <span style={styles.infoValue}>{appointment.appointment_type}</span>
                          </div>
                          {appointment.veterinarian_name && (
                            <div style={styles.infoRow}>
                              <span style={styles.infoLabel}><i className="fas fa-user-md"></i> Vet:</span>
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
                              <i className="fas fa-check" style={{ marginRight: '0.25rem' }}></i>
                              Confirm
                            </button>
                          )}
                          {appointment.status === 'confirmed' && (
                            <button
                              onClick={() => handleStatusUpdate(appointment.appointment_id, 'in_progress')}
                              style={styles.startButton}
                            >
                              <i className="fas fa-play" style={{ marginRight: '0.25rem' }}></i>
                              Start
                            </button>
                          )}
                          {appointment.status === 'in_progress' && (
                            <button
                              onClick={() => handleStatusUpdate(appointment.appointment_id, 'completed')}
                              style={styles.completeButton}
                            >
                              <i className="fas fa-check-double" style={{ marginRight: '0.25rem' }}></i>
                              Complete
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(appointment.appointment_id)}
                            style={styles.editButton}
                          >
                            <i className="fas fa-edit" style={{ marginRight: '0.25rem' }}></i>
                            Edit
                          </button>
                          {user?.role === 'admin' && (
                            <button
                              onClick={() => handleDelete(appointment.appointment_id)}
                              style={styles.deleteButton}
                            >
                              <i className="fas fa-trash" style={{ marginRight: '0.25rem' }}></i>
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
    marginBottom: '0.75rem',
    gap: '1rem',
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 0.2rem 0',
  },
  subtitle: {
    fontSize: '12px',
    color: '#6b7280',
    margin: 0,
  },
  addButton: {
    padding: '7px 12px',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
  },
  filterContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '0.75rem',
    alignItems: 'flex-end',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  filterLabel: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#374151',
  },
  filterInput: {
    padding: '4px 6px',
    fontSize: '11px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    outline: 'none',
  },
  filterSelect: {
    padding: '4px 6px',
    fontSize: '11px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    outline: 'none',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  clearButton: {
    padding: '5px 8px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    cursor: 'pointer',
  },
  errorBox: {
    padding: '0.75rem',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '4px',
    marginBottom: '0.75rem',
    border: '1px solid #fecaca',
    display: 'flex',
    alignItems: 'center',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #2563eb',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
  },
  countInfo: {
    padding: '8px',
    backgroundColor: '#f9fafb',
    borderRadius: '4px',
    marginBottom: '0.75rem',
    fontSize: '11px',
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
  },
  appointmentsList: {
    backgroundColor: '#ffffff',
    borderRadius: '4px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
  },
  emptyState: {
    textAlign: 'center',
    padding: '1.5rem',
  },
  emptyButton: {
    marginTop: '8px',
    padding: '7px 12px',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '8px',
    padding: '10px',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
    transition: 'box-shadow 0.2s',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '8px',
    borderBottom: '1px solid #f3f4f6',
  },
  cardHeaderLeft: {
    display: 'flex',
    gap: '5px',
    alignItems: 'center',
  },
  typeIcon: {
    fontSize: '14px',
    color: '#3b82f6',
  },
  cardTitle: {
    margin: '0 0 2px 0',
    fontSize: '13px',
    fontWeight: '600',
    color: '#111827',
  },
  cardSubtitle: {
    margin: 0,
    fontSize: '10px',
    color: '#6b7280',
  },
  statusBadge: {
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '9px',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  cardBody: {
    padding: '8px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  infoLabel: {
    fontSize: '10px',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  infoValue: {
    fontSize: '10px',
    fontWeight: '500',
    color: '#111827',
  },
  reasonBox: {
    marginTop: '6px',
    padding: '6px',
    backgroundColor: '#f9fafb',
    borderRadius: '4px',
    fontSize: '10px',
    color: '#374151',
  },
  cardFooter: {
    display: 'flex',
    gap: '4px',
    padding: '8px',
    borderTop: '1px solid #f3f4f6',
    backgroundColor: '#f9fafb',
  },
  confirmButton: {
    padding: '5px 8px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    fontWeight: '500',
  },
  startButton: {
    padding: '5px 8px',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    fontWeight: '500',
  },
  completeButton: {
    padding: '5px 8px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    fontWeight: '500',
  },
  editButton: {
    padding: '5px 8px',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    fontWeight: '600',
  },
  deleteButton: {
    padding: '5px 8px',
    backgroundColor: '#DC2626',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    fontWeight: '600',
  },
  toolbar: {
    display: 'flex',
    gap: '8px',
    marginBottom: '0.75rem',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  searchContainer: {
    position: 'relative',
    flex: '1',
    minWidth: '200px',
  },
  searchIcon: {
    position: 'absolute',
    left: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#9ca3af',
    fontSize: '12px',
  },
  searchInput: {
    width: '100%',
    padding: '6px 8px 6px 28px',
    fontSize: '11px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    outline: 'none',
    transition: 'all 0.2s',
  },
  viewToggle: {
    display: 'flex',
    gap: '0',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
    padding: '2px',
  },
  viewToggleButton: {
    padding: '4px 8px',
    fontSize: '11px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#6b7280',
    cursor: 'pointer',
    borderRadius: '3px',
    fontWeight: '500',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
  },
  viewToggleButtonActive: {
    backgroundColor: 'white',
    color: '#2563eb',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  },
  activeFilters: {
    display: 'flex',
    gap: '6px',
    marginBottom: '0.75rem',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  activeFiltersLabel: {
    fontSize: '10px',
    color: '#6b7280',
    fontWeight: '500',
  },
  filterPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: '500',
  },
  filterPillClose: {
    padding: '0',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#1e40af',
    cursor: 'pointer',
    fontSize: '9px',
    display: 'flex',
    alignItems: 'center',
  },
  clearAllButton: {
    padding: '3px 6px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#6b7280',
    fontSize: '10px',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  calendarContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '4px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
  },
  calendarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
    borderBottom: '1px solid #e5e7eb',
  },
  calendarTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
  },
  calendarControls: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
  },
  todayButton: {
    padding: '4px 8px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
  },
  navButton: {
    padding: '4px 6px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '4px',
    fontSize: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
  },
  calendarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    borderTop: '1px solid #e5e7eb',
  },
  dayHeader: {
    padding: '6px',
    textAlign: 'center',
    fontSize: '9px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },
  calendarDay: {
    minHeight: '80px',
    padding: '4px',
    borderRight: '1px solid #e5e7eb',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  calendarDayOtherMonth: {
    backgroundColor: '#f9fafb',
    opacity: 0.5,
  },
  calendarDayToday: {
    backgroundColor: '#eff6ff',
    borderTop: '2px solid #3b82f6',
    borderRight: '2px solid #3b82f6',
    borderBottom: '2px solid #3b82f6',
    borderLeft: '2px solid #3b82f6',
  },
  calendarDaySelected: {
    backgroundColor: '#fef3c7',
    borderTop: '2px solid #f59e0b',
    borderRight: '2px solid #f59e0b',
    borderBottom: '2px solid #f59e0b',
    borderLeft: '2px solid #f59e0b',
    boxShadow: '0 0 0 3px rgba(245, 158, 11, 0.1)',
  },
  calendarDayNumber: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '3px',
  },
  appointmentsInDay: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  appointmentCard: {
    padding: '3px',
    backgroundColor: '#f9fafb',
    borderRadius: '2px',
    borderLeft: '2px solid',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: '8px',
  },
  appointmentCardTime: {
    fontSize: '7px',
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: '1px',
  },
  appointmentCardTitle: {
    fontSize: '8px',
    fontWeight: '600',
    color: '#111827',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  appointmentCardSubtitle: {
    fontSize: '7px',
    color: '#6b7280',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  moreAppointments: {
    padding: '2px 4px',
    fontSize: '7px',
    color: '#6b7280',
    textAlign: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: '2px',
  },
  footer: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e5e7eb',
    textAlign: 'center',
  },
  footerText: {
    margin: 0,
    fontSize: '10px',
    color: '#6b7280',
  },
};

export default Appointments;
