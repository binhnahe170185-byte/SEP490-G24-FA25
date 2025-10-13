// App.js
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
import SubjectPage from "../pages/manager/SubjectManage/Index";
import CreateSubject from "../pages/manager/SubjectManage/CreateSubject";
import EditSubject from "../pages/manager/SubjectManage/EditSubject";
import AdminPage from "../pages/admin/AdminPage";
// ================= axios instance =================
const apiBase =
  process.env.REACT_APP_API_BASE?.trim() ||
  (window.location.origin.includes("localhost")
    ? "http://localhost:5000" // fallback local BE
    : "/");

export const api = axios.create({ baseURL: apiBase });

export function setAuthToken(token) {
  if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  else delete api.defaults.headers.common["Authorization"];
}

// ================= Auth Context =================
const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

function safeParse(raw) {
  if (!raw) return null;
  if (raw === "undefined" || raw === "null") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // Khởi tạo từ localStorage (an toàn, không crash)
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
            <span>{user.name || user.email}</span>
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
      const { data } = await api.post("/api/auth/login", {
        credential: res.credential,
      });

      // BE trả về: { email, name, picture, token, (maybe) roleId/role_id }
      const token = data?.token;
      if (!token) throw new Error("Missing token");

      const profile =
        data?.profile ??
        {
          email: data.email ?? "",
          name: data.name ?? "",
          picture: data.picture ?? null,
          roleId: data.roleId ?? data.role_id ?? 1, // tùy BE
        };

      // Lưu & set context
      login({ token, profile });
      // dọn rác cũ nếu từng lưu sai
      if (!profile) localStorage.removeItem("profile");

      // Điều hướng
      // Nếu có trang Manager cần roleId=2:
      // Number(profile.roleId) === 2 ? navigate("/manager", { replace: true }) :
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

// =============== Route guards ===============
function RequireAuth({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireManager({ children }) {
  const { user } = useAuth();
  if (!user || Number(user.roleId) !== 2) return <Navigate to="/" replace />;
  return children;
}

// =============== App Root ===============
export default function App() {
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <Router>
          <Header />
          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Protected: Student */}
            <Route
              path="/studentTable"
              element={
                <RequireAuth>
                  <StudentList />
                </RequireAuth>
              }
            />


            {/* <Route
              path="/admin"
              element={
                <RequireAuth>
                  <AdminPage />
                </RequireAuth>
              }
            /> */}

<Route path="/admin" element={<AdminPage />} />




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
              <Route path="subject" element={<SubjectPage />} />
              <Route path="subject/create" element={<CreateSubject />} />
              <Route path="subject/edit/:subjectId" element={<EditSubject />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
