import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useState, useEffect, useRef } from 'react';

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
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    showSuccess('You have been signed out successfully');
    navigate('/staff/login');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleNavigation = (path) => {
    navigate(path);
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
            style={styles.aiAssistantWrapper}
            onMouseEnter={() => setShowAiTooltip(true)}
            onMouseLeave={() => setShowAiTooltip(false)}
          >
            <button
              style={styles.aiAssistantButton}
              onClick={() => handleNavigation('/ai-assistant')}
              aria-label="Open AI Assistant"
            >
              <i className="fas fa-wand-magic-sparkles"></i>
            </button>
            {showAiTooltip && (
              <span style={styles.aiAssistantTooltip}>AI Assistant</span>
            )}
          </div>

          {/* User Profile Section */}
          <div style={styles.userSection} ref={profileMenuRef}>
            {!isMobile && (
              <div style={styles.userInfo}>
                <span style={styles.userName}>
                  {getNameWithPrefix()}
                </span>
                <span style={styles.userRole}>{getRoleDisplay()}</span>
              </div>
            )}
            <button
              style={styles.userAvatarButton}
              onClick={() => setIsProfileMenuOpen((open) => !open)}
              aria-label="Open profile menu"
              aria-expanded={isProfileMenuOpen}
            >
              {user?.profile_image ? (
                <img
                  src={`http://localhost:3000/uploads/${user.profile_image}`}
                  alt="Profile"
                  style={styles.userAvatarImage}
                />
              ) : (
                <div style={styles.userAvatar}>
                  {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
                </div>
              )}
            </button>
            {isProfileMenuOpen && (
              <div style={styles.profileDropdown}>
                <a
                  href="/profile"
                  style={styles.profileDropdownItem}
                  onClick={(e) => { e.preventDefault(); setIsProfileMenuOpen(false); handleNavigation('/profile'); }}
                >
                  <i className="fas fa-user-circle"></i> Profile
                </a>
                <a
                  href="#"
                  style={styles.profileDropdownItemLogout}
                  onClick={(e) => { e.preventDefault(); setIsProfileMenuOpen(false); handleLogout(); }}
                >
                  <i className="fas fa-sign-out-alt"></i> Sign Out
                </a>
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
            <nav style={styles.nav}>
              <a 
                href="/dashboard" 
                style={getNavItemStyle('/dashboard')}
                {...getNavItemHoverHandlers('/dashboard')}
                onClick={(e) => { e.preventDefault(); handleNavigation('/dashboard'); }}
              >
                <i className="fas fa-chart-line"></i> Dashboard
              </a>
              <a 
                href="/pets" 
                style={getNavItemStyle('/pets')}
                {...getNavItemHoverHandlers('/pets')}
                onClick={(e) => { e.preventDefault(); handleNavigation('/pets'); }}
              >
                <i className="fas fa-paw"></i> Pets
              </a>
              <a 
                href="/customers" 
                style={getNavItemStyle('/customers')}
                {...getNavItemHoverHandlers('/customers')}
                onClick={(e) => { e.preventDefault(); handleNavigation('/customers'); }}
              >
                <i className="fas fa-users"></i> Customers
              </a>
              <a 
                href="/appointments" 
                style={getNavItemStyle('/appointments')}
                {...getNavItemHoverHandlers('/appointments')}
                onClick={(e) => { e.preventDefault(); handleNavigation('/appointments'); }}
              >
                <i className="fas fa-calendar-alt"></i> Appointments
              </a>
              {(user?.role === 'admin' || user?.role === 'veterinarian') && (
                <a
                  href="/medical-records"
                  style={getNavItemStyle('/medical-records')}
                  {...getNavItemHoverHandlers('/medical-records')}
                  onClick={(e) => { e.preventDefault(); handleNavigation('/medical-records'); }}
                >
                  <i className="fas fa-file-medical"></i> Medical Records
                </a>
              )}

              {user?.role !== 'veterinarian' && (
                <a
                  href="/billing"
                  style={getNavItemStyle('/billing')}
                  {...getNavItemHoverHandlers('/billing')}
                  onClick={(e) => { e.preventDefault(); handleNavigation('/billing'); }}
                >
                  <i className="fas fa-dollar-sign"></i> Billing
                </a>
              )}
              {user?.role !== 'veterinarian' && (
                <a
                  href="/inventory"
                  style={getNavItemStyle('/inventory')}
                  {...getNavItemHoverHandlers('/inventory')}
                  onClick={(e) => { e.preventDefault(); handleNavigation('/inventory'); }}
                >
                  <i className="fas fa-boxes"></i> Inventory
                </a>
              )}
              {user?.role === 'admin' && (
                <a
                  href="/reports"
                  style={getNavItemStyle('/reports')}
                  {...getNavItemHoverHandlers('/reports')}
                  onClick={(e) => { e.preventDefault(); handleNavigation('/reports'); }}
                >
                  <i className="fas fa-chart-bar"></i> Reports
                </a>
              )}
              {(user?.role === 'admin' || user?.role === 'veterinarian') && (
                <a
                  href="/breeding-registry"
                  style={getNavItemStyle('/breeding-registry')}
                  {...getNavItemHoverHandlers('/breeding-registry')}
                  onClick={(e) => { e.preventDefault(); handleNavigation('/breeding-registry'); }}
                >
                  <i className="fas fa-heart"></i> Breeding Registry
                </a>
              )}
              <a
                href="/ai-assistant"
                style={getNavItemStyle('/ai-assistant')}
                {...getNavItemHoverHandlers('/ai-assistant')}
                onClick={(e) => { e.preventDefault(); handleNavigation('/ai-assistant'); }}
              >
                <i className="fas fa-robot"></i> AI Assistant
              </a>
              {(user?.role === 'admin' || user?.role === 'veterinarian') && (
                <a
                  href="/analytics"
                  style={getNavItemStyle('/analytics')}
                  {...getNavItemHoverHandlers('/analytics')}
                  onClick={(e) => { e.preventDefault(); handleNavigation('/analytics'); }}
                >
                  <i className="fas fa-chart-line"></i> Analytics & Insights
                </a>
              )}
              {user?.role === 'admin' && (
                <a
                  href="/users"
                  style={getNavItemStyle('/users')}
                  {...getNavItemHoverHandlers('/users')}
                  onClick={(e) => { e.preventDefault(); handleNavigation('/users'); }}
                >
                  <i className="fas fa-user-md"></i> Staff
                </a>
              )}
              {user?.role === 'admin' && (
                <a
                  href="/system-logs"
                  style={getNavItemStyle('/system-logs')}
                  {...getNavItemHoverHandlers('/system-logs')}
                  onClick={(e) => { e.preventDefault(); handleNavigation('/system-logs'); }}
                >
                  <i className="fas fa-clipboard-list"></i> System Logs
                </a>
              )}
            </nav>
            
            {/* Bottom Section with Profile and Sign Out */}
            <div style={styles.sidebarBottom}>
              <a
                href="/profile"
                style={getNavItemStyle('/profile', styles.bottomNavItem)}
                {...getNavItemHoverHandlers('/profile')}
                onClick={(e) => { e.preventDefault(); handleNavigation('/profile'); }}
              >
                <i className="fas fa-user-circle"></i> Profile
              </a>
              <a
                href="#"
                style={hoveredNavItem === 'logout' ? {...styles.bottomNavItemLogout, ...styles.bottomNavItemLogoutHover} : styles.bottomNavItemLogout}
                onMouseEnter={() => setHoveredNavItem('logout')}
                onMouseLeave={() => setHoveredNavItem((current) => (current === 'logout' ? null : current))}
                onClick={(e) => { e.preventDefault(); handleLogout(); }}
              >
                <i className="fas fa-sign-out-alt"></i> Sign Out
              </a>
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
