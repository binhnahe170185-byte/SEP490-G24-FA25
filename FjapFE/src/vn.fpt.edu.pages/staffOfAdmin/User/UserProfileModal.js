// src/vn.fpt.edu.pages/admin/UserProfileModal.js
import React, { useEffect, useState } from "react";
import {
  Modal, Spin, Form, Input, Select, DatePicker, Button, Space, Row, Col, message, Avatar, Divider, Typography, Tag,
} from "antd";
import { UserOutlined, MailOutlined, PhoneOutlined, HomeOutlined, CalendarOutlined, IdcardOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import AdminApi from "../../../vn.fpt.edu.api/Admin";

const { Text } = Typography;

const ROLE_OPTIONS = [
  { value: 1, label: "Admin" },
  { value: 2, label: "Manager" },
  { value: 3, label: "Lecturer" },
  { value: 4, label: "Student" },
];

const LEVEL_OPTIONS = [
  { value: "N1", label: "N1" },
  { value: "N2", label: "N2" },
  { value: "N3", label: "N3" },
  { value: "N4", label: "N4" },
  { value: "N5", label: "N5" },
];

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
];

export default function UserProfileModal({
  open,
  mode = "view",            // "view" | "edit"
  userId,
  initialUser = null,       // record đã chuẩn hoá từ list
  onClose,
  onSaved,
}) {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(initialUser);
  const [semesters, setSemesters] = useState([]); // [{value,label}]
  const [form] = Form.useForm();

  // ===== Fetch detail + semesters (nếu student) =====
  useEffect(() => {
    let mounted = true;

    const go = async () => {
      if (!open || !userId) return;
      setLoading(true);
      try {
        const u = await AdminApi.getUserById(userId);

        if (!mounted) return;

        // merge để có đủ level/semester info
        const merged = {
          ...initialUser,
          ...u,
          avatar: u?.avatar ?? initialUser?.avatar ?? null, // Ensure avatar is merged
          levelName: u?.levelName ?? initialUser?.levelName ?? null,
          semesterId: u?.semesterId ?? initialUser?.semesterId ?? null,
          semesterName: u?.semesterName ?? initialUser?.semesterName ?? null,
          enrollmentDate: u?.enrollmentDate ?? initialUser?.enrollmentDate ?? null,
        };
        console.log("User data from API:", u);
        console.log("Merged user data:", merged);
        console.log("Avatar value:", merged.avatar);
        setUser(merged);

        // nếu là student thì lấy semesters
        if ((merged.roleId ?? initialUser?.roleId) === 4) {
          try {
            const data = await AdminApi.getEnrollmentSemesters();
            setSemesters(data.map((s) => ({ value: s.semesterId, label: s.name })));
          } catch {
            setSemesters([]);
          }
        } else {
          setSemesters([]);
        }

        // preset form khi edit
        if (mode === "edit") {
          form.setFieldsValue({
            firstName: merged.firstName,
            lastName: merged.lastName,
            email: merged.email,
            phoneNumber: merged.phoneNumber,
            address: merged.address,
            gender: merged.gender,
            roleId: merged.roleId,
            avatar: merged.avatar,
            status: merged.status || "Active",
            dob: merged.dob ? dayjs(merged.dob) : null,
            // student fields
            levelName: merged.levelName ?? null, // "N1".."N5"
            semesterId: merged.semesterId ?? null, // số id; nếu null sẽ map theo name ở hook dưới
            enrollmentDate: merged.enrollmentDate ? dayjs(merged.enrollmentDate) : null,
          });
        }
      } catch (e) {
        console.error(e);
        message.error("Không tải được thông tin người dùng");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    go();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId, mode]);

  // Map semester theo name nếu form chưa có id nhưng đã có name + options
  useEffect(() => {
    if (!open || mode !== "edit") return;
    const currentId = form.getFieldValue("semesterId");
    const byName = (user?.semesterName || "").trim();
    if (!currentId && byName && semesters.length) {
      const match = semesters.find((s) => (s.label || "").trim() === byName);
      if (match) form.setFieldsValue({ semesterId: match.value });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semesters, open, mode, user?.semesterName]);

  const handleSave = async () => {
    try {
      const v = await form.validateFields();
      const payload = {
        userId,
        firstName: v.firstName?.trim(),
        lastName: v.lastName?.trim(),
        email: v.email?.trim(),
        phoneNumber: v.phoneNumber?.trim(),
        address: v.address?.trim(),
        gender: v.gender,
        roleId: v.roleId,
        avatar: v.avatar?.trim() || null,
        status: v.status || "Active",
        dob: v.dob ? v.dob.format("YYYY-MM-DD") : null,
        // student-specific
        levelName: v.levelName ?? null, // "N1".."N5"
        semesterId: v.semesterId ?? null,
        enrollmentDate: v.enrollmentDate ? v.enrollmentDate.format("YYYY-MM-DD") : null,
      };

      setLoading(true);
      const updated = await AdminApi.updateUser(userId, payload);
      message.success("Cập nhật thành công");
      onSaved?.(updated);
      onClose?.();
    } catch (e) {
      if (e?.errorFields) return; // lỗi validate form
      console.error(e);
      message.error("Cập nhật thất bại");
    } finally {
      setLoading(false);
    }
  };

  const roleInForm = Form.useWatch("roleId", form);
  const isStudent = (roleInForm ?? user?.roleId) === 4;
  const title = mode === "edit" ? "Edit Profile" : "User Profile";

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={title}
      centered
      width={900}
      destroyOnClose
      maskClosable
      footer={
        mode === "edit" ? (
          <Space>
            <Button onClick={() => form.resetFields()}>Reset</Button>
            <Button type="primary" onClick={handleSave} loading={loading}>
              Save Changes
            </Button>
          </Space>
        ) : null
      }
      styles={{
        body: { paddingTop: 20, paddingBottom: 20, maxHeight: 700, overflow: "auto" },
      }}
    >
      <Spin spinning={loading}>
        {mode === "view" ? (
          <div>
            {/* Avatar Section - Top Center */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              {user?.avatar && user.avatar.trim() !== "" ? (
                <Avatar
                  src={user.avatar}
                  size={120}
                  style={{ 
                    display: "block",
                    margin: "0 auto 12px",
                    border: "4px solid #f0f0f0",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                  }}
                  onError={() => {
                    console.error("Failed to load avatar image");
                  }}
                />
              ) : (
                <Avatar 
                  size={120} 
                  style={{ 
                    display: "block",
                    margin: "0 auto 12px",
                    border: "4px solid #f0f0f0",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    fontSize: 48
                  }}
                  icon={<UserOutlined />}
                >
                  {user?.firstName?.[0]?.toUpperCase() || user?.lastName?.[0]?.toUpperCase() || "U"}
                </Avatar>
              )}
              <div style={{ marginTop: 8 }}>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {user?.firstName} {user?.lastName}
                </Typography.Title>
                <div style={{ marginTop: 8 }}>
                  <Tag color={user?.status === "Active" ? "success" : "default"} style={{ fontSize: 13, padding: "4px 12px" }}>
                    {user?.status || "Active"}
                  </Tag>
                  <Tag color="blue" style={{ fontSize: 13, padding: "4px 12px", marginLeft: 8 }}>
                    {ROLE_OPTIONS.find((r) => r.value === (user?.roleId ?? 0))?.label || user?.role || "-"}
                  </Tag>
                </div>
              </div>
            </div>

            <Divider style={{ margin: "16px 0" }} />

            {/* Personal Information Section */}
            <Typography.Title level={5} style={{ marginBottom: 12, color: "#1890ff" }}>
              Personal Information
            </Typography.Title>
            <Row gutter={[16, 8]}>
              <Col span={12}>
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <IdcardOutlined style={{ fontSize: 16, color: "#8c8c8c", marginRight: 8, marginTop: 4 }} />
                  <div style={{ flex: 1 }}>
                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 2 }}>First Name</Text>
                    <Text strong style={{ fontSize: 14, display: "block" }}>{user?.firstName || "-"}</Text>
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <IdcardOutlined style={{ fontSize: 16, color: "#8c8c8c", marginRight: 8, marginTop: 4 }} />
                  <div style={{ flex: 1 }}>
                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 2 }}>Last Name</Text>
                    <Text strong style={{ fontSize: 14, display: "block" }}>{user?.lastName || "-"}</Text>
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <CalendarOutlined style={{ fontSize: 16, color: "#8c8c8c", marginRight: 8, marginTop: 4 }} />
                  <div style={{ flex: 1 }}>
                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 2 }}>Date of Birth</Text>
                    <Text strong style={{ fontSize: 14, display: "block" }}>{user?.dob || "-"}</Text>
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <UserOutlined style={{ fontSize: 16, color: "#8c8c8c", marginRight: 8, marginTop: 4 }} />
                  <div style={{ flex: 1 }}>
                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 2 }}>Gender</Text>
                    <Text strong style={{ fontSize: 14, display: "block" }}>{user?.gender || "-"}</Text>
                  </div>
                </div>
              </Col>
            </Row>

            <Divider style={{ margin: "16px 0" }} />

            {/* Contact Information Section */}
            <Typography.Title level={5} style={{ marginBottom: 12, color: "#1890ff" }}>
              Contact Information
            </Typography.Title>
            <Row gutter={[16, 8]}>
              <Col span={12}>
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <MailOutlined style={{ fontSize: 16, color: "#8c8c8c", marginRight: 8, marginTop: 4 }} />
                  <div style={{ flex: 1 }}>
                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 2 }}>Email</Text>
                    <Text strong style={{ fontSize: 14, display: "block", wordBreak: "break-word" }}>{user?.email || "-"}</Text>
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <PhoneOutlined style={{ fontSize: 16, color: "#8c8c8c", marginRight: 8, marginTop: 4 }} />
                  <div style={{ flex: 1 }}>
                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 2 }}>Phone</Text>
                    <Text strong style={{ fontSize: 14, display: "block" }}>{user?.phoneNumber || "-"}</Text>
                  </div>
                </div>
              </Col>
              <Col span={24}>
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <HomeOutlined style={{ fontSize: 16, color: "#8c8c8c", marginRight: 8, marginTop: 4 }} />
                  <div style={{ flex: 1 }}>
                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 2 }}>Address</Text>
                    <Text strong style={{ fontSize: 14, display: "block" }}>{user?.address || "-"}</Text>
                  </div>
                </div>
              </Col>
            </Row>

            {/* Student Information Section (if applicable) - Only show if has data */}
            {(user?.roleId === 4 && (user?.levelName || user?.semesterName || user?.enrollmentDate)) && (
              <>
                <Divider style={{ margin: "16px 0" }} />
                <Typography.Title level={5} style={{ marginBottom: 12, color: "#1890ff" }}>
                  Student Information
                </Typography.Title>
                <Row gutter={[16, 8]}>
                  {user?.levelName && (
                    <Col span={8}>
                      <div style={{ display: "flex", alignItems: "flex-start" }}>
                        <IdcardOutlined style={{ fontSize: 16, color: "#8c8c8c", marginRight: 8, marginTop: 4 }} />
                        <div style={{ flex: 1 }}>
                          <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 2 }}>Level</Text>
                          <Text strong style={{ fontSize: 14, display: "block" }}>{user.levelName}</Text>
                        </div>
                      </div>
                    </Col>
                  )}
                  {user?.semesterName && (
                    <Col span={8}>
                      <div style={{ display: "flex", alignItems: "flex-start" }}>
                        <CalendarOutlined style={{ fontSize: 16, color: "#8c8c8c", marginRight: 8, marginTop: 4 }} />
                        <div style={{ flex: 1 }}>
                          <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 2 }}>Enrollment Semester</Text>
                          <Text strong style={{ fontSize: 14, display: "block" }}>{user.semesterName}</Text>
                        </div>
                      </div>
                    </Col>
                  )}
                  {user?.enrollmentDate && (
                    <Col span={8}>
                      <div style={{ display: "flex", alignItems: "flex-start" }}>
                        <CalendarOutlined style={{ fontSize: 16, color: "#8c8c8c", marginRight: 8, marginTop: 4 }} />
                        <div style={{ flex: 1 }}>
                          <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 2 }}>Enrollment Date</Text>
                          <Text strong style={{ fontSize: 14, display: "block" }}>{user.enrollmentDate}</Text>
                        </div>
                      </div>
                    </Col>
                  )}
                </Row>
              </>
            )}
          </div>
        ) : (
          <Form form={form} layout="vertical">
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item label="First Name" name="firstName" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Last Name" name="lastName" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item label="Email" name="email" rules={[{ required: true, type: "email" }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Phone Number" name="phoneNumber" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item label="Gender" name="gender">
                  <Select options={GENDER_OPTIONS} allowClear />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Date of Birth" name="dob">
                  <DatePicker style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item label="Role" name="roleId" rules={[{ required: true }]}>
                  <Select options={ROLE_OPTIONS} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Status" name="status" initialValue="Active">
                  <Select
                    options={[
                      { value: "Active", label: "Active" },
                      { value: "Inactive", label: "Inactive" },
                    ]}
                  />
                </Form.Item>
              </Col>

              {/* Student-specific */}
              {isStudent && (
                <>
                  <Col span={12}>
                    <Form.Item label="Level" name="levelName">
                      <Select options={LEVEL_OPTIONS} allowClear placeholder="Select level" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Enrollment Semester" name="semesterId">
                      <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        options={semesters}
                        placeholder="Select semester"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Enrollment Date" name="enrollmentDate">
                      <DatePicker style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                </>
              )}

              <Col span={24}>
                <Form.Item label="Address" name="address">
                  <Input />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item label="Avatar URL (optional)" name="avatar">
                  <Input />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        )}
      </Spin>
    </Modal>
  );
}
