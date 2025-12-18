import React, { useState, useEffect } from 'react';
import { Card, Typography, Empty, Button, Spin } from 'antd';
import { NotificationOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import NewsApi from '../../../vn.fpt.edu.api/News';

const { Title, Text } = Typography;

const NewsSection = ({ basePath = '/student' }) => {
  const navigate = useNavigate();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLatestNews();
  }, []);

  const fetchLatestNews = async () => {
    try {
      setLoading(true);
      // Lấy 5 news gần nhất với status=published
      const response = await NewsApi.getNews({
        page: 1,
        pageSize: 5,
        status: 'published'
      });

      if (response && response.items) {
        setNews(response.items);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return dayjs(dateStr).format('DD/MM/YY HH:mm');
    } catch {
      return dateStr;
    }
  };

  const handleViewDetails = (newsId) => {
    navigate(`${basePath}/news/${newsId}`);
  };

  const handleViewAll = () => {
    navigate(`${basePath}/news`);
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
      extra={
        <Button
          type="link"
          onClick={handleViewAll}
          style={{ padding: 0 }}
        >
          View All
        </Button>
      }
    >
      <div className="section-card-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin />
          </div>
        ) : news.length > 0 ? (
          <>
            {news.map((item) => {
              const title = item.Title || item.title || '';
              const createdAt = item.CreatedAt || item.createdAt || '';
              const newsId = item.Id || item.id;

              return (
                <div
                  key={newsId}
                  className="news-item"
                  style={{
                    cursor: 'pointer',
                    padding: '12px 0',
                    borderBottom: '1px solid #f0f0f0'
                  }}
                  onClick={() => handleViewDetails(newsId)}
                >
                  <div
                    className="news-title"
                    style={{
                      color: '#1890ff',
                      marginBottom: '4px',
                      fontWeight: 500
                    }}
                  >
                    {title}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text className="news-date" style={{ color: '#8c8c8c', fontSize: '12px' }}>
                      {formatDate(createdAt)}
                    </Text>
                    <Button
                      type="link"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(newsId);
                      }}
                      style={{ padding: 0, height: 'auto' }}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              );
            })}
          </>
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

