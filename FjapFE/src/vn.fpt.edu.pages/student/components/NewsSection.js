import React, { useState } from 'react';
import { Card, Typography, Empty } from 'antd';
import { NotificationOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const NewsSection = () => {
  // Hardcoded news data
  const [news] = useState([
    {
      id: 1,
      title: 'Final Exam Schedule Announcement - Fall 2025',
      date: '2024-12-20',
      category: 'Announcement'
    },
    {
      id: 2,
      title: 'Course Registration Guide for Spring 2026',
      date: '2024-12-18',
      category: 'Guide'
    },
    {
      id: 3,
      title: 'Schedule Change for PRF192 Next Week',
      date: '2024-12-15',
      category: 'Announcement'
    },
    {
      id: 4,
      title: 'Effective Study Skills Workshop - This Saturday',
      date: '2024-12-12',
      category: 'Event'
    },
    {
      id: 5,
      title: 'Midterm Exam Results Published',
      date: '2024-12-10',
      category: 'Announcement'
    }
  ]);

  const formatDate = (date) => {
    return dayjs(date).format('DD/MM/YYYY');
  };

  return (
    <Card 
      className="section-card"
      title={
        <div className="section-card-header">
          <NotificationOutlined className="section-card-icon" />
          <Title level={4} className="section-card-title">News</Title>
        </div>
      }
    >
      <div className="section-card-content">
        {news.length > 0 ? (
          news.map((item) => (
            <div 
              key={item.id} 
              className="news-item"
              onClick={() => {
                // Handle news click
                console.log('View news:', item.id);
              }}
            >
              <div className="news-title">{item.title}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <Text className="news-date">{formatDate(item.date)}</Text>
                <Text className="news-date" style={{ color: '#1890ff' }}>
                  {item.category}
                </Text>
              </div>
            </div>
          ))
        ) : (
          <Empty 
            description="No news available"
            style={{ margin: '20px 0' }}
          />
        )}
      </div>
    </Card>
  );
};

export default NewsSection;

