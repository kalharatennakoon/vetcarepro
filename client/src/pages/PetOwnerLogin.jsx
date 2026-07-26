import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import '../styles/PetOwnerAuth.css';

const PetOwnerLogin = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const errorRef = useRef(null);

  const { login } = useCustomerAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(identifier, password);

    if (result.success) {
      if (result.customer.password_must_change) {
        navigate('/pet-owner/change-password');
      } else {
        navigate('/pet-owner/profile');
      }
    } else {
      setError(result.message || 'Login failed. Please check your details.');
    }

    setLoading(false);
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
        <button
          type="button"
          className="po-auth-back-button"
          onClick={() => navigate('/')}
        >
          &larr; Back to Welcome
        </button>
      </header>

      <main className="po-auth-main">
        <div className="po-auth-card">
          <div className="po-auth-card-header">
            <div className="po-auth-badge">
              <i className="fas fa-heart"></i>
              <span>Pet Owner Sign In</span>
            </div>
            <h1 className="po-auth-title">Welcome Back</h1>
            <p className="po-auth-subtitle">
              Sign in with the email or phone number on file with the clinic.
            </p>
          </div>

          {error && (
            <div ref={errorRef} className="po-auth-error-box">
              <i className="fas fa-exclamation-triangle"></i>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="po-auth-form">
            <div className="po-auth-input-group">
              <label className="po-auth-label">Email or Phone Number</label>
              <div className="po-auth-input-wrapper">
                <i className="fas fa-user po-auth-input-icon"></i>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="name@example.com or +947XXXXXXXX"
                  required
                  className="po-auth-input"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="po-auth-input-group">
              <label className="po-auth-label">Password</label>
              <div className="po-auth-input-wrapper">
                <i className="fas fa-lock po-auth-input-icon"></i>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
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

            <button type="submit" className="po-auth-submit-button" disabled={loading}>
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <div className="po-auth-footer">
            <p className="po-auth-support-text">
              First time here? Use the default password given to you by the clinic
              &mdash; you&rsquo;ll be asked to set your own right after logging in.
            </p>
            <a href="mailto:support@vetcarepro.lk" className="po-auth-support-link">
              <i className="fas fa-headset"></i> Contact Support
            </a>
          </div>
        </div>
      </main>

      <footer className="po-auth-footer-bar">
        <p>&copy; 2026 VetCare Systems</p>
      </footer>
    </div>
  );
};

export default PetOwnerLogin;
