// routes/adminRoutes.js - Admin panel routes
const express = require('express');
const router = express.Router();

const {
  adminLogin,
  getPlatformStats,
  getAllRestaurantsAdmin,
  approveRestaurant,
  deactivateRestaurant,
  getAllOrders,
  getAllCustomers,
  deleteUser,
  getAllDeliveryPartners,
  approveDeliveryPartner,
  deactivateDeliveryPartner
} = require('../controllers/adminController');

const { authenticate, authorize } = require('../middleware/auth');
const { loginValidation } = require('../middleware/validation');

// Public routes
router.post('/login', loginValidation, adminLogin);

// Protected routes (admin only)
router.get('/stats', authenticate, authorize('admin'), getPlatformStats);
router.get('/restaurants', authenticate, authorize('admin'), getAllRestaurantsAdmin);
router.patch('/restaurants/:restaurant_id/approve', authenticate, authorize('admin'), approveRestaurant);
router.patch('/restaurants/:restaurant_id/deactivate', authenticate, authorize('admin'), deactivateRestaurant);
router.get('/orders', authenticate, authorize('admin'), getAllOrders);
router.get('/customers', authenticate, authorize('admin'), getAllCustomers);
router.delete('/users/:user_id', authenticate, authorize('admin'), deleteUser);

// Add these new routes
router.get('/delivery-partners', authenticate, authorize('admin'), getAllDeliveryPartners);
router.patch('/delivery-partners/:partner_id/approve', authenticate, authorize('admin'), approveDeliveryPartner);
router.patch('/delivery-partners/:partner_id/deactivate', authenticate, authorize('admin'), deactivateDeliveryPartner);

module.exports = router;
