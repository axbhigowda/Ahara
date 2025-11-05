import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  IconButton,
  Divider,
  Paper,
  TextField,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  ShoppingCart as CartIcon
} from '@mui/icons-material';
import { useCart } from '../context/CartContext';

function CartPage() {
  const navigate = useNavigate();
  const { cartItems, updateQuantity, removeFromCart, clearCart } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = subtotal > 0 ? 40 : 0;
  const tax = subtotal * 0.05; // 5% tax
  const total = subtotal + deliveryFee + tax - discount;

  const handleApplyCoupon = () => {
    // Simple coupon logic - you can enhance this
    if (couponCode === 'FIRST50') {
      setDiscount(50);
      alert('Coupon applied! ₹50 off');
    } else if (couponCode === 'SAVE100') {
      setDiscount(100);
      alert('Coupon applied! ₹100 off');
    } else {
      alert('Invalid coupon code');
      setDiscount(0);
    }
  };

  const handleProceedToCheckout = () => {
    if (cartItems.length === 0) {
      alert('Your cart is empty!');
      return;
    }
    navigate('/checkout', { state: { discount, couponCode } });
  };

  if (cartItems.length === 0) {
    return (
      <Container sx={{ mt: 8, textAlign: 'center' }}>
        <CartIcon sx={{ fontSize: 100, color: 'grey.400', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          Your cart is empty
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Add items from restaurants to get started!
        </Typography>
        <Button
          variant="contained"
          sx={{ mt: 3 }}
          onClick={() => navigate('/')}
        >
          Browse Restaurants
        </Button>
      </Container>
    );
  }

  // Group cart items by restaurant
  const itemsByRestaurant = cartItems.reduce((acc, item) => {
    const restaurantId = item.restaurantId;
    if (!acc[restaurantId]) {
      acc[restaurantId] = {
        restaurantName: item.restaurantName,
        items: []
      };
    }
    acc[restaurantId].items.push(item);
    return acc;
  }, {});

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Your Cart
      </Typography>

      <Grid container spacing={3}>
        {/* Cart Items */}
        <Grid item xs={12} md={8}>
          {Object.keys(itemsByRestaurant).map((restaurantId) => (
            <Card key={restaurantId} sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🏪 {itemsByRestaurant[restaurantId].restaurantName}
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {itemsByRestaurant[restaurantId].items.map((item) => (
                  <Box key={item._id} sx={{ mb: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={6}>
                        <Box display="flex" alignItems="start" gap={1}>
                          {item.isVeg !== undefined && (
                            <Box
                              sx={{
                                width: 16,
                                height: 16,
                                border: 2,
                                borderColor: item.isVeg ? 'success.main' : 'error.main',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mt: 0.5
                              }}
                            >
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  bgcolor: item.isVeg ? 'success.main' : 'error.main'
                                }}
                              />
                            </Box>
                          )}
                          <Box>
                            <Typography variant="body1" fontWeight="bold">
                              {item.name}
                            </Typography>
                            {item.customization && (
                              <Typography variant="caption" color="text.secondary">
                                Note: {item.customization}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </Grid>

                      <Grid item xs={6} sm={3}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <IconButton
                            size="small"
                            onClick={() => updateQuantity(item._id, item.quantity - 1)}
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <Typography>{item.quantity}</Typography>
                          <IconButton
                            size="small"
                            onClick={() => updateQuantity(item._id, item.quantity + 1)}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Grid>

                      <Grid item xs={4} sm={2}>
                        <Typography variant="body1" fontWeight="bold">
                          ₹{item.price * item.quantity}
                        </Typography>
                      </Grid>

                      <Grid item xs={2} sm={1}>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeFromCart(item._id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Grid>
                    </Grid>
                    <Divider sx={{ mt: 2 }} />
                  </Box>
                ))}
              </CardContent>
            </Card>
          ))}

          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={clearCart}
            sx={{ mt: 2 }}
          >
            Clear Cart
          </Button>
        </Grid>

        {/* Order Summary */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, position: 'sticky', top: 80 }}>
            <Typography variant="h6" gutterBottom>
              Bill Details
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography>Item Total</Typography>
              <Typography>₹{subtotal.toFixed(2)}</Typography>
            </Box>

            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography>Delivery Fee</Typography>
              <Typography>₹{deliveryFee.toFixed(2)}</Typography>
            </Box>

            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography>Taxes (5%)</Typography>
              <Typography>₹{tax.toFixed(2)}</Typography>
            </Box>

            {discount > 0 && (
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography color="success.main">Discount</Typography>
                <Typography color="success.main">-₹{discount.toFixed(2)}</Typography>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            <Box display="flex" justifyContent="space-between" mb={2}>
              <Typography variant="h6">Total</Typography>
              <Typography variant="h6" color="primary">
                ₹{total.toFixed(2)}
              </Typography>
            </Box>

            {/* Coupon Code */}
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Coupon Code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Enter coupon code"
              />
              <Button
                fullWidth
                variant="outlined"
                onClick={handleApplyCoupon}
                sx={{ mt: 1 }}
              >
                Apply Coupon
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Try: FIRST50 or SAVE100
              </Typography>
            </Box>

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleProceedToCheckout}
            >
              Proceed to Checkout
            </Button>

            <Alert severity="info" sx={{ mt: 2 }}>
              💡 Add items worth ₹{Math.max(0, 200 - subtotal)} more for free delivery!
            </Alert>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default CartPage;