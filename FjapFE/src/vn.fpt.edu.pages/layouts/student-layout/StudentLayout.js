import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Dropdown, Avatar, Badge, Spin, Empty, Typography, Button, Tooltip, message } from 'antd';
import { useAuth } from '../../login/AuthContext';
import {
  CalendarOutlined,
  FileTextOutlined,
  BookOutlined,
  BarChartOutlined,
  HomeOutlined,
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
  WifiOutlined,
  MessageOutlined,
  DownOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import '../../student/StudentHomepage.css';
// import FloatingAIChatWidget from '../../student/components/FloatingAIChatWidget';
import {
  describeConnectionState,
  formatNotificationTime,
  getNotificationIcon,
  useRealtimeNotifications,
} from '../../../vn.fpt.edu.common/hooks/useRealtimeNotifications';
import MandatoryFeedbackModal from '../../../vn.fpt.edu.common/components/MandatoryFeedbackModal';
import FeedbackApi from '../../../vn.fpt.edu.api/Feedback';
import Footer from '../../../vn.fpt.edu.common/footer';

const { Text } = Typography;

const StudentLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [pendingFeedbacks, setPendingFeedbacks] = useState([]);
  const [checkingPending, setCheckingPending] = useState(false);

  const getNotificationLink = (notification) => {
    if (!notification.link) return null;

    // Nếu là lecturer (roleId = 3), thay đổi link
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

    // Student routes (default)
    return notification.link;
  };
  const {
    notifications,
    loading: notificationsLoading,
    error: notificationsError,
    connectionState,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useRealtimeNotifications(20);

  const mainMenuItems = [
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
      key: '/student/attendance',
      label: 'Attendance',
      icon: <BarChartOutlined />,
      path: '/student/attendance'
    }
  ];

  const otherMenuItems = [
    {
      key: '/student/feedback/daily',
      label: 'Daily Feedback',
      icon: <MessageOutlined />,
      path: '/student/feedback/daily'
    },
    {
      key: '/student/curriculum-subjects',
      label: 'Curriculum Subjects',
      icon: <BookOutlined />,
      path: '/student/curriculum-subjects'
    },
    {
      key: '/student/academic-transcript',
      label: 'Academic Transcript',
      icon: <FileTextOutlined />,
      path: '/student/academic-transcript'
    }
  ];

  const otherDropdownItems = otherMenuItems.map(item => ({
    key: item.key,
    label: (
      <div onClick={() => handleMenuClick(item.path)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {item.icon}
        <span>{item.label}</span>
      </div>
    )
  }));

  const userMenuItems = [
    {
      key: 'profile',
      label: 'Profile',
      icon: <UserOutlined />,
      onClick: () => navigate('/student/profile')
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

  // Check pending feedbacks on mount and location change
  useEffect(() => {
    checkPendingFeedbacks();
  }, [location.pathname]);

  const checkPendingFeedbacks = async () => {
    try {
      setCheckingPending(true);
      // Optimistically clear list to avoid immediate redirect right after submit
      setPendingFeedbacks([]);
      const classes = await FeedbackApi.getPendingFeedbackClasses();
      setPendingFeedbacks(Array.isArray(classes) ? classes : []);
    } catch (error) {
      console.error("Failed to check pending feedbacks:", error);
      setPendingFeedbacks([]);
    } finally {
      setCheckingPending(false);
    }
  };

  // Navigation guard: Block navigation to homepage if there are pending feedbacks
  useEffect(() => {
    // Chỉ redirect khi đã check xong pending (tránh dùng dữ liệu cũ ngay sau khi submit)
    if (!checkingPending && pendingFeedbacks.length > 0) {
      // If user tries to navigate to homepage, redirect to first pending feedback
      if (location.pathname === '/student/homepage' || location.pathname === '/') {
        const firstPending = pendingFeedbacks[0];
        message.warning("Please complete all pending feedbacks before accessing homepage");
        navigate(`/student/feedback/${firstPending.classId}`, { replace: true });
        return;
      }

      // If user is on a page other than feedback page, allow but show modal
      // The MandatoryFeedbackModal will handle showing the modal
    }
  }, [location.pathname, pendingFeedbacks, navigate]);

  const handleMenuClick = (path) => {
    // Block navigation to homepage if there are pending feedbacks
    if ((path === '/student/homepage' || path === '/') && pendingFeedbacks.length > 0) {
      const firstPending = pendingFeedbacks[0];
      message.warning("Please complete all pending feedbacks before accessing homepage");
      navigate(`/student/feedback/${firstPending.classId}`);
      return;
    }
    navigate(path);
  };

  const isWeeklyTimetable = location.pathname.startsWith('/student/weeklyTimetable');

  return (
    <div
      className="student-homepage"
      style={isWeeklyTimetable ? { background: '#ffffff' } : undefined}
    >
      {/* Student Header */}
      <header className="student-header">
        <div className="student-header-content">
          {/* Left: Logo/Icon */}
          <div className="student-header-left">
            <div className="student-logo" onClick={() => {
              if (pendingFeedbacks.length > 0) {
                const firstPending = pendingFeedbacks[0];
                message.warning("Please complete all pending feedbacks before accessing homepage");
                navigate(`/student/feedback/${firstPending.classId}`);
              } else {
                navigate('/');
              }
            }}>
              <img src="/FJAP.png" alt="FJAP" className="logo-icon" style={{ width: 150, height: 80, objectFit: 'contain' }} />
            </div>
          </div>

          {/* Center: Navigation Menu */}
          <nav className="student-header-nav">
            {mainMenuItems.map(item => (
              <div
                key={item.key}
                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => handleMenuClick(item.path)}
              >
                {item.icon}
                <span className="nav-label">{item.label}</span>
              </div>
            ))}
            {/* Other Dropdown */}
            <Dropdown
              menu={{ items: otherDropdownItems }}
              placement="bottom"
              trigger={['click']}
            >
              <div
                className={`nav-item ${otherMenuItems.some(item => location.pathname === item.path) ? 'active' : ''}`}
                style={{ cursor: 'pointer' }}
              >
                <AppstoreOutlined />
                <span className="nav-label">Other</span>
                <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />
              </div>
            </Dropdown>
          </nav>

          {/* Right: User Menu & Notifications */}
          <div className="student-header-right">
            <div className="notifications">
              <Dropdown
                trigger={['click']}
                placement="bottomRight"
                overlayClassName="notification-dropdown-wrapper"
                popupRender={() => (
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
                              className={`notification-dropdown-item ${notification.read ? 'read' : 'unread'
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
                                cursor: notification.link ? 'pointer' : 'default',
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

      {/* Footer */}
      <Footer />

      {/* Mandatory Feedback Modal - blocks UI until feedback is submitted */}
      <MandatoryFeedbackModal />

      {/* Floating AI Chat Widget - Available on all student pages */}
      {/* <FloatingAIChatWidget /> */}
    </div>
  );
};

export default StudentLayout;

