import React from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Typography,
  Button
} from 'antd';
import { 
  BookOutlined,
  BarChartOutlined,
  RightOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import ScheduleQuickView from './components/ScheduleQuickView';
import HomeworkList from './components/HomeworkList';
import HomeworkSubmission from './components/HomeworkSubmission';
import NewsSection from './components/NewsSection';
import './StudentHomepage.css';

const { Title, Text } = Typography;

const StudentHomepage = () => {
  const navigate = useNavigate();

  return (
    <div className="homepage-container">
        <Row gutter={[24, 24]}>
          {/* Left Column - News, View Grade & View Attendance */}
          <Col xs={24} lg={8}>
            <Row gutter={[24, 24]}>
              {/* News Section */}
              <Col xs={24}>
                <NewsSection />
              </Col>

              {/* View Grade */}
              <Col xs={24}>
                <Card 
                  className="function-card"
                  hoverable
                  onClick={() => navigate('/student/grades')}
                >
                  <div className="function-card-header">
                    <BookOutlined className="function-icon grade-icon" />
                    <div>
                      <Title level={4} className="function-title">View Grade</Title>
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

              {/* View Attendance Report */}
              <Col xs={24}>
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
            </Row>
          </Col>
        </Row>
    </div>
  );
};

export default StudentHomepage;

