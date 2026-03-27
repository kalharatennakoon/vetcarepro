import { useState, useEffect } from 'react';
import UniversalSearch from '../components/UniversalSearch';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { getPets } from '../services/petService';
import { getCustomers } from '../services/customerService';
import { getMedicalRecords } from '../services/medicalRecordService';
import inventoryService from '../services/inventoryService';
import { getDiseaseCases } from '../services/diseaseCaseService';
import { updateAppointment } from '../services/appointmentService';
import Layout from '../components/Layout';
import PasswordChangeModal from '../components/PasswordChangeModal';

const Dashboard = () => {
  const { user, logout, refreshUser } = useAuth();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalPets: 0,
    activePets: 0,
    totalCustomers: 0,
    totalMedicalRecords: 0,
    todayAppointments: 0,
    todayCompleted: 0,
    todayCancelled: 0,
    todayScheduled: 0,
    todayOverdue: 0,
    todayUpcoming: 0,
    waitingPatients: 0,
    pendingInvoices: 0,
    lowStockItems: 0,
    followUpsCount: 0,
    recentAppointments: [],
    upcomingAppointments: [],
    followUpCases: [],
    vetWaiting: 0,
    vetCompleted: 0,
    vetUrgent: 0,
    vetScheduleToday: [],
    vetUpcoming: [],
    vetUnassignedToday: [],
    vetUnassignedUpcoming: []
  });
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [upcomingPreview, setUpcomingPreview] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [petsResponse, customersResponse, appointmentsResponse, medicalRecordsResponse, billingResponse, lowStockResponse, diseaseCasesResponse] = await Promise.all([
        getPets({}),
        getCustomers({}),
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/appointments`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        getMedicalRecords({ limit: 5 }),
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/billing`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).catch(() => ({ data: { bills: [] } })),
        inventoryService.getLowStockItems().catch(() => ({ data: [] })),
        getDiseaseCases({ limit: 50 }).catch(() => ({ data: { cases: [] } }))
      ]);

      const pets = petsResponse.data.pets || [];
      const customers = customersResponse.data.customers || [];
      const appointments = appointmentsResponse.data.data.appointments || [];
      const bills = billingResponse.data.data?.bills || billingResponse.data.bills || [];
      const lowStockItems = lowStockResponse.data.data || lowStockResponse.data || [];
      const allDiseaseCases = diseaseCasesResponse.data?.cases || [];
      
      // Get today's date in local timezone (YYYY-MM-DD format)
      const today = new Date();
      const todayString = today.getFullYear() + '-' + 
        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
        String(today.getDate()).padStart(2, '0');
      
      // Helper function to extract date from ISO string without timezone conversion
      const getLocalDateString = (dateString) => {
        if (!dateString) return '';
        // Extract just the date part (YYYY-MM-DD) from ISO string or date string
        return dateString.split('T')[0];
      };
      
      const todayAppointments = appointments.filter(a => {
        if (!a.appointment_date) return false;
        // Use direct string comparison to avoid timezone issues
        const appointmentLocalDate = getLocalDateString(a.appointment_date);
        return appointmentLocalDate === todayString;
      });

      // Get current time for more accurate appointment status
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes from midnight

      // Detailed breakdown of today's appointments
      const completedToday = todayAppointments.filter(a => a.status === 'completed');
      const cancelledToday = todayAppointments.filter(a => a.status === 'cancelled');
      const scheduledToday = todayAppointments.filter(a => a.status === 'confirmed');

      // Appointments that are overdue (past their scheduled time but still confirmed)
      const overdueToday = todayAppointments.filter(a => {
        if (a.status !== 'confirmed') return false;
        if (!a.appointment_time) return false;

        const [hours, minutes] = a.appointment_time.split(':').map(Number);
        const appointmentTimeMinutes = hours * 60 + minutes;

        return appointmentTimeMinutes < currentTime;
      });

      // Appointments still upcoming today
      const upcomingToday = todayAppointments.filter(a => {
        if (a.status !== 'confirmed') return false;
        if (!a.appointment_time) return false;

        const [hours, minutes] = a.appointment_time.split(':').map(Number);
        const appointmentTimeMinutes = hours * 60 + minutes;

        return appointmentTimeMinutes > currentTime;
      });

      const waitingAppointments = todayAppointments.filter(a => a.status === 'confirmed');
      const urgentCases = todayAppointments.filter(a => 
        a.appointment_type?.toLowerCase().includes('emergency') || 
        a.appointment_type?.toLowerCase().includes('urgent')
      );
      const pendingBills = bills.filter(b =>
        b.payment_status === 'pending' || b.payment_status === 'partially_paid' || b.payment_status === 'unpaid'
      );

      // Vet-specific appointment filtering
      const vetUserId = user?.user_id;
      const vetTodayAppts = todayAppointments.filter(a => a.veterinarian_id === vetUserId);
      const unassignedTodayAppts = todayAppointments.filter(a => !a.veterinarian_id && a.status === 'confirmed');
      const vetUpcomingAppts = appointments.filter(a => {
        if (a.status === 'cancelled' || a.status === 'completed') return false;
        const apptDate = getLocalDateString(a.appointment_date);
        if (apptDate < todayString) return false;
        if (apptDate === todayString) {
          const [h, m] = (a.appointment_time || '00:00').split(':').map(Number);
          return h * 60 + m > currentTime;
        }
        return true;
      }).filter(a => a.veterinarian_id === vetUserId);
      const unassignedUpcomingAppts = appointments.filter(a => {
        if (a.status === 'cancelled' || a.status === 'completed') return false;
        const apptDate = getLocalDateString(a.appointment_date);
        if (apptDate < todayString) return false;
        if (apptDate === todayString) {
          const [h, m] = (a.appointment_time || '00:00').split(':').map(Number);
          return h * 60 + m > currentTime;
        }
        return true;
      }).filter(a => !a.veterinarian_id);

      // Follow-up cases: all disease cases with requires_followup=true
      const followUpCases = allDiseaseCases
        .filter(c => c.requires_followup && c.next_followup_date)
        .sort((a, b) => a.next_followup_date.localeCompare(b.next_followup_date))
        .slice(0, 10);

      setStats({
        totalPets: pets.length,
        activePets: pets.filter(p => p.is_active).length,
        totalCustomers: customers.length,
        totalAppointments: appointments.length,
        todayAppointments: todayAppointments.length,
        todayCompleted: completedToday.length,
        todayCancelled: cancelledToday.length,
        todayScheduled: scheduledToday.length,
        todayOverdue: overdueToday.length,
        todayUpcoming: upcomingToday.length,
        waitingPatients: waitingAppointments.length,
        completedToday: completedToday.length,
        urgentCases: urgentCases.length,
        labResultsReady: 0, // Placeholder for future implementation
        pendingInvoices: pendingBills.length,
        lowStockItems: lowStockItems.length,
        followUpsCount: followUpCases.length,
        totalMedicalRecords: medicalRecordsResponse.total || 0,
        followUpCases,
        vetWaiting: vetTodayAppts.filter(a => a.status === 'confirmed').length,
        vetCompleted: vetTodayAppts.filter(a => a.status === 'completed').length,
        vetUrgent: vetTodayAppts.filter(a => a.appointment_type?.toLowerCase().includes('emergency')).length,
        vetScheduleToday: [...vetTodayAppts].sort((a, b) => (a.appointment_time || '').localeCompare(b.appointment_time || '')),
        vetUnassignedToday: [...unassignedTodayAppts].sort((a, b) => (a.appointment_time || '').localeCompare(b.appointment_time || '')),
        vetUpcoming: vetUpcomingAppts.sort((a, b) => {
          const da = getLocalDateString(a.appointment_date), db = getLocalDateString(b.appointment_date);
          return da !== db ? da.localeCompare(db) : (a.appointment_time || '').localeCompare(b.appointment_time || '');
        }).slice(0, 5),
        vetUnassignedUpcoming: unassignedUpcomingAppts.sort((a, b) => {
          const da = getLocalDateString(a.appointment_date), db = getLocalDateString(b.appointment_date);
          return da !== db ? da.localeCompare(db) : (a.appointment_time || '').localeCompare(b.appointment_time || '');
        }).slice(0, 3),
        recentAppointments: [...todayAppointments].sort((a, b) => (a.appointment_time || '').localeCompare(b.appointment_time || '')),
        upcomingAppointments: appointments.filter(a => {
          if (a.status === 'cancelled' || a.status === 'completed') return false;
          const appointmentDate = getLocalDateString(a.appointment_date);
          if (appointmentDate > todayString) return true;
          if (appointmentDate === todayString) {
            const [h, m] = (a.appointment_time || '00:00').split(':').map(Number);
            return h * 60 + m > currentTime;
          }
          return false;
        }).sort((a, b) => {
          const dateA = getLocalDateString(a.appointment_date);
          const dateB = getLocalDateString(b.appointment_date);
          if (dateA !== dateB) return dateA.localeCompare(dateB);
          return (a.appointment_time || '').localeCompare(b.appointment_time || '');
        }).slice(0, 5)
      });
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getStatusBadge = (status) => {
    const badges = {
      'confirmed': { bg: '#d1fae5', color: '#065f46', text: 'Confirmed' },
      'in_progress': { bg: '#dbeafe', color: '#1e3a8a', text: 'In Progress' },
      'completed': { bg: '#f3f4f6', color: '#374151', text: 'Completed' },
      'cancelled': { bg: '#fee2e2', color: '#991b1b', text: 'Cancelled' }
    };
    return badges[status] || badges['confirmed'];
  };

  const handlePasswordChangeSuccess = async () => {
    // Refresh user data to get updated password_must_change flag
    await refreshUser();
  };

  const handlePasswordChangeLogout = () => {
    logout();
    navigate('/');
  };

  const handleAssignToMe = async (appointment) => {
    try {
      await updateAppointment(appointment.appointment_id, { veterinarian_id: user.user_id });
      showSuccess(`Appointment assigned to you`);
      fetchDashboardData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to assign appointment');
    }
  };

  // Show password change modal if user must change password
  if (user?.password_must_change) {
    return (
      <PasswordChangeModal 
        onSuccess={handlePasswordChangeSuccess}
        onLogout={handlePasswordChangeLogout}
      />
    );
  }

  return (
    <Layout>
      <div style={styles.container}>
        {/* Page Header */}
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <i className="fas fa-chart-line" style={styles.headerIcon}></i>
            <div>
              <h2 style={styles.title}>Dashboard</h2>
              <p style={styles.subtitle}>Overview of clinic operations</p>
            </div>
          </div>
          <span style={styles.dateLabel}>
            <i className="far fa-calendar" style={{ marginRight: '6px' }}></i>
            Today: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p>Loading dashboard data...</p>
          </div>
        ) : (
          <>
            {/* Universal Search — all roles */}
            <div style={{
              background: 'linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%)',
              border: '1px solid #bfdbfe',
              borderRadius: '14px',
              padding: '20px 24px',
              marginBottom: '24px',
              boxShadow: '0 2px 8px rgba(59,130,246,0.08)'
            }}>
              <div style={{ marginBottom: '10px' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>
                  {user?.role === 'veterinarian'
                    ? 'Search across customers, pets, appointments & medical records'
                    : user?.role === 'admin'
                    ? 'Search across customers, pets, appointments, billing, inventory, medical records, staff & suppliers'
                    : 'Search across customers, pets, appointments, billing & inventory'}
                </p>
              </div>
              <UniversalSearch />
            </div>

            {/* Stats Cards */}
            <div style={styles.statsGrid}>
              {user?.role === 'admin' ? (
                // Admin Stats
                <>
                  <div style={{...styles.statCard, borderLeft: '4px solid #3b82f6', cursor: 'pointer'}} onClick={() => navigate('/appointments')}>
                    <div style={styles.statContent}>
                      <div>
                        <p style={styles.statLabel}>TODAY'S APPOINTMENTS</p>
                        <p style={styles.statValue}>{stats.todayAppointments}</p>
                      </div>
                      <div style={{...styles.statIconWrapper, backgroundColor: '#dbeafe'}}>
                        <i className="fas fa-calendar-check" style={{...styles.statIconText, color: '#1e40af'}}></i>
                      </div>
                    </div>
                    <div style={styles.statFooter}>
                      <span style={{...styles.statChange, color: '#3b82f6'}}>
                        {stats.completedToday} completed · {stats.waitingPatients} waiting →
                      </span>
                    </div>
                  </div>

                  <div style={{...styles.statCard, borderLeft: stats.pendingInvoices > 0 ? '4px solid #f59e0b' : '4px solid #e5e7eb', cursor: 'pointer'}} onClick={() => navigate('/billing')}>
                    <div style={styles.statContent}>
                      <div>
                        <p style={styles.statLabel}>PENDING INVOICES</p>
                        <p style={styles.statValue}>{stats.pendingInvoices}</p>
                      </div>
                      <div style={{...styles.statIconWrapper, backgroundColor: '#fef3c7'}}>
                        <i className="fas fa-file-invoice-dollar" style={{...styles.statIconText, color: '#d97706'}}></i>
                      </div>
                    </div>
                    <div style={styles.statFooter}>
                      <span style={{...styles.statChange, color: '#d97706'}}>
                        {stats.pendingInvoices > 0 ? 'Awaiting payment →' : 'All invoices settled'}
                      </span>
                    </div>
                  </div>

                  <div style={{...styles.statCard, borderLeft: stats.urgentCases > 0 ? '4px solid #ef4444' : '4px solid #e5e7eb', backgroundColor: stats.urgentCases > 0 ? '#fff7ed' : 'white', cursor: 'pointer'}} onClick={() => navigate('/appointments')}>
                    <div style={styles.statContent}>
                      <div>
                        <p style={{...styles.statLabel, color: stats.urgentCases > 0 ? '#c2410c' : '#6b7280'}}>URGENT CASES</p>
                        <p style={styles.statValue}>{stats.urgentCases}</p>
                      </div>
                      <div style={{...styles.statIconWrapper, backgroundColor: '#fee2e2'}}>
                        <i className="fas fa-exclamation-triangle" style={{...styles.statIconText, color: '#dc2626'}}></i>
                      </div>
                    </div>
                    <div style={styles.statFooter}>
                      <span style={{...styles.statChange, color: stats.urgentCases > 0 ? '#dc2626' : '#6b7280'}}>
                        {stats.urgentCases > 0 ? 'Needs immediate attention →' : 'No urgent cases today'}
                      </span>
                    </div>
                  </div>

                  <div style={{...styles.statCard, borderLeft: stats.lowStockItems > 0 ? '4px solid #8b5cf6' : '4px solid #e5e7eb', cursor: 'pointer'}} onClick={() => navigate('/inventory')}>
                    <div style={styles.statContent}>
                      <div>
                        <p style={styles.statLabel}>LOW STOCK ALERTS</p>
                        <p style={styles.statValue}>{stats.lowStockItems}</p>
                      </div>
                      <div style={{...styles.statIconWrapper, backgroundColor: '#ede9fe'}}>
                        <i className="fas fa-boxes" style={{...styles.statIconText, color: '#7c3aed'}}></i>
                      </div>
                    </div>
                    <div style={styles.statFooter}>
                      <span style={{...styles.statChange, color: stats.lowStockItems > 0 ? '#7c3aed' : '#6b7280'}}>
                        {stats.lowStockItems > 0 ? 'Review inventory →' : 'Stock levels OK'}
                      </span>
                    </div>
                  </div>
                </>
              ) : user?.role === 'veterinarian' ? (
                // Veterinarian Stats
                <>
                  {[
                    { label: 'MY PATIENTS WAITING', value: stats.vetWaiting, border: '#3b82f6', iconBg: '#dbeafe', iconColor: '#1e40af', icon: 'fa-user-clock', bg: 'white' },
                    { label: 'MY COMPLETED TODAY', value: stats.vetCompleted, border: '#10b981', iconBg: '#d1fae5', iconColor: '#065f46', icon: 'fa-check-circle', bg: 'white' },
                    { label: 'MY URGENT / EMERGENCY', value: stats.vetUrgent, border: stats.vetUrgent > 0 ? '#ef4444' : '#e5e7eb', iconBg: '#fee2e2', iconColor: '#dc2626', icon: 'fa-exclamation-triangle', bg: stats.vetUrgent > 0 ? '#fff7ed' : 'white', labelColor: stats.vetUrgent > 0 ? '#dc2626' : '#6b7280' },
                    { label: 'FOLLOW-UPS DUE', value: stats.followUpsCount, border: stats.followUpsCount > 0 ? '#8b5cf6' : '#e5e7eb', iconBg: '#ede9fe', iconColor: '#7c3aed', icon: 'fa-notes-medical', bg: 'white' },
                  ].map(card => (
                    <div key={card.label} style={{ backgroundColor: card.bg, borderRadius: '12px', padding: '0.85rem 1.1rem', border: '1px solid #e5e7eb', borderLeft: `4px solid ${card.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                      <div>
                        <p style={{ fontSize: '0.7rem', fontWeight: '700', color: card.labelColor || '#6b7280', margin: '0 0 0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</p>
                        <p style={{ fontSize: '1.75rem', fontWeight: '700', color: '#111827', margin: 0, lineHeight: 1 }}>{card.value}</p>
                      </div>
                      <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className={`fas ${card.icon}`} style={{ fontSize: '17px', color: card.iconColor }}></i>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                // Receptionist Stats
                <>
                  <div style={{...styles.statCard, cursor: 'pointer'}} onClick={() => navigate('/appointments')}>
                    <div style={styles.statContent}>
                      <div>
                        <p style={styles.statLabel}>Appointments Today</p>
                        <p style={styles.statValue}>{stats.todayAppointments}</p>
                      </div>
                      <div style={{...styles.statIconWrapper, backgroundColor: '#dbeafe'}}>
                        <i className="fas fa-calendar-check" style={{...styles.statIconText, color: '#1e40af'}}></i>
                      </div>
                    </div>
                    <div style={styles.statFooter}>
                      <span style={{fontSize: '0.75rem', color: '#10b981'}}>
                        {stats.todayUpcoming + stats.todayOverdue} waiting · View schedule →
                      </span>
                    </div>
                  </div>

                  <div style={{...styles.statCard, cursor: 'pointer'}} onClick={() => navigate('/customers')}>
                    <div style={styles.statContent}>
                      <div>
                        <p style={styles.statLabel}>Total Clients</p>
                        <p style={styles.statValue}>{stats.totalCustomers}</p>
                      </div>
                      <div style={{...styles.statIconWrapper, backgroundColor: '#d1fae5'}}>
                        <i className="fas fa-users" style={{...styles.statIconText, color: '#065f46'}}></i>
                      </div>
                    </div>
                    <div style={styles.statFooter}>
                      <span style={styles.statChange}>Registered clients →</span>
                    </div>
                  </div>

                  <div style={{...styles.statCard, cursor: 'pointer'}} onClick={() => navigate('/pets')}>
                    <div style={styles.statContent}>
                      <div>
                        <p style={styles.statLabel}>Active Patients</p>
                        <p style={styles.statValue}>{stats.activePets}</p>
                      </div>
                      <div style={{...styles.statIconWrapper, backgroundColor: '#fed7aa'}}>
                        <i className="fas fa-paw" style={{...styles.statIconText, color: '#c2410c'}}></i>
                      </div>
                    </div>
                    <div style={styles.statFooter}>
                      <span style={styles.statChange}>
                        {stats.totalPets} total registered →
                      </span>
                    </div>
                  </div>

                  <div style={{...styles.statCard, cursor: 'pointer'}} onClick={() => navigate('/billing')}>
                    <div style={styles.statContent}>
                      <div>
                        <p style={styles.statLabel}>Pending Invoices</p>
                        <p style={styles.statValue}>{stats.pendingInvoices}</p>
                      </div>
                      <div style={{...styles.statIconWrapper, backgroundColor: '#e9d5ff'}}>
                        <i className="fas fa-file-invoice-dollar" style={{...styles.statIconText, color: '#7c3aed'}}></i>
                      </div>
                    </div>
                    <div style={styles.statFooter}>
                      <span style={{...styles.statChange, color: stats.pendingInvoices > 0 ? '#7c3aed' : '#6b7280'}}>
                        {stats.pendingInvoices > 0 ? 'Awaiting payment →' : 'All invoices cleared'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Quick Actions - Role Specific */}
            {user?.role === 'admin' ? (
              // Admin Quick Actions
              <div style={styles.vetQuickActionsContainer}>
                <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem'}}>
                  <button onClick={() => navigate('/appointments/new')} style={styles.primaryButton}>
                    <i className="fas fa-calendar-plus"></i>
                    <span>New Appointment</span>
                  </button>
                  <button onClick={() => navigate('/customers/new')} style={styles.secondaryButton}>
                    <i className="fas fa-user-plus" style={{color: '#8b5cf6'}}></i>
                    <span>Add Customer</span>
                  </button>
                </div>

                <div style={styles.quickActionsGrid}>
                  <div style={styles.quickActionCard} onClick={() => navigate('/customers')}>
                    <i className="fas fa-users" style={{...styles.quickActionIcon, color: '#3b82f6'}}></i>
                    <span style={styles.quickActionLabel}>Customers</span>
                  </div>
                  <div style={styles.quickActionCard} onClick={() => navigate('/pets')}>
                    <i className="fas fa-paw" style={{...styles.quickActionIcon, color: '#f59e0b'}}></i>
                    <span style={styles.quickActionLabel}>Pets</span>
                  </div>
                  <div style={styles.quickActionCard} onClick={() => navigate('/analytics')}>
                    <i className="fas fa-chart-line" style={{...styles.quickActionIcon, color: '#10b981'}}></i>
                    <span style={styles.quickActionLabel}>Analytics</span>
                  </div>
                  <div style={styles.quickActionCard} onClick={() => navigate('/users')}>
                    <i className="fas fa-user-shield" style={{...styles.quickActionIcon, color: '#8b5cf6'}}></i>
                    <span style={styles.quickActionLabel}>User Management</span>
                  </div>
                </div>
              </div>
            ) : user?.role === 'veterinarian' ? (
              // Veterinarian Quick Actions
              <div style={styles.vetQuickActionsContainer}>
                <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem'}}>
                  <button onClick={() => navigate('/appointments/new')} style={styles.primaryButton}>
                    <i className="fas fa-calendar-plus"></i>
                    <span>New Appointment</span>
                  </button>
                  <button onClick={() => navigate('/medical-records/new')} style={styles.secondaryButton}>
                    <i className="fas fa-plus-circle" style={{color: '#3b82f6'}}></i>
                    <span>New Medical Record</span>
                  </button>
                </div>

                <div style={styles.quickActionsGrid}>
                  <div style={styles.quickActionCard} onClick={() => navigate('/medical-records')}>
                    <i className="fas fa-file-medical" style={{...styles.quickActionIcon, color: '#3b82f6'}}></i>
                    <span style={styles.quickActionLabel}>Medical Records</span>
                  </div>
                  <div style={styles.quickActionCard} onClick={() => navigate('/customers')}>
                    <i className="fas fa-users" style={{...styles.quickActionIcon, color: '#f59e0b'}}></i>
                    <span style={styles.quickActionLabel}>Customers</span>
                  </div>
                  <div style={styles.quickActionCard} onClick={() => navigate('/pets')}>
                    <i className="fas fa-paw" style={{...styles.quickActionIcon, color: '#10b981'}}></i>
                    <span style={styles.quickActionLabel}>Patients</span>
                  </div>
                  <div style={styles.quickActionCard} onClick={() => navigate('/breeding-registry')}>
                    <i className="fas fa-heart" style={{...styles.quickActionIcon, color: '#ec4899'}}></i>
                    <span style={styles.quickActionLabel}>Breeding Registry</span>
                  </div>
                </div>
              </div>
            ) : (
              // Receptionist Quick Actions
              <div style={styles.vetQuickActionsContainer}>
                <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem'}}>
                  <button onClick={() => navigate('/appointments/new')} style={styles.primaryButton}>
                    <i className="fas fa-calendar-plus"></i>
                    <span>New Appointment</span>
                  </button>
                  <button onClick={() => navigate('/customers/new')} style={styles.secondaryButton}>
                    <i className="fas fa-user-plus" style={{color: '#8b5cf6'}}></i>
                    <span>New Client</span>
                  </button>
                  <button onClick={() => navigate('/billing/new')} style={styles.secondaryButton}>
                    <i className="fas fa-cash-register" style={{color: '#6b7280'}}></i>
                    <span>New Invoice</span>
                  </button>
                </div>

                <div style={styles.quickActionsGrid}>
                  <div style={styles.quickActionCard} onClick={() => navigate('/appointments')}>
                    <i className="fas fa-calendar-alt" style={{...styles.quickActionIcon, color: '#3b82f6'}}></i>
                    <span style={styles.quickActionLabel}>Appointments</span>
                  </div>
                  <div style={styles.quickActionCard} onClick={() => navigate('/customers')}>
                    <i className="fas fa-users" style={{...styles.quickActionIcon, color: '#10b981'}}></i>
                    <span style={styles.quickActionLabel}>Clients</span>
                  </div>
                  <div style={styles.quickActionCard} onClick={() => navigate('/pets')}>
                    <i className="fas fa-paw" style={{...styles.quickActionIcon, color: '#f59e0b'}}></i>
                    <span style={styles.quickActionLabel}>Patients</span>
                  </div>
                  <div style={styles.quickActionCard} onClick={() => navigate('/billing')}>
                    <i className="fas fa-file-invoice-dollar" style={{...styles.quickActionIcon, color: '#8b5cf6'}}></i>
                    <span style={styles.quickActionLabel}>Billing</span>
                  </div>
                </div>
              </div>
            )}

            {/* Main Dashboard Split View */}
            <div style={{
              ...styles.mainGrid,
              gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr'
            }}>
              {/* Today's Appointments */}
              <div style={styles.appointmentsSection}>
                {user?.role === 'veterinarian' ? (
                  <>
                    {/* My appointments today */}
                    <div style={styles.sectionHeader}>
                      <h3 style={styles.sectionTitle}>My Schedule Today</h3>
                      <a onClick={() => navigate('/appointments', { state: { viewDate: new Date().toISOString().split('T')[0], openDayModal: true } })} style={styles.viewAllLink}>View today's full schedule →</a>
                    </div>
                    <div style={{...styles.tableCard, marginBottom: '1.25rem'}}>
                      {stats.vetScheduleToday.length === 0 ? (
                        <div style={{...styles.emptyState, padding: '1.5rem'}}>
                          <p style={{...styles.emptyText, margin: 0}}>No appointments assigned to you today</p>
                        </div>
                      ) : (
                        <div style={styles.tableWrapper}>
                          <table style={styles.table}>
                            <thead style={styles.thead}>
                              <tr>
                                <th style={styles.th}>Time</th>
                                <th style={styles.th}>Patient</th>
                                <th style={styles.th}>Type</th>
                                <th style={styles.th}>Status</th>
                                <th style={styles.th}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {stats.vetScheduleToday.map((appt) => {
                                const badge = getStatusBadge(appt.status);
                                const isEmergency = appt.appointment_type?.toLowerCase().includes('emergency') || appt.appointment_type?.toLowerCase().includes('urgent');
                                return (
                                  <tr key={appt.appointment_id} style={{...styles.tr, backgroundColor: isEmergency ? '#fff1f2' : undefined, borderLeft: isEmergency ? '3px solid #ef4444' : undefined}}>
                                    <td style={styles.td}><span style={styles.timeText}>{formatTime(appt.appointment_time)}</span></td>
                                    <td style={styles.td}>
                                      <div style={styles.patientCell}>
                                        <div style={{...styles.petAvatar, backgroundColor: isEmergency ? '#fee2e2' : undefined, color: isEmergency ? '#dc2626' : undefined}}><i className="fas fa-paw"></i></div>
                                        <div>
                                          <div style={styles.petName}>{appt.pet_name}</div>
                                          <div style={styles.petDetail}>{appt.species}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td style={styles.td}>
                                      <span style={{color: isEmergency ? '#dc2626' : undefined, fontWeight: isEmergency ? '600' : undefined}}>
                                        {isEmergency && <i className="fas fa-exclamation-circle" style={{marginRight: '0.3rem', fontSize: '0.75rem'}}></i>}
                                        {appt.appointment_type}
                                      </span>
                                    </td>
                                    <td style={styles.td}>
                                      <span style={{...styles.badge, backgroundColor: badge.bg, color: badge.color}}>{badge.text}</span>
                                    </td>
                                    <td style={styles.td}>
                                      <button
                                        onClick={() => navigate('/appointments', { state: { highlightAppointmentId: appt.appointment_id, appointmentDate: appt.appointment_date, appointmentStatus: appt.status } })}
                                        style={styles.viewButton}
                                      >View</button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Unassigned appointments — available to claim */}
                    <div style={styles.sectionHeader}>
                      <h3 style={{...styles.sectionTitle, fontSize: '1rem'}}>
                        Unassigned Today
                        {stats.vetUnassignedToday.length > 0 && (
                          <span style={{marginLeft: '0.5rem', fontSize: '0.75rem', backgroundColor: '#fef3c7', color: '#92400e', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: '600'}}>
                            {stats.vetUnassignedToday.length}
                          </span>
                        )}
                      </h3>
                    </div>
                    <div style={styles.tableCard}>
                      {stats.vetUnassignedToday.length === 0 ? (
                        <div style={{...styles.emptyState, padding: '1.5rem'}}>
                          <p style={{...styles.emptyText, margin: 0}}>No unassigned appointments today</p>
                        </div>
                      ) : (
                        <div style={styles.tableWrapper}>
                          <table style={styles.table}>
                            <thead style={styles.thead}>
                              <tr>
                                <th style={styles.th}>Time</th>
                                <th style={styles.th}>Patient</th>
                                <th style={styles.th}>Type</th>
                                <th style={styles.th}>Status</th>
                                <th style={{...styles.th, textAlign: 'center'}}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {stats.vetUnassignedToday.map((appt) => {
                                const badge = getStatusBadge(appt.status);
                                return (
                                  <tr key={appt.appointment_id} style={{...styles.tr, backgroundColor: '#fffbeb'}}>
                                    <td style={styles.td}><span style={styles.timeText}>{formatTime(appt.appointment_time)}</span></td>
                                    <td style={styles.td}>
                                      <div style={styles.patientCell}>
                                        <div style={{...styles.petAvatar, backgroundColor: '#fde68a', color: '#92400e'}}><i className="fas fa-paw"></i></div>
                                        <div>
                                          <div style={styles.petName}>{appt.pet_name}</div>
                                          <div style={styles.petDetail}>{appt.species}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td style={styles.td}>{appt.appointment_type}</td>
                                    <td style={styles.td}>
                                      <span style={{...styles.badge, backgroundColor: badge.bg, color: badge.color}}>{badge.text}</span>
                                    </td>
                                    <td style={{...styles.td, textAlign: 'center'}}>
                                      <div style={{display: 'flex', gap: '0.4rem', justifyContent: 'center'}}>
                                        <button
                                          onClick={() => navigate('/appointments', { state: { highlightAppointmentId: appt.appointment_id, appointmentDate: appt.appointment_date, appointmentStatus: appt.status } })}
                                          style={styles.viewButton}
                                        >View</button>
                                        <button
                                          onClick={() => handleAssignToMe(appt)}
                                          style={{...styles.viewButton, backgroundColor: '#f59e0b'}}
                                          title="Add this appointment to your schedule"
                                        >Assign to Me</button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={styles.sectionHeader}>
                      <h3 style={styles.sectionTitle}>Today's Schedule</h3>
                      <a onClick={() => navigate('/appointments')} style={styles.viewAllLink}>View Full Schedule</a>
                    </div>
                    <div style={styles.tableCard}>
                      {stats.recentAppointments.length === 0 ? (
                        <div style={styles.emptyState}>
                          <i className="fas fa-calendar-day" style={styles.emptyIcon}></i>
                          <p style={styles.emptyText}>No appointments scheduled for today</p>
                          <button onClick={() => navigate('/appointments/new')} style={styles.emptyButton}>Schedule First Appointment</button>
                        </div>
                      ) : (
                        <div style={styles.tableWrapper}>
                          <table style={styles.table}>
                            <thead style={styles.thead}>
                              <tr>
                                <th style={styles.th}>Time</th>
                                <th style={styles.th}>Patient</th>
                                <th style={styles.th}>Vet</th>
                                <th style={styles.th}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {stats.recentAppointments.map((appointment) => {
                                const badge = getStatusBadge(appointment.status);
                                return (
                                  <tr key={appointment.appointment_id} style={styles.tr}>
                                    <td style={styles.td}><span style={styles.timeText}>{formatTime(appointment.appointment_time)}</span></td>
                                    <td style={styles.td}>
                                      <div style={styles.patientCell}>
                                        <div style={styles.petAvatar}><i className="fas fa-paw"></i></div>
                                        <div>
                                          <div style={styles.petName}>{appointment.pet_name}</div>
                                          <div style={styles.petDetail}>{appointment.species} • {appointment.appointment_type}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td style={styles.td}>{appointment.veterinarian_name ? `Dr. ${appointment.veterinarian_name}` : 'Not assigned'}</td>
                                    <td style={styles.td}>
                                      <span style={{...styles.badge, backgroundColor: badge.bg, color: badge.color}}>{badge.text}</span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Sidebar - Role-specific */}
              <div style={styles.sidebar}>
                {(user?.role === 'veterinarian' || user?.role === 'admin') ? (
                  /* Vet + Admin: Follow-up Cases */
                  <div style={styles.sidebarCard}>
                    <div style={styles.sidebarHeader}>
                      <h4 style={styles.sidebarTitle}>Pending Follow-ups</h4>
                      <span style={{...styles.badge2, backgroundColor: stats.followUpsCount > 0 ? '#ede9fe' : '#f3f4f6', color: stats.followUpsCount > 0 ? '#6d28d9' : '#6b7280'}}>
                        {stats.followUpsCount} pending
                      </span>
                    </div>
                    <div style={styles.upcomingList}>
                      {stats.followUpCases.length === 0 ? (
                        <p style={styles.emptyTextSmall}>No pending follow-ups</p>
                      ) : (
                        stats.followUpCases.map((c) => (
                          <div key={c.case_id} style={{...styles.upcomingItem, cursor: 'pointer'}} onClick={() => navigate(`/disease-cases/${c.case_id}`)}>
                            <div style={{...styles.upcomingIcon, backgroundColor: '#fdf4ff', color: '#7c3aed'}}>
                              <i className="fas fa-notes-medical"></i>
                            </div>
                            <div style={{flex: 1, minWidth: 0}}>
                              <div style={styles.upcomingPet}>{c.pet_name} — {c.disease_name}</div>
                              <div style={styles.upcomingDate}>
                                {c.followup_type && <span style={{marginRight: '0.4rem'}}>{c.followup_type.replace(/_/g, ' ')} ·</span>}
                                {(() => {
                                  const d = c.next_followup_date.split('T')[0];
                                  const today = new Date().toISOString().split('T')[0];
                                  const isOverdue = d < today;
                                  return (
                                    <span style={{color: isOverdue ? '#dc2626' : 'inherit', fontWeight: isOverdue ? '600' : 'normal'}}>
                                      {isOverdue && <i className="fas fa-circle-exclamation" style={{marginRight: '0.25rem'}}></i>}
                                      {new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                      {isOverdue && ' (overdue)'}
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {stats.followUpsCount > 0 && (
                      <div style={{paddingTop: '0.75rem', borderTop: '1px solid #f3f4f6', marginTop: '0.5rem'}}>
                        <span onClick={() => navigate('/analytics')} style={{fontSize: '0.8rem', color: '#7c3aed', cursor: 'pointer', fontWeight: '500'}}>
                          View all disease cases →
                        </span>
                      </div>
                    )}
                  </div>
                ) : user?.role === 'admin' ? (
                  /* Admin: Quick Overview */
                  <div style={styles.sidebarCard}>
                    <h4 style={styles.sidebarTitle}>Quick Overview</h4>
                    <div style={styles.quickStatsList}>
                      <div style={styles.quickStat} onClick={() => navigate('/customers')}>
                        <div style={styles.quickStatIcon}><i className="fas fa-users"></i></div>
                        <div>
                          <div style={styles.quickStatValue}>{stats.totalCustomers}</div>
                          <div style={styles.quickStatLabel}>Total Clients</div>
                        </div>
                      </div>
                      <div style={styles.quickStat} onClick={() => navigate('/medical-records')}>
                        <div style={styles.quickStatIcon}><i className="fas fa-file-medical"></i></div>
                        <div>
                          <div style={styles.quickStatValue}>{stats.totalMedicalRecords}</div>
                          <div style={styles.quickStatLabel}>Medical Records</div>
                        </div>
                      </div>
                      <div style={styles.quickStat} onClick={() => navigate('/inventory')}>
                        <div style={styles.quickStatIcon}><i className="fas fa-boxes"></i></div>
                        <div>
                          <div style={styles.quickStatValue}>{stats.lowStockItems}</div>
                          <div style={styles.quickStatLabel}>Low Stock Alerts</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Receptionist: Today's Summary */
                  <div style={styles.sidebarCard}>
                    <h4 style={styles.sidebarTitle}>Today's Summary</h4>
                    <div style={styles.quickStatsList}>
                      <div style={styles.quickStat} onClick={() => navigate('/appointments')}>
                        <div style={{...styles.quickStatIcon, backgroundColor: '#dbeafe', color: '#1e40af'}}>
                          <i className="fas fa-calendar-check"></i>
                        </div>
                        <div>
                          <div style={styles.quickStatValue}>{stats.todayAppointments}</div>
                          <div style={styles.quickStatLabel}>Today's Appointments</div>
                        </div>
                      </div>
                      <div style={styles.quickStat} onClick={() => navigate('/billing')}>
                        <div style={{...styles.quickStatIcon, backgroundColor: '#ede9fe', color: '#6d28d9'}}>
                          <i className="fas fa-file-invoice-dollar"></i>
                        </div>
                        <div>
                          <div style={styles.quickStatValue}>{stats.pendingInvoices}</div>
                          <div style={styles.quickStatLabel}>Pending Payments</div>
                        </div>
                      </div>
                      <div style={styles.quickStat} onClick={() => navigate('/customers')}>
                        <div style={{...styles.quickStatIcon, backgroundColor: '#d1fae5', color: '#065f46'}}>
                          <i className="fas fa-users"></i>
                        </div>
                        <div>
                          <div style={styles.quickStatValue}>{stats.totalCustomers}</div>
                          <div style={styles.quickStatLabel}>Total Clients</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upcoming Appointments */}
                <div style={styles.sidebarCard}>
                  <div style={styles.sidebarHeader}>
                    <h4 style={styles.sidebarTitle}>{user?.role === 'veterinarian' ? 'My Upcoming' : 'Upcoming'}</h4>
                    <span style={styles.badge2}>
                      {user?.role === 'veterinarian' ? stats.vetUpcoming.length : stats.upcomingAppointments.length} scheduled
                    </span>
                  </div>
                  <div style={styles.upcomingList}>
                    {(user?.role === 'veterinarian' ? stats.vetUpcoming : stats.upcomingAppointments).length === 0 ? (
                      <p style={styles.emptyTextSmall}>No upcoming appointments</p>
                    ) : (
                      (user?.role === 'veterinarian' ? stats.vetUpcoming : stats.upcomingAppointments).slice(0, 4).map((apt) => (
                        <div key={apt.appointment_id} style={{...styles.upcomingItem, cursor: 'pointer', backgroundColor: upcomingPreview?.appointment_id === apt.appointment_id ? '#eff6ff' : undefined}} onClick={() => setUpcomingPreview(upcomingPreview?.appointment_id === apt.appointment_id ? null : apt)}>
                          <div style={styles.upcomingIcon}><i className="fas fa-calendar"></i></div>
                          <div style={{flex: 1}}>
                            <div style={styles.upcomingPet}>{apt.pet_name}</div>
                            <div style={styles.upcomingDate}>
                              {new Date(apt.appointment_date.split('T')[0] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {formatTime(apt.appointment_time)}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Inline preview card */}
                  {upcomingPreview && (
                    <div style={{margin: '0.75rem 0 0', padding: '0.75rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.8rem'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem'}}>
                        <span style={{fontWeight: '600', color: '#1e293b'}}>{upcomingPreview.pet_name}</span>
                        <button onClick={() => setUpcomingPreview(null)} style={{background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0', lineHeight: 1}}>
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                      <div style={{color: '#475569', lineHeight: '1.6'}}>
                        <div><i className="fas fa-calendar" style={{width: '14px', marginRight: '0.4rem', color: '#64748b'}}></i>{new Date(upcomingPreview.appointment_date.split('T')[0] + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {formatTime(upcomingPreview.appointment_time)}</div>
                        <div><i className="fas fa-stethoscope" style={{width: '14px', marginRight: '0.4rem', color: '#64748b'}}></i>{upcomingPreview.appointment_type}</div>
                        {upcomingPreview.veterinarian_name && <div><i className="fas fa-user-md" style={{width: '14px', marginRight: '0.4rem', color: '#64748b'}}></i>Dr. {upcomingPreview.veterinarian_name}</div>}
                        {upcomingPreview.reason && <div><i className="fas fa-notes-medical" style={{width: '14px', marginRight: '0.4rem', color: '#64748b'}}></i>{upcomingPreview.reason}</div>}
                      </div>
                      <button
                        onClick={() => { setUpcomingPreview(null); navigate('/appointments', { state: { viewDate: upcomingPreview.appointment_date, viewAppointmentId: upcomingPreview.appointment_id } }); }}
                        style={{marginTop: '0.6rem', width: '100%', padding: '0.35rem 0', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '500'}}
                      >
                        <i className="fas fa-calendar-alt" style={{marginRight: '0.35rem'}}></i>Go to Calendar View
                      </button>
                    </div>
                  )}

                </div>
              </div>
            </div>

          </>
        )}
      </div>
    </Layout>
  );
};

const styles = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: '1400px',
    margin: '0 auto',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    gap: '1rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #e5e7eb',
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  headerIcon: {
    fontSize: '36px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
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
    margin: '0',
  },
  dateLabel: {
    fontSize: '0.82rem',
    fontWeight: '600',
    color: '#374151',
    whiteSpace: 'nowrap',
    alignSelf: 'center',
    backgroundColor: '#f3f4f6',
    padding: '0.35rem 0.75rem',
    borderRadius: '6px',
    letterSpacing: '0.01em',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '4rem 2rem',
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    animation: 'spin 1s linear infinite',
    marginBottom: '1rem',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  statContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '0.75rem',
  },
  statLabel: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#6b7280',
    margin: '0 0 0.5rem 0',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#111827',
    margin: 0,
  },
  statIconWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statIconText: {
    fontSize: '20px',
  },
  statFooter: {
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  statChange: {
    fontWeight: '500',
  },
  quickActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(59, 130, 246, 0.3)',
    transition: 'all 0.2s',
  },
  secondaryButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: 'white',
    color: '#374151',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    transition: 'all 0.2s',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '1.5rem',
  },
  appointmentsSection: {
    gridColumn: '1',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#111827',
    margin: 0,
  },
  viewAllLink: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#3b82f6',
    cursor: 'pointer',
    textDecoration: 'none',
  },
  tableCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  thead: {
    backgroundColor: '#f9fafb',
  },
  th: {
    padding: '1rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  tr: {
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '1rem',
    fontSize: '0.875rem',
    color: '#374151',
  },
  timeText: {
    fontWeight: '600',
    color: '#111827',
    whiteSpace: 'nowrap',
  },
  patientCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  petAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#fed7aa',
    color: '#ea580c',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.875rem',
    flexShrink: 0,
  },
  petName: {
    fontWeight: '600',
    color: '#111827',
    fontSize: '0.875rem',
  },
  petDetail: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.375rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '500',
    whiteSpace: 'nowrap',
  },
  badge2: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.375rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  actionButton: {
    padding: '0.375rem 0.5rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    color: '#9ca3af',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  viewButton: {
    padding: '0.375rem 0.75rem',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  sidebarCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  sidebarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  sidebarTitle: {
    fontSize: '1.125rem',
    fontWeight: 'bold',
    color: '#111827',
    margin: 0,
  },
  quickStatsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  quickStat: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    borderRadius: '8px',
    backgroundColor: '#f9fafb',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  quickStatIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: 'white',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  quickStatValue: {
    fontSize: '1.125rem',
    fontWeight: 'bold',
    color: '#111827',
  },
  quickStatLabel: {
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  upcomingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  upcomingItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    borderRadius: '8px',
    backgroundColor: '#f9fafb',
  },
  upcomingIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: 'white',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    flexShrink: 0,
  },
  upcomingPet: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#111827',
  },
  upcomingDate: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem 1rem',
  },
  emptyIcon: {
    fontSize: '48px',
    color: '#d1d5db',
    marginBottom: '1rem',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
  emptyTextSmall: {
    color: '#9ca3af',
    fontSize: '0.875rem',
    textAlign: 'center',
    padding: '0.75rem',
  },
  emptyButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  vetQuickActionsContainer: {
    marginBottom: '2rem',
  },
  quickActionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
  },
  quickActionCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '1rem',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      borderColor: '#3b82f6',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    },
  },
  quickActionIcon: {
    fontSize: '24px',
    transition: 'transform 0.2s',
  },
  quickActionLabel: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#111827',
    textAlign: 'center',
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
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: 0,
    maxWidth: '500px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem 1.5rem 1rem 1.5rem',
    borderBottom: '1px solid #e5e7eb',
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    margin: 0,
    color: '#111827',
  },
  modalCloseButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.25rem',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '4px',
  },
  modalBody: {
    padding: '1.5rem',
  },
  modalRow: {
    display: 'flex',
    marginBottom: '1rem',
    alignItems: 'flex-start',
  },
  modalLabel: {
    fontWeight: '600',
    color: '#374151',
    minWidth: '120px',
    fontSize: '0.875rem',
  },
  modalValue: {
    color: '#111827',
    fontSize: '0.875rem',
    flex: 1,
  },
  modalFooter: {
    padding: '1rem 1.5rem 1.5rem 1.5rem',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
  },
  modalAction: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  modalCancel: {
    padding: '0.5rem 1rem',
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  '@media (min-width: 1024px)': {
    mainGrid: {
      gridTemplateColumns: '2fr 1fr',
    },
  },
};

export default Dashboard;
