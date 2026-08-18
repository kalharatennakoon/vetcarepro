import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useNotification } from '../context/NotificationContext';
import { getMyPets } from '../services/customerPortalService';
import {
  getMyAppointments,
  getVeterinarians,
  getAvailability,
  createMyAppointment,
  updateMyAppointment,
  cancelMyAppointment
} from '../services/customerAppointmentService';
import AppointmentDatePicker from '../components/AppointmentDatePicker';
import '../styles/PetOwnerProfile.css';
import '../styles/PetOwnerAppointments.css';

const MIN_LEAD_HOURS = 48;
// Surgery/emergency need clinical triage by staff, not self-service booking -
// owners are directed to call the clinic for those instead.
const APPOINTMENT_TYPES = [
  { value: 'checkup', label: 'Checkup' },
  { value: 'vaccination', label: 'Vaccination' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'consultation', label: 'Consultation' }
];
const ACTIVE_STATUSES = ['scheduled', 'confirmed'];

const emptyForm = { appointment_id: null, pet_id: '', appointment_type: '', appointment_date: '', appointment_time: '', veterinarian_id: '', reason: '' };

// DATE columns round-trip as full ISO timestamps ("2026-08-10T00:00:00.000Z"),
// TIME columns as "HH:MM:SS" - both need trimming to plain YYYY-MM-DD / HH:MM.
const toDateStr = (value) => (value ? String(value).slice(0, 10) : '');
const toTimeStr = (value) => (value ? String(value).slice(0, 5) : '');

const minBookableDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10);
};

const isAtLeastLeadTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return false;
  const target = new Date(`${dateStr}T${timeStr}:00`);
  return (target.getTime() - Date.now()) / (1000 * 60 * 60) >= MIN_LEAD_HOURS;
};

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(`${toDateStr(value)}T00:00:00`).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatTime = (value) => {
  const t = toTimeStr(value);
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

const formatType = (type) => (type || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const statusBadgeClass = (status) => `po-appt-status po-appt-status-${status}`;

const PetOwnerAppointments = () => {
  const { customer, logout } = useCustomerAuth();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const [pets, setPets] = useState([]);
  const [veterinarians, setVeterinarians] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [form, setForm] = useState(emptyForm);
  const [availability, setAvailability] = useState(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancelModal, setCancelModal] = useState({ open: false, appointment: null });
  const [cancelling, setCancelling] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [petsResult, apptResult, vetsResult] = await Promise.all([getMyPets(), getMyAppointments(), getVeterinarians()]);
      setPets(petsResult.data.pets || []);
      setAppointments(apptResult.data.appointments || []);
      setVeterinarians(vetsResult.data.veterinarians || []);
    } catch (err) {
      setListError(err.response?.data?.message || 'Unable to load your appointments right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!form.appointment_date) {
      setAvailability(null);
      return;
    }
    let cancelled = false;
    setAvailabilityLoading(true);
    getAvailability(form.appointment_date, form.veterinarian_id || null)
      .then((result) => { if (!cancelled) setAvailability(result.data); })
      .catch(() => { if (!cancelled) setAvailability(null); })
      .finally(() => { if (!cancelled) setAvailabilityLoading(false); });
    return () => { cancelled = true; };
  }, [form.appointment_date, form.veterinarian_id]);

  const handleSignOut = async () => {
    await logout();
    navigate('/');
  };

  const navItem = (path, icon, label) => (
    <a
      href={path}
      className={`po-profile-nav-item ${location.pathname === path ? 'active' : ''}`}
      onClick={(e) => { e.preventDefault(); navigate(path); }}
    >
      <i className={`fas ${icon}`}></i> {label}
    </a>
  );

  const resetForm = () => {
    setForm(emptyForm);
    setAvailability(null);
    setFormError('');
  };

  const handleDateChange = (value) => {
    setFormError('');
    setForm({ ...form, appointment_date: value, appointment_time: '' });
  };

  const handleVetChange = (value) => {
    setFormError('');
    setForm({ ...form, veterinarian_id: value, appointment_time: '' });
  };

  const handleReschedule = (appt) => {
    setForm({
      appointment_id: appt.appointment_id,
      pet_id: appt.pet_id,
      appointment_type: appt.appointment_type,
      appointment_date: toDateStr(appt.appointment_date),
      appointment_time: toTimeStr(appt.appointment_time),
      veterinarian_id: appt.veterinarian_id ? String(appt.veterinarian_id) : '',
      reason: appt.reason
    });
    setFormError('');
    document.getElementById('po-appt-form-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openCancelModal = (appt) => setCancelModal({ open: true, appointment: appt });
  const closeCancelModal = () => setCancelModal({ open: false, appointment: null });

  const confirmCancelAppointment = async () => {
    const appt = cancelModal.appointment;
    if (!appt) return;
    setCancelling(true);
    try {
      await cancelMyAppointment(appt.appointment_id);
      showSuccess('Appointment cancelled successfully.');
      closeCancelModal();
      await loadData();
      if (form.appointment_id === appt.appointment_id) resetForm();
    } catch (err) {
      showError(err.response?.data?.message || 'Unable to cancel that appointment right now.');
    } finally {
      setCancelling(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.pet_id || !form.appointment_date || !form.appointment_time || !form.appointment_type || !form.reason.trim()) {
      setFormError('Please fill in every field, including a time slot.');
      return;
    }
    if (!isAtLeastLeadTime(form.appointment_date, form.appointment_time)) {
      setFormError(`Appointments must be booked at least ${MIN_LEAD_HOURS} hours in advance.`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        pet_id: form.pet_id,
        appointment_date: form.appointment_date,
        appointment_time: form.appointment_time,
        appointment_type: form.appointment_type,
        veterinarian_id: form.veterinarian_id || null,
        reason: form.reason.trim()
      };

      const successMessage = form.appointment_id ? 'Appointment rescheduled successfully.' : 'Appointment booked successfully.';
      if (form.appointment_id) {
        await updateMyAppointment(form.appointment_id, payload);
      } else {
        await createMyAppointment(payload);
      }
      setForm(emptyForm);
      setAvailability(null);
      showSuccess(successMessage);
      await loadData();
    } catch (err) {
      showError(err.response?.data?.message || 'Unable to save that appointment right now.');
    } finally {
      setSubmitting(false);
    }
  };

  const upcoming = appointments.filter((a) => ACTIVE_STATUSES.includes(a.status));
  const past = appointments.filter((a) => !ACTIVE_STATUSES.includes(a.status));

  const renderAppointmentRow = (appt) => {
    const editable = ACTIVE_STATUSES.includes(appt.status) && isAtLeastLeadTime(toDateStr(appt.appointment_date), toTimeStr(appt.appointment_time));
    return (
      <div key={appt.appointment_id} className="po-appt-row">
        <div className="po-appt-row-main">
          <div className="po-appt-row-date">
            <span className="po-appt-row-date-day">{formatDate(appt.appointment_date)}</span>
            <span className="po-appt-row-date-time">{formatTime(appt.appointment_time)}</span>
          </div>
          <div className="po-appt-row-info">
            <p className="po-appt-row-pet">{appt.pet_name} <span className="po-appt-row-type">&middot; {formatType(appt.appointment_type)}</span></p>
            <p className="po-appt-row-reason">{appt.reason}</p>
            <p className="po-appt-row-vet">
              <i className="fas fa-user-doctor"></i> {appt.veterinarian_name ? `Dr. ${appt.veterinarian_name}` : 'No preference'}
            </p>
          </div>
        </div>
        <div className="po-appt-row-actions">
          <span className={statusBadgeClass(appt.status)}>{formatType(appt.status)}</span>
          {editable && (
            <>
              <button type="button" className="po-appt-btn-link" onClick={() => handleReschedule(appt)}>
                <i className="fas fa-calendar-alt"></i> Reschedule
              </button>
              <button
                type="button"
                className="po-appt-btn-link po-appt-btn-link-danger"
                onClick={() => openCancelModal(appt)}
              >
                <i className="fas fa-times"></i> Cancel
              </button>
            </>
          )}
          {!editable && ACTIVE_STATUSES.includes(appt.status) && (
            <span className="po-appt-locked-note">Within {MIN_LEAD_HOURS}h &mdash; contact the clinic to change</span>
          )}
        </div>
      </div>
    );
  };

  const initials = customer ? `${customer.first_name?.charAt(0) || ''}${customer.last_name?.charAt(0) || ''}` : '';
  const memberSince = customer?.created_at ? new Date(customer.created_at).getFullYear() : null;

  return (
    <div className="po-profile-page">
      <header className="po-profile-header">
        <div className="po-profile-header-left">
          <div className="po-profile-header-logo-icon">
            <i className="fas fa-paw"></i>
          </div>
          <div>
            <h2 className="po-profile-header-title">VetCare Pro</h2>
            <span className="po-profile-header-badge">Pet Owner</span>
          </div>
        </div>
        <div className="po-profile-header-right">
          {customer && <span className="po-profile-header-username">{customer.first_name} {customer.last_name}</span>}
        </div>
      </header>

      <div className="po-profile-body">
        <aside className="po-profile-sidebar">
          <div className="po-profile-avatar">{initials}</div>
          <h3 className="po-profile-sidebar-name">{customer?.first_name} {customer?.last_name}</h3>
          {memberSince && <p className="po-profile-sidebar-meta">Member since {memberSince}</p>}

          <nav className="po-profile-nav">
            {navItem('/pet-owner/profile', 'fa-user-circle', 'My Profile')}
            {navItem('/pet-owner/appointments', 'fa-calendar-check', 'Appointments')}
            {navItem('/pet-owner/ai-photo-guidance', 'fa-camera', 'AI Visual Care Guidance')}
            {navItem('/pet-owner/change-password', 'fa-lock', 'Change Password')}
          </nav>

          <button type="button" className="po-profile-signout" onClick={handleSignOut}>
            <i className="fas fa-sign-out-alt"></i> Sign Out
          </button>
        </aside>

        <main className="po-profile-main">
          <div className="po-profile-welcome">
            <h1>Appointments</h1>
            <p>Book, reschedule, or cancel appointments for your pets. Changes need at least {MIN_LEAD_HOURS} hours' notice.</p>
          </div>

          <section id="po-appt-form-card" className="po-profile-card">
            <h2 className="po-profile-section-title">
              <i className={`fas ${form.appointment_id ? 'fa-calendar-alt' : 'fa-calendar-plus'}`}></i>
              {form.appointment_id ? 'Reschedule Appointment' : 'Book New Appointment'}
            </h2>

            {formError && <p className="po-profile-error"><i className="fas fa-exclamation-circle"></i> {formError}</p>}

            <form onSubmit={handleSubmit} className="po-appt-form">
              <div className="po-appt-form-grid">
                <div className="po-appt-field">
                  <label>Pet</label>
                  <select
                    value={form.pet_id}
                    onChange={(e) => setForm({ ...form, pet_id: e.target.value })}
                    required
                  >
                    <option value="">Select a pet</option>
                    {pets.map((pet) => (
                      <option key={pet.pet_id} value={pet.pet_id}>{pet.pet_name}</option>
                    ))}
                  </select>
                </div>

                <div className="po-appt-field">
                  <label>Appointment Type</label>
                  <select
                    value={form.appointment_type}
                    onChange={(e) => setForm({ ...form, appointment_type: e.target.value })}
                    required
                  >
                    <option value="">Select a type</option>
                    {APPOINTMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <span className="po-appt-field-hint">Need surgery or an emergency visit? Please call the clinic directly.</span>
                </div>

                <div className="po-appt-field">
                  <label>Preferred Veterinarian</label>
                  <select
                    value={form.veterinarian_id}
                    onChange={(e) => handleVetChange(e.target.value)}
                  >
                    <option value="">No preference</option>
                    {veterinarians.map((vet) => (
                      <option key={vet.veterinarian_id} value={vet.veterinarian_id}>
                        Dr. {vet.first_name} {vet.last_name}{vet.specialization ? ` — ${vet.specialization}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="po-appt-field">
                  <label>Date</label>
                  <AppointmentDatePicker
                    value={form.appointment_date}
                    onChange={handleDateChange}
                    minDate={minBookableDate()}
                  />
                </div>

                <div className="po-appt-field po-appt-field-wide">
                  <label>Reason for Visit <span className="po-appt-required">*</span></label>
                  <textarea
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    placeholder="Briefly describe the reason for this visit"
                    rows={2}
                    required
                  />
                </div>
              </div>

              <div className="po-appt-field po-appt-field-wide">
                <label>Time Slot</label>
                {!form.appointment_date && <p className="po-profile-muted">Choose a date to see available times.</p>}
                {form.appointment_date && availabilityLoading && (
                  <div className="po-profile-loading"><span className="po-profile-spinner"></span> Checking availability...</div>
                )}
                {form.appointment_date && !availabilityLoading && availability && !availability.isClinicDay && (
                  <p className="po-profile-muted">The clinic is closed that day (open Monday&ndash;Saturday, 9:00 AM&ndash;6:30 PM).</p>
                )}
                {form.appointment_date && !availabilityLoading && availability?.isClinicDay && (
                  <div className="po-appt-slot-grid">
                    {availability.slots.map((slot) => {
                      const hasVet = Boolean(form.veterinarian_id);
                      const capacityLabel = !slot.meetsLeadTime
                        ? 'Too soon'
                        : hasVet
                          ? (slot.available ? 'Available' : 'Booked')
                          : `${slot.remainingCapacity} left`;
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!slot.available}
                          className={`po-appt-slot ${form.appointment_time === slot.time ? 'selected' : ''} ${!slot.available ? 'full' : ''}`}
                          onClick={() => setForm({ ...form, appointment_time: slot.time })}
                          title={!slot.meetsLeadTime ? `Less than ${MIN_LEAD_HOURS}h away` : (!slot.available ? (hasVet ? 'This vet is already booked' : 'Fully booked') : capacityLabel)}
                        >
                          <span className="po-appt-slot-time">{formatTime(slot.time)}</span>
                          <span className="po-appt-slot-capacity">{capacityLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="po-appt-form-actions">
                {form.appointment_id && (
                  <button type="button" className="po-appt-btn po-appt-btn-secondary" onClick={resetForm} disabled={submitting}>
                    Cancel Edit
                  </button>
                )}
                <button type="submit" className="po-appt-btn po-appt-btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : (form.appointment_id ? 'Save Changes' : 'Book Appointment')}
                </button>
              </div>
            </form>
          </section>

          <section className="po-profile-card">
            <h2 className="po-profile-section-title"><i className="fas fa-calendar-check"></i> My Appointments</h2>

            {loading && <div className="po-profile-loading"><span className="po-profile-spinner"></span> Loading your appointments...</div>}
            {listError && <p className="po-profile-error"><i className="fas fa-exclamation-circle"></i> {listError}</p>}

            {!loading && !listError && appointments.length === 0 && (
              <div className="po-profile-empty">
                <i className="fas fa-calendar-times"></i>
                <p>You don&rsquo;t have any appointments yet.</p>
                <span>Book one above to get started.</span>
              </div>
            )}

            {!loading && upcoming.length > 0 && (
              <div className="po-appt-list">
                <h3 className="po-appt-list-title">Upcoming</h3>
                {upcoming.map(renderAppointmentRow)}
              </div>
            )}

            {!loading && past.length > 0 && (
              <div className="po-appt-list">
                <h3 className="po-appt-list-title">Past &amp; Cancelled</h3>
                {past.map(renderAppointmentRow)}
              </div>
            )}
          </section>
        </main>
      </div>

      {cancelModal.open && cancelModal.appointment && (
        <div className="po-appt-modal-overlay" onClick={closeCancelModal}>
          <div className="po-appt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="po-appt-modal-header">
              <h3><i className="fas fa-times-circle"></i> Cancel Appointment</h3>
              <button type="button" className="po-appt-modal-close" onClick={closeCancelModal} aria-label="Close">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="po-appt-modal-body">
              <p>
                Cancel the {formatType(cancelModal.appointment.appointment_type)} appointment for{' '}
                <strong>{cancelModal.appointment.pet_name}</strong> on{' '}
                <strong>{formatDate(cancelModal.appointment.appointment_date)}</strong> at{' '}
                <strong>{formatTime(cancelModal.appointment.appointment_time)}</strong>?
              </p>
              <p className="po-appt-modal-note">This can&rsquo;t be undone. You&rsquo;ll need to book a new appointment if you change your mind.</p>
            </div>
            <div className="po-appt-modal-actions">
              <button type="button" className="po-appt-btn po-appt-btn-secondary" onClick={closeCancelModal} disabled={cancelling}>
                Keep Appointment
              </button>
              <button type="button" className="po-appt-btn po-appt-btn-danger" onClick={confirmCancelAppointment} disabled={cancelling}>
                {cancelling ? 'Cancelling...' : 'Cancel Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PetOwnerAppointments;
