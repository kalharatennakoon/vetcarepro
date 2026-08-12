// Extracted verbatim from the former Dashboard.jsx's fetchDashboardData /
// stats state, so AdminDashboard.jsx, VetDashboard.jsx, and
// ReceptionistDashboard.jsx don't each re-derive the same appointment/
// billing/inventory stat math independently.
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { getPets } from '../services/petService';
import { getCustomers } from '../services/customerService';
import { getMedicalRecords } from '../services/medicalRecordService';
import { getDeferredMedicalReportIds } from '../services/medicalReportQueue';
import inventoryService from '../services/inventoryService';
import { getDiseaseCases } from '../services/diseaseCaseService';

export const useDashboardStats = () => {
  const { user } = useAuth();
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
  pendingInvoiceAppointments: [],
  lowStockItems: 0,
  followUpsCount: 0,
  adminTotalRevenue: 0,
  adminTodayRevenue: 0,
  adminOutstanding: 0,
  adminOutstandingMonth: 0,
  adminOutstandingToday: 0,
  adminWeekRevenue: 0,
  adminMonthRevenue: 0,
  adminTodayInProgress: 0,
  adminUrgentCompleted: 0,
  adminUrgentInProgress: 0,
  adminPendingDueToday: 0,
  adminStaffWorkload: [],
  adminRecentBilling: [],
  recentAppointments: [],
  upcomingAppointments: [],
  followUpCases: [],
  vetWaiting: 0,
  vetCompleted: 0,
  vetUrgent: 0,
  vetScheduleToday: [],
  vetUpcoming: [],
  vetUnassignedToday: [],
  vetUnassignedUpcoming: [],
  vetDeferredMedicalReports: []
});
  const [loading, setLoading] = useState(true);

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
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    const sevenDaysString = sevenDaysLater.getFullYear() + '-' +
      String(sevenDaysLater.getMonth() + 1).padStart(2, '0') + '-' +
      String(sevenDaysLater.getDate()).padStart(2, '0');
    
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
      b.payment_status === 'partially_paid' || b.payment_status === 'unpaid' || b.payment_status === 'overdue'
    );
    const billedAppointmentIds = new Set(
      bills.map(b => b.appointment_id).filter(Boolean)
    );
    const pendingInvoiceAppointments = appointments
      .filter(a => a.status === 'completed' && a.appointment_id && !billedAppointmentIds.has(a.appointment_id))
      .sort((a, b) => {
        const dateA = getLocalDateString(a.completed_at || a.appointment_date || '');
        const dateB = getLocalDateString(b.completed_at || b.appointment_date || '');
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        return (b.completed_at || b.appointment_date || '').localeCompare(a.completed_at || a.appointment_date || '');
      });

    // Vet-specific appointment filtering
    const vetUserId = user?.user_id;
    const vetTodayAppts = todayAppointments.filter(a => a.veterinarian_id === vetUserId);
    const unassignedTodayAppts = todayAppointments.filter(a => !a.veterinarian_id && a.status === 'confirmed');
    const vetUpcomingAppts = appointments.filter(a => {
      if (a.status === 'cancelled' || a.status === 'completed') return false;
      const apptDate = getLocalDateString(a.appointment_date);
      if (apptDate < todayString || apptDate > sevenDaysString) return false;
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
    const deferredMedicalReportIds = new Set(getDeferredMedicalReportIds().map(id => String(id)));
    const vetDeferredMedicalReports = appointments
      .filter(a => a.status === 'completed' && deferredMedicalReportIds.has(String(a.appointment_id)))
      .sort((a, b) => {
        const dateA = getLocalDateString(a.completed_at || a.appointment_date || '');
        const dateB = getLocalDateString(b.completed_at || b.appointment_date || '');
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        return (b.completed_at || b.appointment_date || '').localeCompare(a.completed_at || a.appointment_date || '');
      });

    // Admin extra computations
    const adminTodayInProgress = todayAppointments.filter(a => a.status === 'in_progress').length;
    const adminUrgentCompleted = urgentCases.filter(a => a.status === 'completed').length;
    const adminUrgentInProgress = urgentCases.filter(a => a.status === 'in_progress').length;
    const adminPendingDueToday = pendingBills.filter(b => b.bill_date?.split('T')[0] === todayString).length;
    const adminOutstandingToday = bills
      .filter(b => b.bill_date?.split('T')[0] === todayString && ['unpaid', 'partially_paid'].includes(b.payment_status))
      .reduce((s, b) => s + Math.max(0, parseFloat(b.total_amount || 0) - parseFloat(b.paid_amount || 0)), 0);

    // Admin financial computations
    const weekStart = (() => { const d = new Date(today); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split('T')[0]; })();
    const monthStart = `${todayString.slice(0, 7)}-01`;
    const adminTotalRevenue = bills.reduce((s, b) => s + (parseFloat(b.paid_amount) || 0), 0);
    const adminTodayRevenue = bills.filter(b => b.bill_date?.split('T')[0] === todayString).reduce((s, b) => s + parseFloat(b.paid_amount || 0), 0);
    const adminOutstanding = bills.filter(b => ['unpaid', 'partially_paid'].includes(b.payment_status)).reduce((s, b) => s + Math.max(0, parseFloat(b.total_amount || 0) - parseFloat(b.paid_amount || 0)), 0);
    const adminOutstandingMonth = bills.filter(b => ['unpaid', 'partially_paid'].includes(b.payment_status) && b.bill_date?.split('T')[0] >= monthStart).reduce((s, b) => s + Math.max(0, parseFloat(b.total_amount || 0) - parseFloat(b.paid_amount || 0)), 0);
    const adminWeekRevenue = bills.filter(b => { const d = b.bill_date?.split('T')[0]; return d >= weekStart && d <= todayString; }).reduce((s, b) => s + parseFloat(b.paid_amount || 0), 0);
    const adminMonthRevenue = bills.filter(b => { const d = b.bill_date?.split('T')[0]; return d >= monthStart && d <= todayString; }).reduce((s, b) => s + parseFloat(b.paid_amount || 0), 0);
    const adminStaffWorkload = (() => {
      const map = {};
      todayAppointments.forEach(a => {
        const key = a.veterinarian_id || 'unassigned';
        if (!map[key]) map[key] = { name: a.veterinarian_name ? `Dr. ${a.veterinarian_name}` : 'Unassigned', assigned: 0, completed: 0, inProgress: 0, waiting: 0 };
        map[key].assigned++;
        if (a.status === 'completed') map[key].completed++;
        else if (a.status === 'in_progress') map[key].inProgress++;
        else if (a.status === 'confirmed') map[key].waiting++;
      });
      return Object.values(map).sort((a, b) => b.assigned - a.assigned);
    })();
    const adminRecentBilling = [...bills].sort((a, b) => new Date(b.bill_date) - new Date(a.bill_date)).slice(0, 5);

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
      pendingInvoiceAppointments,
      lowStockItems: lowStockItems.length,
      adminTotalRevenue,
      adminTodayRevenue,
      adminOutstanding,
      adminOutstandingMonth,
      adminOutstandingToday,
      adminWeekRevenue,
      adminMonthRevenue,
      adminTodayInProgress,
      adminUrgentCompleted,
      adminUrgentInProgress,
      adminPendingDueToday,
      adminStaffWorkload,
      adminRecentBilling,
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
      }),
      vetUnassignedUpcoming: unassignedUpcomingAppts.sort((a, b) => {
        const da = getLocalDateString(a.appointment_date), db = getLocalDateString(b.appointment_date);
        return da !== db ? da.localeCompare(db) : (a.appointment_time || '').localeCompare(b.appointment_time || '');
      }).slice(0, 3),
      vetDeferredMedicalReports,
      recentAppointments: [...todayAppointments].sort((a, b) => (a.appointment_time || '').localeCompare(b.appointment_time || '')),
      upcomingAppointments: appointments.filter(a => {
        if (a.status === 'cancelled' || a.status === 'completed') return false;
        const appointmentDate = getLocalDateString(a.appointment_date);
        if (appointmentDate < todayString || appointmentDate > sevenDaysString) return false;
        if (appointmentDate === todayString) {
          const [h, m] = (a.appointment_time || '00:00').split(':').map(Number);
          return h * 60 + m > currentTime;
        }
        return true;
      }).sort((a, b) => {
        const dateA = getLocalDateString(a.appointment_date);
        const dateB = getLocalDateString(b.appointment_date);
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return (a.appointment_time || '').localeCompare(b.appointment_time || '');
      })
    });
  } catch (err) {
    console.error('Failed to fetch dashboard data:', err);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return { stats, loading, refetch: fetchDashboardData };
};
