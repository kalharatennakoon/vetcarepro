import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useState, useEffect, useRef } from 'react';
import './Layout.css';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { showSuccess } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [hoveredNavItem, setHoveredNavItem] = useState(null);
  const [showAiTooltip, setShowAiTooltip] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showAiQuickAsk, setShowAiQuickAsk] = useState(false);
  const [aiQuickQuestion, setAiQuickQuestion] = useState('');
  const profileMenuRef = useRef(null);
  const aiQuickAskRef = useRef(null);
  const aiQuickAskInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
      if (aiQuickAskRef.current && !aiQuickAskRef.current.contains(event.target)) {
        setShowAiQuickAsk(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showAiQuickAsk) aiQuickAskInputRef.current?.focus();
  }, [showAiQuickAsk]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    await logout();
    showSuccess('You have been signed out successfully', 2000);
    navigate('/staff/login');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleNavigation = (path) => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTo(0, 0);
    document.getElementById('main-content')?.scrollTo(0, 0);
    navigate(path);
    closeMobileMenu();
  };

  const handleAiQuickAskSubmit = (e) => {
    e.preventDefault();
    const question = aiQuickQuestion.trim();
    if (!question) return;
    navigate('/ai-assistant', { state: { initialQuestion: question } });
    setAiQuickQuestion('');
    setShowAiQuickAsk(false);
    closeMobileMenu();
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const getNavItemStyle = (path, baseStyle = styles.navItem) => {
    if (isActive(path)) {
      return { ...baseStyle, ...styles.navItemActive };
    }
    if (hoveredNavItem === path) {
      return { ...baseStyle, ...styles.navItemHover };
    }
    return baseStyle;
  };

  const getNavItemHoverHandlers = (path) => ({
    onMouseEnter: () => setHoveredNavItem(path),
    onMouseLeave: () => setHoveredNavItem((current) => (current === path ? null : current)),
  });

  const getNameWithPrefix = () => {
    if (!user) return '';

    const fullName = `${user.first_name} ${user.last_name}`;
    const initials = `${user.first_name?.charAt(0)}${user.last_name?.charAt(0)}`;

    if (isMobile) {
      return initials;
    }
    return fullName;
  };

  const getRoleDisplay = () => {
    if (!user) return '';
    return user.role;
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          {isMobile && (
            <button 
              style={styles.hamburger}
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              <span style={styles.hamburgerLine}></span>
              <span style={styles.hamburgerLine}></span>
              <span style={styles.hamburgerLine}></span>
            </button>
          )}
          <div>
            <h1 style={styles.logo} onClick={() => handleNavigation('/dashboard')}>
              <i className="fas fa-hospital"></i> {!isMobile && 'VetCare Pro'}
              {isMobile && 'VCP'}
            </h1>
            {!isMobile && <p style={styles.subtitle}>Pro Pet Animal Hospital</p>}
          </div>
        </div>

        <div style={styles.headerRight}>
          {/* AI Assistant Shortcut */}
          <div
            className="staff-ai-header-wrapper"
            ref={aiQuickAskRef}
            onMouseEnter={() => !showAiQuickAsk && setShowAiTooltip(true)}
            onMouseLeave={() => setShowAiTooltip(false)}
          >
            <button
              type="button"
              className={`staff-ai-header-btn ${showAiQuickAsk ? 'active' : ''}`}
              onClick={() => { setShowAiTooltip(false); setShowAiQuickAsk((open) => !open); }}
              aria-label="Ask the AI Assistant"
              aria-expanded={showAiQuickAsk}
            >
              <i className="fas fa-wand-magic-sparkles"></i>
            </button>

            {showAiTooltip && !showAiQuickAsk && (
              <span className="staff-ai-header-tooltip">Ask AI Assistant</span>
            )}

            {showAiQuickAsk && (
              <form className="staff-ai-quickask-popup" onSubmit={handleAiQuickAskSubmit}>
                <div className="staff-ai-popup-header">
                  <div className="staff-ai-popup-badge">
                    <i className="fas fa-wand-magic-sparkles"></i>
                  </div>
                  <div className="staff-ai-popup-titles">
                    <span className="staff-ai-popup-title">VetCare AI Assistant</span>
                    <span className="staff-ai-popup-subtitle">Ask clinical questions or clinic ops</span>
                  </div>
                </div>

                <div className="staff-ai-popup-input-row">
                  <input
                    ref={aiQuickAskInputRef}
                    type="text"
                    value={aiQuickQuestion}
                    onChange={(e) => setAiQuickQuestion(e.target.value)}
                    placeholder="Type your question..."
                    className="staff-ai-popup-input"
                    onKeyDown={(e) => { if (e.key === 'Escape') setShowAiQuickAsk(false); }}
                  />
                  <button
                    type="submit"
                    className={`staff-ai-popup-send-btn ${aiQuickQuestion.trim() ? 'ready' : ''}`}
                    disabled={!aiQuickQuestion.trim()}
                    aria-label="Send question"
                  >
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* User Profile Section */}
          <div className="staff-profile-wrapper" ref={profileMenuRef}>
            <button
              className={`staff-profile-chip ${isProfileMenuOpen ? 'open' : ''}`}
              onClick={() => setIsProfileMenuOpen((open) => !open)}
              aria-label="Open profile menu"
              aria-expanded={isProfileMenuOpen}
            >
              <div className="staff-profile-avatar-wrapper">
                {user?.profile_image ? (
                  <img
                    src={`http://localhost:3000/uploads/${user.profile_image}`}
                    alt="Profile"
                    className="staff-profile-avatar-img"
                  />
                ) : (
                  <div className="staff-profile-avatar-initials">
                    {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
                  </div>
                )}
                <span className="staff-avatar-status-dot"></span>
              </div>

              {!isMobile && (
                <div className="staff-profile-details">
                  <span className="staff-profile-name">{getNameWithPrefix()}</span>
                  <span className={`staff-profile-role-pill role-${user?.role || 'staff'}`}>
                    {getRoleDisplay()}
                  </span>
                </div>
              )}

              <i className={`fas fa-chevron-down staff-profile-chevron ${isProfileMenuOpen ? 'rotated' : ''}`}></i>
            </button>

            {isProfileMenuOpen && (
              <div className="staff-profile-dropdown-menu">
                <a
                  href="/profile"
                  className="staff-dropdown-item"
                  onClick={(e) => { e.preventDefault(); setIsProfileMenuOpen(false); handleNavigation('/profile'); }}
                >
                  <div className="staff-dropdown-icon-box"><i className="fas fa-user-circle"></i></div>
                  <span>My Profile</span>
                </a>
                <div className="staff-dropdown-divider"></div>
                <button
                  type="button"
                  className="staff-dropdown-item staff-dropdown-item-logout"
                  onClick={(e) => { e.preventDefault(); setIsProfileMenuOpen(false); handleLogout(); }}
                >
                  <div className="staff-dropdown-icon-box logout-icon"><i className="fas fa-sign-out-alt"></i></div>
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div style={styles.overlay} onClick={closeMobileMenu}></div>
      )}

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Sidebar hover trigger (desktop only) */}
        {!isMobile && (
          <div
            style={styles.sidebarHoverTrigger}
            onMouseEnter={() => setIsSidebarExpanded(true)}
          ></div>
        )}

        {/* Sidebar */}
        <aside
          style={{
            ...styles.sidebar,
            ...(isMobile && isMobileMenuOpen ? styles.sidebarMobileOpen : {}),
            ...(isMobile && !isMobileMenuOpen ? styles.sidebarMobileClosed : {}),
            ...(!isMobile ? (isSidebarExpanded ? styles.sidebarDesktopExpanded : styles.sidebarDesktopCollapsed) : {}),
          }}
          onMouseEnter={() => !isMobile && setIsSidebarExpanded(true)}
          onMouseLeave={() => !isMobile && setIsSidebarExpanded(false)}
        >
          <div style={styles.sidebarContent}>
            <nav className="staff-sidebar-nav">
              {/* Section 1: Overview & Care */}
              <div className="staff-nav-section">
                <div className="staff-nav-section-title">Overview & Care</div>
                <a 
                  href="/dashboard" 
                  className={`staff-nav-item ${isActive('/dashboard') ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); handleNavigation('/dashboard'); }}
                >
                  <div className="staff-nav-icon-wrapper"><i className="fas fa-chart-line"></i></div>
                  <span className="staff-nav-label">Dashboard</span>
                </a>
                <a 
                  href="/pets" 
                  className={`staff-nav-item ${isActive('/pets') ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); handleNavigation('/pets'); }}
                >
                  <div className="staff-nav-icon-wrapper"><i className="fas fa-paw"></i></div>
                  <span className="staff-nav-label">Pets</span>
                </a>
                <a 
                  href="/customers" 
                  className={`staff-nav-item ${isActive('/customers') ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); handleNavigation('/customers'); }}
                >
                  <div className="staff-nav-icon-wrapper"><i className="fas fa-users"></i></div>
                  <span className="staff-nav-label">Customers</span>
                </a>
                <a 
                  href="/appointments" 
                  className={`staff-nav-item ${isActive('/appointments') ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); handleNavigation('/appointments'); }}
                >
                  <div className="staff-nav-icon-wrapper"><i className="fas fa-calendar-alt"></i></div>
                  <span className="staff-nav-label">Appointments</span>
                </a>
              </div>

              {/* Section 2: Clinical & AI */}
              <div className="staff-nav-section">
                <div className="staff-nav-section-title">Clinical & AI</div>
                {(user?.role === 'admin' || user?.role === 'veterinarian') && (
                  <a
                    href="/medical-records"
                    className={`staff-nav-item ${isActive('/medical-records') ? 'active' : ''}`}
                    onClick={(e) => { e.preventDefault(); handleNavigation('/medical-records'); }}
                  >
                    <div className="staff-nav-icon-wrapper"><i className="fas fa-file-medical"></i></div>
                    <span className="staff-nav-label">Medical Records</span>
                  </a>
                )}
                {(user?.role === 'admin' || user?.role === 'veterinarian') && (
                  <a
                    href="/breeding-registry"
                    className={`staff-nav-item ${isActive('/breeding-registry') ? 'active' : ''}`}
                    onClick={(e) => { e.preventDefault(); handleNavigation('/breeding-registry'); }}
                  >
                    <div className="staff-nav-icon-wrapper"><i className="fas fa-heart"></i></div>
                    <span className="staff-nav-label">Breeding Registry</span>
                  </a>
                )}
                <a
                  href="/ai-assistant"
                  className={`staff-nav-item staff-nav-item-ai ${isActive('/ai-assistant') ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); handleNavigation('/ai-assistant'); }}
                >
                  <div className="staff-nav-icon-wrapper staff-ai-icon-wrapper">
                    <i className="fas fa-wand-magic-sparkles"></i>
                  </div>
                  <span className="staff-nav-label staff-ai-label">AI Assistant</span>
                </a>
                {(user?.role === 'admin' || user?.role === 'veterinarian') && (
                  <a
                    href="/analytics"
                    className={`staff-nav-item ${isActive('/analytics') ? 'active' : ''}`}
                    onClick={(e) => { e.preventDefault(); handleNavigation('/analytics'); }}
                  >
                    <div className="staff-nav-icon-wrapper"><i className="fas fa-chart-line"></i></div>
                    <span className="staff-nav-label">Analytics & Insights</span>
                  </a>
                )}
              </div>

              {/* Section 3: Operations (Visible to non-veterinarians) */}
              {user?.role !== 'veterinarian' && (
                <div className="staff-nav-section">
                  <div className="staff-nav-section-title">Operations</div>
                  <a
                    href="/billing"
                    className={`staff-nav-item ${isActive('/billing') ? 'active' : ''}`}
                    onClick={(e) => { e.preventDefault(); handleNavigation('/billing'); }}
                  >
                    <div className="staff-nav-icon-wrapper"><i className="fas fa-file-invoice-dollar"></i></div>
                    <span className="staff-nav-label">Billing</span>
                  </a>
                  <a
                    href="/inventory"
                    className={`staff-nav-item ${isActive('/inventory') ? 'active' : ''}`}
                    onClick={(e) => { e.preventDefault(); handleNavigation('/inventory'); }}
                  >
                    <div className="staff-nav-icon-wrapper"><i className="fas fa-boxes"></i></div>
                    <span className="staff-nav-label">Inventory</span>
                  </a>
                </div>
              )}

              {/* Section 4: Management (Visible to Admin only) */}
              {user?.role === 'admin' && (
                <div className="staff-nav-section">
                  <div className="staff-nav-section-title">Management</div>
                  <a
                    href="/reports"
                    className={`staff-nav-item ${isActive('/reports') ? 'active' : ''}`}
                    onClick={(e) => { e.preventDefault(); handleNavigation('/reports'); }}
                  >
                    <div className="staff-nav-icon-wrapper"><i className="fas fa-chart-pie"></i></div>
                    <span className="staff-nav-label">Reports</span>
                  </a>
                  <a
                    href="/users"
                    className={`staff-nav-item ${isActive('/users') ? 'active' : ''}`}
                    onClick={(e) => { e.preventDefault(); handleNavigation('/users'); }}
                  >
                    <div className="staff-nav-icon-wrapper"><i className="fas fa-user-md"></i></div>
                    <span className="staff-nav-label">Staff</span>
                  </a>
                  <a
                    href="/system-logs"
                    className={`staff-nav-item ${isActive('/system-logs') ? 'active' : ''}`}
                    onClick={(e) => { e.preventDefault(); handleNavigation('/system-logs'); }}
                  >
                    <div className="staff-nav-icon-wrapper"><i className="fas fa-clipboard-list"></i></div>
                    <span className="staff-nav-label">System Logs</span>
                  </a>
                </div>
              )}
            </nav>

            {/* Pro Pet Animal Hospital Footer Card */}
            <div className="staff-sidebar-footer-card">
              <div className="staff-sidebar-footer-hospital-icon">
                <i className="fas fa-hospital"></i>
              </div>
              <div className="staff-sidebar-footer-info">
                <span className="staff-sidebar-footer-name">Pro Pet Animal Hospital</span>
                <span className="staff-sidebar-footer-sub">
                  <span className="staff-role-dot"></span>
                  Kurunegala
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main id="main-content" style={styles.content}>
          <div style={styles.contentInner}>
            {children}
            <footer style={styles.footer}>
              <p style={styles.footerText}>
                © 2026 VetCare Pro - Pro Pet Animal Hospital, Kurunegala
              </p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#f5f7fa',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    flexShrink: 0,
    zIndex: 100,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  hamburger: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    zIndex: 1001,
  },
  hamburgerLine: {
    width: '24px',
    height: '3px',
    backgroundColor: '#1e40af',
    borderRadius: '2px',
    transition: 'all 0.3s',
  },
  logo: {
    margin: 0,
    fontSize: 'clamp(1rem, 4vw, 1.5rem)',
    color: '#1e40af',
    fontWeight: 'bold',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  subtitle: {
    margin: 0,
    fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
    color: '#6b7280',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(0.5rem, 2vw, 1rem)',
  },
  userSection: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  aiAssistantWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  aiAssistantButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 'clamp(32px, 8vw, 40px)',
    height: 'clamp(32px, 8vw, 40px)',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#eff6ff',
    color: '#1e40af',
    fontSize: '1.1rem',
    cursor: 'pointer',
    flexShrink: 0,
  },
  aiAssistantTooltip: {
    position: 'absolute',
    top: '120%',
    right: 0,
    backgroundColor: '#1e40af',
    color: '#ffffff',
    fontSize: '0.75rem',
    fontWeight: '500',
    padding: '0.35rem 0.65rem',
    borderRadius: '6px',
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
    zIndex: 1002,
    pointerEvents: 'none',
  },
  aiQuickAskPopup: {
    position: 'absolute',
    top: '120%',
    right: 0,
    width: '300px',
    maxWidth: '85vw',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    boxShadow: '0 12px 28px -8px rgba(15, 23, 42, 0.25)',
    padding: '0.85rem',
    zIndex: 1002,
  },
  aiQuickAskLabel: {
    display: 'block',
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#6d28d9',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '0.5rem',
  },
  aiQuickAskInputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '999px',
    padding: '0.3rem 0.3rem 0.3rem 0.9rem',
  },
  aiQuickAskInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: '0.85rem',
    padding: '0.4rem 0',
    color: '#111827',
  },
  aiQuickAskSendBtn: {
    width: '32px',
    height: '32px',
    flexShrink: 0,
    borderRadius: '50%',
    border: 'none',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  userAvatar: {
    width: '2.5rem',
    height: '2.5rem',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.875rem',
    fontWeight: '600',
    border: '2px solid #e5e7eb',
  },
  userAvatarImage: {
    width: 'clamp(32px, 8vw, 40px)',
    height: 'clamp(32px, 8vw, 40px)',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid #e5e7eb',
    flexShrink: 0,
  },
  userAvatarButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    borderRadius: '50%',
  },
  profileDropdown: {
    position: 'absolute',
    top: 'calc(100% + 0.5rem)',
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    border: '1px solid #e5e7eb',
    minWidth: '160px',
    overflow: 'hidden',
    zIndex: 1002,
  },
  profileDropdownItem: {
    display: 'block',
    padding: '0.625rem 1rem',
    textDecoration: 'none',
    color: '#374151',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  profileDropdownItemLogout: {
    display: 'block',
    padding: '0.625rem 1rem',
    textDecoration: 'none',
    color: '#dc2626',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    borderTop: '1px solid #e5e7eb',
  },
  userName: {
    fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
    fontWeight: '600',
    color: '#111827',
  },
  userRole: {
    fontSize: '0.75rem',
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  logoutButton: {
    padding: 'clamp(0.5rem, 2vw, 0.5rem) clamp(0.75rem, 3vw, 1rem)',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    whiteSpace: 'nowrap',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  mainContent: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    minHeight: 0,
    position: 'relative',
  },
  sidebarHoverTrigger: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '6px',
    backgroundColor: '#e5e7eb',
    zIndex: 998,
  },
  sidebar: {
    width: '250px',
    backgroundColor: '#ffffff',
    borderRight: '1px solid #e5e7eb',
    padding: 0,
    transition: 'transform 0.3s ease-in-out',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarContent: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    justifyContent: 'space-between',
  },
  sidebarMobileOpen: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 1000,
    transform: 'translateX(0)',
    boxShadow: '2px 0 8px rgba(0, 0, 0, 0.15)',
    overflowY: 'auto',
  },
  sidebarMobileClosed: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    transform: 'translateX(-100%)',
  },
  sidebarDesktopCollapsed: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 999,
    transform: 'translateX(-100%)',
    boxShadow: 'none',
  },
  sidebarDesktopExpanded: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 999,
    transform: 'translateX(0)',
    boxShadow: '2px 0 12px rgba(0, 0, 0, 0.15)',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    padding: '1.5rem 0',
    flex: 1,
    overflowY: 'auto',
  },
  sidebarBottom: {
    borderTop: '1px solid #e5e7eb',
    padding: '1rem 0',
  },
  bottomNavItem: {
    padding: 'clamp(0.625rem, 2vw, 0.75rem) clamp(1rem, 3vw, 1.5rem)',
    textDecoration: 'none',
    color: '#374151',
    fontSize: 'clamp(0.8125rem, 2vw, 0.875rem)',
    fontWeight: '500',
    transition: 'all 0.2s',
    display: 'block',
    cursor: 'pointer',
  },
  bottomNavItemLogout: {
    padding: 'clamp(0.625rem, 2vw, 0.75rem) clamp(1rem, 3vw, 1.5rem)',
    textDecoration: 'none',
    color: '#dc2626',
    fontSize: 'clamp(0.8125rem, 2vw, 0.875rem)',
    fontWeight: '500',
    transition: 'all 0.2s',
    display: 'block',
    cursor: 'pointer',
  },
  bottomNavItemLogoutHover: {
    backgroundColor: '#fef2f2',
    transform: 'translateX(4px)',
  },
  navItem: {
    padding: 'clamp(0.625rem, 2vw, 0.75rem) clamp(1rem, 3vw, 1.5rem)',
    textDecoration: 'none',
    color: '#374151',
    fontSize: 'clamp(0.8125rem, 2vw, 0.875rem)',
    fontWeight: '500',
    transition: 'all 0.2s',
    borderLeft: '3px solid transparent',
    display: 'block',
  },
  navItemActive: {
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    borderLeft: '3px solid #2563eb',
    fontWeight: '600',
  },
  navItemHover: {
    backgroundColor: '#f3f4f6',
    color: '#1f2937',
    borderLeft: '3px solid #9ca3af',
    transform: 'translateX(4px)',
  },
  content: {
    flex: 1,
    padding: 'clamp(1rem, 3vw, 2rem)',
    overflowY: 'auto',
    minHeight: 0,
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
  },
  contentInner: {
    width: '100%',
    maxWidth: '1600px',
    margin: '0 auto',
  },
  footer: {
    marginTop: '2.5rem',
    padding: 'clamp(0.75rem, 2vw, 1rem) clamp(1rem, 3vw, 2rem)',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e5e7eb',
    textAlign: 'center',
  },
  footerText: {
    margin: 0,
    fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
    color: '#6b7280',
  },
};

export default Layout;
