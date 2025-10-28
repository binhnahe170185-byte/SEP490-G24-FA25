import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  Tag, 
  Typography, 
  Input, 
  Select, 
  DatePicker, 
  Modal,
  Form,
  message,
  Popconfirm,
  Badge
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  FileTextOutlined,
  CalendarOutlined,
  TeamOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const HomeworkList = () => {
  const [homeworks, setHomeworks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    class: 'all',
    dateRange: null
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingHomework, setEditingHomework] = useState(null);
  const [form] = Form.useForm();

  // Mock data
  const mockHomeworks = [
    {
      id: 1,
      title: 'Math Assignment - Chapter 5',
      description: 'Complete exercises 1-20 from chapter 5. Show all work.',
      className: 'Math 101 - Section A',
      dueDate: '2024-01-15',
      status: 'active',
      submissions: 15,
      totalStudents: 20,
      createdAt: '2024-01-10',
      attachments: ['assignment.pdf', 'rubric.docx']
    },
    {
      id: 2,
      title: 'Physics Lab Report',
      description: 'Write a detailed lab report on the pendulum experiment.',
      className: 'Physics 201 - Section B',
      dueDate: '2024-01-18',
      status: 'active',
      submissions: 8,
      totalStudents: 15,
      createdAt: '2024-01-12',
      attachments: ['lab_instructions.pdf']
    },
    {
      id: 3,
      title: 'English Essay - Argumentative',
      description: 'Write a 1000-word argumentative essay on climate change.',
      className: 'English 101 - Section C',
      dueDate: '2024-01-20',
      status: 'completed',
      submissions: 25,
      totalStudents: 25,
      createdAt: '2024-01-08',
      attachments: ['essay_guidelines.pdf', 'sample_essay.docx']
    }
  ];

  useEffect(() => {
    loadHomeworks();
  }, []);

  const loadHomeworks = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setHomeworks(mockHomeworks);
      setLoading(false);
    }, 1000);
  };

  const handleCreateHomework = () => {
    setEditingHomework(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEditHomework = (homework) => {
    setEditingHomework(homework);
    form.setFieldsValue({
      ...homework,
      dueDate: homework.dueDate ? dayjs(homework.dueDate) : null
    });
    setIsModalVisible(true);
  };

  const handleDeleteHomework = (id) => {
    setHomeworks(prev => prev.filter(hw => hw.id !== id));
    message.success('Homework deleted successfully');
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const homeworkData = {
        ...values,
        dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : null,
        createdAt: editingHomework ? editingHomework.createdAt : new Date().toISOString().split('T')[0],
        submissions: editingHomework ? editingHomework.submissions : 0,
        totalStudents: editingHomework ? editingHomework.totalStudents : 0,
        attachments: editingHomework ? editingHomework.attachments : []
      };

      if (editingHomework) {
        setHomeworks(prev => prev.map(hw => 
          hw.id === editingHomework.id ? { ...hw, ...homeworkData } : hw
        ));
        message.success('Homework updated successfully');
      } else {
        const newHomework = {
          ...homeworkData,
          id: Date.now(),
          status: 'active'
        };
        setHomeworks(prev => [newHomework, ...prev]);
        message.success('Homework created successfully');
      }
      
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'blue';
      case 'completed': return 'green';
      case 'draft': return 'orange';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Active';
      case 'completed': return 'Completed';
      case 'draft': return 'Draft';
      default: return 'Unknown';
    }
  };

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.className}
          </Text>
        </div>
      ),
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <CalendarOutlined style={{ color: '#8c8c8c' }} />
          <Text>{dayjs(date).format('MMM DD, YYYY')}</Text>
        </div>
      ),
      sorter: (a, b) => dayjs(a.dueDate).unix() - dayjs(b.dueDate).unix(),
    },
    {
      title: 'Submissions',
      key: 'submissions',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <TeamOutlined style={{ color: '#8c8c8c' }} />
          <Text>{record.submissions}/{record.totalStudents}</Text>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'Completed', value: 'completed' },
        { text: 'Draft', value: 'draft' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="text" 
            icon={<EyeOutlined />} 
            size="small"
            onClick={() => console.log('View homework:', record.id)}
          />
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            size="small"
            onClick={() => handleEditHomework(record)}
          />
          <Popconfirm
            title="Are you sure you want to delete this homework?"
            onConfirm={() => handleDeleteHomework(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button 
              type="text" 
              icon={<DeleteOutlined />} 
              size="small"
              danger
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const filteredHomeworks = homeworks.filter(homework => {
    const matchesSearch = !filters.search || 
      homework.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      homework.className.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesStatus = filters.status === 'all' || homework.status === filters.status;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 24 
      }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Homework Management
          </Title>
          <Text type="secondary">
            Create and manage homework assignments for your classes
          </Text>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={handleCreateHomework}
          size="large"
        >
          Create Homework
        </Button>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Space wrap>
          <Search
            placeholder="Search homework..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            style={{ width: 300 }}
          />
          <Select
            placeholder="Filter by status"
            value={filters.status}
            onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            style={{ width: 150 }}
          >
            <Option value="all">All Status</Option>
            <Option value="active">Active</Option>
            <Option value="completed">Completed</Option>
            <Option value="draft">Draft</Option>
          </Select>
          <Select
            placeholder="Filter by class"
            value={filters.class}
            onChange={(value) => setFilters(prev => ({ ...prev, class: value }))}
            style={{ width: 200 }}
          >
            <Option value="all">All Classes</Option>
            <Option value="math101">Math 101 - Section A</Option>
            <Option value="physics201">Physics 201 - Section B</Option>
            <Option value="english101">English 101 - Section C</Option>
          </Select>
        </Space>
      </Card>

      {/* Homework Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredHomeworks}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} homeworks`
          }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingHomework ? 'Edit Homework' : 'Create New Homework'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        width={600}
        okText={editingHomework ? 'Update' : 'Create'}
        cancelText="Cancel"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: 'active'
          }}
        >
          <Form.Item
            name="title"
            label="Homework Title"
            rules={[{ required: true, message: 'Please enter homework title' }]}
          >
            <Input placeholder="Enter homework title" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter homework description' }]}
          >
            <Input.TextArea 
              rows={4} 
              placeholder="Enter homework description and instructions"
            />
          </Form.Item>

          <Form.Item
            name="className"
            label="Class"
            rules={[{ required: true, message: 'Please select a class' }]}
          >
            <Select placeholder="Select class">
              <Option value="Math 101 - Section A">Math 101 - Section A</Option>
              <Option value="Physics 201 - Section B">Physics 201 - Section B</Option>
              <Option value="English 101 - Section C">English 101 - Section C</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="dueDate"
            label="Due Date"
            rules={[{ required: true, message: 'Please select due date' }]}
          >
            <DatePicker 
              style={{ width: '100%' }}
              placeholder="Select due date"
            />
          </Form.Item>

          <Form.Item
            name="status"
            label="Status"
          >
            <Select>
              <Option value="draft">Draft</Option>
              <Option value="active">Active</Option>
              <Option value="completed">Completed</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HomeworkList;
