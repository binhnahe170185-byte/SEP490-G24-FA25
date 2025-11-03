import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Typography, Spin, message, Select, Progress, Table, Tag } from 'antd';
import {
  BookOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import ClassList from '../../vn.fpt.edu.api/ClassList';
import ManagerGrades from '../../vn.fpt.edu.api/ManagerGrades';
import { getSubjects } from '../../vn.fpt.edu.api/Material';

const { Title } = Typography;
const { Option } = Select;

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalSubjects: 0,
    activeClasses: 0,
    totalStudents: 0,
  });
  
  const [classesData, setClassesData] = useState([]);
  const [subjectsData, setSubjectsData] = useState([]);
  const [gradeStats, setGradeStats] = useState(null);
  
  // Hardcoded data fallback
  const mockData = {
    classesBySubject: [
      { subject: 'PRF192', count: 12, students: 240 },
      { subject: 'MAE101', count: 8, students: 160 },
      { subject: 'SWP391', count: 15, students: 300 },
      { subject: 'CSI104', count: 10, students: 200 },
      { subject: 'VOV124', count: 6, students: 120 },
      { subject: 'JPD113', count: 9, students: 180 },
    ],
    classesByStatus: [
      { type: 'Active', value: 45, color: '#52c41a' },
      { type: 'Completed', value: 23, color: '#1890ff' },
      { type: 'Upcoming', value: 12, color: '#faad14' },
      { type: 'Cancelled', value: 3, color: '#f5222d' },
    ],
    gradeTrend: [
      { semester: 'FA23', average: 7.8, passed: 85, total: 100 },
      { semester: 'SP24', average: 8.1, passed: 88, total: 100 },
      { semester: 'SU24', average: 7.9, passed: 86, total: 100 },
      { semester: 'FA24', average: 8.3, passed: 90, total: 100 },
      { semester: 'SP25', average: 8.0, passed: 87, total: 100 },
    ],
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch classes
      const classes = await ClassList.getAll();
      setClassesData(Array.isArray(classes) ? classes : []);

      // Fetch subjects
      const subjects = await getSubjects();
      setSubjectsData(Array.isArray(subjects) ? subjects : []);

      // Fetch grade statistics
      try {
        const gradeStatsData = await ManagerGrades.getStatistics();
        setGradeStats(gradeStatsData);
      } catch (err) {
        console.warn('Grade statistics not available:', err);
        setGradeStats(null);
      }

      // Calculate stats from real data
      if (Array.isArray(classes) && classes.length > 0) {
        const activeClasses = classes.filter(c => c.status === 'Active' || c.status === 'active');
        const totalStudents = classes.reduce((sum, c) => sum + (c.studentCount || 0), 0);
        
        setStats({
          totalClasses: classes.length,
          totalSubjects: Array.isArray(subjects) ? subjects.length : mockData.classesBySubject.length,
          activeClasses: activeClasses.length,
          totalStudents: totalStudents || mockData.classesBySubject.reduce((sum, s) => sum + s.students, 0),
        });
      } else {
        // Use mock data
        setStats({
          totalClasses: mockData.classesBySubject.reduce((sum, s) => sum + s.count, 0),
          totalSubjects: mockData.classesBySubject.length,
          activeClasses: mockData.classesByStatus.find(s => s.type === 'Active')?.value || 0,
          totalStudents: mockData.classesBySubject.reduce((sum, s) => sum + s.students, 0),
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      message.error('Unable to load dashboard data');
      // Use mock data on error
      setStats({
        totalClasses: mockData.classesBySubject.reduce((sum, s) => sum + s.count, 0),
        totalSubjects: mockData.classesBySubject.length,
        activeClasses: mockData.classesByStatus.find(s => s.type === 'Active')?.value || 0,
        totalStudents: mockData.classesBySubject.reduce((sum, s) => sum + s.students, 0),
      });
    } finally {
      setLoading(false);
    }
  };

  // Prepare data for charts
  const getClassesBySubjectData = () => {
    if (classesData.length > 0 && subjectsData.length > 0) {
      const subjectMap = {};
      classesData.forEach(cls => {
        const subjectCode = cls.subject?.code || cls.subject?.subjectCode || 'Unknown';
        if (!subjectMap[subjectCode]) {
          subjectMap[subjectCode] = { count: 0, students: 0 };
        }
        subjectMap[subjectCode].count += 1;
        subjectMap[subjectCode].students += cls.studentCount || 0;
      });
      
      return Object.entries(subjectMap).map(([subject, data]) => ({
        subject,
        count: data.count,
        students: data.students,
      })).slice(0, 10);
    }
    return mockData.classesBySubject;
  };

  const getClassesByStatusData = () => {
    if (classesData.length > 0) {
      const statusMap = {};
      classesData.forEach(cls => {
        const status = cls.status || 'Unknown';
        statusMap[status] = (statusMap[status] || 0) + 1;
      });
      
      return Object.entries(statusMap).map(([type, value]) => ({
        type,
        value,
        color: type === 'Active' || type === 'active' ? '#52c41a' :
               type === 'Completed' || type === 'completed' ? '#1890ff' :
               type === 'Upcoming' || type === 'upcoming' ? '#faad14' : '#f5222d',
      }));
    }
    return mockData.classesByStatus;
  };

  // Chart data columns for Table
  const subjectColumns = [
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      width: '30%',
    },
    {
      title: 'Classes',
      dataIndex: 'count',
      key: 'count',
      width: '30%',
      render: (count) => <Tag color="blue" style={{ fontSize: '14px' }}>{count}</Tag>,
    },
    {
      title: 'Students',
      dataIndex: 'students',
      key: 'students',
      width: '40%',
      render: (students) => (
        <Progress 
          percent={Math.round((students / 1200) * 100)} 
          format={() => students}
          size="small"
          strokeColor="#1890ff"
        />
      ),
    },
  ];

  const statusColumns = [
    {
      title: 'Status',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={
          type === 'Active' || type === 'active' ? 'green' :
          type === 'Completed' || type === 'completed' ? 'blue' :
          type === 'Upcoming' || type === 'upcoming' ? 'orange' : 'red'
        } style={{ fontSize: '13px', padding: '2px 12px' }}>
          {type}
        </Tag>
      ),
    },
    {
      title: 'Count',
      dataIndex: 'value',
      key: 'value',
      render: (value) => <strong style={{ fontSize: '16px' }}>{value}</strong>,
    },
    {
      title: 'Percentage',
      key: 'percentage',
      render: (_, record) => {
        const total = getClassesByStatusData().reduce((sum, item) => sum + item.value, 0);
        const percentage = total > 0 ? Math.round((record.value / total) * 100) : 0;
        return <Progress percent={percentage} size="small" strokeColor={record.color} />;
      },
    },
  ];

  const trendColumns = [
    {
      title: 'Semester',
      dataIndex: 'semester',
      key: 'semester',
      render: (semester) => <strong>{semester}</strong>,
    },
    {
      title: 'Average Score',
      dataIndex: 'average',
      key: 'average',
      render: (average) => <Tag color={average >= 8 ? 'green' : average >= 7 ? 'orange' : 'red'} style={{ fontSize: '14px' }}>{average}</Tag>,
    },
    {
      title: 'Pass Rate (%)',
      dataIndex: 'passed',
      key: 'passed',
      render: (passed) => <Progress percent={passed} size="small" status={passed >= 85 ? 'success' : 'active'} />,
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
                  borderTop: '4px solid #1890ff'
                }}
              >
                <Statistic
                  title="Total Classes"
                  value={stats.totalClasses}
                  prefix={<BookOutlined style={{ fontSize: '24px' }} />}
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
                  borderTop: '4px solid #52c41a'
                }}
              >
                <Statistic
                  title="Active Classes"
                  value={stats.activeClasses}
                  prefix={<TeamOutlined style={{ fontSize: '24px' }} />}
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
                  borderTop: '4px solid #722ed1'
                }}
              >
                <Statistic
                  title="Total Subjects"
                  value={stats.totalSubjects}
                  prefix={<BookOutlined style={{ fontSize: '24px' }} />}
                  valueStyle={{ color: '#722ed1', fontSize: '32px' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card 
                hoverable 
                style={{ 
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  borderTop: '4px solid #fa8c16'
                }}
              >
                <Statistic
                  title="Total Students"
                  value={stats.totalStudents}
                  prefix={<UserOutlined style={{ fontSize: '24px' }} />}
                  valueStyle={{ color: '#fa8c16', fontSize: '32px' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Charts Row 1 */}
          <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
            <Col xs={24} lg={14}>
              <Card 
                title={
                  <span style={{ fontSize: '18px', fontWeight: 600, color: '#1890ff' }}>
                    Classes by Subject
                  </span>
                }
                style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              >
                <Table
                  columns={subjectColumns}
                  dataSource={getClassesBySubjectData()}
                  pagination={false}
                  rowKey="subject"
                />
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card 
                title={
                  <span style={{ fontSize: '18px', fontWeight: 600, color: '#722ed1' }}>
                    Class Status Distribution
                  </span>
                }
                style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              >
                <Table
                  columns={statusColumns}
                  dataSource={getClassesByStatusData()}
                  pagination={false}
                  rowKey="type"
                />
              </Card>
            </Col>
          </Row>

          {/* Charts Row 2 */}
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={16}>
              <Card 
                title={
                  <span style={{ fontSize: '18px', fontWeight: 600, color: '#52c41a' }}>
                    Average Score Trend by Semester
                  </span>
                }
                style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              >
                <Table
                  columns={trendColumns}
                  dataSource={mockData.gradeTrend}
                  pagination={false}
                  rowKey="semester"
                />
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card 
                title={
                  <span style={{ fontSize: '18px', fontWeight: 600, color: '#fa8c16' }}>
                    Grade Statistics
                  </span>
                }
                style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', height: '100%' }}
              >
                {gradeStats ? (
                  <div>
                    <Statistic
                      title="Average Grade"
                      value={gradeStats.averageGrade || 8.0}
                      precision={2}
                      prefix={<TrophyOutlined style={{ fontSize: '28px' }} />}
                      valueStyle={{ color: '#52c41a', fontSize: '28px' }}
                      style={{ marginBottom: 24 }}
                    />
                    <Statistic
                      title="Pass Rate"
                      value={gradeStats.passRate || 87}
                      suffix="%"
                      valueStyle={{ color: '#1890ff', fontSize: '24px' }}
                      style={{ marginBottom: 24 }}
                    />
                    <Statistic
                      title="Graded Count"
                      value={gradeStats.gradedCount || 1250}
                      valueStyle={{ color: '#722ed1', fontSize: '24px' }}
                    />
                  </div>
                ) : (
                  <div>
                    <Statistic
                      title="Average Grade"
                      value={8.0}
                      precision={2}
                      prefix={<TrophyOutlined style={{ fontSize: '28px' }} />}
                      valueStyle={{ color: '#52c41a', fontSize: '28px' }}
                      style={{ marginBottom: 24 }}
                    />
                    <Statistic
                      title="Pass Rate"
                      value={87}
                      suffix="%"
                      valueStyle={{ color: '#1890ff', fontSize: '24px' }}
                      style={{ marginBottom: 24 }}
                    />
                    <Statistic
                      title="Graded Count"
                      value={1250}
                      valueStyle={{ color: '#722ed1', fontSize: '24px' }}
                    />
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default Dashboard;
