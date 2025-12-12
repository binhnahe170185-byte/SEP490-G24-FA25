import React from 'react';
import { Dropdown, Badge, Avatar, Spin, Empty, Typography, Button, Tooltip } from 'antd';
import { BellOutlined, UserOutlined, LogoutOutlined, HomeOutlined, CalendarOutlined, FileTextOutlined, BookOutlined, NotificationOutlined, ReadOutlined, WifiOutlined, MessageOutlined } from '@ant-design/icons';
import { useAuth } from '../../login/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  describeConnectionState,
  formatNotificationTime,
  getNotificationIcon,
  useRealtimeNotifications,
} from '../../../vn.fpt.edu.common/hooks/useRealtimeNotifications';
import './LecturerHomepage.css';

const { Text } = Typography;

const LecturerHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    notifications,
    loading: notificationsLoading,
    error: notificationsError,
    connectionState,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useRealtimeNotifications(20);

  const getNotificationLink = (notification) => {
    if (!notification.link) return null;
    
    // Lecturer routes
    const roleId = user?.roleId ? Number(user.roleId) : null;
    if (roleId === 3) {
      // Lecturer routes
      if (notification.type === 'news' && notification.entityId) {
        return `/lecturer/news/${notification.entityId}`;
      }
      if (notification.type === 'homework') {
        return `/lecturer/homework`;
      }
      if (notification.type === 'grade') {
        return `/lecturer/grades`;
      }
    }
    
    // Default routes
    return notification.link;
  };

  const menuItems = [
    { key: '/lecturer/homepage', label: 'Home', icon: <HomeOutlined />, path: '/lecturer/homepage' },
    { key: '/lecturer/schedule', label: 'Schedule', icon: <CalendarOutlined />, path: '/lecturer/schedule' },
    { key: '/lecturer/homework', label: 'Homework', icon: <FileTextOutlined />, path: '/lecturer/homework' },
    { key: '/lecturer/grades', label: 'Grades', icon: <BookOutlined />, path: '/lecturer/grades' },
    { key: '/lecturer/subjects', label: 'Curriculum Subjects', icon: <ReadOutlined />, path: '/lecturer/subjects' },
    { key: '/lecturer/news', label: 'News', icon: <NotificationOutlined />, path: '/lecturer/news' },
    { key: '/lecturer/feedback/end-course', label: 'Student Feedback', icon: <MessageOutlined />, path: '/lecturer/feedback/end-course' }
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
                              const link = getNotificationLink(notification);
                              if (link) {
                                navigate(link);
                              }
                            }}
                            style={{
                              cursor: getNotificationLink(notification) ? 'pointer' : 'default',
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
          <Dropdown
            menu={{ items: [
              { key: 'profile', label: 'Profile', icon: <UserOutlined />, onClick: () => navigate('/lecturer/profile') },
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