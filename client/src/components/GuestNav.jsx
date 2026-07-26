import { useNavigate } from 'react-router-dom';
import '../styles/GuestAIAssistant.css';

/**
 * Shared header for guest (unauthenticated) pages - VetCare Pro branding
 * and a Sign In shortcut back to the login/welcome screen.
 */
const GuestNav = () => {
  const navigate = useNavigate();

  return (
    <header className="guest-ai-header">
      <div className="guest-ai-header-left">
        <div className="guest-ai-logo-icon">
          <i className="fas fa-paw"></i>
        </div>
        <div>
          <h2 className="guest-ai-logo-title">VetCare Pro</h2>
          <span className="guest-ai-mode-badge">Guest Mode</span>
        </div>
      </div>

      <button
        type="button"
        className="guest-ai-signin-btn"
        onClick={() => navigate('/')}
      >
        Sign In
      </button>
    </header>
  );
};

export default GuestNav;
