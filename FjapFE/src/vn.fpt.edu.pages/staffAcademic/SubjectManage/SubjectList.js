import React, { useEffect, useMemo, useState, useCallback } from "react";
import { 
  Button, Input, Select, Space, Table, Tooltip, Switch, 
  message, Tag, Modal 
} from "antd";
import { 
  PlusOutlined, SearchOutlined, EditOutlined, 
  DeleteOutlined, EyeOutlined, ExclamationCircleOutlined 
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import SubjectListApi from "../../../vn.fpt.edu.api/SubjectList";

const { confirm } = Modal;

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const parseStatus = (raw) => {
  if (typeof raw === "boolean") return raw;
  if (raw === null || raw === undefined) return false;
  const normalized = raw.toString().trim().toLowerCase();
  return ["active", "true", "1"].includes(normalized);
};

export default function SubjectList() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ 
    search: "", 
    level: "all", 
    status: "all" 
  });
  const [pagination, setPagination] = useState({ 
    current: 1, 
    pageSize: 10 
  });
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const basePrefix = location.pathname.startsWith('/manager') ? '/manager' : '/staffAcademic';

  const normalizeSubjects = (list = []) =>
    list.map((item) => ({
      subjectId: item.subjectId,
      subjectCode: item.subjectCode,
      subjectName: item.subjectName,
      levelName: item.levelName,
      status: parseStatus(item.status),
      gradeTypesCount: Array.isArray(item.gradeTypes) ? item.gradeTypes.length : 0,
      passMark: item.passMark,
      description: item.description,
    }));

  const loadSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await SubjectListApi.getAll();
      setSubjects(normalizeSubjects(data));
    } catch (error) {
      message.error("Failed to load subjects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  const filterOptions = useMemo(() => {
    const levels = new Set(subjects.map(s => s.levelName).filter(Boolean));
    return { levels: Array.from(levels).sort() };
  }, [subjects]);

  const filteredSubjects = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();
    return subjects.filter((item) => {
      const matchesSearch = searchTerm 
        ? [item.subjectCode, item.subjectName, item.levelName]
            .some(val => val?.toString().toLowerCase().includes(searchTerm)) 
        : true;
      const matchesLevel = filters.level === "all" || item.levelName === filters.level;
      const matchesStatus = filters.status === "all" ||
        (filters.status === "active" && item.status) ||
        (filters.status === "inactive" && !item.status);
      return matchesSearch && matchesLevel && matchesStatus;
    });
  }, [subjects, filters]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };
  
  const handleStatusToggle = async (record, checked) => {
    setUpdatingStatusId(record.subjectId);
    try {
      await SubjectListApi.updateStatus(record.subjectId, checked);
      setSubjects(prev =>
        prev.map(item =>
          item.subjectId === record.subjectId 
            ? { ...item, status: checked } 
            : item
        )
      );
      message.success(`Status updated successfully!`);
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to update status";
      message.error(errorMsg);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleDelete = (record) => {
    confirm({
      title: 'Are you sure you want to delete this subject?',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p><strong>Subject:</strong> {record.subjectName} ({record.subjectCode})</p>
          <p style={{ color: '#ff4d4f' }}>
            This action cannot be undone. All related grade configurations will be deleted.
          </p>
        </div>
      ),
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await SubjectListApi.delete(record.subjectId);
          setSubjects(prev => prev.filter(item => item.subjectId !== record.subjectId));
          message.success(`Deleted subject "${record.subjectName}"`);
        } catch (error) {
          const errorMsg = error.response?.data?.message || "Failed to delete subject";
          message.error(errorMsg);
        }
      },
    });
  };

  const columns = [
    {
      title: "No.",
      key: "rowNumber",
      align: "center",
      width: 70,
      fixed: 'left',
      render: (_, __, index) =>
        (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: "Subject Code",
      dataIndex: "subjectCode",
      key: "subjectCode",
      width: 150,
      fixed: 'left',
      render: (value) => <Tag color="cyan">{value}</Tag>,
    },
    {
      title: "Subject Name",
      dataIndex: "subjectName",
      key: "subjectName",
      render: (value) => <strong>{value}</strong>,
    },
    {
      title: "Level",
      dataIndex: "levelName",
      key: "levelName",
      width: 150,
      align: "center",
    },

    {
      title: "Status",
      key: "status",
      align: "center",
      width: 160,
      render: (_, record) => (
        <Switch
          checkedChildren="Active"
          unCheckedChildren="Inactive"
          checked={record.status}
          onChange={(checked) => handleStatusToggle(record, checked)}
          loading={updatingStatusId === record.subjectId}
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      align: "center",
      width: 170,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => navigate(`${basePrefix}/subject/detail/${record.subjectId}`)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: "#1890ff" }}/>} 
              onClick={() => navigate(`${basePrefix}/subject/edit/${record.subjectId}`)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              icon={<DeleteOutlined style={{ color: "#ff4d4f" }}/>} 
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={toolbarContainerStyle}>
        <div style={filtersRowStyle}>
          <Input
            placeholder="Search by code, name, level..."
            prefix={<SearchOutlined />}
            allowClear
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            style={{ width: 280 }}
          />
          <Select
            value={filters.level}
            onChange={(value) => handleFilterChange("level", value)}
            options={[
              { value: "all", label: "All Levels" },
              ...filterOptions.levels.map((value) => ({ value, label: value })),
            ]}
            style={{ minWidth: 140 }}
          />
          <Select
            value={filters.status}
            onChange={(value) => handleFilterChange("status", value)}
            options={STATUS_FILTER_OPTIONS}
            style={{ minWidth: 160 }}
          />
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => navigate(`${basePrefix}/subject/create`)}
          size="large"
        >
          Create New Subject
        </Button>
      </div>

      <h2 style={{ marginBottom: 16 }}>Manage Subjects</h2>
      
      <Table
        columns={columns}
        dataSource={filteredSubjects}
        rowKey="subjectId"
        loading={loading}
        pagination={{
          ...pagination,
          total: filteredSubjects.length,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} subjects`,
          onChange: (page, pageSize) => {
            setPagination({ current: page, pageSize });
          },
        }}
        bordered
        scroll={{ x: 1000 }}
      />
    </div>
  );
}

const toolbarContainerStyle = {
  display: "flex", 
  alignItems: "center", 
  justifyContent: "space-between",
  flexWrap: "wrap", 
  gap: 16, 
  background: "#fff", 
  padding: "16px",
  borderRadius: 8, 
  marginBottom: 24, 
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
};

const filtersRowStyle = {
  display: "flex", 
  flexWrap: "wrap", 
  gap: 12, 
  alignItems: "center"
};


