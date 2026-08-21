import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import '../styles/PetOwnerAuth.css';

const PetOwnerChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { changePassword, customer, logout } = useCustomerAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const result = await changePassword(currentPassword, newPassword);
    setLoading(false);

    if (result.success) {
      setSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setError(result.message || 'Failed to change password. Please try again.');
    }
  };

  return (
    <div className="po-auth-container">
      <header className="po-auth-header">
        <div className="po-auth-header-left">
          <div className="po-auth-logo-icon">
            <i className="fas fa-paw"></i>
          </div>
          <div>
            <h2 className="po-auth-logo-title">VetCare Pro</h2>
            <p className="po-auth-logo-subtitle">Pet Owner Portal</p>
          </div>
        </div>
        <button type="button" className="po-auth-back-button" onClick={() => navigate('/pet-owner/profile')}>
          &larr; Back to Profile
        </button>
      </header>

      <main className="po-auth-main">
        <div className="po-auth-card">
          <div className="po-auth-card-header">
            <div className="po-auth-badge">
              <i className="fas fa-lock"></i>
              <span>Account Security</span>
            </div>
            <h1 className="po-auth-title">Change Password</h1>
            <p className="po-auth-subtitle">
              {customer ? `Hi ${customer.first_name}, ` : ''}
              enter your current password and choose a new one.
            </p>
          </div>

          {error && (
            <div className="po-auth-error-box">
              <i className="fas fa-exclamation-triangle"></i>
              {error}
            </div>
          )}

          {success && (
            <div className="po-auth-success-box">
              <i className="fas fa-check-circle"></i>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="po-auth-form">
            <div className="po-auth-input-group">
              <label className="po-auth-label">Current Password</label>
              <div className="po-auth-input-wrapper">
                <i className="fas fa-lock po-auth-input-icon"></i>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  required
                  className="po-auth-input"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="po-auth-input-group">
              <label className="po-auth-label">New Password</label>
              <div className="po-auth-input-wrapper">
                <i className="fas fa-lock po-auth-input-icon"></i>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="po-auth-input"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="po-auth-toggle-password"
                  disabled={loading}
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            <div className="po-auth-input-group">
              <label className="po-auth-label">Confirm New Password</label>
              <div className="po-auth-input-wrapper">
                <i className="fas fa-lock po-auth-input-icon"></i>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  required
                  className="po-auth-input"
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" className="po-auth-submit-button" disabled={loading}>
              {loading ? 'Saving...' : 'Change Password'}
            </button>
          </form>

          <div className="po-auth-footer">
            <button type="button" className="po-auth-support-link po-auth-link-button" onClick={logout}>
              Sign Out
            </button>
          </div>
        </div>
      </main>

      <footer className="po-auth-footer-bar">
        <p>&copy; 2026 VetCare Systems</p>
      </footer>
    </div>
  );
};

export default PetOwnerChangePassword;
