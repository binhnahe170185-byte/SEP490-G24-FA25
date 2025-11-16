import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Form, Input, Space, Popconfirm, message, Typography, Card } from "antd";
import AdminApi from "../../vn.fpt.edu.api/Admin";

const { Title, Text } = Typography;

export default function ManageRoles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const res = await AdminApi.getRoles();
      setRoles(Array.isArray(res) ? res : res?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const onEdit = (role) => {
    setEditing(role);
    form.setFieldsValue({ roleName: role.roleName });
    setOpen(true);
  };

  const onSubmit = async () => {
    const { roleName } = await form.validateFields();
    try {
      if (editing) {
        await AdminApi.updateRole(editing.roleId, roleName.trim());
        message.success("Role updated");
      } else {
        await AdminApi.createRole(roleName.trim());
        message.success("Role created");
      }
      setOpen(false);
      await load();
    } catch {
      message.error("Action failed");
    }
  };

  const onDelete = async (roleId) => {
    try {
      await AdminApi.deleteRole(roleId);
      message.success("Role deleted");
      await load();
    } catch (e) {
      message.error(e?.response?.data?.message || "Delete failed");
    }
  };

  const columns = [
    { title: "ID", dataIndex: "roleId", key: "roleId", width: 80 },
    { title: "Role Name", dataIndex: "roleName", key: "roleName" },
    {
      title: "Actions",
      key: "actions",
      width: 220,
      render: (_, record) => (
        <Space>
          <Button onClick={() => onEdit(record)}>Edit</Button>
          <Popconfirm title="Delete this role?" onConfirm={() => onDelete(record.roleId)}>
            <Button danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 6, height: 22, borderRadius: 2, background: "#ff6600" }} />
        <Title level={4} style={{ margin: 0 }}>Manage Roles & Permissions</Title>
      </div>
      <Text style={{ display: "block", marginBottom: 16, color: "#64748b" }}>
        Create, update, or delete roles. Ensure roles are not assigned to users before deleting.
      </Text>

      <Card style={{ borderRadius: 12, boxShadow: "0 6px 14px rgba(15,23,42,0.06)" }}>
        <Space style={{ marginBottom: 16 }}>
          <Button type="primary" onClick={onCreate}>Create Role</Button>
          <Button onClick={load} loading={loading}>Refresh</Button>
        </Space>

        <Table rowKey="roleId" dataSource={roles} columns={columns} loading={loading} />
      </Card>

      <Modal
        title={editing ? "Edit Role" : "Create Role"}
        open={open}
        onOk={onSubmit}
        onCancel={() => setOpen(false)}
        okText={editing ? "Save" : "Create"}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Role Name"
            name="roleName"
            rules={[{ required: true, message: "Role name is required" }]}
          >
            <Input placeholder="e.g., Admin" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}


