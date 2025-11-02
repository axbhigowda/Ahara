// routes/addressRoutes.js - Address management routes
const express = require('express');
const router = express.Router();

const {
  getMyAddresses,
  addAddress,
  updateAddress,
  deleteAddress
} = require('../controllers/addressController');

const { authenticate, authorize } = require('../middleware/auth');

// All routes require customer authentication
router.get('/', authenticate, authorize('customer'), getMyAddresses);
router.post('/', authenticate, authorize('customer'), addAddress);
router.put('/:address_id', authenticate, authorize('customer'), updateAddress);
router.delete('/:address_id', authenticate, authorize('customer'), deleteAddress);

module.exports = router;