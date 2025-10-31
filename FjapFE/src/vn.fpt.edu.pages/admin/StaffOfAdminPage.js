// src/vn.fpt.edu.pages/admin/AdminPage.js
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Layout, Menu, Button, Space, Typography, Card } from "antd";
import {
  TeamOutlined, UserAddOutlined, UploadOutlined, EditOutlined,
  AppstoreOutlined, SettingOutlined, CalendarOutlined,
  BellOutlined, UserOutlined, LogoutOutlined, FileTextOutlined,
} from "@ant-design/icons";
import UsersList from "./UserList";
import SemesterList from "./SemesterList";
import AddSemester from "./AddSemester";
import AddSemesterWithHolidays from "./AddSemesterWithHolidays";
import NewsList from "./News/NewsList";
import "./admin.css";

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

const roleIdFromKey = (key) => {
  if (key.endsWith(":admin")) return 1; // Admin
  if (key.endsWith(":head")) return [5, 2]; // Head roles: 5 (Academic_Head), 2 (Administration_Head)
  if (key.endsWith(":staff")) return [7, 6]; // Staff roles: 7 (Academic_Staff), 6 (Administration_Staff)
  if (key.endsWith(":lecturer")) return 3; // Lecturer role: 3
  if (key.endsWith(":student")) return 4; // Student role: 4
  return undefined;
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
          { key: "users:add:admin", label: "Add Admin" },
          { key: "users:add:manager", label: "Add Manager" },
          { key: "users:add:lecturer", label: "Add Lecturer" },
          { key: "users:add:student", label: "Add Student" },
        ]
      },
      { key: "users:import", icon: <UploadOutlined />, label: "Import User List" },
      { key: "users:edit", icon: <EditOutlined />, label: "Edit User" },
    ]
  },
  {
    type: "group", label: "ROOM MANAGEMENT", children: [
      { key: "rooms:list", icon: <AppstoreOutlined />, label: "View List Rooms" },
      { key: "rooms:add", icon: <UserAddOutlined />, label: "Add Room" },
      { key: "rooms:status", icon: <SettingOutlined />, label: "Edit Room's Status" },
    ]
  },
  {
    type: "group", label: "SEMESTER MANAGEMENT", children: [
      { key: "sem:list", icon: <CalendarOutlined />, label: "View List Semesters" },
      { key: "sem:add", icon: <UserAddOutlined />, label: "Add Semester" },
      { key: "sem:edit", icon: <EditOutlined />, label: "Edit Semester" },
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
  const [collapsed, setCollapsed] = useState(false);
  const [activeKey, setActiveKey] = useState(() => {
    // Initialize from location state on mount
    return location?.state?.activeTab || "users:list:head";
  });

  // Sync active tab from navigation state when navigating from other pages
  // Only sync if the state actually changed (new navigation)
  useEffect(() => {
    const stateKey = location?.state?.activeTab;
    if (typeof stateKey === "string") {
      setActiveKey(stateKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Only sync when route changes, not on every render

  const renderContent = () => {
    if (activeKey.startsWith("users:list")) {
      const roleId = roleIdFromKey(activeKey);
      const titleMap = {
        undefined: "View List User",
        1: "View List Admin",
        "5,2": "View List Head",
        "7,6": "View List Staff", 
        3: "View List Lecturer",
        4: "View List Student",
      };
      // 👇 gán key để mỗi trang là một instance riêng (state filter tách biệt)
      const roleKey = Array.isArray(roleId) ? roleId.join(',') : roleId;
      return (
        <UsersList
          key={`users-list-${roleKey ?? "all"}`}
          fixedRole={roleId}
          title={titleMap[roleKey] || "View List User"}
        />
      );
    }

    if (activeKey.startsWith("users:add")) {
      const roleId = roleIdFromKey(activeKey);
      const titleMap = { 1: "Add Admin", 2: "Add Manager", 3: "Add Lecturer", 4: "Add Student" };
      return (
        <Card style={{ borderRadius: 12 }}>
          <Title level={4} style={{ margin: 0 }}>{titleMap[roleId] || "Add User"}</Title>
          <div style={{ color: "#64748b", marginTop: 8 }}>(Form tạo user theo role — sẽ gắn sau)</div>
        </Card>
      );
    }

    if (activeKey.startsWith("sem:")) {
      if (activeKey === "sem:list") {
        return <SemesterList title="Semester List" />;
      }
      if (activeKey === "sem:add") {
        return <AddSemesterWithHolidays />;
      }
      if (activeKey === "sem:edit") {
        return (
          <Card style={{ borderRadius: 12 }}>
            <Title level={4} style={{ margin: 0 }}>Edit Semester</Title>
            <div style={{ color: "#64748b", marginTop: 8 }}>(Semester edit form — integrated into SemesterList)</div>
          </Card>
        );
      }
    }

    if (activeKey === "news:list") {
      return (
        <NewsList
          key={activeKey}
          title="List News - Staff of Administration Department"
        />
      );
    }

    return (
      <Card style={{ borderRadius: 12 }}>
        <Title level={4} style={{ margin: 0 }}>{activeKey}</Title>
        <div style={{ color: "#64748b", marginTop: 8 }}>(Placeholder)</div>
      </Card>
    );
  };


  return (
    <Layout style={{ minHeight: "100vh", background: COLORS.lightBg }}>
      {/* SIDEBAR */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={260}

        style={{
          background: collapsed ? COLORS.siderCollapsed : COLORS.sider,
          borderRight: `1px solid ${COLORS.siderBorder}`,
          transition: "all .25s ease",
          position: "relative",
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
          onClick={(e) => setActiveKey(e.key)}
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
      <Layout>
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
            <Button danger icon={<LogoutOutlined />}>Logout</Button>
          </Space>
        </Header>

        <Content style={{ padding: 24 }}>{renderContent()}</Content>
      </Layout>
    </Layout>
  );
}
