import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPetById, updatePet, deletePet, checkPetDeletability, inactivatePet, getPetMedicalHistory, getPetVaccinations, uploadPetImage, deletePetImage } from '../services/petService';
import { getLabReports, uploadLabReport, openLabReport, deleteLabReport, emailLabReport } from '../services/labReportService';
import { sendCustomerEmail } from '../services/emailService';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';
import ImageCropModal from '../components/ImageCropModal';
import PetHealthPredictions from '../components/PetHealthPredictions';

const PetDetail = () => {
  const [pet, setPet] = useState(null);
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useNotification();

  useEffect(() => {
    fetchPetDetails();
    fetchMedicalHistory();
    fetchVaccinations();
    fetchLabReports();
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

  const handleImageDelete = async () => {
    setShowDeleteImageModal(false);
    try {
      setUploadingImage(true);
      setError('');
      await deletePetImage(id);
      
      setSuccess('Pet image deleted successfully');
      setSelectedImage(null);
      setImagePreview(null);
      
      await fetchPetDetails();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete image');
      console.error('Error deleting image:', err);
    } finally {
      setUploadingImage(false);
    }
  };

  const cancelImageSelection = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setError('');
  };

  const fetchLabReports = async () => {
    try {
      setLabReportsLoading(true);
      const res = await getLabReports(id);
      setLabReports(res.reports || []);
    } catch (err) {
      console.error('Failed to fetch lab reports:', err);
    } finally {
      setLabReportsLoading(false);
    }
  };

  const handleUploadFormChange = (e) => {
    const { name, value } = e.target;
    setUploadForm(prev => ({ ...prev, [name]: value }));
  };

  const handleLabReportUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) { showError('Please select a file to upload'); return; }
    if (!uploadForm.report_name || !uploadForm.report_type) { showError('Report name and type are required'); return; }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('report_name', uploadForm.report_name);
      formData.append('report_type', uploadForm.report_type);
      if (uploadForm.notes) formData.append('notes', uploadForm.notes);
      if (uploadForm.related_case_id) formData.append('related_case_id', uploadForm.related_case_id);
      await uploadLabReport(id, formData);
      showSuccess('Lab report uploaded successfully');
      setShowUploadForm(false);
      setUploadForm({ report_name: '', report_type: '', notes: '', related_case_id: '' });
      setUploadFile(null);
      fetchLabReports();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to upload lab report');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteLabReport = (reportId, reportName) => {
    setDeleteLabReportModal({ open: true, reportId, reportName });
  };

  const confirmDeleteLabReport = async () => {
    try {
      await deleteLabReport(deleteLabReportModal.reportId);
      showSuccess('Lab report deleted');
      setDeleteLabReportModal({ open: false, reportId: null, reportName: '' });
      fetchLabReports();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete lab report');
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
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading pet details...</p>
      </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
      <div style={styles.errorContainer}>
        <h2>Error</h2>
        <p style={styles.errorText}>{error}</p>
        <button onClick={() => navigate('/pets')} style={styles.backButton}>
          Back to Pets
        </button>
      </div>
      </Layout>
    );
  }

  if (!pet) {
    return (
      <Layout>
      <div style={styles.errorContainer}>
        <h2>Pet Not Found</h2>
        <button onClick={() => navigate('/pets')} style={styles.backButton}>
          Back to Pets
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
    
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/pets')} style={styles.backButton}>
          ← Back to Pets
        </button>
        <div style={styles.headerActions}>
          <button onClick={() => navigate(`/pets/${id}/edit`)} style={styles.editButton}>
            Edit Pet
          </button>
          {(pet.is_active || user?.role === 'admin') && (
            <button onClick={openDeleteModal} style={styles.deleteButton}>
              <i className="fas fa-trash" style={{ marginRight: '0.4rem' }}></i>
              {!pet.is_active ? 'Delete' : user?.role === 'admin' ? 'Delete / Inactivate' : 'Inactivate'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={styles.errorAlert}>
          <i className="fas fa-exclamation-circle" style={{ marginRight: '0.5rem' }}></i>
          {error}
        </div>
      )}

      {success && (
        <div style={styles.successAlert}>
          <i className="fas fa-check-circle" style={{ marginRight: '0.5rem' }}></i>
          {success}
        </div>
      )}

      {/* Pet Information Card */}
      <div style={styles.mainCard}>
        <div style={styles.cardHeader}>
          <div style={styles.titleSection}>
            {pet.photo_url ? (
              <img 
                src={`http://localhost:3000/uploads/${pet.photo_url}`} 
                alt={pet.pet_name}
                style={styles.headerAvatarImage}
              />
            ) : (
              <i className="fas fa-paw" style={styles.icon}></i>
            )}
            <div>
              <h1 style={styles.petName}>{pet.pet_name}</h1>
              <p style={styles.petId}>Pet ID: #{pet.pet_id}</p>
            </div>
          </div>
          <div style={styles.badges}>
            <span style={pet.is_active ? styles.activeBadge : styles.inactiveBadge}>
              {pet.is_active ? 'Active' : 'Inactive'}
            </span>
            {pet.gender && (
              <span style={pet.gender === 'Male' ? styles.maleBadge : styles.femaleBadge}>
                {pet.gender}
              </span>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={styles.tabs}>
          <button
            style={activeTab === 'info' ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab('info')}
          >
            <i className="fas fa-info-circle"></i> Information
          </button>
          {(user?.role === 'admin' || user?.role === 'veterinarian') && (
            <button
              style={activeTab === 'medical' ? styles.activeTab : styles.tab}
              onClick={() => setActiveTab('medical')}
            >
              <i className="fas fa-hospital"></i> Medical History ({medicalHistory.length})
            </button>
          )}
          <button
            style={activeTab === 'vaccinations' ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab('vaccinations')}
          >
            <i className="fas fa-syringe"></i> Vaccinations ({vaccinations.length})
          </button>
          {(user?.role === 'admin' || user?.role === 'veterinarian') && (
            <button
              style={activeTab === 'labReports' ? styles.activeTab : styles.tab}
              onClick={() => setActiveTab('labReports')}
            >
              <i className="fas fa-flask"></i> Lab Reports ({labReports.length})
            </button>
          )}
          {(user?.role === 'admin' || user?.role === 'veterinarian') && (
            <button
              style={activeTab === 'predictions' ? styles.activeTab : styles.tab}
              onClick={() => setActiveTab('predictions')}
            >
              <i className="fas fa-brain"></i> Health Predictions
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div style={styles.tabContent}>
          {activeTab === 'info' && (
            <>
              {/* Basic Information */}
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}><i className="fas fa-paw"></i> Basic Information</h2>
                <div style={styles.infoGrid}>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Species:</span>
                    <span style={styles.infoValue}>{pet.species || '-'}</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Breed:</span>
                    <span style={styles.infoValue}>{pet.breed || '-'}</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Date of Birth:</span>
                    <span style={styles.infoValue}>{formatDate(pet.date_of_birth)}</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Age:</span>
                    <span style={styles.infoValue}>{calculateAge(pet.date_of_birth)}</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Color:</span>
                    <span style={styles.infoValue}>{pet.color || '-'}</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Current Weight:</span>
                    <span style={styles.infoValue}>
                      {pet.weight_current ? `${pet.weight_current} kg` : '-'}
                    </span>
                  </div>
                  {pet.created_at && (
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>Created:</span>
                      <span style={styles.infoValue}>{formatDate(pet.created_at)}</span>
                    </div>
                  )}
                  {pet.updated_at && pet.updated_at !== pet.created_at && (
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>Updated:</span>
                      <span style={styles.infoValue}>{formatDate(pet.updated_at)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pet Image Section */}
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}><i className="fas fa-camera"></i> Pet Image</h2>
                <div style={styles.imageSection}>
                  <div style={styles.imageContainer}>
                    {imagePreview || pet?.photo_url ? (
                      <img 
                        src={imagePreview || `http://localhost:3000/uploads/${pet.photo_url}`} 
                        alt={pet.pet_name}
                        style={styles.petImage}
                      />
                    ) : (
                      <div style={styles.noImage}>
                        <i className="fas fa-paw" style={styles.noImageIcon}></i>
                        <p>No image uploaded</p>
                      </div>
                    )}
                  </div>
                  
                  <div style={styles.imageActions}>
                    <input
                      type="file"
                      id="petImageInput"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleImageSelect}
                      style={{ display: 'none' }}
                    />
                    
                    {selectedImage ? (
                      <div style={styles.imageButtonGroup}>
                        <button
                          type="button"
                          onClick={handleImageUpload}
                          disabled={uploadingImage}
                          style={styles.uploadButton}
                        >
                          <i className="fas fa-upload"></i> {uploadingImage ? 'Uploading...' : 'Upload Image'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelImageSelection}
                          disabled={uploadingImage}
                          style={styles.cancelImageButton}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={styles.imageButtonGroup}>
                        <label htmlFor="petImageInput" style={styles.selectImageButton}>
                          <i className="fas fa-camera"></i> Select Image
                        </label>
                        {pet?.photo_url && (
                          <button
                            type="button"
                            onClick={() => setShowDeleteImageModal(true)}
                            disabled={uploadingImage}
                            style={styles.deleteImageButton}
                          >
                            <i className="fas fa-trash"></i> Remove
                          </button>
                        )}
                      </div>
                    )}
                    <p style={styles.imageHint}>
                      <i className="fas fa-info-circle" style={{ marginRight: '0.25rem' }}></i>
                      Max 5MB • JPEG, PNG, GIF, WebP
                    </p>
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}><i className="fas fa-pills"></i> Medical Information</h2>
                <div style={styles.infoGrid}>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Neutered/Spayed:</span>
                    <span style={styles.infoValue}>{pet.is_neutered ? 'Yes' : 'No'}</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Allergies:</span>
                    <span style={styles.infoValue}>{pet.allergies || 'None'}</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Special Needs:</span>
                    <span style={styles.infoValue}>{pet.special_needs || 'None'}</span>
                  </div>
                  {pet.insurance_provider && (
                    <>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Insurance Provider:</span>
                        <span style={styles.infoValue}>{pet.insurance_provider}</span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Policy Number:</span>
                        <span style={styles.infoValue}>{pet.insurance_policy_number || '-'}</span>
                      </div>
                    </>
                  )}
                </div>
                {pet.notes && (
                  <div style={styles.notesSection}>
                    <span style={styles.infoLabel}>Notes:</span>
                    <p style={styles.notes}>{pet.notes}</p>
                  </div>
                )}
              </div>

              {/* Breeding Registry */}
              <div style={styles.section}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h2 style={{ ...styles.sectionTitle, margin: 0 }}>
                    <i className="fas fa-heart" style={{ marginRight: '0.4rem', color: '#ec4899' }}></i>
                    Breeding Registry
                  </h2>
                  <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Owner opt-in only</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', backgroundColor: breedingAvailable ? '#fdf2f8' : '#f9fafb', border: `1px solid ${breedingAvailable ? '#f9a8d4' : '#e5e7eb'}`, borderRadius: '8px', marginBottom: '0.85rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', flex: 1, userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={breedingAvailable}
                      onChange={e => setBreedingAvailable(e.target.checked)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#ec4899' }}
                    />
                    <div>
                      <span style={{ fontSize: '0.9rem', fontWeight: '600', color: breedingAvailable ? '#be185d' : '#374151' }}>
                        {breedingAvailable ? 'Listed in breeding registry' : 'Not listed in breeding registry'}
                      </span>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#9ca3af' }}>
                        {breedingAvailable ? 'Owner has opted in — this pet will appear in breeding searches.' : 'Check to list this pet for breeding enquiries (with owner consent).'}
                      </p>
                    </div>
                  </label>
                </div>
                {breedingAvailable && (
                  <div style={{ marginBottom: '0.85rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Notes for enquiries <span style={{ color: '#9ca3af', fontWeight: '400', textTransform: 'none' }}>(optional)</span>
                    </label>
                    <textarea
                      value={breedingNotes}
                      onChange={e => setBreedingNotes(e.target.value)}
                      rows={2}
                      placeholder="e.g. Vaccinated, prefers same breed, contact after 6pm..."
                      style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                  </div>
                )}
                <button
                  onClick={handleSaveBreeding}
                  disabled={savingBreeding}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.1rem', backgroundColor: savingBreeding ? '#e5e7eb' : '#ec4899', color: savingBreeding ? '#9ca3af' : 'white', border: 'none', borderRadius: '7px', fontSize: '0.875rem', fontWeight: '600', cursor: savingBreeding ? 'not-allowed' : 'pointer' }}
                >
                  <i className={`fas fa-${savingBreeding ? 'circle-notch fa-spin' : 'floppy-disk'}`}></i>
                  {savingBreeding ? 'Saving...' : 'Save'}
                </button>
              </div>

              {/* Owner Information */}
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}><i className="fas fa-user"></i> Owner Information</h2>
                <div style={styles.infoGrid}>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Owner:</span>
                    <span
                      style={styles.ownerLink}
                      onClick={() => setShowOwnerModal(true)}
                    >
                      {pet.owner_first_name && pet.owner_last_name
                        ? `${pet.owner_first_name} ${pet.owner_last_name}`
                        : 'Unknown'}
                    </span>
                  </div>
                  {pet.owner_phone && (
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>Phone:</span>
                      <span style={styles.infoValue}>{pet.owner_phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'medical' && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}><i className="fas fa-hospital"></i> Medical History</h2>
                {(user?.role === 'admin' || user?.role === 'veterinarian') && (
                  <button 
                    onClick={() => navigate(`/medical-records/new?petId=${id}`)} 
                    style={styles.addRecordButton}
                  >
                    + New Medical Record
                  </button>
                )}
              </div>
              {medicalHistory.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No medical history records found</p>
                  {(user?.role === 'admin' || user?.role === 'veterinarian') && (
                    <button 
                      onClick={() => navigate(`/medical-records/new?petId=${id}`)} 
                      style={styles.emptyButton}
                    >
                      Create First Medical Record
                    </button>
                  )}
                </div>
              ) : (
                <div style={styles.historyList}>
                  {medicalHistory.map((record) => (
                    <div 
                      key={record.record_id} 
                      style={styles.historyCard}
                      onClick={() => navigate(`/medical-records/${record.record_id}`)}
                    >
                      <div style={styles.historyHeader}>
                        <span style={styles.historyDate}>{formatDate(record.visit_date)}</span>
                        <span style={styles.historyType}>Medical Record</span>
                      </div>
                      <div style={styles.historyContent}>
                        <p><strong>Reason:</strong> {record.chief_complaint || 'N/A'}</p>
                        {record.diagnosis && <p><strong>Diagnosis:</strong> {record.diagnosis}</p>}
                        {record.treatment && <p><strong>Treatment:</strong> {record.treatment}</p>}
                        {record.veterinarian_name && <p><strong>Vet:</strong> Dr. {record.veterinarian_name}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'vaccinations' && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}><i className="fas fa-syringe"></i> Vaccinations</h2>
              {vaccinations.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No vaccination records found</p>
                </div>
              ) : (
                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableHeader}>
                        <th style={styles.th}>Vaccine Name</th>
                        <th style={styles.th}>Date Given</th>
                        <th style={styles.th}>Next Due</th>
                        <th style={styles.th}>Batch Number</th>
                        <th style={styles.th}>Vet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vaccinations.map((vacc) => (
                        <tr key={vacc.vaccination_id} style={styles.tableRow}>
                          <td style={styles.td}>{vacc.vaccine_name}</td>
                          <td style={styles.td}>{formatDate(vacc.vaccination_date)}</td>
                          <td style={styles.td}>{formatDate(vacc.next_due_date)}</td>
                          <td style={styles.td}>{vacc.batch_number || '-'}</td>
                          <td style={styles.td}>{vacc.administered_by_name || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {activeTab === 'labReports' && (
            <div style={styles.section}>
              {/* Header */}
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>
                  <i className="fas fa-flask" style={{ marginRight: '0.5rem', color: '#6366f1' }}></i>
                  Lab Reports
                </h2>
                <button style={styles.addRecordButton} onClick={() => setShowUploadForm(prev => !prev)}>
                  <i className={`fas fa-${showUploadForm ? 'times' : 'upload'}`} style={{ marginRight: '0.4rem' }}></i>
                  {showUploadForm ? 'Cancel' : 'Upload Report'}
                </button>
              </div>

              {/* Upload Form */}
              {showUploadForm && (
                <form onSubmit={handleLabReportUpload} style={styles.labUploadForm}>
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 0.75rem 0' }}>Fields marked with <span style={{ color: '#ef4444' }}>*</span> are required.</p>
                  <div style={styles.labFormGrid}>
                    <div style={styles.labFormGroup}>
                      <label style={styles.labFormLabel}>Report Name <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        type="text"
                        name="report_name"
                        value={uploadForm.report_name}
                        onChange={handleUploadFormChange}
                        placeholder="e.g. Blood Test — March 2026"
                        style={styles.labFormInput}
                        required
                      />
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
                    <div style={styles.labFormGroup}>
                      <label style={styles.labFormLabel}>File <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={e => setUploadFile(e.target.files[0] || null)}
                        style={styles.labFormInput}
                        required
                      />
                      <span style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.2rem' }}>JPEG, PNG, WebP or PDF — max 10 MB</span>
                    </div>
                    <div style={styles.labFormGroup}>
                      <label style={styles.labFormLabel}>Notes (optional)</label>
                      <input
                        type="text"
                        name="notes"
                        value={uploadForm.notes}
                        onChange={handleUploadFormChange}
                        placeholder="Any relevant notes..."
                        style={styles.labFormInput}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button type="submit" disabled={uploading} style={styles.labUploadBtn}>
                      <i className="fas fa-upload" style={{ marginRight: '0.4rem' }}></i>
                      {uploading ? 'Uploading...' : 'Upload Report'}
                    </button>
                  </div>
                </form>
              )}

              {/* Report List */}
              {labReportsLoading ? (
                <div style={styles.emptyState}><p>Loading lab reports...</p></div>
              ) : labReports.length === 0 ? (
                <div style={styles.emptyState}>
                  <i className="fas fa-file-medical" style={{ fontSize: '2.5rem', color: '#d1d5db', marginBottom: '0.75rem', display: 'block' }}></i>
                  <p style={{ margin: 0 }}>No lab reports uploaded yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {labReports.map(report => (
                    <div key={report.report_id} style={styles.labReportCard}>
                      <div style={styles.labReportIcon}>
                        <i className={`fas fa-${report.file_type === 'pdf' ? 'file-pdf' : 'file-image'}`}
                           style={{ fontSize: '1.5rem', color: report.file_type === 'pdf' ? '#ef4444' : '#3b82f6' }}></i>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={styles.labReportName}>{report.report_name}</span>
                          <span style={styles.labReportTypeBadge}>{report.report_type.replace('_', ' ')}</span>
                        </div>
                        <div style={styles.labReportMeta}>
                          <span><i className="fas fa-calendar-alt" style={{ marginRight: '0.3rem' }}></i>{formatDate(report.created_at)}</span>
                          <span><i className="fas fa-user" style={{ marginRight: '0.3rem' }}></i>{report.uploaded_by_name || 'Unknown'}</span>
                          {report.related_disease_name && (
                            <span><i className="fas fa-link" style={{ marginRight: '0.3rem' }}></i>{report.related_disease_name}</span>
                          )}
                        </div>
                        {report.notes && <p style={styles.labReportNotes}>{report.notes}</p>}
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0 }}>
                        <button onClick={() => handleOpenReport(report.report_id, report.file_type)} style={styles.labViewBtn}>
                          <i className="fas fa-eye" style={{ marginRight: '0.3rem' }}></i>View
                        </button>
                        <button onClick={() => { setEmailModal({ open: true, report }); setEmailMessage(''); }} style={styles.labEmailBtn}>
                          <i className="fas fa-envelope" style={{ marginRight: '0.3rem' }}></i>Email
                        </button>
                        {pet?.owner_phone && (
                          <button
                            onClick={() => {
                              const d = (pet.owner_phone || '').replace(/\D/g, '');
                              const n = d.startsWith('0') ? '94' + d.slice(1) : d;
                              const msg = encodeURIComponent(`Hi, please find the lab report "${report.report_name}" for ${pet.pet_name} from Pro Pet Animal Hospital.`);
                              window.open(`https://wa.me/${n}?text=${msg}`, '_blank');
                            }}
                            style={{ ...styles.labEmailBtn, backgroundColor: '#25d366', color: 'white' }}
                          >
                            <i className="fab fa-whatsapp" style={{ marginRight: '0.3rem' }}></i>WhatsApp
                          </button>
                        )}
                        {(user?.role === 'admin' || user?.role === 'veterinarian') && (
                          <button onClick={() => handleDeleteLabReport(report.report_id, report.report_name)} style={styles.labDeleteBtn}>
                            <i className="fas fa-trash" style={{ marginRight: '0.3rem' }}></i>Delete
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
            <div style={styles.section}>
              <PetHealthPredictions pet={pet} />
            </div>
          )}
        </div>
      </div>
    </div>

    {deleteLabReportModal.open && (
      <div style={styles.modalOverlay} onClick={() => setDeleteLabReportModal({ open: false, reportId: null, reportName: '' })}>
        <div style={{ ...styles.modalContent, maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <h3 style={styles.modalTitle}>
              <i className="fas fa-trash" style={{ marginRight: '0.5rem', color: '#dc2626' }}></i>
              Delete Lab Report
            </h3>
            <button onClick={() => setDeleteLabReportModal({ open: false, reportId: null, reportName: '' })} style={styles.modalCloseButton}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <p style={{ margin: '0 0 1.5rem', color: '#374151', fontSize: '0.95rem' }}>
              Delete "<strong>{deleteLabReportModal.reportName}</strong>"? This action cannot be undone.
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

    {/* Delete / Inactivate Modal */}
    {showDeleteImageModal && (
      <div style={styles.modalOverlay} onClick={() => setShowDeleteImageModal(false)}>
        <div style={{ ...styles.modalContent, maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <h3 style={styles.modalTitle}>
              <i className="fas fa-trash" style={{ marginRight: '0.5rem', color: '#dc2626' }}></i>
              Remove Pet Image
            </h3>
            <button onClick={() => setShowDeleteImageModal(false)} style={styles.modalCloseButton}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <p style={{ margin: '0 0 0.5rem', color: '#374151', fontSize: '0.95rem' }}>
              Are you sure you want to remove the photo for <strong>{pet?.pet_name}</strong>?
            </p>
            <p style={{ margin: '0 0 1.5rem', color: '#6b7280', fontSize: '0.85rem' }}>
              This action cannot be undone. You can upload a new image afterwards.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteImageModal(false)}
                style={{ padding: '0.5rem 1.1rem', borderRadius: '7px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#374151', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleImageDelete}
                disabled={uploadingImage}
                style={{ padding: '0.5rem 1.1rem', borderRadius: '7px', border: 'none', backgroundColor: '#dc2626', color: '#fff', fontWeight: '600', fontSize: '0.875rem', cursor: uploadingImage ? 'not-allowed' : 'pointer', opacity: uploadingImage ? 0.7 : 1 }}
              >
                <i className="fas fa-trash" style={{ marginRight: '0.4rem' }}></i>
                {uploadingImage ? 'Removing...' : 'Remove Image'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {showDeleteModal && deletability && (
      <div style={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
        <div style={{ ...styles.modalContent, maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <h3 style={styles.modalTitle}>
              <i className="fas fa-exclamation-triangle" style={{ marginRight: '0.5rem', color: '#f59e0b' }}></i>
              {deletability.activeAppointments > 0
                ? `Cannot ${user?.role === 'admin' ? 'Delete or Inactivate' : 'Inactivate'} Pet`
                : (!pet.is_active && deletability.hasRelatedData)
                ? 'Cannot Delete Pet'
                : (deletability.hasRelatedData || user?.role !== 'admin')
                ? 'Inactivate Pet'
                : 'Permanently Delete Pet'}
            </h3>
            <button onClick={() => setShowDeleteModal(false)} style={styles.modalCloseButton}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div style={{ padding: '1.5rem' }}>
            {deletability.activeAppointments > 0 ? (
              <>
                <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '1rem' }}>
                  <p style={{ margin: 0, color: '#991b1b', fontWeight: '600' }}>
                    <i className="fas fa-ban" style={{ marginRight: '0.5rem' }}></i>
                    {pet.pet_name} has {deletability.activeAppointments} active appointment(s).
                  </p>
                  <p style={{ margin: '0.5rem 0 0', color: '#7f1d1d', fontSize: '0.875rem' }}>
                    Please cancel or complete all active appointments before {user?.role === 'admin' ? 'deleting or inactivating' : 'inactivating'} this pet from the system.
                  </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowDeleteModal(false)} style={styles.cancelBtnModal}>Close</button>
                </div>
              </>
            ) : (!pet.is_active && deletability.hasRelatedData) ? (
              <>
                <div style={{ padding: '1rem', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', marginBottom: '1rem' }}>
                  <p style={{ margin: 0, color: '#92400e', fontWeight: '600' }}>
                    <i className="fas fa-info-circle" style={{ marginRight: '0.5rem' }}></i>
                    {pet.pet_name} is already inactive and has existing records in the system.
                  </p>
                  <p style={{ margin: '0.5rem 0 0', color: '#78350f', fontSize: '0.875rem' }}>
                    Permanent deletion is not possible. Records: {deletability.counts.appointments} appointment(s), {deletability.counts.medicalRecords} medical record(s), {deletability.counts.vaccinations} vaccination(s), {deletability.counts.billingRecords} billing record(s).
                  </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowDeleteModal(false)} style={styles.cancelBtnModal}>Close</button>
                </div>
              </>
            ) : (deletability.hasRelatedData || user?.role !== 'admin') ? (
              <>
                {deletability.hasRelatedData && user?.role === 'admin' && (
                  <div style={{ padding: '1rem', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', marginBottom: '1.25rem' }}>
                    <p style={{ margin: 0, color: '#92400e', fontWeight: '600' }}>
                      <i className="fas fa-info-circle" style={{ marginRight: '0.5rem' }}></i>
                      {pet.pet_name} has existing records and cannot be permanently deleted.
                    </p>
                    <p style={{ margin: '0.5rem 0 0', color: '#78350f', fontSize: '0.875rem' }}>
                      Records: {deletability.counts.appointments} appointment(s), {deletability.counts.medicalRecords} medical record(s), {deletability.counts.vaccinations} vaccination(s), {deletability.counts.billingRecords} billing record(s).
                    </p>
                  </div>
                )}

                <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 0.75rem 0' }}>Fields marked with <span style={{ color: '#ef4444' }}>*</span> are required.</p>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={styles.modalLabel}>Reason for inactivation <span style={{ color: '#dc2626' }}>*</span></label>
                  <select
                    value={deactivateReason}
                    onChange={e => { setDeactivateReason(e.target.value); setDeceasedDate(''); }}
                    style={styles.modalInput}
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
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={styles.modalLabel}>Date of death <span style={{ color: '#dc2626' }}>*</span></label>
                    <input
                      type="date"
                      value={deceasedDate}
                      onChange={e => setDeceasedDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      style={styles.modalInput}
                    />
                  </div>
                )}

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={styles.modalLabel}>Additional note (optional)</label>
                  <textarea
                    value={deactivateNote}
                    onChange={e => setDeactivateNote(e.target.value)}
                    placeholder="Any additional details..."
                    rows={2}
                    style={{ ...styles.modalInput, resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button onClick={() => setShowDeleteModal(false)} style={styles.cancelBtnModal} disabled={deleting}>Cancel</button>
                  <button onClick={handleInactivate} style={styles.inactivateBtn} disabled={deleting}>
                    {deleting ? 'Inactivating...' : 'Inactivate Pet'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '1.25rem' }}>
                  <p style={{ margin: 0, color: '#991b1b', fontWeight: '600' }}>
                    Permanently delete {pet.pet_name}?
                  </p>
                  <p style={{ margin: '0.5rem 0 0', color: '#7f1d1d', fontSize: '0.875rem' }}>
                    This pet has no records in the system. This action is irreversible.
                  </p>
                </div>

                <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 0.75rem 0' }}>Fields marked with <span style={{ color: '#ef4444' }}>*</span> are required.</p>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={styles.modalLabel}>Reason for deletion <span style={{ color: '#dc2626' }}>*</span></label>
                  <select
                    value={deactivateReason}
                    onChange={e => setDeactivateReason(e.target.value)}
                    style={styles.modalInput}
                  >
                    <option value="">Select reason...</option>
                    <option value="incorrectly_created">Incorrectly created</option>
                    <option value="deceased">Deceased</option>
                    <option value="no_longer_patient">No longer a patient</option>
                    <option value="transferred">Transferred to another clinic</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={styles.modalLabel}>Additional note (optional)</label>
                  <textarea
                    value={deactivateNote}
                    onChange={e => setDeactivateNote(e.target.value)}
                    placeholder="Any additional details..."
                    rows={2}
                    style={{ ...styles.modalInput, resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button onClick={() => setShowDeleteModal(false)} style={styles.cancelBtnModal} disabled={deleting}>Cancel</button>
                  <button onClick={handleDelete} style={styles.deleteConfirmBtn} disabled={deleting || !deactivateReason}>
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
      <div style={styles.ownerModalOverlay} onClick={() => setEmailModal({ open: false, report: null })}>
        <div style={styles.ownerModal} onClick={e => e.stopPropagation()}>
          <div style={styles.ownerModalHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ ...styles.ownerModalAvatar, backgroundColor: '#f0fdf4', border: '2px solid #bbf7d0' }}>
                <i className="fas fa-envelope" style={{ color: '#16a34a', fontSize: '1rem' }}></i>
              </div>
              <div>
                <h3 style={styles.ownerModalName}>Email Lab Report</h3>
                <span style={styles.ownerModalId}>{emailModal.report.report_name}</span>
              </div>
            </div>
            <button onClick={() => setEmailModal({ open: false, report: null })} style={styles.ownerModalClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div style={styles.ownerModalBody}>
            <div style={styles.ownerModalRow}>
              <span style={styles.ownerModalLabel}>
                <i className="fas fa-user" style={styles.ownerModalIcon}></i>
                Recipient
              </span>
              <span style={styles.ownerModalValue}>
                {pet?.owner_first_name} {pet?.owner_last_name}
                {pet?.owner_email && <span style={{ color: '#6b7280', fontWeight: '400', fontSize: '0.85rem' }}> — {pet.owner_email}</span>}
              </span>
            </div>
            <div style={styles.ownerModalRow}>
              <span style={styles.ownerModalLabel}>
                <i className="fas fa-file" style={styles.ownerModalIcon}></i>
                Report
              </span>
              <span style={styles.ownerModalValue}>
                {emailModal.report.report_name}
                <span style={{ marginLeft: '0.4rem', fontSize: '0.78rem', background: '#ede9fe', color: '#5b21b6', padding: '0.1rem 0.45rem', borderRadius: '9999px', fontWeight: '600' }}>
                  {emailModal.report.report_type.replace(/_/g, ' ')}
                </span>
              </span>
            </div>
            <div style={styles.ownerModalRow}>
              <label style={styles.ownerModalLabel}>
                <i className="fas fa-comment" style={styles.ownerModalIcon}></i>
                Optional message
              </label>
              <textarea
                value={emailMessage}
                onChange={e => setEmailMessage(e.target.value)}
                rows={4}
                placeholder="Add a note for the owner (e.g. results summary, next steps)..."
                style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.88rem', color: '#111827', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={styles.ownerModalFooter}>
            <button
              onClick={handleEmailReport}
              disabled={sending || !pet?.owner_email}
              style={{ ...styles.ownerModalFullBtn, backgroundColor: sending ? '#15803d' : '#16a34a', color: 'white', border: 'none', opacity: (!pet?.owner_email) ? 0.5 : 1, cursor: (!pet?.owner_email || sending) ? 'not-allowed' : 'pointer' }}
            >
              <i className={`fas fa-${sending ? 'circle-notch fa-spin' : 'paper-plane'}`} style={{ marginRight: '0.4rem' }}></i>
              {sending ? 'Sending...' : 'Send to Owner'}
            </button>
            {!pet?.owner_email && (
              <p style={{ textAlign: 'center', color: '#dc2626', fontSize: '0.8rem', margin: '0.5rem 0 0' }}>
                Owner has no email address on file.
              </p>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Owner Details Modal */}
    {showOwnerModal && pet && (
      <div style={styles.ownerModalOverlay} onClick={() => setShowOwnerModal(false)}>
        <div style={styles.ownerModal} onClick={e => e.stopPropagation()}>
          <div style={styles.ownerModalHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={styles.ownerModalAvatar}>
                <i className="fas fa-user" style={{ color: '#2563eb', fontSize: '1.1rem' }}></i>
              </div>
              <div>
                <h3 style={styles.ownerModalName}>
                  {pet.owner_first_name} {pet.owner_last_name}
                </h3>
                <span style={styles.ownerModalId}>ID: {pet.customer_id}</span>
              </div>
            </div>
            <button onClick={() => setShowOwnerModal(false)} style={styles.ownerModalClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div style={styles.ownerModalBody}>
            {pet.owner_phone && (
              <div style={styles.ownerModalRow}>
                <span style={styles.ownerModalLabel}>
                  <i className="fas fa-phone" style={styles.ownerModalIcon}></i>
                  Phone
                </span>
                <span style={styles.ownerModalValue}>{pet.owner_phone}</span>
              </div>
            )}
            {pet.owner_email && (
              <div style={styles.ownerModalRow}>
                <span style={styles.ownerModalLabel}>
                  <i className="fas fa-envelope" style={styles.ownerModalIcon}></i>
                  Email
                </span>
                <span style={styles.ownerModalValue}>{pet.owner_email}</span>
              </div>
            )}
            {pet.owner_address && (
              <div style={styles.ownerModalRow}>
                <span style={styles.ownerModalLabel}>
                  <i className="fas fa-location-dot" style={styles.ownerModalIcon}></i>
                  Address
                </span>
                <span style={styles.ownerModalValue}>{pet.owner_address}</span>
              </div>
            )}
          </div>

          <div style={{ ...styles.ownerModalFooter, display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            {pet.owner_phone && (
              <button
                onClick={() => { const d = (pet.owner_phone || '').replace(/\D/g, ''); const n = d.startsWith('0') ? '94' + d.slice(1) : d; window.open(`https://wa.me/${n}`, '_blank'); }}
                style={{ ...styles.ownerModalFullBtn, backgroundColor: '#25d366', color: 'white', border: 'none' }}
              >
                <i className="fab fa-whatsapp" style={{ marginRight: '0.4rem' }}></i>
                WhatsApp
              </button>
            )}
            <button
              onClick={() => { setShowOwnerModal(false); setOwnerEmailForm({ subject: '', message: '' }); setOwnerEmailOpen(true); }}
              disabled={!pet.owner_email}
              title={!pet.owner_email ? 'No email address on file' : ''}
              style={{ ...styles.ownerModalFullBtn, backgroundColor: '#2563eb', color: 'white', border: 'none', opacity: !pet.owner_email ? 0.5 : 1, cursor: !pet.owner_email ? 'not-allowed' : 'pointer' }}
            >
              <i className="fas fa-envelope" style={{ marginRight: '0.4rem' }}></i>
              Send Email
            </button>
            <button onClick={() => { setShowOwnerModal(false); navigate(`/customers/${pet.customer_id}`); }} style={styles.ownerModalFullBtn}>
              <i className="fas fa-arrow-up-right-from-square" style={{ marginRight: '0.4rem' }}></i>
              Full Profile
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Owner Email Compose Modal */}
    {ownerEmailOpen && pet && (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        onClick={() => setOwnerEmailOpen(false)}>
        <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '2rem', width: '100%', maxWidth: '520px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}
          onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1f2937' }}>
              <i className="fas fa-envelope" style={{ marginRight: '0.5rem', color: '#2563eb' }}></i>
              Send Email to {pet.owner_first_name} {pet.owner_last_name}
            </h3>
            <button onClick={() => setOwnerEmailOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#6b7280' }}>
              <i className="fas fa-xmark"></i>
            </button>
          </div>
          <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#6b7280' }}>
            <i className="fas fa-circle-info" style={{ marginRight: '0.4rem' }}></i>
            Sending to: <strong>{pet.owner_email}</strong>
          </p>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.4rem' }}>Subject</label>
            <input
              type="text"
              value={ownerEmailForm.subject}
              onChange={e => setOwnerEmailForm(f => ({ ...f, subject: e.target.value }))}
              placeholder="Email subject"
              style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.4rem' }}>Message</label>
            <textarea
              value={ownerEmailForm.message}
              onChange={e => setOwnerEmailForm(f => ({ ...f, message: e.target.value }))}
              placeholder="Type your message here..."
              rows={6}
              style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button onClick={() => setOwnerEmailOpen(false)}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer', fontSize: '0.875rem' }}>
              Cancel
            </button>
            <button
              onClick={handleSendOwnerEmail}
              disabled={ownerEmailSending || !ownerEmailForm.subject.trim() || !ownerEmailForm.message.trim()}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', border: 'none', background: (ownerEmailSending || !ownerEmailForm.subject.trim() || !ownerEmailForm.message.trim()) ? '#9ca3af' : '#2563eb', color: '#fff', cursor: (ownerEmailSending || !ownerEmailForm.subject.trim() || !ownerEmailForm.message.trim()) ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>
              {ownerEmailSending
                ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: '0.4rem' }}></i>Sending...</>
                : <><i className="fas fa-paper-plane" style={{ marginRight: '0.4rem' }}></i>Send Email</>}
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
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  backButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  headerActions: {
    display: 'flex',
    gap: '0.75rem',
  },
  editButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '2rem',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  icon: {
    fontSize: '3rem',
    color: '#3b82f6',
  },
  headerAvatarImage: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid #e5e7eb',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  petName: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#111827',
    margin: '0 0 0.25rem 0',
  },
  petId: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: 0,
  },
  badges: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
  },
  activeBadge: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  inactiveBadge: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  maleBadge: {
    backgroundColor: '#f3f4f6',
    color: '#111827',
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  femaleBadge: {
    backgroundColor: '#f3f4f6',
    color: '#111827',
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  tabs: {
    display: 'flex',
    borderBottom: '2px solid #e5e7eb',
    padding: '0 2rem',
  },
  tab: {
    padding: '1rem 1.5rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#6b7280',
    cursor: 'pointer',
    marginBottom: '-2px',
    transition: 'all 0.2s',
  },
  activeTab: {
    padding: '1rem 1.5rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid #2563eb',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#2563eb',
    cursor: 'pointer',
    marginBottom: '-2px',
  },
  tabContent: {
    padding: '2rem',
  },
  section: {
    marginBottom: '2rem',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '1rem',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  addRecordButton: {
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    padding: '0.625rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  emptyButton: {
    marginTop: '1rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  infoLabel: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#6b7280',
  },
  infoValue: {
    fontSize: '1rem',
    color: '#111827',
  },
  ownerLink: {
    fontSize: '1rem',
    color: '#2563eb',
    cursor: 'pointer',
    textDecoration: 'underline',
    fontWeight: '500',
  },
  notesSection: {
    marginTop: '1rem',
    padding: '1rem',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
  },
  notes: {
    margin: '0.5rem 0 0 0',
    fontSize: '0.875rem',
    color: '#374151',
    lineHeight: '1.5',
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    color: '#6b7280',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  historyCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '1rem',
    backgroundColor: '#f9fafb',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.75rem',
  },
  historyDate: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#111827',
  },
  historyType: {
    padding: '0.25rem 0.5rem',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  historyContent: {
    fontSize: '0.875rem',
    color: '#374151',
    lineHeight: '1.5',
  },
  tableContainer: {
    overflow: 'auto',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    backgroundColor: '#f9fafb',
  },
  th: {
    padding: '0.75rem',
    textAlign: 'left',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
    borderBottom: '1px solid #e5e7eb',
  },
  tableRow: {
    borderBottom: '1px solid #f3f4f6',
  },
  td: {
    padding: '0.75rem',
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '50vh',
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #2563eb',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    animation: 'spin 1s linear infinite',
  },
  errorContainer: {
    padding: '2rem',
    textAlign: 'center',
  },
  errorText: {
    color: '#ef4444',
    marginBottom: '1rem',
  },
  errorAlert: {
    backgroundColor: '#FEE2E2',
    border: '1px solid #FCA5A5',
    color: '#991B1B',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
  },
  successAlert: {
    backgroundColor: '#D1FAE5',
    border: '1px solid #6EE7B7',
    color: '#065F46',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
  },
  imageSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.5rem',
    padding: '1rem',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px',
  },
  imageContainer: {
    position: 'relative',
    width: '200px',
    height: '200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  petImage: {
    width: '100%',
    height: '100%',
    borderRadius: '12px',
    objectFit: 'cover',
    border: '3px solid white',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  noImage: {
    width: '100%',
    height: '100%',
    borderRadius: '12px',
    backgroundColor: '#E5E7EB',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6B7280',
    border: '2px dashed #9CA3AF',
  },
  noImageIcon: {
    fontSize: '3rem',
    marginBottom: '0.5rem',
    color: '#9CA3AF',
  },
  imageActions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    width: '100%',
    maxWidth: '400px',
  },
  imageButtonGroup: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  selectImageButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  uploadButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#10B981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  deleteImageButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#EF4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  cancelImageButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#6B7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  imageHint: {
    fontSize: '0.75rem',
    color: '#6B7280',
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    width: '90%',
    maxWidth: '480px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid #e5e7eb',
  },
  modalTitle: {
    margin: 0,
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#111827',
  },
  modalCloseButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.25rem',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '0.25rem',
  },
  modalLabel: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem',
  },
  modalInput: {
    width: '100%',
    padding: '0.625rem 0.75rem',
    fontSize: '0.9375rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: '#fff',
  },
  cancelBtnModal: {
    padding: '0.625rem 1.25rem',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  inactivateBtn: {
    padding: '0.625rem 1.25rem',
    backgroundColor: '#d97706',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  deleteConfirmBtn: {
    padding: '0.625rem 1.25rem',
    backgroundColor: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  labUploadForm: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '1.25rem',
    marginBottom: '1.5rem',
  },
  labFormGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '0.9rem',
  },
  labFormGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  labFormLabel: {
    fontSize: '0.78rem',
    fontWeight: '600',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  labFormInput: {
    padding: '0.45rem 0.65rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
    backgroundColor: 'white',
    outline: 'none',
  },
  labUploadBtn: {
    padding: '0.55rem 1.25rem',
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  labReportCard: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.75rem',
    padding: '1rem 1.25rem',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  labReportIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    backgroundColor: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  labReportName: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#111827',
  },
  labReportTypeBadge: {
    fontSize: '0.7rem',
    fontWeight: '600',
    color: '#6366f1',
    backgroundColor: '#eef2ff',
    padding: '0.15rem 0.5rem',
    borderRadius: '9999px',
    textTransform: 'capitalize',
  },
  labReportMeta: {
    display: 'flex',
    gap: '1rem',
    fontSize: '0.78rem',
    color: '#6b7280',
    marginTop: '0.25rem',
    flexWrap: 'wrap',
  },
  labReportNotes: {
    fontSize: '0.8rem',
    color: '#6b7280',
    margin: '0.35rem 0 0',
  },
  labViewBtn: {
    padding: '0.4rem 0.85rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
  },
  labEmailBtn: {
    padding: '0.4rem 0.85rem',
    backgroundColor: '#f0fdf4',
    color: '#16a34a',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
  },
  labDeleteBtn: {
    padding: '0.4rem 0.85rem',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
  },
  ownerModalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  ownerModal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    width: '100%',
    maxWidth: '400px',
    overflow: 'hidden',
  },
  ownerModalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid #f3f4f6',
  },
  ownerModalAvatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    backgroundColor: '#eff6ff',
    border: '2px solid #bfdbfe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ownerModalName: {
    fontSize: '1.05rem',
    fontWeight: '700',
    color: '#111827',
    margin: 0,
  },
  ownerModalId: {
    fontSize: '0.78rem',
    color: '#9ca3af',
    fontWeight: '500',
  },
  ownerModalClose: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    fontSize: '1.1rem',
    cursor: 'pointer',
    padding: '0.25rem',
    lineHeight: 1,
  },
  ownerModalBody: {
    padding: '1.25rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
  },
  ownerModalRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
  },
  ownerModalLabel: {
    fontSize: '0.72rem',
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
  },
  ownerModalIcon: {
    color: '#9ca3af',
    fontSize: '0.75rem',
  },
  ownerModalValue: {
    fontSize: '0.95rem',
    color: '#111827',
    fontWeight: '500',
  },
  ownerModalFooter: {
    padding: '1rem 1.5rem',
    borderTop: '1px solid #f3f4f6',
  },
  ownerModalFullBtn: {
    padding: '0.4rem 0.85rem',
    backgroundColor: 'white',
    color: '#2563eb',
    border: '1px solid #bfdbfe',
    borderRadius: '7px',
    fontSize: '0.8rem',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'nowrap',
  },
};

export default PetDetail;
