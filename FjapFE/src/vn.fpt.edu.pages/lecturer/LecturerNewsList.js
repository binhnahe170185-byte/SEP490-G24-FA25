import React, { useState, useEffect } from 'react';
import { Card, Typography, Empty, Button, Spin, List, Pagination, Breadcrumb } from 'antd';
import { ArrowLeftOutlined, CalendarOutlined, HomeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import NewsApi from '../../vn.fpt.edu.api/News';

const { Title, Text } = Typography;

const LecturerNewsList = () => {
  const navigate = useNavigate();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    fetchNews();
  }, [page, pageSize]);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const response = await NewsApi.getNews({ 
        page, 
        pageSize,
        status: 'published' 
      });
      
      if (response && response.items) {
        setNews(response.items);
        setTotal(response.total || 0);
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
    navigate(`/lecturer/news/${newsId}`);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (current, newPageSize) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to page 1 when pageSize changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
            onClick: () => navigate('/lecturer/homepage'),
            style: { cursor: 'pointer' }
          },
          {
            title: 'News'
          }
        ]}
      />

      <div style={{ marginBottom: '24px' }}>
        <Button 
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/lecturer/homepage')}
          style={{ marginBottom: '16px' }}
        >
          Back to Homepage
        </Button>
        <Title level={2} style={{ margin: 0 }}>Latest News</Title>
      </div>

      <Card>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
          </div>
        ) : news.length > 0 ? (
          <>
            <List
              dataSource={news}
              renderItem={(item) => {
                const title = item.Title || item.title || '';
                const createdAt = item.CreatedAt || item.createdAt || '';
                const newsId = item.Id || item.id;
                
                return (
                  <List.Item
                    style={{
                      borderBottom: '1px solid #f0f0f0',
                      padding: '16px 0',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleViewDetails(newsId)}
                  >
                    <List.Item.Meta
                      title={
                        <Text 
                          strong 
                          style={{ 
                            color: '#1890ff',
                            fontSize: '16px'
                          }}
                        >
                          {title}
                        </Text>
                      }
                      description={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                          <CalendarOutlined style={{ color: '#8c8c8c' }} />
                          <Text style={{ color: '#8c8c8c', fontSize: '12px' }}>
                            {formatDate(createdAt)}
                          </Text>
                        </div>
                      }
                    />
                    <Button 
                      type="link"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(newsId);
                      }}
                    >
                      View Details
                    </Button>
                  </List.Item>
                );
              }}
            />
            {/* Pagination - Always show if there's data */}
            {total > 0 && (
              <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #f0f0f0' }}>
                <Pagination
                  current={page}
                  total={total}
                  pageSize={pageSize}
                  onChange={handlePageChange}
                  onShowSizeChange={handlePageSizeChange}
                  showSizeChanger={true}
                  pageSizeOptions={['10', '20', '50', '100']}
                  showQuickJumper={total > pageSize * 5}
                  showTotal={(total, range) => 
                    `Showing ${range[0]}-${range[1]} of ${total} news`
                  }
                  style={{ 
                    textAlign: 'center',
                    display: 'flex',
                    justifyContent: 'center'
                  }}
                />
              </div>
            )}
          </>
        ) : (
          <Empty 
            description="No news available"
            style={{ margin: '40px 0' }}
          />
        )}
      </Card>
    </div>
  );
};

export default LecturerNewsList;

