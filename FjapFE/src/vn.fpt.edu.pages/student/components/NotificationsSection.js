import React, { useState } from 'react';
import { Card, Typography, Badge, Empty } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const NotificationsSection = () => {
  // Hardcoded notifications data
  const [notifications] = useState([
    {
      id: 1,
      content: 'You have a new assignment: PRF192 - Assignment 5',
      time: '2024-12-20 10:30',
      read: false,
      type: 'homework'
    },
    {
      id: 2,
      content: 'MAE101 grades have been updated',
      time: '2024-12-19 14:20',
      read: false,
      type: 'grade'
    },
    {
      id: 3,
      content: 'Schedule change for next week - Please check',
      time: '2024-12-18 09:15',
      read: true,
      type: 'schedule'
    },
    {
      id: 4,
      content: 'Reminder: SWP391 assignment due in 2 days',
      time: '2024-12-17 16:45',
      read: true,
      type: 'reminder'
    },
    {
      id: 5,
      content: 'Attendance notice: You have missed 2 PRF192 classes',
      time: '2024-12-16 11:00',
      read: true,
      type: 'attendance'
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatDateTime = (datetime) => {
    const date = dayjs(datetime);
    const now = dayjs();
    const diffDays = now.diff(date, 'day');
    
    if (diffDays === 0) {
      return date.format('HH:mm');
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.format('DD/MM/YYYY');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'homework':
        return '📝';
      case 'grade':
        return '📊';
      case 'schedule':
        return '📅';
      case 'reminder':
        return '⏰';
      case 'attendance':
        return '✓';
      default:
        return '🔔';
    }
  };

  return (
    <Card 
      className="section-card"
      title={
        <div className="section-card-header">
          <Badge count={unreadCount} className="notification-badge">
            <BellOutlined className="section-card-icon" />
          </Badge>
          <Title level={4} className="section-card-title">Notifications</Title>
        </div>
      }
    >
      <div className="section-card-content">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <div 
              key={notification.id} 
              className="notification-item"
              onClick={() => {
                // Handle notification click
                console.log('View notification:', notification.id);
              }}
              style={{
                backgroundColor: !notification.read ? '#e6f7ff' : 'transparent',
                fontWeight: !notification.read ? 500 : 400
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontSize: 16 }}>{getNotificationIcon(notification.type)}</span>
                <div style={{ flex: 1 }}>
                  <div className="notification-content">{notification.content}</div>
                  <Text className="notification-time">
                    {formatDateTime(notification.time)}
                  </Text>
                </div>
              </div>
            </div>
          ))
        ) : (
          <Empty 
            description="No new notifications"
            style={{ margin: '20px 0' }}
          />
        )}
      </div>
    </Card>
  );
};

export default NotificationsSection;

