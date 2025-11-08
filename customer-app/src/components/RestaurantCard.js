import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardMedia,
  CardContent,
  Typography,
  Box,
  Chip,
  CardActionArea
} from '@mui/material';
import {
  Star as StarIcon,
  AccessTime as TimeIcon,
  LocalOffer as OfferIcon
} from '@mui/icons-material';

function RestaurantCard({ restaurant }) {
  const navigate = useNavigate();

  // Parse rating safely (convert string to number)
  const rating = restaurant.rating ? parseFloat(restaurant.rating) : null;
  
  // Check if restaurant is open based on is_active field
  const isOpen = restaurant.is_active;

  // Use id or _id depending on what's available
  const restaurantId = restaurant.id || restaurant._id;

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardActionArea onClick={() => navigate(`/restaurant/${restaurantId}`)}>
        <Box sx={{ position: 'relative' }}>
          <CardMedia
            component="img"
            height="180"
            image={restaurant.image_url || 'https://via.placeholder.com/400x180?text=Restaurant'}
            alt={restaurant.name}
            sx={{ objectFit: 'cover' }}
          />
          {!isOpen && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: 'rgba(0, 0, 0, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Typography variant="h6" color="white">
                Closed
              </Typography>
            </Box>
          )}
          {isOpen && (
            <Chip
              label="Open"
              color="success"
              size="small"
              sx={{
                position: 'absolute',
                top: 10,
                right: 10
              }}
            />
          )}
        </Box>

        <CardContent>
          <Typography variant="h6" component="div" gutterBottom noWrap>
            {restaurant.name}
          </Typography>

          <Typography variant="body2" color="text.secondary" gutterBottom noWrap>
            {restaurant.cuisine_type || 'Various Cuisines'}
          </Typography>

          <Box display="flex" gap={1} mt={2} flexWrap="wrap">
            <Chip
              icon={<StarIcon />}
              label={rating ? rating.toFixed(1) : 'New'}
              size="small"
              color="primary"
              variant="outlined"
            />
            <Chip
              icon={<TimeIcon />}
              label={`${restaurant.delivery_time || '30-40'} min`}
              size="small"
              variant="outlined"
            />
            {restaurant.min_order && (
              <Chip
                icon={<OfferIcon />}
                label={`₹${restaurant.min_order} min`}
                size="small"
                variant="outlined"
              />
            )}
          </Box>

          {restaurant.address && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }} noWrap>
              📍 {restaurant.address}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default RestaurantCard;