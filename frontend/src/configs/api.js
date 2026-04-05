/**
 * src/configs/api.js
 */
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL || "http://localhost:5000",
});

// Request Interceptor — inject JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("sms_token");
    console.log("Request interceptor - Token exists:", !!token);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("Request interceptor - Added auth header for:", config.url);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor — handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log("401 Unauthorized - Clearing auth state");
      localStorage.removeItem("sms_token");
      localStorage.removeItem("sms_user");
      // Don't redirect if already on login page
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;