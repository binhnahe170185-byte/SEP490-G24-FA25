import React, { useState, useEffect } from 'react';
import { Typography, Button, Spin, Empty, Breadcrumb, Card } from 'antd';
import { ArrowLeftOutlined, UserOutlined, CalendarOutlined, HomeOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import NewsApi from '../../vn.fpt.edu.api/News';

const { Title, Text, Paragraph } = Typography;

const StudentNewsDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (id) {
      fetchNewsDetail();
    }
  }, [id]);

  const fetchNewsDetail = async () => {
    try {
      setLoading(true);
      const response = await NewsApi.getNewsById(id);
      
      if (response) {
        setNews(response);
      }
    } catch (error) {
      console.error('Error fetching news detail:', error);
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

  const processImageUrl = (imageUrl) => {
    if (!imageUrl || typeof imageUrl !== 'string') return null;
    
    const trimmedUrl = imageUrl.trim();
    if (!trimmedUrl) return null;
    
    // Check if URL is invalid (e.g., Pinterest pin URL that is not a direct image)
    if (trimmedUrl.includes('pinterest.com/pin/') && !trimmedUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)) {
      return null;
    }
    
    // If already absolute URL
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
      return trimmedUrl;
    }
    
    // If relative path
    if (trimmedUrl.startsWith('/')) {
      const baseUrl = process.env.REACT_APP_API_BASE || 
                     (typeof window !== 'undefined' ? window.location.origin : '');
      return `${baseUrl}${trimmedUrl}`;
    }
    
    return trimmedUrl;
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', minHeight: 'calc(100vh - 64px)' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!news) {
    return (
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', minHeight: 'calc(100vh - 64px)' }}>
        <Empty description="News not found" />
        <Button 
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/student/news')}
          style={{ marginTop: '16px' }}
        >
          Back to News
        </Button>
      </div>
    );
  }

  const title = news.Title || news.title || '';
  const content = news.Content || news.content || '';
  const createdAt = news.CreatedAt || news.createdAt || '';
  
  // Extract từ CreatedByNavigation object (NewsDto trả về object, không phải string)
  const createdByNav = news.CreatedByNavigation || news.createdByNavigation || null;
  const creatorName = createdByNav 
    ? `${createdByNav.FirstName || createdByNav.firstName || ''} ${createdByNav.LastName || createdByNav.lastName || ''}`.trim()
    : (news.CreatorName || news.creatorName || null);
  const creatorEmail = createdByNav?.Email || createdByNav?.email || news.CreatorEmail || news.creatorEmail || null;
  const author = creatorName || creatorEmail || 'N/A';
  const rawImageUrl = news.NewsImage || news.newsImage || null;
  const newsImage = processImageUrl(rawImageUrl);
  const shortTitle = title.length > 50 ? title.substring(0, 50) + '...' : title;

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', minHeight: 'calc(100vh - 64px)' }}>
      {/* Breadcrumb */}
      <Breadcrumb 
        style={{ marginBottom: '16px' }}
        items={[
          {
            title: (
              <span>
                <HomeOutlined /> Home
              </span>
            ),
            onClick: () => navigate('/'),
            style: { cursor: 'pointer' }
          },
          {
            title: 'News',
            onClick: () => navigate('/student/news'),
            style: { cursor: 'pointer' }
          },
          {
            title: shortTitle
          }
        ]}
      />

      {/* Back Button */}
      <Button 
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/student/news')}
        style={{ marginBottom: '24px' }}
      >
        Back to News
      </Button>

      <Card>
        {/* Title */}
        <Title level={1} style={{ marginBottom: '16px', fontSize: '28px', fontWeight: 700 }}>
          {title}
        </Title>

        {/* Metadata */}
        <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <UserOutlined style={{ color: '#8c8c8c' }} />
            <Text style={{ color: '#8c8c8c' }}>{author}</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarOutlined style={{ color: '#8c8c8c' }} />
            <Text style={{ color: '#8c8c8c' }}>{formatDate(createdAt)}</Text>
          </div>
        </div>

        {/* Image */}
        {newsImage && (
          <div style={{ marginBottom: '24px', textAlign: 'center' }}>
            <img
              src={newsImage}
              alt="News"
              style={{ 
                maxWidth: '100%', 
                maxHeight: '400px', 
                objectFit: 'contain',
                borderRadius: '8px'
              }}
              onError={() => setImageError(true)}
            />
            {imageError && (
              <Text type="secondary" style={{ display: 'block', marginTop: '8px' }}>
                Cannot load image
              </Text>
            )}
          </div>
        )}

        {/* Content */}
        <Paragraph
          style={{
            whiteSpace: 'pre-wrap',
            fontSize: '15px',
            lineHeight: 1.75,
            color: '#434343',
            marginBottom: '24px',
            textAlign: 'justify'
          }}
        >
          {content || 'No content available.'}
        </Paragraph>

        {/* Footer */}
        <div style={{ 
          marginTop: '32px', 
          paddingTop: '16px', 
          borderTop: '1px solid #f0f0f0',
          textAlign: 'right'
        }}>
        </div>
      </Card>
    </div>
  );
};

export default StudentNewsDetail;

