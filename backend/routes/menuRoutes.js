// routes/menuRoutes.js - Menu management routes
const express = require('express');
const router = express.Router();

const {
  getRestaurantMenu,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getMyMenu,
  toggleAvailability
} = require('../controllers/menuController');

const { authenticate, authorize } = require('../middleware/auth');
const { menuItemValidation } = require('../middleware/validation');

// Public routes (for customers)
router.get('/restaurant/:restaurant_id', getRestaurantMenu);

// Protected routes (for restaurant owners)
router.get('/my-menu', authenticate, authorize('restaurant'), getMyMenu);
router.post('/', authenticate, authorize('restaurant'), menuItemValidation, addMenuItem);
router.put('/:item_id', authenticate, authorize('restaurant'), updateMenuItem);
router.delete('/:item_id', authenticate, authorize('restaurant'), deleteMenuItem);
router.patch('/:item_id/toggle-availability', authenticate, authorize('restaurant'), toggleAvailability);

module.exports = router;
