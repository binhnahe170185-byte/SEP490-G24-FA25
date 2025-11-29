import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useLocation } from "react-router-dom";

import AuthProvider, { useAuth } from "../vn.fpt.edu.pages/login/AuthContext";
import LoginPage from "../vn.fpt.edu.pages/login/LoginPage";
import WeeklyTimetable from "../vn.fpt.edu.pages/student/weeklyTimeTable/WeeklyTimetable";
import StudentGradeReport from "../vn.fpt.edu.pages/student/MarkReport/StudentGradeReport";
import StudentHomepage from "../vn.fpt.edu.pages/student/StudentHomepage";
import AttendanceReportPage from "../vn.fpt.edu.pages/student/AttendanceReportPage";
import HomeworkPage from "../vn.fpt.edu.pages/student/homework/HomeworkPage";
import LessonHomeworkDetail from "../vn.fpt.edu.pages/student/homework/LessonHomeworkDetail";
import ClassStudentsList from "../vn.fpt.edu.pages/student/classStudents/ClassStudentsList";
import AcademicTranscript from "../vn.fpt.edu.pages/student/AcademicTranscript";
import ManagerLayout from "../vn.fpt.edu.pages/layouts/manager-layout";
import StaffAcademicLayout from "../vn.fpt.edu.pages/layouts/staffAcademic_layout";
import LecturerLayout from "../vn.fpt.edu.pages/layouts/lecturer-layout";
import HeadOfAdminLayout from "../vn.fpt.edu.pages/layouts/headOfAdmin_layout";
import ClassPage from "../vn.fpt.edu.pages/staffAcademic/class";
import ClassDetail from "../vn.fpt.edu.pages/staffAcademic/class/ClassDetail";
import ClassStudents from "../vn.fpt.edu.pages/staffAcademic/class/ClassStudents";
import ClassAddStudents from "../vn.fpt.edu.pages/staffAcademic/class/ClassAddStudents";
import SubjectPage from "../vn.fpt.edu.pages/staffAcademic/SubjectManage/Index";
import CreateSubject from "../vn.fpt.edu.pages/staffAcademic/SubjectManage/CreateSubject";
import EditSubject from "../vn.fpt.edu.pages/staffAcademic/SubjectManage/EditSubject";
import SubjectDetail from "../vn.fpt.edu.pages/staffAcademic/SubjectManage/SubjectDetail";
import Dashboard from "../vn.fpt.edu.pages/staffAcademic/Dashboard";
import GradeManage from "../vn.fpt.edu.pages/lecturer/GradeManage/Index";
import GradeDetails from "../vn.fpt.edu.pages/lecturer/GradeManage/GradeDetails";
import GradeEntry from "../vn.fpt.edu.pages/lecturer/GradeManage/GradeEntry";
import StaffMaterialList from "../vn.fpt.edu.pages/staffAcademic/materials/MaterialList";
import FeedbackList from "../vn.fpt.edu.pages/staffAcademic/feedback/FeedbackList";
import FeedbackDetail from "../vn.fpt.edu.pages/staffAcademic/feedback/FeedbackDetail";
import FeedbackQuestionManage from "../vn.fpt.edu.pages/staffAcademic/feedback/FeedbackQuestionManage";
import FeedbackAnalyticsPage from "../vn.fpt.edu.pages/staffAcademic/feedback/FeedbackAnalyticsPage";
import EndOfCourseFeedbackPage from "../vn.fpt.edu.pages/student/feedback/EndOfCourseFeedbackPage";
import LecturerHomepage from "../vn.fpt.edu.pages/layouts/lecturer-layout/LecturerHomepage";
import HomeworkManage from "../vn.fpt.edu.pages/lecturer/HomeworkManage";
import HomeworkSubmissionPage from "../vn.fpt.edu.pages/lecturer/HomeworkManage/HomeworkSubmissionPage";
import HomeworkDetail from "../vn.fpt.edu.pages/lecturer/HomeworkManage/HomeworkDetail";
import Schedule from "../vn.fpt.edu.pages/lecturer/schedule/Schedule";
import Attendance from "../vn.fpt.edu.pages/lecturer/Attendance/Attendance";
import AttendanceReport from "../vn.fpt.edu.pages/lecturer/AttendanceReport/AttendanceReport";
import StaffOfAdminPage from "../vn.fpt.edu.pages/staffOfAdmin/StaffOfAdminPage";
import CreateSchedule from "../vn.fpt.edu.pages/headOfAcademic/createSchedule/CreateSchedule";
import ImportSchedule from "../vn.fpt.edu.pages/headOfAcademic/importSchedule/ImportSchedule";
import CurriculumSubjects from "../vn.fpt.edu.pages/student/CurriculumSubjects";
import StudentNewsList from "../vn.fpt.edu.pages/student/StudentNewsList";
import StudentNewsDetail from "../vn.fpt.edu.pages/student/StudentNewsDetail";
import LecturerNewsList from "../vn.fpt.edu.pages/lecturer/LecturerNewsList";
import LecturerNewsDetail from "../vn.fpt.edu.pages/lecturer/LecturerNewsDetail";
import LecturerCurriculumSubjects from "../vn.fpt.edu.pages/lecturer/LecturerCurriculumSubjects";
import HeadOfAdminDashboard from "../vn.fpt.edu.pages/headOfAdmin/Dashboard";
import NewsList from "../vn.fpt.edu.pages/staffOfAdmin/News/NewsList";
import SemesterList from "../vn.fpt.edu.pages/staffOfAdmin/Semester/SemesterList";
import AddSemesterWithHolidays from "../vn.fpt.edu.pages/staffOfAdmin/Semester/AddSemesterWithHolidays";
import EditSemester from "../vn.fpt.edu.pages/staffOfAdmin/Semester/EditSemester";
import AdministrationStaffList from "../vn.fpt.edu.pages/headOfAdmin/AdministrationStaffList";
import UsersList from "../vn.fpt.edu.pages/staffOfAdmin/User/UserList";
import AddStaff from "../vn.fpt.edu.pages/staffOfAdmin/User/AddStaff";
import AddStudent from "../vn.fpt.edu.pages/staffOfAdmin/User/AddStudent";
import RoomList from "../vn.fpt.edu.pages/staffOfAdmin/Room/RoomList";
import AddRoom from "../vn.fpt.edu.pages/staffOfAdmin/Room/AddRoom";
import EditRoom from "../vn.fpt.edu.pages/staffOfAdmin/Room/EditRoom";
import Header from "../vn.fpt.edu.common/Header";
import Footer from "../vn.fpt.edu.common/footer";
import { NotificationProvider } from "../vn.fpt.edu.common/notifications";
import StudentLayout from "../vn.fpt.edu.pages/layouts/student-layout/StudentLayout";
import ProfilePage from "../vn.fpt.edu.pages/common/ProfilePage";

function RequireAuth({ children }) {
  const { user, initializing } = useAuth();
  if (initializing) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { user } = useAuth();
  if (!user || Number(user.roleId) !== 1) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RequireStaffAcademic({ children }) {
  const { user } = useAuth();
  const roleId = user ? Number(user.roleId) : null;
  // Allow both role 5 (Head of Academic) and role 7 (Staff Academic)
  if (!user || (roleId !== 5 && roleId !== 7)) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RequireStudent({ children }) {
  const { user } = useAuth();
  if (!user || Number(user.roleId) !== 4) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RequireLecturer({ children }) {
  const { user } = useAuth();
  if (!user || Number(user.roleId) !== 3) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RequireHeadOfAcademic({ children }) {
  const { user } = useAuth();
  if (!user || Number(user.roleId) !== 5) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RequireHeadOfAdministration({ children }) {
  const { user } = useAuth();
  if (!user || Number(user.roleId) !== 2) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RequireAdministrationStaff({ children }) {
  const { user } = useAuth();
  if (!user || Number(user.roleId) !== 6) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RoleBasedRedirect() {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  const roleId = Number(user.roleId);

  /*comment vào vì hiện tại chưa biết màn hình riêng của Admin url là gì 
  Author: HuyLQ */

  if (roleId === 1) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (roleId === 2) {
    return <Navigate to="/headOfAdmin/dashboard" replace />;
  }

  if (roleId === 3) {
    return <Navigate to="/lecturer/homepage" replace />;
  }

  if (roleId === 4) {
    return <Navigate to="/student/homepage" replace />;
  }

  if (roleId === 5) {
    return <Navigate to="/staffAcademic/dashboard" replace />;
  }

  if (roleId === 6) {
    return <Navigate to="/staffOfAdmin" replace />;
  }

  if (roleId === 7) {
    return <Navigate to="/staffAcademic/dashboard" replace />;
  }

  // Default fallback
  return <Navigate to="/" replace />;
}

function ProtectedLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const isStudent = user && Number(user.roleId) === 4;
  const hideHeader =
    location.pathname.startsWith("/staffAcademic") ||
    location.pathname.startsWith("/headOfAdmin") ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/lecturer") ||
    location.pathname.startsWith("/student") ||
    location.pathname === "/weeklyTimetable" ||
    (location.pathname === "/" && isStudent);

  return (
    <RequireAuth>
      {!hideHeader && <Header />}
      <Outlet />
      {!hideHeader && <Footer />}
    </RequireAuth>
  );
}

function Home() {
  const { user } = useAuth();
  const roleId = user ? Number(user.roleId) : null;
  if (roleId === 4) {
    return <Navigate to="/student/homepage" replace />;
  }
  return <RoleBasedRedirect />;
}

export default function App() {
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/staffOfAdmin/*"
                element={
                  <RequireAdministrationStaff>
                    <StaffOfAdminPage />
                  </RequireAdministrationStaff>
                }
              >
                <Route index element={<Navigate to="users/head" replace />} />
                {/* User Management Routes */}
                <Route path="users/admin" element={<UsersList fixedRole={1} title="View List Admin" />} />
                <Route path="users/head" element={<UsersList fixedRole={[5, 2]} title="View List Head" />} />
                <Route path="users/staff" element={<UsersList fixedRole={[7, 6]} title="View List Staff" />} />
                <Route path="users/lecturer" element={<UsersList fixedRole={3} title="View List Lecturer" />} />
                <Route path="users/student" element={<UsersList fixedRole={4} title="View List Student" />} />
                <Route path="users/add/staff" element={<AddStaff />} />
                <Route path="users/add/student" element={<AddStudent />} />
                {/* Room Management Routes */}
                <Route path="rooms" element={<RoomList title="Room Management" />} />
                <Route path="rooms/add" element={<AddRoom />} />
                <Route path="rooms/edit/:id" element={<EditRoom />} />
                {/* Semester Management Routes */}
                <Route path="semesters" element={<SemesterList title="Semester List" />} />
                <Route path="semesters/add" element={<AddSemesterWithHolidays />} />
                <Route path="semesters/edit/:id" element={<EditSemester />} />
                {/* News Management Routes */}
                <Route path="news" element={<NewsList title="List News - Staff of Administration Department" />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>

              <Route element={<ProtectedLayout />}>
                <Route
                  path="/admin/*"
                  element={
                    <RequireAdmin>
                      {React.createElement(require("../vn.fpt.edu.pages/admin/AdminLayout").default)}
                    </RequireAdmin>
                  }
                >
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route
                    path="dashboard"
                    element={React.createElement(require("../vn.fpt.edu.pages/admin/Dashboard").default)}
                  />
                  <Route
                    path="assign-heads"
                    element={React.createElement(require("../vn.fpt.edu.pages/admin/AssignHeads").default)}
                  />
                  <Route
                    path="roles"
                    element={React.createElement(require("../vn.fpt.edu.pages/admin/ManageRoles").default)}
                  />
                  <Route path="profile" element={<ProfilePage />} />
                </Route>
                <Route
                  path="/student/*"
                  element={
                    <RequireStudent>
                      <StudentLayout />
                    </RequireStudent>
                  }
                >
                  <Route path="homepage" element={<StudentHomepage />} />
                  <Route path="grades" element={<StudentGradeReport />} />
                  <Route path="academic-transcript" element={<AcademicTranscript />} />
                  <Route path="attendance" element={React.createElement(require("../vn.fpt.edu.pages/student/attendance/AttendancePage").default)} />
                  <Route path="homework" element={<HomeworkPage />} />
                  <Route path="homework/:classId/:lessonId" element={<LessonHomeworkDetail />} />
                  <Route path="curriculum-subjects" element={<CurriculumSubjects />} />
                  <Route path="news" element={<StudentNewsList />} />
                  <Route path="news/:id" element={<StudentNewsDetail />} />
                  <Route path="class/:classId/students" element={<ClassStudentsList />} />
                  <Route path="weeklyTimetable" element={<WeeklyTimetable />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="feedback/:classId" element={<EndOfCourseFeedbackPage />} />
                </Route>
                <Route path="/" element={<Home />} />


                <Route
                  path="/staffAcademic/*"
                  element={
                    <RequireStaffAcademic>
                      <StaffAcademicLayout />
                    </RequireStaffAcademic>
                  }
                >
                  <Route
                    path="dashboard"
                    element={<Dashboard />}
                  />
                  <Route
                    path="subjects"
                    element={<div style={{ padding: 16 }}><h3>Subjects (placeholder)</h3></div>}
                  />
                  <Route path="materials" element={<StaffMaterialList />} />
                  <Route path="classes" element={<ClassPage />} />
                  <Route path="class/:classId" element={<ClassDetail />} />
                  <Route path="class/:classId/students" element={<ClassStudents />} />
                  <Route path="class/:classId/add-students" element={<ClassAddStudents />} />
                  <Route path="subject" element={<SubjectPage />} />
                  <Route path="subject/create" element={<CreateSubject />} />
                  <Route path="subject/edit/:subjectId" element={<EditSubject />} />
                  <Route path="subject/detail/:subjectId" element={<SubjectDetail />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="feedback" element={<FeedbackList />} />
                      <Route path="feedback/analytics" element={<FeedbackAnalyticsPage />} />
                  <Route path="feedback/:id" element={<FeedbackDetail />} />
                  <Route path="feedback/questions" element={<FeedbackQuestionManage />} />
                  <Route
                    path="createSchedule/edit"
                    element={
                      <RequireHeadOfAcademic>
                        <CreateSchedule />
                      </RequireHeadOfAcademic>
                    }
                  />
                  <Route
                    path="createSchedule/import"
                    element={
                      <RequireHeadOfAcademic>
                        <ImportSchedule />
                      </RequireHeadOfAcademic>
                    }
                  />

                </Route>

                <Route
                  path="/lecturer/*"
                  element={
                    <RequireLecturer>
                      <LecturerLayout />
                    </RequireLecturer>
                  }
                >
                  <Route index element={<Navigate to="homepage" replace />} />
                  <Route path="homepage" element={<LecturerHomepage />} />
                  <Route path="schedule" element={<Schedule />} />
                  <Route path="attendance" element={<Attendance />} />
                  <Route path="attendanceReport/:classId" element={<AttendanceReport />} />
                  <Route
                    path="classes"
                    element={<div style={{ padding: 16 }}><h3>Lecturer Classes (coming soon)</h3></div>}
                  />
                  <Route path="subjects" element={<LecturerCurriculumSubjects />} />
                  <Route
                    path="homework"
                    element={<HomeworkManage />}
                  />
                  <Route
                    path="homework/:classId/:lessonId"
                    element={<HomeworkDetail />}
                  />
                  <Route
                    path="homework/:classId/:lessonId/submissions/:homeworkId"
                    element={<HomeworkSubmissionPage />}
                  />
                  <Route path="grades" element={<GradeManage />} />
                  <Route path="grades/:courseId" element={<GradeDetails />} />
                  <Route path="grades/enter/:courseId" element={<GradeEntry />} />
                  <Route path="news" element={<LecturerNewsList />} />
                  <Route path="news/:id" element={<LecturerNewsDetail />} />
                  <Route
                    path="class/:classId/students"
                    element={
                      <RequireLecturer>
                        <ClassStudentsList />
                      </RequireLecturer>
                    }
                  />
                  <Route path="profile" element={<ProfilePage />} />
                </Route>

                <Route
                  path="/headOfAdmin/*"
                  element={
                    <RequireHeadOfAdministration>
                      <HeadOfAdminLayout />
                    </RequireHeadOfAdministration>
                  }
                >
                  <Route path="dashboard" element={<HeadOfAdminDashboard />} />
                  <Route path="news" element={<NewsList title="News Management" />} />
                  <Route path="semesters" element={<SemesterList title="Semester Management" hideActions={true} />} />
                  <Route path="semesters/edit/:id" element={<EditSemester />} />
                  <Route path="rooms" element={<RoomList title="Room Management" hideActions={true} />} />
                  <Route path="staff" element={<AdministrationStaffList />} />
                  <Route path="profile" element={<ProfilePage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
