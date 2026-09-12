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
            <i className="fas fa-headset" style={{ color: '#2563eb', fontSize: '0.9rem' }}></i>
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
                  View records and book appointments &mdash; all in one place.
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
                    Ask our AI Assistant general pet care questions (no account needed)
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
                  <i className="fas fa-user-shield" style={{ color: '#2563eb', fontSize: '0.85rem' }}></i>
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
            © 2026 VetCare Pro Systems
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
    backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(59, 130, 246, 0.06) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(99, 102, 241, 0.06) 0%, transparent 40%)',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
    padding: '0.85rem 1.5rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
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
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
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
    color: '#475569',
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
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '1.25rem',
    boxShadow: '0 20px 40px -5px rgba(0, 0, 0, 0.06), 0 8px 10px -5px rgba(0, 0, 0, 0.02)',
    overflow: 'hidden',
    display: 'flex',
    border: '1px solid rgba(255, 255, 255, 0.95)',
  },
  centerPanel: {
    flex: 1,
    padding: '2.35rem 2.25rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  leftContent: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.3rem',
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
    color: '#2563eb',
  },
  badgeText: {
    color: '#2563eb',
    fontSize: '0.73rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  heroSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.65rem',
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
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
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
    gap: '0.75rem',
    paddingTop: '0.35rem',
    width: '100%',
  },
  petOwnerButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.75rem',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: '#ffffff',
    fontSize: '1rem',
    fontWeight: '700',
    letterSpacing: '0.01em',
    border: 'none',
    borderRadius: '0.7rem',
    cursor: 'pointer',
    boxShadow: '0 6px 14px -2px rgba(37, 99, 235, 0.25)',
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
    color: '#2563eb',
    fontSize: '1rem',
    fontWeight: '700',
    letterSpacing: '0.01em',
    border: '1.5px solid #3b82f6',
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
    justifyContent: 'center',
    gap: '0.4rem',
    marginTop: '0.35rem',
    textAlign: 'center',
  },
  aiHighlightIcon: {
    fontSize: '0.75rem',
    color: '#6366f1',
    flexShrink: 0,
  },
  aiHighlightText: {
    fontSize: '0.75rem',
    fontWeight: '400',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: '1.3',
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
    marginTop: '0.55rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    padding: '0.45rem 0.9rem',
    backgroundColor: '#eff6ff',
    border: '1px solid #dbeafe',
    borderRadius: '0.5rem',
    color: '#2563eb',
    fontSize: '0.78rem',
    fontWeight: '600',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  footer: {
    borderTop: '1px solid rgba(226, 232, 240, 0.8)',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    padding: '0.85rem 0',
    marginTop: 'auto',
  },
  footerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '0 1.5rem',
  },
  footerCopyright: {
    fontSize: '0.82rem',
    fontWeight: '500',
    color: '#64748b',
    margin: 0,
    textAlign: 'center',
  },
};

export default Welcome;
