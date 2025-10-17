import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";

import AuthProvider, { useAuth } from "../vn.fpt.edu.pages/login/AuthContext";
import LoginPage from "../vn.fpt.edu.pages/login/LoginPage";
import StudentList from "../vn.fpt.edu.pages/student/studentTable/StudentList";
import WeeklyTimetable from "../vn.fpt.edu.pages/student/weeklyTimeTable/WeeklyTimetable";
import ManagerLayout from "../vn.fpt.edu.pages/layouts/manager-layout";
import ClassPage from "../vn.fpt.edu.pages/manager/ClassManage";
import ClassDetail from "../vn.fpt.edu.pages/manager/ClassManage/ClassDetail";
import SubjectPage from "../vn.fpt.edu.pages/manager/SubjectManage/Index";
import CreateSubject from "../vn.fpt.edu.pages/manager/SubjectManage/CreateSubject";
import EditSubject from "../vn.fpt.edu.pages/manager/SubjectManage/EditSubject";
import MaterialList from "../vn.fpt.edu.pages/manager/materials/MaterialList";
import StudentGradeReport from "../vn.fpt.edu.pages/manager/GradeManage/StudentGradeReport";
import SubjectDetail from "../vn.fpt.edu.pages/manager/SubjectManage/SubjectDetail";
import AdminPage from "../vn.fpt.edu.pages/admin/AdminPage";
import Header from "../vn.fpt.edu.common/Header";
import Footer from "../vn.fpt.edu.common/footer";
function RequireAuth({ children }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RequireManager({ children }) {
  const { user } = useAuth();
  if (!user || Number(user.roleId) !== 2) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function ProtectedLayout() {
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

export default function App() {
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={<AdminPage />} />


            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/studentTable" element={<StudentList />} />
              <Route path="/student/grades" element={<StudentGradeReport />} />
              <Route path="/weeklyTimetable" element={<WeeklyTimetable />} />
              {/* <Route path="/admin" element={<AdminPage />} /> */}

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
                <Route path="subject/detail/:subjectId" element={<SubjectDetail />} />
                <Route path="materials" element={<MaterialList />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
