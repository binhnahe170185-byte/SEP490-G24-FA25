import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Typography, Spin, message, Table, Tag, Button, Tooltip } from 'antd';
import {
  FileTextOutlined,
  CalendarOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import NewsApi from '../../vn.fpt.edu.api/News';
import SemesterApi from '../../vn.fpt.edu.api/Semester';

const { Title } = Typography;

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingNews: 0,
    publishedNews: 0,
    totalSemesters: 0,
    totalStaff: 0,
  });
  
  const [pendingNews, setPendingNews] = useState([]);
  const [semestersData, setSemestersData] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch news
      const newsResponse = await NewsApi.getNews({ page: 1, pageSize: 100 });
      const allNews = newsResponse?.items || [];
      
      const pending = allNews.filter(n => (n.status || n.Status || '').toLowerCase() === 'pending');
      const published = allNews.filter(n => (n.status || n.Status || '').toLowerCase() === 'published');
      
      setPendingNews(pending.slice(0, 5)); // Top 5 pending news
      setStats(prev => ({
        ...prev,
        pendingNews: pending.length,
        publishedNews: published.length,
      }));

      // Fetch semesters
      const semestersResponse = await SemesterApi.getSemesters({ page: 1, pageSize: 100 });
      const semesters = semestersResponse?.items || semestersResponse?.data || [];
      setSemestersData(semesters.slice(0, 5)); // Top 5 recent semesters
      setStats(prev => ({
        ...prev,
        totalSemesters: semesters.length,
      }));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      message.error('Unable to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const pendingNewsColumns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text, record) => (
        <span style={{ fontWeight: 500 }}>{text || record.Title || 'N/A'}</span>
      ),
    },
    {
      title: 'Author',
      dataIndex: 'author',
      key: 'author',
      ellipsis: { showTitle: false },
      render: (_, record) => {
        const author = record.author || record.CreatorEmail || record.authorEmail || 'N/A';
        return (
          <Tooltip placement="topLeft" title={author}>
            {author}
          </Tooltip>
        );
      },
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (_, record) => {
        const date = record.createdAt || record.CreatedAt;
        if (!date) return 'N/A';
        try {
          return new Date(date).toLocaleDateString();
        } catch {
          return date;
        }
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button 
          type="link" 
          size="small"
          onClick={() => navigate('/headOfAdmin/news', { state: { highlightId: record.id || record.Id } })}
        >
          Review
        </Button>
      ),
    },
  ];

  const semestersColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <span style={{ fontWeight: 500 }}>{text || 'N/A'}</span>,
    },
    {
      title: 'Start Date',
      dataIndex: 'startDate',
      key: 'startDate',
      render: (date) => {
        if (!date) return 'N/A';
        try {
          return new Date(date).toLocaleDateString();
        } catch {
          return date;
        }
      },
    },
    {
      title: 'End Date',
      dataIndex: 'endDate',
      key: 'endDate',
      render: (date) => {
        if (!date) return 'N/A';
        try {
          return new Date(date).toLocaleDateString();
        } catch {
          return date;
        }
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button 
          type="link" 
          size="small"
          onClick={() => navigate('/headOfAdmin/semesters')}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '0' }}>
      <Title level={2} style={{ marginBottom: 32, color: '#1890ff' }}>
        <BarChartOutlined style={{ marginRight: 12, fontSize: '28px' }} />
        Dashboard
      </Title>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px' }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* Statistics Cards */}
          <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
            <Col xs={24} sm={12} lg={6}>
              <Card 
                hoverable 
                style={{ 
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  borderTop: '4px solid #faad14'
                }}
              >
                <Statistic
                  title="Pending News"
                  value={stats.pendingNews}
                  prefix={<ClockCircleOutlined style={{ fontSize: '24px' }} />}
                  valueStyle={{ color: '#faad14', fontSize: '32px' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card 
                hoverable 
                style={{ 
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  borderTop: '4px solid #52c41a'
                }}
              >
                <Statistic
                  title="Published News"
                  value={stats.publishedNews}
                  prefix={<CheckCircleOutlined style={{ fontSize: '24px' }} />}
                  valueStyle={{ color: '#52c41a', fontSize: '32px' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card 
                hoverable 
                style={{ 
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  borderTop: '4px solid #1890ff'
                }}
              >
                <Statistic
                  title="Total Semesters"
                  value={stats.totalSemesters}
                  prefix={<CalendarOutlined style={{ fontSize: '24px' }} />}
                  valueStyle={{ color: '#1890ff', fontSize: '32px' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card 
                hoverable 
                style={{ 
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  borderTop: '4px solid #722ed1'
                }}
              >
                <Statistic
                  title="Administration Staff"
                  value={stats.totalStaff}
                  prefix={<TeamOutlined style={{ fontSize: '24px' }} />}
                  valueStyle={{ color: '#722ed1', fontSize: '32px' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Pending News Table */}
          <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
            <Col xs={24} lg={16}>
              <Card 
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '18px', fontWeight: 600, color: '#faad14' }}>
                      <FileTextOutlined style={{ marginRight: 8 }} />
                      Pending News Review
                    </span>
                    {stats.pendingNews > 0 && (
                      <Button 
                        type="link" 
                        onClick={() => navigate('/headOfAdmin/news', { state: { filterStatus: 'pending' } })}
                      >
                        View All ({stats.pendingNews})
                      </Button>
                    )}
                  </div>
                }
                style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              >
                {pendingNews.length > 0 ? (
                  <Table
                    columns={pendingNewsColumns}
                    dataSource={pendingNews}
                    pagination={false}
                    rowKey={(record) => record.id || record.Id || Math.random()}
                    size="small"
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    No pending news to review
                  </div>
                )}
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card 
                title={
                  <span style={{ fontSize: '18px', fontWeight: 600, color: '#1890ff' }}>
                    <CalendarOutlined style={{ marginRight: 8 }} />
                    Recent Semesters
                  </span>
                }
                style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              >
                {semestersData.length > 0 ? (
                  <Table
                    columns={semestersColumns}
                    dataSource={semestersData}
                    pagination={false}
                    rowKey={(record) => record.semesterId || record.id || Math.random()}
                    size="small"
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    No semesters available
                  </div>
                )}
              </Card>
            </Col>
          </Row>

          {/* Quick Actions */}
          <Row gutter={[24, 24]}>
            <Col xs={24}>
              <Card 
                title={
                  <span style={{ fontSize: '18px', fontWeight: 600, color: '#722ed1' }}>
                    Quick Actions
                  </span>
                }
                style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              >
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} md={6}>
                    <Button 
                      type="primary" 
                      block 
                      icon={<FileTextOutlined />}
                      onClick={() => navigate('/headOfAdmin/news')}
                      style={{ height: '60px', fontSize: '16px' }}
                    >
                      Manage News
                    </Button>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Button 
                      block 
                      icon={<CalendarOutlined />}
                      onClick={() => navigate('/headOfAdmin/semesters')}
                      style={{ height: '60px', fontSize: '16px' }}
                    >
                      Manage Semesters
                    </Button>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Button 
                      block 
                      icon={<TeamOutlined />}
                      onClick={() => navigate('/headOfAdmin/staff')}
                      style={{ height: '60px', fontSize: '16px' }}
                    >
                      Manage Staff
                    </Button>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Button 
                      block 
                      icon={<CalendarOutlined />}
                      onClick={() => navigate('/headOfAdmin/semesters/add')}
                      style={{ height: '60px', fontSize: '16px' }}
                    >
                      Add Semester
                    </Button>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default Dashboard;

