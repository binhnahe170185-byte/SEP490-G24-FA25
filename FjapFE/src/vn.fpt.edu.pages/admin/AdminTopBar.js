import React from "react";
import { Avatar, Button, Dropdown, Space, Typography } from "antd";
import { BellOutlined, SettingOutlined, LogoutOutlined, UserOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../login/AuthContext";

const { Title, Text } = Typography;

export default function AdminTopBar({ title = "Welcome to Admin Management Page!" }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const menuItems = [
    { key: "profile", label: "Profile", icon: <UserOutlined /> },
    {
      key: "logout",
      label: "Logout",
      icon: <LogoutOutlined />,
      onClick: () => {
        logout();
        navigate("/login", { replace: true });
      },
    },
  ];

  return (
    <div
      style={{
        background: "linear-gradient(180deg, #F5F7FA 0%, #FFFFFF 100%)",
        borderBottom: "1px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        position: "sticky",
        top: 0,
        zIndex: 5,
        height: 64,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 8, height: 24, borderRadius: 2, background: "#F36F21" }} />
        <Title level={4} style={{ margin: 0, color: "#002B5C" }}>
          {title}
        </Title>
      </div>

      <Space size={16}>
        <Button type="text" icon={<BellOutlined />} />
        <Button type="text" icon={<SettingOutlined />} />
        <Space>
          <Avatar style={{ background: "#002B5C" }}>A</Avatar>
          <Text strong>System Administrator</Text>
        </Space>
        <Dropdown
          menu={{ items: menuItems }}
          trigger={["click"]}
        >
          <Button type="text" icon={<LogoutOutlined />} />
        </Dropdown>
      </Space>
    </div>
  );
}


