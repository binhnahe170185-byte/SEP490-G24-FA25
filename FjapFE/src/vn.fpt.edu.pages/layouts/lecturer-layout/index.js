import React from "react";
import { Outlet } from "react-router-dom";
import LecturerHeader from "./lecturer-header";
import LecturerFooter from "./lecturer-footer";
import LecturerSidebar from "./lecturer-sidebar";

const layoutStyles = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  backgroundColor: "#f8fafc",
};

const bodyStyles = {
  display: "flex",
  flex: 1,
  overflow: "hidden",
};

const sidebarStyles = {
  width: 240,
  borderRight: "1px solid #f0f0f0",
  background: "#fff",
  flexShrink: 0,
};

const mainStyles = {
  flex: 1,
  padding: "24px 32px",
  background: "#fff",
  overflowY: "auto",
};

const LecturerLayout = ({ children }) => {
  const bodyContent = children ?? <Outlet />;

  return (
    <div style={layoutStyles}>
      <LecturerHeader />
      <div style={bodyStyles}>
        <aside style={sidebarStyles}>
          <LecturerSidebar />
        </aside>
        <main style={mainStyles}>{bodyContent}</main>
      </div>
      <LecturerFooter />
    </div>
  );
};

export default LecturerLayout;
