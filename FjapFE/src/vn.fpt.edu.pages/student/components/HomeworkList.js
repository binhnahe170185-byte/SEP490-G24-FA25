import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Tag, Empty, Spin } from 'antd';
import { FileTextOutlined, RightOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAuth } from '../../login/AuthContext';
import StudentHomework from '../../../vn.fpt.edu.api/StudentHomework';

const { Title, Text } = Typography;

const HomeworkList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [homeworks, setHomeworks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchHomeworks = async () => {
      // Ensure user has studentId before fetching
      if (!user?.studentId) {
        console.log("No studentId found in user object:", user);
        return;
      }

      console.log("Fetching homeworks for studentId:", user.studentId);

      try {
        setLoading(true);
        // data structure expected: 
        // { homeworkId, title, deadline, className, studentSubmission: { status, grade, ... } }
        const data = await StudentHomework.getStudentHomeworks(user.studentId);

        // Transform data for UI
        const transformed = data.map(hw => {
          let status = 'pending';
          const deadline = hw.deadline ? dayjs(hw.deadline) : null;
          const isOverdue = deadline && deadline.isBefore(dayjs());

          if (hw.studentSubmission && hw.studentSubmission.status) {
            status = hw.studentSubmission.status.toLowerCase();
          } else if (isOverdue) {
            status = 'late';
          }

          return {
            id: hw.homeworkId,
            classId: hw.classId,
            lessonId: hw.lessonId,
            title: hw.title,
            // Try extracting subject code, fallback to full class name
            subject: hw.className ? hw.className.split('-')[0] : 'N/A',
            className: hw.className,
            dueDate: hw.deadline,
            status: status,
            submission: hw.studentSubmission
          };
        });

        // Filter & Sort Strategy:
        // 1. Separate into TODO (pending/late) and DONE (submitted/graded)
        // 2. Sort TODO by nearest deadline first (ascending)
        // 3. Sort DONE by newest deadline first (descending) - or submission date if available, but deadline is simpler

        const todo = transformed.filter(h => h.status === 'pending' || h.status === 'late');
        const done = transformed.filter(h => h.status !== 'pending' && h.status !== 'late');

        todo.sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return dayjs(a.dueDate).valueOf() - dayjs(b.dueDate).valueOf();
        });

        done.sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return dayjs(b.dueDate).valueOf() - dayjs(a.dueDate).valueOf();
        });

        // Show pending items first
        setHomeworks([...todo, ...done]);

      } catch (error) {
        console.error("Failed to load homeworks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeworks();
  }, [user]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted':
      case 'graded':
        return 'green';
      case 'pending':
        return 'orange';
      case 'late':
      case 'overdue':
        return 'red';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    if (!status) return 'Pending';
    // Capitalize first letter
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return '';
    const due = dayjs(dueDate);
    const now = dayjs();
    const days = due.diff(now, 'day');

    // Logic hiển thị human readable
    if (due.isSame(now, 'day')) return 'Today';
    if (days < 0) return 'Overdue';
    if (days === 0 && due.isAfter(now)) return 'Tomorrow';

    return `${days} days left`;
  };

  return (
    <Card
      className="function-card section-card"
      title={
        <div className="section-card-header">
          <FileTextOutlined className="function-icon homework-icon" />
          <Title level={4} className="function-title">Homework List</Title>
        </div>
      }
    >
      <div className="section-card-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}><Spin /></div>
        ) : homeworks.length > 0 ? (
          homeworks.slice(0, 4).map((homework) => (
            <div
              key={homework.id}
              className="homework-item"
              onClick={() => navigate(`/student/homework/${homework.classId}/${homework.lessonId}`)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <Text className="homework-title" style={{ maxWidth: '70%' }} ellipsis={{ tooltip: homework.title }}>
                  {homework.title}
                </Text>
                <Tag color={getStatusColor(homework.status)} style={{ marginLeft: 8 }}>
                  {getStatusText(homework.status)}
                </Tag>
              </div>
              <div className="homework-meta">
                <span>{homework.className}</span>
                <span>
                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                  {homework.dueDate ? dayjs(homework.dueDate).format('DD/MM/YYYY') : 'No Deadline'}
                  {homework.dueDate && homework.status !== 'submitted' && homework.status !== 'graded' && (
                    <span style={{ marginLeft: 5, color: getStatusColor(homework.status) === 'red' ? 'red' : 'gray' }}>
                      ({getDaysUntilDue(homework.dueDate)})
                    </span>
                  )}
                </span>
              </div>
            </div>
          ))
        ) : (
          <Empty
            description="No homework available"
            style={{ margin: '20px 0' }}
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
        View All Homework
      </Button>
    </Card>
  );
};

export default HomeworkList;
