import React from 'react';
import { Layout, Button, Space } from 'antd';
import { BellOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../login/AuthContext';

const { Header } = Layout;

const HeadOfAdminHeader = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <Header style={{
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
      position: 'fixed',
      top: 0,
      left: 260,
      right: 0,
      zIndex: 1000,
      height: 64,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 8, height: 24, borderRadius: 2, background: '#ff6600' }} />
        <span style={{ fontSize: 18, fontWeight: 600, color: '#1e3a8a' }}>Welcome to the Administration Management Page!</span>
      </div>

      <Space>
        <Button icon={<BellOutlined />}>Notifications</Button>
        <Button icon={<UserOutlined />} onClick={() => navigate('/headOfAdmin/profile')}>Profile</Button>
        <Button danger icon={<LogoutOutlined />} onClick={handleLogout}>Logout</Button>
      </Space>
    </Header>
  );
};

export default HeadOfAdminHeader;

