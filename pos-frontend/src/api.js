import axios from "axios";
import toast from "react-hot-toast";

const api = axios.create({
  baseURL: "http://127.0.0.1:3000/api", // backend URL
});

// Request interceptor: Attach Token
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (token) {                       
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const status = error.response?.status;
      const url = error.config?.url || '';

      // 🔴 IMPORTANT: DO NOT auto-logout on login/auth API routes or setup routes
      // Note: url is relative to baseURL, which already includes '/api'
      const isAuthRoute =
        url.includes('/users/login') ||
        url.includes('/users/Reset') ||
        url.includes('/users/forget') ||
        url.includes('/verify-pin') ||
        url.includes('/reset-pin');

      if (status === 401 && !isAuthRoute) {
        // Session expired on protected routes only
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("id");
        sessionStorage.removeItem("role");
        localStorage.removeItem("token");
        localStorage.removeItem("id");
        localStorage.removeItem("role");

        toast.error("Session expired or unauthorized. Redirecting to login...");

        // Delay redirect slightly to show toast
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
