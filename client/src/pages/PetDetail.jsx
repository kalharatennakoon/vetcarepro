import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPetById, updatePet, deletePet, checkPetDeletability, inactivatePet, getPetMedicalHistory, getPetVaccinations, uploadPetImage, deletePetImage } from '../services/petService';
import { getLabReports, uploadLabReport, openLabReport, deleteLabReport, emailLabReport } from '../services/labReportService';
import { getDiseaseCasesByPet } from '../services/diseaseCaseService';
import { sendCustomerEmail } from '../services/emailService';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';
import ImageCropModal from '../components/ImageCropModal';
import PetHealthPredictions from '../components/PetHealthPredictions';
import '../styles/PetDetailModern.css';

const PetDetail = () => {
  const [pet, setPet] = useState(null);
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const errorRef = useRef(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);
  const [activeTab, setActiveTab] = useState('info');
  useEffect(() => { window.scrollTo(0, 0); document.documentElement.scrollTo(0, 0); document.getElementById('main-content')?.scrollTo(0, 0); }, [activeTab]);
  const [labReports, setLabReports] = useState([]);
  const [labReportsLoading, setLabReportsLoading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState({ report_name: '', report_type: '', notes: '', related_case_id: '' });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [emailModal, setEmailModal] = useState({ open: false, report: null });
  const [emailMessage, setEmailMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [success, setSuccess] = useState('');
  
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [breedingAvailable, setBreedingAvailable] = useState(false);
  const [breedingNotes, setBreedingNotes] = useState('');
  const [savingBreeding, setSavingBreeding] = useState(false);
  const [ownerEmailOpen, setOwnerEmailOpen] = useState(false);
  const [ownerEmailForm, setOwnerEmailForm] = useState({ subject: '', message: '' });
  const [ownerEmailSending, setOwnerEmailSending] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteImageModal, setShowDeleteImageModal] = useState(false);
  const [deleteLabReportModal, setDeleteLabReportModal] = useState({ open: false, reportId: null, reportName: '' });
  const [deletability, setDeletability] = useState(null);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [deceasedDate, setDeceasedDate] = useState('');
  const [deactivateNote, setDeactivateNote] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [diseaseCases, setDiseaseCases] = useState([]);
  const [diseaseCasesLoading, setDiseaseCasesLoading] = useState(false);

  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useNotification();

  useEffect(() => {
    fetchPetDetails();
    fetchMedicalHistory();
    fetchVaccinations();
    fetchLabReports();
    fetchDiseaseCases();
  }, [id]);

  const fetchPetDetails = async () => {
    try {
      setLoading(true);
      const response = await getPetById(id);
      const p = response.data.pet;
      setPet(p);
      setBreedingAvailable(p.breeding_available || false);
      setBreedingNotes(p.breeding_notes || '');
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load pet details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMedicalHistory = async () => {
    try {
      const response = await getPetMedicalHistory(id);
      setMedicalHistory(response.data?.medical_history || []);
    } catch (err) {
      console.error('Failed to fetch medical history:', err);
    }
  };

  const fetchVaccinations = async () => {
    try {
      const response = await getPetVaccinations(id);
      setVaccinations(response.data?.vaccinations || []);
    } catch (err) {
      console.error('Failed to fetch vaccinations:', err);
    }
  };

  const openDeleteModal = async () => {
    try {
      const response = await checkPetDeletability(id);
      setDeletability(response.data);
      setDeactivateReason('');
      setDeceasedDate('');
      setDeactivateNote('');
      setShowDeleteModal(true);
    } catch (err) {
      showError('Failed to check pet status');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deletePet(id);
      showSuccess(`${pet.pet_name} has been permanently deleted`);
      navigate('/pets');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete pet');
    } finally {
      setDeleting(false);
    }
  };

  const handleInactivate = async () => {
    if (!deactivateReason) {
      showWarning('Please select a reason for inactivation');
      return;
    }
    if (deactivateReason === 'deceased' && !deceasedDate) {
      showWarning('Please provide the date of death');
      return;
    }
    setDeleting(true);
    try {
      await inactivatePet(id, {
        reason: deactivateReason,
        deceased_date: deactivateReason === 'deceased' ? deceasedDate : undefined,
        additional_note: deactivateNote || undefined
      });
      showSuccess(`${pet.pet_name} has been inactivated`);
      setShowDeleteModal(false);
      fetchPetDetails();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to inactivate pet');
    } finally {
      setDeleting(false);
    }
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return 'Unknown';
    const birth = new Date(birthDate);
    const today = new Date();
    const ageInMonths = (today.getFullYear() - birth.getFullYear()) * 12 + 
                        (today.getMonth() - birth.getMonth());
    
    if (ageInMonths < 12) {
      return `${ageInMonths} ${ageInMonths === 1 ? 'month' : 'months'}`;
    }
    const years = Math.floor(ageInMonths / 12);
    const months = ageInMonths % 12;
    if (months === 0) {
      return `${years} ${years === 1 ? 'year' : 'years'}`;
    }
    return `${years}y ${months}m`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImageToCrop(reader.result);
        setShowCropModal(true);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const handleCropComplete = (croppedBlob) => {
    const croppedUrl = URL.createObjectURL(croppedBlob);
    setImagePreview(croppedUrl);
    
    const fileName = `pet-${Date.now()}.jpg`;
    const croppedFile = new File([croppedBlob], fileName, { type: 'image/jpeg' });
    setSelectedImage(croppedFile);
    
    setShowCropModal(false);
    setImageToCrop(null);
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setImageToCrop(null);
  };

  const handleImageUpload = async () => {
    if (!selectedImage) {
      setError('Please select an image first');
      return;
    }

    try {
      setUploadingImage(true);
      setError('');
      await uploadPetImage(id, selectedImage);
      
      setSuccess('Pet image uploaded successfully');
      setSelectedImage(null);
      setImagePreview(null);
      
      await fetchPetDetails();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload image');
      console.error('Error uploading image:', err);
    } finally {
      setUploadingImage(false);
    }
  };

  const cancelImageSelection = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setError('');
  };

  const handleImageDelete = async () => {
    try {
      setUploadingImage(true);
      setError('');
      await deletePetImage(id);
      setSuccess('Pet image removed successfully');
      setShowDeleteImageModal(false);
      await fetchPetDetails();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove image');
      console.error('Error removing image:', err);
    } finally {
      setUploadingImage(false);
    }
  };

  const fetchLabReports = async () => {
    try {
      setLabReportsLoading(true);
      const res = await getLabReports(id);
      setLabReports(res.data?.reports || []);
    } catch (err) {
      console.error('Failed to fetch lab reports:', err);
    } finally {
      setLabReportsLoading(false);
    }
  };

  const fetchDiseaseCases = async () => {
    try {
      setDiseaseCasesLoading(true);
      const res = await getDiseaseCasesByPet(id);
      setDiseaseCases(res.data?.cases || []);
    } catch (err) {
      console.error('Failed to fetch disease cases:', err);
    } finally {
      setDiseaseCasesLoading(false);
    }
  };

  const handleUploadFormChange = (e) => {
    const { name, value } = e.target;
    setUploadForm(prev => ({ ...prev, [name]: value }));
  };

  const handleLabReportUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      showWarning('Please select a file to upload.');
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('pet_id', id);
      formData.append('report_name', uploadForm.report_name);
      formData.append('report_type', uploadForm.report_type);
      if (uploadForm.notes) formData.append('notes', uploadForm.notes);
      if (uploadForm.related_case_id) formData.append('related_case_id', uploadForm.related_case_id);
      formData.append('file', uploadFile);

      await uploadLabReport(formData);
      showSuccess('Lab report uploaded successfully.');
      setShowUploadForm(false);
      setUploadForm({ report_name: '', report_type: '', notes: '', related_case_id: '' });
      setUploadFile(null);
      fetchLabReports();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to upload report.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteLabReport = (reportId, reportName) => {
    setDeleteLabReportModal({ open: true, reportId, reportName });
  };

  const confirmDeleteLabReport = async () => {
    const { reportId, reportName } = deleteLabReportModal;
    if (!reportId) return;
    try {
      await deleteLabReport(reportId);
      showSuccess(`Lab report "${reportName}" deleted.`);
      setDeleteLabReportModal({ open: false, reportId: null, reportName: '' });
      fetchLabReports();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete lab report.');
    }
  };

  const handleSaveBreeding = async () => {
    try {
      setSavingBreeding(true);
      await updatePet(id, { breeding_available: breedingAvailable, breeding_notes: breedingNotes || null });
      showSuccess(breedingAvailable ? 'Pet listed in breeding registry' : 'Pet removed from breeding registry');
      fetchPetDetails();
    } catch (err) {
      showError('Failed to update breeding status');
    } finally {
      setSavingBreeding(false);
    }
  };

  const handleSendOwnerEmail = async () => {
    if (!ownerEmailForm.subject.trim() || !ownerEmailForm.message.trim()) return;
    setOwnerEmailSending(true);
    try {
      const res = await sendCustomerEmail({
        customerId: pet.customer_id,
        subject: ownerEmailForm.subject,
        message: ownerEmailForm.message
      });
      showSuccess(res.message || 'Email sent successfully');
      setOwnerEmailOpen(false);
      setOwnerEmailForm({ subject: '', message: '' });
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to send email');
    } finally {
      setOwnerEmailSending(false);
    }
  };

  const handleEmailReport = async () => {
    try {
      setSending(true);
      const res = await emailLabReport(emailModal.report.report_id, emailMessage);
      showSuccess(res.message || 'Lab report sent successfully');
      setEmailModal({ open: false, report: null });
      setEmailMessage('');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleOpenReport = async (reportId, fileType) => {
    try {
      await openLabReport(reportId, fileType);
    } catch (err) {
      showError('Failed to open report file');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: '#64748b' }}>
          <div style={{ border: '3px solid #e2e8f0', borderTop: '3px solid #3b82f6', borderRadius: '50%', width: '42px', height: '42px', animation: 'spin 1s linear infinite', marginBottom: '1rem' }}></div>
          <p>Loading pet details...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div ref={errorRef} style={{ maxWidth: '600px', margin: '3rem auto', padding: '2rem', background: '#ffffff', border: '1px solid #fee2e2', borderRadius: '16px', textAlign: 'center' }}>
          <h2 style={{ color: '#dc2626', margin: '0 0 1rem 0' }}>Error</h2>
          <p style={{ color: '#4b5563', marginBottom: '1.5rem' }}>{error}</p>
          <button onClick={() => navigate('/pets')} className="pet-detail-back-btn">
            <i className="fas fa-arrow-left"></i> Back to Pets
          </button>
        </div>
      </Layout>
    );
  }

  if (!pet) {
    return (
      <Layout>
        <div style={{ maxWidth: '600px', margin: '3rem auto', padding: '2rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', textAlign: 'center' }}>
          <h2 style={{ color: '#0f172a', margin: '0 0 1.5rem 0' }}>Pet Not Found</h2>
          <button onClick={() => navigate('/pets')} className="pet-detail-back-btn">
            <i className="fas fa-arrow-left"></i> Back to Pets
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {showCropModal && (
        <ImageCropModal
          image={imageToCrop}
          onCancel={handleCropCancel}
          onComplete={handleCropComplete}
        />
      )}
      
      <div className="pet-detail-container">
        {/* Top Navigation Bar */}
        <div className="pet-detail-top-nav">
          <button onClick={() => navigate('/pets')} className="pet-detail-back-btn">
            <i className="fas fa-arrow-left"></i>
            <span>Back to Pets</span>
          </button>
          <div className="pet-detail-actions">
            <button onClick={() => navigate(`/pets/${id}/edit`)} className="pet-btn-edit">
              <i className="fas fa-edit"></i>
              <span>Edit Pet</span>
            </button>
            {(pet.is_active || user?.role === 'admin') && (
              <button onClick={openDeleteModal} className="pet-btn-delete">
                <i className="fas fa-trash"></i>
                <span>{!pet.is_active ? 'Delete' : user?.role === 'admin' ? 'Delete / Inactivate' : 'Inactivate'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="pet-alert-error">
            <i className="fas fa-exclamation-circle"></i>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="pet-alert-success">
            <i className="fas fa-check-circle"></i>
            <span>{success}</span>
          </div>
        )}

        {/* Pet Profile Card */}
        <div className="pet-profile-card">
          {/* Profile Hero Header */}
          <div className="pet-profile-hero">
            <div className="pet-hero-left">
              <div className="pet-avatar-wrapper">
                {pet.photo_url ? (
                  <img 
                    src={`http://localhost:3000/uploads/${pet.photo_url}`} 
                    alt={pet.pet_name}
                    className="pet-avatar-img"
                  />
                ) : (
                  <div className="pet-avatar-placeholder">
                    <i className="fas fa-paw"></i>
                  </div>
                )}
              </div>
              <div className="pet-hero-details">
                <div className="pet-hero-title-row">
                  <h1 className="pet-hero-name">{pet.pet_name}</h1>
                  <span className="pet-hero-id">ID: #{pet.pet_id}</span>
                </div>
                <p className="pet-hero-subtitle">
                  {pet.species || 'Unknown Species'} {pet.breed ? `· ${pet.breed}` : ''}
                </p>
              </div>
            </div>
            <div className="pet-hero-badges">
              <span className={`pet-badge ${pet.is_active ? 'pet-badge-active' : 'pet-badge-inactive'}`}>
                <i className={`fas fa-${pet.is_active ? 'check-circle' : 'ban'}`}></i>
                {pet.is_active ? 'Active' : 'Inactive'}
              </span>
              {pet.gender && (
                <span className={`pet-badge ${pet.gender === 'Male' ? 'pet-badge-male' : 'pet-badge-female'}`}>
                  <i className={`fas fa-${pet.gender === 'Male' ? 'mars' : 'venus'}`}></i>
                  {pet.gender}
                </span>
              )}
            </div>
          </div>

          {/* Modern Tab Bar */}
          <div className="pet-tabs-bar">
            <button
              className={`pet-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              <i className="fas fa-info-circle"></i>
              <span>Information</span>
            </button>
            {(user?.role === 'admin' || user?.role === 'veterinarian') && (
              <button
                className={`pet-tab-btn ${activeTab === 'medical' ? 'active' : ''}`}
                onClick={() => setActiveTab('medical')}
              >
                <i className="fas fa-hospital"></i>
                <span>Medical History</span>
                <span className="pet-tab-badge">{medicalHistory.length}</span>
              </button>
            )}
            <button
              className={`pet-tab-btn ${activeTab === 'vaccinations' ? 'active' : ''}`}
              onClick={() => setActiveTab('vaccinations')}
            >
              <i className="fas fa-syringe"></i>
              <span>Vaccinations</span>
              <span className="pet-tab-badge">{vaccinations.length}</span>
            </button>
            {(user?.role === 'admin' || user?.role === 'veterinarian') && (
              <button
                className={`pet-tab-btn ${activeTab === 'labReports' ? 'active' : ''}`}
                onClick={() => setActiveTab('labReports')}
              >
                <i className="fas fa-flask"></i>
                <span>Lab Reports</span>
                <span className="pet-tab-badge">{labReports.length}</span>
              </button>
            )}
            {(user?.role === 'admin' || user?.role === 'veterinarian') && (
              <button
                className={`pet-tab-btn ${activeTab === 'predictions' ? 'active' : ''}`}
                onClick={() => setActiveTab('predictions')}
              >
                <i className="fas fa-brain"></i>
                <span>Health Predictions</span>
              </button>
            )}
            {(user?.role === 'admin' || user?.role === 'veterinarian') && (
              <button
                className={`pet-tab-btn ${activeTab === 'diseaseCases' ? 'active' : ''}`}
                onClick={() => setActiveTab('diseaseCases')}
              >
                <i className="fas fa-virus"></i>
                <span>Disease Cases</span>
                {diseaseCases.length > 0 && (
                  <span className="pet-tab-badge">{diseaseCases.length}</span>
                )}
              </button>
            )}
          </div>

          {/* Tab Content Container */}
          <div className="pet-tab-content-container">
            {activeTab === 'info' && (
              <>
                {/* Basic Information */}
                <div className="pet-section-card">
                  <div className="pet-section-header">
                    <h2 className="pet-section-title"><i className="fas fa-paw"></i> Basic Information</h2>
                  </div>
                  <div className="pet-info-grid">
                    <div className="pet-info-item">
                      <span className="pet-info-label">Species</span>
                      <span className="pet-info-value">{pet.species || '-'}</span>
                    </div>
                    <div className="pet-info-item">
                      <span className="pet-info-label">Breed</span>
                      <span className="pet-info-value">{pet.breed || '-'}</span>
                    </div>
                    <div className="pet-info-item">
                      <span className="pet-info-label">Date of Birth</span>
                      <span className="pet-info-value">{formatDate(pet.date_of_birth)}</span>
                    </div>
                    <div className="pet-info-item">
                      <span className="pet-info-label">Age</span>
                      <span className="pet-info-value">{calculateAge(pet.date_of_birth)}</span>
                    </div>
                    <div className="pet-info-item">
                      <span className="pet-info-label">Color</span>
                      <span className="pet-info-value">{pet.color || '-'}</span>
                    </div>
                    <div className="pet-info-item">
                      <span className="pet-info-label">Current Weight</span>
                      <span className="pet-info-value">
                        {pet.weight_current ? `${pet.weight_current} kg` : '-'}
                      </span>
                    </div>
                    {pet.created_at && (
                      <div className="pet-info-item">
                        <span className="pet-info-label">Created</span>
                        <span className="pet-info-value">{formatDate(pet.created_at)}</span>
                      </div>
                    )}
                    {pet.updated_at && pet.updated_at !== pet.created_at && (
                      <div className="pet-info-item">
                        <span className="pet-info-label">Updated</span>
                        <span className="pet-info-value">{formatDate(pet.updated_at)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pet Image Section */}
                <div className="pet-section-card">
                  <div className="pet-section-header">
                    <h2 className="pet-section-title"><i className="fas fa-camera"></i> Pet Image Manager</h2>
                  </div>
                  <div className="pet-image-upload-wrapper">
                    <div className="pet-image-preview-box">
                      {imagePreview || pet?.photo_url ? (
                        <img 
                          src={imagePreview || `http://localhost:3000/uploads/${pet.photo_url}`} 
                          alt={pet.pet_name}
                          className="pet-image-preview-img"
                        />
                      ) : (
                        <div className="pet-image-empty-placeholder">
                          <i className="fas fa-paw"></i>
                          <span>No image</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="pet-image-actions-group">
                      <input
                        type="file"
                        id="petImageInput"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={handleImageSelect}
                        style={{ display: 'none' }}
                      />
                      
                      {selectedImage ? (
                        <div className="pet-image-btn-row">
                          <button
                            type="button"
                            onClick={handleImageUpload}
                            disabled={uploadingImage}
                            className="pet-btn-edit"
                          >
                            <i className="fas fa-upload"></i> {uploadingImage ? 'Uploading...' : 'Upload Image'}
                          </button>
                          <button
                            type="button"
                            onClick={cancelImageSelection}
                            disabled={uploadingImage}
                            className="pet-detail-back-btn"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="pet-image-btn-row">
                          <label htmlFor="petImageInput" className="pet-btn-edit" style={{ cursor: 'pointer' }}>
                            <i className="fas fa-camera"></i> Select Image
                          </label>
                          {pet?.photo_url && (
                            <button
                              type="button"
                              onClick={() => setShowDeleteImageModal(true)}
                              disabled={uploadingImage}
                              className="pet-btn-delete"
                            >
                              <i className="fas fa-trash"></i> Remove
                            </button>
                          )}
                        </div>
                      )}
                      <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                        <i className="fas fa-info-circle" style={{ marginRight: '0.25rem' }}></i>
                        Max 5MB • JPEG, PNG, GIF, WebP
                      </p>
                    </div>
                  </div>
                </div>

                {/* Medical Information */}
                <div className="pet-section-card">
                  <div className="pet-section-header">
                    <h2 className="pet-section-title"><i className="fas fa-pills"></i> Medical Information</h2>
                  </div>
                  <div className="pet-info-grid">
                    <div className="pet-info-item">
                      <span className="pet-info-label">Neutered/Spayed</span>
                      <span className="pet-info-value">{pet.is_neutered ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="pet-info-item">
                      <span className="pet-info-label">Allergies</span>
                      <span className="pet-info-value">{pet.allergies || 'None'}</span>
                    </div>
                    <div className="pet-info-item">
                      <span className="pet-info-label">Special Needs</span>
                      <span className="pet-info-value">{pet.special_needs || 'None'}</span>
                    </div>
                    {pet.insurance_provider && (
                      <>
                        <div className="pet-info-item">
                          <span className="pet-info-label">Insurance Provider</span>
                          <span className="pet-info-value">{pet.insurance_provider}</span>
                        </div>
                        <div className="pet-info-item">
                          <span className="pet-info-label">Policy Number</span>
                          <span className="pet-info-value">{pet.insurance_policy_number || '-'}</span>
                        </div>
                      </>
                    )}
                  </div>
                  {pet.notes && (
                    <div style={{ marginTop: '0.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <span className="pet-info-label">Notes</span>
                      <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.9rem', color: '#334155' }}>{pet.notes}</p>
                    </div>
                  )}
                </div>

                {/* Breeding Registry */}
                <div className="pet-section-card">
                  <div className="pet-section-header">
                    <h2 className="pet-section-title">
                      <i className="fas fa-heart" style={{ color: '#ec4899' }}></i>
                      Breeding Registry
                    </h2>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '500' }}>Owner opt-in only</span>
                  </div>
                  <div className="pet-breeding-card">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={breedingAvailable}
                        onChange={e => setBreedingAvailable(e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#ec4899' }}
                      />
                      <div>
                        <span style={{ fontSize: '0.95rem', fontWeight: '700', color: breedingAvailable ? '#be185d' : '#1e293b' }}>
                          {breedingAvailable ? 'Listed in breeding registry' : 'Not listed in breeding registry'}
                        </span>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                          {breedingAvailable ? 'Owner has opted in — this pet will appear in breeding searches.' : 'Check to list this pet for breeding enquiries (with owner consent).'}
                        </p>
                      </div>
                    </label>
                    {breedingAvailable && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Notes for enquiries (optional)
                        </label>
                        <textarea
                          value={breedingNotes}
                          onChange={e => setBreedingNotes(e.target.value)}
                          rows={2}
                          placeholder="e.g. Vaccinated, prefers same breed, contact after 6pm..."
                          style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                        />
                      </div>
                    )}
                    <div>
                      <button
                        onClick={handleSaveBreeding}
                        disabled={savingBreeding}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 1.25rem', backgroundColor: savingBreeding ? '#e2e8f0' : '#ec4899', color: savingBreeding ? '#94a3b8' : 'white', border: 'none', borderRadius: '10px', fontSize: '0.875rem', fontWeight: '600', cursor: savingBreeding ? 'not-allowed' : 'pointer' }}
                      >
                        <i className={`fas fa-${savingBreeding ? 'circle-notch fa-spin' : 'floppy-disk'}`}></i>
                        {savingBreeding ? 'Saving...' : 'Save Breeding Options'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Owner Information */}
                <div className="pet-section-card">
                  <div className="pet-section-header">
                    <h2 className="pet-section-title"><i className="fas fa-user"></i> Owner Information</h2>
                  </div>
                  <div className="pet-info-grid">
                    <div className="pet-info-item">
                      <span className="pet-info-label">Owner</span>
                      <span
                        className="pet-owner-link-btn"
                        onClick={() => setShowOwnerModal(true)}
                      >
                        <i className="fas fa-user-circle"></i>
                        {pet.owner_first_name && pet.owner_last_name
                          ? `${pet.owner_first_name} ${pet.owner_last_name}`
                          : 'Unknown'}
                      </span>
                    </div>
                    {pet.owner_phone && (
                      <div className="pet-info-item">
                        <span className="pet-info-label">Phone</span>
                        <span className="pet-info-value" style={{ fontFamily: 'monospace' }}>{pet.owner_phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'medical' && (
              <div className="pet-section-card">
                <div className="pet-section-header">
                  <h2 className="pet-section-title"><i className="fas fa-hospital"></i> Medical History</h2>
                  {(user?.role === 'admin' || user?.role === 'veterinarian') && (
                    <button 
                      onClick={() => navigate(`/medical-records/new?petId=${id}`)} 
                      className="pet-btn-edit"
                    >
                      + New Medical Record
                    </button>
                  )}
                </div>
                {medicalHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: '#64748b' }}>
                    <i className="fas fa-notes-medical" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '0.75rem', display: 'block' }}></i>
                    <p style={{ margin: 0, fontSize: '0.95rem' }}>No medical history records found</p>
                    {(user?.role === 'admin' || user?.role === 'veterinarian') && (
                      <button 
                        onClick={() => navigate(`/medical-records/new?petId=${id}`)} 
                        className="pet-btn-edit"
                        style={{ marginTop: '1rem' }}
                      >
                        Create First Medical Record
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="pet-history-list">
                    {medicalHistory.map((record) => (
                      <div 
                        key={record.record_id} 
                        className="pet-history-card"
                        onClick={() => navigate(`/medical-records/${record.record_id}`)}
                      >
                        <div className="pet-history-header">
                          <span className="pet-history-date">{formatDate(record.visit_date)}</span>
                          <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#64748b' }}>Medical Record</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.9rem', color: '#334155' }}>
                          <p style={{ margin: 0 }}><strong>Reason:</strong> {record.chief_complaint || 'N/A'}</p>
                          {record.diagnosis && <p style={{ margin: 0 }}><strong>Diagnosis:</strong> {record.diagnosis}</p>}
                          {record.treatment && <p style={{ margin: 0 }}><strong>Treatment:</strong> {record.treatment}</p>}
                          {record.veterinarian_name && <p style={{ margin: 0 }}><strong>Vet:</strong> Dr. {record.veterinarian_name}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'vaccinations' && (
              <div className="pet-section-card">
                <div className="pet-section-header">
                  <h2 className="pet-section-title"><i className="fas fa-syringe"></i> Vaccination Records</h2>
                </div>
                {vaccinations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: '#64748b' }}>
                    <i className="fas fa-syringe" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '0.75rem', display: 'block' }}></i>
                    <p style={{ margin: 0, fontSize: '0.95rem' }}>No vaccination records found</p>
                  </div>
                ) : (
                  <div className="mgmt-table-card">
                    <table className="mgmt-table">
                      <thead>
                        <tr>
                          <th className="mgmt-th">Vaccine Name</th>
                          <th className="mgmt-th">Date Given</th>
                          <th className="mgmt-th">Next Due</th>
                          <th className="mgmt-th">Batch Number</th>
                          <th className="mgmt-th">Administered By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vaccinations.map((vacc) => (
                          <tr key={vacc.vaccination_id} className="mgmt-tr">
                            <td className="mgmt-td" style={{ fontWeight: '700' }}>{vacc.vaccine_name}</td>
                            <td className="mgmt-td">{formatDate(vacc.vaccination_date)}</td>
                            <td className="mgmt-td">
                              <span style={{ fontWeight: '600', color: '#2563eb' }}>{formatDate(vacc.next_due_date)}</span>
                            </td>
                            <td className="mgmt-td" style={{ fontFamily: 'monospace' }}>{vacc.batch_number || '-'}</td>
                            <td className="mgmt-td">{vacc.administered_by_name || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'labReports' && (
              <div className="pet-section-card">
                {/* Section Header */}
                <div className="pet-section-header">
                  <h2 className="pet-section-title">
                    <i className="fas fa-flask" style={{ color: '#6366f1' }}></i>
                    Lab Reports
                  </h2>
                  <button className="pet-btn-edit" onClick={() => setShowUploadForm(prev => !prev)}>
                    <i className={`fas fa-${showUploadForm ? 'times' : 'upload'}`}></i>
                    <span>{showUploadForm ? 'Cancel' : 'Upload Report'}</span>
                  </button>
                </div>

                {/* Upload Form */}
                {showUploadForm && (
                  <form onSubmit={handleLabReportUpload} style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>Fields marked with <span style={{ color: '#ef4444' }}>*</span> are required.</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                      <div>
                        <label className="pet-info-label">Report Name <span style={{ color: '#dc2626' }}>*</span></label>
                        <input
                          type="text"
                          name="report_name"
                          value={uploadForm.report_name}
                          onChange={handleUploadFormChange}
                          placeholder="e.g. Blood Test — March 2026"
                          style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                          required
                        />
                      </div>
                      <div>
                        <label className="pet-info-label">Report Type <span style={{ color: '#dc2626' }}>*</span></label>
                        <select name="report_type" value={uploadForm.report_type} onChange={handleUploadFormChange} style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', backgroundColor: 'white' }} required>
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
                      <div>
                        <label className="pet-info-label">File <span style={{ color: '#dc2626' }}>*</span></label>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          onChange={e => setUploadFile(e.target.files[0] || null)}
                          style={{ width: '100%', padding: '0.45rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', backgroundColor: 'white' }}
                          required
                        />
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem', display: 'block' }}>JPEG, PNG, WebP or PDF — max 10 MB</span>
                      </div>
                      <div>
                        <label className="pet-info-label">Notes (optional)</label>
                        <input
                          type="text"
                          name="notes"
                          value={uploadForm.notes}
                          onChange={handleUploadFormChange}
                          placeholder="Any relevant notes..."
                          style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                      <button type="submit" disabled={uploading} className="pet-btn-edit">
                        <i className="fas fa-upload"></i>
                        <span>{uploading ? 'Uploading...' : 'Upload Report'}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Report List */}
                {labReportsLoading ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}><p>Loading lab reports...</p></div>
                ) : labReports.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: '#64748b' }}>
                    <i className="fas fa-file-medical" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '0.75rem', display: 'block' }}></i>
                    <p style={{ margin: 0, fontSize: '0.95rem' }}>No lab reports uploaded yet</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {labReports.map(report => (
                      <div key={report.report_id} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '1.1rem 1.25rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <i className={`fas fa-${report.file_type === 'pdf' ? 'file-pdf' : 'file-image'}`}
                             style={{ fontSize: '1.4rem', color: report.file_type === 'pdf' ? '#ef4444' : '#3b82f6' }}></i>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a' }}>{report.report_name}</span>
                            <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#4f46e5', backgroundColor: '#eef2ff', padding: '0.15rem 0.55rem', borderRadius: '9999px', textTransform: 'capitalize' }}>{report.report_type.replace('_', ' ')}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: '#64748b', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                            <span><i className="fas fa-calendar-alt" style={{ marginRight: '0.3rem' }}></i>{formatDate(report.created_at)}</span>
                            <span><i className="fas fa-user" style={{ marginRight: '0.3rem' }}></i>{report.uploaded_by_name || 'Unknown'}</span>
                          </div>
                          {report.notes && <p style={{ fontSize: '0.82rem', color: '#475569', margin: '0.35rem 0 0 0' }}>{report.notes}</p>}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0 }}>
                          <button onClick={() => handleOpenReport(report.report_id, report.file_type)} className="pet-detail-back-btn" style={{ padding: '0.4rem 0.85rem' }}>
                            <i className="fas fa-eye"></i> View
                          </button>
                          <button onClick={() => { setEmailModal({ open: true, report }); setEmailMessage(''); }} className="pet-detail-back-btn" style={{ padding: '0.4rem 0.85rem', color: '#166534', borderColor: '#bbf7d0', background: '#f0fdf4' }}>
                            <i className="fas fa-envelope"></i> Email
                          </button>
                          {pet?.owner_phone && (
                            <button
                              onClick={() => {
                                const d = (pet.owner_phone || '').replace(/\D/g, '');
                                const n = d.startsWith('0') ? '94' + d.slice(1) : d;
                                const msg = encodeURIComponent(`Hi, please find the lab report "${report.report_name}" for ${pet.pet_name} from Pro Pet Animal Hospital.`);
                                window.open(`https://wa.me/${n}?text=${msg}`, '_blank');
                              }}
                              className="pet-detail-back-btn"
                              style={{ padding: '0.4rem 0.85rem', backgroundColor: '#25d366', color: 'white', border: 'none' }}
                            >
                              <i className="fab fa-whatsapp"></i> WhatsApp
                            </button>
                          )}
                          {(user?.role === 'admin' || user?.role === 'veterinarian') && (
                            <button onClick={() => handleDeleteLabReport(report.report_id, report.report_name)} className="pet-btn-delete" style={{ padding: '0.4rem 0.85rem' }}>
                              <i className="fas fa-trash"></i> Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'predictions' && (
              <div className="pet-section-card">
                <PetHealthPredictions pet={pet} />
              </div>
            )}

            {activeTab === 'diseaseCases' && (
              <div className="pet-section-card">
                <div className="pet-section-header">
                  <h2 className="pet-section-title"><i className="fas fa-virus"></i> Disease Cases</h2>
                  {(user?.role === 'admin' || user?.role === 'veterinarian') && (
                    <button
                      onClick={() => navigate(`/disease-cases/create?pet_id=${id}`)}
                      className="pet-btn-edit"
                    >
                      <i className="fas fa-plus"></i> New Disease Case
                    </button>
                  )}
                </div>

                {diseaseCasesLoading ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'block' }}></i>
                    Loading disease cases...
                  </div>
                ) : diseaseCases.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: '#64748b' }}>
                    <i className="fas fa-virus-slash" style={{ fontSize: '2.5rem', color: '#cbd5e1', display: 'block', marginBottom: '0.75rem' }}></i>
                    <p style={{ margin: 0, fontSize: '0.95rem' }}>No disease cases recorded for {pet.pet_name}</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {[...diseaseCases]
                      .sort((a, b) => {
                        const aActive = a.requires_followup || a.outcome === 'ongoing_treatment' || a.outcome === 'chronic';
                        const bActive = b.requires_followup || b.outcome === 'ongoing_treatment' || b.outcome === 'chronic';
                        if (aActive && !bActive) return -1;
                        if (!aActive && bActive) return 1;
                        return new Date(b.diagnosis_date) - new Date(a.diagnosis_date);
                      })
                      .map(dc => {
                        const isActive = dc.requires_followup || dc.outcome === 'ongoing_treatment' || dc.outcome === 'chronic';
                        const today = new Date().toISOString().split('T')[0];
                        const isOverdue = dc.requires_followup && dc.next_followup_date && dc.next_followup_date.split('T')[0] < today;
                        const outcomeColors = {
                          recovered:         { bg: '#dcfce7', color: '#166534' },
                          ongoing_treatment: { bg: '#dbeafe', color: '#1e40af' },
                          chronic:           { bg: '#fef9c3', color: '#854d0e' },
                          deceased:          { bg: '#f3f4f6', color: '#374151' },
                          transferred:       { bg: '#f3e8ff', color: '#6b21a8' },
                        };
                        const severityColors = {
                          mild:     { bg: '#dcfce7', color: '#166534' },
                          moderate: { bg: '#fef9c3', color: '#854d0e' },
                          severe:   { bg: '#ffedd5', color: '#9a3412' },
                          critical: { bg: '#fee2e2', color: '#991b1b' },
                        };
                        const oc = outcomeColors[dc.outcome] || { bg: '#f3f4f6', color: '#374151' };
                        const sc = severityColors[dc.severity] || { bg: '#f3f4f6', color: '#374151' };

                        return (
                          <div
                            key={dc.case_id}
                            style={{
                              backgroundColor: '#fff',
                              border: `1px solid ${isActive ? '#bfdbfe' : '#e2e8f0'}`,
                              borderLeft: `4px solid ${isOverdue ? '#dc2626' : isActive ? '#2563eb' : '#cbd5e1'}`,
                              borderRadius: '14px',
                              padding: '1.1rem 1.25rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              gap: '1rem',
                              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)',
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                                <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#0f172a' }}>{dc.disease_name}</span>
                                <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '0.15rem 0.55rem', borderRadius: '9999px', backgroundColor: sc.bg, color: sc.color }}>
                                  {dc.severity?.toUpperCase()}
                                </span>
                                {dc.outcome && (
                                  <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '0.15rem 0.55rem', borderRadius: '9999px', backgroundColor: oc.bg, color: oc.color }}>
                                    {dc.outcome.replace(/_/g, ' ').toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: dc.requires_followup ? '0.5rem' : 0 }}>
                                <i className="fas fa-calendar-alt" style={{ marginRight: '0.3rem' }}></i>
                                {new Date(dc.diagnosis_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                {dc.created_by_name && (
                                  <span style={{ marginLeft: '0.75rem' }}>
                                    <i className="fas fa-user-doctor" style={{ marginRight: '0.3rem' }}></i>
                                    Dr. {dc.created_by_name}
                                  </span>
                                )}
                                <span style={{ marginLeft: '0.75rem' }}>
                                  <i className="fas fa-hashtag" style={{ marginRight: '0.2rem' }}></i>
                                  CSE-{String(dc.case_id).padStart(4, '0')}
                                </span>
                              </div>
                              {dc.requires_followup && dc.next_followup_date && (
                                <div style={{ fontSize: '0.8rem', color: isOverdue ? '#dc2626' : '#2563eb', fontWeight: '600' }}>
                                  <i className={`fas fa-${isOverdue ? 'circle-exclamation' : 'calendar-check'}`} style={{ marginRight: '0.3rem' }}></i>
                                  {isOverdue ? 'Follow-up overdue · ' : 'Next follow-up · '}
                                  {new Date(dc.next_followup_date.split('T')[0] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => navigate(`/disease-cases/${dc.case_id}`)}
                              className="pet-detail-back-btn"
                              style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
                            >
                              <span>View Case</span>
                              <i className="fas fa-arrow-right"></i>
                            </button>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

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
                Delete "<strong>{deleteLabReportModal.reportName}</strong>"? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  onClick={() => setDeleteLabReportModal({ open: false, reportId: null, reportName: '' })}
                  className="pet-detail-back-btn"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteLabReport}
                  className="pet-btn-delete"
                >
                  <i className="fas fa-trash"></i> Delete Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remove Pet Image Modal */}
      {showDeleteImageModal && (
        <div className="pet-modal-overlay" onClick={() => setShowDeleteImageModal(false)}>
          <div className="pet-modal-card" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="pet-modal-header">
              <h3 className="pet-modal-title">
                <i className="fas fa-trash" style={{ color: '#dc2626' }}></i>
                Remove Pet Image
              </h3>
              <button onClick={() => setShowDeleteImageModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.1rem', color: '#64748b', cursor: 'pointer' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="pet-modal-body">
              <p style={{ margin: 0, color: '#334155', fontSize: '0.95rem' }}>
                Are you sure you want to remove the photo for <strong>{pet?.pet_name}</strong>?
              </p>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                This action cannot be undone. You can upload a new image afterwards.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  onClick={() => setShowDeleteImageModal(false)}
                  className="pet-detail-back-btn"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImageDelete}
                  disabled={uploadingImage}
                  className="pet-btn-delete"
                >
                  <i className="fas fa-trash"></i>
                  {uploadingImage ? 'Removing...' : 'Remove Image'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete / Inactivate Pet Modal */}
      {showDeleteModal && deletability && (
        <div className="pet-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="pet-modal-card" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="pet-modal-header">
              <h3 className="pet-modal-title">
                <i className="fas fa-exclamation-triangle" style={{ color: '#f59e0b' }}></i>
                {deletability.activeAppointments > 0
                  ? `Cannot ${user?.role === 'admin' ? 'Delete or Inactivate' : 'Inactivate'} Pet`
                  : (!pet.is_active && deletability.hasRelatedData)
                  ? 'Cannot Delete Pet'
                  : (deletability.hasRelatedData || user?.role !== 'admin')
                  ? 'Inactivate Pet'
                  : 'Permanently Delete Pet'}
              </h3>
              <button onClick={() => setShowDeleteModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.1rem', color: '#64748b', cursor: 'pointer' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="pet-modal-body">
              {deletability.activeAppointments > 0 ? (
                <>
                  <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px' }}>
                    <p style={{ margin: 0, color: '#991b1b', fontWeight: '600' }}>
                      <i className="fas fa-ban" style={{ marginRight: '0.5rem' }}></i>
                      {pet.pet_name} has {deletability.activeAppointments} active appointment(s).
                    </p>
                    <p style={{ margin: '0.5rem 0 0', color: '#7f1d1d', fontSize: '0.875rem' }}>
                      Please cancel or complete all active appointments before {user?.role === 'admin' ? 'deleting or inactivating' : 'inactivating'} this pet from the system.
                    </p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button onClick={() => setShowDeleteModal(false)} className="pet-detail-back-btn">Close</button>
                  </div>
                </>
              ) : (!pet.is_active && deletability.hasRelatedData) ? (
                <>
                  <div style={{ padding: '1rem', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px' }}>
                    <p style={{ margin: 0, color: '#92400e', fontWeight: '600' }}>
                      <i className="fas fa-info-circle" style={{ marginRight: '0.5rem' }}></i>
                      {pet.pet_name} is already inactive and has existing records in the system.
                    </p>
                    <p style={{ margin: '0.5rem 0 0', color: '#78350f', fontSize: '0.875rem' }}>
                      Permanent deletion is not possible. Records: {deletability.counts.appointments} appointment(s), {deletability.counts.medicalRecords} medical record(s), {deletability.counts.vaccinations} vaccination(s), {deletability.counts.billingRecords} billing record(s).
                    </p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button onClick={() => setShowDeleteModal(false)} className="pet-detail-back-btn">Close</button>
                  </div>
                </>
              ) : (deletability.hasRelatedData || user?.role !== 'admin') ? (
                <>
                  {deletability.hasRelatedData && user?.role === 'admin' && (
                    <div style={{ padding: '1rem', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px' }}>
                      <p style={{ margin: 0, color: '#92400e', fontWeight: '600' }}>
                        <i className="fas fa-info-circle" style={{ marginRight: '0.5rem' }}></i>
                        {pet.pet_name} has existing records and cannot be permanently deleted.
                      </p>
                      <p style={{ margin: '0.5rem 0 0', color: '#78350f', fontSize: '0.875rem' }}>
                        Records: {deletability.counts.appointments} appointment(s), {deletability.counts.medicalRecords} medical record(s), {deletability.counts.vaccinations} vaccination(s), {deletability.counts.billingRecords} billing record(s).
                      </p>
                    </div>
                  )}

                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>Fields marked with <span style={{ color: '#ef4444' }}>*</span> are required.</p>
                  <div>
                    <label className="pet-info-label">Reason for inactivation <span style={{ color: '#dc2626' }}>*</span></label>
                    <select
                      value={deactivateReason}
                      onChange={e => { setDeactivateReason(e.target.value); setDeceasedDate(''); }}
                      style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', backgroundColor: 'white' }}
                    >
                      <option value="">Select reason...</option>
                      <option value="deceased">Deceased</option>
                      <option value="no_longer_patient">No longer a patient</option>
                      <option value="transferred">Transferred to another clinic</option>
                      <option value="incorrectly_created">Incorrectly created</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {deactivateReason === 'deceased' && (
                    <div>
                      <label className="pet-info-label">Date of death <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        type="date"
                        value={deceasedDate}
                        onChange={e => setDeceasedDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>
                  )}

                  <div>
                    <label className="pet-info-label">Additional note (optional)</label>
                    <textarea
                      value={deactivateNote}
                      onChange={e => setDeactivateNote(e.target.value)}
                      placeholder="Any additional details..."
                      rows={2}
                      style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button onClick={() => setShowDeleteModal(false)} className="pet-detail-back-btn" disabled={deleting}>Cancel</button>
                    <button onClick={handleInactivate} className="pet-btn-delete" disabled={deleting}>
                      {deleting ? 'Inactivating...' : 'Inactivate Pet'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px' }}>
                    <p style={{ margin: 0, color: '#991b1b', fontWeight: '600' }}>
                      Permanently delete {pet.pet_name}?
                    </p>
                    <p style={{ margin: '0.5rem 0 0', color: '#7f1d1d', fontSize: '0.875rem' }}>
                      This pet has no records in the system. This action is irreversible.
                    </p>
                  </div>

                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>Fields marked with <span style={{ color: '#ef4444' }}>*</span> are required.</p>
                  <div>
                    <label className="pet-info-label">Reason for deletion <span style={{ color: '#dc2626' }}>*</span></label>
                    <select
                      value={deactivateReason}
                      onChange={e => setDeactivateReason(e.target.value)}
                      style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', backgroundColor: 'white' }}
                    >
                      <option value="">Select reason...</option>
                      <option value="incorrectly_created">Incorrectly created</option>
                      <option value="deceased">Deceased</option>
                      <option value="no_longer_patient">No longer a patient</option>
                      <option value="transferred">Transferred to another clinic</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="pet-info-label">Additional note (optional)</label>
                    <textarea
                      value={deactivateNote}
                      onChange={e => setDeactivateNote(e.target.value)}
                      placeholder="Any additional details..."
                      rows={2}
                      style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button onClick={() => setShowDeleteModal(false)} className="pet-detail-back-btn" disabled={deleting}>Cancel</button>
                    <button onClick={handleDelete} className="pet-btn-delete" disabled={deleting || !deactivateReason}>
                      {deleting ? 'Deleting...' : 'Permanently Delete'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Email Lab Report Modal */}
      {emailModal.open && emailModal.report && (
        <div className="pet-modal-overlay" onClick={() => setEmailModal({ open: false, report: null })}>
          <div className="pet-modal-card" onClick={e => e.stopPropagation()}>
            <div className="pet-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-envelope" style={{ color: '#166534', fontSize: '0.95rem' }}></i>
                </div>
                <div>
                  <h3 className="pet-modal-title" style={{ fontSize: '1.05rem' }}>Email Lab Report</h3>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{emailModal.report.report_name}</span>
                </div>
              </div>
              <button onClick={() => setEmailModal({ open: false, report: null })} style={{ background: 'none', border: 'none', fontSize: '1.1rem', color: '#64748b', cursor: 'pointer' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="pet-modal-body">
              <div className="pet-info-item">
                <span className="pet-info-label">Recipient</span>
                <span className="pet-info-value">
                  {pet?.owner_first_name} {pet?.owner_last_name}
                  {pet?.owner_email && <span style={{ color: '#64748b', fontWeight: '400', fontSize: '0.85rem' }}> — {pet.owner_email}</span>}
                </span>
              </div>
              <div className="pet-info-item">
                <span className="pet-info-label">Report</span>
                <span className="pet-info-value">
                  {emailModal.report.report_name}
                  <span style={{ marginLeft: '0.4rem', fontSize: '0.72rem', background: '#eef2ff', color: '#4f46e5', padding: '0.1rem 0.45rem', borderRadius: '9999px', fontWeight: '600' }}>
                    {emailModal.report.report_type.replace(/_/g, ' ')}
                  </span>
                </span>
              </div>
              <div>
                <label className="pet-info-label" style={{ marginBottom: '0.35rem' }}>Optional message</label>
                <textarea
                  value={emailMessage}
                  onChange={e => setEmailMessage(e.target.value)}
                  rows={4}
                  placeholder="Add a note for the owner (e.g. results summary, next steps)..."
                  style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.88rem', color: '#0f172a', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  onClick={handleEmailReport}
                  disabled={sending || !pet?.owner_email}
                  className="pet-btn-edit"
                  style={{ opacity: (!pet?.owner_email) ? 0.5 : 1, cursor: (!pet?.owner_email || sending) ? 'not-allowed' : 'pointer' }}
                >
                  <i className={`fas fa-${sending ? 'circle-notch fa-spin' : 'paper-plane'}`}></i>
                  <span>{sending ? 'Sending...' : 'Send to Owner'}</span>
                </button>
              </div>
              {!pet?.owner_email && (
                <p style={{ textAlign: 'center', color: '#dc2626', fontSize: '0.8rem', margin: 0 }}>
                  Owner has no email address on file.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Owner Details Modal */}
      {showOwnerModal && pet && (
        <div className="pet-modal-overlay" onClick={() => setShowOwnerModal(false)}>
          <div className="pet-modal-card" onClick={e => e.stopPropagation()}>
            <div className="pet-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#eff6ff', border: '2px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-user" style={{ color: '#2563eb', fontSize: '1.1rem' }}></i>
                </div>
                <div>
                  <h3 className="pet-modal-title" style={{ margin: 0, fontSize: '1.1rem' }}>
                    {pet.owner_first_name} {pet.owner_last_name}
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '500' }}>ID: #{pet.customer_id}</span>
                </div>
              </div>
              <button onClick={() => setShowOwnerModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.1rem', color: '#64748b', cursor: 'pointer' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="pet-modal-body">
              {pet.owner_phone && (
                <div className="pet-info-item">
                  <span className="pet-info-label"><i className="fas fa-phone" style={{ marginRight: '0.35rem' }}></i> Phone</span>
                  <span className="pet-info-value" style={{ fontFamily: 'monospace' }}>{pet.owner_phone}</span>
                </div>
              )}
              {pet.owner_email && (
                <div className="pet-info-item">
                  <span className="pet-info-label"><i className="fas fa-envelope" style={{ marginRight: '0.35rem' }}></i> Email</span>
                  <span className="pet-info-value">{pet.owner_email}</span>
                </div>
              )}
              {pet.owner_address && (
                <div className="pet-info-item">
                  <span className="pet-info-label"><i className="fas fa-location-dot" style={{ marginRight: '0.35rem' }}></i> Address</span>
                  <span className="pet-info-value">{pet.owner_address}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {pet.owner_phone && (
                  <button
                    onClick={() => { const d = (pet.owner_phone || '').replace(/\D/g, ''); const n = d.startsWith('0') ? '94' + d.slice(1) : d; window.open(`https://wa.me/${n}`, '_blank'); }}
                    className="pet-detail-back-btn"
                    style={{ backgroundColor: '#25d366', color: 'white', border: 'none' }}
                  >
                    <i className="fab fa-whatsapp"></i> WhatsApp
                  </button>
                )}
                <button
                  onClick={() => { setShowOwnerModal(false); setOwnerEmailForm({ subject: '', message: '' }); setOwnerEmailOpen(true); }}
                  disabled={!pet.owner_email}
                  className="pet-btn-edit"
                  style={{ opacity: !pet.owner_email ? 0.5 : 1, cursor: !pet.owner_email ? 'not-allowed' : 'pointer' }}
                >
                  <i className="fas fa-envelope"></i> Send Email
                </button>
                <button onClick={() => { setShowOwnerModal(false); navigate(`/customers/${pet.customer_id}`); }} className="pet-detail-back-btn">
                  <i className="fas fa-external-link-alt"></i> Full Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Owner Email Compose Modal */}
      {ownerEmailOpen && pet && (
        <div className="pet-modal-overlay" onClick={() => setOwnerEmailOpen(false)}>
          <div className="pet-modal-card" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div className="pet-modal-header">
              <h3 className="pet-modal-title">
                <i className="fas fa-envelope" style={{ color: '#2563eb' }}></i>
                Send Email to {pet.owner_first_name} {pet.owner_last_name}
              </h3>
              <button onClick={() => setOwnerEmailOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.1rem', color: '#64748b', cursor: 'pointer' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="pet-modal-body">
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                <i className="fas fa-circle-info" style={{ marginRight: '0.4rem' }}></i>
                Sending to: <strong>{pet.owner_email}</strong>
              </p>
              <div>
                <label className="pet-info-label" style={{ marginBottom: '0.35rem' }}>Subject</label>
                <input
                  type="text"
                  value={ownerEmailForm.subject}
                  onChange={e => setOwnerEmailForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Email subject"
                  style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
              <div>
                <label className="pet-info-label" style={{ marginBottom: '0.35rem' }}>Message</label>
                <textarea
                  value={ownerEmailForm.message}
                  onChange={e => setOwnerEmailForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Type your message here..."
                  rows={5}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button onClick={() => setOwnerEmailOpen(false)} className="pet-detail-back-btn">
                  Cancel
                </button>
                <button
                  onClick={handleSendOwnerEmail}
                  disabled={ownerEmailSending || !ownerEmailForm.subject.trim() || !ownerEmailForm.message.trim()}
                  className="pet-btn-edit"
                  style={{ opacity: (ownerEmailSending || !ownerEmailForm.subject.trim() || !ownerEmailForm.message.trim()) ? 0.5 : 1, cursor: (ownerEmailSending || !ownerEmailForm.subject.trim() || !ownerEmailForm.message.trim()) ? 'not-allowed' : 'pointer' }}
                >
                  <i className={`fas fa-${ownerEmailSending ? 'spinner fa-spin' : 'paper-plane'}`}></i>
                  <span>{ownerEmailSending ? 'Sending...' : 'Send Email'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
};

export default PetDetail;
