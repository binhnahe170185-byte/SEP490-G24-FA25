import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Typography, Spin, message } from 'antd';
import {
  BookOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserOutlined,
  BarChartOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { Column, Pie, Line } from '@ant-design/charts';
import ClassList from '../../vn.fpt.edu.api/ClassList';
import ManagerGrades from '../../vn.fpt.edu.api/ManagerGrades';
import { getSubjects } from '../../vn.fpt.edu.api/Material';
import LecturerHomework from '../../vn.fpt.edu.api/LecturerHomework';

const { Title } = Typography;

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
  const [homeworkData, setHomeworkData] = useState([]);
  const [chartData, setChartData] = useState({
    passRateBySemester: [],
    attendanceRateBySemester: [],
    averageScoreBySemester: []
  });

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
      { type: 'Active', value: 45 },
      { type: 'Completed', value: 23 },
      { type: 'Upcoming', value: 12 },
      { type: 'Cancelled', value: 3 },
    ],
    gradeTrend: [
      { semester: 'FA23', average: 7.8, passed: 85 },
      { semester: 'SP24', average: 8.1, passed: 88 },
      { semester: 'SU24', average: 7.9, passed: 86 },
      { semester: 'FA24', average: 8.3, passed: 90 },
      { semester: 'SP25', average: 8.0, passed: 87 },
    ],
    homeworkBySubject: [
      { subject: 'PRF192', submissions: 450 },
      { subject: 'MAE101', submissions: 320 },
      { subject: 'SWP391', submissions: 580 },
      { subject: 'CSI104', submissions: 210 },
      { subject: 'JPD113', submissions: 190 },
    ],
    homeworkStatus: [
      { type: 'Submitted', value: 1250 },
      { type: 'Pending', value: 340 },
      { type: 'Late', value: 120 },
      { type: 'Missing', value: 45 },
    ]
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

      // Fetch homework data
      try {
        const homeworks = await LecturerHomework.getAllHomeworks();
        setHomeworkData(Array.isArray(homeworks) ? homeworks : []);
      } catch (err) {
        console.warn('Homework data not available:', err);
        setHomeworkData([]);
      }

      // Fetch grade statistics
      let gradeData = null;
      try {
        gradeData = await ManagerGrades.getStatistics();
        setGradeStats(gradeData);
      } catch (err) {
        console.warn('Grade statistics not available:', err);
        setGradeStats(null);
      }

      // Fetch dashboard charts (Pass Rate & Attendance Rate)
      try {
        const charts = await ManagerGrades.getDashboardCharts();
        setChartData(charts);
      } catch (err) {
        console.warn('Dashboard charts not available:', err);
      }

      // Calculate stats from real data
      if (Array.isArray(classes) && classes.length > 0) {
        const activeClasses = classes.filter(c => c.status === 'Active' || c.status === 'active');
        const totalStudents = classes.reduce((sum, c) => sum + (c.studentCount || 0), 0);

        setStats({
          totalClasses: classes.length,
          totalSubjects: Array.isArray(subjects) ? subjects.length : mockData.classesBySubject.length,
          activeClasses: activeClasses.length,
          totalStudents: gradeData?.totalStudents || 0, // Prioritize unique count from GradeStats
        });
      } else {
        // Use mock data
        setStats({
          totalClasses: mockData.classesBySubject.reduce((sum, s) => sum + s.count, 0),
          totalSubjects: mockData.classesBySubject.length,
          activeClasses: mockData.classesByStatus.find(s => s.type === 'Active')?.value || 0,
          totalStudents: gradeData?.totalStudents || mockData.classesBySubject.reduce((sum, s) => sum + s.students, 0),
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

  // Prepare homework data for charts
  const getHomeworkBySubjectData = () => {
    if (homeworkData.length > 0) {
      const subjectMap = {};
      homeworkData.forEach(hw => {
        const subject = hw.subjectCode || 'Unknown';
        if (!subjectMap[subject]) {
          subjectMap[subject] = { subject, submissions: 0 };
        }
        subjectMap[subject].submissions += hw.submissions || 0;
      });

      return Object.values(subjectMap).sort((a, b) => b.submissions - a.submissions).slice(0, 10);
    }
    return mockData.homeworkBySubject;
  };

  const getHomeworkStatusData = () => {
    if (homeworkData.length > 0) {
      let submitted = 0;
      let pending = 0;
      let late = 0;

      homeworkData.forEach(hw => {
        const submissionCount = hw.submissions || 0;
        const totalStudents = hw.totalStudents || 0;
        const deadline = hw.deadline ? new Date(hw.deadline) : null;
        const now = new Date();

        submitted += submissionCount;

        if (deadline && now > deadline) {
          late += Math.max(0, totalStudents - submissionCount);
        } else {
          pending += Math.max(0, totalStudents - submissionCount);
        }
      });

      return [
        { type: 'Submitted', value: submitted },
        { type: 'Pending', value: pending },
        { type: 'Late', value: late },
      ].filter(item => item.value > 0);
    }
    return mockData.homeworkStatus;
  };

  // Chart Configurations
  const columnConfig = {
    data: getHomeworkBySubjectData(),
    xField: 'subject',
    yField: 'submissions',
    height: 280,
    label: {
      position: 'top',
      style: {
        fill: '#000000',
        opacity: 0.6,
      },
    },
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: false,
      },
    },
    meta: {
      subject: { alias: 'Subject' },
      submissions: { alias: 'Submissions' },
    },
    color: '#1890ff',
  };

  const pieConfig = {
    appendPadding: 10,
    data: getHomeworkStatusData(),
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    legend: {
      position: 'bottom',
    },
    statistic: {
      title: false,
      content: {
        style: {
          whiteSpace: 'pre-wrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
      },
    },
    interactions: [{ type: 'pie-legend-active' }, { type: 'element-active' }],
    color: ({ type }) => {
      if (type === 'Submitted') return '#52c41a';
      if (type === 'Pending') return '#faad14';
      if (type === 'Late') return '#fa8c16';
      return '#f5222d';
    },
  };

  const lineConfig = {
    data: chartData.averageScoreBySemester.length > 0 ? chartData.averageScoreBySemester : [],
    xField: 'name',
    yField: 'value',
    height: 280,
    label: {
      position: 'top',
      offsetY: -15,
      style: {
        fill: '#000',
        fontWeight: 500,
        fontSize: 12,
        textBaseline: 'bottom',
      },
    },
    point: {
      size: 5,
      shape: 'diamond',
      style: {
        fill: 'white',
        stroke: '#5B8FF9',
        lineWidth: 2,
      },
    },
    tooltip: { showMarkers: false },
    state: {
      active: {
        style: {
          shadowBlur: 4,
          stroke: '#000',
          fill: 'red',
        },
      },
    },
    interactions: [{ type: 'marker-active' }],
    color: '#52c41a',
  };

  // Pass Rate Chart Config (Column Chart)
  const passRateConfig = {
    data: chartData.passRateBySemester.length > 0 ? chartData.passRateBySemester : [], // Use real data or empty
    xField: 'name',
    yField: 'value',
    label: {
      position: 'top',
      style: {
        fill: '#FFFFFF',
        opacity: 0.6,
      },
    },
    xAxis: {
      label: {
        autoHide: false,
        autoRotate: false,
        style: {
          rotate: Math.PI / 4, // Diagonal rotation
          textAlign: 'start',
          textBaseline: 'middle'
        }
      },
      title: { text: 'Semester' }
    },
    yAxis: {
      title: { text: 'Pass Rate (%)' },
      max: 100
    },
    meta: {
      name: { alias: 'Semester' },
      value: { alias: 'Pass Rate' },
    },
    color: '#1890ff',
    showTitle: false
  };

  // Attendance Rate Chart Config (Line Chart)
  const attendanceRateConfig = {
    data: chartData.attendanceRateBySemester.length > 0 ? chartData.attendanceRateBySemester : [],
    xField: 'name',
    yField: 'value',
    point: {
      size: 5,
      shape: 'diamond',
    },
    label: {
      style: {
        fill: '#000',
      },
    },
    yAxis: {
      title: { text: 'Attendance Rate (%)' },
      max: 100,
      min: 0
    },
    xAxis: {
      title: { text: 'Semester' }
    },
    color: '#722ed1',
    showTitle: false
  };

  // Calculate Submission Rate
  const submissionRate = (() => {
    if (homeworkData.length > 0) {
      const total = homeworkData.reduce((sum, hw) => sum + (hw.totalStudents || 0), 0);
      const submitted = homeworkData.reduce((sum, hw) => sum + (hw.submissions || 0), 0);
      return total > 0 ? ((submitted / total) * 100).toFixed(1) : 0;
    }
    return 75.5; // Mock value
  })();

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

          {/* Charts Row 1 - Grade Statistics */}
          <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
            <Col xs={24} lg={16}>
              <Card
                title={
                  <span style={{ fontSize: '18px', fontWeight: 600, color: '#52c41a' }}>
                    Average Score Trend by Semester
                  </span>
                }
                style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              >
                <Line {...lineConfig} />
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
                      title="Submission Rate"
                      value={submissionRate}
                      suffix="%"
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
                      title="Submission Rate"
                      value={submissionRate}
                      suffix="%"
                      valueStyle={{ color: '#722ed1', fontSize: '24px' }}
                    />
                  </div>
                )}
              </Card>
            </Col>
          </Row>

          {/* Charts Row 2 - New Charts (Pass Rate & Attendance Rate) */}
          <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
            <Col xs={24} lg={12}>
              <Card
                title={
                  <span style={{ fontSize: '18px', fontWeight: 600, color: '#1890ff' }}>
                    Pass Rate by Semester
                  </span>
                }
                style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              >
                {chartData.passRateBySemester.length > 0 ? (
                  <Column {...passRateConfig} />
                ) : (
                  <div style={{ textAlign: 'center', padding: '50px 0', color: '#999' }}>No data available</div>
                )}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card
                title={
                  <span style={{ fontSize: '18px', fontWeight: 600, color: '#722ed1' }}>
                    Attendance Rate by Semester
                  </span>
                }
                style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              >
                {chartData.attendanceRateBySemester.length > 0 ? (
                  <Line {...attendanceRateConfig} />
                ) : (
                  <div style={{ textAlign: 'center', padding: '50px 0', color: '#999' }}>No data available</div>
                )}
              </Card>
            </Col>
          </Row>

          {/* Charts Row 2 - Homework */}
          {/* <Row gutter={[24, 24]}>
            <Col xs={24} lg={14}>
              <Card
                title={
                  <span style={{ fontSize: '18px', fontWeight: 600, color: '#1890ff' }}>
                    Homework Submissions by Subject
                  </span>
                }
                style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              >
                <Column {...columnConfig} />
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card
                title={
                  <span style={{ fontSize: '18px', fontWeight: 600, color: '#722ed1' }}>
                    Homework Completion Status
                  </span>
                }
                style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              >
                <Pie {...pieConfig} />
              </Card>
            </Col>
          </Row> */}
        </>
      )}
    </div>
  );
};

export default Dashboard;
