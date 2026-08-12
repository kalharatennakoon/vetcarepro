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

const AdminDashboard = () => {
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
                  Search across customers, pets, appointments, billing, inventory, medical records, staff & suppliers
                </p>
              </div>
              <UniversalSearch />
            </div>

            {/* Stats Cards */}
            <div style={{...styles.statsGrid, gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)'}}>
              {[
                { label: 'TOTAL COLLECTED', value: `Rs. ${parseFloat(stats.adminTotalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: `Today: Rs. ${parseFloat(stats.adminTodayRevenue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, border: '#10b981', iconBg: '#d1fae5', iconColor: '#065f46', icon: 'fa-coins', bg: 'white' },
                { label: 'OUTSTANDING PAYMENTS', value: `Rs. ${parseFloat(stats.adminOutstanding).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: stats.adminOutstandingToday > 0 ? `Due today: Rs. ${parseFloat(stats.adminOutstandingToday).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'None due today', border: stats.adminOutstanding > 0 ? '#f59e0b' : '#e5e7eb', iconBg: '#fef3c7', iconColor: '#d97706', icon: 'fa-file-invoice-dollar', bg: 'white', labelColor: stats.adminOutstanding > 0 ? '#d97706' : '#6b7280' },
                { label: "TODAY'S APPOINTMENTS", value: stats.todayAppointments, sub: [stats.todayCompleted > 0 && `${stats.todayCompleted} completed`, stats.adminTodayInProgress > 0 && `${stats.adminTodayInProgress} in progress`, stats.waitingPatients > 0 && `${stats.waitingPatients} waiting`, stats.todayCancelled > 0 && `${stats.todayCancelled} cancelled`].filter(Boolean).join(' · '), border: '#3b82f6', iconBg: '#dbeafe', iconColor: '#1e40af', icon: 'fa-calendar-check', bg: 'white' },
                { label: 'PENDING INVOICES', value: stats.pendingInvoices, sub: stats.adminPendingDueToday > 0 ? `${stats.adminPendingDueToday} due today` : 'None due today', border: stats.pendingInvoices > 0 ? '#f59e0b' : '#e5e7eb', iconBg: '#fef3c7', iconColor: '#d97706', icon: 'fa-file-invoice', bg: 'white' },
                { label: "TODAY'S EMERGENCIES", value: stats.urgentCases, sub: [stats.adminUrgentCompleted > 0 && `${stats.adminUrgentCompleted} completed`, stats.adminUrgentInProgress > 0 && `${stats.adminUrgentInProgress} in progress`].filter(Boolean).join(' · ') || 'No completions yet', border: stats.urgentCases > 0 ? '#ef4444' : '#e5e7eb', iconBg: '#fee2e2', iconColor: '#dc2626', icon: 'fa-exclamation-triangle', bg: stats.urgentCases > 0 ? '#fff7ed' : 'white', labelColor: stats.urgentCases > 0 ? '#dc2626' : '#6b7280' },
                { label: 'LOW STOCK ALERTS', value: stats.lowStockItems, border: stats.lowStockItems > 0 ? '#8b5cf6' : '#e5e7eb', iconBg: '#ede9fe', iconColor: '#7c3aed', icon: 'fa-boxes', bg: 'white' },
              ].map(card => (
                <div key={card.label} style={{ backgroundColor: card.bg, borderRadius: '12px', padding: '0.85rem 1.1rem', border: '1px solid #e5e7eb', borderLeft: `4px solid ${card.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div>
                    <p style={{ fontSize: '0.7rem', fontWeight: '700', color: card.labelColor || '#6b7280', margin: '0 0 0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: 0, lineHeight: 1 }}>{card.value}</p>
                    {card.sub && <p style={{ fontSize: '0.68rem', color: '#6b7280', margin: '0.25rem 0 0' }}>{card.sub}</p>}
                  </div>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`fas ${card.icon}`} style={{ fontSize: '17px', color: card.iconColor }}></i>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div style={styles.vetQuickActionsContainer}>
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

            {/* Main Dashboard Split View */}
            <div style={{
              ...styles.mainGrid,
              gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr'
            }}>
              <div style={styles.appointmentsSection}>
                {/* Staff Workload Today */}
                <div style={{...styles.sidebarCard, marginBottom: '1.25rem'}}>
                  <div style={styles.sidebarHeader}>
                    <h4 style={styles.sidebarTitle}>Today's Appointment Distribution</h4>
                    <span style={styles.badge2}>{stats.todayAppointments} total</span>
                  </div>
                  {stats.adminStaffWorkload.length === 0 ? (
                    <div style={{...styles.emptyState, padding: '1.25rem 0 0'}}>
                      <p style={{...styles.emptyText, margin: 0}}>No appointments scheduled for today</p>
                    </div>
                  ) : (
                    <div style={styles.tableWrapper}>
                      <table style={styles.table}>
                        <thead style={styles.thead}>
                          <tr>
                            <th style={styles.th}>Veterinarian</th>
                            <th style={{...styles.th, textAlign: 'center'}}>Total</th>
                            <th style={{...styles.th, textAlign: 'center'}}>Completed</th>
                            <th style={{...styles.th, textAlign: 'center'}}>In Progress</th>
                            <th style={{...styles.th, textAlign: 'center'}}>Waiting</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.adminStaffWorkload.map((vet, i) => (
                            <tr key={i} style={styles.tr}>
                              <td style={{...styles.td, fontWeight: '600'}}>{vet.name}</td>
                              <td style={{...styles.td, textAlign: 'center'}}><span style={{fontWeight: '700', color: '#1f2937'}}>{vet.assigned}</span></td>
                              <td style={{...styles.td, textAlign: 'center'}}><span style={{color: '#10b981', fontWeight: '600'}}>{vet.completed}</span></td>
                              <td style={{...styles.td, textAlign: 'center'}}><span style={{color: '#f59e0b', fontWeight: '600'}}>{vet.inProgress}</span></td>
                              <td style={{...styles.td, textAlign: 'center'}}><span style={{color: '#3b82f6', fontWeight: '600'}}>{vet.waiting}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Recent Billing Activity */}
                <div style={{...styles.sidebarCard, marginBottom: '1.25rem'}}>
                  <div style={styles.sidebarHeader}>
                    <h4 style={styles.sidebarTitle}>Recent Billing Activity</h4>
                    <a onClick={() => navigate('/billing')} style={styles.viewAllLink}>View all →</a>
                  </div>
                  {stats.adminRecentBilling.length === 0 ? (
                    <div style={{...styles.emptyState, padding: '1.25rem 0 0'}}>
                      <p style={{...styles.emptyText, margin: 0}}>No billing records yet</p>
                    </div>
                  ) : (
                    <div style={styles.tableWrapper}>
                      <table style={styles.table}>
                        <thead style={styles.thead}>
                          <tr>
                            <th style={styles.th}>Invoice</th>
                            <th style={styles.th}>Customer</th>
                            <th style={{...styles.th, textAlign: 'right'}}>Amount</th>
                            <th style={{...styles.th, textAlign: 'center'}}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.adminRecentBilling.map((bill) => {
                            const today = new Date().toISOString().split('T')[0];
                            const isOverdue = ['unpaid', 'partially_paid'].includes(bill.payment_status) && bill.due_date && bill.due_date.split('T')[0] < today;
                            const statusStyle = bill.payment_status === 'fully_paid'
                              ? { bg: '#d1fae5', color: '#065f46', text: 'Paid' }
                              : bill.payment_status === 'partially_paid' && !isOverdue
                              ? { bg: '#fef3c7', color: '#92400e', text: 'Partial' }
                              : bill.payment_status === 'cancelled'
                              ? { bg: '#f3f4f6', color: '#6b7280', text: 'Cancelled' }
                              : isOverdue
                              ? { bg: '#fee2e2', color: '#991b1b', text: 'Overdue' }
                              : { bg: '#fef9c3', color: '#92400e', text: 'Unpaid' };
                            return (
                              <tr key={bill.bill_id} style={{...styles.tr, cursor: 'pointer'}} onClick={() => navigate(`/billing/${bill.bill_id}`)}>
                                <td style={{...styles.td, fontWeight: '600', color: '#3b82f6'}}>{bill.bill_number}</td>
                                <td style={styles.td}>{bill.customer_name}</td>
                                <td style={{...styles.td, textAlign: 'right', fontWeight: '600'}}>Rs. {parseFloat(bill.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td style={{...styles.td, textAlign: 'center'}}>
                                  <span style={{ backgroundColor: statusStyle.bg, color: statusStyle.color, padding: '0.15rem 0.5rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '700' }}>{statusStyle.text}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Today's Schedule */}
                <div style={styles.sidebarCard}>
                  <div style={styles.sidebarHeader}>
                    <h4 style={styles.sidebarTitle}>Today's Schedule</h4>
                    <a onClick={() => navigate('/appointments', { state: { viewDate: new Date().toISOString().split('T')[0], openDayModal: true } })} style={styles.viewAllLink}>View today's full schedule →</a>
                  </div>
                  {stats.recentAppointments.length === 0 ? (
                    <div style={{...styles.emptyState, padding: '1.25rem 0 0'}}>
                      <p style={{...styles.emptyText, margin: 0}}>No appointments today</p>
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
                                      <div style={styles.petDetail}>{appointment.species}</div>
                                    </div>
                                  </div>
                                </td>
                                <td style={styles.td}>{appointment.veterinarian_name ? `Dr. ${appointment.veterinarian_name}` : <span style={{color: '#9ca3af', fontSize: '0.78rem'}}>Unassigned</span>}</td>
                                <td style={styles.td}><span style={{...styles.badge, backgroundColor: badge.bg, color: badge.color}}>{badge.text}</span></td>
                                <td style={{...styles.td, textAlign: 'center'}}>
                                  <button onClick={() => navigate('/appointments', { state: { highlightAppointmentId: appointment.appointment_id, appointmentDate: appointment.appointment_date, appointmentStatus: appointment.status } })} style={styles.viewButton}>View</button>
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
                {/* Financial Snapshot */}
                <div style={styles.sidebarCard}>
                  <div style={styles.sidebarHeader}>
                    <h4 style={styles.sidebarTitle}>Financial Snapshot</h4>
                    <a onClick={() => navigate('/billing')} style={styles.viewAllLink}>View billing →</a>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[
                      { label: 'This Week', value: stats.adminWeekRevenue, icon: 'fa-calendar-week', color: '#3b82f6', bg: '#eff6ff' },
                      { label: 'This Month', value: stats.adminMonthRevenue, icon: 'fa-calendar-alt', color: '#10b981', bg: '#f0fdf4' },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', backgroundColor: item.bg, borderRadius: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '7px', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <i className={`fas ${item.icon}`} style={{ color: item.color, fontSize: '0.85rem' }}></i>
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.68rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.04em' }}>Revenue — {item.label}</p>
                          <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#111827' }}>Rs. {parseFloat(item.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', backgroundColor: stats.adminOutstandingMonth > 0 ? '#fff7ed' : '#f9fafb', borderRadius: '8px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '7px', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="fas fa-clock" style={{ color: stats.adminOutstandingMonth > 0 ? '#f59e0b' : '#9ca3af', fontSize: '0.85rem' }}></i>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.68rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.04em' }}>Outstanding — This Month</p>
                        <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: stats.adminOutstandingMonth > 0 ? '#d97706' : '#111827' }}>Rs. {parseFloat(stats.adminOutstandingMonth).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    </div>
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

                {/* Invoices to Generate */}
                <div style={styles.sidebarCard}>
                  <div style={styles.sidebarHeader}>
                    <h4 style={styles.sidebarTitle}>Invoices to Generate</h4>
                    <span style={{...styles.badge2, backgroundColor: stats.pendingInvoiceAppointments.length > 0 ? '#fef3c7' : '#f3f4f6', color: stats.pendingInvoiceAppointments.length > 0 ? '#92400e' : '#6b7280'}}>
                      {stats.pendingInvoiceAppointments.length} completed
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

export default AdminDashboard;
