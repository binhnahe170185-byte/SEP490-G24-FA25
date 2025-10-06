import React, { createContext, useContext, useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
} from "react-router-dom";
import axios from "axios";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";

// ======= Pages / Layouts =======
import StudentList from "../pages/student/studentTable/StudentList";
import ManagerLayout from "../pages/layouts/manager-layout";
import ClassPage from "../pages/manager";
import ClassDetail from "../pages/manager/ClassDetail";

// ================= axios instance =================
export const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE,
});

export function setAuthToken(token) {
  if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  else delete api.defaults.headers.common["Authorization"];
}

// ================= Auth Context =================
const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const profileStr = localStorage.getItem("profile");
    if (token && profileStr) {
      setAuthToken(token);
      setUser({ ...JSON.parse(profileStr), token });
    }
  }, []);

  const login = ({ token, profile }) => {
    localStorage.setItem("token", token);
    localStorage.setItem("profile", JSON.stringify(profile));
    setAuthToken(token);
    setUser({ ...profile, token });
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("profile");
    setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

// =============== UI helpers ===============
function Header() {
  const { user, logout } = useAuth();
  return (
    <div
      style={{
        padding: 12,
        borderBottom: "1px solid #eee",
        display: "flex",
        gap: 16,
        alignItems: "center",
      }}
    >
      <Link to="/">Trang chủ</Link>
      <Link to="/studentTable">Student Table</Link>
      <Link to="/manager">Manager</Link>
      <div style={{ marginLeft: "auto" }}>
        {user ? (
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {user.picture && (
              <img
                src={user.picture}
                alt=""
                style={{ width: 28, height: 28, borderRadius: 14 }}
              />
            )}
            <span>{user.name}</span>
            <button onClick={logout}>Đăng xuất</button>
          </div>
        ) : (
          <Link to="/login">Đăng nhập</Link>
        )}
      </div>
    </div>
  );
}

function Home() {
  return (
    <div style={{ padding: 32 }}>
      <h2>Trang chủ</h2>
      <p>Chào mừng bạn đến với hệ thống quản lý sinh viên!</p>
    </div>
  );
}

// =============== Login with Google ===============
function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  async function onGoogleSuccess(res) {
    try {
      const apiRes = await api.post("/api/auth/google", {
        credential: res.credential,
      });
      const { token, profile } = apiRes.data;
      login({ token, profile });
      navigate("/studentTable", { replace: true });
    } catch (e) {
      console.error(e);
      alert("Đăng nhập thất bại");
    }
  }

  return (
    <div
      style={{ display: "grid", placeItems: "center", minHeight: "60vh", gap: 16 }}
    >
      <h2>Đăng nhập</h2>
      <GoogleLogin
        onSuccess={onGoogleSuccess}
        onError={() => alert("Google Login Error")}
        useOneTap
      />
    </div>
  );
}

// =============== Route guard ===============
function RequireAuth({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireManager({ children }) {
  const { user } = useAuth();
  if (!user || user.roleId !== 2) {
    return <Navigate to="/" replace />;
  }
  return children;
}

// =============== App Root ===============
export default function App() {
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <Router>
          <Header />
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Home />} />

            {/* Protected: Student */}
            <Route
              path="/studentTable"
              element={
                <RequireAuth>
                  <StudentList />
                </RequireAuth>
              }
            />

            {/* Protected: Manager (roleId === 2) */}
            <Route
              path="/manager"
              element={
                <RequireAuth>
                  <RequireManager>
                    <ManagerLayout />
                  </RequireManager>
                </RequireAuth>
              }
            >
              <Route index element={<ClassPage />} />
              <Route path="class" element={<ClassPage />} />
              <Route path="class/:classId" element={<ClassDetail />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}