import React from 'react';
import { Menu } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeOutlined, 
  FileTextOutlined, 
  CalendarOutlined, 
  TeamOutlined 
} from '@ant-design/icons';

const { Item, SubMenu } = Menu;

const COLORS = {
  sider: "#e9f2ff",
  siderBorder: "#cfe3ff",
  menuText: "#0f2a5a",
};

const HeadOfAdminSidebar = () => {
  const location = useLocation();
  const segments = location.pathname.split('/');
  const activeGroup = segments[2] || '';

  const selectedKey = location.pathname;
  const defaultOpenKeys = [];
  if (activeGroup === 'semesters') defaultOpenKeys.push('semesters');

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
        defaultOpenKeys={defaultOpenKeys}
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

        <SubMenu key="semesters" icon={<CalendarOutlined />} title="Semester Management">
          <Item key="/headOfAdmin/semesters">
            <Link to="/headOfAdmin/semesters">List Semesters</Link>
          </Item>
          <Item key="/headOfAdmin/semesters/add">
            <Link to="/headOfAdmin/semesters/add">Add Semester</Link>
          </Item>
        </SubMenu>

        <Item key="/headOfAdmin/staff" icon={<TeamOutlined />}>
          <Link to="/headOfAdmin/staff">Administration Staff</Link>
        </Item>
      </Menu>
    </div>
  );
};

export default HeadOfAdminSidebar;

