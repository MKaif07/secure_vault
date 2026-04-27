// src/api/client.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  // CRITICAL: We remove the global 8s timeout. 
  // Large files need minutes, not seconds.
  timeout: 0, 
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

/**
 * REQUEST INTERCEPTOR
 */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vault_access_token');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // AUTO-DETECT MULTIPART: 
  // If we are sending a File (FormData), Axios usually handles this, 
  // but we ensure the header is clean for the browser to set the boundary.
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  return config;
}, (error) => Promise.reject(error));

/**
 * RESPONSE INTERCEPTOR
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check for timeout specifically
    if (error.code === 'ECONNABORTED') {
      console.error("[VAULT] Operation timed out. The file is likely too large for the current settings.");
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('vault_access_token');
      localStorage.removeItem('vault_refresh_token');
      // Force a reload to the login page if unauthorized
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;