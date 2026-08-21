import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import '../styles/Welcome.css';

/**
 * Staff sign-in, on its own URL (/staff/login) rather than a public
 * "Log In to System" form on the pet-owner/guest landing page - keeps the
 * clinic-facing entry point off the customer-facing homepage, matching how
 * most clinic/SaaS sites separate staff/admin access from the public site.
 */
const StaffLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const errorRef = useRef(null);

  const { login } = useAuth();
  const { showSuccess } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      showSuccess(`Welcome back, ${result.user.first_name}!`);
      navigate('/dashboard');
    } else {
      setError(result.message || 'Login failed. Please check your credentials.');
    }

    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logoIcon}>
            <i className="fas fa-paw" style={styles.iconText}></i>
          </div>
          <div>
            <h2 style={styles.logoTitle}>VetCare Pro</h2>
            <p style={styles.logoSubtitle}>Pro Pet Animal Hospital</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/')}
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
            <div ref={errorRef} style={styles.errorBox}>
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
                  type={showPassword ? 'text' : 'password'}
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
            <a href="mailto:support@vetcarepro.lk" style={styles.supportLink}>
              <i className="fas fa-headset" style={styles.supportIconSmall}></i>
              Contact Support
            </a>
            <p style={styles.footerText}>
              All rights reserved.
            </p>
          </div>
        </div>
      </main>

      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <p style={styles.footerCopyright}>
            © 2026 VetCare Systems
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
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    borderRadius: '9999px',
    backgroundColor: '#eff6ff',
    border: '1px solid #dbeafe',
    width: 'fit-content',
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 1.5rem',
  },
  footerCopyright: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#64748b',
    margin: 0,
  },
};

export default StaffLogin;
