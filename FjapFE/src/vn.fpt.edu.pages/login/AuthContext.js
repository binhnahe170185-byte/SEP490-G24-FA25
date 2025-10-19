import React, { createContext, useContext, useCallback, useState } from "react";
// đường dẫn tương đối tới http.js (trong src)
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

// khởi tạo đồng bộ từ localStorage để tránh trạng thái "null" trước khi useEffect chạy
const initUser = (() => {
  const token = localStorage.getItem("token");
  const profile = safeParse(localStorage.getItem("profile"));
  if (token && profile) {
    try {
      setAuthToken(token);
    } catch (e) {
      // ignore
    }
    return { ...profile, token };
  }
  return null;
})();

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(initUser);
  // flag để component bảo vệ route biết đang khởi tạo hay không
  const [initializing] = useState(false);

  const login = useCallback(({ token, profile }) => {
    setAuthToken(token);
    localStorage.setItem("token", token);
    localStorage.setItem("profile", JSON.stringify(profile));
    setUser({ ...profile, token });
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("profile");
    setUser(null);
  }, []);

  return (
    <AuthCtx.Provider value={{ user, login, logout, initializing }}>
      {children}
    </AuthCtx.Provider>
  );
}