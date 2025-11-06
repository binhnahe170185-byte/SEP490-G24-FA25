import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Button, Input, Space, Table, Tooltip, message, Card, Modal } from "antd";
import { SearchOutlined, FileExcelOutlined, EyeOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import SemesterApi from "../../vn.fpt.edu.api/Semester";

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

export default function SemesterList({ title = "Semester Management" }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [semesters, setSemesters] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const openView = (record) => setModal({ 
    open: true, 
    mode: "view", 
    semesterId: record.id, 
    initialSemester: record 
  });
  
  const openEdit = (record) => {
    // Navigate to Edit Semester page
    navigate("/staffOfAdmin", { 
      state: { 
        activeTab: "sem:edit",
        semesterId: record.id 
      } 
    });
  };


  const closeModal = () => {
    setModal((d) => ({ ...d, open: false }));
  };

  // MODAL confirm delete
  const [confirmModal, setConfirmModal] = useState({ 
    open: false, 
    record: null, 
    semesterName: "" 
  });

  const applyUpdated = (updated) => {
    if (!updated?.semesterId) return;
    setSemesters((prev) =>
      prev.map((s) =>
        s.id === updated.semesterId
          ? {
            ...s,
            name: updated.name ?? s.name,
            startDate: updated.startDate ?? s.startDate,
            endDate: updated.endDate ?? s.endDate,
            duration: updated.duration ?? s.duration,
          }
          : s
      )
    );
  };

  const buildParams = () => {
    const params = {
      search: filters.search || undefined,
      // Request large page size to get all results
      page: 1,
      pageSize: 100,
    };
    return params;
  };

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
        setTotal(0);
        setSemesters([]);
        return;
      }
      
      const { total, items } = response;
      console.log("Semesters extracted:", { total, items, itemsIsArray: Array.isArray(items) });
      
      if (!items || !Array.isArray(items)) {
        console.error("Invalid response format:", response);
        message.error("Invalid data format");
        setTotal(0);
        setSemesters([]);
        return;
      }
      
      const normalized = normalize(items);
      console.log("Normalized semesters:", normalized.length);
      
      setTotal(normalized.length);
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
      setTotal(0);
      setSemesters([]);
    } finally {
      setLoading(false);
    }
  }, [filters.search]);

  useEffect(() => { fetchSemesters(); }, [fetchSemesters]);

  const onChangeFilter = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };


  const handleDelete = (record) => {
    const semesterName = record.name;
    setConfirmModal({
      open: true,
      record: record,
      semesterName: semesterName
    });
  };

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

  const columns = useMemo(
    () => [
      { title: "No.", render: (_, _r, i) => i + 1, width: 72, align: "center" },
      { title: "Semester Name", dataIndex: "name", key: "name" },
      { title: "Start Date", dataIndex: "startDate", key: "startDate" },
      { title: "End Date", dataIndex: "endDate", key: "endDate" },
      { 
        title: "Duration (days)", 
        dataIndex: "duration", 
        key: "duration",
        render: (duration) => `${duration} days`
      },
      { 
        title: "Classes", 
        dataIndex: "classCount", 
        key: "classCount",
        align: "center"
      },
      { 
        title: "Students", 
        dataIndex: "studentCount", 
        key: "studentCount",
        align: "center"
      },
      {
        title: "Actions",
        key: "actions",
        align: "right",
        render: (_, r) => (
          <Space>
            <Tooltip title="View Details">
              <Button size="small" icon={<EyeOutlined />} onClick={() => openView(r)} />
            </Tooltip>
            <Tooltip title="Edit">
              <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
            </Tooltip>
            <Tooltip title="Delete">
              <Button 
                size="small" 
                icon={<DeleteOutlined />} 
                danger
                onClick={() => handleDelete(r)} 
              />
            </Tooltip>
          </Space>
        ),
      },
    ],
    []
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
    <Card bodyStyle={{ padding: 16 }} style={{ borderRadius: 12, boxShadow: "0 6px 18px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <Input
          placeholder="Search by semester name..."
          allowClear
          prefix={<SearchOutlined />}
          value={filters.search}
          onChange={(e) => onChangeFilter("search", e.target.value)}
          onPressEnter={fetchSemesters}
          style={{ width: 300 }}
        />

        <Space style={{ marginLeft: "auto" }}>
          <Button icon={<FileExcelOutlined />} onClick={exportCsv}>Export CSV</Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={semesters}
        loading={loading}
        rowKey="id"
        pagination={false}
      />

      {/* Modal form - only for view mode */}
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

      {/* Modal confirm delete */}
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
    </Card>
  );
}
