import React from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Typography,
  Button
} from 'antd';
import { 
  CalendarOutlined,
  BarChartOutlined,
  FileTextOutlined,
  EditOutlined,
  BookOutlined,
  UserOutlined
} from '@ant-design/icons';
import LecturerHeader from './lecturer-header';
import './LecturerHomepage.css';

const { Title, Text } = Typography;

const LecturerHomepage = () => {


  // Lecturer functions grouped by category
  const scheduleClassFunctions = [
    { title: 'View Lecturer\'s Schedule', icon: <CalendarOutlined />, onClick: () => console.log('Schedule') },
    { title: 'View Class\'s Member', icon: <UserOutlined />, onClick: () => console.log('Class Members') }
  ];

  const attendanceFunctions = [
    { title: 'Take Attendance', icon: <CalendarOutlined />, onClick: () => console.log('Take Attendance') },
    { title: 'View Attendance Report', icon: <BarChartOutlined />, onClick: () => console.log('Attendance Report') },
    { title: 'Edit Attendance', icon: <EditOutlined />, onClick: () => console.log('Edit Attendance') }
  ];

  const homeworkFunctions = [
    { title: 'View Homework\'s List', icon: <FileTextOutlined />, onClick: () => console.log('Homework List') },
    { title: 'Add Homeworks', icon: <EditOutlined />, onClick: () => console.log('Add Homework') },
    { title: 'Edit Homeworks', icon: <EditOutlined />, onClick: () => console.log('Edit Homework') },
    { title: 'View Homework Submission', icon: <FileTextOutlined />, onClick: () => console.log('Homework Submission') }
  ];

  const gradeFunctions = [
    { title: 'View List Grades', icon: <BookOutlined />, onClick: () => console.log('Grades List') },
    { title: 'View Grade Detail', icon: <BookOutlined />, onClick: () => console.log('Grade Detail') },
    { title: 'Edit Grade', icon: <EditOutlined />, onClick: () => console.log('Edit Grade') }
  ];

  return (
    <div className="teacher-homepage">
      {/* Header */}
      <LecturerHeader />


      {/* Dashboard Section */}
      <div className="dashboard-container">
        <Title level={2} className="dashboard-title">Your Dashboard</Title>
        
        <Row gutter={[24, 24]} className="dashboard-grid">
          {/* Schedule & Class Management */}
          <Col xs={24} lg={12} xl={6}>
            <Card className="dashboard-card">
              <div className="card-header">
                <CalendarOutlined className="card-icon" />
                <div>
                  <Title level={4} className="card-title">Schedule & Class</Title>
                  <Text className="card-description">Manage your schedule and class information.</Text>
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
              
              <Button type="primary" className="card-action">View All</Button>
            </Card>
          </Col>

          {/* Attendance Management */}
          <Col xs={24} lg={12} xl={6}>
            <Card className="dashboard-card">
              <div className="card-header">
                <BarChartOutlined className="card-icon" />
                <div>
                  <Title level={4} className="card-title">Attendance</Title>
                  <Text className="card-description">Track and manage student attendance.</Text>
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
              
              <Button type="primary" className="card-action">View All</Button>
            </Card>
          </Col>

          {/* Homework Management */}
          <Col xs={24} lg={12} xl={6}>
            <Card className="dashboard-card">
              <div className="card-header">
                <FileTextOutlined className="card-icon" />
                <div>
                  <Title level={4} className="card-title">Homework</Title>
                  <Text className="card-description">Create and manage homework assignments.</Text>
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
              
              <Button type="primary" className="card-action">View All</Button>
            </Card>
          </Col>

          {/* Grade Management */}
          <Col xs={24} lg={12} xl={6}>
            <Card className="dashboard-card">
              <div className="card-header">
                <BookOutlined className="card-icon" />
                <div>
                  <Title level={4} className="card-title">Grades</Title>
                  <Text className="card-description">Manage student grades and assessments.</Text>
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
              
              <Button type="primary" className="card-action">View All</Button>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default LecturerHomepage;
