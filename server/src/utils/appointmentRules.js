/**
 * Appointment Booking Rules (Pet Owner Portal)
 * Centralizes the business rules for self-service booking so the
 * controller and the availability endpoint stay in sync:
 *  - Clinic is open Monday-Saturday, 09:00-18:30
 *  - Up to MAX_CONCURRENT_APPOINTMENTS appointments may share the same
 *    date/time slot (v1 stand-in for "a vet is free") - capacity is
 *    checked by counting rows, not by assigning a specific vet
 *  - Owners can only create/update/reschedule/cancel an appointment that
 *    is at least MIN_LEAD_HOURS away, and can't move a slot to less than
 *    MIN_LEAD_HOURS away either
 */

export const CLINIC_OPEN_TIME = '09:00';
export const CLINIC_CLOSE_TIME = '18:30';
export const SLOT_INTERVAL_MINUTES = 30;
export const APPOINTMENT_DURATION_MINUTES = 30;
export const MAX_CONCURRENT_APPOINTMENTS = 3;
export const MIN_LEAD_HOURS = 48;

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// pg returns DATE columns as JS Date objects and TIME columns as "HH:MM:SS"
// strings - callers may pass either a raw DB row's fields or plain request
// body strings, so normalize both to "YYYY-MM-DD"/"HH:MM" before use.
const normalizeDate = (date) => (date instanceof Date ? date.toISOString() : String(date)).slice(0, 10);
const normalizeTime = (time) => String(time).slice(0, 5);

/** Monday(1) - Saturday(6); Sunday(0) is closed. */
export const isClinicOpenDay = (date) => {
  const day = new Date(`${normalizeDate(date)}T00:00:00`).getDay();
  return day >= 1 && day <= 6;
};

export const isWithinClinicHours = (timeStr, durationMinutes = APPOINTMENT_DURATION_MINUTES) => {
  const start = toMinutes(timeStr);
  const end = start + durationMinutes;
  return start >= toMinutes(CLINIC_OPEN_TIME) && end <= toMinutes(CLINIC_CLOSE_TIME);
};

/** All bookable slot start times for a day, e.g. "09:00", "09:30", ... */
export const generateTimeSlots = () => {
  const slots = [];
  const open = toMinutes(CLINIC_OPEN_TIME);
  const lastStart = toMinutes(CLINIC_CLOSE_TIME) - APPOINTMENT_DURATION_MINUTES;
  for (let t = open; t <= lastStart; t += SLOT_INTERVAL_MINUTES) {
    const h = String(Math.floor(t / 60)).padStart(2, '0');
    const m = String(t % 60).padStart(2, '0');
    slots.push(`${h}:${m}`);
  }
  return slots;
};

export const hoursUntil = (date, time) => {
  const target = new Date(`${normalizeDate(date)}T${normalizeTime(time)}:00`);
  return (target.getTime() - Date.now()) / (1000 * 60 * 60);
};

export const meetsLeadTime = (date, time) => hoursUntil(date, time) >= MIN_LEAD_HOURS;
