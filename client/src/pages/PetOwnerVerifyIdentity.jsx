import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import '../styles/PetOwnerAuth.css';

const PetOwnerVerifyIdentity = () => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const errorRef = useRef(null);

  const { verifyIdentity } = useCustomerAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await verifyIdentity(email.trim(), phone.trim());

    if (result.success) {
      navigate('/pet-owner/set-password', {
        state: { setupToken: result.setupToken, firstName: result.firstName }
      });
    } else {
      setError(result.message || 'We could not verify your identity. Please try again.');
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
          onClick={() => navigate('/pet-owner/login')}
        >
          &larr; Back to Login
        </button>
      </header>

      <main className="po-auth-main">
        <div className="po-auth-card">
          <div className="po-auth-card-header">
            <div className="po-auth-badge">
              <i className="fas fa-user-check"></i>
              <span>Account Setup</span>
            </div>
            <h1 className="po-auth-title">Verify Your Identity</h1>
            <p className="po-auth-subtitle">
              Enter the email and phone number the clinic has on file for you.
              We&rsquo;ll confirm they match before letting you set a password.
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
              <label className="po-auth-label">Email Address</label>
              <div className="po-auth-input-wrapper">
                <i className="fas fa-envelope po-auth-input-icon"></i>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="po-auth-input"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="po-auth-input-group">
              <label className="po-auth-label">Phone Number</label>
              <div className="po-auth-input-wrapper">
                <i className="fas fa-phone po-auth-input-icon"></i>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+947XXXXXXXX"
                  required
                  className="po-auth-input"
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" className="po-auth-submit-button" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>
          </form>

          <div className="po-auth-footer">
            <p className="po-auth-support-text">
              Already set up your password?
            </p>
            <button
              type="button"
              className="po-auth-support-link po-auth-link-button"
              onClick={() => navigate('/pet-owner/login')}
            >
              Back to Login
            </button>
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

export default PetOwnerVerifyIdentity;
