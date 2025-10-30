import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Button, Input, Space, Table, Tooltip, message, Card, Modal, DatePicker, Form } from "antd";
import { SearchOutlined, FileExcelOutlined, EyeOutlined, EditOutlined, PlusOutlined, DeleteOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import SemesterApi from "../../vn.fpt.edu.api/Semester";
import dayjs from "dayjs";

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
  const [loading, setLoading] = useState(true);
  const [semesters, setSemesters] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // bộ lọc
  const [filters, setFilters] = useState({
    search: "",
  });

  // MODAL form
  const [modal, setModal] = useState({ 
    open: false, 
    mode: "view", 
    semesterId: null, 
    initialSemester: null 
  });
  
  const [form] = Form.useForm();

  const openView = useCallback((record) => setModal({ 
    open: true, 
    mode: "view", 
    semesterId: record.id, 
    initialSemester: record 
  }), []);
  
  const openEdit = useCallback((record) => {
    form.setFieldsValue({
      name: record.name,
      startDate: record.startDate ? dayjs(record.startDate) : null,
      endDate: record.endDate ? dayjs(record.endDate) : null,
    });
    setModal({ 
      open: true, 
      mode: "edit", 
      semesterId: record.id, 
      initialSemester: record 
    });
  }, [form]);

  const openCreate = useCallback(() => {
    form.resetFields();
    setModal({ 
      open: true, 
      mode: "create", 
      semesterId: null, 
      initialSemester: null 
    });
  }, [form]);

  const closeModal = useCallback(() => {
    setModal((d) => ({ ...d, open: false }));
    form.resetFields();
  }, [form]);

  // MODAL confirm delete
  const [confirmModal, setConfirmModal] = useState({ 
    open: false, 
    record: null, 
    semesterName: "" 
  });

  const fetchSemesters = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        search: filters.search || undefined,
        page,
        pageSize,
      };
      console.log("Fetching semesters with params:", params);
      
      const apiResult = await SemesterApi.getSemesters(params);
      console.log("Semesters data received:", apiResult);
      
      const { total, items } = apiResult;
      
      if (!items || !Array.isArray(items)) {
        console.error("Invalid response format:", apiResult);
        message.error("Invalid data format");
        return;
      }
      
      setTotal(total || 0);
      setSemesters(normalize(items));
    } catch (e) {
      console.error("Error fetching semesters:", e);
      message.error(`Unable to load semester data: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [filters.search, page, pageSize]);

  useEffect(() => { fetchSemesters(); }, [fetchSemesters]);

  const onChangeFilter = (field, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        name: values.name.trim(),
        startDate: values.startDate.format("YYYY-MM-DD"),
        endDate: values.endDate.format("YYYY-MM-DD"),
      };

      if (modal.mode === "create") {
        await SemesterApi.createSemester(payload);
        message.success("Semester created successfully");
        fetchSemesters();
      } else if (modal.mode === "edit") {
        await SemesterApi.updateSemester(modal.semesterId, payload);
        message.success("Semester updated successfully");
        fetchSemesters();
      }
      
      closeModal();
    } catch (error) {
      console.error("Error submitting form:", error);
      message.error("An error occurred while saving data");
    }
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

  const columns = useMemo(
    () => [
      { title: "No.", render: (_, _r, i) => (page - 1) * pageSize + i + 1, width: 72, align: "center" },
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
    [page, pageSize, openView, openEdit, handleDelete]
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
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Semester
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={semesters}
        loading={loading}
        rowKey="id"
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
      />

      {/* Modal form */}
      <Modal
        title={
          modal.mode === "create" ? "Add New Semester" :
          modal.mode === "edit" ? "Edit Semester" :
          "Semester Details"
        }
        open={modal.open}
        onOk={modal.mode === "view" ? closeModal : handleSubmit}
        onCancel={closeModal}
        okText={modal.mode === "view" ? "Close" : "Save"}
        cancelText="Cancel"
        confirmLoading={loading}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          disabled={modal.mode === "view"}
        >
          <Form.Item
            label="Semester Name"
            name="name"
            rules={[
              { required: true, message: "Please enter semester name" },
              { min: 2, message: "Semester name must be at least 2 characters" }
            ]}
          >
            <Input placeholder="e.g., Fall Semester 2024-2025" />
          </Form.Item>

          <Form.Item
            label="Start Date"
            name="startDate"
            rules={[{ required: true, message: "Please select start date" }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label="End Date"
            name="endDate"
            rules={[{ required: true, message: "Please select end date" }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Form>
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
