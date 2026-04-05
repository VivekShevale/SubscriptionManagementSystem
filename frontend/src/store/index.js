/**
 * src/store/index.js
 * Redux Store Configuration
 * --------------------------
 * Combines all slices: auth, theme, cart.
 * Persists theme preference to localStorage.
 */

import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import themeReducer from "./slices/themeSlice";
import cartReducer from "./slices/cartSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    theme: themeReducer,
    cart: cartReducer,
  },
});

export default store;