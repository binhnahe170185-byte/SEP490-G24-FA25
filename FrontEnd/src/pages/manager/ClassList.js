import React, { useEffect, useMemo, useState } from "react";
import { Button, Input, Select, Space, Table, Tooltip, Switch, message } from "antd";
import { EyeOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import ClassListApi from "../../api/ClassList";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const toStatusLabel = (value) => (value ? "Active" : "Inactive");

const parseStatus = (raw) => {
  if (typeof raw === "boolean") {
    return raw;
  }

  if (raw === null || raw === undefined) {
    return false;
  }

  if (typeof raw === "number") {
    return raw === 1;
  }

  const normalized = raw.toString().trim().toLowerCase();
  return ["1", "true", "show", "active", "enabled", "on"].includes(normalized);
};
export default function ClassList() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    semester: "all",
    status: "all",
  });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 8 });
  const { current: currentPage, pageSize } = pagination;
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const navigate = useNavigate();

  const normalizeClasses = (list = []) =>
    list.map((item, index) => {
      const classId =
        item.class_id ??
        item.classId ??
        item.ClassId ??
        item.id ??
        null;
      const className =
        item.class_name ??
        item.className ??
        item.ClassName ??
        item.name ??
        "-";
      const semester =
        item.semester ??
        item.Semester ??
        item.semester_name ??
        item.semesterName ??
        item.SemesterName ??
        "-";
      const startDate =
        item.start_date ??
        item.startDate ??
        item.StartDate ??
        item.begin_date ??
        item.BeginDate ??
        null;
      const endDate =
        item.end_date ??
        item.endDate ??
        item.EndDate ??
        item.finish_date ??
        item.FinishDate ??
        null;
      const rawStatus =
        item.status ??
        item.Status ??
        item.state ??
        item.State ??
        item.isActive ??
        item.IsActive ??
        null;
      const statusBool = parseStatus(rawStatus);
      const statusLabel =
        typeof rawStatus === "string"
          ? rawStatus
          : toStatusLabel(statusBool);

      return {
        class_id: classId ?? `CL${String(index + 1).padStart(3, "0")}`,
        class_name: className,
        semester,
        start_date: startDate,
        end_date: endDate,
        status: statusBool,
        statusLabel,
      };
    });

  useEffect(() => {
    ClassListApi.getAll()
      .then((data) => {
        console.log("✅ Data backend:", data);
        setClasses(normalizeClasses(data ?? []));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filterOptions = useMemo(() => {
    const seen = new Set();
    const semesters = [];

    classes.forEach((item) => {
      const value = item.semester;
      if (!value || value === "-") {
        return;
      }

      const key = value.toString().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        semesters.push(value);
      }
    });

    return {
      semesters,
    };
  }, [classes]);

  const searchTerm = filters.search.trim().toLowerCase();

  const filteredClasses = classes.filter((item) => {
    let matchesSearch = true;

    if (searchTerm) {
      const isNumericOnly = /^\d+$/.test(searchTerm);

      if (isNumericOnly) {
        const idDigits = (item.class_id ?? "")
          .toString()
          .replace(/\D/g, "");
        matchesSearch = idDigits.includes(searchTerm);
      } else {
        const candidates = [
          item.class_id,
          item.class_name,
          item.semester,
          formatDate(item.start_date),
          formatDate(item.end_date),
          item.statusLabel,
        ];

        matchesSearch = candidates
          .filter(Boolean)
          .some((value) => value.toString().toLowerCase().includes(searchTerm));
      }
    }

    if (!matchesSearch) {
      return false;
    }

    const matchesSemester =
      filters.semester === "all" || item.semester === filters.semester;
    const matchesStatus =
      filters.status === "all" ||
      (filters.status === "active" && item.status) ||
      (filters.status === "inactive" && !item.status);

    return matchesSemester && matchesStatus;
  });

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredClasses.length / pageSize) || 1);

    if (currentPage > maxPage) {
      setPagination((prev) => ({ ...prev, current: maxPage }));
    }
  }, [filteredClasses.length, currentPage, pageSize]);
  
  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleCreateClass = () => {
    console.log("Create new class");
  };

  const handlePageChange = (page, pageSize) => {
    setPagination((prev) => ({ ...prev, current: page, pageSize }));
  };

  const paginatedClasses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredClasses.slice(start, start + pageSize);
  }, [filteredClasses, currentPage, pageSize]);

  const handleStatusToggle = async (record, checked) => {
    const previousStatus = record.status;
    setUpdatingStatusId(record.class_id);
    setClasses((prev) =>
      prev.map((item) =>
        item.class_id === record.class_id
          ? { ...item, status: checked, statusLabel: toStatusLabel(checked) }
          : item
      )
    );

    try {
      await ClassListApi.updateStatus(record.class_id, checked);
      message.success(
        `${record.class_name} is now ${checked ? "Active" : "Inactive"}`
      );
    } catch (error) {
      message.error("Failed to update class status");
      setClasses((prev) =>
        prev.map((item) =>
          item.class_id === record.class_id
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
    if (!record?.class_id) {
      return;
    }

    navigate(`/manager/class/${record.class_id}`,
      {
        state: { className: record.class_name ?? record.class_id }
      });
  };

  const actionButtonStyle = {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: 0,
    color: "#4a5568",
  };

  const columns = [
    {
      title: "No.",
      key: "rowNumber",
      align: "center",
      width: 80,
      render: (_value, _record, index) =>
        (currentPage - 1) * pageSize + index + 1,
    },
    {
      title: "Class Name",
      dataIndex: "class_name",
      key: "class_name",
      render: (value) => <strong>{value}</strong>,
    },
    { title: "Semester", dataIndex: "semester", key: "semester" },
    {
      title: "Start Date",
      dataIndex: "start_date",
      key: "start_date",
      render: (value) => formatDate(value),
    },
    {
      title: "End Date",
      dataIndex: "end_date",
      key: "end_date",
      render: (value) => formatDate(value),
    },
    {
      title: "Status",
      key: "status",
      align: "center",
      render: (_value, record) => (
        <Switch
          checkedChildren="Active"
          unCheckedChildren="Inactive"
          checked={record.status}
          onChange={(checked) => handleStatusToggle(record, checked)}
          loading={updatingStatusId === record.class_id}
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
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
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={toolbarContainerStyle}>
        <div style={filtersRowStyle}>
          <Input
            placeholder="Search classes..."
            prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
            allowClear
            value={filters.search}
            onChange={(event) =>
              handleFilterChange("search", event.target.value)
            }
            style={{ width: 260, minWidth: 220 }}
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
            style={{ minWidth: 160 }}
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
          onClick={handleCreateClass}
          style={{ minWidth: 160 }}
        >
          Create New Class
        </Button>
      </div>

      <h2 style={{ marginBottom: 16 }}>Manage Class</h2>
      <Table
        columns={columns}
        dataSource={paginatedClasses}
        rowKey="class_id"
        loading={loading}
        pagination={{
          current: currentPage,
          pageSize,
          total: filteredClasses.length,
          showSizeChanger: false,
          onChange: handlePageChange,
        }}
        bordered
      />
    </>


  );
}

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
};

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
