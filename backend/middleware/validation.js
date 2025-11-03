// middleware/validation.js - Input validation rules
const { body, validationResult } = require('express-validator');

/**
 * Middleware to check validation results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

/**
 * Validation rules for user signup
 */
const signupValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[6-9]\d{9}$/).withMessage('Please provide a valid 10-digit Indian phone number'),
  
  validate
];

/**
 * Validation rules for login
 */
const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),
  
  body('password')
    .notEmpty().withMessage('Password is required'),
  
  validate
];

/**
 * Validation rules for restaurant signup
 */
const restaurantSignupValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Restaurant name is required')
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[6-9]\d{9}$/).withMessage('Please provide a valid 10-digit Indian phone number'),
  
  body('address')
    .trim()
    .notEmpty().withMessage('Address is required'),
  
  body('city')
    .trim()
    .notEmpty().withMessage('City is required'),
  
  body('cuisine_type')
    .optional()
    .trim(),
  
  validate
];

/**
 * Validation rules for menu item
 */
const menuItemValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Item name is required')
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  
  body('price')
    .notEmpty().withMessage('Price is required')
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  
  body('category')
    .optional()
    .trim(),
  
  body('description')
    .optional()
    .trim(),
  
  body('is_vegetarian')
    .optional()
    .isBoolean().withMessage('is_vegetarian must be true or false'),
  
  body('is_available')
    .optional()
    .isBoolean().withMessage('is_available must be true or false'),
  
  validate
];

/**
 * Validation rules for review submission
 */
const reviewValidation = [
  body('order_id')
    .notEmpty().withMessage('Order ID is required'),
  
  body('restaurant_rating')
    .notEmpty().withMessage('Restaurant rating is required')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  
  body('restaurant_review')
    .optional()
    .trim(),
  
  body('delivery_rating')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Delivery rating must be between 1 and 5'),
  
  body('delivery_review')
    .optional()
    .trim(),
  
  validate
];

module.exports = {
  signupValidation,
  loginValidation,
  restaurantSignupValidation,
  menuItemValidation,
  reviewValidation,
  validate
};