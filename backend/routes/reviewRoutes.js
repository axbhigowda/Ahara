// routes/reviewRoutes.js - Review management routes
const express = require('express');
const router = express.Router();

const {
  submitReview,
  getRestaurantReviews,
  getDeliveryPartnerReviews,
  getMyReviews,
  canReviewOrder,
  updateReview,
  deleteReview
} = require('../controllers/reviewController');

const { authenticate, authorize } = require('../middleware/auth');
const { reviewValidation } = require('../middleware/validation');

// Public routes
router.get('/restaurant/:restaurant_id', getRestaurantReviews);
router.get('/delivery-partner/:partner_id', getDeliveryPartnerReviews);

// Customer routes (protected)
router.post('/', authenticate, authorize('customer'), reviewValidation, submitReview);
router.get('/my-reviews', authenticate, authorize('customer'), getMyReviews);
router.get('/can-review/:order_id', authenticate, authorize('customer'), canReviewOrder);
router.put('/:review_id', authenticate, authorize('customer'), updateReview);
router.delete('/:review_id', authenticate, authorize('customer'), deleteReview);

module.exports = router;
