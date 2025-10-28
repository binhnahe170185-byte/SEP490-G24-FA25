import React from 'react';
import { Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  BookOutlined,
  FileTextOutlined,
  TeamOutlined,
  CalendarOutlined,
  BarChartOutlined,
  SettingOutlined,
  UserOutlined
} from '@ant-design/icons';

const LecturerSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/lecturer/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/lecturer/classes',
      icon: <TeamOutlined />,
      label: 'My Classes',
    },
    {
      key: '/lecturer/homework',
      icon: <FileTextOutlined />,
      label: 'Homework',
      children: [
        {
          key: '/lecturer/homework',
          label: 'All Homework',
        },
        {
          key: '/lecturer/homework/create',
          label: 'Create New',
        },
        {
          key: '/lecturer/homework/submissions',
          label: 'Submissions',
        },
      ],
    },
    {
      key: '/lecturer/grades',
      icon: <BarChartOutlined />,
      label: 'Grades',
    },
    {
      key: '/lecturer/schedule',
      icon: <CalendarOutlined />,
      label: 'Schedule',
    },
    {
      key: '/lecturer/materials',
      icon: <BookOutlined />,
      label: 'Materials',
    },
    {
      type: 'divider',
    },
    {
      key: '/lecturer/profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: '/lecturer/settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
  ];

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  const getSelectedKeys = () => {
    const path = location.pathname;
    if (path.startsWith('/lecturer/homework')) {
      return ['/lecturer/homework'];
    }
    return [path];
  };

  const getOpenKeys = () => {
    const path = location.pathname;
    if (path.startsWith('/lecturer/homework')) {
      return ['/lecturer/homework'];
    }
    return [];
  };

  return (
    <div style={{
      width: 240,
      height: '100%',
      background: '#ffffff',
      borderRight: '1px solid #f0f0f0',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        padding: '20px 16px',
        borderBottom: '1px solid #f0f0f0',
        textAlign: 'center',
      }}>
        <div style={{
          width: 8,
          height: 24,
          borderRadius: 2,
          background: '#ff6600',
          margin: '0 auto 8px',
        }} />
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#1f2937',
        }}>
          Lecturer Portal
        </div>
      </div>

      <Menu
        mode="inline"
        selectedKeys={getSelectedKeys()}
        defaultOpenKeys={getOpenKeys()}
        items={menuItems}
        onClick={handleMenuClick}
        style={{
          border: 'none',
          flex: 1,
          padding: '16px 0',
        }}
      />
    </div>
  );
};

export default LecturerSidebar;
