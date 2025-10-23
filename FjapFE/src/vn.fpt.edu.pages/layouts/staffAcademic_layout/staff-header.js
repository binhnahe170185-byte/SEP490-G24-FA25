import React from 'react';
import { Layout, Button, Space } from 'antd';
import { BellOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons';

const { Header } = Layout;

const StaffHeader = () => {
  return (
    <Header style={{
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 8, height: 24, borderRadius: 2, background: '#ff6600' }} />
        <img src="/FJAP.png" alt="FPT Japan Academy" style={{ height: 40 }} />
      </div>

      <Space>
        <Button icon={<BellOutlined />}>Notifications</Button>
        <Button icon={<UserOutlined />}>Profile</Button>
        <Button danger icon={<LogoutOutlined />}>Logout</Button>
      </Space>
    </Header>
  );
};

export default StaffHeader;
