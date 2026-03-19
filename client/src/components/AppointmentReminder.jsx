import { useEffect, useRef } from 'react';
import { getAppointments } from '../services/appointmentService';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

const REMINDER_OFFSET_MS  = 30 * 60 * 1000; // 30 minutes before appointment
const REFETCH_INTERVAL_MS =  2 * 60 * 1000; // re-fetch every 2 min to catch new appointments

const formatTime12 = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
};

const AppointmentReminder = () => {
  const { showWarning } = useNotification();
  const { user } = useAuth();
  const notifiedRef  = useRef(new Set());
  const timeoutsRef  = useRef([]);

  useEffect(() => {
    if (!user || !['receptionist', 'veterinarian', 'admin'].includes(user.role)) return;

    let cancelled = false;

    const clearPendingTimeouts = () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };

    const schedule = async () => {
      clearPendingTimeouts();
      try {
        const today = new Date().toISOString().split('T')[0];
        const response = await getAppointments({ date: today });
        if (cancelled) return;

        const appointments = response.data?.appointments || [];
        const now = Date.now();

        appointments.forEach((appt) => {
          if (appt.status === 'cancelled' || appt.status === 'completed') return;
          if (user.role === 'veterinarian' && appt.veterinarian_id !== user.user_id) return;

          const key = `${appt.appointment_id}-${today}`;
          if (notifiedRef.current.has(key)) return;

          const [h, m] = appt.appointment_time.split(':').map(Number);
          const apptMs    = new Date().setHours(h, m, 0, 0);
          const reminderMs = apptMs - REMINDER_OFFSET_MS;
          const delay      = reminderMs - now;

          const fire = () => {
            if (cancelled) return;
            notifiedRef.current.add(key);
            showWarning(
              `Reminder: Appointment in 30 min — ${appt.pet_name} (${appt.customer_first_name} ${appt.customer_last_name}) at ${formatTime12(appt.appointment_time)}, ${appt.appointment_type}`,
              0
            );
          };

          if (delay > 0) {
            // Reminder is in the future — schedule at the exact millisecond
            const tid = setTimeout(fire, delay);
            timeoutsRef.current.push(tid);
          } else if (apptMs > now) {
            // Reminder window passed but appointment hasn't started — fire immediately
            fire();
          }
        });
      } catch {
        // silently ignore network errors
      }
    };

    // Re-schedule when tab becomes visible (fixes browser timer throttling on hidden tabs)
    const onVisibilityChange = () => {
      if (!document.hidden) schedule();
    };

    schedule();
    const interval = setInterval(schedule, REFETCH_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(interval);
      clearPendingTimeouts();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user]);

  return null;
};

export default AppointmentReminder;
