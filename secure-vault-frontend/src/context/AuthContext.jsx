import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Stores { username, role, token }

  const login = (username, password) => {
    // Generate a Base64 token (Industry standard for Basic Auth bridge)
    const token = btoa(`${username}:${password}`);
    
    // In a real 2026 app, you'd verify this with a /login endpoint first
    setUser({ username, token, role: 'user' });
    localStorage.setItem('vault_token', token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('vault_token');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);