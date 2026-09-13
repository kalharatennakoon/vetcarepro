import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAppointments, deleteAppointment, updateAppointmentStatus } from '../services/appointmentService';
import { sendAppointmentConfirmationEmail } from '../services/emailService';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { addDeferredMedicalReport } from '../services/medicalReportQueue';
import AppointmentForm from '../components/AppointmentForm';
import Layout from '../components/Layout';
import '../styles/AppointmentsModern.css';

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const errorRef = useRef(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTo(0, 0);
    document.getElementById('main-content')?.scrollTo(0, 0);
  }, []);
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
  const [listTab, setListTab] = useState('upcoming');
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDayAppointments, setSelectedDayAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [apptDetailModal, setApptDetailModal] = useState(null);
  const [pendingViewDate, setPendingViewDate] = useState(null);
  const [pendingViewApptId, setPendingViewApptId] = useState(null);
  const [pendingOpenDayModal, setPendingOpenDayModal] = useState(null);
  const [showDeleteApptModal, setShowDeleteApptModal] = useState(false);
  const [pendingDeleteApptId, setPendingDeleteApptId] = useState(null);
  const [cancelApptModal, setCancelApptModal] = useState({ open: false, appointmentId: null, closeDetailModal: false, reason: '' });
  const [emailApptModal, setEmailApptModal] = useState(false);
  const [emailApptNote, setEmailApptNote] = useState('');
  const [emailApptSending, setEmailApptSending] = useState(false);
  const [pendingEmailApptId, setPendingEmailApptId] = useState(null);
  const [highlightedApptId, setHighlightedApptId] = useState(null);
  const [medicalReportPrompt, setMedicalReportPrompt] = useState({ open: false, appointmentData: null });
  
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const canCreateBilling = user?.role === 'admin' || user?.role === 'receptionist';
  const canStartAppointment = (appointment) =>
    user?.role === 'admin' || user?.role === 'receptionist' ||
    (user?.role === 'veterinarian' && appointment.veterinarian_id === user.user_id);

  const openEmailApptModal = (appointmentId) => {
    setPendingEmailApptId(appointmentId);
    setEmailApptNote('');
    setEmailApptModal(true);
  };

  const openMedicalReportPrompt = (appointmentData) => {
    setMedicalReportPrompt({ open: true, appointmentData });
  };

  const closeMedicalReportPrompt = () => {
    setMedicalReportPrompt({ open: false, appointmentData: null });
  };

  const buildMedicalReportAppointmentData = (appointmentData) => ({
    appointment_id: appointmentData.appointment_id,
    pet_id: appointmentData.pet_id,
    veterinarian_id: appointmentData.veterinarian_id,
    appointment_date: appointmentData.appointment_date,
    appointment_time: appointmentData.appointment_time,
    customer_id: appointmentData.customer_id,
    customer_first_name: appointmentData.customer_first_name,
    customer_last_name: appointmentData.customer_last_name,
    pet_name: appointmentData.pet_name,
    species: appointmentData.species,
    veterinarian_name: appointmentData.veterinarian_name,
    reason: appointmentData.reason
  });

  const handleSendConfirmation = async () => {
    setEmailApptSending(true);
    try {
      const res = await sendAppointmentConfirmationEmail(pendingEmailApptId, emailApptNote);
      showSuccess(res.message || 'Confirmation email sent successfully');
      setEmailApptModal(false);
      setEmailApptNote('');
      setPendingEmailApptId(null);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to send confirmation email');
    } finally {
      setEmailApptSending(false);
    }
  };

  const formatActualDuration = (startedAt, completedAt) => {
    if (!startedAt || !completedAt) return null;
    const diffMs = new Date(completedAt) - new Date(startedAt);
    if (diffMs <= 0) return null;
    const totalMinutes = Math.round(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  };

  const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getISTDate = (dateString) => {
    if (!dateString) return '';
    return dateString.split('T')[0];
  };

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    if (viewMode === 'calendar' && filterDate) {
      const selectedDate = new Date(filterDate + 'T00:00:00');
      setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
  }, [filterDate, viewMode]);

  useEffect(() => {
    if (location.state?.editAppointmentId) {
      setEditingId(location.state.editAppointmentId);
      setShowForm(true);
      window.history.replaceState({}, document.title);
    } else if (location.state?.highlightAppointmentId) {
      const apptId = location.state.highlightAppointmentId;
      const apptDate = location.state.appointmentDate ? location.state.appointmentDate.split('T')[0] : '';
      const apptStatus = location.state.appointmentStatus || '';
      const todayStr = formatDateLocal(new Date());
      setViewMode('list');
      setListTab(apptDate && apptDate < todayStr || apptStatus === 'completed' || apptStatus === 'cancelled' ? 'past' : 'upcoming');
      setHighlightedApptId(apptId);
      window.history.replaceState({}, document.title);
    } else if (location.state?.openListTab) {
      setViewMode('list');
      setListTab(location.state.openListTab);
      window.history.replaceState({}, document.title);
    } else if (location.state?.viewDate) {
      const dateStr = location.state.viewDate.split('T')[0];
      const aptDate = new Date(dateStr + 'T00:00:00');
      setCurrentMonth(new Date(aptDate.getFullYear(), aptDate.getMonth(), 1));
      setPendingViewDate(dateStr);
      if (location.state?.viewAppointmentId) {
        setPendingViewApptId(location.state.viewAppointmentId);
      }
      if (location.state?.openDayModal) {
        setPendingOpenDayModal(dateStr);
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (!pendingViewDate || appointments.length === 0) return;
    if (pendingViewApptId) {
      const specific = appointments.find(a => a.appointment_id === pendingViewApptId);
      if (specific) setApptDetailModal(specific);
    }
    setPendingViewDate(null);
    setPendingViewApptId(null);
  }, [appointments, pendingViewDate, pendingViewApptId]);

  useEffect(() => {
    if (!pendingOpenDayModal || appointments.length === 0) return;
    const dateStr = pendingOpenDayModal;
    const dayAppts = appointments.filter(a => a.appointment_date?.split('T')[0] === dateStr);
    setSelectedDate(dateStr);
    setSelectedDayAppointments(dayAppts);
    setShowDayModal(true);
    setPendingOpenDayModal(null);
  }, [appointments, pendingOpenDayModal]);

  useEffect(() => {
    if (!highlightedApptId || viewMode !== 'list') return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`appt-card-${highlightedApptId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
    const clearTimer = setTimeout(() => setHighlightedApptId(null), 3500);
    return () => { clearTimeout(timer); clearTimeout(clearTimer); };
  }, [highlightedApptId, viewMode, appointments]);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const filters = {};
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
  }, [filterStatus]);

  const handleDelete = (id) => {
    setPendingDeleteApptId(id);
    setShowDeleteApptModal(true);
  };

  const confirmDeleteAppointment = async () => {
    try {
      await deleteAppointment(pendingDeleteApptId);
      setShowDeleteApptModal(false);
      setPendingDeleteApptId(null);
      fetchAppointments();
    } catch (err) {
      alert('Failed to delete appointment');
      console.error(err);
    }
  };

  const confirmCancelAppointment = async () => {
    if (!cancelApptModal.reason) return;
    await handleStatusUpdate(cancelApptModal.appointmentId, 'cancelled', cancelApptModal.reason);
    if (cancelApptModal.closeDetailModal) setApptDetailModal(null);
    setCancelApptModal({ open: false, appointmentId: null, closeDetailModal: false, reason: '' });
  };

  const handleStatusUpdate = async (id, newStatus, cancellationReason = null, appointmentData = null) => {
    try {
      await updateAppointmentStatus(id, newStatus, cancellationReason);
      fetchAppointments();
      if (newStatus === 'completed' && appointmentData) {
        showSuccess('Appointment completed successfully');
        if (canCreateBilling) {
          navigate('/billing/new', { state: { appointmentData } });
          return;
        }

        if (user?.role === 'veterinarian') {
          openMedicalReportPrompt(buildMedicalReportAppointmentData(appointmentData));
          return;
        }
      } else {
        showSuccess(newStatus === 'completed' ? 'Appointment completed successfully' : `Appointment ${newStatus.replace('_', ' ')}`);
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update appointment status');
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

  const handleMedicalReportChoice = (choice) => {
    const appointmentData = medicalReportPrompt.appointmentData;
    if (!appointmentData) {
      closeMedicalReportPrompt();
      return;
    }

    if (choice === 'later') {
      addDeferredMedicalReport(appointmentData.appointment_id);
      showSuccess('Medical report saved for later');
    }

    if (choice === 'now') {
      closeMedicalReportPrompt();
      navigate('/dashboard', {
        state: {
          openMedicalReportNow: true,
          appointmentData
        }
      });
      return;
    }

    navigate('/dashboard');
    closeMedicalReportPrompt();
  };

  const filteredAppointments = appointments.filter(appointment => {
    try {
      const matchesSearch = !searchQuery || 
        appointment.pet_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appointment.customer_first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appointment.customer_last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appointment.veterinarian_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
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

  useEffect(() => {
    const filtersChanged = searchQuery !== lastSearchQuery || 
                          filterStatus !== lastFilterStatus || 
                          selectedVet !== lastSelectedVet;
    
    if (viewMode === 'calendar' && filtersChanged) {
      setLastSearchQuery(searchQuery);
      setLastFilterStatus(filterStatus);
      setLastSelectedVet(selectedVet);

      if (filteredAppointments.length > 0) {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonthIdx = today.getMonth();
        const todayStr = formatDateLocal(today);

        const currentMonthAppts = filteredAppointments.filter(apt => {
          const aptDateStr = getISTDate(apt.appointment_date);
          if (!aptDateStr) return false;
          const aptDate = new Date(aptDateStr + 'T00:00:00');
          return aptDate.getFullYear() === currentYear && aptDate.getMonth() === currentMonthIdx;
        });

        if (currentMonthAppts.length > 0) {
          setCurrentMonth(new Date(currentYear, currentMonthIdx, 1));
        } else {
          const futureAppts = filteredAppointments
            .filter(apt => {
              const aptDateStr = getISTDate(apt.appointment_date);
              return aptDateStr && aptDateStr >= todayStr;
            })
            .sort((a, b) => getISTDate(a.appointment_date).localeCompare(getISTDate(b.appointment_date)));

          if (futureAppts.length > 0) {
            const nextAptStr = getISTDate(futureAppts[0].appointment_date);
            const nextAptDate = new Date(nextAptStr + 'T00:00:00');
            setCurrentMonth(new Date(nextAptDate.getFullYear(), nextAptDate.getMonth(), 1));
          } else {
            const pastAppts = [...filteredAppointments].sort((a, b) =>
              getISTDate(b.appointment_date).localeCompare(getISTDate(a.appointment_date))
            );
            const pastAptStr = getISTDate(pastAppts[0].appointment_date);
            const pastAptDate = new Date(pastAptStr + 'T00:00:00');
            setCurrentMonth(new Date(pastAptDate.getFullYear(), pastAptDate.getMonth(), 1));
          }
        }
      }
    }
  }, [viewMode, searchQuery, filterStatus, selectedVet, filteredAppointments, lastFilterStatus, lastSearchQuery, lastSelectedVet]);

  const getCalendarDays = () => {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - (firstDay.getDay() + 6) % 7);

      const lastDay = new Date(year, month + 1, 0);
      const endDate = new Date(lastDay);
      const remainingDaysInWeek = (7 - ((lastDay.getDay() + 6) % 7 + 1)) % 7;
      endDate.setDate(endDate.getDate() + remainingDaysInWeek);

      const diffMs = endDate.getTime() - startDate.getTime();
      const totalDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
      
      const days = [];
      const current = new Date(startDate);
      
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
      
      for (let i = 0; i < totalDays; i++) {
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
          appointments: dayAppointments.sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))
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
    setFilterDate('');
  };

  const handleDayClick = (dateStr, dayAppointments) => {
    setSelectedDate(dateStr);
    setSelectedDayAppointments(dayAppointments);
    setShowDayModal(true);
  };

  const handleCloseDayModal = () => {
    setShowDayModal(false);
    setSelectedDayAppointments([]);
    setSelectedDate('');
  };

  const handleAppointmentClick = (appointment) => {
    setShowDayModal(false);
    setApptDetailModal(appointment);
  };

  const getStatusColor = (status) => {
    const colors = {
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

  const today = formatDateLocal(new Date());
  const upcomingAppointments = filteredAppointments
    .filter(a => getISTDate(a.appointment_date) >= today && a.status !== 'completed' && a.status !== 'cancelled')
    .sort((a, b) => {
      const d = new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime();
      return d !== 0 ? d : a.appointment_time.localeCompare(b.appointment_time);
    });
  const pastAppointments = filteredAppointments
    .filter(a => getISTDate(a.appointment_date) < today || a.status === 'completed' || a.status === 'cancelled')
    .sort((a, b) => {
      const d = new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime();
      return d !== 0 ? d : b.appointment_time.localeCompare(a.appointment_time);
    });
  const tabAppointments = listTab === 'upcoming' ? upcomingAppointments : pastAppointments;

  return (
    <Layout>
      <div className="appts-container">
        {/* Page Header Card */}
        <div className="appts-header-card">
          <div className="appts-header-content">
            <div className="appts-header-icon">
              <i className="fas fa-calendar-alt"></i>
            </div>
            <div>
              <h1 className="appts-header-title">Appointments</h1>
              <p className="appts-header-subtitle">Manage clinic appointments and schedules</p>
            </div>
          </div>
          <button 
            onClick={() => setShowForm(true)}
            className="appts-btn-schedule"
          >
            <i className="fas fa-plus"></i>
            Schedule Appointment
          </button>
        </div>

        {/* Toolbar Card */}
        <div className="appts-toolbar-card">
          <div className="appts-search-box">
            <i className="fas fa-search appts-search-icon"></i>
            <input
              type="text"
              placeholder="Search appointments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="appts-search-input"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="appts-select"
          >
            <option value="">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="appts-date-input"
              placeholder="Filter by date"
            />
            {viewMode === 'list' && (
              <button
                onClick={() => setFilterDate(formatDateLocal(new Date()))}
                className="appts-btn-today-pill"
                title="Filter today's appointments"
              >
                <i className="fas fa-calendar-day"></i>
                Today
              </button>
            )}
          </div>

          {user?.role === 'veterinarian' && (
            <button
              onClick={() => setSelectedVet(selectedVet ? '' : String(user.user_id))}
              className={`appts-btn-my-appts ${selectedVet ? 'is-active' : 'is-inactive'}`}
              title="Show only appointments assigned to you"
            >
              <i className="fas fa-user-md"></i>
              My Appointments
            </button>
          )}

          <div className="appts-view-toggle-group">
            <button
              onClick={() => setViewMode('calendar')}
              className={`appts-view-toggle-btn ${viewMode === 'calendar' ? 'is-active' : ''}`}
            >
              <i className="far fa-calendar"></i>
              Calendar
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`appts-view-toggle-btn ${viewMode === 'list' ? 'is-active' : ''}`}
            >
              <i className="fas fa-list"></i>
              List
            </button>
          </div>
        </div>

        {/* Active Filters Bar */}
        {(filterStatus || searchQuery || filterDate || selectedVet) && (
          <div className="appts-active-filters-bar">
            <span className="appts-filter-label">Active filters:</span>
            {selectedVet && (
              <span className="appts-filter-pill">
                My Appointments
                <button onClick={() => setSelectedVet('')} className="appts-filter-pill-close">
                  <i className="fas fa-times"></i>
                </button>
              </span>
            )}
            {filterStatus && (
              <span className="appts-filter-pill">
                Status: {filterStatus}
                <button onClick={() => setFilterStatus('')} className="appts-filter-pill-close">
                  <i className="fas fa-times"></i>
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="appts-filter-pill">
                Search: "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="appts-filter-pill-close">
                  <i className="fas fa-times"></i>
                </button>
              </span>
            )}
            {filterDate && (
              <span className="appts-filter-pill">
                Date: {filterDate}
                <button onClick={() => setFilterDate('')} className="appts-filter-pill-close">
                  <i className="fas fa-times"></i>
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setFilterStatus('');
                setSearchQuery('');
                setFilterDate('');
                setSelectedVet('');
              }}
              className="appts-clear-all-link"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div ref={errorRef} className="appts-alert-error">
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="appts-loading-box">
            <div className="appts-spinner"></div>
            <p>Loading appointments...</p>
          </div>
        ) : (
          <>
            {viewMode === 'calendar' ? (
              /* Calendar View */
              <div className="appts-calendar-card">
                <div className="appts-cal-header">
                  <h3 className="appts-cal-title">{formatMonthYear()}</h3>
                  <div className="appts-cal-controls">
                    <button onClick={goToToday} className="appts-cal-btn-today">
                      <i className="fas fa-calendar-day"></i>
                      Today
                    </button>
                    <button onClick={() => navigateMonth(-1)} className="appts-cal-btn-nav">
                      <i className="fas fa-chevron-left"></i>
                    </button>
                    <button onClick={() => navigateMonth(1)} className="appts-cal-btn-nav">
                      <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                </div>

                {!filterDate && (
                  <div className="appts-cal-banner">
                    <i className="fas fa-info-circle"></i>
                    Click on a day with appointments to view all scheduled visits for that date.
                  </div>
                )}
                
                {filterDate && (
                  <div className="appts-cal-banner">
                    <i className="fas fa-filter"></i>
                    Showing appointments for {new Date(filterDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
                    <button 
                      onClick={() => setFilterDate('')}
                      style={{ marginLeft: '0.5rem', color: '#2563eb', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Clear filter
                    </button>
                  </div>
                )}

                <div className="appts-cal-grid">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="appts-cal-day-header">{day}</div>
                  ))}

                  {getCalendarDays().map((day, index) => (
                    <div
                      key={index}
                      className={`appts-cal-day-cell ${!day.isCurrentMonth ? 'is-other-month' : ''} ${day.isToday ? 'is-today' : ''} ${day.isSelectedDate ? 'is-selected' : ''}`}
                      onClick={() => handleDayClick(day.dateStr, day.appointments)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="appts-cal-day-num">
                        <span className={day.isToday ? 'is-today-num' : ''}>{day.date.getDate()}</span>
                        {day.appointments.length > 0 && (
                          <span style={{ fontSize: '0.675rem', color: '#2563eb', fontWeight: 'bold' }}>
                            ({day.appointments.length})
                          </span>
                        )}
                      </div>
                      <div className="appts-cal-events-list">
                        {day.appointments.slice(0, 3).map(apt => (
                          <div
                            key={apt.appointment_id}
                            className="appts-cal-event-card"
                            style={{ borderLeftColor: getStatusBorderColor(apt.status) }}
                          >
                            <div className="appts-cal-event-time">
                              {formatTime(apt.appointment_time)}
                            </div>
                            <div className="appts-cal-event-title">
                              {apt.pet_name}
                            </div>
                            <div className="appts-cal-event-sub">
                              {apt.customer_first_name} {apt.customer_last_name}
                            </div>
                            {apt.veterinarian_name && (
                              <div className="appts-cal-event-vet">
                                <i className="fas fa-user-md" style={{ marginRight: '3px' }}></i>
                                Dr. {apt.veterinarian_name}
                              </div>
                            )}
                          </div>
                        ))}
                        {day.appointments.length > 3 && (
                          <div className="appts-cal-more-badge">
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
                <div className="appts-list-tabs">
                  {[
                    { key: 'upcoming', label: 'Upcoming', count: upcomingAppointments.length, icon: 'fa-calendar-alt' },
                    { key: 'past',     label: 'Past',     count: pastAppointments.length,     icon: 'fa-calendar-check' }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setListTab(tab.key)}
                      className={`appts-tab-btn ${listTab === tab.key ? 'is-active' : ''}`}
                    >
                      <i className={`fas ${tab.icon}`}></i>
                      {tab.label}
                      <span className="appts-tab-count-badge">{tab.count}</span>
                    </button>
                  ))}
                </div>

                <div className="appts-appointments-list">
                  {tabAppointments.length === 0 ? (
                    <div className="appts-empty-card">
                      <i className="far fa-calendar-times" style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '1rem' }}></i>
                      <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#475569', margin: '0 0 1rem 0' }}>No {listTab} appointments found</p>
                      {listTab === 'upcoming' && (
                        <button onClick={() => setShowForm(true)} className="appts-btn-schedule">
                          <i className="fas fa-plus"></i> Schedule an Appointment
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="appts-cards-grid">
                      {tabAppointments.map((appointment) => (
                        <div
                          key={appointment.appointment_id}
                          id={`appt-card-${appointment.appointment_id}`}
                          className={`appts-card ${highlightedApptId === appointment.appointment_id ? 'is-highlighted' : ''}`}
                        >
                          <div className="appts-card-head">
                            <div className="appts-card-head-left">
                              <div className="appts-type-icon-tile">
                                <i className={`fas ${getTypeIcon(appointment.appointment_type)}`}></i>
                              </div>
                              <div>
                                <h3 className="appts-card-pet-name">
                                  {appointment.pet_name}
                                  {appointment.species && (
                                    <span className="appts-card-species">
                                      {' '} ({appointment.species.charAt(0).toUpperCase() + appointment.species.slice(1)})
                                    </span>
                                  )}
                                </h3>
                                <p className="appts-card-owner-name">
                                  {appointment.customer_first_name} {appointment.customer_last_name}
                                </p>
                              </div>
                            </div>
                            <span 
                              className="appts-status-pill"
                              style={{
                                backgroundColor: `${getStatusColor(appointment.status)}1b`,
                                color: getStatusColor(appointment.status),
                                border: `1px solid ${getStatusColor(appointment.status)}40`
                              }}
                            >
                              {appointment.status.replace('_', ' ')}
                            </span>
                          </div>

                          <div className="appts-card-body">
                            <div className="appts-info-row">
                              <span className="appts-info-lbl"><i className="far fa-calendar"></i> Date:</span>
                              <span className="appts-info-val">{formatDate(appointment.appointment_date)}</span>
                            </div>
                            <div className="appts-info-row">
                              <span className="appts-info-lbl"><i className="far fa-clock"></i> Time:</span>
                              <span className="appts-info-val">{formatTime(appointment.appointment_time)}</span>
                            </div>
                            <div className="appts-info-row">
                              <span className="appts-info-lbl"><i className="fas fa-hourglass-half"></i> {appointment.status === 'completed' ? 'Scheduled:' : 'Duration:'}</span>
                              <span className="appts-info-val">{appointment.duration_minutes} min</span>
                            </div>
                            {appointment.status === 'completed' && appointment.started_at && appointment.completed_at && (
                              <div className="appts-info-row">
                                <span className="appts-info-lbl"><i className="fas fa-stopwatch"></i> Actual:</span>
                                <span className="appts-info-val" style={{ color: '#059669', fontWeight: 700 }}>{formatActualDuration(appointment.started_at, appointment.completed_at)}</span>
                              </div>
                            )}
                            <div className="appts-info-row">
                              <span className="appts-info-lbl"><i className="fas fa-clipboard"></i> Type:</span>
                              <span className="appts-info-val">{appointment.appointment_type}</span>
                            </div>
                            {appointment.veterinarian_name && (
                              <div className="appts-info-row">
                                <span className="appts-info-lbl"><i className="fas fa-user-md"></i> Vet:</span>
                                <span className="appts-info-val">Dr. {appointment.veterinarian_name}</span>
                              </div>
                            )}
                            <div className="appts-reason-box">
                              <strong>Reason:</strong> {appointment.reason}
                            </div>
                          </div>

                          <div className="appts-card-foot">
                            {canStartAppointment(appointment) && appointment.status === 'confirmed' && (
                              <button onClick={() => {
                                if (!appointment.veterinarian_id) {
                                  showError('Cannot start appointment — no veterinarian assigned. Please assign a vet first.');
                                  return;
                                }
                                handleStatusUpdate(appointment.appointment_id, 'in_progress');
                              }} className="appts-btn-act btn-act-start">
                                <i className="fas fa-play"></i> Start
                              </button>
                            )}
                            {appointment.status === 'in_progress' && (
                              <button onClick={() => handleStatusUpdate(appointment.appointment_id, 'completed', null, {
                                appointment_id: appointment.appointment_id,
                                customer_id: appointment.customer_id,
                                customer_first_name: appointment.customer_first_name,
                                customer_last_name: appointment.customer_last_name,
                                pet_name: appointment.pet_name,
                                species: appointment.species,
                                appointment_type: appointment.appointment_type,
                                appointment_date: appointment.appointment_date,
                                veterinarian_name: appointment.veterinarian_name
                              })} className="appts-btn-act btn-act-complete">
                                <i className="fas fa-check-double"></i> Complete
                              </button>
                            )}
                            {user?.role !== 'veterinarian' && appointment.status === 'confirmed' && (
                              <button
                                onClick={() => setCancelApptModal({ open: true, appointmentId: appointment.appointment_id, closeDetailModal: false })}
                                className="appts-btn-act btn-act-cancel"
                              >
                                <i className="fas fa-times"></i> Cancel
                              </button>
                            )}
                            {appointment.status === 'confirmed' && (
                              <button onClick={() => openEmailApptModal(appointment.appointment_id)} className="appts-btn-act btn-act-email">
                                <i className="fas fa-envelope"></i> Email
                              </button>
                            )}
                            {user?.role !== 'veterinarian' && (
                              <>
                                {appointment.status === 'confirmed' && (
                                  <button onClick={() => handleEdit(appointment.appointment_id)} className="appts-btn-act btn-act-edit">
                                    <i className="fas fa-edit"></i> Edit
                                  </button>
                                )}
                              </>
                            )}
                            {user?.role === 'admin' && (
                              <button onClick={() => handleDelete(appointment.appointment_id)} className="appts-btn-act btn-act-delete">
                                <i className="fas fa-trash"></i> Delete
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

        {/* Appointment Detail Modal (calendar click) */}
        {apptDetailModal && (
          <div className="appts-modal-backdrop" onClick={() => setApptDetailModal(null)}>
            <div className="appts-modal-box" onClick={e => e.stopPropagation()}>
              <div className="appts-modal-head">
                <h3 className="appts-modal-title">
                  <i className={`fas ${getTypeIcon(apptDetailModal.appointment_type)}`} style={{ color: '#3b82f6' }}></i>
                  Appointment Details
                </h3>
                <button onClick={() => setApptDetailModal(null)} className="appts-modal-close">
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="appts-modal-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span className="appts-status-pill" style={{ backgroundColor: `${getStatusColor(apptDetailModal.status)}1b`, color: getStatusColor(apptDetailModal.status), fontSize: '0.825rem', padding: '0.35rem 0.8rem', border: `1px solid ${getStatusColor(apptDetailModal.status)}40` }}>
                    {apptDetailModal.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{apptDetailModal.appointment_type}</span>
                </div>
                {[
                  { icon: 'fa-paw', label: 'Pet', value: apptDetailModal.species ? `${apptDetailModal.pet_name} (${apptDetailModal.species.charAt(0).toUpperCase() + apptDetailModal.species.slice(1)})` : apptDetailModal.pet_name },
                  { icon: 'fa-user', label: 'Owner', value: `${apptDetailModal.customer_first_name} ${apptDetailModal.customer_last_name}` },
                  apptDetailModal.veterinarian_name ? { icon: 'fa-user-md', label: 'Veterinarian', value: `Dr. ${apptDetailModal.veterinarian_name}` } : null,
                  { icon: 'fa-calendar', label: 'Date', value: formatDate(apptDetailModal.appointment_date) },
                  { icon: 'fa-clock', label: 'Time', value: formatTime(apptDetailModal.appointment_time) },
                  { icon: 'fa-hourglass-half', label: apptDetailModal.status === 'completed' ? 'Scheduled' : 'Duration', value: `${apptDetailModal.duration_minutes} min` },
                  apptDetailModal.status === 'completed' && apptDetailModal.started_at && apptDetailModal.completed_at
                    ? { icon: 'fa-stopwatch', label: 'Actual', value: formatActualDuration(apptDetailModal.started_at, apptDetailModal.completed_at), highlight: true }
                    : null,
                ].filter(Boolean).map((row, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
                    <i className={`fas ${row.icon}`} style={{ width: '16px', color: '#94a3b8', fontSize: '0.8rem' }}></i>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', minWidth: '90px', fontWeight: 500 }}>{row.label}</span>
                    <span style={{ fontSize: '0.875rem', color: row.highlight ? '#059669' : '#0f172a', fontWeight: row.highlight ? 700 : 600 }}>{row.value}</span>
                  </div>
                ))}
                <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', backgroundColor: '#f8fafc', borderRadius: '10px', fontSize: '0.875rem', color: '#334155', border: '1px solid #e2e8f0' }}>
                  <strong>Reason:</strong> {apptDetailModal.reason}
                </div>
                {apptDetailModal.status === 'cancelled' && apptDetailModal.cancellation_reason && (
                  <div style={{ marginTop: '0.5rem', padding: '0.75rem 1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', fontSize: '0.875rem', color: '#991b1b' }}>
                    <strong>Cancellation Reason:</strong> {apptDetailModal.cancellation_reason}
                  </div>
                )}
                {(apptDetailModal.created_at || apptDetailModal.updated_at) && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                    {apptDetailModal.created_at && (
                      <span><strong>Created:</strong> {formatDate(apptDetailModal.created_at)}</span>
                    )}
                    {apptDetailModal.updated_at && apptDetailModal.updated_at !== apptDetailModal.created_at && (
                      <span><strong>Updated:</strong> {formatDate(apptDetailModal.updated_at)}</span>
                    )}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                  {canStartAppointment(apptDetailModal) && apptDetailModal.status === 'confirmed' && (
                    <button
                      onClick={() => {
                        if (!apptDetailModal.veterinarian_id) {
                          showError('Cannot start appointment — no veterinarian assigned. Please assign a vet first.');
                          return;
                        }
                        handleStatusUpdate(apptDetailModal.appointment_id, 'in_progress');
                        setApptDetailModal(null);
                      }}
                      className="appts-btn-act btn-act-start"
                    >
                      <i className="fas fa-play"></i> Start
                    </button>
                  )}
                  {apptDetailModal.status === 'in_progress' && (
                    <button
                      onClick={() => { handleStatusUpdate(apptDetailModal.appointment_id, 'completed', null, {
                        appointment_id: apptDetailModal.appointment_id,
                        customer_id: apptDetailModal.customer_id,
                        customer_first_name: apptDetailModal.customer_first_name,
                        customer_last_name: apptDetailModal.customer_last_name,
                        pet_name: apptDetailModal.pet_name,
                        species: apptDetailModal.species,
                        appointment_type: apptDetailModal.appointment_type,
                        appointment_date: apptDetailModal.appointment_date,
                        veterinarian_name: apptDetailModal.veterinarian_name
                      }); setApptDetailModal(null); }}
                      className="appts-btn-act btn-act-complete"
                    >
                      <i className="fas fa-check-double"></i> Complete
                    </button>
                  )}
                  {user?.role !== 'veterinarian' && apptDetailModal.status === 'confirmed' && (
                    <button
                      onClick={() => setCancelApptModal({ open: true, appointmentId: apptDetailModal.appointment_id, closeDetailModal: true })}
                      className="appts-btn-act btn-act-cancel"
                    >
                      <i className="fas fa-times"></i> Cancel
                    </button>
                  )}
                  {user?.role !== 'veterinarian' && apptDetailModal.status === 'confirmed' && (
                    <button
                      onClick={() => { setApptDetailModal(null); setShowDayModal(false); handleEdit(apptDetailModal.appointment_id); }}
                      className="appts-btn-act btn-act-edit"
                    >
                      <i className="fas fa-edit"></i> Edit
                    </button>
                  )}
                  {apptDetailModal.status === 'confirmed' && (
                    <button
                      onClick={() => { setApptDetailModal(null); openEmailApptModal(apptDetailModal.appointment_id); }}
                      className="appts-btn-act btn-act-email"
                    >
                      <i className="fas fa-envelope"></i> Email
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const apptDate = getISTDate(apptDetailModal.appointment_date);
                      const todayStr = formatDateLocal(new Date());
                      setListTab(apptDate >= todayStr && apptDetailModal.status !== 'completed' && apptDetailModal.status !== 'cancelled' ? 'upcoming' : 'past');
                      setHighlightedApptId(apptDetailModal.appointment_id);
                      setApptDetailModal(null);
                      setShowDayModal(false);
                      setViewMode('list');
                    }}
                    className="appts-btn-act"
                    style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}
                  >
                    <i className="fas fa-list"></i> View in List
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Day Appointments Modal */}
        {showDayModal && (
          <div className="appts-modal-backdrop" onClick={handleCloseDayModal}>
            <div className="appts-modal-box" onClick={(e) => e.stopPropagation()}>
              <div className="appts-modal-head">
                <h3 className="appts-modal-title">
                  <i className="far fa-calendar-alt" style={{ color: '#2563eb' }}></i>
                  Appointments for {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h3>
                <button onClick={handleCloseDayModal} className="appts-modal-close">
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="appts-modal-body">
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <i className="fas fa-list-ul"></i>
                  {selectedDayAppointments.length} appointment{selectedDayAppointments.length !== 1 ? 's' : ''}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedDayAppointments
                    .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))
                    .map((appointment) => (
                    <div 
                      key={appointment.appointment_id} 
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '0.875rem 1rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => handleAppointmentClick(appointment)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <i className="far fa-clock"></i>
                          {formatTime(appointment.appointment_time)}
                        </div>
                        <span 
                          className="appts-status-pill"
                          style={{
                            backgroundColor: `${getStatusColor(appointment.status)}1b`,
                            color: getStatusColor(appointment.status),
                            fontSize: '0.7rem',
                            padding: '0.2rem 0.55rem'
                          }}
                        >
                          {appointment.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#1e293b' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>
                          <i className={`fas ${getTypeIcon(appointment.appointment_type)}`} style={{ marginRight: '0.4rem', color: '#2563eb' }}></i>
                          {appointment.pet_name}{appointment.species && <span style={{ color: '#64748b', fontWeight: '400' }}> ({appointment.species.charAt(0).toUpperCase() + appointment.species.slice(1)})</span>}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          <i className="fas fa-user" style={{ marginRight: '0.4rem' }}></i>
                          {appointment.customer_first_name} {appointment.customer_last_name}
                        </div>
                        {appointment.veterinarian_name && (
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            <i className="fas fa-user-md" style={{ marginRight: '0.4rem' }}></i>
                            Dr. {appointment.veterinarian_name}
                          </div>
                        )}
                        <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '4px' }}>
                          <i className="fas fa-notes-medical" style={{ marginRight: '0.4rem' }}></i>
                          {appointment.reason}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Appointment Modal */}
        {showDeleteApptModal && (
          <div className="appts-modal-backdrop" onClick={() => { setShowDeleteApptModal(false); setPendingDeleteApptId(null); }}>
            <div className="appts-modal-box" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
              <div className="appts-modal-head">
                <h3 className="appts-modal-title">
                  <i className="fas fa-trash" style={{ color: '#e11d48' }}></i>
                  Delete Appointment
                </h3>
                <button onClick={() => { setShowDeleteApptModal(false); setPendingDeleteApptId(null); }} className="appts-modal-close">
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="appts-modal-body">
                <p style={{ margin: '0 0 1.5rem', color: '#475569', fontSize: '0.925rem' }}>
                  Are you sure you want to delete this appointment?
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => { setShowDeleteApptModal(false); setPendingDeleteApptId(null); }}
                    style={{ padding: '0.5rem 1.1rem', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteAppointment}
                    style={{ padding: '0.5rem 1.1rem', borderRadius: '10px', border: 'none', backgroundColor: '#e11d48', color: '#fff', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <i className="fas fa-trash"></i>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Appointment Reason Modal */}
        {cancelApptModal.open && (
          <div className="appts-modal-backdrop" onClick={() => setCancelApptModal({ open: false, appointmentId: null, closeDetailModal: false, reason: '' })}>
            <div className="appts-modal-box" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
              <div className="appts-modal-head">
                <h3 className="appts-modal-title">
                  <i className="fas fa-times-circle" style={{ color: '#e11d48' }}></i>
                  Cancel Appointment
                </h3>
                <button onClick={() => setCancelApptModal({ open: false, appointmentId: null, closeDetailModal: false, reason: '' })} className="appts-modal-close">
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="appts-modal-body">
                <p style={{ margin: '0 0 1rem', color: '#475569', fontSize: '0.925rem' }}>
                  Are you sure you want to cancel this appointment? Please select a reason.
                </p>
                <select
                  value={cancelApptModal.reason}
                  onChange={e => setCancelApptModal(prev => ({ ...prev, reason: e.target.value }))}
                  className="appts-select"
                  style={{ width: '100%', marginBottom: '1.25rem' }}
                >
                  <option value="">— Select a reason —</option>
                  <option value="Customer request">Customer request</option>
                  <option value="Veterinarian unavailable">Veterinarian unavailable</option>
                  <option value="Pet health improvement">Pet health improvement (no longer needed)</option>
                  <option value="Financial constraints">Financial constraints</option>
                  <option value="No show">No show</option>
                  <option value="Other">Other</option>
                </select>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setCancelApptModal({ open: false, appointmentId: null, closeDetailModal: false, reason: '' })}
                    style={{ padding: '0.5rem 1.1rem', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}
                  >
                    Keep
                  </button>
                  <button
                    onClick={confirmCancelAppointment}
                    disabled={!cancelApptModal.reason}
                    style={{ padding: '0.5rem 1.1rem', borderRadius: '10px', border: 'none', backgroundColor: cancelApptModal.reason ? '#e11d48' : '#cbd5e1', color: '#fff', fontWeight: '600', fontSize: '0.875rem', cursor: cancelApptModal.reason ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <i className="fas fa-times"></i>
                    Cancel Appointment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Email Confirmation Modal */}
        {emailApptModal && (
          <div className="appts-modal-backdrop" onClick={() => { setEmailApptModal(false); setEmailApptNote(''); setPendingEmailApptId(null); }}>
            <div className="appts-modal-box" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
              <div className="appts-modal-head">
                <h3 className="appts-modal-title">
                  <i className="fas fa-envelope" style={{ color: '#059669' }}></i>
                  Send Confirmation Email
                </h3>
                <button onClick={() => { setEmailApptModal(false); setEmailApptNote(''); setPendingEmailApptId(null); }} className="appts-modal-close">
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="appts-modal-body">
                <p style={{ margin: '0 0 1rem', color: '#475569', fontSize: '0.925rem' }}>
                  Send a confirmation email to the customer for this appointment.
                </p>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '0.4rem' }}>
                    Note to Customer <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <textarea
                    value={emailApptNote}
                    onChange={(e) => setEmailApptNote(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.875rem', minHeight: '90px', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
                    placeholder="Add a note or message to include in the email..."
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => { setEmailApptModal(false); setEmailApptNote(''); setPendingEmailApptId(null); }}
                    style={{ padding: '0.5rem 1.1rem', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}
                    disabled={emailApptSending}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendConfirmation}
                    style={{ padding: '0.5rem 1.1rem', borderRadius: '10px', border: 'none', backgroundColor: '#059669', color: '#fff', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    disabled={emailApptSending}
                  >
                    <i className="fas fa-envelope"></i>
                    {emailApptSending ? 'Sending...' : 'Send Email'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Medical Report Prompt Modal */}
        {medicalReportPrompt.open && medicalReportPrompt.appointmentData && (
          <div className="appts-modal-backdrop" onClick={() => handleMedicalReportChoice('none')}>
            <div className="appts-modal-box" style={{ maxWidth: '460px' }} onClick={e => e.stopPropagation()}>
              <div className="appts-modal-head">
                <h3 className="appts-modal-title">
                  <i className="fas fa-notes-medical" style={{ color: '#2563eb' }}></i>
                  Create Medical Report?
                </h3>
                <button onClick={() => handleMedicalReportChoice('none')} className="appts-modal-close">
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="appts-modal-body">
                <p style={{ margin: 0, color: '#475569', fontSize: '0.925rem', lineHeight: 1.5 }}>
                  The appointment has been marked completed. Would you like to create a medical report now, save it for later, or skip it for now?
                </p>
                <div style={{ marginTop: '1rem', padding: '0.9rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.35rem' }}>Appointment</div>
                  <div style={{ fontWeight: '700', color: '#0f172a' }}>{medicalReportPrompt.appointmentData.pet_name}</div>
                  <div style={{ fontSize: '0.875rem', color: '#475569' }}>
                    {medicalReportPrompt.appointmentData.customer_first_name} {medicalReportPrompt.appointmentData.customer_last_name}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
                  <button
                    onClick={() => handleMedicalReportChoice('none')}
                    style={{ padding: '0.55rem 0.95rem', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    No medical report
                  </button>
                  <button
                    onClick={() => handleMedicalReportChoice('later')}
                    style={{ padding: '0.55rem 0.95rem', borderRadius: '10px', border: '1px solid #f59e0b', backgroundColor: '#fff7ed', color: '#b45309', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Create later
                  </button>
                  <button
                    onClick={() => handleMedicalReportChoice('now')}
                    style={{ padding: '0.55rem 0.95rem', borderRadius: '10px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Create now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Appointments;
