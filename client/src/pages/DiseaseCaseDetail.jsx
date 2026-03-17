import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDiseaseCaseById, deleteDiseaseCase } from '../services/diseaseCaseService';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const DiseaseCaseDetail = () => {
  const [diseaseCase, setDiseaseCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteNotes, setDeleteNotes] = useState('');

  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';
  const isVetOrAdmin = user?.role === 'veterinarian' || user?.role === 'admin';

  useEffect(() => {
    fetchDiseaseCase();
  }, [id]);

  const fetchDiseaseCase = async () => {
    try {
      setLoading(true);
      const response = await getDiseaseCaseById(id);
      setDiseaseCase(response.data.case);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load disease case');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteDiseaseCase(id, deleteReason, deleteNotes);
      navigate('/disease-cases');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete disease case');
      setShowDeleteModal(false);
      setDeleting(false);
    }
  };

  const openDeleteModal = () => {
    setDeleteReason('');
    setDeleteNotes('');
    setShowDeleteModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getSeverityStyle = (severity) => {
    const map = {
      mild:     { background: '#dcfce7', color: '#166534' },
      moderate: { background: '#fef9c3', color: '#854d0e' },
      severe:   { background: '#ffedd5', color: '#9a3412' },
      critical: { background: '#fee2e2', color: '#991b1b' },
    };
    return map[severity] || { background: '#f3f4f6', color: '#374151' };
  };

  const getOutcomeStyle = (outcome) => {
    const map = {
      recovered: { background: '#dcfce7', color: '#166534' },
      ongoing:   { background: '#dbeafe', color: '#1e40af' },
      deceased:  { background: '#f3f4f6', color: '#374151' },
    };
    return map[outcome] || { background: '#f3f4f6', color: '#374151' };
  };

  if (loading) {
    return (
      <Layout>
        <div style={styles.loadingWrapper}>
          <i className="fas fa-circle-notch fa-spin" style={styles.loadingIcon}></i>
          <p style={styles.loadingText}>Loading disease case...</p>
        </div>
      </Layout>
    );
  }

  if (error && !diseaseCase) {
    return (
      <Layout>
        <div style={styles.container}>
          <div style={styles.errorBox}>
            <i className="fas fa-circle-exclamation" style={{ marginRight: '0.5rem' }}></i>
            {error}
          </div>
          <button onClick={() => navigate('/disease-cases')} style={styles.backButton}>
            <i className="fas fa-arrow-left" style={{ marginRight: '0.4rem' }}></i>
            Back to Disease Cases
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <button onClick={() => navigate('/disease-cases')} style={styles.backButton}>
              <i className="fas fa-arrow-left" style={{ marginRight: '0.4rem' }}></i>
              Back to Disease Cases
            </button>
            <h1 style={styles.title}>{diseaseCase.disease_name}</h1>
            <p style={styles.subtitle}>
              <i className="fas fa-hashtag" style={{ marginRight: '0.3rem', fontSize: '0.85rem' }}></i>
              Case ID: {diseaseCase.case_id}
            </p>
          </div>
          <div style={styles.actions}>
            {isVetOrAdmin && (
              <button
                onClick={() => navigate(`/disease-cases/${id}/edit`)}
                style={styles.editButton}
              >
                <i className="fas fa-pen" style={{ marginRight: '0.4rem' }}></i>
                Edit
              </button>
            )}
            {isAdmin && (
              <button
                onClick={openDeleteModal}
                style={styles.deleteButton}
              >
                <i className="fas fa-trash" style={{ marginRight: '0.4rem' }}></i>
                Delete
              </button>
            )}
          </div>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <i className="fas fa-circle-exclamation" style={{ marginRight: '0.5rem' }}></i>
            {error}
          </div>
        )}

        {/* Status Badges */}
        <div style={styles.badgeRow}>
          <span style={{ ...styles.badge, ...getSeverityStyle(diseaseCase.severity) }}>
            <i className="fas fa-gauge-high" style={{ marginRight: '0.35rem' }}></i>
            {diseaseCase.severity?.toUpperCase()}
          </span>
          {diseaseCase.outcome && (
            <span style={{ ...styles.badge, ...getOutcomeStyle(diseaseCase.outcome) }}>
              <i className="fas fa-stethoscope" style={{ marginRight: '0.35rem' }}></i>
              {diseaseCase.outcome.replace('_', ' ').toUpperCase()}
            </span>
          )}
          {diseaseCase.is_contagious && (
            <span style={{ ...styles.badge, background: '#fee2e2', color: '#991b1b' }}>
              <i className="fas fa-biohazard" style={{ marginRight: '0.35rem' }}></i>
              CONTAGIOUS
            </span>
          )}
        </div>

        {/* Main Grid */}
        <div style={styles.grid}>

          {/* Left Column */}
          <div style={styles.leftColumn}>

            {/* Pet Information */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>
                <i className="fas fa-paw" style={styles.cardTitleIcon}></i>
                Pet Information
              </h2>
              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.label}>Pet Name</span>
                  <span style={styles.value}>{diseaseCase.pet_name}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.label}>Species</span>
                  <span style={styles.value}>{diseaseCase.species}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.label}>Breed</span>
                  <span style={styles.value}>{diseaseCase.breed || 'N/A'}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.label}>Age at Diagnosis</span>
                  <span style={styles.value}>
                    {diseaseCase.age_at_diagnosis ? `${diseaseCase.age_at_diagnosis} months` : 'N/A'}
                  </span>
                </div>
              </div>

              <div style={styles.ownerSection}>
                <div style={styles.infoItem}>
                  <span style={styles.label}>Owner</span>
                  <span style={styles.value}>
                    {diseaseCase.owner_first_name} {diseaseCase.owner_last_name}
                  </span>
                </div>
                {diseaseCase.owner_phone && (
                  <div style={styles.contactRow}>
                    <i className="fas fa-phone" style={styles.contactIcon}></i>
                    <span style={styles.contactText}>{diseaseCase.owner_phone}</span>
                  </div>
                )}
                {diseaseCase.owner_email && (
                  <div style={styles.contactRow}>
                    <i className="fas fa-envelope" style={styles.contactIcon}></i>
                    <span style={styles.contactText}>{diseaseCase.owner_email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Disease Information */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>
                <i className="fas fa-virus" style={styles.cardTitleIcon}></i>
                Disease Information
              </h2>
              <div style={styles.infoStack}>
                <div style={styles.infoItem}>
                  <span style={styles.label}>Disease Category</span>
                  <span style={{ ...styles.value, textTransform: 'capitalize' }}>
                    {diseaseCase.disease_category?.replace(/_/g, ' ')}
                  </span>
                </div>
                {diseaseCase.symptoms && (
                  <div style={styles.infoItem}>
                    <span style={styles.label}>Symptoms</span>
                    <p style={styles.textBlock}>{diseaseCase.symptoms}</p>
                  </div>
                )}
                {diseaseCase.notes && (
                  <div style={styles.infoItem}>
                    <span style={styles.label}>Additional Notes</span>
                    <div style={styles.notesBox}>
                      <div style={styles.notesLines}>
                        {diseaseCase.notes.split('|').filter(l => l.trim()).map((line, i) => (
                          <div key={i} style={styles.notesLine}>
                            <i className="fas fa-circle-dot" style={styles.notesLineIcon}></i>
                            <span style={styles.notesText}>{line.trim()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Column (Sidebar) */}
          <div style={styles.rightColumn}>

            {/* Timeline */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>
                <i className="fas fa-calendar-days" style={styles.cardTitleIcon}></i>
                Timeline
              </h2>
              <div style={styles.timelineList}>

                <div style={styles.timelineRow}>
                  <div style={styles.timelineTrack}>
                    <div style={{ ...styles.timelineIconCircle, background: '#eff6ff', border: '2px solid #2563eb' }}>
                      <i className="fas fa-stethoscope" style={{ fontSize: '0.65rem', color: '#2563eb' }}></i>
                    </div>
                    <div style={styles.timelineLine}></div>
                  </div>
                  <div style={styles.timelineContent}>
                    <span style={styles.timelineLabel}>Diagnosis Date</span>
                    <span style={styles.timelineValue}>{formatDate(diseaseCase.diagnosis_date)}</span>
                  </div>
                </div>

                {diseaseCase.treatment_duration && (
                  <div style={styles.timelineRow}>
                    <div style={styles.timelineTrack}>
                      <div style={{ ...styles.timelineIconCircle, background: '#f0fdf4', border: '2px solid #16a34a' }}>
                        <i className="fas fa-kit-medical" style={{ fontSize: '0.6rem', color: '#16a34a' }}></i>
                      </div>
                      <div style={styles.timelineLine}></div>
                    </div>
                    <div style={styles.timelineContent}>
                      <span style={styles.timelineLabel}>Treatment Duration</span>
                      <span style={styles.timelineValue}>{diseaseCase.treatment_duration} days</span>
                    </div>
                  </div>
                )}

                <div style={styles.timelineRow}>
                  <div style={styles.timelineTrack}>
                    <div style={{ ...styles.timelineIconCircle, background: '#f9fafb', border: '2px solid #9ca3af' }}>
                      <i className="fas fa-plus" style={{ fontSize: '0.6rem', color: '#9ca3af' }}></i>
                    </div>
                    <div style={styles.timelineLine}></div>
                  </div>
                  <div style={styles.timelineContent}>
                    <span style={styles.timelineLabel}>Record Created</span>
                    <span style={styles.timelineValue}>{formatDate(diseaseCase.created_at)}</span>
                    {diseaseCase.created_by_name && (
                      <span style={styles.timelineMeta}>
                        <i className="fas fa-user" style={{ marginRight: '0.3rem', fontSize: '0.7rem' }}></i>
                        {diseaseCase.created_by_name}
                      </span>
                    )}
                  </div>
                </div>

                {diseaseCase.updated_at && (
                  <div style={{ ...styles.timelineRow, marginBottom: 0 }}>
                    <div style={{ ...styles.timelineTrack }}>
                      <div style={{ ...styles.timelineIconCircle, background: '#fffbeb', border: '2px solid #d97706' }}>
                        <i className="fas fa-pen" style={{ fontSize: '0.6rem', color: '#d97706' }}></i>
                      </div>
                      <div style={{ ...styles.timelineLine, visibility: 'hidden' }}></div>
                    </div>
                    <div style={styles.timelineContent}>
                      <span style={styles.timelineLabel}>Last Updated</span>
                      <span style={styles.timelineValue}>{formatDate(diseaseCase.updated_at)}</span>
                      {diseaseCase.updated_by_name && (
                        <span style={styles.timelineMeta}>
                          <i className="fas fa-user" style={{ marginRight: '0.3rem', fontSize: '0.7rem' }}></i>
                          {diseaseCase.updated_by_name}
                        </span>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Location */}
            {diseaseCase.region && (
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>
                  <i className="fas fa-location-dot" style={styles.cardTitleIcon}></i>
                  Location
                </h2>
                <div style={styles.locationRow}>
                  <i className="fas fa-map-pin" style={{ color: '#6b7280', marginRight: '0.5rem' }}></i>
                  <span style={styles.value}>{diseaseCase.region}</span>
                </div>
              </div>
            )}


          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalIcon}>
              <i className="fas fa-triangle-exclamation" style={{ color: '#dc2626', fontSize: '2rem' }}></i>
            </div>
            <h3 style={styles.modalTitle}>Delete Disease Case</h3>
            <p style={styles.modalBody}>
              This record will be permanently removed. A reason is required and will be
              recorded in the audit log for compliance purposes.
            </p>

            <div style={styles.modalField}>
              <label style={styles.modalLabel}>
                Reason for Deletion <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                style={styles.modalSelect}
              >
                <option value="">Select a reason...</option>
                <option value="duplicate_record">Duplicate record — entry already exists</option>
                <option value="data_entry_error">Data entry error — incorrect information recorded</option>
                <option value="incorrect_patient">Incorrect patient — attributed to wrong animal</option>
                <option value="test_record">Test / training record — not a real case</option>
                <option value="legal_compliance">Legal or regulatory requirement</option>
                <option value="record_retention_expired">Record retention period expired</option>
              </select>
            </div>

            <div style={styles.modalField}>
              <label style={styles.modalLabel}>Additional Notes <span style={{ color: '#9ca3af' }}>(optional)</span></label>
              <textarea
                value={deleteNotes}
                onChange={e => setDeleteNotes(e.target.value)}
                rows={3}
                placeholder="Provide any additional context..."
                style={styles.modalTextarea}
              />
            </div>

            <div style={styles.modalActions}>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || !deleteReason}
                style={{
                  ...styles.confirmDeleteButton,
                  opacity: (deleting || !deleteReason) ? 0.5 : 1,
                  cursor: (deleting || !deleteReason) ? 'not-allowed' : 'pointer'
                }}
              >
                {deleting ? (
                  <>
                    <i className="fas fa-circle-notch fa-spin" style={{ marginRight: '0.4rem' }}></i>
                    Deleting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-trash" style={{ marginRight: '0.4rem' }}></i>
                    Confirm Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

const styles = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
  },
  loadingWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '1rem',
  },
  loadingIcon: {
    fontSize: '2.5rem',
    color: '#2563eb',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: '1rem',
    margin: 0,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '0.875rem 1rem',
    borderRadius: '8px',
    border: '1px solid #fecaca',
    marginBottom: '1.5rem',
    fontSize: '0.95rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  backButton: {
    backgroundColor: 'transparent',
    color: '#2563eb',
    border: 'none',
    padding: '0',
    fontSize: '0.9rem',
    fontWeight: '500',
    cursor: 'pointer',
    marginBottom: '0.75rem',
    display: 'flex',
    alignItems: 'center',
  },
  title: {
    fontSize: '1.875rem',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 0.35rem 0',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#6b7280',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    flexShrink: 0,
  },
  editButton: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    padding: '0.6rem 1.25rem',
    fontSize: '0.9rem',
    fontWeight: '500',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  deleteButton: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '0.6rem 1.25rem',
    fontSize: '0.9rem',
    fontWeight: '500',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  badgeRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.6rem',
    marginBottom: '1.75rem',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.35rem 0.85rem',
    borderRadius: '9999px',
    fontSize: '0.78rem',
    fontWeight: '700',
    letterSpacing: '0.04em',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 340px',
    gap: '1.5rem',
    alignItems: 'start',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 8px rgba(0,0,0,0.04)',
    padding: '1.5rem',
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 1.25rem 0',
    paddingBottom: '0.75rem',
    borderBottom: '2px solid #f3f4f6',
    display: 'flex',
    alignItems: 'center',
  },
  cardTitleIcon: {
    marginRight: '0.5rem',
    color: '#2563eb',
    fontSize: '0.95rem',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1.25rem',
  },
  infoStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  label: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  value: {
    fontSize: '0.95rem',
    color: '#111827',
    fontWeight: '500',
  },
  textBlock: {
    fontSize: '0.95rem',
    color: '#374151',
    lineHeight: '1.65',
    margin: '0.25rem 0 0 0',
    whiteSpace: 'pre-wrap',
  },
  ownerSection: {
    marginTop: '1.25rem',
    paddingTop: '1.25rem',
    borderTop: '1px solid #f3f4f6',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  contactRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  contactIcon: {
    color: '#6b7280',
    fontSize: '0.85rem',
    width: '16px',
  },
  contactText: {
    fontSize: '0.9rem',
    color: '#374151',
  },
  timelineList: {
    display: 'flex',
    flexDirection: 'column',
  },
  timelineRow: {
    display: 'flex',
    gap: '0.85rem',
    marginBottom: '0.15rem',
  },
  timelineTrack: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flexShrink: 0,
    width: '28px',
  },
  timelineIconCircle: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    zIndex: 1,
  },
  timelineLine: {
    width: '2px',
    flex: 1,
    minHeight: '20px',
    background: '#e5e7eb',
    margin: '2px 0',
  },
  timelineContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
    paddingBottom: '1.1rem',
  },
  timelineLabel: {
    fontSize: '0.72rem',
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  timelineValue: {
    fontSize: '0.9rem',
    color: '#111827',
    fontWeight: '500',
  },
  timelineMeta: {
    fontSize: '0.78rem',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    marginTop: '0.1rem',
  },
  notesBox: {
    display: 'flex',
    gap: '0.65rem',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '0.85rem 1rem',
    marginTop: '0.25rem',
    alignItems: 'flex-start',
  },
  notesIcon: {
    color: '#2563eb',
    fontSize: '0.9rem',
    flexShrink: 0,
    marginTop: '0.15rem',
  },
  notesLines: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.45rem',
  },
  notesLine: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem',
  },
  notesLineIcon: {
    color: '#2563eb',
    fontSize: '0.55rem',
    flexShrink: 0,
    marginTop: '0.35rem',
  },
  notesText: {
    fontSize: '0.9rem',
    color: '#374151',
    lineHeight: '1.6',
    margin: 0,
  },
  locationRow: {
    display: 'flex',
    alignItems: 'center',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '2rem',
    maxWidth: '460px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    textAlign: 'center',
  },
  modalIcon: {
    marginBottom: '1rem',
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 0.75rem 0',
  },
  modalBody: {
    fontSize: '0.9rem',
    color: '#6b7280',
    lineHeight: '1.6',
    margin: '0 0 1.25rem 0',
  },
  modalField: {
    textAlign: 'left',
    marginBottom: '1rem',
  },
  modalLabel: {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.4rem',
  },
  modalSelect: {
    width: '100%',
    padding: '0.6rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.9rem',
    color: '#111827',
    backgroundColor: 'white',
    outline: 'none',
  },
  modalTextarea: {
    width: '100%',
    padding: '0.6rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.9rem',
    color: '#111827',
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '1.25rem',
  },
  cancelButton: {
    padding: '0.65rem 1.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    background: 'white',
    color: '#374151',
    fontSize: '0.9rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  confirmDeleteButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.65rem 1.5rem',
    border: 'none',
    borderRadius: '8px',
    background: '#ef4444',
    color: 'white',
    fontSize: '0.9rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
};

export default DiseaseCaseDetail;
