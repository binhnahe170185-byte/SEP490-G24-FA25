import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Progress, Table, Empty } from 'antd';
import { BarChartOutlined, RightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../login/AuthContext';
import { api } from '../../../vn.fpt.edu.api/http';

const { Title, Text } = Typography;

const AttendanceReport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Hardcoded attendance data
  const [attendanceData] = useState([
    { subject: 'PRF192', className: 'PRF192-AE1', present: 18, absent: 2, total: 20, percentage: 90 },
    { subject: 'MAE101', className: 'MAE101-AE1', present: 20, absent: 0, total: 20, percentage: 100 },
    { subject: 'SWP391', className: 'SWP391-AE1', present: 17, absent: 3, total: 20, percentage: 85 },
    { subject: 'VOV124', className: 'VOV124-AE1', present: 19, absent: 1, total: 20, percentage: 95 }
  ]);

  const columns = [
    {
      title: 'Môn học',
      dataIndex: 'subject',
      key: 'subject',
    },
    {
      title: 'Lớp',
      dataIndex: 'className',
      key: 'className',
    },
    {
      title: 'Có mặt',
      dataIndex: 'present',
      key: 'present',
    },
    {
      title: 'Vắng mặt',
      dataIndex: 'absent',
      key: 'absent',
    },
    {
      title: 'Tỷ lệ',
      key: 'percentage',
      render: (_, record) => (
        <Progress 
          percent={record.percentage} 
          size="small" 
          status={record.percentage >= 80 ? 'success' : record.percentage >= 70 ? 'normal' : 'exception'}
        />
      ),
    },
  ];

  const overallPercentage = attendanceData.length > 0
    ? Math.round(attendanceData.reduce((sum, item) => sum + item.percentage, 0) / attendanceData.length)
    : 0;

  return (
    <Card 
      className="function-card section-card"
      title={
        <div className="section-card-header">
          <BarChartOutlined className="function-icon attendance-icon" />
          <Title level={4} className="function-title">Báo Cáo Điểm Danh</Title>
        </div>
      }
    >
      <div className="section-card-content">
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <Text style={{ fontSize: 14, color: '#666' }}>Tỷ lệ điểm danh tổng thể</Text>
          <Progress 
            percent={overallPercentage} 
            size="large" 
            status={overallPercentage >= 80 ? 'success' : overallPercentage >= 70 ? 'normal' : 'exception'}
            style={{ marginTop: 8 }}
          />
        </div>

        {attendanceData.length > 0 ? (
          <Table
            columns={columns}
            dataSource={attendanceData}
            pagination={false}
            size="small"
            rowKey="subject"
          />
        ) : (
          <Empty description="Chưa có dữ liệu điểm danh" style={{ margin: '20px 0' }} />
        )}
      </div>
      
      <Button 
        type="primary" 
        icon={<RightOutlined />}
        className="function-button"
        onClick={() => {
          // Create a simple attendance report page
          navigate('/student/attendance');
        }}
        style={{ marginTop: 16 }}
      >
        Xem chi tiết
      </Button>
    </Card>
  );
};

export default AttendanceReport;

