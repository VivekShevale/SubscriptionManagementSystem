/**
 * src/store/slices/cartSlice.js
 * Shopping Cart State Slice
 * --------------------------
 * Manages portal user's cart items.
 * Persists cart to localStorage for session continuity.
 */

import { createSlice } from "@reduxjs/toolkit";

const loadCart = () => {
  try {
    const saved = localStorage.getItem("sms_cart");
    return saved ? JSON.parse(saved) : { items: [], planId: null };
  } catch {
    return { items: [], planId: null };
  }
};

const saveCart = (state) => {
  localStorage.setItem("sms_cart", JSON.stringify(state));
};

const cartSlice = createSlice({
  name: "cart",
  initialState: loadCart(),
  reducers: {
    /**
     * addToCart — add a product to the cart or increment quantity.
     * @param {object} action.payload — { product, variantId, quantity, planId }
     */
    addToCart: (state, action) => {
      const { product, variantId, quantity = 1, planId } = action.payload;
      state.planId = planId || state.planId;
      const key = `${product.id}-${variantId || "base"}`;
      const existing = state.items.find((i) => i.key === key);
      if (existing) {
        existing.quantity += quantity;
      } else {
        state.items.push({
          key,
          product,
          variantId: variantId || null,
          quantity,
        });
      }
      saveCart(state);
    },

    /**
     * removeFromCart — remove a product from the cart by key.
     */
    removeFromCart: (state, action) => {
      state.items = state.items.filter((i) => i.key !== action.payload);
      saveCart(state);
    },

    /**
     * updateQuantity — set quantity for a specific cart item.
     */
    updateQuantity: (state, action) => {
      const { key, quantity } = action.payload;
      const item = state.items.find((i) => i.key === key);
      if (item) {
        item.quantity = Math.max(1, quantity);
      }
      saveCart(state);
    },

    /**
     * clearCart — empty the cart after successful checkout.
     */
    clearCart: (state) => {
      state.items = [];
      state.planId = null;
      saveCart(state);
    },

    /**
     * setPlan — set the recurring plan for this cart session.
     */
    setPlan: (state, action) => {
      state.planId = action.payload;
      saveCart(state);
    },
  },
});

export const { addToCart, removeFromCart, updateQuantity, clearCart, setPlan } = cartSlice.actions;

// Selectors
export const selectCartItems = (state) => state.cart.items;
export const selectCartCount = (state) => state.cart.items.reduce((s, i) => s + i.quantity, 0);
export const selectCartTotal = (state) =>
  state.cart.items.reduce((s, i) => s + (i.product?.sales_price || 0) * i.quantity, 0);

export default cartSlice.reducer;