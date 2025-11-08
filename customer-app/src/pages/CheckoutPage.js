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
  Paper,
  Checkbox
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
  const { cartItems, clearCart, restaurant } = useCart();
  const { user } = useAuth();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [loading, setLoading] = useState(false);
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [error, setError] = useState('');

  // New address form - FIXED to match backend schema
  const [newAddress, setNewAddress] = useState({
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    is_default: false
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
      console.log('Addresses response:', response.data);
      
      // Backend returns data in response.data.data
      const addressList = response.data.data || [];
      setAddresses(addressList);
      
      if (addressList.length > 0) {
        // Select default address or first address
        const defaultAddr = addressList.find(addr => addr.is_default);
        setSelectedAddress(defaultAddr?.id || addressList[0].id);
      }
    } catch (err) {
      console.error('Error fetching addresses:', err);
      if (err.response?.status !== 404) {
        setError('Failed to load addresses');
      }
    }
  };

  const handleAddAddress = async () => {
    // Validate required fields
    if (!newAddress.address_line1 || !newAddress.city || 
        !newAddress.state || !newAddress.pincode) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      console.log('Sending address:', newAddress);
      
      const response = await api.post('/addresses', newAddress);
      console.log('Address added:', response.data);
      
      const savedAddress = response.data.data;
      setAddresses([...addresses, savedAddress]);
      setSelectedAddress(savedAddress.id);
      
      setShowAddressDialog(false);
      setNewAddress({
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        pincode: '',
        is_default: false
      });
      
      alert('Address added successfully!');
    } catch (err) {
      console.error('Add address error:', err);
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
      // Get restaurant ID from cart items or restaurant context
      const restaurantId = cartItems[0].restaurantId || restaurant?.id;

      if (!restaurantId) {
        throw new Error('Restaurant information not found');
      }

      // Prepare order items
      const items = cartItems.map(item => ({
        menuItem: item._id || item.id,
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

      console.log('Creating order:', orderData);
      const orderResponse = await api.post('/orders/create', orderData);
      const order = orderResponse.data.order || orderResponse.data.data;

      if (paymentMethod === 'online') {
        // Razorpay payment
        const res = await loadRazorpayScript();
        if (!res) {
          alert('Razorpay SDK failed to load. Please check your connection.');
          setLoading(false);
          return;
        }

        // Create Razorpay order
        const paymentResponse = await api.post('/orders/payment/create', {
          orderId: order.id,
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
              await api.post('/orders/payment/verify', {
                orderId: order.id,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              });

              clearCart();
              navigate(`/orders/${order.id}`, { 
                state: { message: 'Order placed successfully!' }
              });
            } catch (err) {
              alert('Payment verification failed');
              console.error(err);
            }
          },
          prefill: {
            name: user?.name || '',
            email: user?.email || '',
            contact: user?.phone || ''
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
        navigate(`/orders/${order.id}`, {
          state: { message: 'Order placed successfully! Pay on delivery.' }
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to place order');
      console.error('Order error:', err);
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
                      key={address.id}
                      variant="outlined"
                      sx={{
                        mb: 1,
                        border: selectedAddress === address.id ? 2 : 1,
                        borderColor: selectedAddress === address.id ? 'primary.main' : 'grey.300'
                      }}
                    >
                      <CardContent>
                        <FormControlLabel
                          value={address.id}
                          control={<Radio />}
                          label={
                            <Box>
                              {address.is_default && (
                                <Typography variant="caption" color="primary" fontWeight="bold">
                                  DEFAULT
                                </Typography>
                              )}
                              <Typography variant="body2" color="text.secondary">
                                {address.address_line1}
                              </Typography>
                              {address.address_line2 && (
                                <Typography variant="body2" color="text.secondary">
                                  {address.address_line2}
                                </Typography>
                              )}
                              <Typography variant="body2" color="text.secondary">
                                {address.city}, {address.state} - {address.pincode}
                              </Typography>
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
              {cartItems.map((item) => {
                const itemId = item.id || item._id;
                return (
                  <Box key={itemId} display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">
                      {item.name} x {item.quantity}
                    </Typography>
                    <Typography variant="body2">
                      ₹{item.price * item.quantity}
                    </Typography>
                  </Box>
                );
              })}
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

      {/* Add Address Dialog - FIXED to match backend schema */}
      <Dialog
        open={showAddressDialog}
        onClose={() => setShowAddressDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Address</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Address Line 1"
            value={newAddress.address_line1}
            onChange={(e) => setNewAddress({ ...newAddress, address_line1: e.target.value })}
            placeholder="Street, House No, Building Name"
            sx={{ mt: 2, mb: 2 }}
            required
          />

          <TextField
            fullWidth
            label="Address Line 2 (Optional)"
            value={newAddress.address_line2}
            onChange={(e) => setNewAddress({ ...newAddress, address_line2: e.target.value })}
            placeholder="Area, Locality, Landmark"
            sx={{ mb: 2 }}
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

          <FormControlLabel
            control={
              <Checkbox
                checked={newAddress.is_default}
                onChange={(e) => setNewAddress({ ...newAddress, is_default: e.target.checked })}
              />
            }
            label="Set as default address"
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