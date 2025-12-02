import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Typography,
  Button,
  Alert,
  List,
  Space,
  Modal,
  Spin,
  Empty,
  message
} from 'antd';
import { 
  BookOutlined,
  BarChartOutlined,
  RightOutlined,
  ExclamationCircleOutlined,
  MessageOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../login/AuthContext';
import ScheduleQuickView from './components/ScheduleQuickView';
import HomeworkList from './components/HomeworkList';
import HomeworkSubmission from './components/HomeworkSubmission';
import NewsSection from './components/NewsSection';
import FeedbackApi from '../../vn.fpt.edu.api/Feedback';
import DailyFeedbackModal from './feedback/DailyFeedbackModal';
import { api } from '../../vn.fpt.edu.api/http';
import dayjs from 'dayjs';
import './StudentHomepage.css';

const { Title, Text } = Typography;

function normalizeLesson(raw, fallbackId) {
  if (!raw) return null;

  const rawDate = raw.date ?? raw.lessonDate ?? raw.startDate ?? null;
  const dateObj = rawDate ? dayjs(rawDate) : null;

  const subjectCode =
    raw.subjectCode ??
    raw.subject?.code ??
    raw.subject?.subjectCode ??
    raw.class?.subject?.code ??
    raw.class?.subject?.subjectCode ??
    raw.class?.subjectCode ??
    null;

  const className =
    raw.className ??
    raw.class?.className ??
    raw.class?.name ??
    null;

  const subjectName =
    raw.subjectName ??
    raw.subject?.subjectName ??
    raw.subject?.name ??
    raw.class?.subject?.subjectName ??
    raw.class?.subject?.name ??
    null;

  return {
    lessonId: raw.lessonId ?? raw.lesson_id ?? fallbackId,
    classId: raw.classId ?? raw.class_id ?? null,
    subjectId: raw.subjectId ?? raw.subject_id ?? raw.class?.subjectId ?? null,
    date: dateObj ? dateObj.format("YYYY-MM-DD") : rawDate,
    rawDate,
    code: subjectCode,
    subjectCode,
    className,
    subjectName,
    raw,
  };
}

const StudentHomepage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pendingFeedbacks, setPendingFeedbacks] = useState([]);
  const [selectLessonModalVisible, setSelectLessonModalVisible] = useState(false);
  const [dailyFeedbackModalVisible, setDailyFeedbackModalVisible] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [availableLessons, setAvailableLessons] = useState([]);
  const [loadingLessons, setLoadingLessons] = useState(false);

  useEffect(() => {
    loadPendingFeedbacks();
  }, []);

  const loadPendingFeedbacks = async () => {
    try {
      const classes = await FeedbackApi.getPendingFeedbackClasses();
      setPendingFeedbacks(Array.isArray(classes) ? classes : []);
    } catch (error) {
      console.error("Failed to load pending feedbacks:", error);
    }
  };

  const loadAvailableLessons = async () => {
    if (!user?.studentId) {
      message.warning("Student ID not found");
      return;
    }

    try {
      setLoadingLessons(true);
      const { data } = await api.get(`/api/Students/${user.studentId}/lesson`);
      const rawLessons = Array.isArray(data?.data) ? data.data : [];
      
      // Normalize lessons
      const normalized = rawLessons
        .map((row, idx) => normalizeLesson(row, idx))
        .filter(Boolean);

      // Filter lessons from today and past 7 days (for feedback)
      const today = dayjs().startOf('day');
      const sevenDaysAgo = today.subtract(7, 'day');
      
      const recentLessons = normalized.filter((lesson) => {
        if (!lesson.date && !lesson.rawDate) return false;
        const lessonDate = dayjs(lesson.date || lesson.rawDate);
        return lessonDate.isAfter(sevenDaysAgo) && lessonDate.isBefore(today.add(1, 'day'));
      });

      // Sort by date (newest first)
      recentLessons.sort((a, b) => {
        const dateA = dayjs(a.date || a.rawDate);
        const dateB = dayjs(b.date || b.rawDate);
        return dateB.unix() - dateA.unix();
      });

      setAvailableLessons(recentLessons);
    } catch (error) {
      console.error("Failed to load lessons:", error);
      message.error("Failed to load lessons");
      setAvailableLessons([]);
    } finally {
      setLoadingLessons(false);
    }
  };

  const handleOpenSubmitFeedback = (e) => {
    e.stopPropagation(); // Prevent card click
    setSelectLessonModalVisible(true);
    loadAvailableLessons();
  };

  const handleSelectLesson = (lesson) => {
    setSelectedLesson(lesson);
    setSelectLessonModalVisible(false);
    setDailyFeedbackModalVisible(true);
  };

  const handleFeedbackSuccess = () => {
    message.success("Feedback submitted successfully!");
  };

  return (
    <div className="homepage-container">
        {pendingFeedbacks.length > 0 && (
          <Alert
            message="Feedback Required"
            description={
              <div>
                <Text>
                  You have {pendingFeedbacks.length} class{pendingFeedbacks.length > 1 ? "es" : ""} that require feedback:
                </Text>
                <List
                  size="small"
                  dataSource={pendingFeedbacks}
                  style={{ marginTop: "8px" }}
                  renderItem={(item) => (
                    <List.Item
                      actions={[
                        <Button
                          type="link"
                          size="small"
                          onClick={() => navigate(`/student/feedback/${item.classId}`)}
                        >
                          Submit Feedback
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        title={item.className}
                        description={`${item.subjectName} - ${item.daysUntilEnd === 0 ? "Ends today" : item.daysUntilEnd === 1 ? "Ends tomorrow" : `Ends in ${item.daysUntilEnd} days`}`}
                      />
                    </List.Item>
                  )}
                />
              </div>
            }
            type="warning"
            icon={<ExclamationCircleOutlined />}
            showIcon
            closable
            style={{ marginBottom: "24px" }}
          />
        )}
        <Row gutter={[24, 24]}>
          {/* Left Column - News, Daily Feedback, View Grade & View Attendance */}
          <Col xs={24} lg={8}>
            <Row gutter={[24, 24]}>
              {/* News Section */}
              <Col xs={24}>
                <NewsSection />
              </Col>

              {/* Daily Feedback */}
              <Col xs={24}>
                <Card 
                  className="function-card daily-feedback-card"
                  hoverable
                  onClick={() => navigate('/student/feedback/daily')}
                >
                  <div className="function-card-header">
                    <MessageOutlined className="function-icon daily-feedback-icon" />
                    <div>
                      <Title level={4} className="function-title">Daily Feedback</Title>
                      <Text className="function-description">Share your thoughts about lessons</Text>
                    </div>
                  </div>
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />}
                      className="function-button"
                      onClick={handleOpenSubmitFeedback}
                      style={{ 
                        background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
                        border: 'none',
                        fontWeight: 600
                      }}
                    >
                      Submit Feedback
                    </Button>
                    <Button 
                      icon={<RightOutlined />}
                      className="function-button-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/student/feedback/daily');
                      }}
                    >
                      View Details
                    </Button>
                  </Space>
                </Card>
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

        {/* Select Lesson Modal */}
        <Modal
          open={selectLessonModalVisible}
          onCancel={() => setSelectLessonModalVisible(false)}
          footer={null}
          width={600}
          title="Select Lesson to Give Feedback"
        >
          <Spin spinning={loadingLessons}>
            {availableLessons.length === 0 && !loadingLessons ? (
              <Empty
                description="No recent lessons available for feedback"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <List
                dataSource={availableLessons}
                renderItem={(lesson) => {
                  const lessonDate = lesson.date ? dayjs(lesson.date) : null;
                  const dateStr = lessonDate ? lessonDate.format("dddd, DD/MM/YYYY") : "N/A";
                  
                  return (
                    <List.Item
                      actions={[
                        <Button
                          type="primary"
                          onClick={() => handleSelectLesson(lesson)}
                        >
                          Select
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        title={lesson.subjectName || lesson.subjectCode || "N/A"}
                        description={
                          <Space direction="vertical" size={0}>
                            <Text type="secondary">{lesson.className || "N/A"}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {dateStr}
                            </Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            )}
          </Spin>
        </Modal>

        {/* Daily Feedback Modal */}
        <DailyFeedbackModal
          visible={dailyFeedbackModalVisible}
          lesson={selectedLesson}
          onClose={() => {
            setDailyFeedbackModalVisible(false);
            setSelectedLesson(null);
          }}
          onSuccess={handleFeedbackSuccess}
        />
    </div>
  );
};

export default StudentHomepage;

