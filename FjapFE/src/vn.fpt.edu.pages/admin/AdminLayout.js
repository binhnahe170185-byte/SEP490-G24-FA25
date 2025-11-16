import React from "react";
import { Layout, Menu } from "antd";
import { Link, Outlet, useLocation, Navigate, useNavigate } from "react-router-dom";
import {
  DashboardOutlined,
  UserSwitchOutlined,
  TeamOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useAuth } from "../login/AuthContext";
import AdminTopBar from "./AdminTopBar";

const { Sider, Content } = Layout;

const COLORS = {
  brandOrange: "#ff6600",
  navy: "#1e3a8a",
  lightBg: "#f5f5f5",
  sider: "#e9f2ff",
  siderBorder: "#cfe3ff",
  menuText: "#0f2a5a",
};

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  if (!user || Number(user.roleId) !== 1) {
    return <Navigate to="/login" replace />;
  }

  const items = [
    {
      key: "/admin/dashboard",
      icon: <DashboardOutlined />,
      label: <Link to="/admin/dashboard">Dashboard</Link>,
    },
    {
      key: "/admin/assign-heads",
      icon: <UserSwitchOutlined />,
      label: <Link to="/admin/assign-heads">Assign Heads</Link>,
    },
    {
      key: "/admin/roles",
      icon: <SettingOutlined />,
      label: <Link to="/admin/roles">Manage Roles</Link>,
    },
    {
      key: "/admin/users",
      icon: <TeamOutlined />,
      label: <Link to="/staffOfAdmin/users/admin">Users</Link>,
    },
  ];

  const activeKey = location.pathname;
  const renderLabel = (key, label) => {
    const active = activeKey === key;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 4,
            height: 24,
            borderRadius: 2,
            background: active ? COLORS.brandOrange : "transparent",
            marginRight: 4,
          }}
        />
        <span style={{ fontWeight: 700, fontSize: 15, color: COLORS.menuText }}>{label}</span>
      </div>
    );
  };

  const mappedItems = items.map(i => ({ ...i, label: renderLabel(i.key, i.label) }));

  return (
    <Layout style={{ minHeight: "100vh", background: COLORS.lightBg }}>
      <Sider
        width={280}
        style={{
          background: COLORS.sider,
          borderRight: `1px solid ${COLORS.siderBorder}`,
          position: "fixed",
          left: 0, top: 0, bottom: 0,
          height: "100vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 0" }}>
          <img src="/FJAP.png" alt="FPT Japan Academy" style={{ height: 44 }} />
        </div>
        <Menu
          mode="inline"
          theme="light"
          items={mappedItems}
          selectedKeys={[activeKey]}
          style={{ borderRight: 0, background: COLORS.sider, color: COLORS.menuText, fontWeight: 500 }}
        />
      </Sider>

      <Layout style={{ marginLeft: 280 }}>
        <AdminTopBar />

        <Content style={{ padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}


