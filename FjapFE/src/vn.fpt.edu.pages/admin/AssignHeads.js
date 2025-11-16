import React, { useEffect, useState } from "react";
import { Card, Row, Col, Button, message, Typography, Space, Modal, Select, notification } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import AdminApi from "../../vn.fpt.edu.api/Admin";
import Admin from "../../vn.fpt.edu.api/Admin";

const { Title, Text } = Typography;

export default function AssignHeads() {
  const [adminHeadId, setAdminHeadId] = useState();
  const [academicHeadId, setAcademicHeadId] = useState();
  const [loading, setLoading] = useState(false);
  const [currentAdminHead, setCurrentAdminHead] = useState(null);
  const [currentAcademicHead, setCurrentAcademicHead] = useState(null);
  const [adminOptions, setAdminOptions] = useState([]);
  const [academicOptions, setAcademicOptions] = useState([]);

  // Load current heads (roleId: 2 admin head, 5 academic head)
  useEffect(() => {
    const load = async () => {
      try {
        const [adminRes, acaRes] = await Promise.all([
          Admin.getUsers({ role: 2 }),
          Admin.getUsers({ role: 5 }),
        ]);
        setCurrentAdminHead((adminRes.items || [])[0] || null);
        setCurrentAcademicHead((acaRes.items || [])[0] || null);
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  const toName = (u) => {
    const first = u.FirstName ?? u.firstName ?? "";
    const last = u.LastName ?? u.lastName ?? "";
    const email = u.Email ?? u.email ?? "";
    return { name: `${first} ${last}`.trim(), email, id: u.UserId ?? u.userId };
  };

  // remote search helpers
  // roleFilter: { roleId: number, departmentId?: number }
  const searchUsers = async (query, setter, roleFilter) => {
    try {
      const params = { search: query, pageSize: 20 };
      if (roleFilter?.roleId) params.role = roleFilter.roleId;
      if (roleFilter?.departmentId) params.departmentId = roleFilter.departmentId;
      const res = await Admin.getUsers(params);
      const items = res.items || [];
      const mapped = items.map((u) => {
        const { name, email, id } = toName(u);
        const role = u.RoleName ?? u.roleName ?? "";
        return {
          label: `#${id} ${name} — ${email} ${role ? `(${role})` : ""}`,
          value: id,
        };
      });
      setter(mapped);
    } catch {
      setter([]);
    }
  };

  const getOptionLabel = (value, options) => {
    const found = (options || []).find((o) => o.value === value);
    return found?.label || `#${value}`;
  };

  // Explicit modals (stable across versions)
  const [adminConfirmOpen, setAdminConfirmOpen] = useState(false);
  const [adminConfirmText, setAdminConfirmText] = useState({ selected: "", current: "" });
  const [academicConfirmOpen, setAcademicConfirmOpen] = useState(false);
  const [academicConfirmText, setAcademicConfirmText] = useState({ selected: "", current: "" });

  const assignAdmin = async () => {
    if (!adminHeadId) return message.warning("Please select a user for Head of Administration");
    const newLabel = getOptionLabel(adminHeadId, adminOptions);
    const cur = currentAdminHead ? `#${toName(currentAdminHead).id} - ${toName(currentAdminHead).name}` : "";
    setAdminConfirmText({ selected: newLabel, current: cur });
    setAdminConfirmOpen(true);
  };

  const confirmAssignAdmin = async () => {
    setAdminConfirmOpen(false);
    try {
      const assignRes = await AdminApi.assignHeadAdmin(Number(adminHeadId));
      notification.success({
        message: "Assigned Head of Administration",
        description: assignRes?.message || `New head assigned successfully.`,
      });
      const headRes = await Admin.getUsers({ role: 2 });
      setCurrentAdminHead((headRes.items || [])[0] || null);
      setAdminHeadId(undefined);
    } catch (e) {
      message.error(e?.message || "Failed to assign Head of Administration");
    } finally {
      setLoading(false);
    }
  };

  const assignAcademic = async () => {
    if (!academicHeadId) return message.warning("Please select a user for Head of Academic");
    const newLabel = getOptionLabel(academicHeadId, academicOptions);
    const cur = currentAcademicHead ? `#${toName(currentAcademicHead).id} - ${toName(currentAcademicHead).name}` : "";
    setAcademicConfirmText({ selected: newLabel, current: cur });
    setAcademicConfirmOpen(true);
  };

  const confirmAssignAcademic = async () => {
    setAcademicConfirmOpen(false);
    try {
      const assignRes = await AdminApi.assignHeadAcademic(Number(academicHeadId));
      notification.success({
        message: "Assigned Head of Academic",
        description: assignRes?.message || `New head assigned successfully.`,
      });
      const headRes = await Admin.getUsers({ role: 5 });
      setCurrentAcademicHead((headRes.items || [])[0] || null);
      setAcademicHeadId(undefined);
    } catch (e) {
      message.error(e?.message || "Failed to assign Head of Academic");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 6, height: 22, borderRadius: 2, background: "#ff6600" }} />
        <Title level={4} style={{ margin: 0 }}>Assign Heads</Title>
      </div>
      <Text style={{ display: "block", marginBottom: 16, color: "#64748b" }}>
        Allows Admin to appoint or remove Heads for Administration and Academic departments.
      </Text>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card
            title="Assign Head of Administration"
            style={{ borderRadius: 12, boxShadow: "0 6px 14px rgba(15,23,42,0.06)" }}
          >
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <div>
              <Text type="secondary">Current Head:</Text>{" "}
              {currentAdminHead ? (
                <b>#{toName(currentAdminHead).id} - {toName(currentAdminHead).name}</b>
              ) : (
                <Text type="secondary">None</Text>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span>Search:</span>
              <Select
                showSearch
                placeholder="Search name or email..."
                value={adminHeadId}
                onChange={setAdminHeadId}
                onSearch={(q) => 
                  // Only Administration_Staff (role 6) within Administration department (id=1)
                  searchUsers(q, setAdminOptions, { roleId: 6, departmentId: 1 })
                }
                filterOption={false}
                options={adminOptions}
                style={{ minWidth: 320 }}
              />
              <Button type="primary" onClick={assignAdmin} loading={loading} disabled={!adminHeadId}>
                Assign
              </Button>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Business rule: The current Head of Administration will be demoted to Staff of Admin (role 6).
            </Text>
          </Space>
        </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            title="Assign Head of Academic Department"
            style={{ borderRadius: 12, boxShadow: "0 6px 14px rgba(15,23,42,0.06)" }}
          >
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <div>
              <Text type="secondary">Current Head:</Text>{" "}
              {currentAcademicHead ? (
                <b>#{toName(currentAcademicHead).id} - {toName(currentAcademicHead).name}</b>
              ) : (
                <Text type="secondary">None</Text>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span>Search:</span>
              <Select
                showSearch
                placeholder="Search name or email..."
                value={academicHeadId}
                onChange={setAcademicHeadId}
                onSearch={(q) =>
                  // Only Academic_Staff (role 7) within Academic department (id=2)
                  searchUsers(q, setAcademicOptions, { roleId: 7, departmentId: 2 })
                }
                filterOption={false}
                options={academicOptions}
                style={{ minWidth: 320 }}
              />
              <Button type="primary" onClick={assignAcademic} loading={loading} disabled={!academicHeadId}>
                Assign
              </Button>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Business rule: The current Head of Academic will be demoted to Staff Academic (role 7).
            </Text>
          </Space>
        </Card>
        </Col>
      </Row>

      {/* Admin confirmation modal */}
      <Modal
        open={adminConfirmOpen}
        onOk={confirmAssignAdmin}
        onCancel={() => setAdminConfirmOpen(false)}
        okText="Confirm"
        cancelText="Cancel"
        title={<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ExclamationCircleOutlined style={{ color: "#F36F21" }} />
          <span>Confirm assign Head of Administration</span>
        </div>}
      >
        <div style={{ lineHeight: 1.6 }}>
          <div>New head: <b>{adminConfirmText.selected}</b></div>
          {adminConfirmText.current && <div style={{ marginTop: 6 }}>Current head: <b>{adminConfirmText.current}</b></div>}
          <div style={{ marginTop: 10, padding: "10px 12px", background: "#FFF7F0", borderRadius: 8, color: "#8a4b15" }}>
            The current Head of Administration will be demoted to Staff of Admin (role 6).
          </div>
        </div>
      </Modal>

      {/* Academic confirmation modal */}
      <Modal
        open={academicConfirmOpen}
        onOk={confirmAssignAcademic}
        onCancel={() => setAcademicConfirmOpen(false)}
        okText="Confirm"
        cancelText="Cancel"
        title={<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ExclamationCircleOutlined style={{ color: "#F36F21" }} />
          <span>Confirm assign Head of Academic</span>
        </div>}
      >
        <div style={{ lineHeight: 1.6 }}>
          <div>New head: <b>{academicConfirmText.selected}</b></div>
          {academicConfirmText.current && <div style={{ marginTop: 6 }}>Current head: <b>{academicConfirmText.current}</b></div>}
          <div style={{ marginTop: 10, padding: "10px 12px", background: "#FFF7F0", borderRadius: 8, color: "#8a4b15" }}>
            The current Head of Academic will be demoted to Staff Academic (role 7).
          </div>
        </div>
      </Modal>
    </div>
  );
}


