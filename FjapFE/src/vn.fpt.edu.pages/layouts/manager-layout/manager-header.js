import React from "react";
import { Dropdown, Avatar } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const Header = ({ title }) => {
  const navigate = useNavigate();
  
  const items = [
    {
      key: "profile",
      label: "User Profile",
      onClick: () => navigate('/admin/profile'),
    },
    {
      key: "password",
      label: "Change Password",
    },
    {
      key: "logout",
      label: <span style={{ color: "red" }}>Log out</span>,
    },
  ];

  return (
    <div
      style={{
        height: "76px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 20px",
        background: "#fff",
        borderBottom: "1px solid #eee",
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <img
          src="/FJAP.png"
          alt="logo"
          style={{
            width: 40,
            height: 40,
            objectFit: "contain",
            marginRight: 10,
          }}
        />
        {title ? <span style={{ fontWeight: "bold", fontSize: 18 }}>{title}</span> : null}
      </div>

      {/* Avatar */}
      <Dropdown menu={{ items }} placement="bottomRight" trigger={["click"]}>
        <Avatar
          size={40}
          icon={<UserOutlined />}
          style={{ cursor: "pointer", objectFit: "cover" }}
        />
      </Dropdown>
    </div>
  );
};

export default Header;
