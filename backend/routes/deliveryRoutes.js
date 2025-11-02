// routes/deliveryRoutes.js - Delivery partner routes
const express = require('express');
const router = express.Router();

const {
  deliveryPartnerSignup,
  deliveryPartnerLogin,
  toggleAvailability,
  getAvailableOrders,
  acceptOrder,
  getMyDeliveries,
  updateDeliveryStatus,
  getDeliveryHistory,
  getPartnerStats
} = require('../controllers/deliveryController');

const { authenticate, authorize } = require('../middleware/auth');
const { signupValidation, loginValidation } = require('../middleware/validation');

// Public routes
router.post('/signup', signupValidation, deliveryPartnerSignup);
router.post('/login', loginValidation, deliveryPartnerLogin);

// Protected routes (delivery partner only)
router.patch('/toggle-availability', authenticate, authorize('delivery_partner'), toggleAvailability);
router.get('/available-orders', authenticate, authorize('delivery_partner'), getAvailableOrders);
router.post('/orders/:order_id/accept', authenticate, authorize('delivery_partner'), acceptOrder);
router.get('/my-deliveries', authenticate, authorize('delivery_partner'), getMyDeliveries);
router.patch('/orders/:order_id/status', authenticate, authorize('delivery_partner'), updateDeliveryStatus);
router.get('/history', authenticate, authorize('delivery_partner'), getDeliveryHistory);
router.get('/stats', authenticate, authorize('delivery_partner'), getPartnerStats);

module.exports = router;
