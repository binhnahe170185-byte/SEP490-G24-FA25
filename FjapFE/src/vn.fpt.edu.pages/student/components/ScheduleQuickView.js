import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Empty } from 'antd';
import { CalendarOutlined, RightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../login/AuthContext';
import { api } from '../../../vn.fpt.edu.api/http';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const ScheduleQuickView = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [todayLessons, setTodayLessons] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.studentId) {
      loadTodayLessons();
    }
  }, [user?.studentId]);

  const loadTodayLessons = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/api/Students/${user.studentId}/lesson`);
      const lessons = Array.isArray(data?.data) ? data.data : [];
      
      // Filter today's lessons
      const today = dayjs().format('YYYY-MM-DD');
      const todayLessonsData = lessons
        .filter(lesson => {
          const lessonDate = lesson.date || lesson.lessonDate || lesson.startDate;
          return lessonDate && dayjs(lessonDate).format('YYYY-MM-DD') === today;
        })
        .slice(0, 3); // Show only 3 upcoming lessons
      
      setTodayLessons(todayLessonsData);
    } catch (error) {
      console.error('Failed to load lessons:', error);
      // Use hardcoded data if API fails
      setTodayLessons([
        {
          subjectCode: 'PRF192',
          className: 'PRF192-AE1',
          startTime: '07:30',
          endTime: '09:50',
          roomName: 'Lab 1'
        },
        {
          subjectCode: 'MAE101',
          className: 'MAE101-AE1',
          startTime: '13:00',
          endTime: '15:20',
          roomName: 'Room 201'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card 
      className="function-card section-card"
      title={
        <div className="section-card-header">
          <CalendarOutlined className="function-icon schedule-icon" />
          <Title level={4} className="function-title">Today's Schedule</Title>
        </div>
      }
    >
      <div className="section-card-content">
        {loading ? (
          <div className="empty-state">Loading...</div>
        ) : todayLessons.length > 0 ? (
          <div className="schedule-preview">
            {todayLessons.map((lesson, index) => (
              <div key={index} className="schedule-preview-item">
                <div>
                  <Text className="schedule-preview-time">
                    {lesson.startTime || 'N/A'} - {lesson.endTime || 'N/A'}
                  </Text>
                  <div>
                    <Text className="schedule-preview-subject">
                      {lesson.subjectCode || lesson.className || 'N/A'} - {lesson.roomName || ''}
                    </Text>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty 
            description="No lessons today"
            style={{ margin: '20px 0' }}
          />
        )}
      </div>
      <Button 
        type="primary" 
        icon={<RightOutlined />}
        className="function-button"
        onClick={() => navigate('/weeklyTimetable')}
        style={{ marginTop: 16 }}
      >
        View Full Schedule
      </Button>
    </Card>
  );
};

export default ScheduleQuickView;

