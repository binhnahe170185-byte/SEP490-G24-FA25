import React, { createContext, useContext, useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
  useNavigate,
  useLocation,
} from "react-router-dom";
import axios from "axios";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";

import AuthProvider, { useAuth } from "../pages/login/AuthContext";
import LoginPage from "../pages/login/LoginPage";
import StudentList from "../pages/student/studentTable/StudentList";
import WeeklyTimetable from "../pages/student/weeklyTimeTable/WeeklyTimetable";
import ManagerLayout from "../pages/layouts/manager-layout";
import ClassPage from "../pages/manager/ClassManage";
import ClassDetail from "../pages/manager/ClassManage/ClassDetail";
import SubjectPage from "../pages/manager/SubjectManage/Index";
import CreateSubject from "../pages/manager/SubjectManage/CreateSubject";
import EditSubject from "../pages/manager/SubjectManage/EditSubject";
import AdminPage from "../pages/admin/AdminPage";
import Header from "../common/Header";
import Footer from "../common/footer";
import MaterialList from "../pages/manager/materials/MaterialList";

// ================= axios instance =================
const apiBase =
  process.env.REACT_APP_API_BASE?.trim() ||
  (window.location.origin.includes("localhost") ? "http://localhost:5000" : "/");

export const api = axios.create({ baseURL: apiBase });

export function setAuthToken(token) {
  if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  else delete api.defaults.headers.common["Authorization"];
}

// =============== Helpers & Guards ===============
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

function ProtectedLayout() {
  // Chỉ render khi đã đăng nhập
  return (
    <RequireAuth>
      <Header />
      <Outlet />
      <Footer />
    </RequireAuth>
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

// =============== Login with Google (component uses AuthContext login) ===============
function LoginWrapper() {
  const { login } = useAuth();
  const navigate = useNavigate();

  async function onGoogleSuccess(res) {
    try {
      const { data } = await api.post("/api/auth/login", {
        credential: res.credential,
      });

      const token = data?.token;
      if (!token) throw new Error("Missing token");

      const profile =
        data?.profile ??
        {
          email: data.email ?? "",
          name: data.name ?? "",
          picture: data.picture ?? null,
          roleId: data.roleId ?? data.role_id ?? 1,
        };

      login({ token, profile });
      if (!profile) localStorage.removeItem("profile");
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

// =============== App Root ===============
export default function App() {
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginWrapper />} />
            <Route path="/admin" element={<AdminPage />} />

            {/* Protected area (Header + Footer) */}
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/studentTable" element={<StudentList />} />
              <Route path="/weeklyTimetable" element={<WeeklyTimetable />} />

              {/* Manager nested routes under /manager */}
              <Route
                path="/manager/*"
                element={
                  <RequireManager>
                    <ManagerLayout />
                  </RequireManager>
                }
              >
                <Route index element={<ClassPage />} />
                <Route path="class" element={<ClassPage />} />
                <Route path="class/:classId" element={<ClassDetail />} />
                <Route path="subject" element={<SubjectPage />} />
                <Route path="subject/create" element={<CreateSubject />} />
                <Route path="subject/edit/:subjectId" element={<EditSubject />} />
                <Route path="materials" element={<MaterialList />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}