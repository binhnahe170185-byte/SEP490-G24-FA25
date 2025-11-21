import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Typography, Spin, message, Table, Button, Tooltip, Progress, Alert, Empty, Divider, List, Select, Space } from 'antd';
import { Pie, Column } from '@ant-design/charts';
import {
  FileTextOutlined,
  CalendarOutlined,
  TeamOutlined,
  BarChartOutlined,
  AppstoreOutlined,
  ApartmentOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  BookOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import NewsApi from '../../vn.fpt.edu.api/News';
import SemesterApi from '../../vn.fpt.edu.api/Semester';
import AdminApi from '../../vn.fpt.edu.api/Admin';
import RoomApi from '../../vn.fpt.edu.api/Room';
import HolidayApi from '../../vn.fpt.edu.api/Holiday';
import dayjs from 'dayjs';

const normalizeText = (value, fallback) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (value !== undefined && value !== null) {
    return String(value);
  }
  return fallback;
};

const { Title } = Typography;

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingNews: 0,
    totalStaff: 0,
    adminStaff: 0,
    academicStaff: 0,
    totalRooms: 0,
    activeRooms: 0,
    totalStudents: 0,
    totalLecturers: 0,
  });
  
  const [pendingNews, setPendingNews] = useState([]);
  const [currentSemester, setCurrentSemester] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [staffByDepartment, setStaffByDepartment] = useState([]);
  const [newsByStatus, setNewsByStatus] = useState([]);
  const [studentLevelTrend, setStudentLevelTrend] = useState([]);
  const [semesterTimeline, setSemesterTimeline] = useState([]);
  const [semesterRange, setSemesterRange] = useState(4);
  const [chartMode] = useState('grouped'); // Fixed to grouped mode

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
      const rejected = allNews.filter(n => (n.status || n.Status || '').toLowerCase() === 'rejected');
      
      setPendingNews(pending.slice(0, 5)); // Top 5 pending news
      
      // News by status for chart only
      setNewsByStatus([
        { status: 'Pending', count: pending.length, color: '#ffd591' },
        { status: 'Published', count: published.length, color: '#b7eb8f' },
        { status: 'Rejected', count: rejected.length, color: '#ffadd2' },
      ]);
      
      setStats(prev => ({
        ...prev,
        pendingNews: pending.length,
      }));

      // Fetch semesters and find current semester
      const semestersResponse = await SemesterApi.getSemesters({ page: 1, pageSize: 100 });
      const semesters = semestersResponse?.items || semestersResponse?.data || [];
      
      // Find current semester (startDate <= today <= endDate)
      const today = dayjs();
      const current = semesters.find(s => {
        if (!s.startDate || !s.endDate) return false;
        const start = dayjs(s.startDate);
        const end = dayjs(s.endDate);
        return (start.isBefore(today) || start.isSame(today, 'day')) && 
               (end.isAfter(today) || end.isSame(today, 'day'));
      });
      
      setCurrentSemester(current || null);
      const semesterMap = semesters.reduce((acc, sem) => {
        const id = sem.semesterId || sem.id;
        if (!id) return acc;
        acc[id] = {
          name: sem.name || sem.SemesterName || `Semester ${id}`,
          startDate: sem.startDate || sem.StartDate || null,
          endDate: sem.endDate || sem.EndDate || null,
        };
        return acc;
      }, {});
      
      // Fetch holidays for current semester
      if (current && (current.semesterId || current.id)) {
        try {
          const semesterId = current.semesterId || current.id;
          const holidaysData = await HolidayApi.getHolidaysBySemester(semesterId);
          // Backend returns array directly, but API wrapper might wrap it
          const holidaysArray = Array.isArray(holidaysData) ? holidaysData : (holidaysData?.data || holidaysData?.items || []);
          setHolidays(holidaysArray);
        } catch (err) {
          console.error('Error fetching holidays:', err);
          setHolidays([]);
        }
      } else {
        setHolidays([]);
      }

      // Fetch staff (roles 6, 7)
      try {
        const staffResponse = await AdminApi.getUsers({ roles: '6,7', page: 1, pageSize: 100 });
        const allStaff = staffResponse?.items || [];
        
        const adminStaff = allStaff.filter(s => s.roleId === 6);
        const academicStaff = allStaff.filter(s => s.roleId === 7);
        
        // Group by department
        const deptMap = {};
        allStaff.forEach(staff => {
          const deptName = staff.departmentName || 'Unknown';
          deptMap[deptName] = (deptMap[deptName] || 0) + 1;
        });
        
        const deptData = Object.entries(deptMap).map(([name, count]) => ({
          department: name,
          count: count,
        })).sort((a, b) => b.count - a.count);
        
        setStaffByDepartment(deptData);
        
        setStats(prev => ({
          ...prev,
          totalStaff: allStaff.length,
          adminStaff: adminStaff.length,
          academicStaff: academicStaff.length,
        }));
      } catch (err) {
        console.error('Error fetching staff:', err);
      }

      // Fetch rooms
      try {
        const roomsResponse = await RoomApi.getRooms({ page: 1, pageSize: 100 });
        const allRooms = roomsResponse?.items || [];
        const activeRooms = allRooms.filter(r => (r.status || '').toLowerCase() === 'active');
        
        setStats(prev => ({
          ...prev,
          totalRooms: allRooms.length,
          activeRooms: activeRooms.length,
        }));
      } catch (err) {
        console.error('Error fetching rooms:', err);
      }

      // Fetch students (role 4)
      try {
        const studentsResponse = await AdminApi.getUsers({ role: 4, page: 1, pageSize: 100 });
        const allStudents = studentsResponse?.items || [];
        
        // Debug: Log raw data
        console.log('📊 Raw students data:', allStudents.slice(0, 3));
        console.log('📅 Semester map:', semesterMap);
        
        // Group by semester + level
        const levelBySemester = {};
        allStudents.forEach(student => {
          const levelName = normalizeText(student.levelName ?? student.LevelName, 'Unknown Level');
          // Try multiple ways to get semesterId
          const semesterId = student.semesterId ?? student.SemesterId ?? student.semester?.semesterId ?? student.semester?.id ?? null;
          const semesterIdNum = semesterId ? Number(semesterId) : null;
          
          // Try to match semester from map (check both string and number keys)
          const matchedSemester = semesterMap[semesterIdNum] ?? semesterMap[semesterId] ?? semesterMap[String(semesterIdNum)] ?? semesterMap[String(semesterId)];
          const semesterName = matchedSemester?.name ?? 
            normalizeText(student.semesterName ?? student.SemesterName ?? student.semester?.name, 'Unknown Semester');
          
          const key = `${semesterIdNum ?? semesterId ?? 'unknown'}-${levelName}`;
          if (!levelBySemester[key]) {
            levelBySemester[key] = {
              semesterId: semesterIdNum ?? semesterId,
              semesterLabel: matchedSemester?.name || semesterName,
              level: levelName,
              count: 0,
              sortValue: (() => {
                const meta = matchedSemester;
                if (meta?.startDate) return dayjs(meta.startDate).valueOf();
                if (meta?.endDate) return dayjs(meta.endDate).valueOf();
                return semesterIdNum ?? semesterId ?? 0;
              })(),
            };
          }
          levelBySemester[key].count += 1;
        });
        
        const levelTrendData = Object.values(levelBySemester).map(item => ({
          ...item,
          semesterLabel: normalizeText(item.semesterLabel, 'Unknown Semester'),
          level: normalizeText(item.level, 'Unknown Level'),
          count: Number(item.count) || 0,
        }));
        
        // Debug: Log processed data
        console.log('📈 Processed level trend data:', levelTrendData);
        console.log('📊 Total students processed:', allStudents.length);
        console.log('📊 Total groups created:', levelTrendData.length);
        
        setStudentLevelTrend(levelTrendData);
        const timelineMap = {};
        levelTrendData.forEach(item => {
          if (!timelineMap[item.semesterLabel]) {
            timelineMap[item.semesterLabel] = {
              semesterId: item.semesterId,
              label: item.semesterLabel,
              sortValue: item.sortValue,
              total: 0,
            };
          }
          timelineMap[item.semesterLabel].total += item.count;
        });
        const orderedTimeline = Object.values(timelineMap).sort((a, b) => b.sortValue - a.sortValue);
        setSemesterTimeline(orderedTimeline);
        
        setStats(prev => ({
          ...prev,
          totalStudents: allStudents.length,
        }));
      } catch (err) {
        console.error('Error fetching students:', err);
      }

      // Fetch lecturers (role 3)
      try {
        const lecturersResponse = await AdminApi.getUsers({ role: 3, page: 1, pageSize: 100 });
        const allLecturers = lecturersResponse?.items || [];
        
        setStats(prev => ({
          ...prev,
          totalLecturers: allLecturers.length,
        }));
      } catch (err) {
        console.error('Error fetching lecturers:', err);
      }

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


  const levelColorMap = useMemo(() => {
    const palette = ['#1890ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2', '#a0d911', '#eb2f96', '#fa541c'];
    const map = {};
    const uniqueLevels = Array.from(new Set(studentLevelTrend.map(item => item.level || 'Unknown Level')));
    uniqueLevels.forEach((level, index) => {
      map[level] = palette[index % palette.length];
    });
    console.log('🎨 Level color map:', map);
    return map;
  }, [studentLevelTrend]);

  const studentLevelChartData = useMemo(() => {
    if (!studentLevelTrend.length) {
      console.log('⚠️ No student level trend data available');
      return [];
    }
    const selectedSemesters =
      semesterRange === 'all'
        ? semesterTimeline
        : semesterTimeline.slice(0, Number(semesterRange));
    const allowedLabels = new Set(selectedSemesters.map(item => item.label));
    const filtered = studentLevelTrend
      .filter(item => (semesterRange === 'all' ? true : allowedLabels.has(item.semesterLabel)))
      .sort((a, b) => a.sortValue - b.sortValue)
      .map(item => {
        const level = item.level || 'Unknown Level';
        return {
          semester: item.semesterLabel || 'Unknown Semester',
          level: level,
          count: Number(item.count) || 0,
          // Add color to each record for colorField
          color: levelColorMap[level] || '#1890ff',
        };
      });
    console.log('📊 Chart data prepared:', filtered);
    console.log('📊 Chart data summary - Total records:', filtered.length, 'Total students:', filtered.reduce((sum, item) => sum + item.count, 0));
    return filtered;
  }, [studentLevelTrend, semesterRange, semesterTimeline, levelColorMap]);

  // Get unique levels in sorted order (used for legend and color mapping)
  const sortedUniqueLevels = useMemo(() => {
    return Array.from(new Set(studentLevelChartData.map(item => item.level || 'Unknown Level')))
      .sort((a, b) => {
        // Sort N1, N2, N3, N4, N5 in order
        const order = ['N1', 'N2', 'N3', 'N4', 'N5'];
        const aIndex = order.indexOf(a);
        const bIndex = order.indexOf(b);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.localeCompare(b);
      });
  }, [studentLevelChartData]);

  const studentLevelChartConfig = useMemo(() => {
    // Create color array in the same order as sortedUniqueLevels
    const colorArray = sortedUniqueLevels.map(level => levelColorMap[level] || '#1890ff');
    
    console.log('⚙️ Chart config preparation:', {
      dataLength: studentLevelChartData.length,
      sortedUniqueLevels,
      levelColorMap,
      colorArray,
      sampleData: studentLevelChartData.slice(0, 5),
    });
    
    const config = {
      data: studentLevelChartData,
      xField: 'semester',
      yField: 'count',
      seriesField: 'level',
      isStack: chartMode === 'stacked',
      isGroup: chartMode === 'grouped',
      columnWidthRatio: 0.5,
      columnStyle: {
        radius: [4, 4, 0, 0],
      },
      legend: false, // Disable default legend, we'll create custom one
      tooltip: {
        formatter: (datum) => {
          const count = datum.count ?? datum.value ?? 0;
          return {
            name: `${datum.level || 'Unknown Level'}`,
            value: `${Number(count).toLocaleString()} students`,
          };
        },
      },
      // Try using colorField to map colors from data field
      // If colorField doesn't work, fallback to array
      colorField: 'color',
      color: colorArray.length > 0 ? colorArray : ['#1890ff'],
      label: {
        position: 'top',
        layout: [
          { type: 'interval-adjust-position' },
          { type: 'interval-hide-overlap' },
          { type: 'adjust-color' },
        ],
        formatter: (datum) => {
          // Handle both grouped and stacked modes - check multiple possible fields
          const count = datum?.count ?? datum?.value ?? datum?.y ?? 0;
          const numCount = Number(count);
          if (numCount > 0) {
            return numCount.toLocaleString();
          }
          return '';
        },
        style: { fontWeight: 600, fill: '#595959', fontSize: 12 },
      },
      xAxis: {
        title: {
          text: 'Semester',
          style: { fontSize: 12, fill: '#8c8c8c' },
        },
      },
      yAxis: {
        title: {
          text: 'Number of Students',
          style: { fontSize: 12, fill: '#8c8c8c' },
        },
        label: {
          formatter: (value) => `${value} students`,
        },
      },
      interactions: [{ type: 'active-region' }],
    };
    
    return config;
  }, [studentLevelChartData, chartMode, levelColorMap, sortedUniqueLevels]);

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
          {/* Important Notifications */}
          {stats.pendingNews > 0 && (
            <Alert
              message={`You have ${stats.pendingNews} pending news ${stats.pendingNews > 5 ? 'items' : 'item'} waiting for review`}
              type="warning"
              showIcon
              icon={<ExclamationCircleOutlined />}
              action={
                <Button size="small" type="primary" onClick={() => navigate('/headOfAdmin/news', { state: { filterStatus: 'pending' } })}>
                  Review Now
                </Button>
              }
              style={{ marginBottom: 24, borderRadius: '8px' }}
              closable
            />
          )}

          {/* Statistics Cards - Compact Design */}
          <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={8} md={6} lg={3}>
              <Card 
                size="small"
                style={{ 
                  borderRadius: '8px',
                  border: '1px solid #e8e8e8',
                  textAlign: 'center'
                }}
                styles={{ body: { padding: '12px' } }}
              >
                <div style={{ fontSize: '20px', color: '#13c2c2', marginBottom: 4 }}>
                  <ApartmentOutlined />
                </div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: '#262626', marginBottom: 2 }}>
                  {stats.adminStaff}
                </div>
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>Administration Staff</div>
              </Card>
            </Col>
            <Col xs={12} sm={8} md={6} lg={3}>
              <Card 
                size="small"
                style={{ 
                  borderRadius: '8px',
                  border: '1px solid #e8e8e8',
                  textAlign: 'center'
                }}
                styles={{ body: { padding: '12px' } }}
              >
                <div style={{ fontSize: '20px', color: '#fa8c16', marginBottom: 4 }}>
                  <TeamOutlined />
                </div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: '#262626', marginBottom: 2 }}>
                  {stats.academicStaff}
                </div>
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>Academic Staff</div>
              </Card>
            </Col>
            <Col xs={12} sm={8} md={6} lg={3}>
              <Card 
                size="small"
                style={{ 
                  borderRadius: '8px',
                  border: '1px solid #e8e8e8',
                  textAlign: 'center'
                }}
                styles={{ body: { padding: '12px' } }}
              >
                <div style={{ fontSize: '20px', color: '#2f54eb', marginBottom: 4 }}>
                  <AppstoreOutlined />
                </div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: '#262626', marginBottom: 2 }}>
                  {stats.activeRooms}/{stats.totalRooms}
                </div>
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>Active Rooms</div>
              </Card>
            </Col>
            <Col xs={12} sm={8} md={6} lg={3}>
              <Card 
                size="small"
                style={{ 
                  borderRadius: '8px',
                  border: '1px solid #e8e8e8',
                  textAlign: 'center'
                }}
                styles={{ body: { padding: '12px' } }}
              >
                <div style={{ fontSize: '20px', color: '#1890ff', marginBottom: 4 }}>
                  <UserOutlined />
                </div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: '#262626', marginBottom: 2 }}>
                  {stats.totalStudents}
                </div>
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>Total Students</div>
              </Card>
            </Col>
            <Col xs={12} sm={8} md={6} lg={3}>
              <Card 
                size="small"
                style={{ 
                  borderRadius: '8px',
                  border: '1px solid #e8e8e8',
                  textAlign: 'center'
                }}
                styles={{ body: { padding: '12px' } }}
              >
                <div style={{ fontSize: '20px', color: '#52c41a', marginBottom: 4 }}>
                  <BookOutlined />
                </div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: '#262626', marginBottom: 2 }}>
                  {stats.totalLecturers}
                </div>
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>Total Lecturers</div>
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
                        style={{ fontWeight: 500 }}
                      >
                        View All ({stats.pendingNews})
                      </Button>
                    )}
                  </div>
                }
                style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              >
                {pendingNews.length > 0 ? (
                  <Table
                    columns={pendingNewsColumns}
                    dataSource={pendingNews}
                    pagination={false}
                    rowKey={(record) => record.id || record.Id || Math.random()}
                    size="middle"
                    bordered={false}
                  />
                ) : (
                  <Empty 
                    description="No pending news to review" 
                    style={{ padding: '40px 0' }}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card 
                title={
                  <span style={{ fontSize: '18px', fontWeight: 600, color: '#1890ff' }}>
                    <CalendarOutlined style={{ marginRight: 8 }} />
                    Current Semester
                  </span>
                }
                style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              >
                {currentSemester ? (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: 8, color: '#262626' }}>
                        {currentSemester.name || 'N/A'}
                      </div>
                      <div style={{ fontSize: '13px', color: '#8c8c8c', marginBottom: 4 }}>
                        <span style={{ fontWeight: 500 }}>Start:</span> {currentSemester.startDate ? dayjs(currentSemester.startDate).format('DD/MM/YYYY') : 'N/A'}
                      </div>
                      <div style={{ fontSize: '13px', color: '#8c8c8c' }}>
                        <span style={{ fontWeight: 500 }}>End:</span> {currentSemester.endDate ? dayjs(currentSemester.endDate).format('DD/MM/YYYY') : 'N/A'}
                      </div>
                    </div>
                    <Divider style={{ margin: '12px 0' }} />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: 12, color: '#262626' }}>
                        Holidays ({holidays.length})
                      </div>
                      {holidays.length > 0 ? (
                        <List
                          size="small"
                          dataSource={holidays}
                          renderItem={(holiday) => (
                            <List.Item style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                              <div style={{ width: '100%' }}>
                                <div style={{ fontSize: '13px', fontWeight: 500, color: '#262626', marginBottom: 2 }}>
                                  {holiday.name || holiday.holidayName || 'N/A'}
                                </div>
                                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                                  {holiday.date ? dayjs(holiday.date).format('DD/MM/YYYY') : 'N/A'}
                                </div>
                              </div>
                            </List.Item>
                          )}
                        />
                      ) : (
                        <div style={{ textAlign: 'center', padding: '20px 0', color: '#8c8c8c', fontSize: '13px' }}>
                          No holidays in this semester
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <Empty 
                    description="No current semester" 
                    style={{ padding: '40px 0' }}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </Card>
            </Col>
          </Row>

          {/* Charts and Visualizations */}
          <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
            <Col xs={24} lg={12}>
              <Card 
                title={
                  <span style={{ fontSize: '16px', fontWeight: 600 }}>
                    <BarChartOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                    News Distribution by Status
                  </span>
                }
                style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              >
                {newsByStatus.length > 0 && newsByStatus.reduce((sum, n) => sum + n.count, 0) > 0 ? (
                  <Pie
                    data={newsByStatus.map(item => ({
                      type: item.status,
                      value: item.count,
                    }))}
                    angleField="value"
                    colorField="type"
                    radius={0.8}
                    height={300}
                    color={['#ffd591', '#b7eb8f', '#ffadd2']}
                    legend={{
                      position: 'bottom',
                    }}
                  />
                ) : (
                  <Empty description="No data available" style={{ padding: '60px 0' }} />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card 
                title={
                  <span style={{ fontSize: '16px', fontWeight: 600 }}>
                    <ApartmentOutlined style={{ marginRight: 8, color: '#722ed1' }} />
                    Staff Distribution by Department
                  </span>
                }
                style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              >
                {staffByDepartment.length > 0 ? (
                  <div>
                    {staffByDepartment.slice(0, 8).map((item, index) => {
                      const maxCount = Math.max(...staffByDepartment.map(d => d.count));
                      const percentage = maxCount > 0 ? Math.round((item.count / maxCount) * 100) : 0;
                      const colors = ['#1890ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2', '#fa8c16', '#2f54eb'];
                      const color = colors[index % colors.length];
                      return (
                        <div key={index} style={{ marginBottom: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontWeight: 500, fontSize: '14px' }}>{item.department}</span>
                            <span style={{ fontWeight: 600, color: color }}>{item.count}</span>
                          </div>
                          <Progress 
                            percent={percentage} 
                            strokeColor={color}
                            showInfo={false}
                            style={{ marginBottom: 0 }}
                          />
                        </div>
                      );
                    })}
                    {staffByDepartment.length > 8 && (
                      <div style={{ textAlign: 'center', marginTop: 16, color: '#8c8c8c' }}>
                        + {staffByDepartment.length - 8} more departments
                      </div>
                    )}
                  </div>
                ) : (
                  <Empty description="No data available" style={{ padding: '60px 0' }} />
                )}
              </Card>
            </Col>
          </Row>

          {/* Students Distribution Chart */}
          {studentLevelTrend.length > 0 && (
            <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
              <Col xs={24}>
                <Card
                  title={
                    <span style={{ fontSize: '16px', fontWeight: 600 }}>
                      <UserOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                      Student Levels by Semester
                    </span>
                  }
                  extra={
                    <Space size={4} align="center">
                      <span style={{ fontSize: 12, color: '#8c8c8c' }}>Semesters:</span>
                      <Select
                        size="small"
                        style={{ width: 140 }}
                        value={semesterRange}
                        onChange={setSemesterRange}
                      >
                        <Select.Option value={3}>Last 3 semesters</Select.Option>
                        <Select.Option value={4}>Last 4 semesters</Select.Option>
                        <Select.Option value={6}>Last 6 semesters</Select.Option>
                        <Select.Option value="all">All semesters</Select.Option>
                      </Select>
                    </Space>
                  }
                  style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                >
                  {studentLevelChartData.length > 0 ? (
                    <>
                      <Column {...studentLevelChartConfig} height={360} />
                      {/* Custom Legend */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        gap: '24px',
                        marginTop: '16px',
                        flexWrap: 'wrap'
                      }}>
                        {sortedUniqueLevels.map((level, index) => {
                          const color = levelColorMap[level] || '#1890ff';
                          return (
                            <div 
                              key={level}
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px' 
                              }}
                            >
                              <div 
                                style={{ 
                                  width: '16px', 
                                  height: '16px', 
                                  backgroundColor: color,
                                  borderRadius: '2px'
                                }} 
                              />
                              <span style={{ fontSize: '13px', color: '#595959' }}>
                                {level}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <Empty description="Không có dữ liệu phù hợp với bộ lọc" style={{ padding: '60px 0' }} />
                  )}
                </Card>
              </Col>
            </Row>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;

