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
  // We use a specific key name to avoid collisions
  const token = localStorage.getItem('vault_access_token');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log("[VAULT] Token Injected: Auth Secured");
  }
  return config;
}, (error) => Promise.reject(error));

/**
 * RESPONSE INTERCEPTOR
 * Catch global errors (like 401 Unauthorized) in one place.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("[VAULT] Unauthorized. Clearing Token.");
      localStorage.removeItem('vault_access_token');
      // Logic to redirect to login would go here
    }
    return Promise.reject(error);
  }
);

export default api;