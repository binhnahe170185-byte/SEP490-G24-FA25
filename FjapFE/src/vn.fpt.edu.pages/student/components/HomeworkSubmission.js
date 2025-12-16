import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Empty, Tag, Spin } from 'antd';
import { UploadOutlined, RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../login/AuthContext';
import StudentHomework from '../../../vn.fpt.edu.api/StudentHomework';

const { Title, Text } = Typography;

const HomeworkSubmission = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pendingHomeworks, setPendingHomeworks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPendingHomeworks = async () => {
      if (!user?.studentId) return;

      try {
        setLoading(true);
        const data = await StudentHomework.getStudentHomeworks(user.studentId);

        // Transform and filter only pending/late homeworks that haven't been submitted
        const pending = data
          .map(hw => {
            const deadline = hw.deadline ? dayjs(hw.deadline) : null;
            const isOverdue = deadline && deadline.isBefore(dayjs());
            // Check submission
            // If submitted/graded -> ignore
            if (hw.studentSubmission && hw.studentSubmission.status) {
              return null;
            }

            let status = 'pending';
            if (isOverdue) {
              status = 'overdue';
            }

            return {
              id: hw.homeworkId,
              classId: hw.classId, // API response has classId
              lessonId: hw.lessonId, // API response has lessonId
              title: hw.title,
              subject: hw.className ? hw.className : 'N/A',
              className: hw.className,
              dueDate: hw.deadline,
              status: status,
              description: hw.content
            };
          })
          .filter(Boolean) // Remove nulls (submitted ones)
          .sort((a, b) => {
            // Sort by deadline: nearest first. 
            // If overdue, they are technically "past" deadline, but should be shown.
            // Let's sort purely by deadline ascending.
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return dayjs(a.dueDate).valueOf() - dayjs(b.dueDate).valueOf();
          });

        setPendingHomeworks(pending);
      } catch (error) {
        console.error("Failed to load pending homeworks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingHomeworks();
  }, [user]);

  const handleNavigateToSubmit = (homework) => {
    // Navigate to homework detail page to submit
    navigate(`/student/homework/${homework.classId}/${homework.lessonId}`);
  };

  return (
    <Card
      className="function-card section-card"
      title={
        <div className="section-card-header">
          <UploadOutlined className="function-icon homework-icon" />
          <Title level={4} className="function-title" style={{ marginRight: 8 }}>Submit Homework</Title>
          {pendingHomeworks.length > 0 && (
            <Tag color="red">{pendingHomeworks.length} Pending</Tag>
          )}
        </div>
      }
    >
      <div className="section-card-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}><Spin /></div>
        ) : pendingHomeworks.length > 0 ? (
          pendingHomeworks.slice(0, 3).map((homework) => (
            <div key={homework.id} className="homework-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text className="homework-title" style={{ maxWidth: '200px' }} ellipsis={{ tooltip: homework.title }}>
                  {homework.title}
                </Text>
                {homework.status === 'overdue' && <Tag color="error">Overdue</Tag>}
              </div>

              <div className="homework-meta">
                <span>{homework.className}</span>
                <span>Due: {homework.dueDate ? dayjs(homework.dueDate).format('DD/MM/YYYY') : 'None'}</span>
              </div>
              <Button
                type="primary"
                size="small"
                style={{ marginTop: 8, width: '100%' }}
                onClick={() => handleNavigateToSubmit(homework)}
              >
                Submit Now
              </Button>
            </div>
          ))
        ) : (
          <Empty
            description="No pending homework"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ margin: '10px 0' }}
          />
        )}
      </div>
      <Button
        type="default"
        icon={<RightOutlined />}
        className="function-button"
        onClick={() => navigate('/student/homework')}
        style={{ marginTop: 16 }}
      >
        View All
      </Button>
    </Card>
  );
};

export default HomeworkSubmission;
