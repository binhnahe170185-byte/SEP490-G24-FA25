import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Button, Input, Space, Table, Tooltip, message, Card, Modal, Tag, Typography } from "antd";
import { SearchOutlined, FileExcelOutlined, EyeOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import SemesterApi from "../../../vn.fpt.edu.api/Semester";
import dayjs from "dayjs";

const { Text } = Typography;

const normalize = (items = []) =>
  items.map((s) => ({
    id: s.semesterId,
    name: s.name ?? "",
    startDate: s.startDate ?? "",
    endDate: s.endDate ?? "",
    duration: s.duration ?? 0,
    classCount: s.classCount ?? 0,
    studentCount: s.studentCount ?? 0,
  }));

export default function SemesterList({ title = "Semester Management", hideActions = false }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [semesters, setSemesters] = useState([]);

  // filters
  const [filters, setFilters] = useState({
    search: "",
  });

  // MODAL form - only for view mode
  const [modal, setModal] = useState({ 
    open: false, 
    mode: "view", 
    semesterId: null, 
    initialSemester: null 
  });

  const openView = useCallback((record) => {
    setModal({ 
      open: true, 
      mode: "view", 
      semesterId: record.id, 
      initialSemester: record 
    });
  }, []);
  
  const openEdit = useCallback((record) => {
    // Navigate to Edit Semester page
    navigate(`/staffOfAdmin/semesters/edit/${record.id}`);
  }, [navigate]);


  const closeModal = () => {
    setModal((d) => ({ ...d, open: false }));
  };

  // MODAL confirm delete
  const [confirmModal, setConfirmModal] = useState({ 
    open: false, 
    record: null, 
    semesterName: "" 
  });


  const buildParams = useCallback(() => {
    const params = {
      search: filters.search || undefined,
      // Request large page size to get all results
      page: 1,
      pageSize: 100,
    };
    return params;
  }, [filters.search]);

  const fetchSemesters = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildParams();
      console.log("Fetching semesters with params:", params);
      
      const response = await SemesterApi.getSemesters(params);
      console.log("Semesters data received:", response);
      
      // Handle case where API returns empty result on error
      if (!response) {
        console.warn("No response from API");
        setSemesters([]);
        return;
      }
      
      const { total, items } = response;
      console.log("Semesters extracted:", { total, items, itemsIsArray: Array.isArray(items) });
      
      if (!items || !Array.isArray(items)) {
        console.error("Invalid response format:", response);
        message.error("Invalid data format");
        setSemesters([]);
        return;
      }
      
      const normalized = normalize(items);
      console.log("Normalized semesters:", normalized.length);
      
      setSemesters(normalized);
      
      if (normalized.length === 0 && total === 0) {
        console.log("No semesters found for current filters");
      }
    } catch (e) {
      console.error("Error fetching semesters:", e);
      console.error("Error details:", {
        message: e.message,
        status: e.response?.status,
        data: e.response?.data
      });
      message.error(`Unable to load semester data: ${e.message || "Unknown error"}`);
      setSemesters([]);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => { fetchSemesters(); }, [fetchSemesters]);

  const onChangeFilter = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };


  const handleDelete = useCallback((record) => {
    const semesterName = record.name;
    setConfirmModal({
      open: true,
      record: record,
      semesterName: semesterName
    });
  }, []);

  const handleConfirmDelete = async () => {
    const { record } = confirmModal;
    
    try {
      setLoading(true);
      await SemesterApi.deleteSemester(record.id);
      message.success("Semester deleted successfully");
      fetchSemesters();
      setConfirmModal({ open: false, record: null, semesterName: "" });
    } catch (error) {
      console.error("Error deleting semester:", error);
      message.error("Unable to delete this semester");
      setConfirmModal({ open: false, record: null, semesterName: "" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setConfirmModal({ open: false, record: null, semesterName: "" });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      return dayjs(dateStr).format("DD/MM/YYYY");
    } catch {
      return dateStr;
    }
  };

  const columns = useMemo(
    () => {
      const baseColumns = [
        { 
          title: "No.", 
          render: (_, _r, i) => (
            <Text type="secondary" style={{ fontWeight: 500 }}>
              {i + 1}
            </Text>
          ), 
          width: 60, 
          align: "center",
          fixed: "left"
        },
        { 
          title: "Semester Name", 
          dataIndex: "name", 
          key: "name",
          width: 180,
          render: (name) => (
            <Text strong style={{ fontSize: 14, color: "#1890ff" }}>
              {name || "N/A"}
            </Text>
          )
        },
        { 
          title: "Start Date", 
          dataIndex: "startDate", 
          key: "startDate",
          width: 130,
          align: "center",
          render: (date) => (
            <Text>{formatDate(date)}</Text>
          )
        },
        { 
          title: "End Date", 
          dataIndex: "endDate", 
          key: "endDate",
          width: 130,
          align: "center",
          render: (date) => (
            <Text>{formatDate(date)}</Text>
          )
        },
        { 
          title: "Duration", 
          dataIndex: "duration", 
          key: "duration",
          width: 120,
          align: "center",
          render: (duration) => (
            <Tag color="blue" style={{ margin: 0, padding: "2px 8px" }}>
              {duration || 0} days
            </Tag>
          )
        },
        { 
          title: "Classes", 
          dataIndex: "classCount", 
          key: "classCount",
          width: 100,
          align: "center",
          render: (count) => (
            <Tag color={count > 0 ? "green" : "default"} style={{ margin: 0, padding: "2px 8px", minWidth: 50 }}>
              {count || 0}
            </Tag>
          )
        },
        { 
          title: "Students", 
          dataIndex: "studentCount", 
          key: "studentCount",
          width: 100,
          align: "center",
          render: (count) => (
            <Tag color={count > 0 ? "orange" : "default"} style={{ margin: 0, padding: "2px 8px", minWidth: 50 }}>
              {count || 0}
            </Tag>
          )
        },
      ];

      if (!hideActions) {
        baseColumns.push({
          title: "Actions",
          key: "actions",
          align: "right",
          width: 150,
          fixed: "right",
          render: (_, r) => (
            <Space size="small">
              <Tooltip title="View Details">
                <Button 
                  size="small" 
                  icon={<EyeOutlined />} 
                  onClick={() => openView(r)}
                  style={{ borderRadius: 4 }}
                />
              </Tooltip>
              <Tooltip title="Edit">
                <Button 
                  size="small" 
                  icon={<EditOutlined />} 
                  onClick={() => openEdit(r)}
                  type="primary"
                  style={{ borderRadius: 4 }}
                />
              </Tooltip>
              <Tooltip title="Delete">
                <Button 
                  size="small" 
                  icon={<DeleteOutlined />} 
                  danger
                  onClick={() => handleDelete(r)}
                  style={{ borderRadius: 4 }}
                />
              </Tooltip>
            </Space>
          ),
        });
      }

      return baseColumns;
    },
    [hideActions, openView, openEdit, handleDelete]
  );

  const exportCsv = () => {
    const header = ["Semester Name", "Start Date", "End Date", "Duration (days)", "Classes", "Students"];
    const rows = semesters.map((s) => [
      s.name, 
      s.startDate, 
      s.endDate, 
      s.duration, 
      s.classCount, 
      s.studentCount
    ]);
    const csv = "\uFEFF" + [header, ...rows].map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); 
    a.href = url; 
    a.download = `semesters_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); 
    URL.revokeObjectURL(url);
  };

  return (
    <Card 
      bodyStyle={{ padding: 24 }} 
      style={{ 
        borderRadius: 12, 
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        background: "#fff"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#1890ff" }}>{title}</h3>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
        <Input
          placeholder="Search by semester name..."
          allowClear
          prefix={<SearchOutlined />}
          value={filters.search}
          onChange={(e) => onChangeFilter("search", e.target.value)}
          onPressEnter={fetchSemesters}
          style={{ 
            width: 300,
            borderRadius: 6,
            height: 36
          }}
          size="large"
        />

        <Space style={{ marginLeft: "auto" }}>
          <Button 
            icon={<FileExcelOutlined />} 
            onClick={exportCsv}
            size="large"
            style={{ borderRadius: 6 }}
          >
            Export CSV
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={semesters}
        loading={loading}
        rowKey="id"
        pagination={false}
        bordered
        size="middle"
        scroll={{ x: 'max-content' }}
        style={{
          borderRadius: 8,
          overflow: 'hidden'
        }}
      />

      {/* Modal form - only for view mode */}
      {!hideActions && (
        <Modal
          title="Semester Details"
          open={modal.open && modal.mode === "view"}
          onOk={closeModal}
          onCancel={closeModal}
          okText="Close"
          cancelText="Cancel"
          width={600}
        >
          {modal.initialSemester && (
            <div>
              <p><strong>Semester Name:</strong> {modal.initialSemester.name}</p>
              <p><strong>Start Date:</strong> {modal.initialSemester.startDate}</p>
              <p><strong>End Date:</strong> {modal.initialSemester.endDate}</p>
              <p><strong>Duration:</strong> {modal.initialSemester.duration} days</p>
              <p><strong>Classes:</strong> {modal.initialSemester.classCount}</p>
              <p><strong>Students:</strong> {modal.initialSemester.studentCount}</p>
            </div>
          )}
        </Modal>
      )}

      {/* Modal confirm delete */}
      {!hideActions && (
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: '18px' }} />
              <span>Confirm Delete Semester</span>
            </div>
          }
          open={confirmModal.open}
          onOk={handleConfirmDelete}
          onCancel={handleCancelDelete}
          okText="Delete"
          cancelText="Cancel"
          centered
          confirmLoading={loading}
          okButtonProps={{
            type: 'primary',
            danger: true,
          }}
          width={400}
        >
          <div style={{ padding: '16px 0' }}>
            <p style={{ margin: '0 0 16px 0', fontSize: '16px', lineHeight: '1.5' }}>
              Are you sure you want to delete semester <strong>{confirmModal.semesterName}</strong>?
            </p>
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#fff2f0', 
              border: '1px solid #ffccc7',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#cf1322'
            }}>
              <strong>Warning:</strong> This action cannot be undone. All data related to this semester will be deleted.
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}
