import React from 'react';
import { Menu } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeOutlined, 
  FileTextOutlined, 
  CalendarOutlined, 
  TeamOutlined,
  AppstoreOutlined
} from '@ant-design/icons';

const { Item } = Menu;

const COLORS = {
  sider: "#e9f2ff",
  siderBorder: "#cfe3ff",
  menuText: "#0f2a5a",
};

const HeadOfAdminSidebar = () => {
  const location = useLocation();
  const selectedKey = location.pathname;

  return (
    <div style={{ 
      height: '100vh', 
      background: COLORS.sider, 
      borderRight: `1px solid ${COLORS.siderBorder}`,
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0,
      width: 260,
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px 0",
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
        selectedKeys={[selectedKey]}
        rootClassName="fjap-sider-menu"
        style={{
          borderRight: 0,
          background: COLORS.sider,
          color: COLORS.menuText,
          fontWeight: 600,
          paddingBottom: 10,
          flex: 1,
        }}
      >
        <Item key="/headOfAdmin/dashboard" icon={<HomeOutlined />}>
          <Link to="/headOfAdmin/dashboard">Dashboard</Link>
        </Item>

        <Item key="/headOfAdmin/news" icon={<FileTextOutlined />}>
          <Link to="/headOfAdmin/news">News Management</Link>
        </Item>

        <Item key="/headOfAdmin/semesters" icon={<CalendarOutlined />}>
          <Link to="/headOfAdmin/semesters">Semester Management</Link>
        </Item>

        <Item key="/headOfAdmin/rooms" icon={<AppstoreOutlined />}>
          <Link to="/headOfAdmin/rooms">Room Management</Link>
        </Item>

        <Item key="/headOfAdmin/staff" icon={<TeamOutlined />}>
          <Link to="/headOfAdmin/staff">Staff Management</Link>
        </Item>
      </Menu>
    </div>
  );
};

export default HeadOfAdminSidebar;

