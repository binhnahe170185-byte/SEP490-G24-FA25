import React from 'react';
import { Menu } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { ReadOutlined, HomeOutlined, MessageOutlined } from '@ant-design/icons';
import { useAuth } from '../../../vn.fpt.edu.pages/login/AuthContext';

const { Item, SubMenu } = Menu;

const COLORS = {
  sider: "#e9f2ff",
  siderBorder: "#cfe3ff",
  menuText: "#0f2a5a",
};

const HeadOfAcademicSidebar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const roleId = user ? Number(user.roleId) : null;
  const segments = location.pathname.split('/');
  const activeGroup = segments[2] || '';

  const selectedKey = location.pathname;
  const defaultOpenKeys = [];
  if (activeGroup === 'classes') defaultOpenKeys.push('classes');
  if (activeGroup === 'feedback') defaultOpenKeys.push('feedback');

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
        <Item key="/headOfAcademic/dashboard" icon={<HomeOutlined />}>
          <Link to="/headOfAcademic/dashboard">Dashboard</Link>
        </Item>

        <Item key="/headOfAcademic/classes" icon={<ReadOutlined />}>
          <Link to="/headOfAcademic/classes">Classes</Link>
        </Item>

        <SubMenu key="feedback" icon={<MessageOutlined />} title="Feedback">
          <Item key="/headOfAcademic/feedback">
            <Link to="/headOfAcademic/feedback">Feedback List</Link>
          </Item>
          <Item key="/headOfAcademic/feedback/analytics">
            <Link to="/headOfAcademic/feedback/analytics">Feedback Analytics</Link>
          </Item>
        </SubMenu>
      </Menu>
    </div>
  );
};

export default HeadOfAcademicSidebar;

