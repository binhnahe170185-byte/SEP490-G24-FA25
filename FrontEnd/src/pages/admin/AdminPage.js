import React, { useEffect, useState, useMemo } from "react";
import {
  Button, Input, Select, Space, Table, Tooltip, Switch, message,
} from "antd";
import {
  EyeOutlined, PlusOutlined, SearchOutlined, EditOutlined, UploadOutlined, UserOutlined,
} from "@ant-design/icons";

const ROLE_MAP = { 1: "Admin", 2: "Manager", 3: "Lecturer", 4: "Student" };

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    role: "all",
    semester: "all",
    level: "all",
  });
  const [updatingId, setUpdatingId] = useState(null);

  const [semesterOptions, setSemesterOptions] = useState([]);
  const [levelOptions, setLevelOptions] = useState([]);

  // ====== LOAD DATA ======
  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const res = await fetch("http://localhost:5000/api/Admin/users", {
          mode: "cors",
        });
        const bodyText = await res.text();
        console.log("FETCH RAW BODY:", bodyText);
        const list = bodyText ? JSON.parse(bodyText) : [];

        const usersFromDb = list.map((u) => ({
          id: u.userId,
          name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
          email: u.email ?? "-",
          role: ROLE_MAP[u.roleId] ?? `Role #${u.roleId}`,
          phone: u.phoneNumber ?? "",
          semester: u.semesterName ?? "-",
          level: u.levelName ?? "-",
          dob: u.dob ?? "-",
          status: true,
        }));

        setUsers(usersFromDb);

        // Unique filter options
        setSemesterOptions([...new Set(usersFromDb.map((u) => u.semester).filter((s) => s && s !== "-"))]);
        setLevelOptions([...new Set(usersFromDb.map((u) => u.level).filter((s) => s && s !== "-"))]);
      } catch (e) {
        console.error("❌ fetch error", e);
        message.error("Không thể tải dữ liệu người dùng");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ====== FILTER ======
  const searchTerm = filters.search.trim().toLowerCase();

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        !searchTerm ||
        u.name.toLowerCase().includes(searchTerm) ||
        u.email.toLowerCase().includes(searchTerm);

      const matchRole =
        filters.role === "all" ||
        u.role.toLowerCase() === filters.role.toLowerCase();

      const matchSemester =
        filters.semester === "all" || u.semester === filters.semester;

      const matchLevel =
        filters.level === "all" || u.level === filters.level;

      return matchSearch && matchRole && matchSemester && matchLevel;
    });
  }, [users, filters, searchTerm]);

  const handleFilterChange = (field, value) =>
    setFilters((prev) => ({ ...prev, [field]: value }));

  // ====== STATUS & ACTIONS ======
  const handleStatusToggle = (record, checked) => {
    setUpdatingId(record.id);
    setUsers((prev) =>
      prev.map((u) => (u.id === record.id ? { ...u, status: checked } : u))
    );
    message.success(`${record.name} is now ${checked ? "Active" : "Inactive"}`);
    setUpdatingId(null);
  };

  const handleAddUser = () => message.info("Open Add User Form");
  const handleImport = () => message.info("Open Import CSV/Excel Dialog");
  const handleEdit = (r) => message.info(`Edit user: ${r.name}`);
  const handleView = (r) => message.info(`View user: ${r.name}`);

  // ====== TABLE COLUMNS ======
  const columns = [
    { title: "No.", render: (_, __, i) => i + 1, width: 60, align: "center" },
    { title: "Name", dataIndex: "name", key: "name", render: (v) => <strong>{v}</strong> },
    { title: "Email", dataIndex: "email", key: "email" },
    { title: "Role", dataIndex: "role", key: "role" },
    { title: "Semester", dataIndex: "semester", key: "semester" },
    { title: "Level", dataIndex: "level", key: "level" }, // 👈 thêm cột Level
    { title: "Phone", dataIndex: "phone", key: "phone" },
    {
      title: "Status",
      key: "status",
      align: "center",
      render: (_, r) => (
        <Switch
          checkedChildren="Active"
          unCheckedChildren="Inactive"
          checked={r.status}
          onChange={(checked) => handleStatusToggle(r, checked)}
          loading={updatingId === r.id}
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      align: "center",
      render: (_, r) => (
        <Space>
          <Tooltip title="Edit">
            <Button icon={<EditOutlined />} onClick={() => handleEdit(r)} />
          </Tooltip>
          <Tooltip title="View">
            <Button icon={<EyeOutlined />} onClick={() => handleView(r)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // ====== UI ======
  return (
    <>
      {/* NAVBAR */}
      <div style={navbarStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/FJAP.png" alt="FPT Japan Academy" style={{ height: 80 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <UserOutlined style={{ fontSize: 18 }} />
          <span>Welcome Admin!</span>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ padding: "24px 48px" }}>
        <h2 style={{ marginBottom: 16 }}>Manage Users</h2>

        {/* FILTER TOOLBAR */}
        <div style={toolbarStyle}>
          <div style={filterRowStyle}>
            <Input
              placeholder="Search by name or email..."
              prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
              allowClear
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              style={{ width: 260 }}
            />

            <Select
              value={filters.role}
              onChange={(v) => handleFilterChange("role", v)}
              options={[
                { value: "all", label: "All Roles" },
                { value: "Admin", label: "Admin" },
                { value: "Manager", label: "Manager" },
                { value: "Lecturer", label: "Lecturer" },
                { value: "Student", label: "Student" },
              ]}
              style={{ width: 160 }}
            />

            <Select
              value={filters.semester}
              onChange={(v) => handleFilterChange("semester", v)}
              options={[
                { value: "all", label: "All Semesters" },
                ...semesterOptions.map((s) => ({ value: s, label: s })),
              ]}
              style={{ width: 180 }}
            />

            {/* LEVEL FILTER */}
            <Select
              value={filters.level}
              onChange={(v) => handleFilterChange("level", v)}
              options={[
                { value: "all", label: "All Levels" },
                ...levelOptions.map((lv) => ({ value: lv, label: lv })),
              ]}
              style={{ width: 160 }}
            />
          </div>

          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddUser}>
              Add User
            </Button>
            <Button icon={<UploadOutlined />} onClick={handleImport}>
              Import User List
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          loading={loading}
          bordered
          pagination={false}
        />
      </div>
    </>
  );
}

// ====== STYLES ======
const navbarStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor: "white",
  padding: "12px 48px",
  borderBottom: "1px solid #eee",
  position: "sticky",
  top: 0,
  zIndex: 100,
};

const toolbarStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "#f8f5ff",
  border: "1px solid #d6bcfa",
  borderRadius: 12,
  padding: "16px 20px",
  marginBottom: 24,
  flexWrap: "wrap",
  gap: 16,
};

const filterRowStyle = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
};
