import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Button, Table, Typography, message, Space, Select } from 'antd';

const { Title, Text } = Typography;

export default function AddStudentsPopup({ open, onClose, classId }) {
  const [rows, setRows] = useState([]);
  const [levelFilter, setLevelFilter] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // Giả lập gọi API lấy sinh viên đủ điều kiện
  useEffect(() => {
    if (!open) return;
    const fetchStudents = async () => {
      try {
        // TODO: Replace with real API call, e.g., const res = await StudentApi.getEligibleByClass(classId);
        const mockData = [
          { id: 1, studentId: 'HE170185', name: 'Ngô An Bình', level: 'N3', status: 'Eligible' },
          { id: 2, studentId: 'HE170945', name: 'Đỗ Thùy Dương', level: 'N3', status: 'Eligible' },
          { id: 3, studentId: 'HE171807', name: 'Lê Quang Huy', level: 'N2', status: 'Not eligible' },
          { id: 4, studentId: 'HE172283', name: 'Trịnh Văn Sáng', level: 'N3', status: 'Eligible' },
          { id: 5, studentId: 'HE182307', name: 'Tạ Tuấn Dũng', level: 'N3', status: 'Eligible' },
        ];
        setRows(mockData);
      } catch (error) {
        message.error('Failed to fetch students.');
      }
    };
    fetchStudents();
  }, [open, classId]);

  const handleAddStudents = () => {
    if (!selectedRowKeys.length) {
      message.warning('Please select at least one student to add.');
      return;
    }
    const selected = rows.filter((r) => selectedRowKeys.includes(r.id));
    // TODO: Gọi API thêm sinh viên vào lớp học
    message.success(`${selected.length} student(s) added to class successfully!`);
    onClose();
  };

  const filteredRows = useMemo(
    () => rows.filter((r) => !levelFilter || r.level === levelFilter),
    [rows, levelFilter]
  );

  const columns = [
    { title: 'No.', dataIndex: 'id', key: 'id', width: 70, align: 'center' },
    { title: 'Student ID', dataIndex: 'studentId', key: 'studentId' },
    { title: 'Full Name', dataIndex: 'name', key: 'name' },
    { title: 'Level', dataIndex: 'level', key: 'level', width: 120 },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Text type={status === 'Eligible' ? 'success' : 'danger'}>{status}</Text>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    getCheckboxProps: (record) => ({ disabled: record.status !== 'Eligible' }),
  };

  return (
    <Modal
      title={<Title level={4}>Add Students to Class</Title>}
      open={open}
      onCancel={onClose}
      width={800}
      footer={null}
    >
      <Text type="secondary">
        Select eligible students from the database to add to this class.
      </Text>

      <Space direction="vertical" style={{ width: '100%', marginTop: 24 }}>
        <Space align="center" style={{ marginBottom: 8 }}>
          <Select
            placeholder="Filter by Level"
            allowClear
            style={{ minWidth: 200 }}
            value={levelFilter}
            onChange={(value) => setLevelFilter(value)}
            options={[{ value: 'N5' }, { value: 'N4' }, { value: 'N3' }, { value: 'N2' }, { value: 'N1' }]}
          />
          <Button
            type="primary"
            disabled={!selectedRowKeys.length}
            onClick={handleAddStudents}
          >
            Add Selected Students
          </Button>
        </Space>

        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredRows}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          style={{ marginTop: 12 }}
        />
      </Space>
    </Modal>
  );
}
