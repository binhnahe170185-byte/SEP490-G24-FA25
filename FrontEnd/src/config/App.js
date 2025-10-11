import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";

import AuthProvider, { useAuth } from "../pages/login/AuthContext";
import LoginPage from "../pages/login/LoginPage";

import StudentList from "../pages/student/studentTable/StudentList";
import ManagerLayout from "../pages/layouts/manager-layout";
import ClassPage from "../pages/manager";
import ClassDetail from "../pages/manager/ClassDetail";
import SubjectPage from "../pages/manager/SubjectManage/Index";
import CreateSubject from "../pages/manager/SubjectManage/CreateSubject";
import EditSubject from "../pages/manager/SubjectManage/EditSubject";
import Header from "../common/Header"; // ⬅️ tách Header ra file riêng nếu muốn, hoặc giữ inline (xem mục 2)

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

export default function App() {
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public: không có Header */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected: có Header */}
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/studentTable" element={<StudentList />} />

              <Route
                path="/manager"
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
                <Route path="subject/edit/:subjectId" element={<EditSubject />}
                />
              </Route>
            </Route>

            {/* Default: chưa login thì sẽ bị chặn và đẩy về /login */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
