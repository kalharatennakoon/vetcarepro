import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

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

  const handleLogout = () => {
    logout();
    navigate('/');
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

  const getNavItemStyle = (path) => {
    return isActive(path) ? { ...styles.navItem, ...styles.navItemActive } : styles.navItem;
  };

  const getNameWithPrefix = () => {
    if (!user) return '';
    
    const fullName = `${user.first_name} ${user.last_name}`;
    const initials = `${user.first_name?.charAt(0)}${user.last_name?.charAt(0)}`;
    
    let prefix = '';
    
    // Check if user is a veterinarian
    if (user.role === 'veterinarian') {
      prefix = 'Dr.';
    } else {
      // For admin and receptionist, use Mr./Ms. based on gender from database
      const gender = user.gender || 'male'; // Default to 'male' if not set
      prefix = gender === 'female' ? 'Ms.' : 'Mr.';
    }
    
    if (isMobile) {
      return `${prefix} ${initials}`;
    }
    return `${prefix} ${fullName}`;
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
          {/* User Profile Section */}
          <div style={styles.userSection}>
            {!isMobile && (
              <div style={styles.userInfo}>
                <span style={styles.userName}>
                  {getNameWithPrefix()}
                </span>
                <span style={styles.userRole}>{getRoleDisplay()}</span>
              </div>
            )}
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
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div style={styles.overlay} onClick={closeMobileMenu}></div>
      )}

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Sidebar */}
        <aside style={{
          ...styles.sidebar,
          ...(isMobile && isMobileMenuOpen ? styles.sidebarMobileOpen : {}),
          ...(isMobile && !isMobileMenuOpen ? styles.sidebarMobileClosed : {})
        }}>
          <div style={styles.sidebarContent}>
            <nav style={styles.nav}>
              <a 
                href="/dashboard" 
                style={getNavItemStyle('/dashboard')}
                onClick={(e) => { e.preventDefault(); handleNavigation('/dashboard'); }}
              >
                <i className="fas fa-chart-line"></i> Dashboard
              </a>
              <a 
                href="/pets" 
                style={getNavItemStyle('/pets')}
                onClick={(e) => { e.preventDefault(); handleNavigation('/pets'); }}
              >
                <i className="fas fa-paw"></i> Pets
              </a>
              <a 
                href="/customers" 
                style={getNavItemStyle('/customers')}
                onClick={(e) => { e.preventDefault(); handleNavigation('/customers'); }}
              >
                <i className="fas fa-users"></i> Customers
              </a>
              <a 
                href="/appointments" 
                style={getNavItemStyle('/appointments')}
                onClick={(e) => { e.preventDefault(); handleNavigation('/appointments'); }}
              >
                <i className="fas fa-calendar-alt"></i> Appointments
              </a>
              <a 
                href="/medical-records" 
                style={getNavItemStyle('/medical-records')}
                onClick={(e) => { e.preventDefault(); handleNavigation('/medical-records'); }}
              >
                <i className="fas fa-file-medical"></i> Medical Records
              </a>
              <a 
                href="/billing" 
                style={getNavItemStyle('/billing')}
                onClick={(e) => { e.preventDefault(); handleNavigation('/billing'); }}
              >
                <i className="fas fa-dollar-sign"></i> Billing
              </a>
              <a 
                href="/inventory" 
                style={getNavItemStyle('/inventory')}
                onClick={(e) => { e.preventDefault(); handleNavigation('/inventory'); }}
              >
                <i className="fas fa-boxes"></i> Inventory
              </a>
              {(user?.role === 'admin' || user?.role === 'veterinarian') && (
                <a 
                  href="/reports" 
                  style={getNavItemStyle('/reports')}
                  onClick={(e) => { e.preventDefault(); handleNavigation('/reports'); }}
                >
                  <i className="fas fa-chart-bar"></i> Reports
                </a>
              )}
              {user?.role === 'admin' && (
                <>
                  <a 
                    href="/users" 
                    style={getNavItemStyle('/users')}
                    onClick={(e) => { e.preventDefault(); handleNavigation('/users'); }}
                  >
                    <i className="fas fa-user-md"></i> Staff
                  </a>
                  <a 
                    href="/ml-dashboard" 
                    style={getNavItemStyle('/ml-dashboard')}
                    onClick={(e) => { e.preventDefault(); handleNavigation('/ml-dashboard'); }}
                  >
                    <i className="fas fa-brain"></i> ML Dashboard
                  </a>
                </>
              )}
            </nav>
            
            {/* Bottom Section with Profile and Sign Out */}
            <div style={styles.sidebarBottom}>
              <a 
                href="/profile" 
                style={isActive('/profile') ? {...styles.bottomNavItem, ...styles.navItemActive} : styles.bottomNavItem}
                onClick={(e) => { e.preventDefault(); handleNavigation('/profile'); }}
              >
                <i className="fas fa-user-circle"></i> Profile
              </a>
              <a 
                href="#" 
                style={styles.bottomNavItemLogout}
                onClick={(e) => { e.preventDefault(); handleLogout(); }}
              >
                <i className="fas fa-sign-out-alt"></i> Sign Out
              </a>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main style={styles.content}>
          {children}
        </main>
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <p style={styles.footerText}>
          © 2026 VetCare Pro - Pro Pet Animal Hospital, Mawathagama, Kurunegala
        </p>
      </footer>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
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
    position: 'sticky',
    top: 0,
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
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
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
    position: 'relative',
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
  content: {
    flex: 1,
    padding: 'clamp(1rem, 3vw, 2rem)',
    overflow: 'auto',
    width: '100%',
    maxWidth: '100%',
  },
  footer: {
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
