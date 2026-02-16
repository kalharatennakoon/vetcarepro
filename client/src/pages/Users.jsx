import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { getUsers, createUser, updateUser, deleteUser } from '../services/userService';

const Users = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingUser, setViewingUser] = useState(null);
  
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

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to deactivate this user?')) {
      return;
    }

    try {
      await deleteUser(userId);
      setSuccess('User deactivated successfully');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deactivate user');
      console.error(err);
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

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return '#dc2626';
      case 'veterinarian': return '#3b82f6';
      case 'receptionist': return '#10b981';
      default: return '#6b7280';
    }
  };

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

  return (
    <Layout>
      {/* Page Header */}
      <div style={styles.pageHeader}>
        <div>
          <h2 style={styles.title}>User Management</h2>
          <p style={styles.subtitle}>Manage staff users and permissions</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          style={styles.addButton}
        >
          <i className={`fas fa-${showForm ? 'times' : 'plus'}`} style={{ marginRight: '0.5rem' }}></i>
          {showForm ? 'Cancel' : 'Add User'}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div style={styles.errorBox}>
          <i className="fas fa-exclamation-circle" style={{ marginRight: '0.5rem' }}></i>
          {error}
        </div>
      )}
      {success && (
        <div style={styles.successBox}>
          <i className="fas fa-check-circle" style={{ marginRight: '0.5rem' }}></i>
          {success}
        </div>
      )}

      {/* User Form */}
      {showForm && (
        <div style={styles.formContainer}>
          <h3 style={styles.formTitle}>
            {editingUser ? 'Edit User' : 'Create New User'}
          </h3>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>First Name *</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Last Name *</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  style={styles.input}
                  required
                  disabled={editingUser !== null}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  style={styles.select}
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Role *</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  style={styles.select}
                  required
                >
                  <option value="receptionist">Receptionist</option>
                  <option value="veterinarian">Veterinarian</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {formData.role === 'veterinarian' && (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Specialization</label>
                    <input
                      type="text"
                      name="specialization"
                      value={formData.specialization}
                      onChange={handleInputChange}
                      style={styles.input}
                      placeholder="e.g., Small Animals, Surgery"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>License Number</label>
                    <input
                      type="text"
                      name="license_number"
                      value={formData.license_number}
                      onChange={handleInputChange}
                      style={styles.input}
                    />
                  </div>
                </>
              )}
              {!editingUser && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Default Password</label>
                  <input
                    type="text"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    style={styles.input}
                    placeholder="Leave blank for 'VetCare123'"
                  />
                  <small style={styles.hint}>
                    User will be prompted to change password on first login
                  </small>
                </div>
              )}
            </div>
            <div style={styles.formActions}>
              <button type="submit" style={styles.submitButton}>
                <i className="fas fa-save" style={{ marginRight: '0.5rem' }}></i>
                {editingUser ? 'Update User' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div style={styles.toolbar}>
        <div style={styles.searchContainer}>
          <i className="fas fa-search" style={styles.searchIcon}></i>
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="veterinarian">Veterinarian</option>
          <option value="receptionist">Receptionist</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Users List */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading users...</p>
        </div>
      ) : (
        <div style={styles.usersContainer}>
          <div style={styles.countInfo}>
            <i className="fas fa-users" style={{ marginRight: '0.5rem' }}></i>
            Total Users: <strong>{filteredUsers.length}</strong>
          </div>
          
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Last Login</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.user_id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.userCell}>
                        <div style={styles.avatar}>
                          {user.profile_image ? (
                            <img 
                              src={`http://localhost:3000/uploads/${user.profile_image}`} 
                              alt={user.first_name}
                              style={styles.avatarImage}
                            />
                          ) : (
                            <i className="fas fa-user"></i>
                          )}
                        </div>
                        <div>
                          <div style={styles.userName}>
                            {user.first_name} {user.last_name}
                          </div>
                          {user.password_must_change && (
                            <div style={styles.passwordWarning}>
                              <i className="fas fa-exclamation-triangle" style={{ marginRight: '0.25rem' }}></i>
                              Must change password
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>{user.email}</td>
                    <td style={styles.td}>{user.phone || '-'}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.roleBadge,
                        backgroundColor: getRoleBadgeColor(user.role)
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: user.is_active ? '#10b981' : '#6b7280'
                      }}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={styles.td}>{formatDate(user.last_login)}</td>
                    <td style={styles.td}>
                      <button
                        onClick={() => setViewingUser(user)}
                        style={styles.viewButton}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {viewingUser && (
        <div style={styles.modalOverlay} onClick={() => setViewingUser(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>User Details</h3>
              <button onClick={() => setViewingUser(null)} style={styles.closeButton}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div style={styles.modalBody}>
              {/* User Profile Section */}
              <div style={styles.profileSection}>
                <div style={styles.profileImageLarge}>
                  {viewingUser.profile_image ? (
                    <img 
                      src={`http://localhost:3000/uploads/${viewingUser.profile_image}`} 
                      alt={viewingUser.first_name}
                      style={styles.profileImageLargeImg}
                    />
                  ) : (
                    <i className="fas fa-user" style={{ fontSize: '3rem', color: '#9ca3af' }}></i>
                  )}
                </div>
                <div style={styles.profileInfo}>
                  <h4 style={styles.profileName}>
                    {viewingUser.first_name} {viewingUser.last_name}
                  </h4>
                  <span style={{
                    ...styles.roleBadge,
                    backgroundColor: getRoleBadgeColor(viewingUser.role)
                  }}>
                    {viewingUser.role}
                  </span>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: viewingUser.is_active ? '#10b981' : '#6b7280',
                    marginLeft: '0.5rem'
                  }}>
                    {viewingUser.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* User Details Grid */}
              <div style={styles.detailsGrid}>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Email</span>
                  <span style={styles.detailValue}>{viewingUser.email}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Phone</span>
                  <span style={styles.detailValue}>{viewingUser.phone || 'Not provided'}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Gender</span>
                  <span style={styles.detailValue}>
                    {viewingUser.gender ? viewingUser.gender.charAt(0).toUpperCase() + viewingUser.gender.slice(1) : 'Not specified'}
                  </span>
                </div>
                {viewingUser.role === 'veterinarian' && (
                  <>
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Specialization</span>
                      <span style={styles.detailValue}>{viewingUser.specialization || 'Not specified'}</span>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>License Number</span>
                      <span style={styles.detailValue}>{viewingUser.license_number || 'Not provided'}</span>
                    </div>
                  </>
                )}
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Last Login</span>
                  <span style={styles.detailValue}>{formatDate(viewingUser.last_login)}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Account Created</span>
                  <span style={styles.detailValue}>{formatDate(viewingUser.created_at)}</span>
                </div>
                {viewingUser.password_must_change && (
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Password Status</span>
                    <span style={styles.passwordWarning}>
                      <i className="fas fa-exclamation-triangle" style={{ marginRight: '0.5rem' }}></i>
                      Must change password on next login
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={styles.modalActions}>
              <button
                onClick={() => {
                  handleEdit(viewingUser);
                  setViewingUser(null);
                }}
                style={styles.modalEditButton}
              >
                <i className="fas fa-edit" style={{ marginRight: '0.5rem' }}></i>
                Edit User
              </button>
              <button
                onClick={() => {
                  handleToggleActive(viewingUser);
                  setViewingUser(null);
                }}
                style={{
                  ...styles.modalToggleButton,
                  backgroundColor: viewingUser.is_active ? '#f59e0b' : '#10b981'
                }}
                disabled={viewingUser.user_id === currentUser?.user_id}
              >
                <i 
                  className={`fas fa-${viewingUser.is_active ? 'ban' : 'check'}`} 
                  style={{ marginRight: '0.5rem' }}
                ></i>
                {viewingUser.is_active ? 'Deactivate User' : 'Reactivate User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

const styles = {
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 0.5rem 0',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#6b7280',
    margin: 0,
  },
  addButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3b82f6',
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
  errorBox: {
    padding: '1rem',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    border: '1px solid #fecaca',
    display: 'flex',
    alignItems: 'center',
  },
  successBox: {
    padding: '1rem',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    border: '1px solid #a7f3d0',
    display: 'flex',
    alignItems: 'center',
  },
  formContainer: {
    backgroundColor: '#ffffff',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    marginBottom: '2rem',
  },
  formTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '1.5rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
  },
  select: {
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    backgroundColor: 'white',
  },
  hint: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  formActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
  },
  submitButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  cancelButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  toolbar: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  searchContainer: {
    position: 'relative',
    flex: 1,
  },
  searchIcon: {
    position: 'absolute',
    left: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#9ca3af',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '0.5rem 0.75rem 0.5rem 2.5rem',
    fontSize: '0.875rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
  },
  filterSelect: {
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    backgroundColor: 'white',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
  },
  usersContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  countInfo: {
    padding: '1rem 1.5rem',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '0.875rem',
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '1rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },
  tr: {
    borderBottom: '1px solid #e5e7eb',
  },
  td: {
    padding: '1rem',
    fontSize: '0.875rem',
    color: '#374151',
  },
  userCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b7280',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  userName: {
    fontWeight: '600',
    color: '#111827',
  },
  passwordWarning: {
    fontSize: '0.75rem',
    color: '#f59e0b',
    display: 'flex',
    alignItems: 'center',
    marginTop: '0.25rem',
  },
  roleBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'white',
    textTransform: 'capitalize',
    display: 'inline-block',
  },
  statusBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'white',
    display: 'inline-block',
  },
  viewButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    whiteSpace: 'nowrap',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    maxWidth: '800px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem',
    borderBottom: '1px solid #e5e7eb',
  },
  modalTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
  },
  closeButton: {
    padding: '0.5rem',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    borderRadius: '6px',
    fontSize: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  },
  modalBody: {
    padding: '1.5rem',
  },
  profileSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    marginBottom: '2rem',
    paddingBottom: '2rem',
    borderBottom: '1px solid #e5e7eb',
  },
  profileImageLarge: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    backgroundColor: '#e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b7280',
    overflow: 'hidden',
    flexShrink: 0,
  },
  profileImageLargeImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 0.75rem 0',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1.5rem',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  detailLabel: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  detailValue: {
    fontSize: '0.875rem',
    color: '#111827',
    fontWeight: '500',
  },
  modalActions: {
    display: 'flex',
    gap: '1rem',
    padding: '1.5rem',
    borderTop: '1px solid #e5e7eb',
    justifyContent: 'flex-end',
  },
  modalEditButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'background-color 0.2s',
  },
  modalToggleButton: {
    padding: '0.75rem 1.5rem',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'background-color 0.2s',
  },
};

export default Users;
