import React from "react";
import { Outlet } from "react-router-dom";
import StaffHeader from "./staff-header";
import StaffAcademicSidebar from "./staffAcademic-sidebar";

const layoutStyles = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  backgroundColor: "#f5f5f5",
};

const mainStyles = {
  marginLeft: 260,
  marginTop: 64, // Space for fixed header
  padding: "24px",
  background: "#fff",
  minHeight: "calc(100vh - 64px)",
};

const StaffAcademicLayout = ({ children }) => {
  const bodyContent = children ?? <Outlet />;

  return (
    <div style={layoutStyles}>
      <StaffHeader />
      <StaffAcademicSidebar />

      <main style={mainStyles}>{bodyContent}</main>
    </div>
  );
};

export default StaffAcademicLayout;
