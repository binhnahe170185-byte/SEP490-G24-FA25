import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Button, Input, Select, Space, Table, Tooltip, message, Switch, Card } from "antd";
import { SearchOutlined, FileExcelOutlined, EyeOutlined, EditOutlined, UserAddOutlined } from "@ant-design/icons";
import AdminApi from "../../vn.fpt.edu.api/Admin";

const ROLE_MAP = { 1: "Admin", 2: "Manager", 3: "Lecturer", 4: "Student" };
const pickRole = (roleId, roleName) => roleName || ROLE_MAP[roleId] || `Role #${roleId}`;
const normalize = (items=[]) => items.map(u => ({
  id: u.userId, firstName: u.firstName ?? "", lastName: u.lastName ?? "",
  email: u.email ?? "", phone: u.phoneNumber ?? "-", gender: u.gender ?? "-",
  roleId: u.roleId, role: pickRole(u.roleId, u.roleName),
  statusStr: u.status || "Active", status: (u.status || "Active")==="Active", dob: u.dob ?? ""
}));

export default function UsersList({ fixedRole, title="View List User" }) {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]); const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState({ search: "", role: fixedRole ?? undefined, status: undefined });

  useEffect(() => { setFilters(p => ({ ...p, role: fixedRole ?? undefined })); setPage(1); }, [fixedRole]);

  const buildParams = () => ({
    search: filters.search || undefined,
    role: typeof (fixedRole ?? filters.role) === "number" ? (fixedRole ?? filters.role) : undefined,
    status: filters.status || undefined, page, pageSize,
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try { const { total, items } = await AdminApi.getUsers(buildParams()); setTotal(total); setUsers(normalize(items)); }
    catch (e) { console.error(e); message.error("Không thể tải dữ liệu người dùng"); }
    finally { setLoading(false); }
  }, [filters.search, filters.status, fixedRole, page, pageSize]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const onChangeFilter = (f,v) => { setPage(1); setFilters(p => ({ ...p, [f]: v })); };
  const toggle = (r, c) => { setUsers(prev => prev.map(u => u.id===r.id?{...u,status:c,statusStr:c?"Active":"Inactive"}:u)); };

  const exportCsv = () => {
    const header = ["First Name","Last Name","Email","Phone","Gender","Role","Status","DOB"];
    const rows = users.map(u => [u.firstName,u.lastName,u.email,u.phone,u.gender,u.role,u.status?"Active":"Inactive",u.dob]);
    const csv = "\uFEFF" + [header,...rows].map(r=>r.map(c=>`"${String(c??"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type:"text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href=url; a.download=`users_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const columns = useMemo(()=>[
    { title:"First Name", dataIndex:"firstName" },
    { title:"Last Name", dataIndex:"lastName" },
    { title:"Email", dataIndex:"email" },
    { title:"Phone", dataIndex:"phone" },
    { title:"Gender", dataIndex:"gender" },
    { title:"Role", dataIndex:"role" },
    { title:"Status", key:"status", render:(_,r)=>(<Switch checkedChildren="Active" unCheckedChildren="Inactive" checked={r.status} onChange={(c)=>toggle(r,c)} />) },
    { title:"DOB", dataIndex:"dob" },
    { title:"Actions", key:"actions", align:"right", render:()=>(<Space><Tooltip title="View"><Button size="small" icon={<EyeOutlined/>}/></Tooltip><Tooltip title="Edit"><Button size="small" icon={<EditOutlined/>}/></Tooltip></Space>) },
  ],[]);

  return (
    <Card bodyStyle={{ padding: 16 }} style={{ borderRadius: 12, boxShadow: "0 6px 18px rgba(0,0,0,0.06)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <h3 style={{ margin:0 }}>{title}</h3>
      </div>
      <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap", marginBottom:16 }}>
        <Input placeholder="Search name, email, phone…" allowClear prefix={<SearchOutlined/>}
               value={filters.search} onChange={e=>onChangeFilter("search", e.target.value)}
               onPressEnter={fetchUsers} style={{ width:260 }}/>
        {!fixedRole && (
          <Select placeholder="All roles" value={filters.role} onChange={v=>onChangeFilter("role",v)}
                  style={{ width:140 }}
                  options={[{value:undefined,label:"All roles"},{value:1,label:"Admin"},{value:2,label:"Manager"},{value:3,label:"Lecturer"},{value:4,label:"Student"}]}/>
        )}
        <Select placeholder="All statuses" value={filters.status} onChange={v=>onChangeFilter("status",v)}
                style={{ width:140 }} options={[{value:undefined,label:"All statuses"},{value:"Active",label:"Active"},{value:"Inactive",label:"Inactive"}]}/>
        <Space style={{ marginLeft:"auto" }}>
          <Button icon={<FileExcelOutlined/>} onClick={exportCsv}>Export CSV</Button>
          <Button type="primary" icon={<UserAddOutlined/>}>Add User</Button>
        </Space>
      </div>
      <Table columns={columns} dataSource={users} loading={loading} rowKey="id"
             pagination={{ current:page, pageSize, total, showSizeChanger:true, onChange:(p,ps)=>{setPage(p);setPageSize(ps);} }}/>
    </Card>
  );
}
