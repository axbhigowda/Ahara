// controllers/orderController.js - Order management logic
const { query, getClient } = require('../config/database');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/**
 * Create new order (Customer)
 */
const createOrder = async (req, res) => {
  const client = await getClient();
  
  try {
    const customerId = req.user.id;
    const {
      restaurant_id,
      items, // Array of {menu_item_id, quantity}
      delivery_address_id,
      special_instructions
    } = req.body;

    // Validate input
    if (!restaurant_id || !items || items.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Restaurant and items are required'
      });
    }

    await client.query('BEGIN');

    // Get menu items with prices
    const menuItemIds = items.map(item => item.menu_item_id);
    const menuResult = await client.query(
      `SELECT id, name, price, is_available, restaurant_id 
       FROM menu_items 
       WHERE id = ANY($1)`,
      [menuItemIds]
    );

    if (menuResult.rows.length !== items.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: 'error',
        message: 'Some menu items not found'
      });
    }

    // Check if all items belong to same restaurant
    const allSameRestaurant = menuResult.rows.every(
      item => item.restaurant_id === restaurant_id
    );
    if (!allSameRestaurant) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: 'error',
        message: 'All items must be from the same restaurant'
      });
    }

    // Check availability
    const unavailableItems = menuResult.rows.filter(item => !item.is_available);
    if (unavailableItems.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: 'error',
        message: `Some items are unavailable: ${unavailableItems.map(i => i.name).join(', ')}`
      });
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = items.map(item => {
      const menuItem = menuResult.rows.find(m => m.id === item.menu_item_id);
      const itemTotal = parseFloat(menuItem.price) * item.quantity;
      subtotal += itemTotal;
      return {
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        price: menuItem.price,
        item_name: menuItem.name
      };
    });

    const deliveryFee = 40.00; // Fixed delivery fee
    const tax = subtotal * 0.05; // 5% tax
    const totalAmount = subtotal + deliveryFee + tax;

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders 
       (customer_id, restaurant_id, delivery_address_id, status, 
        subtotal, delivery_fee, tax, total_amount, 
        payment_method, payment_status, special_instructions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        customerId,
        restaurant_id,
        delivery_address_id,
        'pending',
        subtotal.toFixed(2),
        deliveryFee.toFixed(2),
        tax.toFixed(2),
        totalAmount.toFixed(2),
        'online', // We'll support COD later
        'pending',
        special_instructions || null
      ]
    );

    const order = orderResult.rows[0];

    // Insert order items
    for (const item of orderItems) {
      await client.query(
        `INSERT INTO order_items 
         (order_id, menu_item_id, quantity, price, item_name)
         VALUES ($1, $2, $3, $4, $5)`,
        [order.id, item.menu_item_id, item.quantity, item.price, item.item_name]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      status: 'success',
      message: 'Order created successfully',
      data: {
        order_id: order.id,
        total_amount: order.total_amount,
        status: order.status,
        items: orderItems,
        breakdown: {
          subtotal: order.subtotal,
          delivery_fee: order.delivery_fee,
          tax: order.tax,
          total: order.total_amount
        }
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create order error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create order',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Create Razorpay payment order (before payment)
 */
const createPaymentOrder = async (req, res) => {
  try {
    const { order_id } = req.body;
    const customerId = req.user.id;

    // Get order details
    const orderResult = await query(
      `SELECT id, total_amount, customer_id, status 
       FROM orders 
       WHERE id = $1 AND customer_id = $2`,
      [order_id, customerId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    const order = orderResult.rows[0];

    if (order.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: 'Order is not in pending state'
      });
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(parseFloat(order.total_amount) * 100), // Amount in paise
      currency: 'INR',
      receipt: order.id,
      notes: {
        order_id: order.id,
        customer_id: customerId
      }
    });

    res.json({
      status: 'success',
      data: {
        razorpay_order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key_id: process.env.RAZORPAY_KEY_ID
      }
    });

  } catch (error) {
    console.error('Create payment order error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create payment order',
      error: error.message
    });
  }
};

/**
 * Verify payment and update order
 */
const verifyPayment = async (req, res) => {
  const client = await getClient();
  
  try {
    const {
      order_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    // Verify signature
    const text = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        status: 'error',
        message: 'Payment verification failed'
      });
    }

    await client.query('BEGIN');

    // Update order status
    const orderResult = await client.query(
      `UPDATE orders 
       SET payment_status = 'success', status = 'confirmed'
       WHERE id = $1
       RETURNING *`,
      [order_id]
    );

    // Record transaction
    await client.query(
      `INSERT INTO transactions 
       (order_id, amount, payment_method, payment_gateway_id, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        order_id,
        orderResult.rows[0].total_amount,
        'razorpay',
        razorpay_payment_id,
        'success'
      ]
    );

    await client.query('COMMIT');

    res.json({
      status: 'success',
      message: 'Payment verified successfully',
      data: {
        order_id: order_id,
        payment_status: 'success',
        order_status: 'confirmed'
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Verify payment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Payment verification failed',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Get order details
 */
const getOrderDetails = async (req, res) => {
  try {
    const { order_id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    let whereClause = 'o.id = $1';
    const params = [order_id];

    // Customer can only see their orders
    if (userRole === 'customer') {
      whereClause += ' AND o.customer_id = $2';
      params.push(userId);
    }
    // Restaurant can only see their orders
    else if (userRole === 'restaurant') {
      whereClause += ' AND o.restaurant_id = $2';
      params.push(userId);
    }

    const orderResult = await query(
      `SELECT 
        o.*,
        r.name as restaurant_name,
        r.phone as restaurant_phone,
        r.address as restaurant_address,
        u.name as customer_name,
        u.phone as customer_phone,
        a.address_line1, a.address_line2, a.city, a.pincode
       FROM orders o
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       LEFT JOIN users u ON o.customer_id = u.id
       LEFT JOIN addresses a ON o.delivery_address_id = a.id
       WHERE ${whereClause}`,
      params
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    const order = orderResult.rows[0];

    // Get order items
    const itemsResult = await query(
      `SELECT * FROM order_items WHERE order_id = $1`,
      [order_id]
    );

    res.json({
      status: 'success',
      data: {
        order: order,
        items: itemsResult.rows
      }
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch order',
      error: error.message
    });
  }
};

/**
 * Get customer's order history
 */
const getMyOrders = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { status, limit = 20, offset = 0 } = req.query;

    let sql = `
      SELECT 
        o.id, o.restaurant_id, o.status, o.total_amount,
        o.payment_status, o.created_at,
        r.name as restaurant_name,
        r.cuisine_type,
        COUNT(oi.id) as items_count
      FROM orders o
      LEFT JOIN restaurants r ON o.restaurant_id = r.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.customer_id = $1
    `;

    const params = [customerId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      sql += ` AND o.status = $${paramCount}`;
      params.push(status);
    }

    sql += ` GROUP BY o.id, r.id ORDER BY o.created_at DESC`;
    
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
    console.error('Get my orders error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

/**
 * Get restaurant's orders
 */
const getRestaurantOrders = async (req, res) => {
  try {
    const restaurantId = req.user.id;
    const { status, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT 
        o.*,
        u.name as customer_name,
        u.phone as customer_phone,
        a.address_line1, a.city,
        COUNT(oi.id) as items_count
      FROM orders o
      LEFT JOIN users u ON o.customer_id = u.id
      LEFT JOIN addresses a ON o.delivery_address_id = a.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.restaurant_id = $1
    `;

    const params = [restaurantId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      sql += ` AND o.status = $${paramCount}`;
      params.push(status);
    }

    sql += ` GROUP BY o.id, u.id, a.id ORDER BY o.created_at DESC`;
    
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
    console.error('Get restaurant orders error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

/**
 * Update order status (Restaurant)
 */
const updateOrderStatus = async (req, res) => {
  try {
    const restaurantId = req.user.id;
    const { order_id } = req.params;
    const { status } = req.body;

    const validStatuses = ['confirmed', 'preparing', 'ready', 'picked_up', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid status'
      });
    }

    const result = await query(
      `UPDATE orders 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND restaurant_id = $3
       RETURNING *`,
      [status, order_id, restaurantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Order status updated',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update order status',
      error: error.message
    });
  }
};

module.exports = {
  createOrder,
  createPaymentOrder,
  verifyPayment,
  getOrderDetails,
  getMyOrders,
  getRestaurantOrders,
  updateOrderStatus
};
