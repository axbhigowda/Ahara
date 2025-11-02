// utils/jwt.js - JWT token generation and verification
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ahara_super_secret_key_change_in_production_2025';
const JWT_EXPIRES_IN = '7d'; // Token valid for 7 days

/**
 * Generate JWT token for user
 * @param {object} payload - User data to encode in token
 * @returns {string} - JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {object} - Decoded token payload
 * @throws {Error} - If token is invalid or expired
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Generate token for user login
 * @param {object} user - User object from database
 * @returns {string} - JWT token
 */
const generateAuthToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role || 'customer', // customer, restaurant, delivery_partner, admin
    name: user.name
  };
  
  return generateToken(payload);
};

module.exports = {
  generateToken,
  verifyToken,
  generateAuthToken
};
