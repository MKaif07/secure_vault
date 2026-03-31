import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../api/client"; // Import your axios instance

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // PERSISTENCE: Check if a token exists when the app starts
  useEffect(() => {
    const savedToken = localStorage.getItem("vault_token");
    if (savedToken) {
      // In a production app, you'd verify this token with the backend here
      setUser({ username: "Session User", role: "user" }); 
    }
    setLoading(false);
  }, []);

  // const login = async (username, password) => {
  //   const token = btoa(`${username}:${password}`);
    
  //   try {
  //     // 1. Make the ACTUAL request to your Django backend
  //     // We hit a simple endpoint like 'users/me/' or 'files/' to verify credentials
  //     await api.get("/files/", {
  //       headers: { Authorization: `Basic ${token}` }
  //     });

  //     // 2. If successful, persist and update state
  //     localStorage.setItem("vault_token", token);
  //     localStorage.setItem("vault_user", username);
  //     setUser({ username, role: "user" });
      
  //     console.log(`✅ Backend Verified: ${username}`);
  //     return { success: true };

  //   } catch (err) {
  //     console.error("❌ Login Failed:", err.response?.status);
  //     return { 
  //       success: false, 
  //       message: err.response?.status === 401 ? "Invalid Credentials" : "Server Error" 
  //     };
  //   }
  // };

  const login = async (username, password) => {
    const token = btoa(`${username}:${password}`);
    
    try {
      // Call the "Me" endpoint to verify and get user details
      const response = await api.get("/auth/me/", {
        headers: { Authorization: `Basic ${token}` }
      });

      const userData = response.data; // Includes { username, role, id }
      
      localStorage.setItem("vault_token", token);
      setUser(userData);
      
      return { success: true };
    } catch (err) {
      return { success: false, message: "Invalid identity or key." };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.clear();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);