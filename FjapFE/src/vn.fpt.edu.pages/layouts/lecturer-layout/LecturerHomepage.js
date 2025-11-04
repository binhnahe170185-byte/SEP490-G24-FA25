import React from 'react';
import { Card, Row, Col, Typography, Button } from 'antd';
import {
  CalendarOutlined,
  BarChartOutlined,
  FileTextOutlined,
  EditOutlined,
  BookOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import './LecturerHomepage.css';

const { Title, Text } = Typography;

const LecturerHomepage = () => {
  const navigate = useNavigate();

  // Quick actions
  const scheduleClassFunctions = [
    { title: "View Lecturer's Schedule", icon: <CalendarOutlined />, onClick: () => navigate('/lecturer/schedule') },
    { title: "View Class's Member", icon: <UserOutlined />, onClick: () => navigate('/lecturer/schedule') }
  ];

  const attendanceFunctions = [
    { title: 'Take Attendance', icon: <CalendarOutlined />, onClick: () => navigate('/lecturer/schedule') },
    { title: 'View Attendance Report', icon: <BarChartOutlined />, onClick: () => navigate('/lecturer/schedule') },
    { title: 'Edit Attendance', icon: <EditOutlined />, onClick: () => navigate('/lecturer/schedule') }
  ];

  const homeworkFunctions = [
    { title: "View Homework's List", icon: <FileTextOutlined />, onClick: () => navigate('/lecturer/homework') },
    { title: 'Add Homeworks', icon: <EditOutlined />, onClick: () => navigate('/lecturer/homework') },
    { title: 'Edit Homeworks', icon: <EditOutlined />, onClick: () => navigate('/lecturer/homework') },
    { title: 'View Homework Submission', icon: <FileTextOutlined />, onClick: () => navigate('/lecturer/homework') }
  ];

  const gradeFunctions = [
    { title: 'View List Grades', icon: <BookOutlined />, onClick: () => navigate('/lecturer/grades') },
    { title: 'View Grade Detail', icon: <BookOutlined />, onClick: () => navigate('/lecturer/grades') },
    { title: 'Edit Grade', icon: <EditOutlined />, onClick: () => navigate('/lecturer/grades') }
  ];

  return (
    <div className="teacher-homepage">
      {/* Main Content */}
      <div className="homepage-container">
        <Row gutter={[24, 24]}>
          {/* Left Column - Schedule & Attendance */}
          <Col xs={24} lg={8}>
            <Row gutter={[24, 24]}>
              <Col xs={24}>
                <Card className="dashboard-card">
                  <div className="card-header">
                    <CalendarOutlined className="card-icon" />
                    <div>
                      <Title level={4} className="card-title">Schedule & Class</Title>
                      <Text className="card-description">Manage your schedule and classes.</Text>
                    </div>
                  </div>
                  <div className="card-content">
                    <div className="section">
                      <Text className="section-title">Quick Access</Text>
                      <div className="quick-access">
                        {scheduleClassFunctions.map((func, index) => (
                          <div key={index} className="access-item" onClick={func.onClick}>
                            {func.icon}
                            <Text>{func.title}</Text>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button type="primary" className="card-action" onClick={() => navigate('/lecturer/schedule')}>View All</Button>
                </Card>
              </Col>

              <Col xs={24}>
                <Card className="dashboard-card">
                  <div className="card-header">
                    <BarChartOutlined className="card-icon" />
                    <div>
                      <Title level={4} className="card-title">Attendance</Title>
                      <Text className="card-description">Take and review attendance.</Text>
                    </div>
                  </div>
                  <div className="card-content">
                    <div className="section">
                      <Text className="section-title">Quick Access</Text>
                      <div className="quick-access">
                        {attendanceFunctions.map((func, index) => (
                          <div key={index} className="access-item" onClick={func.onClick}>
                            {func.icon}
                            <Text>{func.title}</Text>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>
          </Col>

          {/* Right Column - Homework & Grades */}
          <Col xs={24} lg={16}>
            <Row gutter={[24, 24]}>
              <Col xs={24}>
                <Card className="dashboard-card">
                  <div className="card-header">
                    <FileTextOutlined className="card-icon" />
                    <div>
                      <Title level={4} className="card-title">Homework</Title>
                      <Text className="card-description">Create, edit and review homework.</Text>
                    </div>
                  </div>
                  <div className="card-content">
                    <div className="section">
                      <Text className="section-title">Quick Access</Text>
                      <div className="quick-access">
                        {homeworkFunctions.map((func, index) => (
                          <div key={index} className="access-item" onClick={func.onClick}>
                            {func.icon}
                            <Text>{func.title}</Text>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button type="primary" className="card-action" onClick={() => navigate('/lecturer/homework')}>View All</Button>
                </Card>
              </Col>

              <Col xs={24}>
                <Card className="dashboard-card">
                  <div className="card-header">
                    <BookOutlined className="card-icon" />
                    <div>
                      <Title level={4} className="card-title">Grades</Title>
                      <Text className="card-description">View and manage student grades.</Text>
                    </div>
                  </div>
                  <div className="card-content">
                    <div className="section">
                      <Text className="section-title">Quick Access</Text>
                      <div className="quick-access">
                        {gradeFunctions.map((func, index) => (
                          <div key={index} className="access-item" onClick={func.onClick}>
                            {func.icon}
                            <Text>{func.title}</Text>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button type="primary" className="card-action" onClick={() => navigate('/lecturer/grades')}>View All</Button>
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default LecturerHomepage;
