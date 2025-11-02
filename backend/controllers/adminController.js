// controllers/adminController.js - Admin panel logic
const { query } = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateAuthToken } = require('../utils/jwt');

/**
 * Admin Login
 */
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await query(
      'SELECT id, name, email, password_hash, role FROM admin_users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    const admin = result.rows[0];

    const isPasswordValid = await comparePassword(password, admin.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    const token = generateAuthToken(admin);

    res.json({
      status: 'success',
      message: 'Admin login successful',
      data: {
        admin: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Login failed',
      error: error.message
    });
  }
};

/**
 * Get Platform Statistics
 */
const getPlatformStats = async (req, res) => {
  try {
    // Total users
    const usersResult = await query('SELECT COUNT(*) FROM users');
    const totalUsers = parseInt(usersResult.rows[0].count);

    // Total restaurants
    const restaurantsResult = await query('SELECT COUNT(*) FROM restaurants');
    const totalRestaurants = parseInt(restaurantsResult.rows[0].count);

    // Active restaurants
    const activeRestaurantsResult = await query(
      'SELECT COUNT(*) FROM restaurants WHERE is_active = true'
    );
    const activeRestaurants = parseInt(activeRestaurantsResult.rows[0].count);

    // Pending restaurants
    const pendingRestaurants = totalRestaurants - activeRestaurants;

    // Total orders
    const ordersResult = await query('SELECT COUNT(*) FROM orders');
    const totalOrders = parseInt(ordersResult.rows[0].count);

    // Total revenue
    const revenueResult = await query(
      `SELECT SUM(total_amount) as revenue 
       FROM orders 
       WHERE payment_status = 'success'`
    );
    const totalRevenue = parseFloat(revenueResult.rows[0].revenue || 0);

    // Orders by status
    const orderStatusResult = await query(
      `SELECT status, COUNT(*) as count 
       FROM orders 
       GROUP BY status`
    );

    // Recent orders (last 10)
    const recentOrdersResult = await query(
      `SELECT 
        o.id, o.total_amount, o.status, o.created_at,
        u.name as customer_name,
        r.name as restaurant_name
       FROM orders o
       LEFT JOIN users u ON o.customer_id = u.id
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       ORDER BY o.created_at DESC
       LIMIT 10`
    );

    res.json({
      status: 'success',
      data: {
        overview: {
          totalUsers,
          totalRestaurants,
          activeRestaurants,
          pendingRestaurants,
          totalOrders,
          totalRevenue: totalRevenue.toFixed(2)
        },
        ordersByStatus: orderStatusResult.rows,
        recentOrders: recentOrdersResult.rows
      }
    });
  } catch (error) {
    console.error('Get platform stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

/**
 * Get All Restaurants (with filters for pending approval)
 */
const getAllRestaurantsAdmin = async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT 
        r.*,
        (SELECT COUNT(*) FROM orders WHERE restaurant_id = r.id) as total_orders,
        (SELECT SUM(total_amount) FROM orders WHERE restaurant_id = r.id AND payment_status = 'success') as total_revenue
      FROM restaurants r
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    if (status === 'pending') {
      sql += ' AND r.is_active = false';
    } else if (status === 'active') {
      sql += ' AND r.is_active = true';
    }

    sql += ' ORDER BY r.created_at DESC';

    paramCount++;
    sql += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    paramCount++;
    sql += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await query(sql, params);

    const countResult = await query('SELECT COUNT(*) FROM restaurants');

    res.json({
      status: 'success',
      count: result.rows.length,
      total: parseInt(countResult.rows[0].count),
      data: result.rows
    });
  } catch (error) {
    console.error('Get restaurants admin error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch restaurants',
      error: error.message
    });
  }
};

/**
 * Approve Restaurant
 */
const approveRestaurant = async (req, res) => {
  try {
    const { restaurant_id } = req.params;

    const result = await query(
      `UPDATE restaurants 
       SET is_active = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, name, email, is_active`,
      [restaurant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Restaurant not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Restaurant approved successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Approve restaurant error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to approve restaurant',
      error: error.message
    });
  }
};

/**
 * Reject/Deactivate Restaurant
 */
const deactivateRestaurant = async (req, res) => {
  try {
    const { restaurant_id } = req.params;

    const result = await query(
      `UPDATE restaurants 
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, name, email, is_active`,
      [restaurant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Restaurant not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Restaurant deactivated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Deactivate restaurant error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to deactivate restaurant',
      error: error.message
    });
  }
};

/**
 * Get All Orders (across platform)
 */
const getAllOrders = async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT 
        o.*,
        u.name as customer_name,
        u.email as customer_email,
        r.name as restaurant_name,
        r.email as restaurant_email
      FROM orders o
      LEFT JOIN users u ON o.customer_id = u.id
      LEFT JOIN restaurants r ON o.restaurant_id = r.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      sql += ` AND o.status = $${paramCount}`;
      params.push(status);
    }

    sql += ' ORDER BY o.created_at DESC';

    paramCount++;
    sql += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    paramCount++;
    sql += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await query(sql, params);

    const countResult = await query('SELECT COUNT(*) FROM orders');

    res.json({
      status: 'success',
      count: result.rows.length,
      total: parseInt(countResult.rows[0].count),
      data: result.rows
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

/**
 * Get All Customers with Details
 */
const getAllCustomers = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const result = await query(
      `SELECT 
        u.id, u.name, u.email, u.phone, u.created_at,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_spent
       FROM users u
       LEFT JOIN orders o ON u.id = o.customer_id
       WHERE u.role = 'customer'
       GROUP BY u.id
       ORDER BY total_spent DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), parseInt(offset)]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM users WHERE role = $1',
      ['customer']
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

/**
 * Delete User (Admin only - use carefully)
 */
const deleteUser = async (req, res) => {
  try {
    const { user_id } = req.params;

    const result = await query(
      'DELETE FROM users WHERE id = $1 RETURNING id, name, email',
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      message: 'User deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete user',
      error: error.message
    });
  }
};

/**
 * Get All Delivery Partners
 */
const getAllDeliveryPartners = async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT 
        dp.*,
        COUNT(o.id) as total_deliveries,
        SUM(CASE WHEN o.status = 'delivered' THEN o.delivery_fee ELSE 0 END) as total_earnings
      FROM delivery_partners dp
      LEFT JOIN orders o ON dp.id = o.delivery_partner_id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    if (status === 'pending') {
      sql += ' AND dp.is_active = false';
    } else if (status === 'active') {
      sql += ' AND dp.is_active = true';
    }

    sql += ' GROUP BY dp.id ORDER BY dp.created_at DESC';

    paramCount++;
    sql += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    paramCount++;
    sql += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await query(sql, params);

    res.json({
      status: 'success',
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Get delivery partners error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch delivery partners',
      error: error.message
    });
  }
};

/**
 * Approve Delivery Partner
 */
const approveDeliveryPartner = async (req, res) => {
  try {
    const { partner_id } = req.params;

    const result = await query(
      `UPDATE delivery_partners 
       SET is_active = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, name, email, is_active`,
      [partner_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Delivery partner not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Delivery partner approved',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Approve delivery partner error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to approve delivery partner',
      error: error.message
    });
  }
};

/**
 * Deactivate Delivery Partner
 */
const deactivateDeliveryPartner = async (req, res) => {
  try {
    const { partner_id } = req.params;

    const result = await query(
      `UPDATE delivery_partners 
       SET is_active = false, is_available = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, name, email, is_active`,
      [partner_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Delivery partner not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Delivery partner deactivated',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Deactivate delivery partner error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to deactivate delivery partner',
      error: error.message
    });
  }
};

module.exports = {
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
};
