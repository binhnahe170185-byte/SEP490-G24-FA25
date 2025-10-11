// src/pages/layouts/manager-layout/index.js
import React from "react";
import { Outlet } from "react-router-dom"; // 👈 thêm dòng này
import Header from "./manager-header";
import ManagerSidebar from "./manager-sidebar";

const layoutStyles = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  backgroundColor: "#f5f5f5",
};

const bodyStyles = {
  display: "flex",
  flex: 1,
  overflow: "hidden",
};

const sidebarStyles = {
  width: 220,
  borderRight: "1px solid #f0f0f0",
  background: "#fff",
  flexShrink: 0,
};

const mainStyles = {
  flex: 1,
  padding: "24px",
  background: "#fff",
  overflowY: "auto",
};

const ManagerLayout = ({ children }) => {
  return (
    <div style={layoutStyles}>
      <Header title="Manager Page" />

      <div style={bodyStyles}>
        <aside style={sidebarStyles}>
          <ManagerSidebar />
        </aside>

        {/* 👇 ưu tiên children (giữ tương thích cũ), nếu không có thì render Outlet */}
        <main style={mainStyles}>{children ?? <Outlet />}</main>
      </div>
    </div>
  );
};

export default ManagerLayout;
