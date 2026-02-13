import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDayAppointments, setSelectedDayAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // Helper functions - defined early to avoid hoisting issues
  // Helper function to format date as YYYY-MM-DD without timezone conversion
  const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to convert date string from database to YYYY-MM-DD
  // Database returns dates like "2026-02-13T00:00:00.000Z" or "2026-02-13"
  const getISTDate = (dateString) => {
    if (!dateString) return '';
    // Extract just the date part (YYYY-MM-DD) from the ISO string
    return dateString.split('T')[0];
  };

  useEffect(() => {
    fetchAppointments();
  }, [filterStatus]);

  // Navigate calendar to selected date when date filter changes in calendar view
  useEffect(() => {
    if (viewMode === 'calendar' && filterDate) {
      const selectedDate = new Date(filterDate + 'T00:00:00');
      setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
  }, [filterDate, viewMode]);

  // Check if navigated from dashboard with specific appointment to edit
  useEffect(() => {
    if (location.state?.editAppointmentId) {
      setEditingId(location.state.editAppointmentId);
      setShowForm(true);
      // Clear the state to prevent reopening on subsequent renders
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const filters = {};
      // Always fetch all appointments - we'll filter on client side
      // Only apply status filter to API
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
    try {
      const matchesSearch = !searchQuery || 
        appointment.pet_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appointment.customer_first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appointment.customer_last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appointment.veterinarian_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Apply date filter in both views
      const appointmentDate = getISTDate(appointment.appointment_date);
      const matchesDate = !filterDate || appointmentDate === filterDate;
      
      const matchesStatus = !filterStatus || appointment.status === filterStatus;
      const matchesVet = !selectedVet || appointment.veterinarian_id === parseInt(selectedVet);
      
      return matchesSearch && matchesDate && matchesStatus && matchesVet;
    } catch (error) {
      console.error('Error filtering appointment:', appointment, error);
      return false;
    }
  });

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
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - firstDay.getDay());
      
      const days = [];
      const current = new Date(startDate);
      
      // For calendar view, show all appointments that match search/status/vet filters
      // regardless of date filter (date filter only highlights the selected date)
      const calendarAppointments = appointments.filter(apt => {
        try {
          const matchesSearch = !searchQuery || 
            apt.pet_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            apt.customer_first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            apt.customer_last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            apt.veterinarian_name?.toLowerCase().includes(searchQuery.toLowerCase());
          
          const matchesStatus = !filterStatus || apt.status === filterStatus;
          const matchesVet = !selectedVet || apt.veterinarian_id === parseInt(selectedVet);
          
          return matchesSearch && matchesStatus && matchesVet;
        } catch (error) {
          console.error('Error filtering appointment for calendar:', apt, error);
          return false;
        }
      });
      
      for (let i = 0; i < 35; i++) {
        const dateStr = formatDateLocal(current);
        const dayAppointments = calendarAppointments.filter(apt => {
          try {
            const aptDate = getISTDate(apt.appointment_date);
            return aptDate === dateStr;
          } catch (error) {
            console.error('Error matching appointment date:', apt, error);
            return false;
          }
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
    } catch (error) {
      console.error('Error generating calendar days:', error);
      return [];
    }
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentMonth(newDate);
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
    setFilterDate(''); // Clear date filter when going to today
  };

  const handleDayClick = (dateStr, dayAppointments) => {
    // Show modal with all appointments for the clicked day
    if (dayAppointments.length > 0) {
      setSelectedDate(dateStr);
      setSelectedDayAppointments(dayAppointments);
      setShowDayModal(true);
    }
  };

  const handleCloseDayModal = () => {
    setShowDayModal(false);
    setSelectedDayAppointments([]);
    setSelectedDate('');
  };

  const handleAppointmentClick = (appointmentId) => {
    setShowDayModal(false);
    handleEdit(appointmentId);
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
    // Extract date part and parse it as local date
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
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
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  style={styles.filterInput}
                  placeholder="Filter by date"
                />
                <button
                  onClick={() => setFilterDate(formatDateLocal(new Date()))}
                  style={styles.todayButton}
                  title="Filter today's appointments"
                >
                  <i className="fas fa-calendar-day" style={{ marginRight: '0.25rem' }}></i>
                  Today
                </button>
              </div>
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

                  {/* Calendar instructions */}
                  {!filterDate && (
                    <div style={styles.calendarInstructions}>
                      <i className="fas fa-info-circle" style={{ marginRight: '0.5rem' }}></i>
                      Click on a day with appointments to view all scheduled visits for that date.
                    </div>
                  )}
                  
                  {filterDate && (
                    <div style={styles.calendarInstructions}>
                      <i className="fas fa-filter" style={{ marginRight: '0.5rem' }}></i>
                      Showing appointments for {new Date(filterDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
                      <button 
                        onClick={() => setFilterDate('')}
                        style={{ marginLeft: '0.5rem', color: '#3b82f6', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        Clear filter
                      </button>
                    </div>
                  )}

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
                          ...(day.isSelectedDate ? styles.calendarDaySelected : {}),
                          cursor: day.appointments.length > 0 ? 'pointer' : 'default',
                        }}
                        onClick={() => handleDayClick(day.dateStr, day.appointments)}
                      >
                        <div style={styles.calendarDayNumber}>
                          {day.date.getDate()}
                          {day.appointments.length > 0 && (
                            <span style={{
                              marginLeft: '4px',
                              fontSize: '0.625rem',
                              color: '#3b82f6',
                              fontWeight: 'bold'
                            }}>
                              ({day.appointments.length})
                            </span>
                          )}
                        </div>
                        <div style={styles.appointmentsInDay}>
                          {day.appointments.slice(0, 3).map(apt => (
                            <div
                              key={apt.appointment_id}
                              style={{
                                ...styles.appointmentCard,
                                borderLeftColor: getStatusBorderColor(apt.status)
                              }}
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent day click when clicking appointment
                                handleEdit(apt.appointment_id);
                              }}
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
                    {filteredAppointments
                      .sort((a, b) => {
                        const today = formatDateLocal(new Date());
                        const dateA = getISTDate(a.appointment_date);
                        const dateB = getISTDate(b.appointment_date);
                        
                        // Separate upcoming and past appointments
                        const aIsUpcoming = dateA >= today;
                        const bIsUpcoming = dateB >= today;
                        
                        // Upcoming appointments come first
                        if (aIsUpcoming && !bIsUpcoming) return -1;
                        if (!aIsUpcoming && bIsUpcoming) return 1;
                        
                        // Within same category (both upcoming or both past)
                        // Upcoming: sort ascending (earliest first)
                        // Past: sort descending (most recent first)
                        const dateCompare = new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime();
                        if (dateCompare !== 0) {
                          return aIsUpcoming ? dateCompare : -dateCompare;
                        }
                        // If dates are equal, sort by time
                        return aIsUpcoming 
                          ? a.appointment_time.localeCompare(b.appointment_time)
                          : b.appointment_time.localeCompare(a.appointment_time);
                      })
                      .map((appointment) => (
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
                            <>
                              <button
                                onClick={() => handleStatusUpdate(appointment.appointment_id, 'confirmed')}
                                style={styles.confirmButton}
                              >
                                <i className="fas fa-check" style={{ marginRight: '0.25rem' }}></i>
                                Confirm
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(appointment.appointment_id, 'completed')}
                                style={styles.completeButton}
                              >
                                <i className="fas fa-check-double" style={{ marginRight: '0.25rem' }}></i>
                                Complete
                              </button>
                            </>
                          )}
                          {appointment.status === 'confirmed' && (
                            <>
                              <button
                                onClick={() => handleStatusUpdate(appointment.appointment_id, 'in_progress')}
                                style={styles.startButton}
                              >
                                <i className="fas fa-play" style={{ marginRight: '0.25rem' }}></i>
                                Start
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(appointment.appointment_id, 'completed')}
                                style={styles.completeButton}
                              >
                                <i className="fas fa-check-double" style={{ marginRight: '0.25rem' }}></i>
                                Complete
                              </button>
                            </>
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
                          {(appointment.status === 'scheduled' || appointment.status === 'confirmed' || appointment.status === 'in_progress') && (
                            <button
                              onClick={() => {
                                if (window.confirm('Are you sure you want to cancel this appointment?')) {
                                  handleStatusUpdate(appointment.appointment_id, 'cancelled');
                                }
                              }}
                              style={styles.cancelButton}
                            >
                              <i className="fas fa-times" style={{ marginRight: '0.25rem' }}></i>
                              Cancel
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(appointment.appointment_id)}
                            style={styles.editButton}
                            title="Edit or reschedule appointment"
                          >
                            <i className="fas fa-edit" style={{ marginRight: '0.25rem' }}></i>
                            Edit/Reschedule
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

          {/* Day Appointments Modal */}
          {showDayModal && (
            <div style={styles.modalOverlay} onClick={handleCloseDayModal}>
              <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div style={styles.modalHeader}>
                  <h3 style={styles.modalTitle}>
                    <i className="far fa-calendar-alt" style={{ marginRight: '0.5rem' }}></i>
                    Appointments for {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </h3>
                  <button onClick={handleCloseDayModal} style={styles.modalCloseButton}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                <div style={styles.modalBody}>
                  <div style={styles.appointmentCount}>
                    <i className="fas fa-list-ul" style={{ marginRight: '0.5rem' }}></i>
                    {selectedDayAppointments.length} appointment{selectedDayAppointments.length !== 1 ? 's' : ''}
                  </div>
                  <div style={styles.modalAppointmentsList}>
                    {selectedDayAppointments
                      .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))
                      .map((appointment) => (
                      <div 
                        key={appointment.appointment_id} 
                        style={styles.modalAppointmentCard}
                        onClick={() => handleAppointmentClick(appointment.appointment_id)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                          e.currentTarget.style.boxShadow = 'none';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <div style={styles.modalAppointmentHeader}>
                          <div style={styles.modalAppointmentTime}>
                            <i className="far fa-clock" style={{ marginRight: '0.25rem' }}></i>
                            {formatTime(appointment.appointment_time)}
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
                        <div style={styles.modalAppointmentInfo}>
                          <div style={styles.modalAppointmentPet}>
                            <i className={`fas ${getTypeIcon(appointment.appointment_type)}`} 
                               style={{ marginRight: '0.5rem', color: '#3b82f6' }}></i>
                            <strong>{appointment.pet_name}</strong>
                          </div>
                          <div style={styles.modalAppointmentOwner}>
                            <i className="fas fa-user" style={{ marginRight: '0.5rem', color: '#6b7280' }}></i>
                            {appointment.customer_first_name} {appointment.customer_last_name}
                          </div>
                          {appointment.veterinarian_name && (
                            <div style={styles.modalAppointmentVet}>
                              <i className="fas fa-user-md" style={{ marginRight: '0.5rem', color: '#6b7280' }}></i>
                              Dr. {appointment.veterinarian_name}
                            </div>
                          )}
                          <div style={styles.modalAppointmentReason}>
                            <i className="fas fa-notes-medical" style={{ marginRight: '0.5rem', color: '#6b7280' }}></i>
                            {appointment.reason}
                          </div>
                        </div>
                        <div style={styles.modalAppointmentFooter}>
                          <span style={styles.modalAppointmentType}>
                            {appointment.appointment_type}
                          </span>
                          <span style={styles.modalAppointmentDuration}>
                            {appointment.duration_minutes} min
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
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
    gap: '1rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '600',
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
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
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
    gap: '3px',
  },
  filterLabel: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#374151',
  },
  filterInput: {
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
  },
  todayButton: {
    padding: '0.5rem 0.75rem',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
  },
  filterSelect: {
    padding: '0.5rem 0.75rem',
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
    borderRadius: '8px',
    marginBottom: '1.5rem',
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
    padding: '1rem',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    fontSize: '0.875rem',
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
  },
  appointmentsList: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
  },
  emptyState: {
    textAlign: 'center',
    padding: '1.5rem',
  },
  emptyButton: {
    marginTop: '1rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1rem',
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
    gap: '0.5rem',
    alignItems: 'center',
  },
  typeIcon: {
    fontSize: '1rem',
    color: '#3b82f6',
  },
  cardTitle: {
    margin: '0 0 0.25rem 0',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#111827',
  },
  cardSubtitle: {
    margin: 0,
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  statusBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
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
    fontSize: '0.75rem',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
  },
  infoValue: {
    fontSize: '0.75rem',
    fontWeight: '500',
    color: '#111827',
  },
  reasonBox: {
    marginTop: '0.5rem',
    padding: '0.75rem',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    fontSize: '0.75rem',
    color: '#374151',
  },
  cardFooter: {
    display: 'flex',
    gap: '0.5rem',
    padding: '1rem',
    borderTop: '1px solid #f3f4f6',
    backgroundColor: '#f9fafb',
    flexWrap: 'wrap',
  },
  confirmButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.75rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    fontWeight: '500',
  },
  startButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.75rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    fontWeight: '500',
  },
  completeButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.75rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    fontWeight: '500',
  },
  cancelButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.75rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    fontWeight: '500',
  },
  editButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.75rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    fontWeight: '600',
  },
  deleteButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#DC2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.75rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    fontWeight: '600',
  },
  toolbar: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1.5rem',
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
    left: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#9ca3af',
    fontSize: '0.875rem',
  },
  searchInput: {
    width: '100%',
    padding: '0.5rem 0.75rem 0.5rem 2.5rem',
    fontSize: '0.875rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    transition: 'all 0.2s',
  },
  viewToggle: {
    display: 'flex',
    gap: '0',
    backgroundColor: '#f3f4f6',
    borderRadius: '6px',
    padding: '0.25rem',
  },
  viewToggleButton: {
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#6b7280',
    cursor: 'pointer',
    borderRadius: '4px',
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
    gap: '0.75rem',
    marginBottom: '1.5rem',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  activeFiltersLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    fontWeight: '500',
  },
  filterPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.25rem 0.75rem',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  filterPillClose: {
    padding: '0',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#1e40af',
    cursor: 'pointer',
    fontSize: '0.75rem',
    display: 'flex',
    alignItems: 'center',
  },
  clearAllButton: {
    padding: '0.25rem 0.5rem',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#6b7280',
    fontSize: '0.75rem',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  calendarContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
  },
  calendarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem',
    borderBottom: '1px solid #e5e7eb',
  },
  calendarTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
  },
  calendarControls: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  calendarInstructions: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#f0f9ff',
    color: '#0369a1',
    fontSize: '0.75rem',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
  },
  todayButton: {
    padding: '0.5rem 0.75rem',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
  },
  navButton: {
    padding: '0.5rem 0.75rem',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.75rem',
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
    padding: '0.75rem',
    textAlign: 'center',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },
  calendarDay: {
    minHeight: '90px',
    padding: '0.5rem',
    borderRight: '1px solid #e5e7eb',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#f9fafb',
    }
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
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '0.25rem',
  },
  appointmentsInDay: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  appointmentCard: {
    padding: '0.25rem',
    backgroundColor: '#f9fafb',
    borderRadius: '4px',
    borderLeft: '2px solid',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: '0.625rem',
    ':hover': {
      backgroundColor: '#f3f4f6',
      transform: 'translateX(2px)',
    }
  },
  appointmentCardTime: {
    fontSize: '0.625rem',
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: '0.125rem',
  },
  appointmentCardTitle: {
    fontSize: '0.625rem',
    fontWeight: '600',
    color: '#111827',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  appointmentCardSubtitle: {
    fontSize: '0.625rem',
    color: '#6b7280',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  moreAppointments: {
    padding: '4px',
    fontSize: '0.625rem',
    color: '#3b82f6',
    textAlign: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: '3px',
    fontWeight: '600',
    marginTop: '2px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(2px)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    maxWidth: '700px',
    width: '90%',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem',
    borderBottom: '1px solid #e5e7eb',
  },
  modalTitle: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#111827',
    display: 'flex',
    alignItems: 'center',
  },
  modalCloseButton: {
    padding: '0.5rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#6b7280',
    fontSize: '1.25rem',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: '1.5rem',
    overflowY: 'auto',
    flex: 1,
  },
  appointmentCount: {
    padding: '0.75rem 1rem',
    backgroundColor: '#f0f9ff',
    color: '#0369a1',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '500',
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
  },
  modalAppointmentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  modalAppointmentCard: {
    padding: '1rem',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  modalAppointmentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
  },
  modalAppointmentTime: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#111827',
    display: 'flex',
    alignItems: 'center',
  },
  modalAppointmentInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '0.75rem',
  },
  modalAppointmentPet: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: '#111827',
    display: 'flex',
    alignItems: 'center',
  },
  modalAppointmentOwner: {
    fontSize: '0.875rem',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
  },
  modalAppointmentVet: {
    fontSize: '0.875rem',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
  },
  modalAppointmentReason: {
    fontSize: '0.875rem',
    color: '#374151',
    display: 'flex',
    alignItems: 'flex-start',
    lineHeight: '1.5',
  },
  modalAppointmentFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '0.75rem',
    borderTop: '1px solid #e5e7eb',
  },
  modalAppointmentType: {
    fontSize: '0.75rem',
    color: '#6b7280',
    textTransform: 'capitalize',
    backgroundColor: '#f3f4f6',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
  },
  modalAppointmentDuration: {
    fontSize: '0.75rem',
    color: '#6b7280',
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
