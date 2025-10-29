import React, { useState } from 'react';
import { Card, Typography, Table, Tag, Button, Breadcrumb, Empty, Input, Select } from 'antd';
import { FileTextOutlined, SearchOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const HomeworkPage = () => {
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Hardcoded homework data
  const [homeworks] = useState([
    {
      key: '1',
      id: 1,
      title: 'PRF192 Assignment 5',
      subject: 'PRF192',
      className: 'PRF192-AE1',
      dueDate: '2024-12-25',
      status: 'pending',
      submitted: false
    },
    {
      key: '2',
      id: 2,
      title: 'Lab Report - MAE101',
      subject: 'MAE101',
      className: 'MAE101-AE1',
      dueDate: '2024-12-28',
      status: 'submitted',
      submitted: true,
      submittedDate: '2024-12-27'
    },
    {
      key: '3',
      id: 3,
      title: 'Project Proposal - SWP391',
      subject: 'SWP391',
      className: 'SWP391-AE1',
      dueDate: '2024-12-30',
      status: 'pending',
      submitted: false
    },
    {
      key: '4',
      id: 4,
      title: 'Essay Assignment - VOV124',
      subject: 'VOV124',
      className: 'VOV124-AE1',
      dueDate: '2025-01-05',
      status: 'pending',
      submitted: false
    },
    {
      key: '5',
      id: 5,
      title: 'Lab Exercise 3 - CSI104',
      subject: 'CSI104',
      className: 'CSI104-AE1',
      dueDate: '2024-12-22',
      status: 'late',
      submitted: false
    }
  ]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted':
        return 'green';
      case 'pending':
        return 'orange';
      case 'late':
        return 'red';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'submitted':
        return 'Submitted';
      case 'pending':
        return 'Pending';
      case 'late':
        return 'Late';
      default:
        return status;
    }
  };

  const getDaysUntilDue = (dueDate) => {
    const days = dayjs(dueDate).diff(dayjs(), 'day');
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Today';
    return `${days} days left`;
  };

  const filteredHomeworks = homeworks.filter(hw => {
    const matchesSearch = hw.title.toLowerCase().includes(searchText.toLowerCase()) ||
                         hw.subject.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = statusFilter === 'all' || hw.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      title: 'Homework',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            {record.subject} - {record.className}
          </div>
        </div>
      ),
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 150,
      render: (date) => (
        <div>
          <Text>{dayjs(date).format('DD/MM/YYYY')}</Text>
          <div style={{ fontSize: 12, color: '#999' }}>
            {getDaysUntilDue(date)}
          </div>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Button 
          type={record.submitted ? 'default' : 'primary'}
          icon={<UploadOutlined />}
          size="small"
          disabled={record.submitted}
        >
          {record.submitted ? 'Submitted' : 'Submit'}
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px", backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: "Home" },
          { title: "Studies" },
          { title: "Homework List" },
        ]}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          <FileTextOutlined style={{ marginRight: 8 }} />
          Homework List
        </Title>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Search
            placeholder="Search homework..."
            allowClear
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={setSearchText}
          />
          <Select
            placeholder="Filter by status"
            style={{ width: 200 }}
            value={statusFilter}
            onChange={setStatusFilter}
          >
            <Option value="all">All</Option>
            <Option value="pending">Pending</Option>
            <Option value="submitted">Submitted</Option>
            <Option value="late">Late</Option>
          </Select>
        </div>
      </Card>

      {/* Homework Table */}
      <Card>
        {filteredHomeworks.length > 0 ? (
          <Table
            columns={columns}
            dataSource={filteredHomeworks}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} homework`,
            }}
            rowKey="key"
          />
        ) : (
          <Empty description="No homework found" />
        )}
      </Card>
    </div>
  );
};

export default HomeworkPage;

