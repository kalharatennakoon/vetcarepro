import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useNotification } from '../context/NotificationContext';
import { getMyPets } from '../services/customerPortalService';
import {
  submitPhotoGuidance,
  getPhotoGuidanceStatus,
  listPhotoGuidanceHistory
} from '../services/petPhotoGuidanceService';
import { formatMessageContent } from '../utils/aiChatFormat';
import '../styles/PetOwnerProfile.css';
import '../styles/PetOwnerAppointments.css';
import '../styles/PetOwnerAIPhotoGuidance.css';

// Same markdown-ish rendering (paragraphs, bullets, bold) used by the guest/
// pet-owner/staff chat surfaces, so the AI's guidance shows up the way it
// was actually written instead of being flattened into one paragraph.
const renderGuidance = (content) =>
  formatMessageContent(content, { listClassName: 'po-photo-list' });

// AI generation takes ~3 minutes on a vision-capable local model - this is an
// async submit-then-poll flow, not a blocking spinner. See
// ml/scripts/rag/photo_guidance.py for why.
const POLL_INTERVAL_MS = 10 * 1000;
const JOB_STORAGE_KEY = 'po_photo_guidance_job_id';
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const VALID_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

const formatWhen = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const statusLabel = {
  pending: 'Waiting to start',
  processing: 'Analyzing photo…',
  completed: 'Ready',
  failed: 'Failed'
};

const statusIcon = {
  pending: 'fa-clock',
  processing: 'fa-spinner fa-spin',
  completed: 'fa-circle-check',
  failed: 'fa-circle-exclamation'
};

const PetOwnerAIPhotoGuidance = () => {
  const { customer, logout } = useCustomerAuth();
  const { showError } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const [pets, setPets] = useState([]);
  const [petId, setPetId] = useState('');
  const [note, setNote] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [job, setJob] = useState(null);
  const [history, setHistory] = useState([]);
  const pollRef = useRef(null);

  const loadPets = useCallback(async () => {
    try {
      const result = await getMyPets();
      const myPets = result.data.pets || [];
      setPets(myPets);
      setPetId((current) => current || myPets[0]?.pet_id || '');
    } catch (err) {
      showError(err.response?.data?.message || 'Unable to load your pets right now.');
    }
  }, [showError]);

  const loadHistory = useCallback(async (forPetId) => {
    if (!forPetId) return;
    try {
      const result = await listPhotoGuidanceHistory(forPetId);
      setHistory(result.jobs || []);
    } catch (err) {
      // History is a nice-to-have on this page - a failed fetch shouldn't block submitting a new photo.
      console.error('Failed to load photo guidance history:', err);
    }
  }, []);

  useEffect(() => { loadPets(); }, [loadPets]);
  useEffect(() => { loadHistory(petId); }, [petId, loadHistory]);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const pollJob = useCallback((jobId) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const result = await getPhotoGuidanceStatus(jobId);
        setJob(result.job);
        if (result.job.status === 'completed' || result.job.status === 'failed') {
          stopPolling();
          localStorage.removeItem(JOB_STORAGE_KEY);
          loadHistory(result.job.pet_id);
        }
      } catch (err) {
        // A transient network hiccup shouldn't kill the poll loop - just try again next tick.
        console.error('Photo guidance poll failed:', err);
      }
    }, POLL_INTERVAL_MS);
  }, [loadHistory]);

  // Resume tracking an in-flight job across a page reload
  useEffect(() => {
    const savedJobId = localStorage.getItem(JOB_STORAGE_KEY);
    if (!savedJobId) return;
    getPhotoGuidanceStatus(savedJobId)
      .then((result) => {
        setJob(result.job);
        if (result.job.status === 'pending' || result.job.status === 'processing') {
          pollJob(savedJobId);
        } else {
          localStorage.removeItem(JOB_STORAGE_KEY);
        }
      })
      .catch(() => localStorage.removeItem(JOB_STORAGE_KEY));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => stopPolling, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    setFormError('');
    if (!file) return;

    if (!VALID_TYPES.includes(file.type)) {
      setFormError('Please select a valid image file (JPEG, PNG, GIF, or WebP).');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFormError('Image size must be less than 5MB.');
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const resetForm = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setNote('');
    setFormError('');
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const startNewSubmission = () => {
    setJob(null);
    localStorage.removeItem(JOB_STORAGE_KEY);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!petId) {
      setFormError('Please select a pet.');
      return;
    }
    if (!photoFile) {
      setFormError('Please choose a photo to upload.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitPhotoGuidance(petId, photoFile, note.trim());
      setJob(result.job);
      localStorage.setItem(JOB_STORAGE_KEY, result.job.job_id);
      pollJob(result.job.job_id);
      resetForm();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Unable to submit that photo right now.');
    } finally {
      setSubmitting(false);
    }
  };

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
            <h1>AI Visual Care Guidance</h1>
            <p>Upload a photo of your pet for general AI guidance on what to do next.</p>
          </div>

          <div className="po-photo-disclaimer">
            <i className="fas fa-shield-heart"></i>
            <span>
              This is general guidance, not a diagnosis or medical advice - please see a veterinarian for anything
              concerning. Photos you upload are used only to generate this guidance and are handled as personal data
              under Sri Lanka's Personal Data Protection Act (PDPA).
            </span>
          </div>

          {!(job && (job.status === 'pending' || job.status === 'processing')) && (
            <section className="po-profile-card">
              <h2 className="po-profile-section-title">
                <i className="fas fa-camera"></i> Submit a Photo
              </h2>

              {formError && <p className="po-profile-error"><i className="fas fa-exclamation-circle"></i> {formError}</p>}

              <form onSubmit={handleSubmit} className="po-appt-form">
                <div className="po-appt-form-grid">
                  <div className="po-appt-field">
                    <label>Pet</label>
                    <select value={petId} onChange={(e) => setPetId(e.target.value)} required>
                      <option value="">Select a pet</option>
                      {pets.map((pet) => (
                        <option key={pet.pet_id} value={pet.pet_id}>{pet.pet_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="po-appt-field po-appt-field-wide">
                  <label>Photo</label>
                  {photoPreview ? (
                    <div className="po-photo-picked">
                      <img src={photoPreview} alt="Selected pet" />
                      <button type="button" className="po-photo-remove-btn" onClick={clearPhoto} aria-label="Remove photo">
                        <i className="fas fa-xmark"></i>
                      </button>
                    </div>
                  ) : (
                    <label className="po-photo-dropzone" htmlFor="po-photo-input">
                      <i className="fas fa-cloud-arrow-up"></i>
                      <span className="po-photo-dropzone-title">Click to upload a photo</span>
                      <span className="po-photo-dropzone-hint">JPEG, PNG, GIF, or WebP &middot; up to 5MB</span>
                    </label>
                  )}
                  <input
                    id="po-photo-input"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleFileSelect}
                    className="po-photo-file-input"
                  />
                </div>

                <div className="po-appt-field po-appt-field-wide">
                  <label>What are you noticing? (optional)</label>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. scratching this spot a lot for the last two days"
                  />
                </div>

                <button type="submit" className="po-photo-btn-primary" disabled={submitting}>
                  {submitting ? (
                    <><i className="fas fa-spinner fa-spin"></i> Submitting…</>
                  ) : (
                    <><i className="fas fa-wand-magic-sparkles"></i> Get AI Guidance</>
                  )}
                </button>
              </form>
            </section>
          )}

          {job && (
            <section className="po-profile-card">
              <h2 className="po-profile-section-title">
                <i className="fas fa-wand-magic-sparkles"></i> Latest Result
              </h2>
              <div className={`po-photo-status po-photo-status-${job.status}`}>
                <i className={`fas ${statusIcon[job.status] || 'fa-circle'}`}></i>
                {statusLabel[job.status] || job.status}
              </div>
              {job.status === 'completed' && (
                <div className="po-photo-guidance-text">{renderGuidance(job.guidance_text)}</div>
              )}
              {job.status === 'failed' && (
                <p className="po-photo-guidance-error">
                  {job.error_message || 'Something went wrong generating guidance for this photo.'}
                </p>
              )}
              {(job.status === 'pending' || job.status === 'processing') && (
                <p className="po-appt-field-hint">This can take a few minutes. Feel free to navigate away - your result will be waiting here when you come back.</p>
              )}
              {(job.status === 'completed' || job.status === 'failed') && (
                <button type="button" className="po-photo-btn-secondary" onClick={startNewSubmission}>
                  <i className="fas fa-camera"></i> Submit Another Photo
                </button>
              )}
            </section>
          )}

          {history.length > 0 && (
            <section className="po-profile-card">
              <h2 className="po-profile-section-title">
                <i className="fas fa-clock-rotate-left"></i> History
              </h2>
              <div className="po-photo-history">
                {history.map((h) => (
                  <div key={h.job_id} className="po-photo-history-row">
                    <div className="po-photo-history-row-head">
                      <span className={`po-photo-status-pill po-photo-status-${h.status}`}>
                        <i className={`fas ${statusIcon[h.status] || 'fa-circle'}`}></i>
                        {statusLabel[h.status] || h.status}
                      </span>
                      <span className="po-photo-history-date">{formatWhen(h.created_at)}</span>
                    </div>
                    {h.status === 'completed' && (
                      <div className="po-photo-history-text">{renderGuidance(h.guidance_text)}</div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

export default PetOwnerAIPhotoGuidance;
