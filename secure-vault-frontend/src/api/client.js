// src/api/client.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  timeout: 8000, // Increased slightly for large encrypted file transfers
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

/**
 * REQUEST INTERCEPTOR
 * Attaches the JWT Bearer token to every outgoing request.
 */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vault_access_token');
  
  if (token) {
    // Hardened Approach: Use Bearer instead of Basic
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn("[VAULT] Shield Status: No Auth Token Found");
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

/**
 * RESPONSE INTERCEPTOR
 * Catch global errors (like 401 Unauthorized) in one place.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and kick to login if session is compromised or expired
      console.error("[VAULT] Session Expired or Unauthorized. Lockdown initiated.");
      localStorage.removeItem('vault_access_token');
      // window.location.href = '/login'; // Optional: Redirect to login
    }
    return Promise.reject(error);
  }
);

export default api;