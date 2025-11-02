// middleware/auth.js - Authentication middleware
const { verifyToken } = require('../utils/jwt');

/**
 * Middleware to verify JWT token and authenticate user
 */
const authenticate = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'No token provided. Please login.'
      });
    }

    // Extract token (format: "Bearer <token>")
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = verifyToken(token);
    
    // Attach user info to request object
    req.user = decoded;
    
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token. Please login again.',
      error: error.message
    });
  }
};

/**
 * Middleware to check if user has required role
 * @param {string[]} allowedRoles - Array of allowed roles
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize
};
