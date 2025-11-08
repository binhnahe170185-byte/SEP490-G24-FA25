import React from "react";
import { Outlet } from "react-router-dom";
import HeadOfAdminHeader from "./headOfAdmin-header";
import HeadOfAdminSidebar from "./headOfAdmin-sidebar";

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

const HeadOfAdminLayout = ({ children }) => {
  const bodyContent = children ?? <Outlet />;

  return (
    <div style={layoutStyles}>
      <HeadOfAdminHeader />
      <HeadOfAdminSidebar />

      <main style={mainStyles}>{bodyContent}</main>
    </div>
  );
};

export default HeadOfAdminLayout;

