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
                  Welcome to <span style={styles.heroHighlight}>VetCare Pro</span>
                </h1>
                <p style={styles.heroDescription} className="welcome-hero-description">
                  Your online portal for <span style={styles.hospitalName}>Pro Pet Animal Hospital</span>
                </p>
                <p style={styles.heroSubtext} className="welcome-hero-subtext">
                  View records, book appointments, and chat with our AI assistant &mdash; all in one place.
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
    backgroundColor: '#f8fafc',
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
    padding: '0.85rem 1.5rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  logoIcon: {
    width: '38px',
    height: '38px',
    borderRadius: '0.5rem',
    backgroundColor: '#137fec',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(19, 127, 236, 0.3)',
  },
  iconText: {
    fontSize: '1.35rem',
    color: '#ffffff',
  },
  logoTitle: {
    fontSize: '1.1rem',
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
    fontSize: '0.85rem',
    fontWeight: '600',
    textDecoration: 'none',
    transition: 'color 0.2s',
    cursor: 'pointer',
  },
  main: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: '530px',
    backgroundColor: '#ffffff',
    borderRadius: '1.25rem',
    boxShadow: '0 15px 30px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -5px rgba(0, 0, 0, 0.03)',
    overflow: 'hidden',
    display: 'flex',
    border: '1px solid #f1f5f9',
  },
  centerPanel: {
    flex: 1,
    padding: '1.85rem 2rem',
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
    gap: '1.1rem',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    padding: '0.4rem 0.75rem',
    borderRadius: '9999px',
    backgroundColor: '#eff6ff',
    border: '1px solid #dbeafe',
    width: 'fit-content',
  },
  badgeIcon: {
    fontSize: '0.8rem',
    color: '#137fec',
  },
  badgeText: {
    color: '#137fec',
    fontSize: '0.73rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  heroSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.55rem',
    textAlign: 'center',
    width: '100%',
  },
  heroTitle: {
    fontSize: '2.15rem',
    fontWeight: '900',
    lineHeight: '1.15',
    letterSpacing: '-0.02em',
    color: '#1e293b',
    margin: 0,
    textAlign: 'center',
  },
  heroHighlight: {
    color: '#137fec',
  },
  heroDescription: {
    fontSize: '0.95rem',
    lineHeight: '1.45',
    fontWeight: '500',
    color: '#475569',
    margin: 0,
  },
  hospitalName: {
    color: '#1e293b',
    fontWeight: '700',
  },
  heroSubtext: {
    fontSize: '0.85rem',
    lineHeight: '1.45',
    color: '#64748b',
    margin: 0,
  },
  actionSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.65rem',
    paddingTop: '0.25rem',
    width: '100%',
  },
  petOwnerButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.75rem',
    backgroundColor: '#137fec',
    color: '#ffffff',
    fontSize: '1rem',
    fontWeight: '700',
    letterSpacing: '0.01em',
    border: 'none',
    borderRadius: '0.7rem',
    cursor: 'pointer',
    boxShadow: '0 6px 14px -2px rgba(19, 127, 236, 0.25)',
    transition: 'all 0.2s',
  },
  dividerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    margin: '0.15rem 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    fontSize: '0.72rem',
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
    padding: '0.75rem 1.75rem',
    backgroundColor: '#ffffff',
    color: '#137fec',
    fontSize: '1rem',
    fontWeight: '700',
    letterSpacing: '0.01em',
    border: '1.5px solid #137fec',
    borderRadius: '0.7rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  guestButtonIcon: {
    fontSize: '0.95rem',
  },
  aiHighlight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.55rem',
    padding: '0.55rem 0.85rem',
    borderRadius: '0.7rem',
    background: 'linear-gradient(135deg, #eef2ff 0%, #eff6ff 100%)',
    border: '1px solid #c7d2fe',
    marginTop: '0.25rem',
  },
  aiHighlightIcon: {
    fontSize: '1rem',
    color: '#6366f1',
    flexShrink: 0,
  },
  aiHighlightText: {
    fontSize: '0.78rem',
    fontWeight: '500',
    color: '#4338ca',
    textAlign: 'left',
    lineHeight: '1.4',
  },
  aiHighlightStrong: {
    color: '#4f46e5',
    fontWeight: '800',
  },
  disclaimer: {
    borderTop: '1px solid #f1f5f9',
    paddingTop: '1rem',
    marginTop: '0.5rem',
    width: '100%',
    textAlign: 'center',
  },
  disclaimerText: {
    fontSize: '0.75rem',
    lineHeight: '1.4',
    color: '#94a3b8',
    margin: 0,
  },
  staffLoginLink: {
    marginTop: '0.45rem',
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
    padding: '0.85rem 0',
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
    fontSize: '0.82rem',
    fontWeight: '500',
    color: '#64748b',
    margin: 0,
  },
};

export default Welcome;
