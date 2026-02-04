import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Welcome.css';

const Welcome = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message || 'Login failed. Please check your credentials.');
    }

    setLoading(false);
  };

  const handleLoginClick = () => {
    setShowLoginForm(true);
  };

  if (showLoginForm) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.logoIcon}>
              <i className="fas fa-paw" style={styles.iconText}></i>
            </div>
            <div>
              <h2 style={styles.logoTitle}>VetCare Pro</h2>
              <p style={styles.logoSubtitle}>Pro Pet Animal Hospital - Mawathagama, Kurunegala</p>
            </div>
          </div>
          <button 
            onClick={() => setShowLoginForm(false)} 
            style={styles.backButton}
            className="welcome-back-button"
            type="button"
          >
            ← Back to Welcome
          </button>
        </header>

        <main style={styles.mainLogin}>
          <div style={styles.loginCard}>
            <div style={styles.loginHeader}>
              <div style={styles.badge}>
                <i className="fas fa-lock" style={styles.badgeIcon}></i>
                <span style={styles.badgeText}>Authorized Staff Only</span>
              </div>
              <h1 style={styles.loginTitle}>Welcome Back</h1>
              <p style={styles.loginSubtitle}>
                Please enter your details to sign in.
              </p>
            </div>

            {error && (
              <div style={styles.errorBox}>
                <i className="fas fa-exclamation-triangle" style={styles.errorIcon}></i>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Email</label>
                <div style={styles.inputWrapper}>
                  <i className="fas fa-envelope" style={styles.inputIcon}></i>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@propet.lk"
                    required
                    style={styles.input}
                    className="welcome-input"
                    disabled={loading}
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Password</label>
                <div style={styles.inputWrapper}>
                  <i className="fas fa-lock" style={styles.inputIcon}></i>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    style={styles.input}
                    className="welcome-input"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.togglePasswordButton}
                    className="welcome-toggle-password"
                    disabled={loading}
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              <div style={styles.rememberForgotRow}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={styles.checkbox}
                  />
                  <span style={styles.checkboxText}>Remember me</span>
                </label>
                <a href="#" style={styles.forgotLink} className="welcome-forgot-link">Forgot password?</a>
              </div>

              <button 
                type="submit" 
                style={{
                  ...styles.submitButton,
                  ...(loading ? styles.submitButtonDisabled : {})
                }}
                className="welcome-login-button"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Log In'}
              </button>
            </form>

            <div style={styles.loginFooter}>
              <p style={styles.supportText}>
                Need help accessing your account?
              </p>
              <a href="#" style={styles.supportLink}>
                <i className="fas fa-headset" style={styles.supportIconSmall}></i>
                Contact Support
              </a>
              <p style={styles.footerText}>
                © 2026 Pro Pet Animal Hospital - Mawathagama, Kurunegala. All rights reserved.
              </p>
            </div>
          </div>
        </main>

        <footer style={styles.footer}>
          <div style={styles.footerContent}>
            <p style={styles.footerCopyright}>
              © 2026 VetCare Systems. v1.0
            </p>
          </div>
        </footer>
      </div>
    );
  }

  // Welcome Screen
  return (
    <div style={styles.container} className="welcome-container">
      <header style={styles.header} className="welcome-header">
        <div style={styles.headerLeft}>
          <div style={styles.logoIcon}>
            <i className="fas fa-paw" style={styles.iconText}></i>
          </div>
          <div>
            <h2 style={styles.logoTitle}>VetCare Pro</h2>
            <p style={styles.logoSubtitle}>Pro Pet Animal Hospital</p>
          </div>
        </div>
        <div style={styles.headerRight}>
          <a style={styles.supportLink} className="welcome-support-link" href="#">
            <span>IT Support</span>
          </a>
        </div>
      </header>

      <main style={styles.main} className="welcome-main">
        <div style={styles.contentWrapper} className="welcome-content-wrapper">
          <div style={styles.leftPanel} className="welcome-left-panel">
            <div style={styles.leftContent}>
              <div style={styles.badge}>
                <i className="fas fa-check" style={styles.badgeIcon}></i>
                <span style={styles.badgeText}>Authorized Staff Only</span>
              </div>

              <div style={styles.heroSection}>
                <h1 style={styles.heroTitle} className="welcome-hero-title">
                  Welcome to <br/>
                  <span style={styles.heroHighlight}>VetCare Pro</span>
                </h1>
                <p style={styles.heroDescription} className="welcome-hero-description">
                  The comprehensive management system for <span style={styles.hospitalName}>Pro Pet Animal Hospital</span> - Mawathagama, Kurunegala.
                </p>
                <p style={styles.heroSubtext} className="welcome-hero-subtext">
                  Securely manage patient records, pharmacy inventory, and appointments in one place.
                </p>
              </div>

              <div style={styles.actionSection}>
                <button 
                  style={styles.loginButton}
                  className="welcome-login-button"
                  onClick={handleLoginClick}
                  type="button"
                >
                  Log In to System
                </button>
                <div style={styles.forgotPassword}>
                  <i className="fas fa-lock" style={styles.lockIcon}></i>
                  <a href="#" style={styles.forgotLink} className="welcome-forgot-link">Forgot your password?</a>
                </div>
              </div>

              <div style={styles.disclaimer}>
                <p style={styles.disclaimerText}>
                  Unauthorized access is prohibited. All activity on this system is monitored for security purposes.
                </p>
              </div>
            </div>
          </div>

          <div style={styles.rightPanel} className="welcome-right-panel">
            <div 
              style={styles.imageContainer}
              className="welcome-image-container"
            >
              <div style={styles.imageOverlay}></div>
              <div style={styles.imageCard}>
                <div style={styles.imageCardIcon}>
                  <i className="fas fa-heart" style={styles.heartIcon}></i>
                </div>
                <div>
                  <p style={styles.imageCardTitle}>Compassionate Care</p>
                  <p style={styles.imageCardSubtitle}>Excellence in Veterinary Medicine</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer style={styles.footer} className="welcome-footer">
        <div style={styles.footerContent} className="welcome-footer-content">
          <p style={styles.footerCopyright}>
            © 2026 VetCare Systems. v1.0
          </p>
        </div>
      </footer>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f6f7f8',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid #e2e8f0',
    padding: '1rem 1.5rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  logoIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '0.5rem',
    backgroundColor: '#137fec',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(19, 127, 236, 0.3)',
  },
  iconText: {
    fontSize: '1.5rem',
  },
  logoTitle: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
    letterSpacing: '-0.01em',
  },
  logoSubtitle: {
    fontSize: '0.75rem',
    fontWeight: '500',
    color: '#64748b',
    margin: 0,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  supportLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#64748b',
    fontSize: '0.875rem',
    fontWeight: '600',
    textDecoration: 'none',
    transition: 'color 0.2s',
    cursor: 'pointer',
  },
  supportIcon: {
    fontSize: '1.25rem',
  },
  backButton: {
    padding: '0.5rem 1.25rem',
    backgroundColor: '#f1f5f9',
    border: 'none',
    borderRadius: '0.5rem',
    color: '#475569',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  main: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem 1rem',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: '1400px',
    backgroundColor: '#ffffff',
    borderRadius: '1.5rem',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    overflow: 'hidden',
    display: 'flex',
    minHeight: '500px',
    maxHeight: 'calc(100vh - 180px)',
    border: '1px solid #f1f5f9',
  },
  leftPanel: {
    flex: '0 0 42%',
    padding: '2.5rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    position: 'relative',
    zIndex: 10,
  },
  leftContent: {
    maxWidth: '480px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    borderRadius: '9999px',
    backgroundColor: '#eff6ff',
    border: '1px solid #dbeafe',
    width: 'fit-content',
    alignSelf: 'flex-start',
  },
  badgeIcon: {
    fontSize: '0.875rem',
    color: '#137fec',
  },
  badgeText: {
    color: '#137fec',
    fontSize: '0.75rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  heroSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  heroTitle: {
    fontSize: '2.5rem',
    fontWeight: '900',
    lineHeight: '1.1',
    letterSpacing: '-0.02em',
    color: '#1e293b',
    margin: 0,
  },
  heroHighlight: {
    color: '#137fec',
  },
  heroDescription: {
    fontSize: '1rem',
    lineHeight: '1.5',
    fontWeight: '500',
    color: '#475569',
  },
  hospitalName: {
    color: '#1e293b',
    fontWeight: '700',
  },
  heroSubtext: {
    fontSize: '0.9rem',
    lineHeight: '1.5',
    color: '#64748b',
  },
  actionSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    paddingTop: '0.75rem',
  },
  loginButton: {
    width: '100%',
    padding: '0.875rem 2rem',
    backgroundColor: '#137fec',
    color: '#ffffff',
    fontSize: '1.05rem',
    fontWeight: '700',
    letterSpacing: '0.01em',
    border: 'none',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    boxShadow: '0 10px 15px -3px rgba(19, 127, 236, 0.25)',
    transition: 'all 0.2s',
  },
  forgotPassword: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    paddingTop: '0.25rem',
  },
  lockIcon: {
    fontSize: '0.875rem',
    color: '#94a3b8',
  },
  forgotLink: {
    fontSize: '0.875rem',
    color: '#64748b',
    textDecoration: 'none',
    fontWeight: '500',
    transition: 'color 0.2s',
  },
  disclaimer: {
    borderTop: '1px solid #f1f5f9',
    paddingTop: '1.5rem',
    marginTop: '1rem',
  },
  disclaimerText: {
    fontSize: '0.75rem',
    lineHeight: '1.5',
    color: '#94a3b8',
    margin: 0,
  },
  rightPanel: {
    flex: '0 0 58%',
    position: 'relative',
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#137fec',
    background: 'linear-gradient(135deg, #137fec 0%, #0c6fd9 100%)',
    transition: 'transform 2s ease-out',
  },
  imageOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to right, rgba(0, 0, 0, 0.05), transparent)',
  },
  imageCard: {
    position: 'absolute',
    bottom: '2rem',
    left: '2rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    borderRadius: '0.75rem',
    backdropFilter: 'blur(16px)',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    zIndex: 10,
  },
  imageCardIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '9999px',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
  },
  heartIcon: {
    fontSize: '1.25rem',
  },
  imageCardTitle: {
    fontSize: '0.875rem',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0,
  },
  imageCardSubtitle: {
    fontSize: '0.75rem',
    color: 'rgba(255, 255, 255, 0.8)',
    margin: 0,
  },
  footer: {
    borderTop: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    padding: '1.5rem 0',
    marginTop: 'auto',
  },
  footerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    textAlign: 'center',
    padding: '0 1.5rem',
  },
  footerCopyright: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#64748b',
    margin: 0,
  },
  securityBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#94a3b8',
    fontSize: '0.75rem',
    padding: '0.25rem 0.75rem',
    borderRadius: '0.25rem',
    backgroundColor: '#f8fafc',
  },
  securityIcon: {
    fontSize: '1rem',
  },

  // Login Form Specific Styles
  mainLogin: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem 1rem',
    maxHeight: 'calc(100vh - 140px)',
    overflow: 'auto',
  },
  loginCard: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#ffffff',
    borderRadius: '1.25rem',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    padding: '1.75rem 1.75rem',
    border: '1px solid #f1f5f9',
  },
  loginHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '1.25rem',
  },
  loginTitle: {
    fontSize: '1.625rem',
    fontWeight: '900',
    color: '#1e293b',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  loginSubtitle: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: 0,
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '0.5rem',
    color: '#991b1b',
    fontSize: '0.8125rem',
    marginBottom: '1rem',
  },
  errorIcon: {
    fontSize: '1.25rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.875rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  label: {
    fontSize: '0.8125rem',
    fontWeight: '600',
    color: '#334155',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#f6f7f8',
    border: '1px solid #e2e8f0',
    borderRadius: '0.5rem',
    overflow: 'hidden',
    transition: 'all 0.2s',
    height: '2.75rem',
  },
  inputIcon: {
    paddingLeft: '0.875rem',
    paddingRight: '0.5rem',
    fontSize: '1.125rem',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    padding: '0 1rem',
    fontSize: '0.875rem',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#1e293b',
    outline: 'none',
    height: '100%',
  },
  togglePasswordButton: {
    paddingRight: '0.875rem',
    paddingLeft: '0.5rem',
    fontSize: '1.125rem',
    color: '#64748b',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s',
    outline: 'none',
  },
  rememberForgotRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '0.125rem',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    cursor: 'pointer',
    userSelect: 'none',
  },
  checkbox: {
    width: '0.875rem',
    height: '0.875rem',
    cursor: 'pointer',
    accentColor: '#137fec',
  },
  checkboxText: {
    fontSize: '0.8125rem',
    color: '#64748b',
  },
  submitButton: {
    width: '100%',
    padding: '0.625rem 2rem',
    backgroundColor: '#137fec',
    color: '#ffffff',
    fontSize: '0.875rem',
    fontWeight: '700',
    letterSpacing: '0.01em',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(19, 127, 236, 0.25)',
    transition: 'all 0.2s',
    marginTop: '0.375rem',
  },
  submitButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  loginFooter: {
    borderTop: '1px solid #f1f5f9',
    paddingTop: '1rem',
    marginTop: '1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.625rem',
    textAlign: 'center',
  },
  supportText: {
    fontSize: '0.75rem',
    color: '#64748b',
    margin: 0,
  },
  supportIconSmall: {
    fontSize: '0.9375rem',
  },
  footerText: {
    fontSize: '0.625rem',
    lineHeight: '1.4',
    color: '#94a3b8',
    margin: 0,
    marginTop: '0.5rem',
  },
};

export default Welcome;
