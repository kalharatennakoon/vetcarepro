import { useState, useEffect } from 'react';
import UniversalSearch from '../components/UniversalSearch';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { updateAppointment } from '../services/appointmentService';
import Layout from '../components/Layout';
import PasswordChangeModal from '../components/PasswordChangeModal';
import AiDailyBriefing from '../components/dashboard/AiDailyBriefing';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { formatTime, getStatusBadge } from './dashboard/dashboardUtils';
import { styles } from './dashboard/dashboardStyles';

const VetDashboard = () => {
  const { user, logout, refreshUser } = useAuth();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const { stats, loading, refetch } = useDashboardStats();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [upcomingPreview, setUpcomingPreview] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const pendingAppointment = location.state?.openMedicalReportNow && location.state?.appointmentData;
    if (!pendingAppointment) return;

    navigate('/medical-records/new', {
      state: {
        appointmentData: location.state.appointmentData
      },
      replace: true
    });
  }, [location.state, navigate]);

  const handlePasswordChangeSuccess = async () => {
    await refreshUser();
  };

  const handlePasswordChangeLogout = () => {
    logout();
    navigate('/staff/login');
  };

  const handleAssignToMe = async (appointment) => {
    try {
      await updateAppointment(appointment.appointment_id, { veterinarian_id: user.user_id });
      showSuccess(`Appointment assigned to you`);
      refetch();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to assign appointment');
    }
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
            <AiDailyBriefing />

            {/* Universal Search */}
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
                  Search across customers, pets, appointments, medical records & disease cases
                </p>
              </div>
              <UniversalSearch />
            </div>

            {/* Stats Cards */}
            <div style={styles.statsGrid}>
              {[
                { label: 'MY PATIENTS WAITING', value: stats.vetWaiting, border: '#3b82f6', iconBg: '#dbeafe', iconColor: '#1e40af', icon: 'fa-user-clock', bg: 'white' },
                { label: 'MY COMPLETED TODAY', value: stats.vetCompleted, border: '#10b981', iconBg: '#d1fae5', iconColor: '#065f46', icon: 'fa-check-circle', bg: 'white' },
                { label: 'MY EMERGENCY CASES', value: stats.vetUrgent, border: stats.vetUrgent > 0 ? '#ef4444' : '#e5e7eb', iconBg: '#fee2e2', iconColor: '#dc2626', icon: 'fa-exclamation-triangle', bg: stats.vetUrgent > 0 ? '#fff7ed' : 'white', labelColor: stats.vetUrgent > 0 ? '#dc2626' : '#6b7280' },
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
            </div>

            {/* Quick Actions */}
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

            {/* Main Dashboard Split View */}
            <div style={{
              ...styles.mainGrid,
              gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr'
            }}>
              <div style={styles.appointmentsSection}>
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
              </div>

              {/* Sidebar */}
              <div style={styles.sidebar}>
                {/* Medical Reports to Create Later */}
                <div style={styles.sidebarCard}>
                  <div style={styles.sidebarHeader}>
                    <h4 style={styles.sidebarTitle}>Medical Reports to Create Later</h4>
                    <span style={{...styles.badge2, backgroundColor: stats.vetDeferredMedicalReports.length > 0 ? '#dbeafe' : '#f3f4f6', color: stats.vetDeferredMedicalReports.length > 0 ? '#1d4ed8' : '#6b7280'}}>
                      {stats.vetDeferredMedicalReports.length} pending
                    </span>
                  </div>
                  <div style={styles.upcomingList}>
                    {stats.vetDeferredMedicalReports.length === 0 ? (
                      <p style={styles.emptyTextSmall}>No completed appointments are waiting for a medical report</p>
                    ) : (
                      stats.vetDeferredMedicalReports.map((appointment) => (
                        <div key={appointment.appointment_id} style={styles.upcomingItem}>
                          <div style={{...styles.upcomingIcon, backgroundColor: '#dbeafe', color: '#1d4ed8'}}>
                            <i className="fas fa-notes-medical"></i>
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
                            onClick={() => navigate('/medical-records/new', {
                              state: {
                                appointmentData: {
                                  appointment_id: appointment.appointment_id,
                                  pet_id: appointment.pet_id,
                                  veterinarian_id: appointment.veterinarian_id,
                                  appointment_date: appointment.appointment_date,
                                  appointment_time: appointment.appointment_time,
                                  customer_id: appointment.customer_id,
                                  customer_first_name: appointment.customer_first_name,
                                  customer_last_name: appointment.customer_last_name,
                                  pet_name: appointment.pet_name,
                                  species: appointment.species,
                                  veterinarian_name: appointment.veterinarian_name,
                                  reason: appointment.reason
                                }
                              }
                            })}
                            style={{...styles.viewButton, marginLeft: '0.5rem', whiteSpace: 'nowrap'}}
                          >
                            Create Medical Report
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Follow-up Cases */}
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

                {/* Upcoming Appointments */}
                <div style={styles.sidebarCard}>
                  <div style={styles.sidebarHeader}>
                    <h4 style={styles.sidebarTitle}>My Next 7 Days</h4>
                    <span style={styles.badge2}>{stats.vetUpcoming.length} upcoming</span>
                  </div>
                  <div style={styles.upcomingList}>
                    {stats.vetUpcoming.length === 0 ? (
                      <p style={styles.emptyTextSmall}>No appointments in the next 7 days</p>
                    ) : (
                      stats.vetUpcoming.slice(0, 5).map((apt) => (
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
                    {stats.vetUpcoming.length > 5 && (
                      <a onClick={() => navigate('/appointments', { state: { openListTab: 'upcoming' } })} style={{...styles.viewAllLink, display: 'block', textAlign: 'center', marginTop: '0.5rem', fontSize: '0.8rem'}}>
                        +{stats.vetUpcoming.length - 5} more · View all →
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

export default VetDashboard;
