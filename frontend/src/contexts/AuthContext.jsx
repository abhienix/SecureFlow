import React, { createContext, useContext, useState } from "react";
import { LoginService } from "../services/authService";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => LoginService.isAuthenticated());
  const [user, setUser] = useState(() => LoginService.getCurrentUser());

  const login = async (username, password) => {
    const res = await LoginService.login(username, password);
    if (res.success) {
      setIsAuthenticated(true);
      setUser(res.session.user);
    }
    return res;
  };

  const logout = async () => {
    await LoginService.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
