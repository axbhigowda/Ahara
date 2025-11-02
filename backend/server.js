// server.js - Main Express server
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Delivery App API is running',
    timestamp: new Date().toISOString()
  });
});

// Import routes
const authRoutes = require('./routes/authRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const addressRoutes = require('./routes/addressRoutes');
const adminRoutes = require('./routes/adminRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');

// API Routes
app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to Ahara API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      restaurants: '/api/restaurants/*',
      menu: '/api/menu/*',
      orders: '/api/orders/*',
      addresses: '/api/addresses/*',
      admin: '/api/admin/*',
      testDb: '/api/test-db'
    }
  });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/delivery', deliveryRoutes);

// Test database connection endpoint
app.get('/api/test-db', async (req, res) => {
  const { pool } = require('./config/database');
  
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    res.json({
      status: 'success',
      message: 'Database connection successful',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    path: req.path
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('=================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}/api`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  console.log('=================================');
});

module.exports = app;
