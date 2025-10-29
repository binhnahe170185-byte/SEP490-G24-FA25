import React, { useState, useEffect } from 'react';
import { Card, Typography, Table, Progress, Select, Breadcrumb, Empty } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import { useAuth } from '../login/AuthContext';
import { api } from '../../vn.fpt.edu.api/http';

const { Title, Text } = Typography;
const { Option } = Select;

const AttendanceReportPage = () => {
  const { user } = useAuth();
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Hardcoded attendance data (since API might not be ready)
  useEffect(() => {
    // Mock data
    const mockData = [
      { 
        key: '1',
        subject: 'PRF192', 
        className: 'PRF192-AE1', 
        present: 18, 
        absent: 2, 
        late: 0,
        excused: 0,
        total: 20, 
        percentage: 90,
        status: 'success'
      },
      { 
        key: '2',
        subject: 'MAE101', 
        className: 'MAE101-AE1', 
        present: 20, 
        absent: 0,
        late: 0,
        excused: 0,
        total: 20, 
        percentage: 100,
        status: 'success'
      },
      { 
        key: '3',
        subject: 'SWP391', 
        className: 'SWP391-AE1', 
        present: 17, 
        absent: 3,
        late: 0,
        excused: 0,
        total: 20, 
        percentage: 85,
        status: 'normal'
      },
      { 
        key: '4',
        subject: 'VOV124', 
        className: 'VOV124-AE1', 
        present: 19, 
        absent: 1,
        late: 0,
        excused: 0,
        total: 20, 
        percentage: 95,
        status: 'success'
      },
      { 
        key: '5',
        subject: 'CSI104', 
        className: 'CSI104-AE1', 
        present: 14, 
        absent: 6,
        late: 2,
        excused: 1,
        total: 20, 
        percentage: 70,
        status: 'exception'
      }
    ];
    setAttendanceData(mockData);
  }, []);

  const columns = [
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      width: 120,
    },
    {
      title: 'Class',
      dataIndex: 'className',
      key: 'className',
      width: 150,
    },
    {
      title: 'Present',
      dataIndex: 'present',
      key: 'present',
      width: 100,
      align: 'center',
    },
    {
      title: 'Absent',
      dataIndex: 'absent',
      key: 'absent',
      width: 100,
      align: 'center',
    },
    {
      title: 'Late',
      dataIndex: 'late',
      key: 'late',
      width: 100,
      align: 'center',
    },
    {
      title: 'Excused',
      dataIndex: 'excused',
      key: 'excused',
      width: 100,
      align: 'center',
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 100,
      align: 'center',
    },
    {
      title: 'Rate',
      key: 'percentage',
      width: 200,
      render: (_, record) => (
        <div>
          <Progress 
            percent={record.percentage} 
            size="small" 
            status={record.status}
            format={(percent) => `${percent}%`}
          />
        </div>
      ),
    },
  ];

  const overallPercentage = attendanceData.length > 0
    ? Math.round(attendanceData.reduce((sum, item) => sum + item.percentage, 0) / attendanceData.length)
    : 0;

  const totalPresent = attendanceData.reduce((sum, item) => sum + item.present, 0);
  const totalAbsent = attendanceData.reduce((sum, item) => sum + item.absent, 0);
  const totalLate = attendanceData.reduce((sum, item) => sum + item.late, 0);
  const totalExcused = attendanceData.reduce((sum, item) => sum + item.excused, 0);
  const totalClasses = attendanceData.reduce((sum, item) => sum + item.total, 0);

  return (
    <div style={{ padding: "24px", backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: "Home" },
          { title: "Reports" },
          { title: "Attendance Report" },
        ]}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          Attendance Report
        </Title>
        <Select 
          placeholder="Select Semester" 
          style={{ width: 200 }}
          value={selectedSemester}
          onChange={setSelectedSemester}
        >
          <Option value="fall2025">Fall 2025</Option>
          <Option value="spring2025">Spring 2025</Option>
        </Select>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <Text style={{ fontSize: 12, color: '#666' }}>Overall Attendance Rate</Text>
            <div style={{ marginTop: 8 }}>
              <Progress 
                type="circle" 
                percent={overallPercentage} 
                status={overallPercentage >= 80 ? 'success' : overallPercentage >= 70 ? 'normal' : 'exception'}
                size={80}
              />
            </div>
          </div>
        </Card>
        
        <Card>
          <Text style={{ fontSize: 12, color: '#666' }}>Total Classes</Text>
          <Title level={3} style={{ margin: '8px 0 0 0' }}>{totalClasses}</Title>
        </Card>
        
        <Card>
          <Text style={{ fontSize: 12, color: '#666' }}>Total Present</Text>
          <Title level={3} style={{ margin: '8px 0 0 0', color: '#52c41a' }}>{totalPresent}</Title>
        </Card>
        
        <Card>
          <Text style={{ fontSize: 12, color: '#666' }}>Total Absent</Text>
          <Title level={3} style={{ margin: '8px 0 0 0', color: '#f5222d' }}>{totalAbsent}</Title>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <Title level={4} style={{ marginBottom: 16 }}>
          <BarChartOutlined style={{ marginRight: 8 }} />
          Attendance Details by Subject
        </Title>
        
        {attendanceData.length > 0 ? (
          <Table
            columns={columns}
            dataSource={attendanceData}
            pagination={false}
            loading={loading}
            rowKey="key"
          />
        ) : (
          <Empty description="No attendance data available" />
        )}
      </Card>
    </div>
  );
};

export default AttendanceReportPage;

