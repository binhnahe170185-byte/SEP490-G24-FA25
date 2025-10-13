import React, { createContext, useContext, useEffect, useState } from "react";
import { setAuthToken } from "../../vn.fpt.edu.api/http";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

function safeParse(raw) {
  if (!raw || raw === "undefined" || raw === "null") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token") || null;
    const profile = safeParse(localStorage.getItem("profile"));
    if (token && profile) {
      setAuthToken(token);
      setUser({ ...profile, token });
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("profile");
      setAuthToken(null);
      setUser(null);
    }
  }, []);

  const login = ({ token, profile }) => {
    setAuthToken(token);
    setUser({ ...profile, token });
    localStorage.setItem("token", token);
    localStorage.setItem("profile", JSON.stringify(profile));
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("profile");
  };

  return (
    <AuthCtx.Provider value={{ user, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
