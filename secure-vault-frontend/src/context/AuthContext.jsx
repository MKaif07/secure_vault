import React, { createContext, useContext, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = async (username, password) => {
    try {
      // 1. Point to the NEW JWT endpoint we added in urls.py
      const response = await api.post('/token/', { username, password });
      
      const { access, refresh } = response.data;

      // 2. Save the NEW JWT access token (matching client.js key)
      localStorage.setItem('vault_access_token', access);
      localStorage.setItem('vault_refresh_token', refresh);

      // 3. Update local state
      setUser({ username });
      
      return { success: true };
    } catch (error) {
      console.error("CRYPTOGRAPHIC ACCESS DENIED:", error);
      return { 
        success: false, 
        message: error.response?.data?.detail || "INVALID IDENTITY CREDENTIALS" 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('vault_access_token');
    localStorage.removeItem('vault_refresh_token');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);