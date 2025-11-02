// controllers/deliveryController.js - Delivery partner management
const { query, getClient } = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateAuthToken } = require('../utils/jwt');

/**
 * Delivery Partner Signup
 */
const deliveryPartnerSignup = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      vehicle_type,
      vehicle_number,
      license_number
    } = req.body;

    // Check if already exists
    const existingPartner = await query(
      'SELECT id FROM delivery_partners WHERE email = $1',
      [email]
    );

    if (existingPartner.rows.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Email already registered'
      });
    }

    const hashedPassword = await hashPassword(password);

    const result = await query(
      `INSERT INTO delivery_partners 
       (name, email, password_hash, phone, vehicle_type, vehicle_number, 
        license_number, role, is_active, is_available)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, name, email, phone, vehicle_type, role`,
      [name, email, hashedPassword, phone, vehicle_type, vehicle_number,
       license_number, 'delivery_partner', false, false]
    );

    const partner = result.rows[0];
    const token = generateAuthToken(partner);

    res.status(201).json({
      status: 'success',
      message: 'Delivery partner registered. Awaiting admin approval.',
      data: {
        partner,
        token
      }
    });
  } catch (error) {
    console.error('Delivery partner signup error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Registration failed',
      error: error.message
    });
  }
};

/**
 * Delivery Partner Login
 */
const deliveryPartnerLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await query(
      `SELECT id, name, email, password_hash, phone, vehicle_type, 
              is_active, is_available, role 
       FROM delivery_partners WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    const partner = result.rows[0];

    if (!partner.is_active) {
      return res.status(403).json({
        status: 'error',
        message: 'Your account is pending admin approval'
      });
    }

    const isPasswordValid = await comparePassword(password, partner.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    const token = generateAuthToken(partner);

    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        partner: {
          id: partner.id,
          name: partner.name,
          email: partner.email,
          phone: partner.phone,
          vehicle_type: partner.vehicle_type,
          is_available: partner.is_available,
          role: partner.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Delivery partner login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Login failed',
      error: error.message
    });
  }
};

/**
 * Toggle Availability (Online/Offline)
 */
const toggleAvailability = async (req, res) => {
  try {
    const partnerId = req.user.id;

    const result = await query(
      `UPDATE delivery_partners 
       SET is_available = NOT is_available, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, name, is_available`,
      [partnerId]
    );

    res.json({
      status: 'success',
      message: `You are now ${result.rows[0].is_available ? 'online' : 'offline'}`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Toggle availability error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update availability',
      error: error.message
    });
  }
};

/**
 * Get Available Orders (for delivery partners to pick)
 */
const getAvailableOrders = async (req, res) => {
  try {
    const partnerId = req.user.id;

    // Check if partner is available
    const partnerCheck = await query(
      'SELECT is_available FROM delivery_partners WHERE id = $1',
      [partnerId]
    );

    if (!partnerCheck.rows[0].is_available) {
      return res.json({
        status: 'success',
        message: 'You are offline. Go online to see available orders.',
        data: []
      });
    }

    // Get orders that are ready for pickup and not assigned
    const result = await query(
      `SELECT 
        o.id, o.total_amount, o.status, o.created_at,
        r.name as restaurant_name,
        r.address as restaurant_address,
        r.phone as restaurant_phone,
        r.latitude as restaurant_lat,
        r.longitude as restaurant_lng,
        a.address_line1 as delivery_address,
        a.city as delivery_city,
        a.latitude as delivery_lat,
        a.longitude as delivery_lng,
        u.name as customer_name,
        u.phone as customer_phone
       FROM orders o
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       LEFT JOIN addresses a ON o.delivery_address_id = a.id
       LEFT JOIN users u ON o.customer_id = u.id
       WHERE o.status = 'ready' 
       AND (o.delivery_partner_id IS NULL OR o.delivery_partner_id = $1)
       ORDER BY o.created_at ASC
       LIMIT 20`,
      [partnerId]
    );

    res.json({
      status: 'success',
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Get available orders error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

/**
 * Accept Order
 */
const acceptOrder = async (req, res) => {
  const client = await getClient();

  try {
    const partnerId = req.user.id;
    const { order_id } = req.params;

    await client.query('BEGIN');

    // Check if order is still available
    const orderCheck = await client.query(
      `SELECT id, status, delivery_partner_id 
       FROM orders 
       WHERE id = $1`,
      [order_id]
    );

    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    const order = orderCheck.rows[0];

    if (order.delivery_partner_id && order.delivery_partner_id !== partnerId) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: 'error',
        message: 'Order already assigned to another partner'
      });
    }

    if (order.status !== 'ready') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: 'error',
        message: 'Order is not ready for pickup'
      });
    }

    // Assign order to partner
    const result = await client.query(
      `UPDATE orders 
       SET delivery_partner_id = $1, 
           status = 'picked_up',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [partnerId, order_id]
    );

    await client.query('COMMIT');

    res.json({
      status: 'success',
      message: 'Order accepted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Accept order error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to accept order',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Get My Active Deliveries
 */
const getMyDeliveries = async (req, res) => {
  try {
    const partnerId = req.user.id;

    const result = await query(
      `SELECT 
        o.*,
        r.name as restaurant_name,
        r.address as restaurant_address,
        r.phone as restaurant_phone,
        a.address_line1 as delivery_address,
        a.city as delivery_city,
        u.name as customer_name,
        u.phone as customer_phone
       FROM orders o
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       LEFT JOIN addresses a ON o.delivery_address_id = a.id
       LEFT JOIN users u ON o.customer_id = u.id
       WHERE o.delivery_partner_id = $1
       AND o.status IN ('picked_up', 'in_transit')
       ORDER BY o.created_at DESC`,
      [partnerId]
    );

    res.json({
      status: 'success',
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Get my deliveries error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch deliveries',
      error: error.message
    });
  }
};

/**
 * Update Delivery Status
 */
const updateDeliveryStatus = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const { order_id } = req.params;
    const { status, latitude, longitude } = req.body;

    const validStatuses = ['picked_up', 'in_transit', 'delivered'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid status'
      });
    }

    // Update order status
    const orderResult = await query(
      `UPDATE orders 
       SET status = $1, 
           actual_delivery_time = CASE WHEN $2 = 'delivered' THEN CURRENT_TIMESTAMP ELSE actual_delivery_time END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND delivery_partner_id = $4
       RETURNING *`,
      [status, status, order_id, partnerId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found or not assigned to you'
      });
    }

    // Update partner location
    if (latitude && longitude) {
      await query(
        `UPDATE delivery_partners 
         SET current_latitude = $1, current_longitude = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [latitude, longitude, partnerId]
      );
    }

    res.json({
      status: 'success',
      message: 'Status updated successfully',
      data: orderResult.rows[0]
    });
  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update status',
      error: error.message
    });
  }
};

/**
 * Get Delivery History
 */
const getDeliveryHistory = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    const result = await query(
      `SELECT 
        o.id, o.total_amount, o.status, o.created_at, o.actual_delivery_time,
        r.name as restaurant_name,
        u.name as customer_name
       FROM orders o
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       LEFT JOIN users u ON o.customer_id = u.id
       WHERE o.delivery_partner_id = $1
       AND o.status = 'delivered'
       ORDER BY o.actual_delivery_time DESC
       LIMIT $2 OFFSET $3`,
      [partnerId, parseInt(limit), parseInt(offset)]
    );

    res.json({
      status: 'success',
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Get delivery history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch history',
      error: error.message
    });
  }
};

/**
 * Get Partner Stats
 */
const getPartnerStats = async (req, res) => {
  try {
    const partnerId = req.user.id;

    const stats = await query(
      `SELECT 
        COUNT(*) as total_deliveries,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_deliveries,
        SUM(CASE WHEN status = 'delivered' THEN delivery_fee ELSE 0 END) as total_earnings
       FROM orders
       WHERE delivery_partner_id = $1`,
      [partnerId]
    );

    const todayStats = await query(
      `SELECT 
        COUNT(*) as today_deliveries,
        SUM(delivery_fee) as today_earnings
       FROM orders
       WHERE delivery_partner_id = $1
       AND status = 'delivered'
       AND DATE(actual_delivery_time) = CURRENT_DATE`,
      [partnerId]
    );

    res.json({
      status: 'success',
      data: {
        overall: stats.rows[0],
        today: todayStats.rows[0]
      }
    });
  } catch (error) {
    console.error('Get partner stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch stats',
      error: error.message
    });
  }
};

module.exports = {
  deliveryPartnerSignup,
  deliveryPartnerLogin,
  toggleAvailability,
  getAvailableOrders,
  acceptOrder,
  getMyDeliveries,
  updateDeliveryStatus,
  getDeliveryHistory,
  getPartnerStats
};
