import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Button, Input, Select, Space, Table, Tooltip, message, Switch, Card } from "antd";
import { SearchOutlined, FileExcelOutlined, EyeOutlined, EditOutlined, UserAddOutlined } from "@ant-design/icons";
import AdminApi from "../../vn.fpt.edu.api/Admin";
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
  });

  const [semesterOptions, setSemesterOptions] = useState([]);

  // MODAL hồ sơ (đặt đúng state)
  const [modal, setModal] = useState({ open: false, mode: "view", userId: null, initialUser: null });
  const openView = (record) => setModal({ open: true, mode: "view", userId: record.id, initialUser: record });
  const openEdit = (record) => setModal({ open: true, mode: "edit", userId: record.id, initialUser: record });
  const closeModal = () => setModal((d) => ({ ...d, open: false }));

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
    setFilters({ search: "", role: fixedRole ?? null, status: null, semesterId: null });
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
      setFilters((p) => ({ ...p, semesterId: null }));
    }
  }, [fixedRole]);

  const buildParams = () => ({
    search: filters.search || undefined,
    role: typeof (fixedRole ?? filters.role) === "number" ? (fixedRole ?? filters.role) : undefined,
    status: filters.status || undefined,
    semesterId: fixedRole === 4 ? (filters.semesterId || undefined) : undefined,
    page,
    pageSize,
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { total, items } = await AdminApi.getUsers(buildParams());
      setTotal(total);
      setUsers(normalize(items));
    } catch (e) {
      console.error(e);
      message.error("Không thể tải dữ liệu người dùng");
    } finally {
      setLoading(false);
    }
  }, [filters.search, filters.status, filters.semesterId, fixedRole, page, pageSize]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const onChangeFilter = (field, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const toggle = (record, checked) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === record.id ? { ...u, status: checked, statusStr: checked ? "Active" : "Inactive" } : u))
    );
  };

  const columns = useMemo(
    () => [
      { title: "No.", render: (_, _r, i) => (page - 1) * pageSize + i + 1, width: 72, align: "center" },
      { title: "First Name", dataIndex: "firstName" },
      { title: "Last Name", dataIndex: "lastName" },
      { title: "Email", dataIndex: "email" },
      { title: "Phone", dataIndex: "phone" },
      { title: "Gender", dataIndex: "gender" },
      { title: "Role", dataIndex: "role" },
      {
        title: "Status",
        key: "status",
        render: (_, r) => (
          <Switch checkedChildren="Active" unCheckedChildren="Inactive" checked={r.status} onChange={(c) => toggle(r, c)} />
        ),
      },
      { title: "DOB", dataIndex: "dob" },
      {
        title: "Actions",
        key: "actions",
        align: "right",
        render: (_, r) => (
          <Space>
            <Tooltip title="View profile"><Button size="small" icon={<EyeOutlined />} onClick={() => openView(r)} /></Tooltip>
            <Tooltip title="Edit profile"><Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} /></Tooltip>
          </Space>
        ),
      },
    ],
    [page, pageSize]
  );

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
          placeholder="Search name, email, phone…"
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

        <Space style={{ marginLeft: "auto" }}>
          <Button icon={<FileExcelOutlined />} onClick={exportCsv}>Export CSV</Button>
          <Button type="primary" icon={<UserAddOutlined />}>Add User</Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={users}
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

      {/* Modal ở giữa màn hình */}
      <UserProfileModal
        open={modal.open}
        mode={modal.mode}
        userId={modal.userId}
        initialUser={modal.initialUser}
        onClose={closeModal}
        onSaved={applyUpdated}
      />
    </Card>
  );
}
