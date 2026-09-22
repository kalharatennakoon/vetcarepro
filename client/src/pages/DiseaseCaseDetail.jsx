import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDiseaseCaseById, deleteDiseaseCase, updateDiseaseCase, getCaseFollowups, recordFollowup } from '../services/diseaseCaseService';
import { getLabReports, uploadLabReport, openLabReport, deleteLabReport } from '../services/labReportService';
import { getAppointmentById } from '../services/appointmentService';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import '../styles/DiseaseCaseDetailModern.css';

const DiseaseCaseDetail = () => {
  const [diseaseCase, setDiseaseCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const errorRef = useRef(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);
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
  const [followups, setFollowups] = useState([]);
  const [followupsLoading, setFollowupsLoading] = useState(false);
  const [showFollowupForm, setShowFollowupForm] = useState(false);
  const [followupForm, setFollowupForm] = useState({ visit_date: new Date().toISOString().split('T')[0], notes: '', next_followup_date: '' });
  const [followupSubmitting, setFollowupSubmitting] = useState(false);
  const [followupError, setFollowupError] = useState('');
  const [followupSuccess, setFollowupSuccess] = useState('');
  const [markingRecovered, setMarkingRecovered] = useState(false);
  const [showRecoverModal, setShowRecoverModal] = useState(false);

  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';
  const isVetOrAdmin = user?.role === 'veterinarian' || user?.role === 'admin';

  useEffect(() => {
    fetchDiseaseCase();
    fetchFollowups();
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

  const fetchFollowups = async () => {
    try {
      setFollowupsLoading(true);
      const response = await getCaseFollowups(id);
      setFollowups(response.data.followups || []);
    } catch (err) {
      console.error('Failed to load followups:', err);
    } finally {
      setFollowupsLoading(false);
    }
  };

  const handleRecordFollowup = async (e) => {
    e.preventDefault();
    if (!followupForm.notes.trim()) { setFollowupError('Please enter visit notes'); return; }
    try {
      setFollowupSubmitting(true);
      setFollowupError('');
      await recordFollowup(id, {
        visit_date: followupForm.visit_date,
        notes: followupForm.notes.trim(),
        next_followup_date: followupForm.next_followup_date || null
      });
      setFollowupSuccess('Follow-up visit recorded successfully');
      setShowFollowupForm(false);
      setFollowupForm({ visit_date: new Date().toISOString().split('T')[0], notes: '', next_followup_date: '' });
      fetchFollowups();
      fetchDiseaseCase();
      setTimeout(() => setFollowupSuccess(''), 4000);
    } catch (err) {
      setFollowupError(err.response?.data?.message || 'Failed to record follow-up visit');
    } finally {
      setFollowupSubmitting(false);
    }
  };

  const handleMarkRecovered = () => {
    setShowRecoverModal(true);
  };

  const confirmMarkRecovered = async () => {
    setShowRecoverModal(false);
    try {
      setMarkingRecovered(true);
      await updateDiseaseCase(id, {
        ...diseaseCase,
        outcome: 'recovered',
        requires_followup: false,
        next_followup_date: null,
        followup_notes: null,
        followup_type: null
      });
      fetchDiseaseCase();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update case status');
    } finally {
      setMarkingRecovered(false);
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
      mild:     { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' },
      moderate: { background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a' },
      severe:   { background: '#ffedd5', color: '#9a3412', border: '1px solid #fed7aa' },
      critical: { background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' },
    };
    return map[severity] || { background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' };
  };

  const getOutcomeStyle = (outcome) => {
    const map = {
      recovered: { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' },
      ongoing:   { background: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe' },
      deceased:  { background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' },
    };
    return map[outcome] || { background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' };
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
    const colors = { confirmed: '#10b981', in_progress: '#f59e0b', completed: '#6b7280', cancelled: '#ef4444', no_show: '#8b5cf6' };
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: '#64748b' }}>
          <div style={{ border: '3px solid #e2e8f0', borderTop: '3px solid #2563eb', borderRadius: '50%', width: '42px', height: '42px', animation: 'spin 1s linear infinite', marginBottom: '1rem' }}></div>
          <p>Loading disease case...</p>
        </div>
      </Layout>
    );
  }

  if (error && !diseaseCase) {
    return (
      <Layout>
        <div className="disease-detail-container">
          <div ref={errorRef} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '14px', padding: '1.25rem', color: '#991b1b', fontSize: '0.9rem', fontWeight: '500' }}>
            <i className="fas fa-circle-exclamation" style={{ marginRight: '0.5rem' }}></i>
            {error}
          </div>
          <div>
            <button onClick={() => navigate('/disease-cases')} className="disease-detail-back-btn">
              <i className="fas fa-arrow-left"></i> Back to Disease Cases
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="disease-detail-container">

        {/* Top Navigation Bar */}
        <div className="disease-detail-top-nav">
          <button onClick={() => navigate('/disease-cases')} className="disease-detail-back-btn">
            <i className="fas fa-arrow-left"></i>
            <span>Back to Disease Cases</span>
          </button>
          <div className="disease-detail-actions">
            {isVetOrAdmin && (
              <button
                onClick={() => navigate(`/disease-cases/${id}/edit`)}
                className="disease-btn-edit"
              >
                <i className="fas fa-pen"></i>
                <span>Edit Case</span>
              </button>
            )}
            {isAdmin && (
              <button
                onClick={openDeleteModal}
                className="disease-btn-delete"
              >
                <i className="fas fa-trash"></i>
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Header Hero Banner Card */}
        <div className="disease-header-card">
          <div>
            <h1 className="disease-header-title">{diseaseCase.disease_name}</h1>
            <p className="disease-header-subtitle">
              <span>
                <i className="fas fa-hashtag" style={{ marginRight: '0.3rem' }}></i>
                Case ID: CSE-{String(diseaseCase.case_id).padStart(4, '0')}
              </span>
              {diseaseCase.created_by_name && (
                <span>
                  <i className="fas fa-user-doctor" style={{ marginRight: '0.35rem' }}></i>
                  Recorded by Dr. {diseaseCase.created_by_name}
                </span>
              )}
            </p>
          </div>

          {/* Status Badges */}
          <div className="disease-badge-row">
            <span className="disease-pill-badge" style={getSeverityStyle(diseaseCase.severity)}>
              <i className="fas fa-gauge-high"></i>
              {diseaseCase.severity?.toUpperCase()}
            </span>
            {diseaseCase.outcome && (
              <span className="disease-pill-badge" style={getOutcomeStyle(diseaseCase.outcome)}>
                <i className="fas fa-stethoscope"></i>
                {diseaseCase.outcome.replace('_', ' ').toUpperCase()}
              </span>
            )}
            {diseaseCase.is_contagious && (
              <span className="disease-pill-badge" style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>
                <i className="fas fa-biohazard"></i>
                CONTAGIOUS
              </span>
            )}
          </div>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fas fa-circle-exclamation"></i>
            <span>{error}</span>
          </div>
        )}

        {deleteSuccess && (
          <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #16a34a', borderLeft: '4px solid #16a34a', padding: '14px 16px', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: '500', maxWidth: '380px' }}>
            <i className="fas fa-circle-check" style={{ color: '#15803d', fontSize: '16px', flexShrink: 0 }}></i>
            Disease case deleted successfully.
          </div>
        )}

        {/* Main Grid */}
        <div className="disease-main-grid">

          {/* Left Column */}
          <div className="disease-left-col">

            {/* Pet Information Card */}
            <div className="disease-card">
              <h2 className="disease-card-title">
                <i className="fas fa-paw"></i>
                Pet Information
              </h2>
              <div className="disease-info-grid">
                <div className="disease-info-item">
                  <span className="disease-info-label">Pet Name</span>
                  <span className="disease-info-value">{diseaseCase.pet_name}</span>
                </div>
                <div className="disease-info-item">
                  <span className="disease-info-label">Species</span>
                  <span className="disease-info-value">{diseaseCase.species}</span>
                </div>
                <div className="disease-info-item">
                  <span className="disease-info-label">Breed</span>
                  <span className="disease-info-value">{diseaseCase.breed || 'N/A'}</span>
                </div>
                <div className="disease-info-item">
                  <span className="disease-info-label">Age at Diagnosis</span>
                  <span className="disease-info-value">
                    {calcAgeAtDiagnosis(diseaseCase.date_of_birth, diseaseCase.diagnosis_date) || 'N/A'}
                  </span>
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '14px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className="disease-info-item" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                  <span className="disease-info-label">Owner</span>
                  <span className="disease-info-value">
                    {diseaseCase.owner_first_name} {diseaseCase.owner_last_name}
                  </span>
                </div>
                {diseaseCase.owner_phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', color: '#475569', fontFamily: 'monospace' }}>
                    <i className="fas fa-phone" style={{ color: '#64748b' }}></i>
                    <span>{diseaseCase.owner_phone}</span>
                  </div>
                )}
                {diseaseCase.owner_email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', color: '#475569' }}>
                    <i className="fas fa-envelope" style={{ color: '#64748b' }}></i>
                    <span>{diseaseCase.owner_email}</span>
                  </div>
                )}
              </div>

              <div style={{ paddingTop: '0.5rem' }}>
                <button
                  onClick={() => navigate(`/pets/${diseaseCase.pet_id}`)}
                  className="disease-detail-back-btn"
                  style={{ color: '#2563eb', borderColor: '#bfdbfe', background: '#eff6ff' }}
                >
                  <i className="fas fa-paw"></i>
                  <span>View Pet Profile</span>
                </button>
              </div>
            </div>

            {/* Disease Information Card */}
            <div className="disease-card">
              <h2 className="disease-card-title">
                <i className="fas fa-virus"></i>
                Disease Information
              </h2>
              <div className="disease-info-grid">
                <div className="disease-info-item">
                  <span className="disease-info-label">Disease Category</span>
                  <span className="disease-info-value" style={{ textTransform: 'capitalize' }}>
                    {diseaseCase.disease_category?.replace(/_/g, ' ')}
                  </span>
                </div>
                {diseaseCase.diagnosis_method && (
                  <div className="disease-info-item">
                    <span className="disease-info-label">Diagnosis Method</span>
                    <span className="disease-info-value" style={{ textTransform: 'capitalize' }}>
                      {diseaseCase.diagnosis_method.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
                {diseaseCase.treatment_duration_days && (
                  <div className="disease-info-item">
                    <span className="disease-info-label">Treatment Duration</span>
                    <span className="disease-info-value">{diseaseCase.treatment_duration_days} days</span>
                  </div>
                )}
                <div className="disease-info-item">
                  <span className="disease-info-label">Contagious Disease</span>
                  <span className="disease-info-value" style={{ color: diseaseCase.is_contagious ? '#dc2626' : '#166534' }}>
                    {diseaseCase.is_contagious ? 'Yes' : 'No'}
                    {diseaseCase.is_contagious && diseaseCase.transmission_method && (
                      <span style={{ fontWeight: '400', color: '#64748b', marginLeft: '0.4rem', fontSize: '0.85rem' }}>
                        — {diseaseCase.transmission_method.replace(/_/g, ' ')}
                      </span>
                    )}
                  </span>
                </div>
                {diseaseCase.appointment_id && (
                  <div className="disease-info-item">
                    <span className="disease-info-label">Related Appointment</span>
                    <span
                      onClick={() => openApptModal(diseaseCase.appointment_id)}
                      className="disease-info-value"
                      style={{ color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      <i className="fas fa-calendar-check" style={{ marginRight: '0.35rem' }}></i>
                      #{diseaseCase.appointment_id}
                    </span>
                  </div>
                )}
                {diseaseCase.medical_record_id && (
                  <div className="disease-info-item">
                    <span className="disease-info-label">Medical Record</span>
                    <span
                      onClick={() => navigate(`/medical-records/${diseaseCase.medical_record_id}`)}
                      className="disease-info-value"
                      style={{ color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      <i className="fas fa-file-medical" style={{ marginRight: '0.35rem' }}></i>
                      MRC-{String(diseaseCase.medical_record_id).padStart(4, '0')}
                    </span>
                  </div>
                )}
              </div>
              {diseaseCase.symptoms && (
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  <span className="disease-info-label">Symptoms</span>
                  <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.9rem', color: '#334155', lineHeight: '1.5' }}>{diseaseCase.symptoms}</p>
                </div>
              )}
              {diseaseCase.notes && (
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  <span className="disease-info-label">Additional Notes</span>
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {diseaseCase.notes.split('|').filter(l => l.trim()).map((line, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.875rem', color: '#334155' }}>
                        <i className="fas fa-circle-dot" style={{ fontSize: '0.5rem', color: '#2563eb' }}></i>
                        <span>{line.trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Lab Reports Card */}
            <div className="disease-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                <h2 className="disease-card-title" style={{ border: 'none', padding: 0 }}>
                  <i className="fas fa-flask" style={{ color: '#6366f1' }}></i>
                  Lab Reports
                  {labReports.length > 0 && (
                    <span style={{ marginLeft: '0.5rem', background: '#eef2ff', color: '#4f46e5', fontSize: '0.72rem', fontWeight: '700', padding: '0.15rem 0.55rem', borderRadius: '9999px' }}>
                      {labReports.length}
                    </span>
                  )}
                </h2>
                {isVetOrAdmin && (
                  <button onClick={() => { setShowUploadForm(v => !v); setLabError(''); }} className="disease-btn-edit" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
                    <i className={`fas fa-${showUploadForm ? 'minus' : 'plus'}`}></i>
                    <span>{showUploadForm ? 'Cancel' : 'Upload'}</span>
                  </button>
                )}
              </div>

              {labError && (
                <div style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '10px', padding: '0.65rem 0.85rem', fontSize: '0.85rem' }}>
                  {labError}
                </div>
              )}
              {labSuccess && (
                <div style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '0.65rem 0.85rem', fontSize: '0.85rem' }}>
                  {labSuccess}
                </div>
              )}

              {showUploadForm && (
                <form onSubmit={handleLabReportUpload} style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>Fields marked with <span style={{ color: '#ef4444' }}>*</span> are required.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                    <div>
                      <label className="disease-info-label">Report Name <span style={{ color: '#dc2626' }}>*</span></label>
                      <input name="report_name" value={uploadForm.report_name} onChange={handleUploadFormChange} placeholder="e.g. Blood Panel – March 2026" style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} required />
                    </div>
                    <div>
                      <label className="disease-info-label">Report Type <span style={{ color: '#dc2626' }}>*</span></label>
                      <select name="report_type" value={uploadForm.report_type} onChange={handleUploadFormChange} style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', backgroundColor: 'white' }} required>
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
                  <div>
                    <label className="disease-info-label">File <span style={{ color: '#dc2626' }}>*</span> <span style={{ color: '#94a3b8', fontWeight: '400', textTransform: 'none' }}>(PDF or image, max 10MB)</span></label>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => setUploadFile(e.target.files[0])} style={{ width: '100%', padding: '0.45rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', backgroundColor: 'white' }} required />
                  </div>
                  <div>
                    <label className="disease-info-label">Notes <span style={{ color: '#94a3b8', fontWeight: '400', textTransform: 'none' }}>(optional)</span></label>
                    <input name="notes" value={uploadForm.notes} onChange={handleUploadFormChange} placeholder="Any additional notes..." style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                    <button type="submit" disabled={uploading} className="disease-btn-edit" style={{ opacity: uploading ? 0.6 : 1 }}>
                      <i className={`fas fa-${uploading ? 'circle-notch fa-spin' : 'upload'}`}></i>
                      <span>{uploading ? 'Uploading...' : 'Upload Report'}</span>
                    </button>
                  </div>
                </form>
              )}

              {labReportsLoading ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontSize: '0.9rem' }}>
                  <i className="fas fa-circle-notch fa-spin" style={{ marginRight: '0.4rem' }}></i>
                  Loading reports...
                </div>
              ) : labReports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1.5rem', color: '#64748b' }}>
                  <i className="fas fa-folder-open" style={{ fontSize: '2.2rem', color: '#cbd5e1', display: 'block', marginBottom: '0.5rem' }}></i>
                  <span>No lab reports linked to this case yet</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {labReports.map(report => (
                    <div key={report.report_id} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.9rem 1.1rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className={`fas fa-file-${report.file_type === 'pdf' ? 'pdf' : 'image'}`} style={{ fontSize: '1.2rem', color: report.file_type === 'pdf' ? '#dc2626' : '#7c3aed' }}></i>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#0f172a' }}>{report.report_name}</span>
                          <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#4f46e5', backgroundColor: '#eef2ff', padding: '0.12rem 0.5rem', borderRadius: '9999px', textTransform: 'capitalize' }}>{report.report_type.replace(/_/g, ' ')}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.85rem', fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
                          <span><i className="fas fa-user" style={{ marginRight: '0.25rem' }}></i>{report.uploaded_by_name || 'Unknown'}</span>
                          <span><i className="fas fa-calendar" style={{ marginRight: '0.25rem' }}></i>{formatDate(report.created_at)}</span>
                        </div>
                        {report.notes && <p style={{ fontSize: '0.8rem', color: '#475569', margin: '0.25rem 0 0 0' }}>{report.notes}</p>}
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                        <button onClick={() => openLabReport(report.report_id, report.file_type)} className="disease-detail-back-btn" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} title="View">
                          <i className="fas fa-eye"></i>
                        </button>
                        {isVetOrAdmin && (
                          <button onClick={() => handleDeleteLabReport(report.report_id, report.report_name)} className="disease-btn-delete" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} title="Delete">
                            <i className="fas fa-trash"></i>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Column (Sidebar) */}
          <div className="disease-right-col">

            {/* Timeline Card */}
            <div className="disease-card">
              <h2 className="disease-card-title">
                <i className="fas fa-calendar-days"></i>
                Case Timeline
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#eff6ff', border: '2px solid #2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="fas fa-stethoscope" style={{ fontSize: '0.75rem', color: '#2563eb' }}></i>
                  </div>
                  <div>
                    <span className="disease-info-label">Diagnosis Date</span>
                    <div className="disease-info-value">{formatDate(diseaseCase.diagnosis_date)}</div>
                  </div>
                </div>

                {diseaseCase.treatment_duration && (
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f0fdf4', border: '2px solid #16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="fas fa-kit-medical" style={{ fontSize: '0.75rem', color: '#16a34a' }}></i>
                    </div>
                    <div>
                      <span className="disease-info-label">Treatment Duration</span>
                      <div className="disease-info-value">{diseaseCase.treatment_duration} days</div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f8fafc', border: '2px solid #94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="fas fa-plus" style={{ fontSize: '0.75rem', color: '#64748b' }}></i>
                  </div>
                  <div>
                    <span className="disease-info-label">Record Created</span>
                    <div className="disease-info-value">{formatDate(diseaseCase.created_at)}</div>
                    {diseaseCase.created_by_name && (
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Dr. {diseaseCase.created_by_name}</span>
                    )}
                  </div>
                </div>

                {diseaseCase.updated_at && (
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#fffbeb', border: '2px solid #d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="fas fa-pen" style={{ fontSize: '0.75rem', color: '#d97706' }}></i>
                    </div>
                    <div>
                      <span className="disease-info-label">Last Updated</span>
                      <div className="disease-info-value">{formatDate(diseaseCase.updated_at)}</div>
                      {diseaseCase.updated_by_name && (
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Dr. {diseaseCase.updated_by_name}</span>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Location Card */}
            {diseaseCase.region && (
              <div className="disease-card">
                <h2 className="disease-card-title">
                  <i className="fas fa-location-dot"></i>
                  Location
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  <i className="fas fa-map-pin" style={{ color: '#2563eb' }}></i>
                  <span className="disease-info-value">{diseaseCase.region}</span>
                </div>
              </div>
            )}

            {/* Follow-up Monitoring Card */}
            {(diseaseCase.requires_followup || followups.length > 0 || ['ongoing_treatment', 'chronic'].includes(diseaseCase.outcome)) && (
              <div className="disease-card" style={{ borderTop: '4px solid #f59e0b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                  <h2 className="disease-card-title" style={{ border: 'none', padding: 0 }}>
                    <i className="fas fa-calendar-check" style={{ color: '#f59e0b' }}></i>
                    Follow-up Monitoring
                  </h2>
                  {isVetOrAdmin && (diseaseCase.requires_followup || ['ongoing_treatment', 'chronic'].includes(diseaseCase.outcome)) && (
                    <button
                      onClick={() => { setShowFollowupForm(v => !v); setFollowupError(''); }}
                      className="disease-btn-edit"
                      style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: showFollowupForm ? '#f1f5f9' : '#f59e0b', color: showFollowupForm ? '#475569' : '#ffffff', boxShadow: 'none' }}
                    >
                      <i className={`fas fa-${showFollowupForm ? 'minus' : 'plus'}`}></i>
                      <span>{showFollowupForm ? 'Cancel' : 'Record Visit'}</span>
                    </button>
                  )}
                </div>

                {/* Active follow-up status */}
                {(diseaseCase.requires_followup || ['ongoing_treatment', 'chronic'].includes(diseaseCase.outcome)) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {diseaseCase.followup_type && (
                      <div className="disease-info-item">
                        <span className="disease-info-label">Follow-up Type</span>
                        <span className="disease-info-value" style={{ textTransform: 'capitalize' }}>
                          {diseaseCase.followup_type.replace(/_/g, ' ')}
                        </span>
                      </div>
                    )}
                    {diseaseCase.next_followup_date && (
                      <div className="disease-info-item">
                        <span className="disease-info-label">Next Scheduled Follow-up</span>
                        <span className="disease-info-value" style={{ color: new Date(diseaseCase.next_followup_date) < new Date() ? '#dc2626' : '#2563eb' }}>
                          {formatDate(diseaseCase.next_followup_date)}
                          {new Date(diseaseCase.next_followup_date) < new Date() && (
                            <span style={{ marginLeft: '0.4rem', fontSize: '0.72rem', color: '#dc2626', fontWeight: '700' }}>
                              (OVERDUE)
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    {diseaseCase.followup_notes && (
                      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '0.85rem 1rem', fontSize: '0.875rem', color: '#92400e', lineHeight: '1.5' }}>
                        <strong>Instructions:</strong> {diseaseCase.followup_notes}
                      </div>
                    )}
                    {isVetOrAdmin && (
                      <button
                        onClick={handleMarkRecovered}
                        disabled={markingRecovered}
                        className="disease-detail-back-btn"
                        style={{ backgroundColor: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0', width: '100%', justifyContent: 'center' }}
                      >
                        <i className={`fas fa-${markingRecovered ? 'circle-notch fa-spin' : 'circle-check'}`}></i>
                        <span>{markingRecovered ? 'Updating...' : 'Mark as Recovered'}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Record Visit Form */}
                {showFollowupForm && isVetOrAdmin && (diseaseCase.requires_followup || ['ongoing_treatment', 'chronic'].includes(diseaseCase.outcome)) && (
                  <form onSubmit={handleRecordFollowup} style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: '700', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Record Follow-up Visit</p>
                    {followupError && (
                      <div style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.82rem' }}>
                        {followupError}
                      </div>
                    )}
                    <div>
                      <label className="disease-info-label">Visit Date <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        type="date"
                        value={followupForm.visit_date}
                        onChange={e => setFollowupForm(prev => ({ ...prev, visit_date: e.target.value }))}
                        style={{ width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.875rem', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', boxSizing: 'border-box' }}
                        required
                      />
                    </div>
                    <div>
                      <label className="disease-info-label">Visit Notes <span style={{ color: '#dc2626' }}>*</span></label>
                      <textarea
                        value={followupForm.notes}
                        onChange={e => setFollowupForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Observations, treatment updates, patient condition..."
                        rows={3}
                        style={{ width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.875rem', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                        required
                      />
                    </div>
                    <div>
                      <label className="disease-info-label">
                        Next Follow-up Date
                        <span style={{ fontWeight: '400', color: '#94a3b8', marginLeft: '0.35rem' }}>(optional)</span>
                      </label>
                      <input
                        type="date"
                        value={followupForm.next_followup_date}
                        onChange={e => setFollowupForm(prev => ({ ...prev, next_followup_date: e.target.value }))}
                        min={new Date().toISOString().split('T')[0]}
                        style={{ width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.875rem', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={followupSubmitting}
                      className="disease-btn-edit"
                      style={{ background: '#f59e0b', width: '100%', justifyContent: 'center', boxShadow: 'none' }}
                    >
                      <i className={`fas fa-${followupSubmitting ? 'circle-notch fa-spin' : 'floppy-disk'}`}></i>
                      <span>{followupSubmitting ? 'Saving...' : 'Save Visit Record'}</span>
                    </button>
                  </form>
                )}

                {/* Success Message */}
                {followupSuccess && (
                  <div style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '0.6rem 0.85rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <i className="fas fa-circle-check"></i>
                    <span>{followupSuccess}</span>
                  </div>
                )}

                {/* Visit History */}
                {followupsLoading ? (
                  <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b', fontSize: '0.85rem' }}>
                    <i className="fas fa-circle-notch fa-spin" style={{ marginRight: '0.4rem' }}></i>Loading history...
                  </div>
                ) : followups.length > 0 && (
                  <div>
                    <span className="disease-info-label" style={{ display: 'block', marginBottom: '0.6rem' }}>
                      Visit History ({followups.length})
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {followups.map((fu, idx) => (
                        <div key={fu.followup_id} style={{ background: idx === 0 ? '#fffbeb' : '#f8fafc', border: `1px solid ${idx === 0 ? '#fde68a' : '#f1f5f9'}`, borderRadius: '12px', padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a' }}>
                              <i className="fas fa-calendar" style={{ marginRight: '0.35rem', color: '#f59e0b' }}></i>
                              {formatDate(fu.visit_date)}
                            </span>
                            {idx === 0 && (
                              <span style={{ fontSize: '0.68rem', background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a', borderRadius: '9999px', padding: '0.1rem 0.5rem', fontWeight: '700' }}>LATEST</span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            <i className="fas fa-user-doctor" style={{ marginRight: '0.3rem' }}></i>
                            Dr. {fu.recorded_by_name || 'Unknown'}
                          </div>
                          <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155', lineHeight: '1.5' }}>{fu.notes}</p>
                          {fu.next_followup_date ? (
                            <div style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: '600', marginTop: '0.2rem' }}>
                              <i className="fas fa-arrow-right" style={{ marginRight: '0.3rem' }}></i>
                              Next scheduled: {formatDate(fu.next_followup_date)}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', marginTop: '0.2rem' }}>
                              <i className="fas fa-check-circle" style={{ marginRight: '0.3rem', color: '#16a34a' }}></i>
                              No further follow-up scheduled
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Recover Modal */}
      {showRecoverModal && (
        <div className="pet-modal-overlay" onClick={() => setShowRecoverModal(false)}>
          <div className="pet-modal-card" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="pet-modal-header">
              <h3 className="pet-modal-title">
                <i className="fas fa-circle-check" style={{ color: '#16a34a' }}></i>
                Mark as Recovered
              </h3>
              <button onClick={() => setShowRecoverModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.1rem', color: '#64748b', cursor: 'pointer' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="pet-modal-body">
              <p style={{ margin: 0, color: '#334155', fontSize: '0.95rem' }}>
                Mark this case as recovered? Follow-up monitoring will be stopped.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  onClick={() => setShowRecoverModal(false)}
                  className="disease-detail-back-btn"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmMarkRecovered}
                  className="disease-btn-edit"
                  style={{ background: '#16a34a' }}
                >
                  <i className="fas fa-circle-check"></i>
                  <span>Mark as Recovered</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Lab Report Modal */}
      {deleteLabReportModal.open && (
        <div className="pet-modal-overlay" onClick={() => setDeleteLabReportModal({ open: false, reportId: null, reportName: '' })}>
          <div className="pet-modal-card" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="pet-modal-header">
              <h3 className="pet-modal-title">
                <i className="fas fa-trash" style={{ color: '#dc2626' }}></i>
                Delete Lab Report
              </h3>
              <button onClick={() => setDeleteLabReportModal({ open: false, reportId: null, reportName: '' })} style={{ background: 'none', border: 'none', fontSize: '1.1rem', color: '#64748b', cursor: 'pointer' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="pet-modal-body">
              <p style={{ margin: 0, color: '#334155', fontSize: '0.95rem' }}>
                Are you sure you want to delete this lab report? This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  onClick={() => setDeleteLabReportModal({ open: false, reportId: null, reportName: '' })}
                  className="disease-detail-back-btn"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteLabReport}
                  className="disease-btn-delete"
                >
                  <i className="fas fa-trash"></i> Delete Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="pet-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="pet-modal-card" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="pet-modal-header">
              <h3 className="pet-modal-title">
                <i className="fas fa-triangle-exclamation" style={{ color: '#dc2626' }}></i>
                Delete Disease Case
              </h3>
              <button onClick={() => setShowDeleteModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.1rem', color: '#64748b', cursor: 'pointer' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="pet-modal-body">
              <p style={{ margin: 0, color: '#334155', fontSize: '0.9rem', lineHeight: '1.5' }}>
                This record will be permanently removed. A reason is required and will be
                recorded in the audit log for compliance purposes.
              </p>

              <div>
                <label className="disease-info-label" style={{ marginBottom: '0.35rem' }}>
                  Reason for Deletion <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={deleteReason}
                  onChange={e => setDeleteReason(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', backgroundColor: 'white' }}
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

              <div>
                <label className="disease-info-label" style={{ marginBottom: '0.35rem' }}>Additional Notes <span style={{ color: '#94a3b8', fontWeight: '400', textTransform: 'none' }}>(optional)</span></label>
                <textarea
                  value={deleteNotes}
                  onChange={e => setDeleteNotes(e.target.value)}
                  rows={3}
                  placeholder="Provide any additional context..."
                  style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="disease-detail-back-btn"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting || !deleteReason}
                  className="disease-btn-delete"
                  style={{ opacity: (deleting || !deleteReason) ? 0.5 : 1, cursor: (deleting || !deleteReason) ? 'not-allowed' : 'pointer' }}
                >
                  <i className={`fas fa-${deleting ? 'circle-notch fa-spin' : 'trash'}`}></i>
                  <span>{deleting ? 'Deleting...' : 'Confirm Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Detail Modal */}
      {apptModal && (
        <div className="pet-modal-overlay" onClick={() => setApptModal(null)}>
          <div className="pet-modal-card" style={{ maxWidth: '520px', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="pet-modal-header">
              <h3 className="pet-modal-title">
                <i className="fas fa-calendar-check" style={{ color: '#2563eb' }}></i>
                Appointment Details
              </h3>
              <button onClick={() => setApptModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.1rem', color: '#64748b', cursor: 'pointer' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="pet-modal-body">
              {apptModalLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  <i className="fas fa-circle-notch fa-spin" style={{ marginRight: '0.4rem' }}></i>Loading appointment...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div className="disease-info-grid">
                    <div className="disease-info-item">
                      <span className="disease-info-label">Appt ID</span>
                      <span className="disease-info-value">#{apptModal.appointment_id}</span>
                    </div>
                    <div className="disease-info-item">
                      <span className="disease-info-label">Date & Time</span>
                      <span className="disease-info-value">{formatDate(apptModal.appointment_date)} · {formatTime(apptModal.appointment_time)}</span>
                    </div>
                    <div className="disease-info-item">
                      <span className="disease-info-label">Status</span>
                      <span className="disease-info-value" style={{ color: getApptStatusColor(apptModal.status), textTransform: 'uppercase' }}>{apptModal.status?.replace('_', ' ')}</span>
                    </div>
                    <div className="disease-info-item">
                      <span className="disease-info-label">Type</span>
                      <span className="disease-info-value">{apptModal.appointment_type || 'General'}</span>
                    </div>
                  </div>
                  {apptModal.reason_for_visit && (
                    <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <span className="disease-info-label">Reason for Visit</span>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#334155' }}>{apptModal.reason_for_visit}</p>
                    </div>
                  )}
                  {apptModal.notes && (
                    <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <span className="disease-info-label">Notes</span>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#334155' }}>{apptModal.notes}</p>
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button onClick={() => setApptModal(null)} className="disease-detail-back-btn">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
};

export default DiseaseCaseDetail;
