import React, { useState } from 'react';
import { Card, Typography, Button, Tag, Empty } from 'antd';
import { FileTextOutlined, RightOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const HomeworkList = () => {
  const navigate = useNavigate();
  
  // Hardcoded homework data
  const [homeworks] = useState([
    {
      id: 1,
      title: 'PRF192 Assignment 5',
      subject: 'PRF192',
      dueDate: '2024-12-25',
      status: 'pending',
      className: 'PRF192-AE1'
    },
    {
      id: 2,
      title: 'Lab Report - MAE101',
      subject: 'MAE101',
      dueDate: '2024-12-28',
      status: 'submitted',
      className: 'MAE101-AE1'
    },
    {
      id: 3,
      title: 'Project Proposal - SWP391',
      subject: 'SWP391',
      dueDate: '2024-12-30',
      status: 'pending',
      className: 'SWP391-AE1'
    },
    {
      id: 4,
      title: 'Essay Assignment - VOV124',
      subject: 'VOV124',
      dueDate: '2025-01-05',
      status: 'pending',
      className: 'VOV124-AE1'
    }
  ]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted':
        return 'green';
      case 'pending':
        return 'orange';
      case 'late':
        return 'red';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'submitted':
        return 'Submitted';
      case 'pending':
        return 'Pending';
      case 'late':
        return 'Late';
      default:
        return status;
    }
  };

  const getDaysUntilDue = (dueDate) => {
    const days = dayjs(dueDate).diff(dayjs(), 'day');
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Today';
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
        {homeworks.length > 0 ? (
          homeworks.slice(0, 4).map((homework) => (
            <div key={homework.id} className="homework-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <Text className="homework-title">{homework.title}</Text>
                <Tag color={getStatusColor(homework.status)} style={{ marginLeft: 8 }}>
                  {getStatusText(homework.status)}
                </Tag>
              </div>
              <div className="homework-meta">
                <span>{homework.subject} - {homework.className}</span>
                <span>
                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                  {dayjs(homework.dueDate).format('DD/MM/YYYY')} ({getDaysUntilDue(homework.dueDate)})
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

