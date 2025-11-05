import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import {
  Restaurant as RestaurantIcon,
  LocalShipping as DeliveryIcon,
  AccessTime as TimeIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';
import api from '../services/api';

function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/orders/my-orders');
      setOrders(response.data.orders || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load orders');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      confirmed: 'info',
      preparing: 'primary',
      ready: 'success',
      'out-for-delivery': 'secondary',
      delivered: 'success',
      cancelled: 'error'
    };
    return colors[status] || 'default';
  };

  const getStatusIcon = (status) => {
    if (['pending', 'confirmed', 'preparing'].includes(status)) {
      return <RestaurantIcon />;
    } else if (['ready', 'out-for-delivery'].includes(status)) {
      return <DeliveryIcon />;
    }
    return <ReceiptIcon />;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter orders based on active tab
  const filterOrders = () => {
    switch (activeTab) {
      case 0: // All
        return orders;
      case 1: // Active
        return orders.filter(order => 
          !['delivered', 'cancelled'].includes(order.status)
        );
      case 2: // Completed
        return orders.filter(order => order.status === 'delivered');
      case 3: // Cancelled
        return orders.filter(order => order.status === 'cancelled');
      default:
        return orders;
    }
  };

  const filteredOrders = filterOrders();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        My Orders
      </Typography>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label={`All (${orders.length})`} />
          <Tab label={`Active (${orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length})`} />
          <Tab label={`Completed (${orders.filter(o => o.status === 'delivered').length})`} />
          <Tab label={`Cancelled (${orders.filter(o => o.status === 'cancelled').length})`} />
        </Tabs>
      </Box>

      {filteredOrders.length === 0 ? (
        <Box textAlign="center" mt={8}>
          <ReceiptIcon sx={{ fontSize: 100, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No orders found
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {activeTab === 0 ? 'Start ordering to see your order history!' : 'No orders in this category'}
          </Typography>
          {activeTab === 0 && (
            <Button
              variant="contained"
              sx={{ mt: 2 }}
              onClick={() => navigate('/')}
            >
              Browse Restaurants
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filteredOrders.map((order) => (
            <Grid item xs={12} key={order._id}>
              <Card>
                <CardContent>
                  <Grid container spacing={2}>
                    {/* Left Section */}
                    <Grid item xs={12} md={8}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Chip
                          icon={getStatusIcon(order.status)}
                          label={order.status.replace('-', ' ').toUpperCase()}
                          color={getStatusColor(order.status)}
                          size="small"
                        />
                        <Chip
                          label={order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid Online'}
                          size="small"
                          variant="outlined"
                        />
                      </Box>

                      <Typography variant="h6" gutterBottom>
                        🏪 {order.restaurant?.name || 'Restaurant'}
                      </Typography>

                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <TimeIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(order.createdAt)}
                        </Typography>
                      </Box>

                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Order ID: #{order._id?.slice(-8)}
                      </Typography>

                      <Divider sx={{ my: 1 }} />

                      {/* Order Items */}
                      <Box sx={{ mt: 1 }}>
                        {order.items?.slice(0, 3).map((item, index) => (
                          <Typography key={index} variant="body2" color="text.secondary">
                            • {item.menuItem?.name || 'Item'} x {item.quantity}
                          </Typography>
                        ))}
                        {order.items?.length > 3 && (
                          <Typography variant="body2" color="text.secondary">
                            + {order.items.length - 3} more items
                          </Typography>
                        )}
                      </Box>

                      {order.deliveryPartner && (
                        <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Delivery Partner
                          </Typography>
                          <Typography variant="body2">
                            {order.deliveryPartner.name} • {order.deliveryPartner.phone}
                          </Typography>
                        </Box>
                      )}
                    </Grid>

                    {/* Right Section */}
                    <Grid item xs={12} md={4}>
                      <Box textAlign="right">
                        <Typography variant="h5" color="primary" gutterBottom>
                          ₹{order.totalAmount?.toFixed(2)}
                        </Typography>

                        <Button
                          variant="outlined"
                          fullWidth
                          onClick={() => navigate(`/orders/${order._id}`)}
                          sx={{ mb: 1 }}
                        >
                          Track Order
                        </Button>

                        {order.status === 'delivered' && !order.review && (
                          <Button
                            variant="contained"
                            fullWidth
                            onClick={() => navigate(`/orders/${order._id}?review=true`)}
                          >
                            Rate Order
                          </Button>
                        )}

                        {order.status === 'delivered' && (
                          <Button
                            variant="text"
                            fullWidth
                            sx={{ mt: 1 }}
                            onClick={() => {
                              // Reorder functionality
                              alert('Reorder feature coming soon!');
                            }}
                          >
                            Reorder
                          </Button>
                        )}

                        {order.status === 'pending' && (
                          <Button
                            variant="outlined"
                            color="error"
                            fullWidth
                            sx={{ mt: 1 }}
                            onClick={async () => {
                              if (window.confirm('Are you sure you want to cancel this order?')) {
                                try {
                                  await api.patch(`/orders/${order._id}/cancel`);
                                  alert('Order cancelled successfully');
                                  fetchOrders();
                                } catch (err) {
                                  alert('Failed to cancel order');
                                }
                              }
                            }}
                          >
                            Cancel Order
                          </Button>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}

export default OrdersPage;