/**
 * Role-based Access Control Middleware
 * Checks if user has required role(s) to access a route
 */

/**
 * Check if user has one of the allowed roles
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 * @returns {Function} Express middleware function
 * 
 * Usage: 
 * router.get('/admin-only', authenticate, authorize('admin'), controller)
 * router.get('/vets-and-admin', authenticate, authorize('admin', 'veterinarian'), controller)
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // Check if user is authenticated (should be done by authenticate middleware first)
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    // Check if user's role is in the allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }

    next();
  };
};

/**
 * Admin only access
 * Shorthand for authorize('admin')
 */
export const adminOnly = authorize('admin');

/**
 * Veterinarian or Admin access
 */
export const vetOrAdmin = authorize('veterinarian', 'admin');

/**
 * Admin or Receptionist access
 */
export const adminOrReceptionist = authorize('admin', 'receptionist');

/**
 * Staff access (all roles)
 */
export const staffOnly = authorize('admin', 'veterinarian', 'receptionist');