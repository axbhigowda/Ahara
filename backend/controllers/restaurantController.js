// controllers/restaurantController.js - Restaurant management logic
const { query } = require('../config/database');

/**
 * Get all restaurants (for customers)
 * Supports filtering by city, cuisine, rating
 */
const getAllRestaurants = async (req, res) => {
  try {
    const { city, cuisine, min_rating, search, limit = 20, offset = 0 } = req.query;
    
    let sql = `
      SELECT 
        id, name, address, city, cuisine_type, 
        rating, total_ratings, opening_time, closing_time,
        image_url, latitude, longitude, is_active
      FROM restaurants 
      WHERE is_active = true
    `;
    
    const params = [];
    let paramCount = 0;

    // Filter by city
    if (city) {
      paramCount++;
      sql += ` AND LOWER(city) = LOWER($${paramCount})`;
      params.push(city);
    }

    // Filter by cuisine
    if (cuisine) {
      paramCount++;
      sql += ` AND LOWER(cuisine_type) LIKE LOWER($${paramCount})`;
      params.push(`%${cuisine}%`);
    }

    // Filter by minimum rating
    if (min_rating) {
      paramCount++;
      sql += ` AND rating >= $${paramCount}`;
      params.push(parseFloat(min_rating));
    }

    // Search by name
    if (search) {
      paramCount++;
      sql += ` AND LOWER(name) LIKE LOWER($${paramCount})`;
      params.push(`%${search}%`);
    }

    sql += ` ORDER BY rating DESC, total_ratings DESC`;
    
    // Pagination
    paramCount++;
    sql += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));
    
    paramCount++;
    sql += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await query(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) FROM restaurants WHERE is_active = true';
    const countResult = await query(countSql);

    res.json({
      status: 'success',
      count: result.rows.length,
      total: parseInt(countResult.rows[0].count),
      data: result.rows
    });
  } catch (error) {
    console.error('Get restaurants error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch restaurants',
      error: error.message
    });
  }
};

/**
 * Get single restaurant details (for customers)
 */
const getRestaurantById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT 
        id, name, email, phone, address, city, 
        cuisine_type, opening_time, closing_time,
        rating, total_ratings, image_url, 
        latitude, longitude, is_active, created_at
       FROM restaurants 
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Restaurant not found'
      });
    }

    res.json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get restaurant error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch restaurant',
      error: error.message
    });
  }
};

/**
 * Update restaurant profile (for restaurant owners)
 */
const updateRestaurantProfile = async (req, res) => {
  try {
    const restaurantId = req.user.id;
    const { 
      name, phone, address, city, cuisine_type,
      opening_time, closing_time, image_url 
    } = req.body;

    const updates = [];
    const params = [];
    let paramCount = 0;

    if (name) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      params.push(name);
    }
    if (phone) {
      paramCount++;
      updates.push(`phone = $${paramCount}`);
      params.push(phone);
    }
    if (address) {
      paramCount++;
      updates.push(`address = $${paramCount}`);
      params.push(address);
    }
    if (city) {
      paramCount++;
      updates.push(`city = $${paramCount}`);
      params.push(city);
    }
    if (cuisine_type) {
      paramCount++;
      updates.push(`cuisine_type = $${paramCount}`);
      params.push(cuisine_type);
    }
    if (opening_time) {
      paramCount++;
      updates.push(`opening_time = $${paramCount}`);
      params.push(opening_time);
    }
    if (closing_time) {
      paramCount++;
      updates.push(`closing_time = $${paramCount}`);
      params.push(closing_time);
    }
    if (image_url) {
      paramCount++;
      updates.push(`image_url = $${paramCount}`);
      params.push(image_url);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No fields to update'
      });
    }

    paramCount++;
    params.push(restaurantId);

    const sql = `
      UPDATE restaurants 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING id, name, phone, address, city, cuisine_type, 
                opening_time, closing_time, image_url, updated_at
    `;

    const result = await query(sql, params);

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update restaurant error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

/**
 * Get restaurant's own profile (for restaurant dashboard)
 */
const getMyRestaurant = async (req, res) => {
  try {
    const restaurantId = req.user.id;

    const result = await query(
      `SELECT 
        id, name, email, phone, address, city, 
        cuisine_type, opening_time, closing_time,
        rating, total_ratings, image_url, 
        is_active, created_at, updated_at
       FROM restaurants 
       WHERE id = $1`,
      [restaurantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Restaurant not found'
      });
    }

    res.json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get my restaurant error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch restaurant details',
      error: error.message
    });
  }
};

module.exports = {
  getAllRestaurants,
  getRestaurantById,
  updateRestaurantProfile,
  getMyRestaurant
};
