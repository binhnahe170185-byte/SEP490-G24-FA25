import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Dropdown, Avatar, Badge } from 'antd';
import { 
  CalendarOutlined,
  FileTextOutlined,
  BookOutlined,
  BarChartOutlined,
  HomeOutlined,
  UserOutlined,
  LogoutOutlined,
  BellOutlined
} from '@ant-design/icons';
import { useAuth } from '../../login/AuthContext';
import '../../student/StudentHomepage.css';

const StudentLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const menuItems = [
    {
      key: '/',
      label: 'Home',
      icon: <HomeOutlined />,
      path: '/'
    },
    {
      key: '/weeklyTimetable',
      label: 'Schedule',
      icon: <CalendarOutlined />,
      path: '/weeklyTimetable'
    },
    {
      key: '/student/homework',
      label: 'Homework',
      icon: <FileTextOutlined />,
      path: '/student/homework'
    },
    {
      key: '/student/grades',
      label: 'Grades',
      icon: <BookOutlined />,
      path: '/student/grades'
    },
    {
      key: '/student/academic-transcript',
      label: 'Academic Transcript',
      icon: <FileTextOutlined />,
      path: '/student/academic-transcript'
    },
    {
      key: '/student/curriculum-subjects',
      label: 'Curriculum Subjects',
      icon: <BookOutlined />,
      path: '/student/curriculum-subjects'
    },
    {
      key: '/student/attendance',
      label: 'Attendance',
      icon: <BarChartOutlined />,
      path: '/student/attendance'
    }
  ];

  const userMenuItems = [
    {
      key: 'profile',
      label: 'Profile',
      icon: <UserOutlined />
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      label: 'Logout',
      icon: <LogoutOutlined />,
      danger: true,
      onClick: () => {
        logout();
        navigate('/login', { replace: true });
      }
    }
  ];

  const handleMenuClick = (path) => {
    navigate(path);
  };

  return (
    <div className="student-homepage">
      {/* Student Header */}
      <header className="student-header">
        <div className="student-header-content">
          {/* Left: Logo/Icon */}
          <div className="student-header-left">
            <div className="student-logo" onClick={() => navigate('/')}>
              <img src="/FJAP.png" alt="FJAP" className="logo-icon" style={{ width: 150, height: 80, objectFit: 'contain' }} />
            </div>
          </div>

          {/* Center: Navigation Menu */}
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

          {/* Right: User Menu & Notifications */}
          <div className="student-header-right">
            <div className="notifications">
              <Badge dot>
                <BellOutlined style={{ fontSize: 18, cursor: 'pointer', marginRight: 16 }} />
              </Badge>
            </div>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div className="user-menu-trigger">
                <Avatar 
                  src={user?.picture} 
                  icon={!user?.picture && <UserOutlined />}
                  size="default"
                  style={{ cursor: 'pointer' }}
                />
                <span className="user-name">{user?.name || user?.email || 'Student'}</span>
              </div>
            </Dropdown>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="student-layout-content">
        {children || <Outlet />}
      </div>
    </div>
  );
};

export default StudentLayout;

