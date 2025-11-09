import React from 'react';
import { Dropdown, Badge, Avatar } from 'antd';
import { BellOutlined, UserOutlined, LogoutOutlined, HomeOutlined, CalendarOutlined, FileTextOutlined, BookOutlined, NotificationOutlined, ReadOutlined } from '@ant-design/icons';
import { useAuth } from '../../login/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import './LecturerHomepage.css';

const LecturerHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { key: '/lecturer/homepage', label: 'Home', icon: <HomeOutlined />, path: '/lecturer/homepage' },
    { key: '/lecturer/schedule', label: 'Schedule', icon: <CalendarOutlined />, path: '/lecturer/schedule' },
    { key: '/lecturer/homework', label: 'Homework', icon: <FileTextOutlined />, path: '/lecturer/homework' },
    { key: '/lecturer/grades', label: 'Grades', icon: <BookOutlined />, path: '/lecturer/grades' },
    { key: '/lecturer/subjects', label: 'Curriculum Subjects', icon: <ReadOutlined />, path: '/lecturer/subjects' },
    { key: '/lecturer/news', label: 'News', icon: <NotificationOutlined />, path: '/lecturer/news' }
  ];

  const handleMenuClick = (path) => {
    navigate(path);
  };

  return (
    <header className="student-header" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, width: '100%' }}>
      <div className="student-header-content">
        <div className="student-header-left">
          <div 
            className="student-logo lecturer-logo-no-hover" 
            style={{ 
              pointerEvents: 'auto',
              background: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'transparent';
              const img = e.currentTarget.querySelector('img');
              if (img) {
                img.style.filter = 'none';
                img.style.opacity = '1';
                img.style.webkitFilter = 'none';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              const img = e.currentTarget.querySelector('img');
              if (img) {
                img.style.filter = 'none';
                img.style.opacity = '1';
                img.style.webkitFilter = 'none';
              }
            }}
          >
            <img 
              src="/FJAP.png" 
              alt="FJAP" 
              className="logo-icon lecturer-logo-img" 
              style={{ 
                width: 150, 
                height: 80, 
                objectFit: 'contain',
                filter: 'none',
                opacity: 1,
                WebkitFilter: 'none',
                transition: 'none',
              }}
              onMouseEnter={(e) => {
                e.stopPropagation();
                e.currentTarget.style.filter = 'none';
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.webkitFilter = 'none';
              }}
              onMouseLeave={(e) => {
                e.stopPropagation();
                e.currentTarget.style.filter = 'none';
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.webkitFilter = 'none';
              }}
            />
          </div>
        </div>

        <nav className="student-header-nav">
          {menuItems.map(item => (
            <div
              key={item.key}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => handleMenuClick(item.path)}
            >
              {item.icon}
              <span className="nav-label">{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="student-header-right">
          <div className="notifications">
            <Badge dot>
              <BellOutlined style={{ fontSize: 18, cursor: 'pointer', marginRight: 16 }} />
            </Badge>
          </div>
          <Dropdown
            menu={{ items: [
              { key: 'profile', label: 'Profile', icon: <UserOutlined /> },
              { type: 'divider' },
              { key: 'logout', label: 'Logout', icon: <LogoutOutlined />, danger: true, onClick: () => { logout(); navigate('/login', { replace: true }); } }
            ] }}
            placement="bottomRight"
          >
            <div className="user-menu-trigger">
              <Avatar
                src={user?.picture}
                icon={!user?.picture && <UserOutlined />}
                size="default"
                style={{ cursor: 'pointer' }}
              />
              <span className="user-name">{user?.name || user?.email || 'Lecturer'}</span>
            </div>
          </Dropdown>
        </div>
      </div>
    </header>
  );
};

export default LecturerHeader;