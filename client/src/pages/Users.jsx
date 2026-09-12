import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { getUsers, createUser, updateUser, deleteUser, resetUserPassword } from '../services/userService';
import '../styles/UsersModern.css';

const Users = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const errorRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);

  const [success, setSuccess] = useState('');
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 3000);
    return () => clearTimeout(t);
  }, [success]);

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    if (showForm && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showForm, editingUser]);
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingUser, setViewingUser] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetting, setResetting] = useState(false);
  const [deactivateModal, setDeactivateModal] = useState({ open: false, userId: null });
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: '',
    role: 'receptionist',
    specialization: '',
    license_number: '',
    password: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await getUsers();
      setUsers(response.data.users || []);
      setError('');
    } catch (err) {
      setError('Failed to load users');
      console.error(err);
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
    setError('');
    setSuccess('');

    if (!editingUser && formData.role === 'veterinarian') {
      if (!formData.specialization.trim()) {
        setError('Specialization is required for veterinarians');
        return;
      }
      if (!formData.license_number.trim()) {
        setError('License Number is required for veterinarians');
        return;
      }
    }

    try {
      if (editingUser) {
        // Update existing user
        const updateData = { ...formData };
        delete updateData.password; // Don't include password in edit
        await updateUser(editingUser.user_id, updateData);
        setSuccess('User updated successfully');
      } else {
        // Create new user with default password
        const newUserData = {
          ...formData,
          password: formData.password || 'VetCare123' // Default password
        };
        await createUser(newUserData);
        setSuccess('User created successfully. Default password has been set.');
      }
      
      resetForm();
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save user');
      console.error(err);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone || '',
      gender: user.gender || '',
      role: user.role,
      specialization: user.specialization || '',
      license_number: user.license_number || '',
      password: ''
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = (userId) => {
    setDeactivateModal({ open: true, userId });
  };

  const confirmDeactivate = async () => {
    try {
      await deleteUser(deactivateModal.userId);
      setSuccess('User deactivated successfully');
      setDeactivateModal({ open: false, userId: null });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deactivate user');
      console.error(err);
    }
  };

  const handleResetPassword = async () => {
    try {
      setResetting(true);
      setError('');
      await resetUserPassword(viewingUser.user_id, resetPasswordValue || undefined);
      setSuccess(`Password reset successfully for ${viewingUser.first_name} ${viewingUser.last_name}. They will be prompted to change it on next login.`);
      setShowResetModal(false);
      setResetPasswordValue('');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await updateUser(user.user_id, {
        is_active: !user.is_active
      });
      setSuccess(`User ${user.is_active ? 'deactivated' : 'activated'} successfully`);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user status');
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      gender: '',
      role: 'receptionist',
      specialization: '',
      license_number: '',
      password: ''
    });
    setEditingUser(null);
    setShowForm(false);
  };

  const filteredUsers = users.filter(user => {
    const matchesRole = !filterRole || user.role === filterRole;
    const matchesStatus = !filterStatus || user.is_active.toString() === filterStatus;
    const matchesSearch = !searchQuery || 
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesRole && matchesStatus && matchesSearch;
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalUsersCount = users.length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const vetCount = users.filter(u => u.role === 'veterinarian').length;
  const receptionistCount = users.filter(u => u.role === 'receptionist').length;

  return (
    <Layout>
      <div className="users-container">
        {/* Page Header Hero */}
        <div className="users-header-card">
          <div className="users-header-left">
            <div className="users-header-icon">
              <i className="fas fa-users-cog"></i>
            </div>
            <div>
              <h2 className="users-title">User Management</h2>
              <p className="users-subtitle">Manage staff accounts, roles, and system access permissions</p>
            </div>
          </div>
          <button 
            onClick={() => { if (showForm) { resetForm(); } else { setShowForm(true); } }}
            className={showForm ? "users-btn-cancel" : "users-btn-add"}
          >
            <i className={`fas fa-${showForm ? 'times' : 'plus'}`}></i>
            {showForm ? 'Cancel' : 'Add User'}
          </button>
        </div>

        {/* Quick Role Stats Grid */}
        <div className="users-stats-grid">
          <div className="users-stat-card">
            <div className="users-stat-icon all">
              <i className="fas fa-users"></i>
            </div>
            <div className="users-stat-info">
              <div className="users-stat-val">{totalUsersCount}</div>
              <div className="users-stat-lbl">Total Staff</div>
            </div>
          </div>
          <div className="users-stat-card">
            <div className="users-stat-icon admin">
              <i className="fas fa-user-shield"></i>
            </div>
            <div className="users-stat-info">
              <div className="users-stat-val">{adminCount}</div>
              <div className="users-stat-lbl">Administrators</div>
            </div>
          </div>
          <div className="users-stat-card">
            <div className="users-stat-icon vet">
              <i className="fas fa-user-md"></i>
            </div>
            <div className="users-stat-info">
              <div className="users-stat-val">{vetCount}</div>
              <div className="users-stat-lbl">Veterinarians</div>
            </div>
          </div>
          <div className="users-stat-card">
            <div className="users-stat-icon reception">
              <i className="fas fa-concierge-bell"></i>
            </div>
            <div className="users-stat-info">
              <div className="users-stat-val">{receptionistCount}</div>
              <div className="users-stat-lbl">Receptionists</div>
            </div>
          </div>
        </div>

        {/* Alert Messages */}
        {error && (
          <div ref={errorRef} className="users-alert-error">
            <i className="fas fa-exclamation-circle"></i>
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="users-alert-success">
            <i className="fas fa-check-circle"></i>
            <span>{success}</span>
          </div>
        )}

        {/* User Form Card */}
        {showForm && (
          <div ref={formRef} className="users-form-card">
            <div className="users-form-header">
              <h3 className="users-form-title">
                <i className={`fas fa-${editingUser ? 'user-edit' : 'user-plus'}`} style={{ color: '#3b82f6' }}></i>
                {editingUser ? 'Edit User' : 'Create New User'}
              </h3>
            </div>
            <form onSubmit={handleSubmit}>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 1.25rem 0' }}>
                Fields marked with <span className="users-required-star">*</span> are required.
              </p>
              <div className="users-form-grid">
                <div className="users-form-group">
                  <label className="users-form-label">
                    First Name <span className="users-required-star">*</span>
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className="users-input"
                    required
                  />
                </div>
                <div className="users-form-group">
                  <label className="users-form-label">
                    Last Name <span className="users-required-star">*</span>
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className="users-input"
                    required
                  />
                </div>
                <div className="users-form-group">
                  <label className="users-form-label">
                    Email <span className="users-required-star">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="users-input"
                    required
                    disabled={editingUser !== null}
                  />
                </div>
                <div className="users-form-group">
                  <label className="users-form-label">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="users-input"
                  />
                </div>
                <div className="users-form-group">
                  <label className="users-form-label">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="users-select"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="users-form-group">
                  <label className="users-form-label">
                    Role <span className="users-required-star">*</span>
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="users-select"
                    required
                  >
                    <option value="receptionist">Receptionist</option>
                    <option value="veterinarian">Veterinarian</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {formData.role === 'veterinarian' && (
                  <>
                    <div className="users-form-group">
                      <label className="users-form-label">
                        Specialization {!editingUser && <span className="users-required-star">*</span>}
                      </label>
                      <input
                        type="text"
                        name="specialization"
                        value={formData.specialization}
                        onChange={handleInputChange}
                        className="users-input"
                        placeholder="e.g., Small Animals, Surgery"
                        required={!editingUser}
                      />
                    </div>
                    <div className="users-form-group">
                      <label className="users-form-label">
                        License Number {!editingUser && <span className="users-required-star">*</span>}
                      </label>
                      <input
                        type="text"
                        name="license_number"
                        value={formData.license_number}
                        onChange={handleInputChange}
                        className="users-input"
                        placeholder="Veterinary license number"
                        required={!editingUser}
                      />
                    </div>
                  </>
                )}
                {!editingUser && (
                  <div className="users-form-group">
                    <label className="users-form-label">Default Password</label>
                    <input
                      type="text"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="users-input"
                      placeholder="Leave blank for 'VetCare123'"
                    />
                    <span className="users-form-hint">
                      User will be prompted to change password on first login
                    </span>
                  </div>
                )}
              </div>
              <div className="users-form-actions">
                <button type="button" onClick={resetForm} className="users-btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="users-btn-submit">
                  <i className="fas fa-save"></i>
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters & Search Card */}
        <div className="users-toolbar-card">
          <div className="users-role-tabs">
            {[
              { label: 'All Users', value: '', roleClass: 'all' },
              { label: 'Admin', value: 'admin', roleClass: 'admin' },
              { label: 'Veterinarian', value: 'veterinarian', roleClass: 'veterinarian' },
              { label: 'Receptionist', value: 'receptionist', roleClass: 'receptionist' },
            ].map(tab => {
              const count = tab.value === '' ? users.length : users.filter(u => u.role === tab.value).length;
              const isActive = filterRole === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setFilterRole(tab.value)}
                  className={`users-role-pill-btn ${isActive ? `active ${tab.roleClass}` : ''}`}
                >
                  {tab.label}
                  <span className="users-role-count-badge">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="users-controls-row">
            <div className="users-search-box">
              <i className="fas fa-search users-search-icon"></i>
              <input
                type="text"
                placeholder="Search staff by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="users-search-input"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="users-status-select"
            >
              <option value="">All Statuses</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Users Table Card */}
        {loading ? (
          <div className="users-table-card">
            <div className="users-loading-state">
              <div className="users-spinner"></div>
              <p>Loading staff accounts...</p>
            </div>
          </div>
        ) : (
          <div className="users-table-card">
            <div className="users-count-bar">
              <i className="fas fa-users" style={{ color: '#6366f1' }}></i>
              Showing <strong>{filteredUsers.length}</strong> of <strong>{users.length}</strong> staff users
            </div>
            
            <div className="users-table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th className="users-th">Name</th>
                    <th className="users-th">Email</th>
                    <th className="users-th">Phone</th>
                    <th className="users-th">Role</th>
                    <th className="users-th">Status</th>
                    <th className="users-th">Last Login</th>
                    <th className="users-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="7">
                        <div className="users-empty-state">
                          <i className="fas fa-user-slash users-empty-icon"></i>
                          <p style={{ margin: 0, fontWeight: 600 }}>No users found matching your filters</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => (
                      <tr key={user.user_id} className="users-tr">
                        <td className="users-td">
                          <div className="users-cell-user">
                            <div className="users-avatar">
                              {user.profile_image ? (
                                <img 
                                  src={`http://localhost:3000/uploads/${user.profile_image}`} 
                                  alt={user.first_name}
                                  className="users-avatar-img"
                                />
                              ) : (
                                <i className="fas fa-user"></i>
                              )}
                            </div>
                            <div>
                              <div className="users-user-name">
                                {user.first_name} {user.last_name}
                              </div>
                              {user.password_must_change && (
                                <div className="users-password-warning">
                                  <i className="fas fa-exclamation-triangle"></i>
                                  Must change password
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="users-td">{user.email}</td>
                        <td className="users-td">{user.phone || '-'}</td>
                        <td className="users-td">
                          <span className={`users-role-badge ${user.role}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="users-td">
                          <span className={`users-status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="users-td">{formatDate(user.last_login)}</td>
                        <td className="users-td">
                          <button
                            onClick={() => setViewingUser(user)}
                            className="users-btn-view"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* User Detail Modal */}
        {viewingUser && (
          <div className="users-modal-overlay" onClick={() => setViewingUser(null)}>
            <div className="users-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="users-modal-header">
                <h3 className="users-modal-title">User Profile & Access Details</h3>
                <button onClick={() => setViewingUser(null)} className="users-modal-close">
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="users-modal-body">
                {/* Profile Banner */}
                <div className="users-profile-banner">
                  <div className="users-profile-avatar-lg">
                    {viewingUser.profile_image ? (
                      <img 
                        src={`http://localhost:3000/uploads/${viewingUser.profile_image}`} 
                        alt={viewingUser.first_name}
                        className="users-profile-avatar-lg-img"
                      />
                    ) : (
                      <i className="fas fa-user" style={{ fontSize: '2.5rem', color: '#94a3b8' }}></i>
                    )}
                  </div>
                  <div className="users-profile-meta">
                    <h4 className="users-profile-name">
                      {viewingUser.first_name} {viewingUser.last_name}
                    </h4>
                    <div className="users-profile-badges">
                      <span className={`users-role-badge ${viewingUser.role}`}>
                        {viewingUser.role}
                      </span>
                      <span className={`users-status-badge ${viewingUser.is_active ? 'active' : 'inactive'}`}>
                        {viewingUser.is_active ? 'Active Account' : 'Inactive Account'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* User Details Grid */}
                <div className="users-details-grid">
                  <div className="users-detail-box">
                    <span className="users-detail-lbl">User ID</span>
                    <span className="users-detail-val">
                      {`USR-${String(viewingUser.user_id).padStart(4, '0')}`}
                    </span>
                  </div>
                  <div className="users-detail-box">
                    <span className="users-detail-lbl">Email Address</span>
                    <span className="users-detail-val">{viewingUser.email}</span>
                  </div>
                  <div className="users-detail-box">
                    <span className="users-detail-lbl">Phone Number</span>
                    <span className="users-detail-val">{viewingUser.phone || 'Not provided'}</span>
                  </div>
                  <div className="users-detail-box">
                    <span className="users-detail-lbl">Gender</span>
                    <span className="users-detail-val">
                      {viewingUser.gender ? viewingUser.gender.charAt(0).toUpperCase() + viewingUser.gender.slice(1) : 'Not specified'}
                    </span>
                  </div>
                  {viewingUser.role === 'veterinarian' && (
                    <>
                      <div className="users-detail-box">
                        <span className="users-detail-lbl">Specialization</span>
                        <span className="users-detail-val">{viewingUser.specialization || 'Not specified'}</span>
                      </div>
                      <div className="users-detail-box">
                        <span className="users-detail-lbl">License Number</span>
                        <span className="users-detail-val">{viewingUser.license_number || 'Not provided'}</span>
                      </div>
                    </>
                  )}
                  <div className="users-detail-box">
                    <span className="users-detail-lbl">Last Login</span>
                    <span className="users-detail-val">{formatDate(viewingUser.last_login)}</span>
                  </div>
                  <div className="users-detail-box">
                    <span className="users-detail-lbl">Account Created</span>
                    <span className="users-detail-val">{formatDate(viewingUser.created_at)}</span>
                  </div>
                  {viewingUser.password_must_change && (
                    <div className="users-detail-box" style={{ gridColumn: '1 / -1', background: 'rgba(254, 243, 199, 0.5)', borderColor: '#fde68a' }}>
                      <span className="users-detail-lbl" style={{ color: '#b45309' }}>Password Status</span>
                      <span className="users-password-warning" style={{ fontSize: '0.85rem' }}>
                        <i className="fas fa-exclamation-triangle"></i>
                        Must change password on next login
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="users-modal-actions">
                <button
                  onClick={() => {
                    handleEdit(viewingUser);
                    setViewingUser(null);
                  }}
                  className="users-btn-modal-edit"
                >
                  <i className="fas fa-edit"></i>
                  Edit User
                </button>
                {viewingUser.role !== 'admin' && (
                  <button
                    onClick={() => setShowResetModal(true)}
                    className="users-btn-modal-reset"
                  >
                    <i className="fas fa-key"></i>
                    Reset Password
                  </button>
                )}
                <button
                  onClick={() => {
                    handleToggleActive(viewingUser);
                    setViewingUser(null);
                  }}
                  className={`users-btn-modal-toggle ${viewingUser.is_active ? 'deactivate' : 'activate'}`}
                  disabled={viewingUser.user_id === currentUser?.user_id}
                >
                  <i className={`fas fa-${viewingUser.is_active ? 'ban' : 'check'}`}></i>
                  {viewingUser.is_active ? 'Deactivate User' : 'Reactivate User'}
                </button>
              </div>

              {/* Reset Password Sub-modal */}
              {showResetModal && (
                <div className="users-reset-modal-overlay">
                  <div className="users-reset-modal-box">
                    <h4 className="users-reset-modal-title">
                      <i className="fas fa-key" style={{ color: '#f59e0b' }}></i>
                      Reset Password
                    </h4>
                    <p className="users-reset-modal-desc">
                      Reset password for <strong>{viewingUser.first_name} {viewingUser.last_name}</strong>. They will be required to change it on next login.
                    </p>
                    <div className="users-form-group">
                      <label className="users-form-label">New Password</label>
                      <input
                        type="text"
                        value={resetPasswordValue}
                        onChange={(e) => setResetPasswordValue(e.target.value)}
                        className="users-input"
                        placeholder="Leave blank to use default 'VetCare123'"
                      />
                      <span className="users-form-hint">Minimum 6 characters</span>
                    </div>
                    <div className="users-reset-modal-actions">
                      <button
                        onClick={() => { setShowResetModal(false); setResetPasswordValue(''); }}
                        className="users-btn-reset-cancel"
                        disabled={resetting}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleResetPassword}
                        className="users-btn-reset-confirm"
                        disabled={resetting || (resetPasswordValue && resetPasswordValue.length < 6)}
                      >
                        {resetting ? 'Resetting...' : 'Confirm Reset'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Deactivate User Modal */}
        {deactivateModal.open && (
          <div className="users-modal-overlay" onClick={() => setDeactivateModal({ open: false, userId: null })}>
            <div className="users-deactivate-modal-box" onClick={e => e.stopPropagation()}>
              <div className="users-deactivate-header">
                <h3 className="users-deactivate-title">
                  <i className="fas fa-user-slash" style={{ color: '#d97706' }}></i>
                  Deactivate User
                </h3>
                <button onClick={() => setDeactivateModal({ open: false, userId: null })} className="users-modal-close">
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="users-deactivate-body">
                <p className="users-deactivate-text">
                  Are you sure you want to deactivate this user? They will no longer be able to log in.
                </p>
                <div className="users-deactivate-actions">
                  <button
                    onClick={() => setDeactivateModal({ open: false, userId: null })}
                    className="users-btn-deactivate-cancel"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeactivate}
                    className="users-btn-deactivate-confirm"
                  >
                    <i className="fas fa-user-slash" style={{ marginRight: '0.4rem' }}></i>
                    Deactivate
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Users;
