import React, { useEffect, useMemo, useState } from "react";
import { Button, Input, Select, Space, Table, Tooltip } from "antd";
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import ClassListApi from "../../api/ClassList";
export default function ClassList() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    subject: "all",
    teacher: "all",
    room: "all",
  });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 8 });
  const { current: currentPage, pageSize } = pagination;

  const normalizeClasses = (list = []) =>
    list.map((item, index) => ({
      ...item,
      class_id: item.class_id ?? item.id ?? `CL${String(index + 1).padStart(3, "0")}`,
      class_name: item.class_name ?? item.name ?? "-",
      subject: item.subject ?? item.subject_code ?? item.subject_name ?? "-",
      teacher: item.teacher ?? item.teacher_name ?? "-",
      room_name: item.room_name ?? item.room ?? "-",
      students: item.students ?? item.student_count ?? item.total_students ?? 0,
    }));

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
    const uniqueValues = (field) =>
      Array.from(
        new Set(
          classes
            .map((item) => item[field])
            .filter((value) => value && value !== "-")
        )
      );

    return {
      subjects: uniqueValues("subject"),
      teachers: uniqueValues("teacher"),
      rooms: uniqueValues("room_name"),
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
        matchesSearch = [
          item.class_id,
          item.class_name,
          item.subject,
          item.teacher,
          item.room_name,
        ]
          .filter(Boolean)
          .some((value) =>
            value.toString().toLowerCase().includes(searchTerm)
          );
      }
    }

    if (!matchesSearch) {
      return false;
    }

    const matchesSubject =
      filters.subject === "all" || item.subject === filters.subject;
    const matchesTeacher =
      filters.teacher === "all" || item.teacher === filters.teacher;
    const matchesRoom =
      filters.room === "all" || item.room_name === filters.room;

    return matchesSubject && matchesTeacher && matchesRoom;
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

  const handleView = (record) => {
    console.log("View class", record);
  };

  const handleEdit = (record) => {
    console.log("Edit class", record);
  };

  const handleDelete = (record) => {
    console.log("Delete class", record);
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
      title: "Class ID",
      dataIndex: "class_id",
      key: "class_id",
      render: (value) => <strong>{value}</strong>,
    },
    { title: "Class Name", dataIndex: "class_name", key: "class_name" },
    { title: "Subject", dataIndex: "subject", key: "subject" },
    { title: "Teacher", dataIndex: "teacher", key: "teacher" },
    { title: "Room Name", dataIndex: "room_name", key: "room_name" },
    {
      title: "Students",
      dataIndex: "students",
      key: "students",
      align: "right",
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
          <Tooltip title="Edit">
            <button
              type="button"
              onClick={() => handleEdit(record)}
              style={actionButtonStyle}
            >
              <EditOutlined />
            </button>
          </Tooltip>
          <Tooltip title="Delete">
            <button
              type="button"
              onClick={() => handleDelete(record)}
              style={actionButtonStyle}
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
            value={filters.subject}
            onChange={(value) => handleFilterChange("subject", value)}
            options={[
              { value: "all", label: "All Subjects" },
              ...filterOptions.subjects.map((value) => ({
                value,
                label: value,
              })),
            ]}
            style={{ minWidth: 160 }}
          />

          <Select
            value={filters.teacher}
            onChange={(value) => handleFilterChange("teacher", value)}
            options={[
              { value: "all", label: "All Teachers" },
              ...filterOptions.teachers.map((value) => ({
                value,
                label: value,
              })),
            ]}
            style={{ minWidth: 160 }}
          />

          <Select
            value={filters.room}
            onChange={(value) => handleFilterChange("room", value)}
            options={[
              { value: "all", label: "All Rooms" },
              ...filterOptions.rooms.map((value) => ({
                value,
                label: value,
              })),
            ]}
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
