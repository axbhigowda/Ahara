// controllers/authController.js - Authentication logic
const { query } = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateAuthToken } = require('../utils/jwt');

/**
 * Customer Signup
 */
const customerSignup = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Email already registered'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Insert user into database
    const result = await query(
      `INSERT INTO users (name, email, password_hash, phone, role) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, name, email, phone, role, created_at`,
      [name, email, hashedPassword, phone, 'customer']
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = generateAuthToken(user);

    res.status(201).json({
      status: 'success',
      message: 'Account created successfully',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Customer signup error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create account',
      error: error.message
    });
  }
};

/**
 * Customer Login
 */
const customerLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const result = await query(
      'SELECT id, name, email, password_hash, phone, role FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = generateAuthToken(user);

    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Customer login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Login failed',
      error: error.message
    });
  }
};

/**
 * Restaurant Signup
 */
const restaurantSignup = async (req, res) => {
  try {
    const { 
      name, email, password, phone, address, city, 
      cuisine_type, latitude, longitude 
    } = req.body;

    // Check if restaurant already exists
    const existingRestaurant = await query(
      'SELECT id FROM restaurants WHERE email = $1',
      [email]
    );

    if (existingRestaurant.rows.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Email already registered'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Insert restaurant into database
    const result = await query(
      `INSERT INTO restaurants 
       (name, email, password_hash, phone, address, city, cuisine_type, latitude, longitude, role, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
       RETURNING id, name, email, phone, city, role, created_at`,
      [name, email, hashedPassword, phone, address, city, cuisine_type, 
       latitude || 12.9716, longitude || 77.5946, 'restaurant', false] // is_active = false until admin approves
    );

    const restaurant = result.rows[0];

    // Generate JWT token
    const token = generateAuthToken(restaurant);

    res.status(201).json({
      status: 'success',
      message: 'Restaurant registered successfully. Your account will be activated after admin verification.',
      data: {
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          email: restaurant.email,
          phone: restaurant.phone,
          city: restaurant.city,
          role: restaurant.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Restaurant signup error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to register restaurant',
      error: error.message
    });
  }
};

/**
 * Restaurant Login
 */
const restaurantLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find restaurant by email
    const result = await query(
      'SELECT id, name, email, password_hash, phone, role, is_active FROM restaurants WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    const restaurant = result.rows[0];

    // Check if restaurant is active
    if (!restaurant.is_active) {
      return res.status(403).json({
        status: 'error',
        message: 'Your account is pending activation. Please contact admin.'
      });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, restaurant.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = generateAuthToken(restaurant);

    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          email: restaurant.email,
          phone: restaurant.phone,
          role: restaurant.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Restaurant login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Login failed',
      error: error.message
    });
  }
};

/**
 * Get Current User Profile
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let result;
    
    if (role === 'customer') {
      result = await query(
        'SELECT id, name, email, phone, role, created_at FROM users WHERE id = $1',
        [userId]
      );
    } else if (role === 'restaurant') {
      result = await query(
        `SELECT id, name, email, phone, address, city, cuisine_type, 
         rating, is_active, role, created_at FROM restaurants WHERE id = $1`,
        [userId]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

/**
 * Get all customers (Admin only - we'll add later)
 * For now, any authenticated user can access
 */
const getAllCustomers = async (req, res) => {
  try {
    const { limit = 50, offset = 0, search } = req.query;

    let sql = `
      SELECT 
        id, name, email, phone, role, created_at,
        (SELECT COUNT(*) FROM orders WHERE customer_id = users.id) as total_orders
      FROM users 
      WHERE role = 'customer'
    `;

    const params = [];
    let paramCount = 0;

    // Search by name or email
    if (search) {
      paramCount++;
      sql += ` AND (LOWER(name) LIKE LOWER($${paramCount}) OR LOWER(email) LIKE LOWER($${paramCount}))`;
      params.push(`%${search}%`);
    }

    sql += ` ORDER BY created_at DESC`;

    // Pagination
    paramCount++;
    sql += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    paramCount++;
    sql += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await query(sql, params);

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM users WHERE role = 'customer'`
    );

    res.json({
      status: 'success',
      count: result.rows.length,
      total: parseInt(countResult.rows[0].count),
      data: result.rows
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch customers',
      error: error.message
    });
  }
};

module.exports = {
  customerSignup,
  customerLogin,
  restaurantSignup,
  restaurantLogin,
  getProfile,
  getAllCustomers
};
