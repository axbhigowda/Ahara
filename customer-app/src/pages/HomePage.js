import { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Typography,
  Box,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Chip
} from '@mui/material';
import {
  Search as SearchIcon,
  Restaurant as RestaurantIcon
} from '@mui/icons-material';
import RestaurantCard from '../components/RestaurantCard';
import api from '../services/api';

function HomePage() {
  const [restaurants, setRestaurants] = useState([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('all');

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    filterRestaurants();
  }, [searchQuery, selectedCuisine, restaurants]);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const response = await api.get('/restaurants');
      
      // FIXED: Changed from response.data.restaurants to response.data.data
      const restaurantData = response.data.data || [];
      console.log('Fetched restaurants:', restaurantData); // Debug log
      
      setRestaurants(restaurantData);
      setFilteredRestaurants(restaurantData);
    } catch (err) {
      setError('Failed to load restaurants. Please try again later.');
      console.error('Error fetching restaurants:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterRestaurants = () => {
    let filtered = restaurants;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(restaurant =>
        restaurant.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        restaurant.cuisine_type?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by cuisine
    if (selectedCuisine !== 'all') {
      filtered = filtered.filter(restaurant =>
        restaurant.cuisine_type?.toLowerCase() === selectedCuisine.toLowerCase()
      );
    }

    setFilteredRestaurants(filtered);
  };

  // Get unique cuisines - FIXED: Changed from cuisine to cuisine_type
  const cuisines = ['all', ...new Set(restaurants.map(r => r.cuisine_type).filter(Boolean))];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      {/* Hero Section */}
      <Box textAlign="center" mb={4}>
        <Typography variant="h3" gutterBottom fontWeight="bold">
          Welcome to Ahara 🍽️
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Order food from the best restaurants near you
        </Typography>

        {/* Search Bar */}
        <TextField
          fullWidth
          placeholder="Search for restaurants or cuisines..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ mt: 3, maxWidth: 600, mx: 'auto' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />
      </Box>

      {/* Cuisine Filter Tabs */}
      {cuisines.length > 1 && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={selectedCuisine}
            onChange={(e, newValue) => setSelectedCuisine(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {cuisines.map(cuisine => (
              <Tab
                key={cuisine}
                label={cuisine === 'all' ? 'All' : cuisine}
                value={cuisine}
              />
            ))}
          </Tabs>
        </Box>
      )}

      {/* Results Info */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          {filteredRestaurants.length === 0 ? 'No restaurants found' : `${filteredRestaurants.length} Restaurants`}
        </Typography>
        <Chip
          label={`${restaurants.filter(r => r.is_active).length} Open Now`}
          color="success"
          size="small"
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Restaurants Grid */}
      {filteredRestaurants.length === 0 ? (
        <Box textAlign="center" mt={8}>
          <RestaurantIcon sx={{ fontSize: 100, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            {searchQuery || selectedCuisine !== 'all'
              ? 'No restaurants match your search'
              : 'No restaurants available at the moment'}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredRestaurants.map(restaurant => (
            <Grid item xs={12} sm={6} md={4} key={restaurant.id || restaurant._id}>
              <RestaurantCard restaurant={restaurant} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}

export default HomePage;