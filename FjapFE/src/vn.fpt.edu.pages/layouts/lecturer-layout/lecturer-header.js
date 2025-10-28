import React, { useState } from 'react';
import { Layout, Button, Space, Dropdown, Badge, Avatar } from 'antd';
import { BellOutlined, UserOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import { useAuth } from '../../login/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Header } = Layout;

const LecturerHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notificationCount] = useState(3); // Mock notification count

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const profileMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
      onClick: () => console.log('Profile clicked'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => console.log('Settings clicked'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
      danger: true,
    },
  ];

  const notificationMenuItems = [
    {
      key: '1',
      label: 'New homework submission from John Doe',
      onClick: () => console.log('Notification 1 clicked'),
    },
    {
      key: '2',
      label: 'Class reminder: Math 101 at 2:00 PM',
      onClick: () => console.log('Notification 2 clicked'),
    },
    {
      key: '3',
      label: 'Grade deadline approaching for Physics',
      onClick: () => console.log('Notification 3 clicked'),
    },
  ];

  return (
    <Header style={{
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 8, height: 24, borderRadius: 2, background: '#ff6600' }} />
        <img src="/FJAP.png" alt="FPT Japan Academy" style={{ height: 40 }} />
        <div style={{ marginLeft: 16, color: '#64748b', fontSize: 14 }}>
          Lecturer Portal
        </div>
      </div>

      <Space size="middle">
        <Dropdown
          menu={{ items: notificationMenuItems }}
          placement="bottomRight"
          trigger={['click']}
        >
          <Button 
            icon={<BellOutlined />} 
            style={{ border: 'none', boxShadow: 'none' }}
          >
            <Badge count={notificationCount} size="small">
              Notifications
            </Badge>
          </Button>
        </Dropdown>

        <Dropdown
          menu={{ items: profileMenuItems }}
          placement="bottomRight"
          trigger={['click']}
        >
          <Button 
            style={{ 
              border: 'none', 
              boxShadow: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 8px',
            }}
          >
            <Avatar 
              size="small" 
              src={user?.picture} 
              icon={<UserOutlined />}
            />
            <span>{user?.name || user?.email || 'Lecturer'}</span>
          </Button>
        </Dropdown>
      </Space>
    </Header>
  );
};

export default LecturerHeader;