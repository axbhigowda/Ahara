// routes/authRoutes.js - Authentication routes
const express = require('express');
const router = express.Router();

const {
  customerSignup,
  customerLogin,
  restaurantSignup,
  restaurantLogin,
  getProfile,
  getAllCustomers
} = require('../controllers/authController');

const {
  signupValidation,
  loginValidation,
  restaurantSignupValidation
} = require('../middleware/validation');

const { authenticate } = require('../middleware/auth');

// Customer routes
router.post('/customer/signup', signupValidation, customerSignup);
router.post('/customer/login', loginValidation, customerLogin);

// Restaurant routes
router.post('/restaurant/signup', restaurantSignupValidation, restaurantSignup);
router.post('/restaurant/login', loginValidation, restaurantLogin);

// Protected route - Get current user profile
router.get('/profile', authenticate, getProfile);

// Get all customers (for admin/analytics)
router.get('/customers', authenticate, getAllCustomers);

module.exports = router;
