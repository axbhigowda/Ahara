// controllers/reviewController.js - Reviews and ratings management
const { query, getClient } = require('../config/database');

/**
 * Submit Review (Customer only, after order delivered)
 */
const submitReview = async (req, res) => {
  const client = await getClient();

  try {
    const customerId = req.user.id;
    const {
      order_id,
      restaurant_rating,
      restaurant_review,
      delivery_rating,
      delivery_review
    } = req.body;

    await client.query('BEGIN');

    // Check if order exists and belongs to customer
    const orderCheck = await client.query(
      `SELECT id, restaurant_id, delivery_partner_id, status 
       FROM orders 
       WHERE id = $1 AND customer_id = $2`,
      [order_id, customerId]
    );

    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    const order = orderCheck.rows[0];

    if (order.status !== 'delivered') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: 'error',
        message: 'You can only review delivered orders'
      });
    }

    // Check if already reviewed
    const existingReview = await client.query(
      'SELECT id FROM reviews WHERE order_id = $1',
      [order_id]
    );

    if (existingReview.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: 'error',
        message: 'You have already reviewed this order'
      });
    }

    // Insert review
    const reviewResult = await client.query(
      `INSERT INTO reviews 
       (order_id, user_id, restaurant_id, delivery_partner_id,
        restaurant_rating, restaurant_review, delivery_rating, delivery_review)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        order_id,
        customerId,
        order.restaurant_id,
        order.delivery_partner_id,
        restaurant_rating,
        restaurant_review || null,
        delivery_rating || null,
        delivery_review || null
      ]
    );

    // Update restaurant rating
    if (restaurant_rating) {
      await client.query(
        `UPDATE restaurants 
         SET 
           total_ratings = total_ratings + 1,
           rating = (
             SELECT ROUND(AVG(restaurant_rating)::numeric, 1)
             FROM reviews
             WHERE restaurant_id = $1 AND restaurant_rating IS NOT NULL
           )
         WHERE id = $1`,
        [order.restaurant_id]
      );
    }

    // Update delivery partner rating
    if (delivery_rating && order.delivery_partner_id) {
      await client.query(
        `UPDATE delivery_partners 
         SET 
           total_ratings = total_ratings + 1,
           rating = (
             SELECT ROUND(AVG(delivery_rating)::numeric, 1)
             FROM reviews
             WHERE delivery_partner_id = $1 AND delivery_rating IS NOT NULL
           )
         WHERE id = $1`,
        [order.delivery_partner_id]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      status: 'success',
      message: 'Review submitted successfully',
      data: reviewResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Submit review error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to submit review',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Get Restaurant Reviews
 */
const getRestaurantReviews = async (req, res) => {
  try {
    const { restaurant_id } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const result = await query(
      `SELECT 
        r.id,
        r.restaurant_rating,
        r.restaurant_review,
        r.created_at,
        u.name as customer_name,
        o.id as order_id
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN orders o ON r.order_id = o.id
       WHERE r.restaurant_id = $1 AND r.restaurant_rating IS NOT NULL
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [restaurant_id, parseInt(limit), parseInt(offset)]
    );

    // Get average rating and count
    const statsResult = await query(
      `SELECT 
        ROUND(AVG(restaurant_rating)::numeric, 1) as avg_rating,
        COUNT(*) as total_reviews
       FROM reviews
       WHERE restaurant_id = $1 AND restaurant_rating IS NOT NULL`,
      [restaurant_id]
    );

    res.json({
      status: 'success',
      stats: statsResult.rows[0],
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Get restaurant reviews error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch reviews',
      error: error.message
    });
  }
};

/**
 * Get Delivery Partner Reviews
 */
const getDeliveryPartnerReviews = async (req, res) => {
  try {
    const { partner_id } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const result = await query(
      `SELECT 
        r.id,
        r.delivery_rating,
        r.delivery_review,
        r.created_at,
        u.name as customer_name
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.delivery_partner_id = $1 AND r.delivery_rating IS NOT NULL
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [partner_id, parseInt(limit), parseInt(offset)]
    );

    const statsResult = await query(
      `SELECT 
        ROUND(AVG(delivery_rating)::numeric, 1) as avg_rating,
        COUNT(*) as total_reviews
       FROM reviews
       WHERE delivery_partner_id = $1 AND delivery_rating IS NOT NULL`,
      [partner_id]
    );

    res.json({
      status: 'success',
      stats: statsResult.rows[0],
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Get delivery partner reviews error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch reviews',
      error: error.message
    });
  }
};

/**
 * Get My Reviews (Customer's own reviews)
 */
const getMyReviews = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    const result = await query(
      `SELECT 
        r.*,
        res.name as restaurant_name,
        o.total_amount,
        o.created_at as order_date
       FROM reviews r
       LEFT JOIN orders o ON r.order_id = o.id
       LEFT JOIN restaurants res ON r.restaurant_id = res.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [customerId, parseInt(limit), parseInt(offset)]
    );

    res.json({
      status: 'success',
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Get my reviews error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch reviews',
      error: error.message
    });
  }
};

/**
 * Check if Order Can Be Reviewed
 */
const canReviewOrder = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { order_id } = req.params;

    // Check order status
    const orderResult = await query(
      `SELECT id, status FROM orders 
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

    if (order.status !== 'delivered') {
      return res.json({
        status: 'success',
        canReview: false,
        reason: 'Order not yet delivered'
      });
    }

    // Check if already reviewed
    const reviewResult = await query(
      'SELECT id FROM reviews WHERE order_id = $1',
      [order_id]
    );

    if (reviewResult.rows.length > 0) {
      return res.json({
        status: 'success',
        canReview: false,
        reason: 'Already reviewed'
      });
    }

    res.json({
      status: 'success',
      canReview: true
    });
  } catch (error) {
    console.error('Can review order error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check review status',
      error: error.message
    });
  }
};

/**
 * Update Review (Customer can edit their review)
 */
const updateReview = async (req, res) => {
  const client = await getClient();

  try {
    const customerId = req.user.id;
    const { review_id } = req.params;
    const {
      restaurant_rating,
      restaurant_review,
      delivery_rating,
      delivery_review
    } = req.body;

    await client.query('BEGIN');

    // Check if review belongs to customer
    const reviewCheck = await client.query(
      `SELECT id, restaurant_id, delivery_partner_id, 
              restaurant_rating as old_restaurant_rating,
              delivery_rating as old_delivery_rating
       FROM reviews 
       WHERE id = $1 AND user_id = $2`,
      [review_id, customerId]
    );

    if (reviewCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        status: 'error',
        message: 'Review not found'
      });
    }

    const oldReview = reviewCheck.rows[0];

    // Update review
    const updateResult = await client.query(
      `UPDATE reviews 
       SET restaurant_rating = COALESCE($1, restaurant_rating),
           restaurant_review = COALESCE($2, restaurant_review),
           delivery_rating = COALESCE($3, delivery_rating),
           delivery_review = COALESCE($4, delivery_review)
       WHERE id = $5
       RETURNING *`,
      [
        restaurant_rating,
        restaurant_review,
        delivery_rating,
        delivery_review,
        review_id
      ]
    );

    // Recalculate restaurant rating if changed
    if (restaurant_rating && restaurant_rating !== oldReview.old_restaurant_rating) {
      await client.query(
        `UPDATE restaurants 
         SET rating = (
           SELECT ROUND(AVG(restaurant_rating)::numeric, 1)
           FROM reviews
           WHERE restaurant_id = $1 AND restaurant_rating IS NOT NULL
         )
         WHERE id = $1`,
        [oldReview.restaurant_id]
      );
    }

    // Recalculate delivery partner rating if changed
    if (delivery_rating && delivery_rating !== oldReview.old_delivery_rating) {
      await client.query(
        `UPDATE delivery_partners 
         SET rating = (
           SELECT ROUND(AVG(delivery_rating)::numeric, 1)
           FROM reviews
           WHERE delivery_partner_id = $1 AND delivery_rating IS NOT NULL
         )
         WHERE id = $1`,
        [oldReview.delivery_partner_id]
      );
    }

    await client.query('COMMIT');

    res.json({
      status: 'success',
      message: 'Review updated successfully',
      data: updateResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update review error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update review',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Delete Review (Customer can delete their review)
 */
const deleteReview = async (req, res) => {
  const client = await getClient();

  try {
    const customerId = req.user.id;
    const { review_id } = req.params;

    await client.query('BEGIN');

    // Get review details before deleting
    const reviewResult = await client.query(
      `SELECT restaurant_id, delivery_partner_id 
       FROM reviews 
       WHERE id = $1 AND user_id = $2`,
      [review_id, customerId]
    );

    if (reviewResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        status: 'error',
        message: 'Review not found'
      });
    }

    const review = reviewResult.rows[0];

    // Delete review
    await client.query(
      'DELETE FROM reviews WHERE id = $1',
      [review_id]
    );

    // Recalculate restaurant rating
    await client.query(
      `UPDATE restaurants 
       SET 
         total_ratings = total_ratings - 1,
         rating = COALESCE((
           SELECT ROUND(AVG(restaurant_rating)::numeric, 1)
           FROM reviews
           WHERE restaurant_id = $1 AND restaurant_rating IS NOT NULL
         ), 0)
       WHERE id = $1`,
      [review.restaurant_id]
    );

    // Recalculate delivery partner rating
    if (review.delivery_partner_id) {
      await client.query(
        `UPDATE delivery_partners 
         SET 
           total_ratings = total_ratings - 1,
           rating = COALESCE((
             SELECT ROUND(AVG(delivery_rating)::numeric, 1)
             FROM reviews
             WHERE delivery_partner_id = $1 AND delivery_rating IS NOT NULL
           ), 0)
         WHERE id = $1`,
        [review.delivery_partner_id]
      );
    }

    await client.query('COMMIT');

    res.json({
      status: 'success',
      message: 'Review deleted successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete review error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete review',
      error: error.message
    });
  } finally {
    client.release();
  }
};

module.exports = {
  submitReview,
  getRestaurantReviews,
  getDeliveryPartnerReviews,
  getMyReviews,
  canReviewOrder,
  updateReview,
  deleteReview
};
