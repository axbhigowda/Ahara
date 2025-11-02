// controllers/menuController.js - Menu management logic
const { query } = require('../config/database');

/**
 * Get menu items for a restaurant (public)
 */
const getRestaurantMenu = async (req, res) => {
  try {
    const { restaurant_id } = req.params;
    const { category, is_vegetarian, is_available } = req.query;

    let sql = `
      SELECT 
        id, restaurant_id, name, description, price, 
        category, is_vegetarian, is_available, image_url,
        created_at, updated_at
      FROM menu_items 
      WHERE restaurant_id = $1
    `;
    
    const params = [restaurant_id];
    let paramCount = 1;

    // Filter by category
    if (category) {
      paramCount++;
      sql += ` AND LOWER(category) = LOWER($${paramCount})`;
      params.push(category);
    }

    // Filter by vegetarian
    if (is_vegetarian !== undefined) {
      paramCount++;
      sql += ` AND is_vegetarian = $${paramCount}`;
      params.push(is_vegetarian === 'true');
    }

    // Filter by availability
    if (is_available !== undefined) {
      paramCount++;
      sql += ` AND is_available = $${paramCount}`;
      params.push(is_available === 'true');
    }

    sql += ` ORDER BY category, name`;

    const result = await query(sql, params);

    res.json({
      status: 'success',
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Get menu error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch menu',
      error: error.message
    });
  }
};

/**
 * Add menu item (restaurant owner only)
 */
const addMenuItem = async (req, res) => {
  try {
    const restaurantId = req.user.id;
    const {
      name,
      description,
      price,
      category,
      is_vegetarian,
      is_available,
      image_url
    } = req.body;

    // Validate required fields
    if (!name || !price) {
      return res.status(400).json({
        status: 'error',
        message: 'Name and price are required'
      });
    }

    const result = await query(
      `INSERT INTO menu_items 
       (restaurant_id, name, description, price, category, 
        is_vegetarian, is_available, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        restaurantId,
        name,
        description || null,
        price,
        category || 'Main Course',
        is_vegetarian !== undefined ? is_vegetarian : false,
        is_available !== undefined ? is_available : true,
        image_url || null
      ]
    );

    res.status(201).json({
      status: 'success',
      message: 'Menu item added successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Add menu item error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add menu item',
      error: error.message
    });
  }
};

/**
 * Update menu item (restaurant owner only)
 */
const updateMenuItem = async (req, res) => {
  try {
    const restaurantId = req.user.id;
    const { item_id } = req.params;
    const {
      name,
      description,
      price,
      category,
      is_vegetarian,
      is_available,
      image_url
    } = req.body;

    // Check if item belongs to this restaurant
    const checkResult = await query(
      'SELECT id FROM menu_items WHERE id = $1 AND restaurant_id = $2',
      [item_id, restaurantId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Menu item not found or access denied'
      });
    }

    const updates = [];
    const params = [];
    let paramCount = 0;

    if (name) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      params.push(name);
    }
    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      params.push(description);
    }
    if (price) {
      paramCount++;
      updates.push(`price = $${paramCount}`);
      params.push(price);
    }
    if (category) {
      paramCount++;
      updates.push(`category = $${paramCount}`);
      params.push(category);
    }
    if (is_vegetarian !== undefined) {
      paramCount++;
      updates.push(`is_vegetarian = $${paramCount}`);
      params.push(is_vegetarian);
    }
    if (is_available !== undefined) {
      paramCount++;
      updates.push(`is_available = $${paramCount}`);
      params.push(is_available);
    }
    if (image_url !== undefined) {
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
    params.push(item_id);

    const sql = `
      UPDATE menu_items 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(sql, params);

    res.json({
      status: 'success',
      message: 'Menu item updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update menu item',
      error: error.message
    });
  }
};

/**
 * Delete menu item (restaurant owner only)
 */
const deleteMenuItem = async (req, res) => {
  try {
    const restaurantId = req.user.id;
    const { item_id } = req.params;

    const result = await query(
      'DELETE FROM menu_items WHERE id = $1 AND restaurant_id = $2 RETURNING id',
      [item_id, restaurantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Menu item not found or access denied'
      });
    }

    res.json({
      status: 'success',
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete menu item',
      error: error.message
    });
  }
};

/**
 * Get all menu items for restaurant owner's dashboard
 */
const getMyMenu = async (req, res) => {
  try {
    const restaurantId = req.user.id;

    const result = await query(
      `SELECT * FROM menu_items 
       WHERE restaurant_id = $1 
       ORDER BY category, name`,
      [restaurantId]
    );

    res.json({
      status: 'success',
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Get my menu error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch menu',
      error: error.message
    });
  }
};

/**
 * Toggle menu item availability (quick update)
 */
const toggleAvailability = async (req, res) => {
  try {
    const restaurantId = req.user.id;
    const { item_id } = req.params;

    const result = await query(
      `UPDATE menu_items 
       SET is_available = NOT is_available, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND restaurant_id = $2
       RETURNING id, name, is_available`,
      [item_id, restaurantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Menu item not found'
      });
    }

    res.json({
      status: 'success',
      message: `Item ${result.rows[0].is_available ? 'enabled' : 'disabled'}`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Toggle availability error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to toggle availability',
      error: error.message
    });
  }
};

module.exports = {
  getRestaurantMenu,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getMyMenu,
  toggleAvailability
};
