// src/redux/cartSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  cartItems: [],
  totalAmount: 0,
  totalQuantity: 0
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const item = action.payload;
      const existingItem = state.cartItems.find((i) => i.id === item.id);

      if (existingItem) {
        // Prevent exceeding available qty if possible
        if (existingItem.quantity < (existingItem.qty || existingItem.available_qty)) {
          existingItem.quantity += 1;
        }
      } else {
        state.cartItems.push({ ...item, quantity: 1, discount: 0 });
      }

      state.totalQuantity = state.cartItems.reduce((sum, i) => sum + i.quantity, 0);
      state.totalAmount = state.cartItems.reduce(
        (sum, i) => sum + (i.price - (i.discount || 0)) * i.quantity,
        0
      );
    },

    removeFromCart: (state, action) => {
      state.cartItems = state.cartItems.filter((i) => i.id !== action.payload);

      state.totalQuantity = state.cartItems.reduce((sum, i) => sum + i.quantity, 0);
      state.totalAmount = state.cartItems.reduce(
        (sum, i) => sum + (i.price - (i.discount || 0)) * i.quantity,
        0
      );
    },

    increaseQuantity: (state, action) => {
      const item = state.cartItems.find((i) => i.id === action.payload);
      const stock = item.qty !== undefined ? item.qty : item.available_qty;

      if (item && item.quantity < stock) {
        item.quantity += 1;
      }

      state.totalQuantity = state.cartItems.reduce((sum, i) => sum + i.quantity, 0);
      state.totalAmount = state.cartItems.reduce(
        (sum, i) => sum + (i.price - (i.discount || 0)) * i.quantity,
        0
      );
    },

    decreaseQuantity: (state, action) => {
      const item = state.cartItems.find((i) => i.id === action.payload);
      if (item && item.quantity > 1) {
        item.quantity -= 1;
      }

      state.totalQuantity = state.cartItems.reduce((sum, i) => sum + i.quantity, 0);
      state.totalAmount = state.cartItems.reduce(
        (sum, i) => sum + (i.price - (i.discount || 0)) * i.quantity,
        0
      );
    },


    clearCart: (state) => {
      state.cartItems = [];
      state.totalAmount = 0;
      state.totalQuantity = 0;
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  increaseQuantity,
  decreaseQuantity,
  clearCart,
} = cartSlice.actions;

export const cartReducer = cartSlice.reducer;
