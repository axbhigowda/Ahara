// src/pages/HomePage.js - Main landing page
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  Typography,
  TextField,
  Box,
  Chip,
  Rating,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Restaurant, AccessTime, Star } from '@mui/icons-material';
import { restaurantAPI } from '../services/api';

const HomePage = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async (search = '') => {
    try {
      setLoading(true);
      const params = search ? { search } : {};
      const response = await restaurantAPI.getAll(params);
      setRestaurants(response.data.data);
      setError('');
    } catch (err) {
      setError('Failed to load restaurants');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Debounce search
    const timer = setTimeout(() => {
      fetchRestaurants(value);
    }, 500);
    
    return () => clearTimeout(timer);
  };

  const handleRestaurantClick = (id) => {
    navigate(`/restaurant/${id}`);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Hero Section */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
          Order Food from Your Favorite Restaurants
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Fast delivery • Fresh food • Best prices
        </Typography>
        
        {/* Search Bar */}
        <Box sx={{ mt: 3, maxWidth: 600, mx: 'auto' }}>
          <TextField
            fullWidth
            placeholder="Search for restaurants..."
            value={searchTerm}
            onChange={handleSearch}
            variant="outlined"
          />
        </Box>
      </Box>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Restaurants Grid */}
      {!loading && restaurants.length > 0 && (
        <>
          <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
            All Restaurants ({restaurants.length})
          </Typography>
          <Grid container spacing={3}>
            {restaurants.map((restaurant) => (
              <Grid item xs={12} sm={6} md={4} key={restaurant.id}>
                <Card 
                  sx={{ 
                    height: '100%',
                    '&:hover': { 
                      transform: 'scale(1.02)',
                      transition: 'transform 0.2s',
                      boxShadow: 6,
                    }
                  }}
                >
                  <CardActionArea onClick={() => handleRestaurantClick(restaurant.id)}>
                    <CardMedia
                      component="img"
                      height="200"
                      image={restaurant.image_url || 'https://via.placeholder.com/400x200?text=Restaurant'}
                      alt={restaurant.name}
                    />
                    <CardContent>
                      <Typography variant="h6" component="div" gutterBottom>
                        {restaurant.name}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Star sx={{ color: '#ffc107', mr: 0.5 }} fontSize="small" />
                        <Typography variant="body2" color="text.secondary">
                          {restaurant.rating} ({restaurant.total_ratings} ratings)
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <Chip 
                          label={restaurant.cuisine_type} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                        <Chip 
                          label={restaurant.city} 
                          size="small" 
                          variant="outlined"
                        />
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <AccessTime fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {restaurant.opening_time} - {restaurant.closing_time}
                        </Typography>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* No Results */}
      {!loading && restaurants.length === 0 && (
        <Box sx={{ textAlign: 'center', my: 8 }}>
          <Restaurant sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No restaurants found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try searching for something else
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default HomePage;
