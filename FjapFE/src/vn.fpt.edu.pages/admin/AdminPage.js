// src/vn.fpt.edu.pages/admin/AdminPage.js
import React, { useState } from "react";
import { Layout, Menu, Button, Space, Typography, Card } from "antd";
import {
  TeamOutlined, UserAddOutlined, UploadOutlined, EditOutlined,
  AppstoreOutlined, SettingOutlined, CalendarOutlined,
  BellOutlined, UserOutlined, LogoutOutlined,
} from "@ant-design/icons";
import UsersList from "./UserList";
import "./admin.css";

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const COLORS = {
  brandOrange: "#ff6600",
  brandBlue:   "#0071c5",
  navy:        "#1e3a8a",
  lightBg:     "#f5f5f5",
  sider:           "#e9f2ff",
  siderCollapsed:  "#dbeafe",
  siderBorder:     "#cfe3ff",
  menuSelectedBg:  "#cce6ff",
  menuHoverBg:     "#e7f2ff",
  menuText:        "#0f2a5a",
};

const roleIdFromKey = (key) => {
  if (key.endsWith(":admin")) return 1;
  if (key.endsWith(":manager")) return 2;
  if (key.endsWith(":lecturer")) return 3;
  if (key.endsWith(":student")) return 4;
  return undefined;
};

const ADMIN_MENU = [
  { type: "group", label: "USER MANAGEMENT", children: [
      { key: "users:list", icon: <TeamOutlined/>, label: "View List User", children: [
          { key: "users:list:admin", label: "View List Admin" },
          { key: "users:list:manager", label: "View List Manager" },
          { key: "users:list:lecturer", label: "View List Lecturer" },
          { key: "users:list:student", label: "View List Student" },
      ]},
      { key: "users:add", icon: <UserAddOutlined/>, label: "Add User", children: [
          { key: "users:add:admin", label: "Add Admin" },
          { key: "users:add:manager", label: "Add Manager" },
          { key: "users:add:lecturer", label: "Add Lecturer" },
          { key: "users:add:student", label: "Add Student" },
      ]},
      { key: "users:import", icon: <UploadOutlined/>, label: "Import User List" },
      { key: "users:edit",   icon: <EditOutlined/>,   label: "Edit User" },
  ]},
  { type: "group", label: "ROOM MANAGEMENT", children: [
      { key: "rooms:list",   icon: <AppstoreOutlined/>, label: "View List Rooms" },
      { key: "rooms:add",    icon: <UserAddOutlined/>,  label: "Add Room" },
      { key: "rooms:status", icon: <SettingOutlined/>,  label: "Edit Room's Status" },
  ]},
  { type: "group", label: "SEMESTER MANAGEMENT", children: [
      { key: "sem:list", icon: <CalendarOutlined/>, label: "View List Semesters" },
      { key: "sem:add",  icon: <UserAddOutlined/>,  label: "Add Semester" },
      { key: "sem:edit", icon: <EditOutlined/>,     label: "Edit Semester" },
  ]},
];

export default function AdminPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeKey, setActiveKey] = useState("users:list:all");

  const renderContent = () => {
  if (activeKey.startsWith("users:list")) {
    const roleId = roleIdFromKey(activeKey);
    const titleMap = {
      undefined: "View List User",
      1: "View List Admin",
      2: "View List Manager",
      3: "View List Lecturer",
      4: "View List Student",
    };
    // 👇 gán key để mỗi trang là một instance riêng (state filter tách biệt)
    return (
      <UsersList
        key={`users-list-${roleId ?? "all"}`}
        fixedRole={roleId}
        title={titleMap[roleId] || "View List User"}
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
          position: "relative", // cần để nút cố định hoạt động
        }}
      >
        {/* Logo */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 10, padding: "16px 20px",
        }}>
          <img src="/FJAP.png" alt="FPT Japan Academy" style={{ height: 44, borderRadius: 8 }} />
          {!collapsed && <span style={{ fontWeight: 800, fontSize: 18, color: COLORS.navy }}>School Admin</span>}
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
            <Title level={4} style={{ margin: 0, color: COLORS.navy }}>Admin Home</Title>
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
