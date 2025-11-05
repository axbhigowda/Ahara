import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Paper,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Rating,
  TextField,
  Chip
} from '@mui/material';
import {
  Restaurant as RestaurantIcon,
  TwoWheeler as BikeIcon,
  Home as HomeIcon,
  CheckCircle as CheckIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import api from '../services/api';

function TrackOrderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  useEffect(() => {
    fetchOrderDetails();
    
    // Auto-refresh every 30 seconds for active orders
    const interval = setInterval(() => {
      if (order && !['delivered', 'cancelled'].includes(order.status)) {
        fetchOrderDetails();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    // Check if we should show review dialog
    const params = new URLSearchParams(location.search);
    if (params.get('review') === 'true' && order?.status === 'delivered') {
      setShowReviewDialog(true);
    }
  }, [location, order]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/orders/${id}`);
      setOrder(response.data.order);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load order details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    try {
      await api.post('/reviews', {
        order: order._id,
        restaurant: order.restaurant._id,
        rating,
        comment
      });
      alert('Review submitted successfully!');
      setShowReviewDialog(false);
      fetchOrderDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit review');
    }
  };

  const getOrderSteps = () => {
    return [
      { label: 'Order Placed', status: 'pending' },
      { label: 'Confirmed', status: 'confirmed' },
      { label: 'Preparing', status: 'preparing' },
      { label: 'Ready for Pickup', status: 'ready' },
      { label: 'Out for Delivery', status: 'out-for-delivery' },
      { label: 'Delivered', status: 'delivered' }
    ];
  };

  const getCurrentStep = () => {
    const steps = getOrderSteps();
    const currentIndex = steps.findIndex(step => step.status === order?.status);
    return currentIndex >= 0 ? currentIndex : 0;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !order) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error || 'Order not found'}</Alert>
        <Button onClick={() => navigate('/orders')} sx={{ mt: 2 }}>
          Back to Orders
        </Button>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      {location.state?.message && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {location.state.message}
        </Alert>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Track Order
        </Typography>
        <Chip
          label={order.status.replace('-', ' ').toUpperCase()}
          color={order.status === 'delivered' ? 'success' : order.status === 'cancelled' ? 'error' : 'primary'}
        />
      </Box>

      <Grid container spacing={3}>
        {/* Left Column - Order Progress */}
        <Grid item xs={12} md={8}>
          {/* Order Status Stepper */}
          {order.status !== 'cancelled' && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Stepper activeStep={getCurrentStep()} orientation="vertical">
                  {getOrderSteps().map((step, index) => (
                    <Step key={step.status}>
                      <StepLabel
                        StepIconComponent={() => (
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: index <= getCurrentStep() ? 'primary.main' : 'grey.300',
                              color: 'white'
                            }}
                          >
                            {index < getCurrentStep() ? (
                              <CheckIcon />
                            ) : index === 0 ? (
                              <RestaurantIcon />
                            ) : index === 4 ? (
                              <BikeIcon />
                            ) : index === 5 ? (
                              <HomeIcon />
                            ) : (
                              index + 1
                            )}
                          </Box>
                        )}
                      >
                        <Typography variant="body1" fontWeight="bold">
                          {step.label}
                        </Typography>
                        {order.status === step.status && (
                          <Typography variant="caption" color="text.secondary">
                            Current Status
                          </Typography>
                        )}
                      </StepLabel>
                    </Step>
                  ))}
                </Stepper>
              </CardContent>
            </Card>
          )}

          {order.status === 'cancelled' && (
            <Alert severity="error" sx={{ mb: 3 }}>
              This order has been cancelled.
            </Alert>
          )}

          {/* Restaurant Details */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🏪 Restaurant Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body1" fontWeight="bold">
                {order.restaurant?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {order.restaurant?.address}
              </Typography>
              {order.restaurant?.phone && (
                <Button
                  startIcon={<PhoneIcon />}
                  href={`tel:${order.restaurant.phone}`}
                  sx={{ mt: 1 }}
                >
                  Call Restaurant
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Delivery Partner Details */}
          {order.deliveryPartner && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🏍️ Delivery Partner
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body1" fontWeight="bold">
                  {order.deliveryPartner.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {order.deliveryPartner.vehicleNumber}
                </Typography>
                <Button
                  startIcon={<PhoneIcon />}
                  href={`tel:${order.deliveryPartner.phone}`}
                  sx={{ mt: 1 }}
                >
                  Call Delivery Partner
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Delivery Address */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📍 Delivery Address
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body1">
                {order.deliveryAddress?.type}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {order.deliveryAddress?.street}, {order.deliveryAddress?.area}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {order.deliveryAddress?.city}, {order.deliveryAddress?.state} - {order.deliveryAddress?.pincode}
              </Typography>
              {order.deliveryAddress?.landmark && (
                <Typography variant="body2" color="text.secondary">
                  Landmark: {order.deliveryAddress.landmark}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Order Summary */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, position: 'sticky', top: 80 }}>
            <Typography variant="h6" gutterBottom>
              Order Summary
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Typography variant="body2" color="text.secondary" gutterBottom>
              Order ID: #{order._id?.slice(-8)}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Placed on: {formatDate(order.createdAt)}
            </Typography>

            <Divider sx={{ my: 2 }} />

            {/* Order Items */}
            <Typography variant="subtitle2" gutterBottom>
              Items
            </Typography>
            {order.items?.map((item, index) => (
              <Box key={index} display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">
                  {item.menuItem?.name} x {item.quantity}
                </Typography>
                <Typography variant="body2">
                  ₹{(item.price * item.quantity).toFixed(2)}
                </Typography>
              </Box>
            ))}

            <Divider sx={{ my: 2 }} />

            {/* Pricing */}
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2">Subtotal</Typography>
              <Typography variant="body2">
                ₹{order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
              </Typography>
            </Box>

            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2">Delivery Fee</Typography>
              <Typography variant="body2">₹40.00</Typography>
            </Box>

            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2">Taxes</Typography>
              <Typography variant="body2">
                ₹{(order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 0.05).toFixed(2)}
              </Typography>
            </Box>

            {order.discount > 0 && (
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="success.main">Discount</Typography>
                <Typography variant="body2" color="success.main">
                  -₹{order.discount?.toFixed(2)}
                </Typography>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            <Box display="flex" justifyContent="space-between" mb={2}>
              <Typography variant="h6">Total</Typography>
              <Typography variant="h6" color="primary">
                ₹{order.totalAmount?.toFixed(2)}
              </Typography>
            </Box>

            <Chip
              label={order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid Online'}
              color={order.paymentMethod === 'cod' ? 'warning' : 'success'}
              size="small"
              sx={{ mb: 2 }}
            />

            {order.status === 'delivered' && !order.review && (
              <Button
                fullWidth
                variant="contained"
                onClick={() => setShowReviewDialog(true)}
                sx={{ mt: 2 }}
              >
                Rate this Order
              </Button>
            )}

            {order.review && (
              <Alert severity="success" sx={{ mt: 2 }}>
                ⭐ You rated this order {order.review.rating}/5
              </Alert>
            )}

            <Button
              fullWidth
              variant="outlined"
              onClick={() => navigate('/orders')}
              sx={{ mt: 2 }}
            >
              Back to Orders
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onClose={() => setShowReviewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Rate Your Experience</DialogTitle>
        <DialogContent>
          <Box textAlign="center" mb={2}>
            <Typography variant="body1" gutterBottom>
              How was your order from {order.restaurant?.name}?
            </Typography>
            <Rating
              value={rating}
              onChange={(e, newValue) => setRating(newValue)}
              size="large"
              sx={{ mt: 2 }}
            />
          </Box>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Comments (Optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us about your experience..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReviewDialog(false)}>Skip</Button>
          <Button variant="contained" onClick={handleSubmitReview}>
            Submit Review
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default TrackOrderPage;