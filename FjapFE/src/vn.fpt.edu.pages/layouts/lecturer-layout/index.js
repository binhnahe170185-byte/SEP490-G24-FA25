import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import LecturerHeader from './lecturer-header';
import Footer from '../../../vn.fpt.edu.common/footer';

const layoutStyles = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  backgroundColor: "#f5f5f5",
};

const mainStylesBase = {
  flex: 1,
  overflowY: "auto",
  paddingTop: "64px", // Padding để tránh bị header fixed che
};

const LecturerLayout = () => {
  const location = useLocation();
  const isDashboard = location.pathname === '/lecturer/homepage' || location.pathname === '/lecturer';
  const isSchedulePage = location.pathname.startsWith('/lecturer/schedule');

  const mainStyles = {
    ...mainStylesBase,
    backgroundColor: isSchedulePage ? '#ffffff' : 'transparent',
  };

  return (
    <div style={layoutStyles}>
      <LecturerHeader />
      <main style={mainStyles}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default LecturerLayout;