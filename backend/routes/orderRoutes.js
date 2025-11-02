// routes/orderRoutes.js - Order management routes
const express = require('express');
const router = express.Router();

const {
  createOrder,
  createPaymentOrder,
  verifyPayment,
  getOrderDetails,
  getMyOrders,
  getRestaurantOrders,
  updateOrderStatus
} = require('../controllers/orderController');

const { authenticate, authorize } = require('../middleware/auth');

// Customer routes
router.post('/create', authenticate, authorize('customer'), createOrder);
router.post('/payment/create', authenticate, authorize('customer'), createPaymentOrder);
router.post('/payment/verify', authenticate, authorize('customer'), verifyPayment);
router.get('/my-orders', authenticate, authorize('customer'), getMyOrders);
router.get('/:order_id', authenticate, getOrderDetails);

// Restaurant routes
router.get('/restaurant/orders', authenticate, authorize('restaurant'), getRestaurantOrders);
router.patch('/:order_id/status', authenticate, authorize('restaurant'), updateOrderStatus);

module.exports = router;
