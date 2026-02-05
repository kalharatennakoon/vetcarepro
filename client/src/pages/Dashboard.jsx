import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { getPets } from '../services/petService';
import { getCustomers } from '../services/customerService';
import { getMedicalRecords } from '../services/medicalRecordService';
import inventoryService from '../services/inventoryService';
import Layout from '../components/Layout';

const Dashboard = () => {
  const { user } = useAuth();
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
    recentAppointments: [],
    upcomingAppointments: []
  });
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showModal, setShowModal] = useState(false);

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
      
      const [petsResponse, customersResponse, appointmentsResponse, medicalRecordsResponse, billingResponse, lowStockResponse] = await Promise.all([
        getPets({}),
        getCustomers({}),
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/appointments`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        getMedicalRecords({ limit: 5 }),
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/billing`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).catch(() => ({ data: { bills: [] } })),
        inventoryService.getLowStockItems().catch(() => ({ data: [] }))
      ]);

      const pets = petsResponse.data.pets || [];
      const customers = customersResponse.data.customers || [];
      const appointments = appointmentsResponse.data.data.appointments || [];
      const bills = billingResponse.data.data?.bills || billingResponse.data.bills || [];
      const lowStockItems = lowStockResponse.data.data || lowStockResponse.data || [];
      
      // Get today's date in local timezone (YYYY-MM-DD format)
      const today = new Date();
      const todayString = today.getFullYear() + '-' + 
        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
        String(today.getDate()).padStart(2, '0');
      
      const todayAppointments = appointments.filter(a => {
        if (!a.appointment_date) return false;
        // Handle both simple date format (2026-02-05) and ISO format (2026-02-05T...)
        // Also account for timezone issues by comparing the local date
        const appointmentDate = new Date(a.appointment_date);
        const appointmentLocalDate = appointmentDate.getFullYear() + '-' + 
          String(appointmentDate.getMonth() + 1).padStart(2, '0') + '-' + 
          String(appointmentDate.getDate()).padStart(2, '0');
        return appointmentLocalDate === todayString;
      });

      // Get current time for more accurate appointment status
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes from midnight

      // Detailed breakdown of today's appointments
      const completedToday = todayAppointments.filter(a => a.status === 'completed');
      const cancelledToday = todayAppointments.filter(a => a.status === 'cancelled');
      const scheduledToday = todayAppointments.filter(a => a.status === 'scheduled' || a.status === 'checked_in');
      
      // Appointments that are overdue (past their scheduled time but still scheduled)
      const overdueToday = todayAppointments.filter(a => {
        if (a.status !== 'scheduled' && a.status !== 'checked_in') return false;
        if (!a.appointment_time) return false;
        
        const [hours, minutes] = a.appointment_time.split(':').map(Number);
        const appointmentTimeMinutes = hours * 60 + minutes;
        
        return appointmentTimeMinutes < currentTime;
      });

      // Appointments still upcoming today
      const upcomingToday = todayAppointments.filter(a => {
        if (a.status !== 'scheduled') return false;
        if (!a.appointment_time) return false;
        
        const [hours, minutes] = a.appointment_time.split(':').map(Number);
        const appointmentTimeMinutes = hours * 60 + minutes;
        
        return appointmentTimeMinutes > currentTime;
      });

      const waitingAppointments = todayAppointments.filter(a => 
        a.status === 'scheduled' || a.status === 'checked_in'
      );
      const urgentCases = todayAppointments.filter(a => 
        a.appointment_type?.toLowerCase().includes('emergency') || 
        a.appointment_type?.toLowerCase().includes('urgent')
      );
      const pendingBills = bills.filter(b => 
        b.payment_status === 'pending' || b.payment_status === 'partially_paid' || b.payment_status === 'unpaid'
      );

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
        totalMedicalRecords: medicalRecordsResponse.total || 0,
        recentAppointments: todayAppointments,
        upcomingAppointments: appointments.filter(a => 
          new Date(a.appointment_date) > new Date() && a.status === 'scheduled'
        ).sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date)).slice(0, 5)
      });
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
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
      'scheduled': { bg: '#e0e7ff', color: '#3730a3', text: 'Scheduled' },
      'checked_in': { bg: '#d1fae5', color: '#065f46', text: 'Checked In' },
      'in_progress': { bg: '#dbeafe', color: '#1e3a8a', text: 'In Progress' },
      'completed': { bg: '#f3f4f6', color: '#374151', text: 'Completed' },
      'cancelled': { bg: '#fee2e2', color: '#991b1b', text: 'Cancelled' }
    };
    return badges[status] || badges.scheduled;
  };

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
          <div style={styles.dateCard}>
            <i className="far fa-calendar" style={{fontSize: '14px', marginRight: '6px', color: '#6B7280'}}></i>
            <span style={styles.dateText}>
              {new Date().toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </span>
          </div>
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
              {(user?.role === 'veterinarian' || user?.role === 'admin') ? (
                // Veterinarian Stats
                <>
                  <div style={{...styles.statCard, borderLeft: '4px solid #3b82f6'}}>
                    <div style={styles.statContent}>
                      <div>
                        <p style={styles.statLabel}>PATIENTS WAITING</p>
                        <p style={styles.statValue}>{stats.waitingPatients}</p>
                      </div>
                      <div style={{...styles.statIconWrapper, backgroundColor: '#dbeafe'}}>
                        <i className="fas fa-users" style={{...styles.statIconText, color: '#1e40af'}}></i>
                      </div>
                    </div>
                    <div style={styles.statFooter}>
                      <span style={{...styles.statChange, color: '#10b981'}}>
                        <i className="fas fa-arrow-up" style={{fontSize: '0.75rem'}}></i> +{stats.waitingPatients > 0 ? Math.floor(stats.waitingPatients / 2) : 0} since 9am
                      </span>
                    </div>
                  </div>

                  <div style={styles.statCard}>
                    <div style={styles.statContent}>
                      <div>
                        <p style={styles.statLabel}>COMPLETED TODAY</p>
                        <p style={styles.statValue}>{stats.completedToday}</p>
                      </div>
                      <div style={{...styles.statIconWrapper, backgroundColor: '#d1fae5'}}>
                        <i className="fas fa-check-circle" style={{...styles.statIconText, color: '#065f46'}}></i>
                      </div>
                    </div>
                    <div style={styles.statFooter}>
                      <span style={styles.statChange}>
                        On track for daily goal
                      </span>
                    </div>
                  </div>

                  <div style={{...styles.statCard, borderLeft: stats.urgentCases > 0 ? '4px solid #f97316' : 'none', backgroundColor: stats.urgentCases > 0 ? '#fff7ed' : 'white'}}>
                    <div style={styles.statContent}>
                      <div>
                        <p style={{...styles.statLabel, color: stats.urgentCases > 0 ? '#c2410c' : '#6b7280'}}>URGENT CASES</p>
                        <p style={styles.statValue}>{stats.urgentCases}</p>
                      </div>
                      <div style={{...styles.statIconWrapper, backgroundColor: '#fed7aa'}}>
                        <i className="fas fa-exclamation-triangle" style={{...styles.statIconText, color: '#c2410c'}}></i>
                      </div>
                    </div>
                    <div style={styles.statFooter}>
                      <span style={{...styles.statChange, color: stats.urgentCases > 0 ? '#c2410c' : '#6b7280'}}>
                        {stats.urgentCases > 0 ? 'Requires immediate attention' : 'No urgent cases'}
                      </span>
                    </div>
                  </div>

                  <div style={styles.statCard}>
                    <div style={styles.statContent}>
                      <div>
                        <p style={styles.statLabel}>LAB RESULTS READY</p>
                        <p style={styles.statValue}>{stats.labResultsReady}</p>
                      </div>
                      <div style={{...styles.statIconWrapper, backgroundColor: '#e9d5ff'}}>
                        <i className="fas fa-flask" style={{...styles.statIconText, color: '#7c3aed'}}></i>
                      </div>
                    </div>
                    <div style={styles.statFooter}>
                      <span style={{...styles.statChange, color: '#7c3aed', cursor: 'pointer'}}>
                        Review all results →
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                // Receptionist Stats
                <>
                  <div style={styles.statCard}>
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
                        {stats.todayUpcoming + stats.todayOverdue} waiting
                      </span>
                    </div>
                  </div>

                  <div style={styles.statCard}>
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
                        {stats.totalPets} total registered
                      </span>
                    </div>
                  </div>

                  <div style={styles.statCard}>
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
                      <span style={styles.statChange}>
                        Awaiting payment
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Quick Actions - Role Specific */}
            {(user?.role === 'veterinarian' || user?.role === 'admin') ? (
              // Veterinarian Quick Actions
              <div style={styles.vetQuickActionsContainer}>
                <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem'}}>
                  <button onClick={() => navigate('/medical-records/new')} style={styles.primaryButton}>
                    <i className="fas fa-play"></i>
                    <span>Start Next Exam</span>
                  </button>
                  <button onClick={() => navigate('/medical-records/new')} style={styles.secondaryButton}>
                    <i className="fas fa-plus-circle" style={{color: '#3b82f6'}}></i>
                    <span>New Record</span>
                  </button>
                </div>

                <div style={styles.quickActionsGrid}>
                  <div style={styles.quickActionCard} onClick={() => navigate('/medical-records/new')}>
                    <i className="fas fa-prescription" style={{...styles.quickActionIcon, color: '#3b82f6'}}></i>
                    <span style={styles.quickActionLabel}>Prescription</span>
                  </div>
                  <div style={styles.quickActionCard} onClick={() => navigate('/medical-records')}>
                    <i className="fas fa-flask" style={{...styles.quickActionIcon, color: '#3b82f6'}}></i>
                    <span style={styles.quickActionLabel}>Lab Request</span>
                  </div>
                  <div style={styles.quickActionCard} onClick={() => navigate('/medical-records/new')}>
                    <i className="fas fa-notes-medical" style={{...styles.quickActionIcon, color: '#3b82f6'}}></i>
                    <span style={styles.quickActionLabel}>Add Notes</span>
                  </div>
                  <div style={styles.quickActionCard} onClick={() => navigate('/medical-records')}>
                    <i className="fas fa-syringe" style={{...styles.quickActionIcon, color: '#3b82f6'}}></i>
                    <span style={styles.quickActionLabel}>Vaccine Log</span>
                  </div>
                </div>
              </div>
            ) : (
              // Receptionist Quick Actions
              <div style={styles.quickActions}>
                <button onClick={() => navigate('/appointments/new')} style={styles.primaryButton}>
                  <i className="fas fa-plus-circle"></i>
                  <span>New Appointment</span>
                </button>
                <button onClick={() => navigate('/appointments')} style={styles.secondaryButton}>
                  <i className="fas fa-check-circle" style={{color: '#10b981'}}></i>
                  <span>Check-in Patient</span>
                </button>
                <button onClick={() => navigate('/customers/new')} style={styles.secondaryButton}>
                  <i className="fas fa-user-plus" style={{color: '#8b5cf6'}}></i>
                  <span>New Client</span>
                </button>
                <button onClick={() => navigate('/billing')} style={styles.secondaryButton}>
                  <i className="fas fa-cash-register" style={{color: '#6b7280'}}></i>
                  <span>Process Payment</span>
                </button>
              </div>
            )}

            {/* Main Dashboard Split View */}
            <div style={{
              ...styles.mainGrid,
              gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr'
            }}>
              {/* Today's Appointments */}
              <div style={styles.appointmentsSection}>
                <div style={styles.sectionHeader}>
                  <h3 style={styles.sectionTitle}>Today's Schedule</h3>
                  <a onClick={() => navigate('/appointments')} style={styles.viewAllLink}>
                    View Full Schedule
                  </a>
                </div>
                <div style={styles.tableCard}>
                  {stats.recentAppointments.length === 0 ? (
                    <div style={styles.emptyState}>
                      <i className="fas fa-calendar-day" style={styles.emptyIcon}></i>
                      <p style={styles.emptyText}>No appointments scheduled for today</p>
                      <button onClick={() => navigate('/appointments/new')} style={styles.emptyButton}>
                        Schedule First Appointment
                      </button>
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
                            <th style={styles.th}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recentAppointments.map((appointment) => {
                            const badge = getStatusBadge(appointment.status);
                            return (
                              <tr key={appointment.appointment_id} style={styles.tr}>
                                <td style={styles.td}>
                                  <span style={styles.timeText}>
                                    {formatTime(appointment.appointment_time)}
                                  </span>
                                </td>
                                <td style={styles.td}>
                                  <div style={styles.patientCell}>
                                    <div style={styles.petAvatar}>
                                      <i className="fas fa-paw"></i>
                                    </div>
                                    <div>
                                      <div style={styles.petName}>{appointment.pet_name}</div>
                                      <div style={styles.petDetail}>
                                        {appointment.species} • {appointment.appointment_type}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td style={styles.td}>{appointment.veterinarian_name || 'Not assigned'}</td>
                                <td style={styles.td}>
                                  <span style={{
                                    ...styles.badge,
                                    backgroundColor: badge.bg,
                                    color: badge.color
                                  }}>
                                    {badge.text}
                                  </span>
                                </td>
                                <td style={styles.td}>
                                  <button 
                                    onClick={() => {
                                      setSelectedAppointment(appointment);
                                      setShowModal(true);
                                    }}
                                    style={styles.viewButton}
                                    title="View appointment details"
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar - Tasks & Info */}
              <div style={styles.sidebar}>
                {/* Quick Stats */}
                <div style={styles.sidebarCard}>
                  <h4 style={styles.sidebarTitle}>Quick Overview</h4>
                  <div style={styles.quickStatsList}>
                    <div style={styles.quickStat} onClick={() => navigate('/customers')}>
                      <div style={styles.quickStatIcon}>
                        <i className="fas fa-users"></i>
                      </div>
                      <div>
                        <div style={styles.quickStatValue}>{stats.totalCustomers}</div>
                        <div style={styles.quickStatLabel}>Total Clients</div>
                      </div>
                    </div>
                    <div style={styles.quickStat} onClick={() => navigate('/medical-records')}>
                      <div style={styles.quickStatIcon}>
                        <i className="fas fa-file-medical"></i>
                      </div>
                      <div>
                        <div style={styles.quickStatValue}>{stats.totalMedicalRecords}</div>
                        <div style={styles.quickStatLabel}>Medical Records</div>
                      </div>
                    </div>
                    <div style={styles.quickStat} onClick={() => navigate('/inventory')}>
                      <div style={styles.quickStatIcon}>
                        <i className="fas fa-boxes"></i>
                      </div>
                      <div>
                        <div style={styles.quickStatValue}>{stats.lowStockItems}</div>
                        <div style={styles.quickStatLabel}>Low Stock Alerts</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upcoming Appointments */}
                <div style={styles.sidebarCard}>
                  <div style={styles.sidebarHeader}>
                    <h4 style={styles.sidebarTitle}>Upcoming</h4>
                    <span style={styles.badge2}>
                      {stats.upcomingAppointments.length} scheduled
                    </span>
                  </div>
                  <div style={styles.upcomingList}>
                    {stats.upcomingAppointments.length === 0 ? (
                      <p style={styles.emptyTextSmall}>No upcoming appointments</p>
                    ) : (
                      stats.upcomingAppointments.slice(0, 4).map((apt) => (
                        <div key={apt.appointment_id} style={styles.upcomingItem}>
                          <div style={styles.upcomingIcon}>
                            <i className="fas fa-calendar"></i>
                          </div>
                          <div style={{flex: 1}}>
                            <div style={styles.upcomingPet}>{apt.pet_name}</div>
                            <div style={styles.upcomingDate}>
                              {new Date(apt.appointment_date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              })} at {formatTime(apt.appointment_time)}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Appointment Details Modal */}
            {showModal && selectedAppointment && (
              <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
                <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                  <div style={styles.modalHeader}>
                    <h3 style={styles.modalTitle}>Appointment Details</h3>
                    <button 
                      style={styles.modalCloseButton}
                      onClick={() => setShowModal(false)}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                  <div style={styles.modalBody}>
                    <div style={styles.modalRow}>
                      <span style={styles.modalLabel}>Appointment ID:</span>
                      <span style={styles.modalValue}>{selectedAppointment.appointment_id}</span>
                    </div>
                    <div style={styles.modalRow}>
                      <span style={styles.modalLabel}>Patient:</span>
                      <span style={styles.modalValue}>{selectedAppointment.pet_name} ({selectedAppointment.species})</span>
                    </div>
                    <div style={styles.modalRow}>
                      <span style={styles.modalLabel}>Owner:</span>
                      <span style={styles.modalValue}>{selectedAppointment.customer_first_name} {selectedAppointment.customer_last_name}</span>
                    </div>
                    <div style={styles.modalRow}>
                      <span style={styles.modalLabel}>Phone:</span>
                      <span style={styles.modalValue}>{selectedAppointment.customer_phone}</span>
                    </div>
                    <div style={styles.modalRow}>
                      <span style={styles.modalLabel}>Date & Time:</span>
                      <span style={styles.modalValue}>
                        {new Date(selectedAppointment.appointment_date).toLocaleDateString()} at {formatTime(selectedAppointment.appointment_time)}
                      </span>
                    </div>
                    <div style={styles.modalRow}>
                      <span style={styles.modalLabel}>Type:</span>
                      <span style={styles.modalValue}>{selectedAppointment.appointment_type}</span>
                    </div>
                    <div style={styles.modalRow}>
                      <span style={styles.modalLabel}>Reason:</span>
                      <span style={styles.modalValue}>{selectedAppointment.reason || 'Not specified'}</span>
                    </div>
                    <div style={styles.modalRow}>
                      <span style={styles.modalLabel}>Veterinarian:</span>
                      <span style={styles.modalValue}>{selectedAppointment.veterinarian_name || 'Not assigned'}</span>
                    </div>
                    <div style={styles.modalRow}>
                      <span style={styles.modalLabel}>Status:</span>
                      <span style={{
                        ...styles.modalValue,
                        ...styles.badge,
                        backgroundColor: getStatusBadge(selectedAppointment.status).bg,
                        color: getStatusBadge(selectedAppointment.status).color,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem'
                      }}>
                        {getStatusBadge(selectedAppointment.status).text}
                      </span>
                    </div>
                    {selectedAppointment.notes && (
                      <div style={styles.modalRow}>
                        <span style={styles.modalLabel}>Notes:</span>
                        <span style={styles.modalValue}>{selectedAppointment.notes}</span>
                      </div>
                    )}
                  </div>
                  <div style={styles.modalFooter}>
                    <button 
                      style={styles.modalAction}
                      onClick={() => {
                        setShowModal(false);
                        navigate('/appointments');
                      }}
                    >
                      Go to Appointments
                    </button>
                    <button 
                      style={styles.modalCancel}
                      onClick={() => setShowModal(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
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
  dateCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'white',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    whiteSpace: 'nowrap',
  },
  dateText: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
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
