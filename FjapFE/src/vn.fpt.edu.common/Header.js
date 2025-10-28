import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../vn.fpt.edu.pages/login/AuthContext";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

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
      <Link to="/student/grades">My Grades</Link>
      <Link to="/manager">Manager</Link>
      <Link to="/weeklyTimetable">Weekly Timetable</Link>
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
            <button onClick={onLogout}>Đăng xuất</button>
          </div>
        ) : (
          <Link to="/login">Đăng nhập</Link>
        )}
      </div>
    </div>
  );
}
