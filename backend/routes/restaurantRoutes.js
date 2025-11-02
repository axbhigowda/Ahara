// routes/restaurantRoutes.js - Restaurant management routes
const express = require('express');
const router = express.Router();

const {
  getAllRestaurants,
  getRestaurantById,
  updateRestaurantProfile,
  getMyRestaurant
} = require('../controllers/restaurantController');

const { authenticate, authorize } = require('../middleware/auth');

// Public routes (for customers)
router.get('/', getAllRestaurants);
router.get('/:id', getRestaurantById);

// Protected routes (for restaurant owners)
router.get('/me/profile', authenticate, authorize('restaurant'), getMyRestaurant);
router.put('/me/profile', authenticate, authorize('restaurant'), updateRestaurantProfile);

module.exports = router;
