// src/vn.fpt.edu.pages/admin/AdminPage.js
import React, { useState, useMemo } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { Layout, Menu, Button, Space, Typography } from "antd";
import {
  TeamOutlined, UserAddOutlined,
  AppstoreOutlined, CalendarOutlined,
  BellOutlined, UserOutlined, LogoutOutlined, FileTextOutlined,
  IdcardOutlined, BookOutlined, PlusCircleOutlined,
} from "@ant-design/icons";
import { useAuth } from "../login/AuthContext";
import "./staffOfAdmin.css";

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const COLORS = {
  brandOrange: "#ff6600",
  brandBlue: "#0071c5",
  navy: "#1e3a8a",
  lightBg: "#f5f5f5",
  sider: "#e9f2ff",
  siderCollapsed: "#dbeafe",
  siderBorder: "#cfe3ff",
  menuSelectedBg: "#cce6ff",
  menuHoverBg: "#e7f2ff",
  menuText: "#0f2a5a",
};

// Map menu keys to URL paths
const keyToPath = (key) => {
  const pathMap = {
    "users:list:admin": "/staffOfAdmin/users/admin",
    "users:list:head": "/staffOfAdmin/users/head",
    "users:list:staff": "/staffOfAdmin/users/staff",
    "users:list:lecturer": "/staffOfAdmin/users/lecturer",
    "users:list:student": "/staffOfAdmin/users/student",
    "users:add:staff": "/staffOfAdmin/users/add/staff",
    "users:add:student": "/staffOfAdmin/users/add/student",
    "rooms:list": "/staffOfAdmin/rooms",
    "rooms:add": "/staffOfAdmin/rooms/add",
    "sem:list": "/staffOfAdmin/semesters",
    "sem:add": "/staffOfAdmin/semesters/add",
    "news:list": "/staffOfAdmin/news",
  };
  return pathMap[key] || null;
};

// Map URL path to menu key
const pathToKey = (pathname) => {
  if (pathname.includes("/users/admin")) return "users:list:admin";
  if (pathname.includes("/users/head")) return "users:list:head";
  if (pathname.includes("/users/staff") && !pathname.includes("/add")) return "users:list:staff";
  if (pathname.includes("/users/lecturer")) return "users:list:lecturer";
  if (pathname.includes("/users/student") && !pathname.includes("/add")) return "users:list:student";
  if (pathname.includes("/users/add/staff")) return "users:add:staff";
  if (pathname.includes("/users/add/student")) return "users:add:student";
  if (pathname.includes("/rooms/edit")) return "rooms:list"; // Edit route should highlight list
  if (pathname.includes("/rooms/add")) return "rooms:add";
  if (pathname.includes("/rooms")) return "rooms:list";
  if (pathname.includes("/semesters/edit")) return "sem:list"; // Edit route should highlight list
  if (pathname.includes("/semesters/add")) return "sem:add";
  if (pathname.includes("/semesters")) return "sem:list";
  if (pathname.includes("/news")) return "news:list";
  return "users:list:head"; // default
};

const ADMIN_MENU = [
  {
    type: "group", label: "USER MANAGEMENT", children: [
      {
        key: "users:list", icon: <TeamOutlined />, label: "View List User", children: [
          { key: "users:list:admin", label: "View List Admin" },
          { key: "users:list:head", label: "View List Head" },
          { key: "users:list:staff", label: "View List Staff" },
          { key: "users:list:lecturer", label: "View List Lecturer" },
          { key: "users:list:student", label: "View List Student" },
        ]
      },
      {
        key: "users:add", icon: <UserAddOutlined />, label: "Add User", children: [
          { key: "users:add:staff", label: "Add Staff", icon: <IdcardOutlined /> },
          { key: "users:add:student", label: "Add Student", icon: <BookOutlined /> },
        ]
      },
    ]
  },
  {
    type: "group", label: "ROOM MANAGEMENT", children: [
      { key: "rooms:list", icon: <AppstoreOutlined />, label: "View List Rooms" },
      { key: "rooms:add", icon: <PlusCircleOutlined />, label: "Add Room" },
    ]
  },
  {
    type: "group", label: "SEMESTER MANAGEMENT", children: [
      { key: "sem:list", icon: <CalendarOutlined />, label: "View List Semesters" },
      { key: "sem:add", icon: <PlusCircleOutlined />, label: "Add Semester" },
    ]
  },
  {
    type: "group", label: "NEWS MANAGEMENT", children: [
      { key: "news:list", icon: <FileTextOutlined />, label: "List News" },
    ]
  },
];

export default function StaffOfAdminPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // Get active key from current URL path
  const activeKey = useMemo(() => {
    return pathToKey(location.pathname);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleMenuClick = (e) => {
    const path = keyToPath(e.key);
    if (path) {
      navigate(path);
    }
  };


  return (
    <Layout style={{ minHeight: "100vh", background: COLORS.lightBg }}>
      {/* SIDEBAR */}
      <Sider
        collapsible={false}
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={260}

        style={{
          background: collapsed ? COLORS.siderCollapsed : COLORS.sider,
          borderRight: `1px solid ${COLORS.siderBorder}`,
          transition: "all .25s ease",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          height: "100vh",
          overflowY: "auto",
        }}
      >
        {/* Logo */}
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",     // canh giữa theo chiều dọc
            justifyContent: "center", // canh giữa theo chiều ngang
            padding: "16px 0",        // khoảng cách trên dưới
          }}
        >
          <img
            src="/FJAP.png"
            alt="FPT Japan Academy"
            style={{ height: 44 }}
          />
        </div>


        {/* Menu */}
        <Menu
          mode="inline"
          theme="light"
          selectedKeys={[activeKey]}
          onClick={handleMenuClick}
          items={ADMIN_MENU}
          rootClassName="fjap-sider-menu"
          style={{
            borderRight: 0,
            background: collapsed ? COLORS.siderCollapsed : COLORS.sider,
            color: COLORS.menuText,
            fontWeight: 500,
            paddingBottom: 10, // chừa chỗ cho nút cố định
          }}
        />
      </Sider>

      {/* MAIN CONTENT */}
      <Layout style={{ marginLeft: 260 }}>
        <Header style={{
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px", boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 8, height: 24, borderRadius: 2, background: COLORS.brandOrange }} />
            <Title level={4} style={{ margin: 0, color: COLORS.navy }}>Welcome to the Administration Management Page!</Title>
          </div>
          <Space>
            <Button icon={<BellOutlined />}>Notifications</Button>
            <Button icon={<UserOutlined />}>Profile</Button>
            <Button danger icon={<LogoutOutlined />} onClick={handleLogout}>Logout</Button>
          </Space>
        </Header>

        <Content style={{ padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
