// src/services/api.js - API service for backend communication
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  signup: (data) => api.post('/auth/customer/signup', data),
  login: (data) => api.post('/auth/customer/login', data),
  getProfile: () => api.get('/auth/profile'),
};

// Restaurant APIs
export const restaurantAPI = {
  getAll: (params) => api.get('/restaurants', { params }),
  getById: (id) => api.get(`/restaurants/${id}`),
  getMenu: (id) => api.get(`/menu/restaurant/${id}`),
};

// Address APIs
export const addressAPI = {
  getAll: () => api.get('/addresses'),
  add: (data) => api.post('/addresses', data),
  update: (id, data) => api.put(`/addresses/${id}`, data),
  delete: (id) => api.delete(`/addresses/${id}`),
};

// Order APIs
export const orderAPI = {
  create: (data) => api.post('/orders/create', data),
  getMyOrders: (params) => api.get('/orders/my-orders', { params }),
  getDetails: (id) => api.get(`/orders/${id}`),
  createPayment: (data) => api.post('/orders/payment/create', data),
  verifyPayment: (data) => api.post('/orders/payment/verify', data),
};

// Review APIs
export const reviewAPI = {
  submit: (data) => api.post('/reviews', data),
  getMyReviews: () => api.get('/reviews/my-reviews'),
  canReview: (orderId) => api.get(`/reviews/can-review/${orderId}`),
  getRestaurantReviews: (restaurantId) => api.get(`/reviews/restaurant/${restaurantId}`),
};

export default api;
