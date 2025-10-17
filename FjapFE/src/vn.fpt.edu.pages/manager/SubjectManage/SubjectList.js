// Suggested path: src/vn.fpt.edu.pages/manager/SubjectManage/Index.js
import React, { useEffect, useMemo, useState } from "react";
import { Button, Input, Select, Space, Table, Tooltip, Switch, message, Tag } from "antd";
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import SubjectListApi from "../../../vn.fpt.edu.api/SubjectList";

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
  
  // Remove 'class' and 'semester' from filters
  const [filters, setFilters] = useState({
    search: "",
    level: "all",
    status: "all",
  });

  const [pagination, setPagination] = useState({ current: 1, pageSize: 8 });
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const navigate = useNavigate();

  // Normalize data returned from the API
  const normalizeSubjects = (list = []) =>
    list.map((item) => ({
      subjectId: item.subjectId,
      subjectCode: item.subjectCode,
      subjectName: item.subjectName,
      levelName: item.levelName,
      passMark: item.passMark,
      description: item.description,
      status: parseStatus(item.status),
    }));

  useEffect(() => {
    setLoading(true);
    SubjectListApi.getAll()
      .then((data) => {
        setSubjects(normalizeSubjects(data));
      })
      .catch((error) => {
        console.error("❌ Error fetching subjects:", error);
        message.error("Failed to load the list of subjects");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Create option list for the Level filter
  const filterOptions = useMemo(() => {
    const levels = new Set(subjects.map(s => s.levelName).filter(Boolean));
    return {
      levels: Array.from(levels).sort(),
    };
  }, [subjects]);

  // Filter data based on user-selected filters
  const filteredSubjects = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();
    return subjects.filter((item) => {
      const matchesSearch = searchTerm ? 
        [item.subjectCode, item.subjectName, item.levelName]
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
          item.subjectId === record.subjectId ? { ...item, status: checked } : item
        )
      );
      message.success(`Status updated successfully!`);
    } catch (error) {
      message.error("Failed to update status");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleDelete = async (record) => {
    if (!window.confirm(`Are you sure you want to delete the subject "${record.subjectName}"?`)) return;
    try {
      await SubjectListApi.delete(record.subjectId);
      setSubjects(prev => prev.filter(item => item.subjectId !== record.subjectId));
      message.success(`Subject "${record.subjectName}" deleted successfully`);
    } catch (error) {
      message.error("Failed to delete subject");
    }
  };

  const columns = [
    {
      title: "No.",
      key: "rowNumber",
      align: "center",
      width: 60,
      render: (_, __, index) =>
        (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: "Subject Code",
      dataIndex: "subjectCode",
      key: "subjectCode",
      width: 120,
      render: (value) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: "Subject Name",
      dataIndex: "subjectName",
      key: "subjectName",
      width: 250,
      render: (value) => <strong>{value}</strong>,
    },
    {
      title: "Level",
      dataIndex: "levelName",
      key: "levelName",
      width: 100,
    },
    {
      title: "Pass Mark",
      dataIndex: "passMark",
      key: "passMark",
      align: "center",
      width: 100,
    },
    {
      title: "Status",
      key: "status",
      align: "center",
      width: 120,
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
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (value) => (
        <Tooltip title={value || "No description"}>
          <span>{value || "-"}</span>
        </Tooltip>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      align: "center",
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: "#1890ff" }}/>}
              onClick={() => navigate(`/manager/subject/edit/${record.subjectId}`)}
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
    <>
      <div style={toolbarContainerStyle}>
        <div style={filtersRowStyle}>
          <Input
            placeholder="Search by code, name, level..."
            prefix={<SearchOutlined />}
            allowClear
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            style={{ width: 260 }}
          />

          <Select
            value={filters.level}
            onChange={(value) => handleFilterChange("level", value)}
            options={[
              { value: "all", label: "All Levels" },
              ...filterOptions.levels.map((value) => ({ value, label: value })),
            ]}
            style={{ minWidth: 130 }}
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
          onClick={() => navigate("/manager/subject/create")}
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
          onShowSizeChange: (_, size) => setPagination(prev => ({ ...prev, pageSize: size })),
          onChange: (page, size) => setPagination({ current: page, pageSize: size }),
        }}
        bordered
        scroll={{ x: 1200 }}
      />
    </>
  );
}

// --- Styles ---
const toolbarContainerStyle = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  flexWrap: "wrap", gap: 16, background: "#fff", padding: "16px",
  borderRadius: 8, marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
};

const filtersRowStyle = {
  display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center"
};