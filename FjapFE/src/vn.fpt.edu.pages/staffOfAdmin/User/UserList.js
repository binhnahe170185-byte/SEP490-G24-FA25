import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Button, Input, Select, Space, Table, Tooltip, message, Switch, Card, Modal } from "antd";
import { SearchOutlined, FileExcelOutlined, EyeOutlined, EditOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import AdminApi from "../../../vn.fpt.edu.api/Admin";
import UserProfileModal from "./UserProfileModal"; // đúng tên component

const ROLE_MAP = { 1: "Admin", 2: "Manager", 3: "Lecturer", 4: "Student" };
const pickRole = (roleId, roleName) => roleName || ROLE_MAP[roleId] || `Role #${roleId}`;

const normalize = (items = []) =>
  items.map((u) => ({
    id: u.userId,
    firstName: u.firstName ?? "",
    lastName: u.lastName ?? "",
    email: u.email ?? "",
    phone: u.phoneNumber ?? "-",
    gender: u.gender ?? "-",
    roleId: u.roleId,
    role: pickRole(u.roleId, u.roleName),
    statusStr: u.status || "Active",
    status: (u.status || "Active") === "Active",
    dob: u.dob ?? "",
      studentCode: u.studentCode ?? u.student_code ?? null,
      levelId: u.levelId ?? null,
    levelName: u.levelName ?? u.level ?? null,
    semesterName: u.semesterName ?? u.semester ?? null,
    enrollmentDate: u.enrollmentDate ?? null,
    address: u.address ?? "",
    avatar: u.avatar ?? null,

  }));

export default function UsersList({ fixedRole, title = "View List User" }) {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // bộ lọc (tách biệt theo page nhờ reset khi fixedRole đổi)
  const [filters, setFilters] = useState({
    search: "",
    role: fixedRole ?? null,
    status: null,       // "Active" | "Inactive" | null
    semesterId: null,   // chỉ dùng cho Student
    levelId: null,      // chỉ dùng cho Student (mới)
    departmentId: "", // chỉ dùng cho Staff
  });

  const [semesterOptions, setSemesterOptions] = useState([]);
  const [levelOptions, setLevelOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);

  // MODAL hồ sơ (đặt đúng state)
  const [modal, setModal] = useState({ open: false, mode: "view", userId: null, initialUser: null });
  const openView = (record) => setModal({ open: true, mode: "view", userId: record.id, initialUser: record });
  const openEdit = (record) => setModal({ open: true, mode: "edit", userId: record.id, initialUser: record });
  const closeModal = () => setModal((d) => ({ ...d, open: false }));

  // MODAL confirm status change
  const [confirmModal, setConfirmModal] = useState({ 
    open: false, 
    record: null, 
    checked: false, 
    userName: "" 
  });

  const applyUpdated = (updated) => {
    if (!updated?.userId) return;
    setUsers((prev) =>
      prev.map((u) =>
        u.id === updated.userId
          ? {
            ...u,
            firstName: updated.firstName ?? u.firstName,
            lastName: updated.lastName ?? u.lastName,
            email: updated.email ?? u.email,
            phone: updated.phoneNumber ?? u.phone,
            gender: updated.gender ?? u.gender,
            roleId: updated.roleId ?? u.roleId,
            role: pickRole(updated.roleId ?? u.roleId),
            status: (updated.status || u.statusStr) === "Active",
            statusStr: updated.status || u.statusStr,
            dob: updated.dob ?? u.dob,
            address: updated.address ?? u.address,
            avatar: updated.avatar ?? u.avatar,
          }
          : u
      )
    );
  };

  // reset filter khi đổi trang (role)
  useEffect(() => {
    setFilters({ search: "", role: fixedRole ?? null, status: null, semesterId: null, levelId: null, departmentId: null });
    setPage(1);
  }, [fixedRole]);

  // tải semesters khi là Student
  useEffect(() => {
    if (fixedRole === 4) {
      (async () => {
        try {
          const data = await AdminApi.getEnrollmentSemesters();
          const opts = [{ value: null, label: "All semesters" }, ...data.map((s) => ({ value: s.semesterId, label: s.name }))];
          setSemesterOptions(opts);
        } catch {
          setSemesterOptions([{ value: null, label: "All semesters" }]);
        }
      })();
    } else {
      setSemesterOptions([]);
      setFilters((p) => ({ ...p, semesterId: null, levelId: null }));
    }
  }, [fixedRole]);

  // tải levels khi là Student
  useEffect(() => {
    if (fixedRole === 4) {
      (async () => {
        try {
          const levels = await AdminApi.getLevels();
          const opts = [{ value: null, label: "All levels" }, ...levels.map((l) => ({ value: Number(l.id ?? l.levelId), label: l.name || l.levelName }))];
          setLevelOptions(opts);
        } catch {
          setLevelOptions([{ value: null, label: "All levels" }]);
        }
      })();
    } else {
      setLevelOptions([]);
      setFilters((p) => ({ ...p, levelId: null }));
    }
  }, [fixedRole]);

  // tải departments khi là Staff (roles 7, 6) hoặc Lecturer (role 3)
  useEffect(() => {
    const shouldLoadDepartments = 
      (Array.isArray(fixedRole) && (fixedRole.includes(7) || fixedRole.includes(6))) || // Staff roles 7,6
      fixedRole === 3; // Lecturer
    
    if (shouldLoadDepartments) {
      (async () => {
        try {
          const data = await AdminApi.getDepartments();
          const opts = [{ value: "", label: "All departments" }, ...data.map((d) => ({ value: d.departmentId, label: d.name }))];
          setDepartmentOptions(opts);
        } catch (error) {
          console.error("Error loading departments:", error);
          setDepartmentOptions([{ value: "", label: "All departments" }]);
        }
      })();
    } else {
      setDepartmentOptions([]);
      setFilters((p) => ({ ...p, departmentId: "" }));
    }
  }, [fixedRole]);

  const buildParams = () => {
    const params = {
      search: filters.search || undefined,
      status: filters.status || undefined,
      // Request a large page size as a fallback if backend still paginates
      page: 1,
      pageSize: 100,
    };

    // Handle role filtering
    if (Array.isArray(fixedRole)) {
      // For array roles (head: [2,5], staff: [7,6,3])
      params.roles = fixedRole.join(',');
    } else if (typeof fixedRole === "number") {
      // For single role
      params.role = fixedRole;
    } else if (typeof filters.role === "number") {
      params.role = filters.role;
    }

    // Add student-specific filters
    if (fixedRole === 4) {
      params.semesterId = filters.semesterId || undefined;
      params.levelId = filters.levelId != null ? Number(filters.levelId) : undefined;
    }

    // Add department filter for staff and lecturer
    const shouldFilterByDepartment = 
      (Array.isArray(fixedRole) && (fixedRole.includes(7) || fixedRole.includes(6))) || // Staff roles 7,6
      fixedRole === 3; // Lecturer
    
    if (shouldFilterByDepartment) {
      params.departmentId = filters.departmentId && filters.departmentId !== "" ? filters.departmentId : undefined;
    }

    return params;
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildParams();
      console.log("Fetching users with params:", params);
      console.log("API URL:", "/api/StaffOfAdmin/users");
      console.log("Fixed role:", fixedRole);
      
      const response = await AdminApi.getUsers(params);
      console.log("Raw API response:", response);
      
      // Handle case where API returns empty result on error
      if (!response) {
        console.warn("No response from API");
        setTotal(0);
        setUsers([]);
        return;
      }
      
      const { total, items } = response;
      console.log("Users data received:", { total, items, itemsIsArray: Array.isArray(items) });
      
      if (!items || !Array.isArray(items)) {
        console.error("Invalid response format:", response);
        message.error("Dữ liệu không hợp lệ - format không đúng");
        setTotal(0);
        setUsers([]);
        return;
      }
      
      let normalized = normalize(items);
      // Client-side fallback filter by level for students if backend doesn't apply
      if (fixedRole === 4 && filters.levelId != null) {
        const target = Number(filters.levelId);
        normalized = normalized.filter((u) => Number(u.levelId) === target);
      }
      console.log("Normalized users:", normalized.length);
      
      setTotal((total || normalized.length || 0));
      setUsers(normalized);
      
      if (normalized.length === 0 && total === 0) {
        console.log("No users found for current filters");
      }
    } catch (e) {
      console.error("Error fetching users:", e);
      console.error("Error details:", {
        message: e.message,
        status: e.response?.status,
        data: e.response?.data
      });
      message.error(`Không thể tải dữ liệu người dùng: ${e.message || "Lỗi không xác định"}`);
      setTotal(0);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [filters.search, filters.status, filters.semesterId, filters.levelId, filters.departmentId, fixedRole]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const onChangeFilter = (field, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const toggle = useCallback(async (record, checked) => {
    const newStatus = checked ? "Active" : "Inactive";
    const userName = `${record.firstName} ${record.lastName}`.trim() || record.email;
    
    console.log('Toggle called:', { record, checked, userName });
    
    // Mở modal confirm trước, không update UI ngay
    setConfirmModal({
      open: true,
      record: record,
      checked: checked,
      userName: userName
    });
  }, []);

  const handleConfirmStatusChange = async () => {
    const { record, checked } = confirmModal;
    const newStatus = checked ? "Active" : "Inactive";
    
    try {
      console.log('Calling API to update status:', { userId: record.id, status: checked });
      setLoading(true);
      
      // Sử dụng updateUser thay vì setUserStatus
      const updateData = {
        userId: record.id,
        firstName: record.firstName,
        lastName: record.lastName,
        email: record.email,
        phoneNumber: record.phone,
        gender: record.gender,
        address: record.address,
        dob: record.dob,
        roleId: record.roleId,
        status: newStatus, // Gửi "Active" hoặc "Inactive"
        departmentId: record.departmentId || null
      };
      
      const response = await AdminApi.updateUser(record.id, updateData);
      console.log('API Response:', response);
      
      // Update UI sau khi API thành công
      setUsers((prev) =>
        prev.map((u) => (u.id === record.id ? { ...u, status: checked, statusStr: newStatus } : u))
      );
      
      message.success(`Account has been ${checked ? 'activated' : 'deactivated'} successfully`);
      setConfirmModal({ open: false, record: null, checked: false, userName: "" });
    } catch (error) {
      console.error("Error updating user status:", error);
      message.error("Failed to update account status");
      setConfirmModal({ open: false, record: null, checked: false, userName: "" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelStatusChange = () => {
    console.log('User cancelled status change');
    setConfirmModal({ open: false, record: null, checked: false, userName: "" });
  };

  const columns = useMemo(() => {
    const base = [
      { title: "No.", render: (_, _r, i) => i + 1, width: 72, align: "center" },
    ];

    if (fixedRole === 4) {
      base.push({ title: "Student Code", dataIndex: "studentCode" });
    }

    base.push({ title: "First Name", dataIndex: "firstName" });
    base.push({ title: "Last Name", dataIndex: "lastName" });
    base.push({ title: "Email", dataIndex: "email" });
    base.push({ title: "Phone", dataIndex: "phone" });
    base.push({ title: "Gender", dataIndex: "gender" });
    base.push({ title: "Role", dataIndex: "role" });

    if (fixedRole === 4) {
      base.push({ title: "Level", dataIndex: "levelName" });
    }

    base.push({
      title: "Status",
      key: "status",
      render: (_, r) => (
        fixedRole === 1 ? (
          <span style={{ color: r.status ? "#52c41a" : "#ff4d4f" }}>
            {r.status ? "Active" : "Inactive"}
          </span>
        ) : (
          <Switch
            checkedChildren="Active"
            unCheckedChildren="Inactive"
            checked={r.status}
            onChange={(c) => {
              console.log('Switch clicked:', { userId: r.id, checked: c, currentStatus: r.status });
              toggle(r, c);
            }}
          />
        )
      ),
    });

    if (fixedRole !== 4) {
      base.push({ title: "DOB", dataIndex: "dob" });
    }

    base.push({
      title: "Actions",
      key: "actions",
      align: "right",
      render: (_, r) => (
        <Space>
          <Tooltip title="View profile"><Button size="small" icon={<EyeOutlined />} onClick={() => openView(r)} /></Tooltip>
          {fixedRole !== 1 && (
            <Tooltip title="Edit profile"><Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} /></Tooltip>
          )}
        </Space>
      ),
    });

    return base;
  }, [fixedRole, toggle]);

  const exportCsv = () => {
    const header = ["First Name", "Last Name", "Email", "Phone", "Gender", "Role", "Status", "DOB"];
    const rows = users.map((u) => [u.firstName, u.lastName, u.email, u.phone, u.gender, u.role, u.status ? "Active" : "Inactive", u.dob]);
    const csv = "\uFEFF" + [header, ...rows].map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url; a.download = `users_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <Card bodyStyle={{ padding: 16 }} style={{ borderRadius: 12, boxShadow: "0 6px 18px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <Input
          placeholder="Search name, email, phone, student code…"
          allowClear
          prefix={<SearchOutlined />}
          value={filters.search}
          onChange={(e) => onChangeFilter("search", e.target.value)}
          onPressEnter={fetchUsers}
          style={{ width: 260 }}
        />

        {!fixedRole && (
          <Select
            placeholder="All roles"
            value={filters.role}
            onChange={(v) => onChangeFilter("role", v ?? null)}
            allowClear
            style={{ width: 160 }}
            options={[
              { value: null, label: "All roles" },
              { value: 1, label: "Admin" },
              { value: 2, label: "Manager" },
              { value: 3, label: "Lecturer" },
              { value: 4, label: "Student" },
            ]}
          />
        )}

        <Select
          placeholder="All statuses"
          value={filters.status}
          onChange={(v) => onChangeFilter("status", v ?? null)}
          allowClear
          style={{ width: 160 }}
          options={[
            { value: null, label: "All statuses" },
            { value: "Active", label: "Active" },
            { value: "Inactive", label: "Inactive" },
          ]}
        />

        {fixedRole === 4 && (
          <Select
            placeholder="All semesters"
            value={filters.semesterId}
            onChange={(v) => onChangeFilter("semesterId", v ?? null)}
            allowClear
            style={{ width: 200 }}
            options={semesterOptions}
          />
        )}

        {fixedRole === 4 && (
          <Select
            placeholder="All levels"
            value={filters.levelId}
            onChange={(v) => onChangeFilter("levelId", v ?? null)}
            allowClear
            style={{ width: 200 }}
            options={levelOptions}
          />
        )}

        {(Array.isArray(fixedRole) && (fixedRole.includes(7) || fixedRole.includes(6))) && (
          <Select
            placeholder="All departments"
            value={filters.departmentId}
            onChange={(v) => onChangeFilter("departmentId", v ?? null)}
            allowClear
            style={{ width: 200 }}
            options={departmentOptions}
          />
        )}

        {fixedRole === 3 && (
          <Select
            placeholder="All departments"
            value={filters.departmentId}
            onChange={(v) => onChangeFilter("departmentId", v ?? null)}
            allowClear
            style={{ width: 200 }}
            options={departmentOptions}
          />
        )}

        <Space style={{ marginLeft: "auto" }}>
          <Button icon={<FileExcelOutlined />} onClick={exportCsv}>Export CSV</Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={users}
        loading={loading}
        rowKey="id"
        pagination={false}
      />

      {/* Modal ở giữa màn hình */}
      <UserProfileModal
        open={modal.open}
        mode={modal.mode}
        userId={modal.userId}
        initialUser={modal.initialUser}
        onClose={closeModal}
        onSaved={applyUpdated}
      />

      {/* Modal confirm status change */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: '18px' }} />
            <span>Confirm Status Change</span>
          </div>
        }
        open={confirmModal.open}
        onOk={handleConfirmStatusChange}
        onCancel={handleCancelStatusChange}
        okText="Yes, Change Status"
        cancelText="Cancel"
        centered
        confirmLoading={loading}
        okButtonProps={{
          type: 'primary',
          danger: !confirmModal.checked,
          style: {
            backgroundColor: confirmModal.checked ? '#52c41a' : '#ff4d4f',
            borderColor: confirmModal.checked ? '#52c41a' : '#ff4d4f'
          }
        }}
        cancelButtonProps={{
          style: { borderColor: '#d9d9d9' }
        }}
        width={400}
      >
        <div style={{ padding: '16px 0' }}>
          <p style={{ margin: '0 0 16px 0', fontSize: '16px', lineHeight: '1.5' }}>
            Are you sure you want to <strong style={{ color: confirmModal.checked ? '#52c41a' : '#ff4d4f' }}>
              {confirmModal.checked ? 'activate' : 'deactivate'}
            </strong> the account of <strong>{confirmModal.userName}</strong>?
          </p>
          <div style={{ 
            padding: '12px', 
            backgroundColor: confirmModal.checked ? '#f6ffed' : '#fff2f0', 
            border: `1px solid ${confirmModal.checked ? '#b7eb8f' : '#ffccc7'}`,
            borderRadius: '6px',
            fontSize: '14px',
            color: confirmModal.checked ? '#389e0d' : '#cf1322'
          }}>
            <strong>Current Status:</strong> {confirmModal.checked ? 'Inactive' : 'Active'} → 
            <strong style={{ color: confirmModal.checked ? '#52c41a' : '#ff4d4f' }}>
              {' '}{confirmModal.checked ? 'Active' : 'Inactive'}
            </strong>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
