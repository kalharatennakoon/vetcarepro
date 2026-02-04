import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserById, updateUser } from '../services/userService';
import Layout from '../components/Layout';

function Profile() {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
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
      const response = await getUserById(userId);
      const userData = response.data?.user || response.data;
      setProfileData(userData);
      setFormData({
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email: userData.email || '',
        phone: userData.phone || '',
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
      if (currentUser.role === 'veterinarian' || (currentUser.role === 'admin' && profileData.specialization)) {
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
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
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

  const isVeterinarian = currentUser.role === 'veterinarian' || (currentUser.role === 'admin' && profileData?.specialization);

  return (
    <Layout>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <i className="fas fa-user-circle" style={styles.headerIcon}></i>
            <div>
              <h1 style={styles.title}>Profile</h1>
              <p style={styles.subtitle}>Manage your account information</p>
            </div>
          </div>
          {!isEditing && (
            <button onClick={() => setIsEditing(true)} style={styles.editButton}>
              <i className="fas fa-edit"></i> Edit Profile
            </button>
          )}
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

        <div style={styles.profileCard}>
          <form onSubmit={handleSubmit}>
            {/* Profile Overview Section */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>
                  <i className="fas fa-id-card" style={{ marginRight: '0.5rem', color: '#667eea' }}></i>
                  Personal Information
                </h3>
              </div>

              <div style={styles.avatarSection}>
                <div style={styles.avatar}>
                  {profileData?.first_name?.charAt(0)}{profileData?.last_name?.charAt(0)}
                </div>
                <div style={styles.avatarInfo}>
                  <div style={styles.avatarName}>
                    {isVeterinarian && 'Dr. '}
                    {profileData?.first_name} {profileData?.last_name}
                  </div>
                  <div style={styles.avatarRole}>{profileData?.role}</div>
                </div>
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
                    Email
                    {currentUser.role !== 'admin' && (
                      <span style={styles.readOnlyBadge}>(Admin only)</span>
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
                  <label style={styles.label}>Phone</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      style={styles.input}
                    />
                  ) : (
                    <div style={styles.displayValue}>{profileData?.phone || 'Not provided'}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Veterinarian-specific fields */}
            {isVeterinarian && (
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <h3 style={styles.sectionTitle}>
                    <i className="fas fa-stethoscope" style={{ marginRight: '0.5rem', color: '#667eea' }}></i>
                    Professional Information
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
                        placeholder="e.g., Small Animals, Surgery"
                      />
                    ) : (
                      <div style={styles.displayValue}>{profileData?.specialization || 'Not specified'}</div>
                    )}
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>License Number</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="license_number"
                        value={formData.license_number}
                        onChange={handleInputChange}
                        style={styles.input}
                        placeholder="Veterinary license number"
                      />
                    ) : (
                      <div style={styles.displayValue}>{profileData?.license_number || 'Not provided'}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Admin-specific information */}
            {currentUser.role === 'admin' && (
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <h3 style={styles.sectionTitle}>
                    <i className="fas fa-shield-alt" style={{ marginRight: '0.5rem', color: '#667eea' }}></i>
                    Administrator Privileges
                  </h3>
                </div>
                <div style={styles.infoBox}>
                  <p style={styles.infoText}>
                    <i className="fas fa-check-circle" style={{ color: '#10b981', marginRight: '0.5rem' }}></i>
                    You have full administrative access to the system
                  </p>
                  <ul style={styles.privilegeList}>
                    <li>Manage staff and user accounts</li>
                    <li>Access all reports and analytics</li>
                    <li>Configure system settings</li>
                    <li>Full data access across all modules</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Password Change Section - Only visible when editing */}
            {isEditing && (
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <h3 style={styles.sectionTitle}>
                    <i className="fas fa-key" style={{ marginRight: '0.5rem', color: '#667eea' }}></i>
                    Change Password
                  </h3>
                  <p style={styles.sectionSubtitle}>Leave blank to keep current password</p>
                </div>

                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Current Password</label>
                    <input
                      type="password"
                      name="current_password"
                      value={formData.current_password}
                      onChange={handleInputChange}
                      style={styles.input}
                      placeholder="Enter current password"
                      autoComplete="current-password"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>New Password</label>
                    <input
                      type="password"
                      name="new_password"
                      value={formData.new_password}
                      onChange={handleInputChange}
                      style={styles.input}
                      placeholder="Enter new password"
                      autoComplete="new-password"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Confirm New Password</label>
                    <input
                      type="password"
                      name="confirm_password"
                      value={formData.confirm_password}
                      onChange={handleInputChange}
                      style={styles.input}
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
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

        {/* Account Information */}
        <div style={styles.infoCard}>
          <h3 style={styles.infoCardTitle}>
            <i className="fas fa-info-circle" style={{ marginRight: '0.5rem', color: '#667eea' }}></i>
            Account Information
          </h3>
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>User ID:</span>
              <span style={styles.infoValue}>{profileData?.user_id || profileData?.id}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Account Status:</span>
              <span style={{
                ...styles.badge,
                backgroundColor: profileData?.is_active ? '#d1fae5' : '#fee2e2',
                color: profileData?.is_active ? '#065f46' : '#991b1b'
              }}>
                {profileData?.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Member Since:</span>
              <span style={styles.infoValue}>
                {profileData?.created_at ? new Date(profileData.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

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
    marginBottom: '2rem',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  headerIcon: {
    fontSize: '2rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '600',
    color: '#1F2937',
    margin: 0,
  },
  subtitle: {
    fontSize: '1rem',
    color: '#6B7280',
    margin: '0.5rem 0 0 0',
  },
  editButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
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
  profileCard: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '1.5rem',
  },
  section: {
    marginBottom: '2rem',
    paddingBottom: '2rem',
    borderBottom: '1px solid #E5E7EB',
  },
  sectionHeader: {
    marginBottom: '1.5rem',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1F2937',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
  },
  sectionSubtitle: {
    fontSize: '0.875rem',
    color: '#6B7280',
    margin: '0.5rem 0 0 0',
  },
  avatarSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    marginBottom: '2rem',
    padding: '1.5rem',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px',
  },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    fontWeight: '600',
    flexShrink: 0,
  },
  avatarInfo: {
    flex: 1,
  },
  avatarName: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: '0.25rem',
  },
  avatarRole: {
    fontSize: '1rem',
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    marginBottom: '0.5rem',
    color: '#374151',
    fontWeight: '600',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  readOnlyBadge: {
    fontSize: '0.75rem',
    color: '#6B7280',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'all 0.2s',
  },
  displayValue: {
    padding: '0.75rem',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px',
    fontSize: '0.875rem',
    color: '#1F2937',
    border: '1px solid #E5E7EB',
  },
  infoBox: {
    backgroundColor: '#F0F9FF',
    border: '1px solid #BAE6FD',
    padding: '1.5rem',
    borderRadius: '8px',
  },
  infoText: {
    fontSize: '0.875rem',
    color: '#1F2937',
    margin: '0 0 1rem 0',
    display: 'flex',
    alignItems: 'center',
  },
  privilegeList: {
    margin: '0',
    paddingLeft: '1.5rem',
    color: '#374151',
    fontSize: '0.875rem',
  },
  actionButtons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    marginTop: '2rem',
  },
  cancelButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#6B7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  saveButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#10B981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  infoCardTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1F2937',
    margin: '0 0 1.5rem 0',
    display: 'flex',
    alignItems: 'center',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  infoLabel: {
    fontSize: '0.75rem',
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: '0.875rem',
    color: '#1F2937',
    fontWeight: '500',
  },
  badge: {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    width: 'fit-content',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    color: '#6B7280',
  },
  spinner: {
    border: '4px solid #E5E7EB',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    marginBottom: '1rem',
  },
};

export default Profile;
