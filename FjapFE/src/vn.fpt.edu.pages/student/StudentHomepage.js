import React, { useState } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Typography,
  Button,
  Empty
} from 'antd';
import { 
  CalendarOutlined,
  FileTextOutlined,
  BookOutlined,
  BarChartOutlined,
  BellOutlined,
  RightOutlined,
  HomeOutlined,
  UserOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../login/AuthContext';
import { Dropdown, Avatar } from 'antd';
import ScheduleQuickView from './components/ScheduleQuickView';
import HomeworkList from './components/HomeworkList';
import HomeworkSubmission from './components/HomeworkSubmission';
import NewsSection from './components/NewsSection';
import NotificationsSection from './components/NotificationsSection';
import './StudentHomepage.css';

const { Title, Text } = Typography;

const StudentHomepage = () => {
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
              <BookOutlined className="logo-icon" />
              <span className="logo-text">FJAP Student</span>
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
      <div className="homepage-container">
        <Row gutter={[24, 24]}>
          {/* Left Column - News & Notifications */}
          <Col xs={24} lg={8}>
            <Row gutter={[24, 24]}>
              {/* News Section */}
              <Col xs={24}>
                <NewsSection />
              </Col>

              {/* Notifications Section */}
              <Col xs={24}>
                <NotificationsSection />
              </Col>
            </Row>
          </Col>

          {/* Right Column - Main Functions */}
          <Col xs={24} lg={16}>
            <Row gutter={[24, 24]}>
              {/* Schedule Quick View */}
              <Col xs={24}>
                <ScheduleQuickView />
              </Col>

              {/* Homework List */}
              <Col xs={24}>
                <HomeworkList />
              </Col>

              {/* Homework Submission */}
              <Col xs={24}>
                <HomeworkSubmission />
              </Col>

              {/* Grade Report */}
              <Col xs={24} sm={12}>
                <Card 
                  className="function-card"
                  hoverable
                  onClick={() => navigate('/student/grades')}
                >
                  <div className="function-card-header">
                    <BookOutlined className="function-icon grade-icon" />
                    <div>
                      <Title level={4} className="function-title">View Grade Report</Title>
                      <Text className="function-description">View detailed grades for all subjects</Text>
                    </div>
                  </div>
                  <Button 
                    type="primary" 
                    icon={<RightOutlined />}
                    className="function-button"
                  >
                    View Details
                  </Button>
                </Card>
              </Col>

              {/* Attendance Report */}
              <Col xs={24} sm={12}>
                <Card 
                  className="function-card"
                  hoverable
                  onClick={() => navigate('/student/attendance')}
                >
                  <div className="function-card-header">
                    <BarChartOutlined className="function-icon attendance-icon" />
                    <div>
                      <Title level={4} className="function-title">View Attendance Report</Title>
                      <Text className="function-description">Track your attendance status</Text>
                    </div>
                  </div>
                  <Button 
                    type="primary" 
                    icon={<RightOutlined />}
                    className="function-button"
                  >
                    View Details
                  </Button>
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default StudentHomepage;

