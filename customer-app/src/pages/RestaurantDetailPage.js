import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Box,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Rating,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Restaurant as RestaurantIcon,
  AccessTime as TimeIcon,
  LocalOffer as OfferIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { useCart } from '../context/CartContext';
import api from '../services/api';

function RestaurantDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, cartItems } = useCart();
  
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [customization, setCustomization] = useState('');

  useEffect(() => {
    fetchRestaurantDetails();
    fetchMenu();
  }, [id]);

  const fetchRestaurantDetails = async () => {
    try {
      const response = await api.get(`/restaurants/${id}`);
      setRestaurant(response.data.restaurant);
    } catch (err) {
      setError('Failed to load restaurant details');
      console.error(err);
    }
  };

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/menu/restaurant/${id}`);
      setMenuItems(response.data.menuItems);
    } catch (err) {
      setError('Failed to load menu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item) => {
    setSelectedItem(item);
    setItemQuantity(1);
    setCustomization('');
  };

  const handleConfirmAdd = () => {
    addToCart({
      ...selectedItem,
      quantity: itemQuantity,
      customization,
      restaurantId: id,
      restaurantName: restaurant.name
    });
    setSelectedItem(null);
    alert('Item added to cart!');
  };

  const getItemQuantityInCart = (itemId) => {
    const cartItem = cartItems.find(item => item._id === itemId);
    return cartItem ? cartItem.quantity : 0;
  };

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

  if (!restaurant) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="info">Restaurant not found</Alert>
      </Container>
    );
  }

  // Group menu items by category
  const groupedMenu = menuItems.reduce((acc, item) => {
    const category = item.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      {/* Restaurant Header */}
      <Card sx={{ mb: 4 }}>
        <Box sx={{ position: 'relative', height: 200, bgcolor: 'primary.main' }}>
          {restaurant.image && (
            <CardMedia
              component="img"
              height="200"
              image={restaurant.image}
              alt={restaurant.name}
              sx={{ objectFit: 'cover' }}
            />
          )}
        </Box>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="h4" gutterBottom>
                {restaurant.name}
              </Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                {restaurant.cuisine?.join(', ')}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                📍 {restaurant.address}
              </Typography>
              <Box display="flex" gap={2} mt={2}>
                <Chip
                  icon={<StarIcon />}
                  label={`${restaurant.rating?.toFixed(1) || 'New'} ⭐`}
                  color="primary"
                  size="small"
                />
                <Chip
                  icon={<TimeIcon />}
                  label={`${restaurant.deliveryTime || '30-40'} mins`}
                  size="small"
                />
                <Chip
                  icon={<OfferIcon />}
                  label={`₹${restaurant.minOrder || 0} min order`}
                  size="small"
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={4} textAlign="right">
              <Typography variant="h6" color={restaurant.isOpen ? 'success.main' : 'error.main'}>
                {restaurant.isOpen ? '🟢 Open Now' : '🔴 Closed'}
              </Typography>
              {cartItems.length > 0 && (
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  sx={{ mt: 2 }}
                  onClick={() => navigate('/cart')}
                >
                  View Cart ({cartItems.length} items)
                </Button>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Menu Items by Category */}
      {Object.keys(groupedMenu).map((category) => (
        <Box key={category} sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 2, fontWeight: 'bold' }}>
            {category}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            {groupedMenu[category].map((item) => (
              <Grid item xs={12} sm={6} md={4} key={item._id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {item.image && (
                    <CardMedia
                      component="img"
                      height="140"
                      image={item.image}
                      alt={item.name}
                      sx={{ objectFit: 'cover' }}
                    />
                  )}
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="start">
                      <Typography variant="h6" component="div">
                        {item.name}
                      </Typography>
                      {item.isVeg !== undefined && (
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            border: 2,
                            borderColor: item.isVeg ? 'success.main' : 'error.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
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
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {item.description}
                    </Typography>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                      <Typography variant="h6" color="primary">
                        ₹{item.price}
                      </Typography>
                      {item.isAvailable ? (
                        getItemQuantityInCart(item._id) > 0 ? (
                          <Chip
                            label={`${getItemQuantityInCart(item._id)} in cart`}
                            color="success"
                            size="small"
                          />
                        ) : (
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => handleAddToCart(item)}
                          >
                            Add
                          </Button>
                        )
                      ) : (
                        <Chip label="Not Available" size="small" color="error" />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}

      {/* Add to Cart Dialog */}
      <Dialog open={Boolean(selectedItem)} onClose={() => setSelectedItem(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Add to Cart</DialogTitle>
        <DialogContent>
          {selectedItem && (
            <>
              <Typography variant="h6" gutterBottom>
                {selectedItem.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {selectedItem.description}
              </Typography>
              <Typography variant="h6" color="primary" gutterBottom>
                ₹{selectedItem.price}
              </Typography>
              
              <Box display="flex" alignItems="center" gap={2} my={2}>
                <Typography>Quantity:</Typography>
                <IconButton onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}>
                  <RemoveIcon />
                </IconButton>
                <Typography variant="h6">{itemQuantity}</Typography>
                <IconButton onClick={() => setItemQuantity(itemQuantity + 1)}>
                  <AddIcon />
                </IconButton>
              </Box>

              <TextField
                fullWidth
                label="Special Instructions (Optional)"
                multiline
                rows={2}
                value={customization}
                onChange={(e) => setCustomization(e.target.value)}
                placeholder="E.g., Extra spicy, no onions"
                sx={{ mt: 2 }}
              />

              <Typography variant="h6" sx={{ mt: 2 }}>
                Total: ₹{selectedItem.price * itemQuantity}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedItem(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleConfirmAdd}>
            Add to Cart
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default RestaurantDetailPage;