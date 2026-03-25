import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDiseaseCaseById, deleteDiseaseCase } from '../services/diseaseCaseService';
import { getLabReports, uploadLabReport, openLabReport, deleteLabReport } from '../services/labReportService';
import { getAppointmentById } from '../services/appointmentService';
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
  const [labReports, setLabReports] = useState([]);
  const [labReportsLoading, setLabReportsLoading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState({ report_name: '', report_type: '', notes: '' });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [labError, setLabError] = useState('');
  const [labSuccess, setLabSuccess] = useState('');
  const [deleteLabReportModal, setDeleteLabReportModal] = useState({ open: false, reportId: null, reportName: '' });
  const [apptModal, setApptModal] = useState(null);
  const [apptModalLoading, setApptModalLoading] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

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
      const c = response.data.case;
      setDiseaseCase(c);
      setError('');
      fetchLabReports(c.pet_id, c.case_id);
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
      setShowDeleteModal(false);
      setDeleteSuccess(true);
      setTimeout(() => navigate('/disease-cases'), 3000);
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

  const fetchLabReports = async (petId, caseId) => {
    try {
      setLabReportsLoading(true);
      const response = await getLabReports(petId);
      const caseReports = (response.reports || []).filter(r => r.related_case_id === caseId);
      setLabReports(caseReports);
    } catch (err) {
      console.error('Failed to load lab reports', err);
    } finally {
      setLabReportsLoading(false);
    }
  };

  const handleUploadFormChange = (e) => {
    setUploadForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLabReportUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) { setLabError('Please select a file'); return; }
    if (!uploadForm.report_name || !uploadForm.report_type) { setLabError('Report name and type are required'); return; }
    try {
      setUploading(true);
      setLabError('');
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('report_name', uploadForm.report_name);
      formData.append('report_type', uploadForm.report_type);
      formData.append('related_case_id', diseaseCase.case_id);
      if (uploadForm.notes) formData.append('notes', uploadForm.notes);
      await uploadLabReport(diseaseCase.pet_id, formData);
      setLabSuccess('Lab report uploaded successfully');
      setShowUploadForm(false);
      setUploadForm({ report_name: '', report_type: '', notes: '' });
      setUploadFile(null);
      fetchLabReports(diseaseCase.pet_id, diseaseCase.case_id);
      setTimeout(() => setLabSuccess(''), 3000);
    } catch (err) {
      setLabError(err.response?.data?.message || 'Failed to upload lab report');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteLabReport = (reportId, reportName) => {
    setDeleteLabReportModal({ open: true, reportId, reportName: reportName || '' });
  };

  const confirmDeleteLabReport = async () => {
    try {
      await deleteLabReport(deleteLabReportModal.reportId);
      setDeleteLabReportModal({ open: false, reportId: null, reportName: '' });
      fetchLabReports(diseaseCase.pet_id, diseaseCase.case_id);
    } catch (err) {
      setLabError(err.response?.data?.message || 'Failed to delete lab report');
    }
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

  const openApptModal = async (apptId) => {
    if (!apptId) return;
    try {
      setApptModalLoading(true);
      setApptModal({});
      const res = await getAppointmentById(apptId);
      setApptModal(res.data.appointment);
    } catch (err) {
      console.error('Failed to load appointment:', err);
      setApptModal(null);
    } finally {
      setApptModalLoading(false);
    }
  };

  const getApptStatusColor = (status) => {
    const colors = { scheduled: '#3b82f6', confirmed: '#10b981', in_progress: '#f59e0b', completed: '#6b7280', cancelled: '#ef4444', no_show: '#8b5cf6' };
    return colors[status] || '#6b7280';
  };

  const formatTime = (t) => {
    if (!t) return '-';
    const [h, m] = t.slice(0, 5).split(':');
    const hr = parseInt(h);
    return `${hr % 12 || 12}:${m} ${hr < 12 ? 'AM' : 'PM'}`;
  };

  const calcAgeAtDiagnosis = (dob, diagDate) => {
    if (!dob || !diagDate) return null;
    const birth = new Date(dob);
    const diag = new Date(diagDate);
    let years = diag.getFullYear() - birth.getFullYear();
    let months = diag.getMonth() - birth.getMonth();
    if (months < 0) { years--; months += 12; }
    if (years > 0 && months > 0) return `${years} yr ${months} mo`;
    if (years > 0) return `${years} yr`;
    return `${months} mo`;
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
              Case ID: CSE-{String(diseaseCase.case_id).padStart(4, '0')}
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

        {deleteSuccess && (
          <div style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999, backgroundColor: '#166534', color: '#fff', padding: '0.85rem 1.25rem', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.95rem', fontWeight: '500' }}>
            <i className="fas fa-circle-check" style={{ fontSize: '1.1rem' }}></i>
            Disease case deleted successfully.
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
                    {calcAgeAtDiagnosis(diseaseCase.date_of_birth, diseaseCase.diagnosis_date) || 'N/A'}
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

              <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #f3f4f6' }}>
                <button
                  onClick={() => navigate(`/pets/${diseaseCase.pet_id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer' }}
                >
                  <i className="fas fa-paw"></i>
                  View Pet Profile
                </button>
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
                {diseaseCase.diagnosis_method && (
                  <div style={styles.infoItem}>
                    <span style={styles.label}>Diagnosis Method</span>
                    <span style={{ ...styles.value, textTransform: 'capitalize' }}>
                      {diseaseCase.diagnosis_method.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
                {diseaseCase.treatment_duration_days && (
                  <div style={styles.infoItem}>
                    <span style={styles.label}>Treatment Duration</span>
                    <span style={styles.value}>{diseaseCase.treatment_duration_days} days</span>
                  </div>
                )}
                <div style={styles.infoItem}>
                  <span style={styles.label}>Contagious Disease</span>
                  <span style={{
                    ...styles.value,
                    color: diseaseCase.is_contagious ? '#991b1b' : '#166534',
                    fontWeight: '600',
                  }}>
                    {diseaseCase.is_contagious ? 'Yes' : 'No'}
                    {diseaseCase.is_contagious && diseaseCase.transmission_method && (
                      <span style={{ fontWeight: '400', color: '#374151', marginLeft: '0.4rem' }}>
                        — {diseaseCase.transmission_method.replace(/_/g, ' ')}
                      </span>
                    )}
                  </span>
                </div>
                {diseaseCase.appointment_id && (
                  <div style={styles.infoItem}>
                    <span style={styles.label}>Related Appointment</span>
                    <span
                      onClick={() => openApptModal(diseaseCase.appointment_id)}
                      style={{ ...styles.value, color: '#2563eb', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
                    >
                      <i className="fas fa-calendar-check" style={{ marginRight: '0.35rem', fontSize: '0.8rem' }}></i>
                      {diseaseCase.appointment_id}
                    </span>
                  </div>
                )}
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

            {/* Lab Reports */}
            <div style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '2px solid #f3f4f6' }}>
                <h2 style={{ ...styles.cardTitle, margin: 0, paddingBottom: 0, borderBottom: 'none' }}>
                  <i className="fas fa-flask" style={styles.cardTitleIcon}></i>
                  Lab Reports
                  {labReports.length > 0 && (
                    <span style={{ marginLeft: '0.5rem', background: '#dbeafe', color: '#1e40af', fontSize: '0.72rem', fontWeight: '700', padding: '0.15rem 0.55rem', borderRadius: '9999px' }}>
                      {labReports.length}
                    </span>
                  )}
                </h2>
                {isVetOrAdmin && (
                  <button onClick={() => { setShowUploadForm(v => !v); setLabError(''); }} style={styles.uploadToggleBtn}>
                    <i className={`fas fa-${showUploadForm ? 'minus' : 'plus'}`} style={{ marginRight: '0.35rem' }}></i>
                    {showUploadForm ? 'Cancel' : 'Upload'}
                  </button>
                )}
              </div>

              {labError && (
                <div style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', padding: '0.6rem 0.85rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  {labError}
                </div>
              )}
              {labSuccess && (
                <div style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '0.6rem 0.85rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  {labSuccess}
                </div>
              )}

              {showUploadForm && (
                <form onSubmit={handleLabReportUpload} style={styles.labUploadForm}>
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 0.75rem 0' }}>Fields marked with <span style={{ color: '#ef4444' }}>*</span> are required.</p>
                  <div style={styles.labFormGrid}>
                    <div style={styles.labFormGroup}>
                      <label style={styles.labFormLabel}>Report Name <span style={{ color: '#dc2626' }}>*</span></label>
                      <input name="report_name" value={uploadForm.report_name} onChange={handleUploadFormChange} placeholder="e.g. Blood Panel – March 2026" style={styles.labFormInput} required />
                    </div>
                    <div style={styles.labFormGroup}>
                      <label style={styles.labFormLabel}>Report Type <span style={{ color: '#dc2626' }}>*</span></label>
                      <select name="report_type" value={uploadForm.report_type} onChange={handleUploadFormChange} style={styles.labFormInput} required>
                        <option value="">Select type...</option>
                        <option value="blood_test">Blood Test</option>
                        <option value="kidney_panel">Kidney Panel</option>
                        <option value="urinalysis">Urinalysis</option>
                        <option value="x_ray">X-Ray</option>
                        <option value="ultrasound">Ultrasound</option>
                        <option value="cytology">Cytology</option>
                        <option value="biopsy">Biopsy</option>
                        <option value="culture">Culture</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div style={styles.labFormGroup}>
                    <label style={styles.labFormLabel}>File <span style={{ color: '#dc2626' }}>*</span> <span style={{ color: '#9ca3af', fontWeight: '400', textTransform: 'none' }}>(PDF or image, max 10MB)</span></label>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => setUploadFile(e.target.files[0])} style={styles.labFormInput} required />
                  </div>
                  <div style={styles.labFormGroup}>
                    <label style={styles.labFormLabel}>Notes <span style={{ color: '#9ca3af', fontWeight: '400', textTransform: 'none' }}>(optional)</span></label>
                    <input name="notes" value={uploadForm.notes} onChange={handleUploadFormChange} placeholder="Any additional notes..." style={styles.labFormInput} />
                  </div>
                  <button type="submit" disabled={uploading} style={{ ...styles.labUploadBtn, opacity: uploading ? 0.6 : 1 }}>
                    <i className={`fas fa-${uploading ? 'circle-notch fa-spin' : 'upload'}`} style={{ marginRight: '0.4rem' }}></i>
                    {uploading ? 'Uploading...' : 'Upload Report'}
                  </button>
                </form>
              )}

              {labReportsLoading ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: '#9ca3af', fontSize: '0.9rem' }}>
                  <i className="fas fa-circle-notch fa-spin" style={{ marginRight: '0.4rem' }}></i>
                  Loading reports...
                </div>
              ) : labReports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: '#9ca3af', fontSize: '0.88rem' }}>
                  <i className="fas fa-folder-open" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}></i>
                  No lab reports linked to this case yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {labReports.map(report => (
                    <div key={report.report_id} style={styles.labReportCard}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <div style={styles.labReportIcon}>
                          <i className={`fas fa-file-${report.file_type === 'pdf' ? 'pdf' : 'image'}`} style={{ color: report.file_type === 'pdf' ? '#dc2626' : '#7c3aed' }}></i>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={styles.labReportName}>{report.report_name}</span>
                            <span style={styles.labReportTypeBadge}>{report.report_type.replace(/_/g, ' ')}</span>
                          </div>
                          <div style={styles.labReportMeta}>
                            <span><i className="fas fa-user" style={{ marginRight: '0.25rem' }}></i>{report.uploaded_by_name || 'Unknown'}</span>
                            <span><i className="fas fa-calendar" style={{ marginRight: '0.25rem' }}></i>{formatDate(report.created_at)}</span>
                          </div>
                          {report.notes && <div style={styles.labReportNotes}>{report.notes}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                          <button onClick={() => openLabReport(report.report_id, report.file_type)} style={styles.labViewBtn} title="View">
                            <i className="fas fa-eye"></i>
                          </button>
                          {isVetOrAdmin && (
                            <button onClick={() => handleDeleteLabReport(report.report_id, report.report_name)} style={styles.labDeleteBtn} title="Delete">
                              <i className="fas fa-trash"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

            {/* Follow-up Monitoring */}
            {diseaseCase.requires_followup && (
              <div style={{ ...styles.card, borderTop: '4px solid #f59e0b' }}>
                <h2 style={styles.cardTitle}>
                  <i className="fas fa-calendar-check" style={{ ...styles.cardTitleIcon, color: '#f59e0b' }}></i>
                  Follow-up Monitoring
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {diseaseCase.followup_type && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>
                        <i className="fas fa-tag" style={{ marginRight: '0.35rem', color: '#6b7280' }}></i>
                        Type
                      </span>
                      <span style={{ ...styles.value, textTransform: 'capitalize' }}>
                        {diseaseCase.followup_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}
                  {diseaseCase.next_followup_date && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>
                        <i className="fas fa-calendar-alt" style={{ marginRight: '0.35rem', color: '#6b7280' }}></i>
                        Next Follow-up
                      </span>
                      <span style={{
                        ...styles.value,
                        color: new Date(diseaseCase.next_followup_date) < new Date() ? '#dc2626' : '#111827',
                        fontWeight: '600'
                      }}>
                        {formatDate(diseaseCase.next_followup_date)}
                        {new Date(diseaseCase.next_followup_date) < new Date() && (
                          <span style={{ marginLeft: '0.4rem', fontSize: '0.72rem', color: '#dc2626' }}>
                            <i className="fas fa-circle-exclamation" style={{ marginRight: '0.2rem' }}></i>
                            Overdue
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {diseaseCase.followup_notes && (
                    <div>
                      <span style={{ ...styles.detailLabel, display: 'block', marginBottom: '0.35rem' }}>
                        <i className="fas fa-notes-medical" style={{ marginRight: '0.35rem', color: '#6b7280' }}></i>
                        Instructions
                      </span>
                      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '0.6rem 0.75rem', fontSize: '0.85rem', color: '#374151', lineHeight: '1.5' }}>
                        {diseaseCase.followup_notes}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {deleteLabReportModal.open && (
        <div style={styles.modalOverlay} onClick={() => setDeleteLabReportModal({ open: false, reportId: null, reportName: '' })}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', width: '90%', maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
                <i className="fas fa-trash" style={{ marginRight: '0.5rem', color: '#dc2626' }}></i>
                Delete Lab Report
              </h3>
              <button onClick={() => setDeleteLabReportModal({ open: false, reportId: null, reportName: '' })} style={{ background: 'none', border: 'none', fontSize: '1.25rem', color: '#6b7280', cursor: 'pointer', padding: '0.25rem' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ margin: '0 0 1.5rem', color: '#374151', fontSize: '0.95rem' }}>
                Are you sure you want to delete this lab report? This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setDeleteLabReportModal({ open: false, reportId: null, reportName: '' })}
                  style={{ padding: '0.5rem 1.1rem', borderRadius: '7px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#374151', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteLabReport}
                  style={{ padding: '0.5rem 1.1rem', borderRadius: '7px', border: 'none', backgroundColor: '#dc2626', color: '#fff', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}
                >
                  <i className="fas fa-trash" style={{ marginRight: '0.4rem' }}></i>
                  Delete Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
      {/* Appointment Detail Modal */}
      {apptModal && (
        <div style={styles.modalOverlay} onClick={() => setApptModal(null)}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', width: '90%', maxWidth: '520px', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#111827' }}>
                <i className="fas fa-calendar-check" style={{ marginRight: '0.5rem', color: '#2563eb' }}></i>
                Appointment Details
              </h3>
              <button onClick={() => setApptModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', color: '#6b7280', cursor: 'pointer', padding: '0.25rem' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {apptModalLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'block' }}></i>
                  Loading...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {apptModal.appointment_id}
                    </span>
                    {apptModal.status && (
                      <span style={{ backgroundColor: `${getApptStatusColor(apptModal.status)}20`, color: getApptStatusColor(apptModal.status), padding: '0.2rem 0.65rem', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: '700', textTransform: 'capitalize' }}>
                        {apptModal.status.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  {[
                    { icon: 'fa-paw',           label: 'Pet',          val: apptModal.pet_name },
                    { icon: 'fa-user',          label: 'Owner',        val: `${apptModal.customer_first_name || ''} ${apptModal.customer_last_name || ''}`.trim() || null },
                    { icon: 'fa-user-doctor',   label: 'Veterinarian', val: apptModal.veterinarian_name ? `Dr. ${apptModal.veterinarian_name}` : null },
                    { icon: 'fa-calendar',      label: 'Date',         val: apptModal.appointment_date ? formatDate(apptModal.appointment_date) : null },
                    { icon: 'fa-clock',         label: 'Time',         val: apptModal.appointment_time ? formatTime(apptModal.appointment_time) : null },
                    { icon: 'fa-hourglass-half',label: 'Duration',     val: apptModal.duration_minutes ? `${apptModal.duration_minutes} min` : null },
                    { icon: 'fa-tag',           label: 'Type',         val: apptModal.appointment_type?.replace(/_/g, ' ') },
                    { icon: 'fa-notes-medical', label: 'Reason',       val: apptModal.reason },
                  ].filter(r => r.val).map(r => (
                    <div key={r.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <i className={`fas ${r.icon}`} style={{ color: '#6b7280', width: '16px', marginTop: '0.15rem', flexShrink: 0 }}></i>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{r.label}</div>
                        <div style={{ fontSize: '0.9rem', color: '#111827', textTransform: r.label === 'Type' ? 'capitalize' : 'none' }}>{r.val}</div>
                      </div>
                    </div>
                  ))}
                  {apptModal.notes && (
                    <div style={{ marginTop: '0.5rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>Notes</div>
                      <div style={{ fontSize: '0.88rem', color: '#374151', lineHeight: '1.5' }}>{apptModal.notes}</div>
                    </div>
                  )}
                </div>
              )}
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
  uploadToggleBtn: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    color: '#0369a1',
    border: '1px solid #bae6fd',
    padding: '0.35rem 0.85rem',
    fontSize: '0.82rem',
    fontWeight: '600',
    borderRadius: '6px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  labUploadForm: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  labFormGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
  },
  labFormGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  labFormLabel: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  labFormInput: {
    padding: '0.45rem 0.65rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.88rem',
    color: '#111827',
    backgroundColor: 'white',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  labUploadBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    padding: '0.55rem 1.25rem',
    fontSize: '0.88rem',
    fontWeight: '600',
    borderRadius: '6px',
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  labReportCard: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '0.85rem 1rem',
  },
  labReportIcon: {
    width: '34px',
    height: '34px',
    borderRadius: '6px',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
    flexShrink: 0,
  },
  labReportName: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#111827',
  },
  labReportTypeBadge: {
    fontSize: '0.72rem',
    fontWeight: '600',
    backgroundColor: '#ede9fe',
    color: '#5b21b6',
    padding: '0.1rem 0.5rem',
    borderRadius: '9999px',
    textTransform: 'capitalize',
  },
  labReportMeta: {
    display: 'flex',
    gap: '1rem',
    fontSize: '0.78rem',
    color: '#6b7280',
    marginTop: '0.25rem',
  },
  labReportNotes: {
    fontSize: '0.82rem',
    color: '#374151',
    marginTop: '0.35rem',
    fontStyle: 'italic',
  },
  labViewBtn: {
    padding: '0.35rem 0.6rem',
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    border: '1px solid #bfdbfe',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  labDeleteBtn: {
    padding: '0.35rem 0.6rem',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  detailRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
  },
  detailLabel: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
};

export default DiseaseCaseDetail;
