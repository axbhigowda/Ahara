// src/components/Navbar.js - Navigation bar component
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Badge,
  Box,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  ShoppingCart,
  Restaurant,
  AccountCircle,
  Receipt,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { getItemCount } = useCart();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
    navigate('/');
  };

  // FIXED: Only show cart count when logged in
  const cartCount = isAuthenticated ? getItemCount() : 0;

  return (
    <AppBar position="sticky">
      <Toolbar>
        {/* Logo */}
        <Restaurant sx={{ mr: 2 }} />
        <Typography
          variant="h6"
          component={Link}
          to="/"
          sx={{
            flexGrow: 1,
            textDecoration: 'none',
            color: 'inherit',
            fontWeight: 'bold',
          }}
        >
          Ahara
        </Typography>

        {/* Cart Icon - FIXED: Only show badge when logged in */}
        <IconButton
          color="inherit"
          component={Link}
          to={isAuthenticated ? "/cart" : "/login"}
          sx={{ mr: 2 }}
        >
          <Badge badgeContent={cartCount} color="secondary">
            <ShoppingCart />
          </Badge>
        </IconButton>

        {/* Auth Buttons */}
        {isAuthenticated ? (
          <>
            <IconButton
              color="inherit"
              component={Link}
              to="/orders"
              sx={{ mr: 1 }}
            >
              <Receipt />
            </IconButton>
            <IconButton
              color="inherit"
              onClick={handleMenu}
            >
              <AccountCircle />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem disabled>
                <Typography variant="body2">{user?.name}</Typography>
              </MenuItem>
              <MenuItem onClick={() => { handleClose(); navigate('/orders'); }}>
                My Orders
              </MenuItem>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
          </>
        ) : (
          <Box>
            <Button color="inherit" component={Link} to="/login">
              Login
            </Button>
            <Button
              color="inherit"
              component={Link}
              to="/signup"
              variant="outlined"
              sx={{ ml: 1 }}
            >
              Sign Up
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;