// src/vn.fpt.edu.pages/admin/UserProfileModal.js
import React, { useEffect, useState } from "react";
import {
  Modal, Descriptions, Spin, Form, Input, Select, DatePicker, Button, Space, Row, Col, message,
} from "antd";
import dayjs from "dayjs";
import AdminApi from "../../vn.fpt.edu.api/Admin";

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
          levelName: u?.levelName ?? initialUser?.levelName ?? null,
          semesterId: u?.semesterId ?? initialUser?.semesterId ?? null,
          semesterName: u?.semesterName ?? initialUser?.semesterName ?? null,
          enrollmentDate: u?.enrollmentDate ?? initialUser?.enrollmentDate ?? null,
        };
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
      width={880}
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
        body: { paddingTop: 12, paddingBottom: 12, maxHeight: 600, overflow: "auto" },
      }}
    >
      <Spin spinning={loading}>
        {mode === "view" ? (
          <Descriptions bordered column={2} size="middle">
            <Descriptions.Item label="First Name">{user?.firstName || "-"}</Descriptions.Item>
            <Descriptions.Item label="Last Name">{user?.lastName || "-"}</Descriptions.Item>
            <Descriptions.Item label="Email">{user?.email || "-"}</Descriptions.Item>
            <Descriptions.Item label="Phone">{user?.phoneNumber || "-"}</Descriptions.Item>
            <Descriptions.Item label="Gender">{user?.gender || "-"}</Descriptions.Item>
            <Descriptions.Item label="Role">
              {ROLE_OPTIONS.find((r) => r.value === (user?.roleId ?? 0))?.label || user?.role || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Status">{user?.status || "Active"}</Descriptions.Item>
            <Descriptions.Item label="DOB">{user?.dob || "-"}</Descriptions.Item>
            <Descriptions.Item label="Level">{user?.levelName || "-"}</Descriptions.Item>
            <Descriptions.Item label="Enrollment Semester">{user?.semesterName || "-"}</Descriptions.Item>
            <Descriptions.Item label="Enrollment Date">{user?.enrollmentDate || "-"}</Descriptions.Item>
            <Descriptions.Item label="Address" span={2}>{user?.address || "-"}</Descriptions.Item>
            <Descriptions.Item label="Avatar" span={2}>{user?.avatar || "-"}</Descriptions.Item>
          </Descriptions>
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
