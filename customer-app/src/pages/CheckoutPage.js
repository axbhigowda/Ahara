import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Divider,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Paper
} from '@mui/material';
import {
  Add as AddIcon,
  CreditCard as CardIcon,
  AccountBalance as BankIcon
} from '@mui/icons-material';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartItems, clearCart } = useCart();
  const { user } = useAuth();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [loading, setLoading] = useState(false);
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [error, setError] = useState('');

  // New address form
  const [newAddress, setNewAddress] = useState({
    type: 'Home',
    street: '',
    area: '',
    city: '',
    state: '',
    pincode: '',
    landmark: ''
  });

  // Get discount from cart page
  const discount = location.state?.discount || 0;
  const couponCode = location.state?.couponCode || '';

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = 40;
  const tax = subtotal * 0.05;
  const total = subtotal + deliveryFee + tax - discount;

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchAddresses();
  }, [user]);

  const fetchAddresses = async () => {
    try {
      const response = await api.get('/addresses');
      setAddresses(response.data.addresses || []);
      if (response.data.addresses?.length > 0) {
        setSelectedAddress(response.data.addresses[0]._id);
      }
    } catch (err) {
      console.error('Error fetching addresses:', err);
    }
  };

  const handleAddAddress = async () => {
    try {
      const response = await api.post('/addresses', newAddress);
      setAddresses([...addresses, response.data.address]);
      setSelectedAddress(response.data.address._id);
      setShowAddressDialog(false);
      setNewAddress({
        type: 'Home',
        street: '',
        area: '',
        city: '',
        state: '',
        pincode: '',
        landmark: ''
      });
      alert('Address added successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add address');
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      alert('Please select a delivery address');
      return;
    }

    if (cartItems.length === 0) {
      alert('Your cart is empty');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get restaurant ID from cart items
      const restaurantId = cartItems[0].restaurantId;

      // Prepare order items
      const items = cartItems.map(item => ({
        menuItem: item._id,
        quantity: item.quantity,
        price: item.price,
        customization: item.customization || ''
      }));

      // Create order
      const orderData = {
        restaurant: restaurantId,
        items,
        deliveryAddress: selectedAddress,
        paymentMethod,
        totalAmount: total,
        discount: discount,
        couponCode: couponCode
      };

      const orderResponse = await api.post('/orders', orderData);
      const order = orderResponse.data.order;

      if (paymentMethod === 'online') {
        // Razorpay payment
        const res = await loadRazorpayScript();
        if (!res) {
          alert('Razorpay SDK failed to load. Please check your connection.');
          setLoading(false);
          return;
        }

        // Create Razorpay order
        const paymentResponse = await api.post('/orders/create-payment', {
          orderId: order._id,
          amount: total
        });

        const options = {
          key: 'rzp_test_RXlR3Jee44iVW5', // Replace with your Razorpay key
          amount: paymentResponse.data.amount,
          currency: 'INR',
          name: 'Ahara Food Delivery',
          description: 'Order Payment',
          order_id: paymentResponse.data.razorpayOrderId,
          handler: async function (response) {
            try {
              // Verify payment
              await api.post('/orders/verify-payment', {
                orderId: order._id,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              });

              clearCart();
              navigate(`/orders/${order._id}`, { 
                state: { message: 'Order placed successfully!' }
              });
            } catch (err) {
              alert('Payment verification failed');
              console.error(err);
            }
          },
          prefill: {
            name: user.name,
            email: user.email,
            contact: user.phone
          },
          theme: {
            color: '#1976d2'
          }
        };

        const paymentObject = new window.Razorpay(options);
        paymentObject.open();
      } else {
        // Cash on Delivery
        clearCart();
        navigate(`/orders/${order._id}`, {
          state: { message: 'Order placed successfully! Pay on delivery.' }
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Checkout
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* Left Column */}
        <Grid item xs={12} md={8}>
          {/* Delivery Address */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Delivery Address</Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => setShowAddressDialog(true)}
                >
                  Add New
                </Button>
              </Box>

              {addresses.length === 0 ? (
                <Alert severity="info">
                  No addresses found. Please add a delivery address.
                </Alert>
              ) : (
                <RadioGroup
                  value={selectedAddress}
                  onChange={(e) => setSelectedAddress(e.target.value)}
                >
                  {addresses.map((address) => (
                    <Card
                      key={address._id}
                      variant="outlined"
                      sx={{
                        mb: 1,
                        border: selectedAddress === address._id ? 2 : 1,
                        borderColor: selectedAddress === address._id ? 'primary.main' : 'grey.300'
                      }}
                    >
                      <CardContent>
                        <FormControlLabel
                          value={address._id}
                          control={<Radio />}
                          label={
                            <Box>
                              <Typography variant="body1" fontWeight="bold">
                                {address.type}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {address.street}, {address.area}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {address.city}, {address.state} - {address.pincode}
                              </Typography>
                              {address.landmark && (
                                <Typography variant="caption" color="text.secondary">
                                  Landmark: {address.landmark}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </CardContent>
                    </Card>
                  ))}
                </RadioGroup>
              )}
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Payment Method
              </Typography>

              <FormControl component="fieldset">
                <RadioGroup
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <FormControlLabel
                    value="online"
                    control={<Radio />}
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <CardIcon />
                        <Typography>Online Payment (Razorpay)</Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="cod"
                    control={<Radio />}
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <BankIcon />
                        <Typography>Cash on Delivery</Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>
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

            {/* Cart Items */}
            <Box sx={{ mb: 2, maxHeight: 200, overflowY: 'auto' }}>
              {cartItems.map((item) => (
                <Box key={item._id} display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">
                    {item.name} x {item.quantity}
                  </Typography>
                  <Typography variant="body2">
                    ₹{item.price * item.quantity}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography>Subtotal</Typography>
              <Typography>₹{subtotal.toFixed(2)}</Typography>
            </Box>

            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography>Delivery Fee</Typography>
              <Typography>₹{deliveryFee.toFixed(2)}</Typography>
            </Box>

            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography>Taxes</Typography>
              <Typography>₹{tax.toFixed(2)}</Typography>
            </Box>

            {discount > 0 && (
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography color="success.main">Discount</Typography>
                <Typography color="success.main">-₹{discount.toFixed(2)}</Typography>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            <Box display="flex" justifyContent="space-between" mb={3}>
              <Typography variant="h6">Total</Typography>
              <Typography variant="h6" color="primary">
                ₹{total.toFixed(2)}
              </Typography>
            </Box>

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handlePlaceOrder}
              disabled={loading || addresses.length === 0}
            >
              {loading ? <CircularProgress size={24} /> : 'Place Order'}
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Add Address Dialog */}
      <Dialog
        open={showAddressDialog}
        onClose={() => setShowAddressDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Address</DialogTitle>
        <DialogContent>
          <FormControl component="fieldset" sx={{ mb: 2, mt: 1 }}>
            <FormLabel>Address Type</FormLabel>
            <RadioGroup
              row
              value={newAddress.type}
              onChange={(e) => setNewAddress({ ...newAddress, type: e.target.value })}
            >
              <FormControlLabel value="Home" control={<Radio />} label="Home" />
              <FormControlLabel value="Work" control={<Radio />} label="Work" />
              <FormControlLabel value="Other" control={<Radio />} label="Other" />
            </RadioGroup>
          </FormControl>

          <TextField
            fullWidth
            label="Street Address"
            value={newAddress.street}
            onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
            sx={{ mb: 2 }}
            required
          />

          <TextField
            fullWidth
            label="Area/Locality"
            value={newAddress.area}
            onChange={(e) => setNewAddress({ ...newAddress, area: e.target.value })}
            sx={{ mb: 2 }}
            required
          />

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="City"
                value={newAddress.city}
                onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="State"
                value={newAddress.state}
                onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                required
              />
            </Grid>
          </Grid>

          <TextField
            fullWidth
            label="Pincode"
            value={newAddress.pincode}
            onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })}
            sx={{ mt: 2, mb: 2 }}
            required
          />

          <TextField
            fullWidth
            label="Landmark (Optional)"
            value={newAddress.landmark}
            onChange={(e) => setNewAddress({ ...newAddress, landmark: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddressDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddAddress}>
            Add Address
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default CheckoutPage;