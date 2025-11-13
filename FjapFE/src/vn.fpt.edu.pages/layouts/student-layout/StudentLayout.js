import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Dropdown, Avatar, Badge, Spin, Empty, Typography, Button, Tooltip } from 'antd';
import { 
  CalendarOutlined,
  FileTextOutlined,
  BookOutlined,
  BarChartOutlined,
  HomeOutlined,
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
  WifiOutlined
} from '@ant-design/icons';
import { useAuth } from '../../login/AuthContext';
import '../../student/StudentHomepage.css';
import {
  describeConnectionState,
  formatNotificationTime,
  getNotificationIcon,
  useRealtimeNotifications,
} from '../../../vn.fpt.edu.common/hooks/useRealtimeNotifications';

const { Text } = Typography;

const StudentLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const {
    notifications,
    loading: notificationsLoading,
    error: notificationsError,
    connectionState,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useRealtimeNotifications(20);

  const menuItems = [
    {
      key: '/',
      label: 'Home',
      icon: <HomeOutlined />,
      path: '/'
    },
    {
      key: '/student/weeklyTimetable',
      label: 'Schedule',
      icon: <CalendarOutlined />,
      path: '/student/weeklyTimetable'
    },
    {
      key: '/student/homework',
      label: 'Homework',
      icon: <FileTextOutlined />,
      path: '/student/homework'
    },
    {
      key: '/student/grades',
      label: 'Mark Report',
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
              <Dropdown
                trigger={['click']}
                placement="bottomRight"
                overlayClassName="notification-dropdown-wrapper"
                dropdownRender={() => (
                  <div className="notification-dropdown">
                    <div className="notification-dropdown-header">
                      <div className="notification-dropdown-title">Notifications</div>
                      <div className="notification-dropdown-meta">
                        <span
                          className={`notification-connection-indicator notification-connection-${connectionState}`}
                        />
                        <Tooltip title={describeConnectionState(connectionState)}>
                          <WifiOutlined className="notification-connection-icon" />
                        </Tooltip>
                        <Button
                          type="link"
                          size="small"
                          disabled={unreadCount === 0}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            markAllAsRead();
                          }}
                        >
                          Mark all read
                        </Button>
                      </div>
                    </div>
                    <div className="notification-dropdown-body">
                      {notificationsLoading ? (
                        <div className="notification-dropdown-loading">
                          <Spin />
                        </div>
                      ) : notificationsError ? (
                        <div className="notification-dropdown-empty">
                          <Empty description="Could not load notifications" />
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="notification-dropdown-empty">
                          <Empty description="No notifications" />
                        </div>
                      ) : (
                        <div className="notification-dropdown-list">
                          {notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`notification-dropdown-item ${
                                notification.read ? 'read' : 'unread'
                              }`}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                            >
                              <div className="notification-dropdown-item-icon">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="notification-dropdown-item-content">
                                <div className="notification-dropdown-item-title">
                                  {notification.title || notification.content}
                                </div>
                                {notification.content && notification.title && (
                                  <Text type="secondary" className="notification-dropdown-item-text">
                                    {notification.content}
                                  </Text>
                                )}
                                <Text type="secondary" className="notification-dropdown-item-time">
                                  {formatNotificationTime(notification.createdTime)}
                                </Text>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              >
                <Badge count={unreadCount} overflowCount={99} offset={[0, 8]}>
                  <BellOutlined style={{ fontSize: 18, cursor: 'pointer', marginRight: 16 }} />
                </Badge>
              </Dropdown>
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

