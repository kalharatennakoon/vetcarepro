import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserById, updateUser, uploadProfileImage, deleteProfileImage, getUserStats } from '../services/userService';
import Layout from '../components/Layout';
import ImageCropModal from '../components/ImageCropModal';

function Profile() {
  const { user: currentUser, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const errorRef = useRef(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);
  const [success, setSuccess] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [showDeleteImageModal, setShowDeleteImageModal] = useState(false);
  const [croppedImageBlob, setCroppedImageBlob] = useState(null);
  const [activityStats, setActivityStats] = useState(null);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: '',
    specialization: '',
    license_number: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    loadProfile();
  }, [currentUser]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const userId = currentUser.user_id || currentUser.id;
      const [profileRes, statsRes] = await Promise.all([
        getUserById(userId),
        getUserStats(userId)
      ]);
      const userData = profileRes.data?.user || profileRes.data;
      setProfileData(userData);
      setActivityStats(statsRes.data?.stats || null);
      setFormData({
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        gender: userData.gender || '',
        specialization: userData.specialization || '',
        license_number: userData.license_number || '',
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (err) {
      setError('Failed to load profile');
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate password change if attempted
    if (formData.new_password) {
      if (!formData.current_password) {
        setError('Current password is required to change password');
        return;
      }
      if (formData.new_password !== formData.confirm_password) {
        setError('New passwords do not match');
        return;
      }
      if (formData.new_password.length < 6) {
        setError('New password must be at least 6 characters');
        return;
      }
    }

    try {
      setSaving(true);
      const userId = currentUser.user_id || currentUser.id;
      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone
      };

      // Only admin can update email
      if (currentUser.role === 'admin') {
        updateData.email = formData.email;
      }

      // Include veterinarian-specific fields if applicable
      if (currentUser.role === 'veterinarian') {
        updateData.specialization = formData.specialization;
        updateData.license_number = formData.license_number;
      }

      // Include password change if provided
      if (formData.new_password) {
        updateData.current_password = formData.current_password;
        updateData.password = formData.new_password;
      }

      await updateUser(userId, updateData);
      setSuccess('Profile updated successfully');
      setIsEditing(false);
      
      // Clear password fields
      setFormData(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: ''
      }));
      
      // Reload profile to get fresh data
      await loadProfile();
      
      // Refresh user in auth context to update header
      await refreshUser();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to update profile');
      console.error('Error updating profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    setSuccess(null);
    // Reset form data to original profile data
    setFormData({
      first_name: profileData.first_name || '',
      last_name: profileData.last_name || '',
      email: profileData.email || '',
      phone: profileData.phone || '',
      specialization: profileData.specialization || '',
      license_number: profileData.license_number || '',
      current_password: '',
      new_password: '',
      confirm_password: ''
    });
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }

      // Create preview and open crop modal
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageToCrop(reader.result);
        setShowCropModal(true);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const handleCropComplete = (croppedBlob) => {
    // Create preview from cropped blob
    const croppedUrl = URL.createObjectURL(croppedBlob);
    setImagePreview(croppedUrl);
    setCroppedImageBlob(croppedBlob);
    
    // Create a File object from the blob
    const fileName = `profile-${Date.now()}.jpg`;
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
      setError(null);
      const userId = currentUser.user_id || currentUser.id;
      const response = await uploadProfileImage(userId, selectedImage);
      
      setSuccess('Profile image uploaded successfully');
      setSelectedImage(null);
      setImagePreview(null);
      setCroppedImageBlob(null);
      
      // Reload profile to get updated image
      await loadProfile();
      
      // Refresh user in auth context to update header
      await refreshUser();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload image');
      console.error('Error uploading image:', err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageDelete = async () => {
    try {
      setUploadingImage(true);
      setError(null);
      const userId = currentUser.user_id || currentUser.id;
      await deleteProfileImage(userId);
      
      setSuccess('Profile image deleted successfully');
      setSelectedImage(null);
      setImagePreview(null);
      setCroppedImageBlob(null);
      
      // Reload profile to refresh
      await loadProfile();
      
      // Refresh user in auth context to update header
      await refreshUser();
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
    setCroppedImageBlob(null);
    setError(null);
  };

  if (loading) {
    return (
      <Layout>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading profile...</p>
        </div>
      </Layout>
    );
  }

  const isVeterinarian = currentUser.role === 'veterinarian';

  // Get name with appropriate prefix
  const getNameWithPrefix = () => {
    if (!profileData) return '';
    
    let prefix = '';
    if (isVeterinarian) {
      prefix = 'Dr.';
    } else {
      // Use gender from user data or default to 'Mr.'
      const gender = profileData.gender || currentUser.gender;
      prefix = gender === 'female' ? 'Ms.' : 'Mr.';
    }
    
    return `${prefix} ${profileData.first_name} ${profileData.last_name}`;
  };

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
        {/* Modern Profile Hero Header */}
        <div style={styles.heroBanner}>
          <div style={styles.heroContent}>
            <div style={styles.avatarWrapper}>
              {imagePreview || profileData?.profile_image ? (
                <img 
                  src={imagePreview || `http://localhost:3000/uploads/${profileData.profile_image}`} 
                  alt="Profile"
                  style={styles.heroAvatarImage}
                />
              ) : (
                <div style={styles.heroAvatarInitials}>
                  {profileData?.first_name?.charAt(0)}{profileData?.last_name?.charAt(0)}
                </div>
              )}
              <label htmlFor="profileImageInput" style={styles.avatarCameraBadge} title="Change Profile Image">
                <i className="fas fa-camera"></i>
              </label>
              <input
                type="file"
                id="profileImageInput"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
              />
            </div>

            <div style={styles.heroDetails}>
              <div style={styles.heroHeaderRow}>
                <div>
                  <h1 style={styles.heroName}>{getNameWithPrefix()}</h1>
                  <div style={styles.heroMetaRow}>
                    <span style={styles.roleBadge}>
                      <i className="fas fa-user-shield" style={{ marginRight: '5px' }}></i>
                      {profileData?.role?.toUpperCase()}
                    </span>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: profileData?.is_active ? '#d1fae5' : '#fee2e2',
                      color: profileData?.is_active ? '#065f46' : '#991b1b'
                    }}>
                      <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: profileData?.is_active ? '#10b981' : '#ef4444',
                        display: 'inline-block',
                        marginRight: '6px'
                      }}></span>
                      {profileData?.is_active ? 'Active Staff' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} style={styles.editButton}>
                    <i className="fas fa-pen"></i> Edit Profile
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleCancel} style={styles.cancelButtonHeader}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {selectedImage ? (
                <div style={styles.pendingImageBar}>
                  <span style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: '500' }}>
                    <i className="fas fa-image" style={{ marginRight: '6px' }}></i>
                    New photo selected
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={handleImageUpload}
                      disabled={uploadingImage}
                      style={styles.uploadButton}
                    >
                      <i className="fas fa-upload"></i> {uploadingImage ? 'Uploading...' : 'Save Photo'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelImageSelection}
                      disabled={uploadingImage}
                      style={styles.cancelImageButton}
                    >
                      Discard
                    </button>
                  </div>
                </div>
              ) : profileData?.profile_image && (
                <div style={{ marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowDeleteImageModal(true)}
                    disabled={uploadingImage}
                    style={styles.removePhotoButton}
                  >
                    <i className="fas fa-trash-alt"></i> Remove photo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {profileData?.password_must_change && (
          <div style={styles.warningAlert}>
            <i className="fas fa-exclamation-triangle" style={{ marginRight: '0.6rem', fontSize: '1.1rem' }}></i>
            Your password must be changed. Please update it using the Edit Profile option below.
          </div>
        )}

        {error && (
          <div ref={errorRef} style={styles.errorAlert}>
            <i className="fas fa-exclamation-circle" style={{ marginRight: '0.6rem', fontSize: '1.1rem' }}></i>
            {error}
          </div>
        )}

        {success && (
          <div style={styles.successAlert}>
            <i className="fas fa-check-circle" style={{ marginRight: '0.6rem', fontSize: '1.1rem' }}></i>
            {success}
          </div>
        )}

        {/* Activity Summary Cards */}
        {activityStats && (
          <div style={styles.activityGrid}>
            {currentUser.role === 'veterinarian' && (
              <>
                <div style={styles.activityCard}>
                  <div style={{ ...styles.activityIconBg, background: '#dbeafe', color: '#2563eb' }}>
                    <i className="fas fa-calendar-check"></i>
                  </div>
                  <div>
                    <p style={styles.activityValue}>{activityStats.total_appointments || 0}</p>
                    <p style={styles.activityLabel}>Appointments Handled</p>
                  </div>
                </div>
                <div style={styles.activityCard}>
                  <div style={{ ...styles.activityIconBg, background: '#e0e7ff', color: '#4f46e5' }}>
                    <i className="fas fa-notes-medical"></i>
                  </div>
                  <div>
                    <p style={styles.activityValue}>{activityStats.total_medical_records || 0}</p>
                    <p style={styles.activityLabel}>Medical Records</p>
                  </div>
                </div>
                <div style={styles.activityCard}>
                  <div style={{ ...styles.activityIconBg, background: '#fef3c7', color: '#d97706' }}>
                    <i className="fas fa-viruses"></i>
                  </div>
                  <div>
                    <p style={styles.activityValue}>{activityStats.total_disease_cases || 0}</p>
                    <p style={styles.activityLabel}>Disease Cases</p>
                  </div>
                </div>
              </>
            )}

            {currentUser.role === 'receptionist' && (
              <>
                <div style={styles.activityCard}>
                  <div style={{ ...styles.activityIconBg, background: '#dbeafe', color: '#2563eb' }}>
                    <i className="fas fa-calendar-alt"></i>
                  </div>
                  <div>
                    <p style={styles.activityValue}>{activityStats.total_appointments_booked || 0}</p>
                    <p style={styles.activityLabel}>Appointments Scheduled</p>
                  </div>
                </div>
                <div style={styles.activityCard}>
                  <div style={{ ...styles.activityIconBg, background: '#d1fae5', color: '#059669' }}>
                    <i className="fas fa-user-plus"></i>
                  </div>
                  <div>
                    <p style={styles.activityValue}>{activityStats.total_customers_registered || 0}</p>
                    <p style={styles.activityLabel}>Customers Registered</p>
                  </div>
                </div>
                <div style={styles.activityCard}>
                  <div style={{ ...styles.activityIconBg, background: '#ffedd5', color: '#ea580c' }}>
                    <i className="fas fa-paw"></i>
                  </div>
                  <div>
                    <p style={styles.activityValue}>{activityStats.total_pets_registered || 0}</p>
                    <p style={styles.activityLabel}>Pets Registered</p>
                  </div>
                </div>
              </>
            )}

            {currentUser.role === 'admin' && (
              <>
                <div style={styles.activityCard}>
                  <div style={{ ...styles.activityIconBg, background: '#f3e8ff', color: '#9333ea' }}>
                    <i className="fas fa-users-cog"></i>
                  </div>
                  <div>
                    <p style={styles.activityValue}>{activityStats.total_users_created || 0}</p>
                    <p style={styles.activityLabel}>Staff Accounts</p>
                  </div>
                </div>
                <div style={styles.activityCard}>
                  <div style={{ ...styles.activityIconBg, background: '#d1fae5', color: '#059669' }}>
                    <i className="fas fa-address-book"></i>
                  </div>
                  <div>
                    <p style={styles.activityValue}>{activityStats.total_customers_registered || 0}</p>
                    <p style={styles.activityLabel}>Customers Registered</p>
                  </div>
                </div>
                <div style={styles.activityCard}>
                  <div style={{ ...styles.activityIconBg, background: '#e0e7ff', color: '#4f46e5' }}>
                    <i className="fas fa-list-check"></i>
                  </div>
                  <div>
                    <p style={styles.activityValue}>{activityStats.total_actions_logged || 0}</p>
                    <p style={styles.activityLabel}>Audit Actions</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <div style={styles.mainLayoutGrid}>
          {/* Left / Primary Column: Form */}
          <div style={styles.profileCard}>
            <form onSubmit={handleSubmit}>
              {/* Personal Info Section */}
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <h3 style={styles.sectionTitle}>
                    <i className="fas fa-id-card" style={{ marginRight: '0.6rem', color: '#2563eb' }}></i>
                    Personal Details
                  </h3>
                </div>

                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>First Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        style={styles.input}
                        required
                      />
                    ) : (
                      <div style={styles.displayValue}>{profileData?.first_name}</div>
                    )}
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Last Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        style={styles.input}
                        required
                      />
                    ) : (
                      <div style={styles.displayValue}>{profileData?.last_name}</div>
                    )}
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Email Address
                      {currentUser.role !== 'admin' && (
                        <span style={styles.readOnlyBadge}>(Managed by Admin)</span>
                      )}
                    </label>
                    {isEditing && currentUser.role === 'admin' ? (
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        style={styles.input}
                        required
                      />
                    ) : (
                      <div style={styles.displayValue}>{profileData?.email}</div>
                    )}
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Phone Number</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        style={styles.input}
                        placeholder="e.g. 077 123 4567"
                      />
                    ) : (
                      <div style={styles.displayValue}>{profileData?.phone || 'Not provided'}</div>
                    )}
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Gender</label>
                    {isEditing ? (
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        style={styles.input}
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    ) : (
                      <div style={styles.displayValue}>
                        {profileData?.gender ? profileData.gender.charAt(0).toUpperCase() + profileData.gender.slice(1) : 'Not specified'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Veterinarian professional info */}
              {isVeterinarian && (
                <div style={styles.section}>
                  <div style={styles.sectionHeader}>
                    <h3 style={styles.sectionTitle}>
                      <i className="fas fa-user-md" style={{ marginRight: '0.6rem', color: '#2563eb' }}></i>
                      Professional Credentials
                    </h3>
                  </div>

                  <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Specialization</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="specialization"
                          value={formData.specialization}
                          onChange={handleInputChange}
                          style={styles.input}
                          placeholder="e.g. Small Animal Care"
                        />
                      ) : (
                        <div style={styles.displayValue}>{profileData?.specialization || 'General Practice'}</div>
                      )}
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>License Number</label>
                      {isEditing && currentUser.role === 'admin' ? (
                        <input
                          type="text"
                          name="license_number"
                          value={formData.license_number}
                          onChange={handleInputChange}
                          style={styles.input}
                        />
                      ) : (
                        <div style={styles.displayValue}>{profileData?.license_number || 'Registered'}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Password Change Section */}
              {isEditing && (
                <div style={{ ...styles.section, borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
                  <div style={styles.sectionHeader}>
                    <h3 style={styles.sectionTitle}>
                      <i className="fas fa-lock" style={{ marginRight: '0.6rem', color: '#2563eb' }}></i>
                      Security & Password
                    </h3>
                    <p style={styles.sectionSubtitle}>Leave blank if you do not wish to change your password</p>
                  </div>

                  <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Current Password</label>
                      <div style={styles.passwordWrapper}>
                        <input
                          type={showCurrentPw ? 'text' : 'password'}
                          name="current_password"
                          value={formData.current_password}
                          onChange={handleInputChange}
                          style={styles.passwordInput}
                          placeholder="Enter current password"
                          autoComplete="current-password"
                        />
                        <button type="button" onClick={() => setShowCurrentPw(p => !p)} style={styles.eyeButton}>
                          <i className={`fas ${showCurrentPw ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                      </div>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>New Password</label>
                      <div style={styles.passwordWrapper}>
                        <input
                          type={showNewPw ? 'text' : 'password'}
                          name="new_password"
                          value={formData.new_password}
                          onChange={handleInputChange}
                          style={styles.passwordInput}
                          placeholder="Enter new password"
                          autoComplete="new-password"
                        />
                        <button type="button" onClick={() => setShowNewPw(p => !p)} style={styles.eyeButton}>
                          <i className={`fas ${showNewPw ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                      </div>
                      <span style={styles.fieldHint}>Minimum 6 characters</span>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Confirm New Password</label>
                      <div style={styles.passwordWrapper}>
                        <input
                          type={showConfirmPw ? 'text' : 'password'}
                          name="confirm_password"
                          value={formData.confirm_password}
                          onChange={handleInputChange}
                          style={styles.passwordInput}
                          placeholder="Confirm new password"
                          autoComplete="new-password"
                        />
                        <button type="button" onClick={() => setShowConfirmPw(p => !p)} style={styles.eyeButton}>
                          <i className={`fas ${showConfirmPw ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Action Buttons */}
              {isEditing && (
                <div style={styles.actionButtons}>
                  <button
                    type="button"
                    onClick={handleCancel}
                    style={styles.cancelButton}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={saving ? { ...styles.saveButton, opacity: 0.6 } : styles.saveButton}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <i className="fas fa-spinner fa-spin" style={{ marginRight: '0.5rem' }}></i>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save" style={{ marginRight: '0.5rem' }}></i>
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Right Column: Meta & Info */}
          <div style={styles.sideColumn}>
            <div style={styles.infoCard}>
              <h3 style={styles.infoCardTitle}>
                <i className="fas fa-shield-halved" style={{ marginRight: '0.6rem', color: '#2563eb' }}></i>
                Account Meta
              </h3>
              <div style={styles.infoList}>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Role</span>
                  <span style={styles.infoValueHighlight}>{profileData?.role?.toUpperCase()}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Member Since</span>
                  <span style={styles.infoValue}>
                    {profileData?.created_at ? new Date(profileData.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : 'N/A'}
                  </span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Last Updated</span>
                  <span style={styles.infoValue}>
                    {profileData?.updated_at ? new Date(profileData.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : 'N/A'}
                  </span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Last Signed In</span>
                  <span style={styles.infoValue}>
                    {profileData?.last_login ? new Date(profileData.last_login).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Recently'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Clinic Info Card */}
            <div style={{ ...styles.infoCard, marginTop: '1.25rem', background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)', border: '1px solid #bfdbfe' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <i className="fas fa-hospital" style={{ color: '#2563eb', fontSize: '1.2rem' }}></i>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#1e3a8a' }}>Pro Pet Animal Hospital</h4>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#3b82f6', lineHeight: 1.5 }}>
                Operating Hours: Mon–Sat, 09:00 – 18:30. Authorized staff access only.
              </p>
            </div>
          </div>
        </div>
      </div>

      {showDeleteImageModal && (
        <div style={styles.modalOverlay} onClick={() => setShowDeleteImageModal(false)}>
          <div style={{ ...styles.modalContent, maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                <i className="fas fa-trash" style={{ marginRight: '0.5rem', color: '#dc2626' }}></i>
                Remove Profile Image
              </h3>
              <button onClick={() => setShowDeleteImageModal(false)} style={styles.modalCloseButton}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ margin: '0 0 1.5rem', color: '#374151', fontSize: '0.95rem' }}>
                Are you sure you want to remove your profile photo? You can upload a new one at any time.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowDeleteImageModal(false)}
                  style={{ padding: '0.5rem 1.1rem', borderRadius: '7px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#374151', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setShowDeleteImageModal(false); handleImageDelete(); }}
                  disabled={uploadingImage}
                  style={{ padding: '0.5rem 1.1rem', borderRadius: '7px', border: 'none', backgroundColor: '#dc2626', color: '#fff', fontWeight: '600', fontSize: '0.875rem', cursor: uploadingImage ? 'not-allowed' : 'pointer', opacity: uploadingImage ? 0.7 : 1 }}
                >
                  <i className="fas fa-trash" style={{ marginRight: '0.4rem' }}></i>
                  Remove Image
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

const styles = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: '1200px',
    margin: '0 auto',
    paddingBottom: '2rem',
  },
  heroBanner: {
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    borderRadius: '16px',
    padding: '2rem 2.25rem',
    marginBottom: '1.5rem',
    color: '#ffffff',
    boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
  },
  heroContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem',
    flexWrap: 'wrap',
  },
  avatarWrapper: {
    position: 'relative',
    flexShrink: 0,
  },
  heroAvatarImage: {
    width: '90px',
    height: '90px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid #38bdf8',
    boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
  },
  heroAvatarInitials: {
    width: '90px',
    height: '90px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2.25rem',
    fontWeight: '700',
    border: '3px solid rgba(255,255,255,0.2)',
    boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: '0',
    right: '0',
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    backgroundColor: '#0284c7',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
    border: '2px solid #0f172a',
    transition: 'transform 0.2s',
  },
  heroDetails: {
    flex: 1,
    minWidth: '260px',
  },
  heroHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  heroName: {
    fontSize: '1.75rem',
    fontWeight: '700',
    margin: '0 0 0.4rem 0',
    color: '#f8fafc',
    letterSpacing: '-0.02em',
  },
  heroMetaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  roleBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    color: '#38bdf8',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '700',
    letterSpacing: '0.05em',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  editButton: {
    padding: '0.6rem 1.25rem',
    backgroundColor: '#0284c7',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
    transition: 'all 0.2s',
  },
  cancelButtonHeader: {
    padding: '0.6rem 1.1rem',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    color: '#f8fafc',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '10px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  pendingImageBar: {
    marginTop: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: '0.5rem 0.85rem',
    borderRadius: '8px',
    width: 'fit-content',
  },
  uploadButton: {
    padding: '0.35rem 0.85rem',
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  cancelImageButton: {
    padding: '0.35rem 0.85rem',
    backgroundColor: 'transparent',
    color: '#cbd5e1',
    border: '1px solid #64748b',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  removePhotoButton: {
    background: 'none',
    border: 'none',
    color: '#f87171',
    fontSize: '0.78rem',
    cursor: 'pointer',
    padding: 0,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  activityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  activityCard: {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    padding: '1.1rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
  },
  activityIconBg: {
    width: '46px',
    height: '46px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.25rem',
    flexShrink: 0,
  },
  activityValue: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
    lineHeight: 1.1,
  },
  activityLabel: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#64748b',
    margin: '0.2rem 0 0 0',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  mainLayoutGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 340px',
    gap: '1.5rem',
    alignItems: 'start',
  },
  profileCard: {
    backgroundColor: '#ffffff',
    padding: '1.75rem 2rem',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
  },
  sideColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  section: {
    marginBottom: '1.75rem',
    paddingBottom: '1.75rem',
    borderBottom: '1px solid #f1f5f9',
  },
  sectionHeader: {
    marginBottom: '1.25rem',
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
  },
  sectionSubtitle: {
    fontSize: '0.8rem',
    color: '#64748b',
    margin: '0.35rem 0 0 0',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1.25rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    marginBottom: '0.4rem',
    color: '#334155',
    fontWeight: '600',
    fontSize: '0.82rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  readOnlyBadge: {
    fontSize: '0.72rem',
    color: '#94a3b8',
    fontWeight: '500',
    fontStyle: 'normal',
  },
  input: {
    padding: '0.65rem 0.85rem',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '0.875rem',
    color: '#0f172a',
    outline: 'none',
    backgroundColor: '#ffffff',
  },
  displayValue: {
    padding: '0.65rem 0.85rem',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    fontSize: '0.875rem',
    color: '#1e293b',
    fontWeight: '500',
    border: '1px solid #e2e8f0',
  },
  passwordWrapper: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  passwordInput: {
    flex: 1,
    padding: '0.65rem 0.85rem',
    border: 'none',
    fontSize: '0.875rem',
    outline: 'none',
    background: 'transparent',
    color: '#0f172a',
  },
  fieldHint: {
    fontSize: '0.72rem',
    color: '#64748b',
    marginTop: '0.3rem',
  },
  eyeButton: {
    padding: '0 0.75rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#94a3b8',
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
  },
  actionButtons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.85rem',
    marginTop: '1.5rem',
    paddingTop: '1.25rem',
    borderTop: '1px solid #f1f5f9',
  },
  cancelButton: {
    padding: '0.6rem 1.25rem',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  saveButton: {
    padding: '0.6rem 1.35rem',
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    padding: '1.35rem 1.5rem',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
  },
  infoCardTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 1rem 0',
    display: 'flex',
    alignItems: 'center',
  },
  infoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '0.6rem',
    borderBottom: '1px solid #f8fafc',
  },
  infoLabel: {
    fontSize: '0.78rem',
    color: '#64748b',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: '0.82rem',
    color: '#0f172a',
    fontWeight: '500',
  },
  infoValueHighlight: {
    fontSize: '0.75rem',
    color: '#0284c7',
    fontWeight: '700',
    backgroundColor: '#e0f2fe',
    padding: '0.2rem 0.5rem',
    borderRadius: '6px',
  },
  warningAlert: {
    backgroundColor: '#fffbe6',
    border: '1px solid #ffe58f',
    color: '#d48806',
    padding: '0.85rem 1.1rem',
    borderRadius: '10px',
    marginBottom: '1.25rem',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
  },
  errorAlert: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    padding: '0.85rem 1.1rem',
    borderRadius: '10px',
    marginBottom: '1.25rem',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
  },
  successAlert: {
    backgroundColor: '#ecfdf5',
    border: '1px solid #a7f3d0',
    color: '#065f46',
    padding: '0.85rem 1.1rem',
    borderRadius: '10px',
    marginBottom: '1.25rem',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem',
    color: '#64748b',
  },
  spinner: {
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #0284c7',
    borderRadius: '50%',
    width: '36px',
    height: '36px',
    animation: 'spin 1s linear infinite',
    marginBottom: '1rem',
  },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#fff', borderRadius: '14px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', width: '90%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.1rem 1.35rem', borderBottom: '1px solid #e2e8f0' },
  modalTitle: { margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' },
  modalCloseButton: { background: 'none', border: 'none', fontSize: '1.1rem', color: '#64748b', cursor: 'pointer', padding: '0.2rem' },
};

export default Profile;
