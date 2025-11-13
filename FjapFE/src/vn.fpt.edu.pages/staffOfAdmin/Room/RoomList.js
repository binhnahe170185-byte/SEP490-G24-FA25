import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Button, Input, Space, Table, Tooltip, message, Card, Modal, Select, Switch } from "antd";
import { SearchOutlined, FileExcelOutlined, EyeOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import RoomApi from "../../../vn.fpt.edu.api/Room";

const normalize = (items = []) =>
  items.map((r) => ({
    id: r.roomId,
    roomName: r.roomName ?? "",
    statusStr: r.status ?? "Active",
    status: (r.status ?? "Active") === "Active",
  }));

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Active", value: "Active" },
  { label: "Inactive", value: "Inactive" },
];

export default function RoomList({ title = "Room Management" }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // filters
  const [filters, setFilters] = useState({
    search: "",
    status: "",
  });

  // MODAL form - only for view mode
  const [modal, setModal] = useState({ 
    open: false, 
    mode: "view", 
    roomId: null, 
    initialRoom: null 
  });

  const openView = (record) => setModal({ 
    open: true, 
    mode: "view", 
    roomId: record.id, 
    initialRoom: record 
  });
  
  const openEdit = (record) => {
    navigate(`/staffOfAdmin/rooms/edit/${record.id}`);
  };

  const closeModal = () => {
    setModal((d) => ({ ...d, open: false }));
  };

  // MODAL confirm delete
  const [confirmModal, setConfirmModal] = useState({ 
    open: false, 
    record: null, 
    roomName: "" 
  });

  // MODAL confirm status change
  const [confirmStatusModal, setConfirmStatusModal] = useState({ 
    open: false, 
    record: null, 
    checked: false, 
    roomName: "" 
  });

  const buildParams = () => {
    const params = {
      search: filters.search || undefined,
      status: filters.status || undefined,
      page: 1,
      pageSize: 100,
    };
    return params;
  };

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildParams();
      const response = await RoomApi.getRooms(params);
      
      if (!response) {
        setTotal(0);
        setRooms([]);
        return;
      }
      
      const { total, items } = response;
      
      if (!items || !Array.isArray(items)) {
        message.error("Invalid data format");
        setTotal(0);
        setRooms([]);
        return;
      }
      
      const normalized = normalize(items);
      setTotal(normalized.length);
      setRooms(normalized);
      
      if (normalized.length === 0 && total === 0) {
        console.log("No rooms found for current filters");
      }
    } catch (e) {
      console.error("Error fetching rooms:", e);
      message.error(`Unable to load room data: ${e.message || "Unknown error"}`);
      setTotal(0);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [filters.search, filters.status]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const onChangeFilter = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleDelete = (record) => {
    const roomName = record.roomName;
    setConfirmModal({
      open: true,
      record: record,
      roomName: roomName
    });
  };

  const handleConfirmDelete = async () => {
    const { record } = confirmModal;
    
    try {
      setLoading(true);
      await RoomApi.deleteRoom(record.id);
      message.success("Room deleted successfully");
      fetchRooms();
      setConfirmModal({ open: false, record: null, roomName: "" });
    } catch (error) {
      console.error("Error deleting room:", error);
      const errorMessage = error?.response?.data?.message || "Unable to delete this room";
      message.error(errorMessage);
      setConfirmModal({ open: false, record: null, roomName: "" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setConfirmModal({ open: false, record: null, roomName: "" });
  };

  const toggle = useCallback(async (record, checked) => {
    const roomName = record.roomName;
    
    console.log('Toggle called:', { record, checked, roomName });
    
    // Mở modal confirm trước, không update UI ngay
    setConfirmStatusModal({
      open: true,
      record: record,
      checked: checked,
      roomName: roomName
    });
  }, []);

  const handleConfirmStatusChange = async () => {
    const { record, checked } = confirmStatusModal;
    const newStatus = checked ? "Active" : "Inactive";
    
    try {
      console.log('Calling API to update status:', { roomId: record.id, status: newStatus });
      setLoading(true);
      
      await RoomApi.updateRoomStatus(record.id, newStatus);
      
      // Update UI sau khi API thành công
      setRooms((prev) =>
        prev.map((r) => (r.id === record.id ? { ...r, status: checked, statusStr: newStatus } : r))
      );
      
      message.success(`Room has been ${checked ? 'activated' : 'deactivated'} successfully`);
      setConfirmStatusModal({ open: false, record: null, checked: false, roomName: "" });
    } catch (error) {
      console.error("Error updating room status:", error);
      const errorMessage = error?.response?.data?.message || "Failed to update room status";
      message.error(errorMessage);
      setConfirmStatusModal({ open: false, record: null, checked: false, roomName: "" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelStatusChange = () => {
    console.log('User cancelled status change');
    setConfirmStatusModal({ open: false, record: null, checked: false, roomName: "" });
  };

  const columns = useMemo(
    () => [
      { title: "No.", render: (_, _r, i) => i + 1, width: 72, align: "center" },
      { title: "Room Name", dataIndex: "roomName", key: "roomName" },
      { 
        title: "Status", 
        dataIndex: "status", 
        key: "status",
        render: (_, r) => (
          <Switch
            checkedChildren="Active"
            unCheckedChildren="Inactive"
            checked={r.status}
            onChange={(c) => {
              console.log('Switch clicked:', { roomId: r.id, checked: c, currentStatus: r.status });
              toggle(r, c);
            }}
          />
        )
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
    [toggle]
  );

  const exportCsv = () => {
    const header = ["Room Name", "Status"];
    const rows = rooms.map((r) => [
      r.roomName, 
      r.statusStr || (r.status ? "Active" : "Inactive")
    ]);
    const csv = "\uFEFF" + [header, ...rows].map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); 
    a.href = url; 
    a.download = `rooms_${new Date().toISOString().slice(0, 10)}.csv`;
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
          placeholder="Search by room name..."
          allowClear
          prefix={<SearchOutlined />}
          value={filters.search}
          onChange={(e) => onChangeFilter("search", e.target.value)}
          onPressEnter={fetchRooms}
          style={{ width: 300 }}
        />

        <Select
          placeholder="Filter by status"
          allowClear
          value={filters.status || undefined}
          onChange={(value) => onChangeFilter("status", value || "")}
          style={{ width: 150 }}
        >
          {STATUS_OPTIONS.map(opt => (
            <Select.Option key={opt.value} value={opt.value}>
              {opt.label}
            </Select.Option>
          ))}
        </Select>

        <Space style={{ marginLeft: "auto" }}>
          <Button icon={<FileExcelOutlined />} onClick={exportCsv}>Export CSV</Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={rooms}
        loading={loading}
        rowKey="id"
        pagination={false}
      />

      {/* Modal form - only for view mode */}
      <Modal
        title="Room Details"
        open={modal.open && modal.mode === "view"}
        onOk={closeModal}
        onCancel={closeModal}
        okText="Close"
        cancelText="Cancel"
        width={600}
      >
        {modal.initialRoom && (
          <div>
            <p><strong>Room Name:</strong> {modal.initialRoom.roomName}</p>
            <p><strong>Status:</strong> <span style={{ color: modal.initialRoom.status ? "#52c41a" : "#ff4d4f" }}>
              {modal.initialRoom.statusStr || (modal.initialRoom.status ? "Active" : "Inactive")}
            </span></p>
          </div>
        )}
      </Modal>

      {/* Modal confirm delete */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: '18px' }} />
            <span>Confirm Delete Room</span>
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
            Are you sure you want to delete room <strong>{confirmModal.roomName}</strong>?
          </p>
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#fff2f0', 
            border: '1px solid #ffccc7',
            borderRadius: '6px',
            fontSize: '14px',
            color: '#cf1322'
          }}>
            <strong>Warning:</strong> This action cannot be undone. If this room has associated lessons, it cannot be deleted.
          </div>
        </div>
      </Modal>

      {/* Modal confirm status change */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: '18px' }} />
            <span>Confirm Status Change</span>
          </div>
        }
        open={confirmStatusModal.open}
        onOk={handleConfirmStatusChange}
        onCancel={handleCancelStatusChange}
        okText="Yes, Change Status"
        cancelText="Cancel"
        centered
        confirmLoading={loading}
        okButtonProps={{
          type: 'primary',
          danger: !confirmStatusModal.checked,
          style: {
            backgroundColor: confirmStatusModal.checked ? '#52c41a' : '#ff4d4f',
            borderColor: confirmStatusModal.checked ? '#52c41a' : '#ff4d4f'
          }
        }}
        cancelButtonProps={{
          style: { borderColor: '#d9d9d9' }
        }}
        width={400}
      >
        <div style={{ padding: '16px 0' }}>
          <p style={{ margin: '0 0 16px 0', fontSize: '16px', lineHeight: '1.5' }}>
            Are you sure you want to <strong style={{ color: confirmStatusModal.checked ? '#52c41a' : '#ff4d4f' }}>
              {confirmStatusModal.checked ? 'activate' : 'deactivate'}
            </strong> the room <strong>{confirmStatusModal.roomName}</strong>?
          </p>
          <div style={{ 
            padding: '12px', 
            backgroundColor: confirmStatusModal.checked ? '#f6ffed' : '#fff2f0', 
            border: `1px solid ${confirmStatusModal.checked ? '#b7eb8f' : '#ffccc7'}`,
            borderRadius: '6px',
            fontSize: '14px',
            color: confirmStatusModal.checked ? '#389e0d' : '#cf1322'
          }}>
            <strong>Current Status:</strong> {confirmStatusModal.checked ? 'Inactive' : 'Active'} → 
            <strong style={{ color: confirmStatusModal.checked ? '#52c41a' : '#ff4d4f' }}>
              {' '}{confirmStatusModal.checked ? 'Active' : 'Inactive'}
            </strong>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

