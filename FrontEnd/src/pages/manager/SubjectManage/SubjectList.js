import React, { useEffect, useMemo, useState } from "react";
import {Button,Input,Select,Space,Table,Tooltip,Switch,message,Tag,} from "antd";
import {EyeOutlined,PlusOutlined,SearchOutlined,EditOutlined,DeleteOutlined,} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import SubjectListApi from "../../../api/SubjectList";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const toStatusLabel = (value) => (value ? "Active" : "Inactive");

const parseStatus = (raw) => {
  if (typeof raw === "boolean") {
    return raw;
  }if (raw === null || raw === undefined) {
    return false;
  }if (typeof raw === "number") {
    return raw === 1;
  }
  const normalized = raw.toString().trim().toLowerCase();
  return ["1", "true", "show", "active", "enabled", "on"].includes(normalized);
};

export default function SubjectList() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({search: "",class: "all",level: "all",semester: "all",status: "all",});
  const [pagination, setPagination] = useState({ current: 1, pageSize: 8 });
  const { current: currentPage, pageSize } = pagination;
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const navigate = useNavigate();

  const normalizeSubjects = (list = []) =>
    list.map((item, index) => {
      const subjectId = item.subjectId ?? item.subject_id ?? item.id ?? null;
      const className = item.className ?? item.class_name ?? "-";
      const levelName = item.levelName ?? item.level_name ?? "-";
      const semesterName =
        item.semesterName ?? item.semester_name ?? item.semester ?? "-";
      const rawStatus = item.status ?? item.Status ?? item.state ?? null;
      const statusBool = parseStatus(rawStatus);

      return {
        subjectId: subjectId ?? `SUB${String(index + 1).padStart(3, "0")}`,
        subjectCode: item.subjectCode ?? item.subject_code ?? "-",
        subjectName: item.subjectName ?? item.subject_name ?? "-",
        className,
        levelName,
        semesterName,
        passMark: item.passMark ?? item.pass_mark ?? 0,
        description: item.description ?? "",
        createdAt: item.createdAt ?? item.created_at ?? null,
        status: statusBool,
        statusLabel: toStatusLabel(statusBool),
      };
    });

  useEffect(() => {
  SubjectListApi.getAll()
    .then((response) => {
      console.log("✅ Data backend:", response);
      const subjects = response?.data ?? response ?? [];
      setSubjects(normalizeSubjects(subjects));
      setLoading(false);
    })
    .catch((error) => {
      console.error("❌ Error fetching subjects:", error);
      message.error("Failed to load subjects");
      setLoading(false);
    });
}, []);

  const filterOptions = useMemo(() => {
    const classes = new Set();
    const levels = new Set();
    const semesters = new Set();

    subjects.forEach((item) => {
      if (item.className && item.className !== "-") {
        classes.add(item.className);
      }
      if (item.levelName && item.levelName !== "-") {
        levels.add(item.levelName);
      }
      if (item.semesterName && item.semesterName !== "-") {
        semesters.add(item.semesterName);
      }
    });

    return {
      classes: Array.from(classes).sort(),
      levels: Array.from(levels).sort(),
      semesters: Array.from(semesters).sort(),
    };
  }, [subjects]);

  const searchTerm = filters.search.trim().toLowerCase();

  const filteredSubjects = subjects.filter((item) => {
    let matchesSearch = true;
    if (searchTerm) {
      const isNumericOnly = /^\d+$/.test(searchTerm);
      if (isNumericOnly) {
        const idDigits = (item.subjectId ?? "").toString().replace(/\D/g, "");
        matchesSearch = idDigits.includes(searchTerm);
      } else {
        const candidates = [item.subjectId,item.subjectCode,item.subjectName,item.className,item.levelName,item.semesterName,item.statusLabel];
        matchesSearch = candidates
          .filter(Boolean)
          .some((value) => value.toString().toLowerCase().includes(searchTerm));
      }
    }
    if (!matchesSearch) {
      return false;
    }
    const matchesClass =
      filters.class === "all" || item.className === filters.class;
    const matchesLevel =
      filters.level === "all" || item.levelName === filters.level;
    const matchesSemester =
      filters.semester === "all" || item.semesterName === filters.semester;
    const matchesStatus =
      filters.status === "all" ||
      (filters.status === "active" && item.status) ||
      (filters.status === "inactive" && !item.status);
    return matchesClass && matchesLevel && matchesSemester && matchesStatus;
  });

  useEffect(() => {
    const maxPage = Math.max(1,Math.ceil(filteredSubjects.length / pageSize) || 1);

    if (currentPage > maxPage) {
      setPagination((prev) => ({ ...prev, current: maxPage }));
    }
  }, [filteredSubjects.length, currentPage, pageSize]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };
  const handleCreateSubject = () => {
    navigate("/manager/subjects/create");
  };

  const handlePageChange = (page, pageSize) => {
    setPagination((prev) => ({ ...prev, current: page, pageSize }));
  };

  const paginatedSubjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSubjects.slice(start, start + pageSize);
  }, [filteredSubjects, currentPage, pageSize]);

  const handleStatusToggle = async (record, checked) => {
    const previousStatus = record.status;
    setUpdatingStatusId(record.subjectId);
    setSubjects((prev) =>
      prev.map((item) =>
        item.subjectId === record.subjectId
          ? { ...item, status: checked, statusLabel: toStatusLabel(checked) }
          : item
      )
    );
    try {
      await SubjectListApi.updateStatus(record.subjectId, checked);
      message.success(
        `${record.subjectName} is now ${checked ? "Active" : "Inactive"}`
      );
    } catch (error) {
      message.error("Failed to update subject status");
      setSubjects((prev) =>
        prev.map((item) =>
          item.subjectId === record.subjectId
            ? {
                ...item,
                status: previousStatus,
                statusLabel: toStatusLabel(previousStatus),
              }
            : item
        )
      );
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleView = (record) => {
    if (!record?.subjectId) {
      return;
    }

    navigate(`/manager/subjects/${record.subjectId}`, {
      state: { subjectName: record.subjectName ?? record.subjectId },
    });
  };

  const handleEdit = (record) => {
    if (!record?.subjectId) {
      return;
    }

    navigate(`/manager/subjects/edit/${record.subjectId}`, {
      state: { subject: record },
    });
  };

  const handleDelete = async (record) => {
    if (!record?.subjectId) {
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${record.subjectName}"?`)) {return;}

    try {
      await SubjectListApi.delete(record.subjectId);
      message.success(`Subject "${record.subjectName}" deleted successfully`);
      setSubjects((prev) =>
        prev.filter((item) => item.subjectId !== record.subjectId)
      );
    } catch (error) {
      message.error("Failed to delete subject");
      console.error("Delete error:", error);
    }
  };

  const actionButtonStyle = {border: "none",background: "transparent",cursor: "pointer",padding: 0,color: "#4a5568",};

  const columns = [
    {
      title: "No.",
      key: "rowNumber",
      align: "center",
      width: 60,
      render: (_value, _record, index) =>
        (currentPage - 1) * pageSize + index + 1,
    },
    {
      title: "Subject Code",
      dataIndex: "subjectCode",
      key: "subjectCode",
      width: 90,
      render: (value) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: "Subject Name",
      dataIndex: "subjectName",
      key: "subjectName",
      width: 200,
      render: (value) => <strong>{value}</strong>,
    },
    {
      title: "Class",
      dataIndex: "className",
      key: "className",
      width: 120,
    },
    {
      title: "Level",
      dataIndex: "levelName",
      key: "levelName",
      width: 70,
    },
    {
      title: "Semester",
      dataIndex: "semesterName",
      key: "semesterName",
      width: 100,
    },
    {
      title: "Pass Mark",
      dataIndex: "passMark",
      key: "passMark",
      align: "center",
      width: 70,
      render: (value) => `${value}`,
    },
    {
      title: "Status",
      key: "status",
      align: "center",
      width: 100,
      render: (_value, record) => (
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
      width: 200,
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
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="View">
            <button
              type="button"
              onClick={() => handleView(record)}
              style={actionButtonStyle}
            >
              <EyeOutlined />
            </button>
          </Tooltip>
          <Tooltip title="Edit">
            <button
              type="button"
              onClick={() => handleEdit(record)}
              style={{ ...actionButtonStyle, color: "#1890ff" }}
            >
              <EditOutlined />
            </button>
          </Tooltip>
          <Tooltip title="Delete">
            <button
              type="button"
              onClick={() => handleDelete(record)}
              style={{ ...actionButtonStyle, color: "#ff4d4f" }}
            >
              <DeleteOutlined />
            </button>
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
            placeholder="Search subjects..."
            prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
            allowClear
            value={filters.search}
            onChange={(event) =>
              handleFilterChange("search", event.target.value)
            }
            style={{ width: 260, minWidth: 220 }}
          />

          <Select
            value={filters.class}
            onChange={(value) => handleFilterChange("class", value)}
            options={[
              { value: "all", label: "All Classes" },
              ...filterOptions.classes.map((value) => ({
                value,
                label: value,
              })),
            ]}
            style={{ minWidth: 140 }}
          />

          <Select
            value={filters.level}
            onChange={(value) => handleFilterChange("level", value)}
            options={[
              { value: "all", label: "All Levels" },
              ...filterOptions.levels.map((value) => ({
                value,
                label: value,
              })),
            ]}
            style={{ minWidth: 130 }}
          />

          <Select
            value={filters.semester}
            onChange={(value) => handleFilterChange("semester", value)}
            options={[
              { value: "all", label: "All Semesters" },
              ...filterOptions.semesters.map((value) => ({
                value,
                label: value,
              })),
            ]}
            style={{ minWidth: 150 }}
          />

          <Select
            value={filters.status}
            onChange={(value) => handleFilterChange("status", value)}
            options={STATUS_FILTER_OPTIONS}
            style={{ minWidth: 140 }}
          />
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreateSubject}
          style={{ minWidth: 160 }}
        >
          Create New Subject
        </Button>
      </div>

      <h2 style={{ marginBottom: 16 }}>Manage Subjects</h2>
      <Table
        columns={columns}
        dataSource={paginatedSubjects}
        rowKey="subjectId"
        loading={loading}
        pagination={{
          current: currentPage,
          pageSize,
          total: filteredSubjects.length,
          showSizeChanger: false,
          onChange: handlePageChange,
        }}
        bordered
        scroll={{ x: 1200 }}
      />
    </>
  );
}

const toolbarContainerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: 16,
  border: "1px solid #d6bcfa",
  background: "#f8f5ff",
  padding: "16px 20px",
  borderRadius: 12,
  marginBottom: 24,
};

const filtersRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  alignItems: "center",
  flex: 1,
  minWidth: 280,
};
