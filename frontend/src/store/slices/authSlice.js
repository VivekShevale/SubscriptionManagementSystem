/**
 * src/store/slices/authSlice.js
 */
import { createSlice } from "@reduxjs/toolkit";

const loadAuthState = () => {
  try {
    const token = localStorage.getItem("sms_token");
    const user = localStorage.getItem("sms_user");
    console.log("Loading auth state - token exists:", !!token);
    return {
      token: token || null,
      user: user ? JSON.parse(user) : null,
      isAuthenticated: !!token,
    };
  } catch (error) {
    console.error("Error loading auth state:", error);
    return { token: null, user: null, isAuthenticated: false };
  }
};

const authSlice = createSlice({
  name: "auth",
  initialState: loadAuthState(),
  reducers: {
    loginSuccess: (state, action) => {
      const { token, user } = action.payload;
      console.log("loginSuccess - Saving token:", token?.substring(0, 20) + "...");
      state.token = token;
      state.user = user;
      state.isAuthenticated = true;
      localStorage.setItem("sms_token", token);
      localStorage.setItem("sms_user", JSON.stringify(user));
      
      // Verify storage worked
      const savedToken = localStorage.getItem("sms_token");
      console.log("Token saved to localStorage:", !!savedToken);
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem("sms_user", JSON.stringify(state.user));
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem("sms_token");
      localStorage.removeItem("sms_user");
      console.log("Logout - cleared localStorage");
    },
  },
});

export const { loginSuccess, updateUser, logout } = authSlice.actions;

export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectUserRole = (state) => state.auth.user?.role;
export const selectToken = (state) => state.auth.token;

export default authSlice.reducer;