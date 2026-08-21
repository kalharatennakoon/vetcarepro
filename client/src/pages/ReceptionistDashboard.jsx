import { useState, useEffect } from 'react';
import UniversalSearch from '../components/UniversalSearch';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import PasswordChangeModal from '../components/PasswordChangeModal';
import AiDailyBriefing from '../components/dashboard/AiDailyBriefing';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { formatTime, getStatusBadge } from './dashboard/dashboardUtils';
import { styles } from './dashboard/dashboardStyles';
import './dashboard/dashboardQuickActions.css';

const ReceptionistDashboard = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { stats, loading } = useDashboardStats();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [upcomingPreview, setUpcomingPreview] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePasswordChangeSuccess = async () => {
    await refreshUser();
  };

  const handlePasswordChangeLogout = () => {
    logout();
    navigate('/staff/login');
  };

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
            {/* AI Daily Briefing + Universal Search, side by side */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: '1.25rem',
              marginBottom: '24px',
              alignItems: 'stretch',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <AiDailyBriefing />
              </div>
              <div style={{
                flex: 1,
                minWidth: 0,
                background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)',
                border: '1px solid #93c5fd',
                borderLeft: '4px solid #2563eb',
                borderRadius: '14px',
                padding: '20px 24px',
                boxShadow: '0 4px 16px -6px rgba(37, 99, 235, 0.35)'
              }}>
                <div style={{ marginBottom: '10px' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>
                    Search across customers, pets, appointments, billing & inventory
                  </p>
                </div>
                <UniversalSearch />
              </div>
            </div>

            {/* Stats Cards + Quick Actions as four columns (2 cards + 2 cards + 4
                buttons + 3 buttons) — keeps the cards at their natural height
                instead of being stretched to match a single tall button stack.
                Actions duplicate the left nav (which stays collapsed), so they're
                kept compact rather than given their own highlighted row. */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: '1rem',
              marginBottom: '1.5rem',
              alignItems: 'flex-start',
            }}>
              {[
                [
                  { label: 'Appointments Today', value: stats.todayAppointments, border: '#3b82f6', iconBg: '#dbeafe', iconColor: '#1e40af', icon: 'fa-calendar-check', bg: 'white' },
                  { label: 'Total Customers', value: stats.totalCustomers, border: '#10b981', iconBg: '#d1fae5', iconColor: '#065f46', icon: 'fa-users', bg: 'white' },
                ],
                [
                  { label: 'Active Patients', value: stats.activePets, border: '#f59e0b', iconBg: '#fed7aa', iconColor: '#c2410c', icon: 'fa-paw', bg: 'white' },
                  { label: 'Pending Invoices', value: stats.pendingInvoices, border: stats.pendingInvoices > 0 ? '#8b5cf6' : '#e5e7eb', iconBg: '#e9d5ff', iconColor: '#7c3aed', icon: 'fa-file-invoice-dollar', bg: 'white' },
                ],
              ].map((column, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {column.map(card => (
                    <div key={card.label} style={{ backgroundColor: card.bg, borderRadius: '12px', padding: '0.85rem 1.1rem', border: '1px solid #e5e7eb', borderLeft: `4px solid ${card.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                      <div>
                        <p style={{ fontSize: '0.7rem', fontWeight: '700', color: '#6b7280', margin: '0 0 0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</p>
                        <p style={{ fontSize: '1.75rem', fontWeight: '700', color: '#111827', margin: 0, lineHeight: 1 }}>{card.value}</p>
                      </div>
                      <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className={`fas ${card.icon}`} style={{ fontSize: '17px', color: card.iconColor }}></i>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {[
                [
                  { label: 'New Appointment', icon: 'fa-calendar-plus', path: '/appointments/new', color: '#2563eb' },
                  { label: 'New Customer', icon: 'fa-user-plus', path: '/customers/new', color: '#8b5cf6' },
                  { label: 'New Invoice', icon: 'fa-cash-register', path: '/billing/new', color: '#0d9488' },
                  { label: 'Appointments', icon: 'fa-calendar-alt', path: '/appointments', color: '#3b82f6' },
                ],
                [
                  { label: 'Customers', icon: 'fa-users', path: '/customers', color: '#10b981' },
                  { label: 'Patients', icon: 'fa-paw', path: '/pets', color: '#f59e0b' },
                  { label: 'Billing', icon: 'fa-file-invoice-dollar', path: '/billing', color: '#8b5cf6' },
                ],
              ].map((column, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flexShrink: 0, alignSelf: 'center' }}>
                  {column.map(action => (
                    <button
                      key={action.label}
                      onClick={() => navigate(action.path)}
                      className="dashboard-quick-action-btn"
                      style={{ '--qa-color': action.color }}
                    >
                      <i className={`fas ${action.icon}`}></i>
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* Main Dashboard Split View */}
            <div style={{
              ...styles.mainGrid,
              gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr'
            }}>
              <div style={styles.appointmentsSection}>
                <div style={styles.sidebarCard}>
                  <div style={styles.sidebarHeader}>
                    <h4 style={styles.sidebarTitle}>Today's Schedule</h4>
                    <a onClick={() => navigate('/appointments', { state: { viewDate: new Date().toISOString().split('T')[0], openDayModal: true } })} style={styles.viewAllLink}>View today's full schedule →</a>
                  </div>
                  {stats.recentAppointments.length === 0 ? (
                    <div style={{...styles.emptyState, padding: '1.5rem 0 0'}}>
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
                            <th style={{...styles.th, textAlign: 'center'}}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recentAppointments.map((appointment) => {
                            const badge = getStatusBadge(appointment.status);
                            const isEmergency = appointment.appointment_type?.toLowerCase().includes('emergency') || appointment.appointment_type?.toLowerCase().includes('urgent');
                            return (
                              <tr key={appointment.appointment_id} style={{...styles.tr, backgroundColor: isEmergency ? '#fff1f2' : undefined, borderLeft: isEmergency ? '3px solid #ef4444' : undefined}}>
                                <td style={styles.td}><span style={styles.timeText}>{formatTime(appointment.appointment_time)}</span></td>
                                <td style={styles.td}>
                                  <div style={styles.patientCell}>
                                    <div style={{...styles.petAvatar, backgroundColor: isEmergency ? '#fee2e2' : undefined, color: isEmergency ? '#dc2626' : undefined}}><i className="fas fa-paw"></i></div>
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
                                <td style={{...styles.td, textAlign: 'center'}}>
                                  <button
                                    onClick={() => navigate('/appointments', { state: { highlightAppointmentId: appointment.appointment_id, appointmentDate: appointment.appointment_date, appointmentStatus: appointment.status } })}
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
              </div>

              {/* Sidebar */}
              <div style={styles.sidebar}>
                {/* Invoices to Generate */}
                <div style={styles.sidebarCard}>
                  <div style={styles.sidebarHeader}>
                    <h4 style={styles.sidebarTitle}>Invoices to Generate</h4>
                    <span style={{...styles.badge2, backgroundColor: stats.pendingInvoiceAppointments.length > 0 ? '#fef3c7' : '#f3f4f6', color: stats.pendingInvoiceAppointments.length > 0 ? '#92400e' : '#6b7280'}}>
                      {stats.pendingInvoiceAppointments.length} awaiting invoice
                    </span>
                  </div>
                  <div style={styles.upcomingList}>
                    {stats.pendingInvoiceAppointments.length === 0 ? (
                      <p style={styles.emptyTextSmall}>No completed appointments are waiting for an invoice</p>
                    ) : (
                      stats.pendingInvoiceAppointments.map((appointment) => (
                        <div key={appointment.appointment_id} style={{...styles.upcomingItem, alignItems: 'flex-start'}}>
                          <div style={{...styles.upcomingIcon, backgroundColor: '#fef3c7', color: '#92400e'}}>
                            <i className="fas fa-file-invoice"></i>
                          </div>
                          <div style={{flex: 1, minWidth: 0}}>
                            <div style={styles.upcomingPet}>{appointment.pet_name}</div>
                            <div style={styles.upcomingDate}>
                              {new Date((appointment.completed_at || appointment.appointment_date).split('T')[0] + 'T00:00:00').toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                              {appointment.customer_first_name && ` • ${appointment.customer_first_name} ${appointment.customer_last_name}`}
                            </div>
                          </div>
                          <button
                            onClick={() => navigate('/billing/new', {
                              state: {
                                appointmentData: {
                                  appointment_id: appointment.appointment_id,
                                  customer_id: appointment.customer_id,
                                  customer_first_name: appointment.customer_first_name,
                                  customer_last_name: appointment.customer_last_name,
                                  pet_name: appointment.pet_name,
                                  species: appointment.species,
                                  appointment_type: appointment.appointment_type,
                                  appointment_date: appointment.appointment_date,
                                  appointment_time: appointment.appointment_time,
                                  veterinarian_name: appointment.veterinarian_name,
                                  reason: appointment.reason
                                }
                              }
                            })}
                            style={{...styles.viewButton, marginLeft: '0.5rem', whiteSpace: 'nowrap'}}
                          >
                            Create Invoice
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Upcoming Appointments */}
                <div style={styles.sidebarCard}>
                  <div style={styles.sidebarHeader}>
                    <h4 style={styles.sidebarTitle}>Next 7 Days</h4>
                    <span style={styles.badge2}>{stats.upcomingAppointments.length} upcoming</span>
                  </div>
                  <div style={styles.upcomingList}>
                    {stats.upcomingAppointments.length === 0 ? (
                      <p style={styles.emptyTextSmall}>No appointments in the next 7 days</p>
                    ) : (
                      stats.upcomingAppointments.slice(0, 5).map((apt) => (
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
                    {stats.upcomingAppointments.length > 5 && (
                      <a onClick={() => navigate('/appointments', { state: { openListTab: 'upcoming' } })} style={{...styles.viewAllLink, display: 'block', textAlign: 'center', marginTop: '0.5rem', fontSize: '0.8rem'}}>
                        +{stats.upcomingAppointments.length - 5} more · View all →
                      </a>
                    )}
                  </div>

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

export default ReceptionistDashboard;
