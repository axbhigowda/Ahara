// src/context/CartContext.js - Shopping cart context
import React, { createContext, useState, useContext, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [restaurant, setRestaurant] = useState(null);

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    const savedRestaurant = localStorage.getItem('cartRestaurant');
    
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Error loading cart:', e);
        setCart([]);
      }
    }
    if (savedRestaurant) {
      try {
        setRestaurant(JSON.parse(savedRestaurant));
      } catch (e) {
        console.error('Error loading restaurant:', e);
        setRestaurant(null);
      }
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
    if (restaurant) {
      localStorage.setItem('cartRestaurant', JSON.stringify(restaurant));
    }
  }, [cart, restaurant]);

  const addToCart = (item, restaurantInfo) => {
    // Check if adding from different restaurant
    if (restaurant && restaurant.id !== restaurantInfo.id) {
      const confirm = window.confirm(
        `Your cart contains items from ${restaurant.name}. Do you want to clear it and add items from ${restaurantInfo.name}?`
      );
      if (!confirm) return false;
      
      // Clear cart and change restaurant
      setCart([]);
      setRestaurant(restaurantInfo);
    } else if (!restaurant) {
      setRestaurant(restaurantInfo);
    }

    // Use both id and _id for compatibility
    const itemId = item.id || item._id;
    
    // Check if item already in cart
    const existingItem = cart.find((cartItem) => {
      const cartItemId = cartItem.id || cartItem._id;
      return cartItemId === itemId;
    });
    
    if (existingItem) {
      // Increase quantity - use the item's quantity field
      setCart(
        cart.map((cartItem) => {
          const cartItemId = cartItem.id || cartItem._id;
          return cartItemId === itemId
            ? { ...cartItem, quantity: (cartItem.quantity || 1) + (item.quantity || 1) }
            : cartItem;
        })
      );
    } else {
      // Add new item with the specified quantity
      setCart([...cart, { 
        ...item, 
        id: itemId,
        _id: itemId,
        quantity: item.quantity || 1 
      }]);
    }
    
    return true;
  };

  const removeFromCart = (itemId) => {
    const updatedCart = cart.filter((item) => {
      const cartItemId = item.id || item._id;
      return cartItemId !== itemId;
    });
    setCart(updatedCart);
    
    // Clear restaurant if cart is empty
    if (updatedCart.length === 0) {
      setRestaurant(null);
      localStorage.removeItem('cartRestaurant');
    }
  };

  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    
    setCart(
      cart.map((item) => {
        const cartItemId = item.id || item._id;
        return cartItemId === itemId ? { ...item, quantity } : item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    setRestaurant(null);
    localStorage.removeItem('cart');
    localStorage.removeItem('cartRestaurant');
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price || 0) * (item.quantity || 1), 0);
  };

  const getItemCount = () => {
    return cart.reduce((count, item) => count + (item.quantity || 1), 0);
  };

  const value = {
    cartItems: cart,
    cart,
    restaurant,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getItemCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};