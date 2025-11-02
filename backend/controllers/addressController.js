// controllers/addressController.js - Customer address management
const { query } = require('../config/database');

/**
 * Get all addresses for logged-in customer
 */
const getMyAddresses = async (req, res) => {
  try {
    const customerId = req.user.id;

    const result = await query(
      `SELECT * FROM addresses 
       WHERE user_id = $1 
       ORDER BY is_default DESC, created_at DESC`,
      [customerId]
    );

    res.json({
      status: 'success',
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch addresses',
      error: error.message
    });
  }
};

/**
 * Add new address
 */
const addAddress = async (req, res) => {
  try {
    const customerId = req.user.id;
    const {
      address_line1,
      address_line2,
      city,
      state,
      pincode,
      latitude,
      longitude,
      is_default
    } = req.body;

    // If this is default address, unset other default addresses
    if (is_default) {
      await query(
        'UPDATE addresses SET is_default = false WHERE user_id = $1',
        [customerId]
      );
    }

    const result = await query(
      `INSERT INTO addresses 
       (user_id, address_line1, address_line2, city, state, pincode, 
        latitude, longitude, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        customerId,
        address_line1,
        address_line2 || null,
        city,
        state,
        pincode,
        latitude || null,
        longitude || null,
        is_default || false
      ]
    );

    res.status(201).json({
      status: 'success',
      message: 'Address added successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add address',
      error: error.message
    });
  }
};

/**
 * Update address
 */
const updateAddress = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { address_id } = req.params;
    const {
      address_line1,
      address_line2,
      city,
      state,
      pincode,
      is_default
    } = req.body;

    // Check if address belongs to user
    const checkResult = await query(
      'SELECT id FROM addresses WHERE id = $1 AND user_id = $2',
      [address_id, customerId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Address not found'
      });
    }

    // If making this default, unset other defaults
    if (is_default) {
      await query(
        'UPDATE addresses SET is_default = false WHERE user_id = $1',
        [customerId]
      );
    }

    const updates = [];
    const params = [];
    let paramCount = 0;

    if (address_line1) {
      paramCount++;
      updates.push(`address_line1 = $${paramCount}`);
      params.push(address_line1);
    }
    if (address_line2 !== undefined) {
      paramCount++;
      updates.push(`address_line2 = $${paramCount}`);
      params.push(address_line2);
    }
    if (city) {
      paramCount++;
      updates.push(`city = $${paramCount}`);
      params.push(city);
    }
    if (state) {
      paramCount++;
      updates.push(`state = $${paramCount}`);
      params.push(state);
    }
    if (pincode) {
      paramCount++;
      updates.push(`pincode = $${paramCount}`);
      params.push(pincode);
    }
    if (is_default !== undefined) {
      paramCount++;
      updates.push(`is_default = $${paramCount}`);
      params.push(is_default);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No fields to update'
      });
    }

    paramCount++;
    params.push(address_id);

    const sql = `
      UPDATE addresses 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(sql, params);

    res.json({
      status: 'success',
      message: 'Address updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update address',
      error: error.message
    });
  }
};

/**
 * Delete address
 */
const deleteAddress = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { address_id } = req.params;

    const result = await query(
      'DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING id',
      [address_id, customerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Address not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Address deleted successfully'
    });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete address',
      error: error.message
    });
  }
};

module.exports = {
  getMyAddresses,
  addAddress,
  updateAddress,
  deleteAddress
};
