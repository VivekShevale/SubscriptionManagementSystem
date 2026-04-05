/**
 * src/store/slices/themeSlice.js
 * Theme State Slice
 * ------------------
 * Manages light/dark mode toggle.
 * Preference is persisted to localStorage and applied to <html> element.
 */

import { createSlice } from "@reduxjs/toolkit";

// Load saved theme or default to system preference
const getSavedTheme = () => {
  const saved = localStorage.getItem("sms_theme");
  if (saved) return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const applyTheme = (theme) => {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
};

const initialTheme = getSavedTheme();
applyTheme(initialTheme);

const themeSlice = createSlice({
  name: "theme",
  initialState: { mode: initialTheme },
  reducers: {
    /**
     * toggleTheme — switch between light and dark modes.
     * Persists preference to localStorage and updates <html> class.
     */
    toggleTheme: (state) => {
      state.mode = state.mode === "light" ? "dark" : "light";
      localStorage.setItem("sms_theme", state.mode);
      applyTheme(state.mode);
    },
    setTheme: (state, action) => {
      state.mode = action.payload;
      localStorage.setItem("sms_theme", state.mode);
      applyTheme(state.mode);
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export const selectTheme = (state) => state.theme.mode;
export default themeSlice.reducer;