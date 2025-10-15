import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Input, Select, Space, Table, Tooltip, Switch, message } from "antd";
import { EditOutlined, EyeOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import ClassListApi from "../../../vn.fpt.edu.api/ClassList";
import ClassFormModal from "./ClassFormModel";

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
    const semesterSource =
      item.semester_detail ??
      item.semesterDetail ??
      item.semester ??
      item.Semester ??
      item.semester_name ??
      item.semesterName ??
      item.SemesterName ??
      null;
    const semesterDetails =
      semesterSource &&
      typeof semesterSource === "object" &&
      !Array.isArray(semesterSource)
        ? semesterSource
        : null;
    const semester =
      (semesterDetails &&
        (semesterDetails.name ??
          semesterDetails.Name ??
          semesterDetails.semester_name ??
          semesterDetails.semesterName ??
          semesterDetails.SemesterName)) ??
      (typeof semesterSource === "string" ? semesterSource : null) ??
      item.semester_name ??
      item.semesterName ??
      "-";
    const semesterId =
      (semesterDetails &&
        (semesterDetails.semester_id ??
          semesterDetails.semesterId ??
          semesterDetails.SemesterId ??
          semesterDetails.id)) ??
      item.semester_id ??
      item.semesterId ??
      item.SemesterId ??
      null;
    const startDateSource =
      item.start_date ??
      item.startDate ??
      item.StartDate ??
      item.begin_date ??
      item.BeginDate ??
      item.semester_start_date ??
      item.semesterStartDate ??
      item.semester_start ??
      item.semesterStart ??
      (semesterDetails &&
        (semesterDetails.start_date ??
          semesterDetails.startDate ??
          semesterDetails.StartDate ??
          semesterDetails.begin_date ??
          semesterDetails.BeginDate)) ??
      null;
    const endDateSource =
      item.end_date ??
      item.endDate ??
      item.EndDate ??
      item.finish_date ??
      item.FinishDate ??
      item.semester_end ??
      item.semesterEnd ??
      (semesterDetails &&
        (semesterDetails.end_date ??
          semesterDetails.endDate ??
          semesterDetails.EndDate ??
          semesterDetails.finish_date ??
          semesterDetails.FinishDate)) ??
      item.semester_end_date ??
      item.semesterEndDate ??
      null;
    const levelSource =
      item.level_detail ??
      item.levelDetail ??
      item.level ??
      item.Level ??
      item.level_name ??
      item.levelName ??
      item.LevelName ??
      null;
    const levelDetails =
      levelSource &&
      typeof levelSource === "object" &&
      !Array.isArray(levelSource)
        ? levelSource
        : null;
    const level =
      (levelDetails &&
        (levelDetails.level_name ??
          levelDetails.levelName ??
          levelDetails.LevelName ??
          levelDetails.name ??
          levelDetails.Name ??
          levelDetails?.name)) ??
      (typeof levelSource === "string" ? levelSource : null) ??
      item.level_name ??
      item.levelName ??
      "-";
    const levelId =
      (levelDetails &&
        (levelDetails.level_id ??
          levelDetails.levelId ??
          levelDetails.LevelId ??
          levelDetails.id)) ??
      (levelDetails && levelDetails.id) ??
      item.level_id ??
      item.levelId ??
      item.LevelId ??
      null;
    const rawStatus =
      item.status ??
      item.Status ??
      item.state ??
      item.State ??
      item.isActive ??
      item.IsActive ??
      null;
    const updatedAt =
      item.updated_at ??
      item.updatedAt ??
      item.UpdatedAt ??
      item.update_at ??
      item.updateAt ??
      item.UpdateAt ??
      item.last_updated ??
      item.lastUpdated ??
      item.modified_at ??
      item.modifiedAt ??
      null;
    const statusBool = parseStatus(rawStatus);
    const statusLabel =
      typeof rawStatus === "string"
        ? rawStatus
        : toStatusLabel(statusBool);

    const classIdValue =
      classId ??
      (typeof item.id !== "undefined" ? item.id : null);
    const classIdString =
      classIdValue !== null && classIdValue !== undefined
        ? classIdValue.toString()
        : `CL${String(index + 1).padStart(3, "0")}`;

    return {
      class_id: classIdString,
      classId: classIdValue,
      class_name: className,
      semester,
      semester_id: semesterId,
      start_date: startDateSource,
      end_date: endDateSource,
      level,
      level_id: levelId,
      status: statusBool,
      statusLabel,
      updated_at: updatedAt,
    };
  });

const buildClassRows = (data = []) => {
  const normalized = normalizeClasses(data ?? []);
  normalized.sort((a, b) => {
    const dateA = new Date(a.updated_at ?? 0).getTime();
    const dateB = new Date(b.updated_at ?? 0).getTime();
    if (Number.isNaN(dateA) && Number.isNaN(dateB)) {
      return 0;
    }
    if (Number.isNaN(dateA)) {
      return 1;
    }
    if (Number.isNaN(dateB)) {
      return -1;
    }
    if (dateA === dateB) {
      return (b.class_id ?? "").localeCompare(a.class_id ?? "");
    }
    return dateB - dateA;
  });
  return normalized;
};

export default function ClassList() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    semester: "all",
    status: "all",
    level: "all",
  });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 8 });
  const { current: currentPage, pageSize } = pagination;
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [formModalConfig, setFormModalConfig] = useState({
    open: false,
    mode: "create",
    classId: null,
    initialValues: null,
  });
  const navigate = useNavigate();

  const loadClasses = useCallback(() => {
    setLoading(true);
    ClassListApi.getAll()
      .then((data) => {
        console.log("✅ Data backend:", data);
        setClasses(buildClassRows(data ?? []));
      })
      .catch((error) => {
        console.error("❌ Error fetching classes:", error);
        message.error("Failed to load class list");
      })
      .finally(() => setLoading(false));
  }, []);


  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const filterOptions = useMemo(() => {
    const semesterSeen = new Set();
    const levelSeen = new Set();
    const semesters = [];
    const levels = [];

    classes.forEach((item) => {
      const semesterValue = item.semester;
      if (semesterValue && semesterValue !== "-") {
        const key = semesterValue.toString().toLowerCase();
        if (!semesterSeen.has(key)) {
          semesterSeen.add(key);
          semesters.push(semesterValue);
        }
      }

      const levelValue = item.level;
      if (levelValue && levelValue !== "-") {
        const key = levelValue.toString().toLowerCase();
        if (!levelSeen.has(key)) {
          levelSeen.add(key);
          levels.push(levelValue);
        }
      }
    });

    return {
      semesters,
      levels,
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
          item.level,
          formatDate(item.start_date),
          formatDate(item.end_date),
          item.statusLabel,
          formatDateTime(item.updated_at),
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
    const matchesLevel =
      filters.level === "all" || item.level === filters.level;
    const matchesStatus =
      filters.status === "all" ||
      (filters.status === "active" && item.status) ||
      (filters.status === "inactive" && !item.status);

    return matchesSemester && matchesLevel && matchesStatus;
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

  const handleCloseFormModal = useCallback(() => {
    setFormModalConfig({
      open: false,
      mode: "create",
      classId: null,
      initialValues: null,
    });
  }, []);

  const handleFormModalSuccess = useCallback(() => {
    handleCloseFormModal();
    loadClasses();
  }, [handleCloseFormModal, loadClasses]);

  const handleCreateClass = () => {
    setFormModalConfig({
      open: true,
      mode: "create",
      classId: null,
      initialValues: null,
    });
  };

  const handleEditClass = (record) => {
    const targetId = record?.classId ?? record?.class_id;
    if (!targetId) {
      message.error("Class identifier is missing for editing");
      return;
    }

    setFormModalConfig({
      open: true,
      mode: "edit",
      classId: targetId,
      initialValues: {
        name: record.class_name ?? "",
        levelId:
          record.level_id ??
          record.levelId ??
          record.level ??
          record.levelName ??
          null,
        levelName: record.level ?? record.levelName ?? "",
        semesterId:
          record.semester_id ??
          record.semesterId ??
          record.semester ??
          record.semesterName ??
          null,
        semesterName: record.semester ?? record.semesterName ?? "",
      },
    });
  };

  const handlePageChange = (page, pageSize) => {
    setPagination((prev) => ({ ...prev, current: page, pageSize }));
  };

  const handleStatusToggle = async (record, checked) => {
    const targetClassId = (record.classId ?? record.class_id)?.toString();
    if (!targetClassId) {
      message.error("Missing class identifier");
      return;
    }

    const previousStatus = record.status;
    const previousUpdatedAt = record.updated_at;
    setUpdatingStatusId(targetClassId);
    setClasses((prev) =>
      prev.map((item) =>
        item.class_id === targetClassId
          ? { ...item, status: checked, statusLabel: toStatusLabel(checked) }
          : item
      )
    );

    try {
      const updated = await ClassListApi.updateStatus(targetClassId, checked);
      setClasses((prev) =>
        prev
          .map((item) => {
            if (item.class_id !== targetClassId) {
              return item;
            }

            const fallbackUpdatedAt =
              (updated && (updated.updated_at ?? updated.updatedAt)) ||
              new Date().toISOString();
            const mergedSource = updated
              ? { ...item, ...updated, updated_at: fallbackUpdatedAt }
            : {
                ...item,
                status: checked,
                statusLabel: toStatusLabel(checked),
                updated_at: fallbackUpdatedAt,
              };
          const normalizedList = normalizeClasses([mergedSource]);
          const normalized =
            normalizedList && normalizedList.length ? normalizedList[0] : null;

          if (normalized) {
            return {
              ...item,
              ...normalized,
              updated_at: normalized.updated_at ?? fallbackUpdatedAt,
            };
          }

          return {
            ...item,
            status: checked,
            statusLabel: toStatusLabel(checked),
            updated_at: fallbackUpdatedAt,
          };
          })
          .sort((a, b) => {
            const dateA = new Date(a.updated_at ?? 0).getTime();
            const dateB = new Date(b.updated_at ?? 0).getTime();
            if (Number.isNaN(dateA) && Number.isNaN(dateB)) {
              return 0;
            }
            if (Number.isNaN(dateA)) {
              return 1;
            }
            if (Number.isNaN(dateB)) {
              return -1;
            }
            if (dateA === dateB) {
              return (b.class_id ?? "").localeCompare(a.class_id ?? "");
            }
            return dateB - dateA;
          })
      );

      const successName =
        updated?.class_name ??
        updated?.className ??
        record.class_name ??
        record.classId ?? targetClassId;
      message.success(
        `${successName ?? targetClassId} is now ${
          checked ? "Active" : "Inactive"
        }`
      );
    } catch (error) {
      message.error("Failed to update class status");
      setClasses((prev) =>
        prev.map((item) =>
          item.class_id === targetClassId
            ? {
                ...item,
                status: previousStatus,
                statusLabel: toStatusLabel(previousStatus),
                updated_at: previousUpdatedAt,
              }
            : item
        )
      );
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleView = (record) => {
    const destinationId = record?.classId ?? record?.class_id;
    if (!destinationId) {
      return;
    }

    navigate(`/manager/class/${destinationId}`,
      {
        state: { className: record.class_name ?? destinationId }
      });
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
      title: "Level",
      dataIndex: "level",
      key: "level",
      render: (value) => value ?? "-",
    },
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
      title: "Updated At",
      dataIndex: "updated_at",
      key: "updated_at",
      render: (value) => formatDateTime(value),
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
          loading={
            updatingStatusId === (record.classId ?? record.class_id)?.toString()
          }
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditClass(record)}
            />
          </Tooltip>
          <Tooltip title="View">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
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
            value={filters.level}
            onChange={(value) => handleFilterChange("level", value)}
            options={[
              { value: "all", label: "All Levels" },
              ...filterOptions.levels.map((value) => ({
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
        dataSource={filteredClasses}
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
      <ClassFormModal
        open={formModalConfig.open}
        mode={formModalConfig.mode}
        classId={formModalConfig.classId}
        initialValues={formModalConfig.initialValues ?? {}}
        onCancel={handleCloseFormModal}
        onSuccess={handleFormModalSuccess}
        fallbackLevels={filterOptions.levels}
        fallbackSemesters={filterOptions.semesters}
      />
    </>


  );
}

const toDateInstance = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const direct = new Date(value);
    return Number.isNaN(direct.getTime()) ? null : direct;
  }

  if (typeof value === "object") {
    if (typeof value.toDate === "function") {
      const derived = value.toDate();
      if (derived instanceof Date && !Number.isNaN(derived.getTime())) {
        return derived;
      }
    }

    const hasYmd =
      typeof value.year === "number" &&
      typeof value.month === "number" &&
      typeof value.day === "number";
    if (hasYmd) {
      const date = new Date(value.year, value.month - 1, value.day);
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }

    if ("seconds" in value || "nanoseconds" in value) {
      const seconds = typeof value.seconds === "number" ? value.seconds : 0;
      const nanos = typeof value.nanoseconds === "number" ? value.nanoseconds : 0;
      const date = new Date(seconds * 1000 + nanos / 1e6);
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }
  }

  return null;
};

const formatDate = (value) => {
  const date = toDateInstance(value);
  if (!date) {
    return "-";
  }

  return date.toLocaleDateString();
};

const formatDateTime = (value) => {
  const date = toDateInstance(value);
  if (!date) {
    return "-";
  }

  return date.toLocaleString();
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
