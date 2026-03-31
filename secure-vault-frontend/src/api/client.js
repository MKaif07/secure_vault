import axios from 'axios';

// This is the core connection to your Django server
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api', // Matches your Django URL
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// // Add a request interceptor to handle Auth (Market-Fit approach)
// api.interceptors.request.use((config) => {
//   // For now, we use the credentials we set up in the backend
//   // In a real app, you'd pull this from a login state/localStorage
//   const token = btoa('alice:sapp1234'); 
//   config.headers.Authorization = `Basic ${token}`;
//   return config;
// });

api.interceptors.request.use((config) => {
  // Grab the LATEST token saved during the login process
  const token = localStorage.getItem('vault_token');
  
  if (token) {
    config.headers.Authorization = `Basic ${token}`;
    console.log("Outgoing Request Auth: Secure");
  } else {
    console.warn("Outgoing Request Auth: MISSING (Sending as Guest)");
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;