import { useNavigate } from 'react-router-dom';
import '../styles/Welcome.css';

const Welcome = () => {
  const navigate = useNavigate();

  const handleStaffLoginClick = () => {
    navigate('/staff/login');
  };

  const handleGuestClick = () => {
    navigate('/guest/ai-assistant');
  };

  const handlePetOwnerClick = () => {
    navigate('/pet-owner/login');
  };

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
          <a style={styles.supportLink} className="welcome-support-link" href="mailto:support@vetcarepro.lk">
            <span>IT Support</span>
          </a>
        </div>
      </header>

      <main style={styles.main} className="welcome-main">
        <div style={styles.contentWrapper} className="welcome-content-wrapper">
          <div style={styles.centerPanel} className="welcome-left-panel">
            <div style={styles.leftContent}>
              <div style={styles.badge}>
                <i className="fas fa-paw" style={styles.badgeIcon}></i>
                <span style={styles.badgeText}>Trusted Veterinary Care</span>
              </div>

              <div style={styles.heroSection}>
                <h1 style={styles.heroTitle} className="welcome-hero-title">
                  Welcome to <br/>
                  <span style={styles.heroHighlight}>VetCare Pro</span>
                </h1>
                <p style={styles.heroDescription} className="welcome-hero-description">
                  Your online portal for <span style={styles.hospitalName}><br />Pro Pet Animal Hospital</span>
                </p>
                <p style={styles.heroSubtext} className="welcome-hero-subtext">
                  View your pet&rsquo;s records, book appointments, and chat with our AI assistant about pet care &mdash; all in one place.
                </p>
              </div>

              <div style={styles.actionSection}>
                <button
                  style={styles.petOwnerButton}
                  className="welcome-petowner-button"
                  onClick={handlePetOwnerClick}
                  type="button"
                >
                  <i className="fas fa-user" style={styles.guestButtonIcon}></i>
                  Sign In &mdash; Pet Owner
                </button>

                <div style={styles.dividerRow}>
                  <span style={styles.dividerLine}></span>
                  <span style={styles.dividerText}>or</span>
                  <span style={styles.dividerLine}></span>
                </div>

                <button
                  style={styles.guestButton}
                  className="welcome-guest-button"
                  onClick={handleGuestClick}
                  type="button"
                >
                  <i className="fas fa-comment-dots" style={styles.guestButtonIcon}></i>
                  Continue as Guest
                </button>
                <div style={styles.aiHighlight}>
                  <i className="fas fa-wand-magic-sparkles" style={styles.aiHighlightIcon}></i>
                  <span style={styles.aiHighlightText} className="welcome-ai-highlight-text">
                    Ask our <strong style={styles.aiHighlightStrong}>AI Assistant</strong> general pet care questions &mdash; no account needed.
                  </span>
                </div>
              </div>

              <div style={styles.disclaimer}>
                <p style={styles.disclaimerText}>
                  Your account and pet records are kept private and secure.
                </p>
                <button
                  type="button"
                  onClick={handleStaffLoginClick}
                  style={styles.staffLoginLink}
                  className="welcome-staff-login-link"
                >
                  Clinic Staff Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer style={styles.footer} className="welcome-footer">
        <div style={styles.footerContent} className="welcome-footer-content">
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
  main: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem 1rem',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: '560px',
    backgroundColor: '#ffffff',
    borderRadius: '1.5rem',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    overflow: 'hidden',
    display: 'flex',
    border: '1px solid #f1f5f9',
  },
  centerPanel: {
    flex: 1,
    padding: '2.5rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  leftContent: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
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
    textAlign: 'center',
    width: '100%',
  },
  heroTitle: {
    fontSize: '2.5rem',
    fontWeight: '900',
    lineHeight: '1.1',
    letterSpacing: '-0.02em',
    color: '#1e293b',
    margin: 0,
    textAlign: 'center',
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
    width: '100%',
  },
  forgotLink: {
    fontSize: '0.875rem',
    color: '#64748b',
    textDecoration: 'none',
    fontWeight: '500',
    transition: 'color 0.2s',
  },
  petOwnerButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
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
  dividerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    margin: '0.25rem 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  guestButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.875rem 2rem',
    backgroundColor: '#ffffff',
    color: '#137fec',
    fontSize: '1.05rem',
    fontWeight: '700',
    letterSpacing: '0.01em',
    border: '1.5px solid #137fec',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  guestButtonIcon: {
    fontSize: '1rem',
  },
  aiHighlight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.55rem',
    padding: '0.65rem 0.9rem',
    borderRadius: '0.75rem',
    background: 'linear-gradient(135deg, #eef2ff 0%, #eff6ff 100%)',
    border: '1px solid #c7d2fe',
    marginTop: '0.4rem',
  },
  aiHighlightIcon: {
    fontSize: '1.1rem',
    color: '#6366f1',
    flexShrink: 0,
  },
  aiHighlightText: {
    fontSize: '0.8rem',
    fontWeight: '500',
    color: '#4338ca',
    textAlign: 'left',
    lineHeight: '1.4',
    whiteSpace: 'nowrap',
  },
  aiHighlightStrong: {
    color: '#4f46e5',
    fontWeight: '800',
  },
  disclaimer: {
    borderTop: '1px solid #f1f5f9',
    paddingTop: '1.5rem',
    marginTop: '1rem',
    width: '100%',
    textAlign: 'center',
  },
  disclaimerText: {
    fontSize: '0.75rem',
    lineHeight: '1.5',
    color: '#94a3b8',
    margin: 0,
  },
  staffLoginLink: {
    marginTop: '0.75rem',
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '0.75rem',
    fontWeight: '600',
    textDecoration: 'underline',
    cursor: 'pointer',
    padding: 0,
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
};

export default Welcome;
