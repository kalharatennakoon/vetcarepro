import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import '../styles/PetOwnerAuth.css';

const PetOwnerSetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { setPassword } = useCustomerAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { setupToken, firstName } = location.state || {};

  // Can't set a password without first verifying identity
  if (!setupToken) {
    return <Navigate to="/pet-owner/verify-identity" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const result = await setPassword(setupToken, newPassword);
    setLoading(false);

    if (result.success) {
      navigate('/pet-owner/profile');
    } else {
      setError(result.message || 'Failed to set password. Please try again.');
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
      </header>

      <main className="po-auth-main">
        <div className="po-auth-card">
          <div className="po-auth-card-header">
            <div className="po-auth-badge">
              <i className="fas fa-lock"></i>
              <span>Account Setup</span>
            </div>
            <h1 className="po-auth-title">Set Your Password</h1>
            <p className="po-auth-subtitle">
              {firstName ? `Hi ${firstName}, ` : ''}
              your identity is verified. Choose a password to finish setting up
              your account.
            </p>
          </div>

          {error && (
            <div className="po-auth-error-box">
              <i className="fas fa-exclamation-triangle"></i>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="po-auth-form">
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
              {loading ? 'Saving...' : 'Set Password & Continue'}
            </button>
          </form>
        </div>
      </main>

      <footer className="po-auth-footer-bar">
        <p>&copy; 2026 VetCare Systems</p>
      </footer>
    </div>
  );
};

export default PetOwnerSetPassword;
