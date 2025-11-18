import React, { useEffect, useState } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  message,
  Spin,
  Avatar,
  Typography,
  Row,
  Col,
  Divider,
  Select,
  DatePicker,
} from "antd";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined,
  CalendarOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import ProfileApi from "../../vn.fpt.edu.api/Profile";
import { useAuth } from "../login/AuthContext";

const { Title, Text } = Typography;
const { TextArea } = Input;

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
];

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm();
  const { user, login } = useAuth();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await ProfileApi.getProfile();
      setProfile(data);
      // Set form values for editing
      form.setFieldsValue({
        firstName: data.firstName,
        lastName: data.lastName,
        address: data.address,
        phoneNumber: data.phoneNumber,
        gender: data.gender,
        dob: data.dob ? dayjs(data.dob) : null,
        avatar: data.avatar,
      });
    } catch (error) {
      console.error("Error loading profile:", error);
      message.error("Không thể tải thông tin profile");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form to original values
    if (profile) {
      form.setFieldsValue({
        firstName: profile.firstName,
        lastName: profile.lastName,
        address: profile.address,
        phoneNumber: profile.phoneNumber,
        gender: profile.gender,
        dob: profile.dob ? dayjs(profile.dob) : null,
        avatar: profile.avatar,
      });
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload = {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        address: values.address.trim(),
        phoneNumber: values.phoneNumber.trim(),
        gender: values.gender.trim(),
        dob: values.dob ? values.dob.format("YYYY-MM-DD") : null,
        avatar: values.avatar?.trim() || null,
      };

      const updated = await ProfileApi.updateProfile(payload);
      setProfile(updated);
      setIsEditing(false);
      message.success("Cập nhật profile thành công!");

      // Update auth context if avatar changed
      if (updated.avatar && updated.avatar !== user?.picture) {
        const updatedUser = { ...user, picture: updated.avatar };
        login({ token: user?.token, profile: updatedUser });
      }
    } catch (error) {
      if (error?.errorFields) {
        // Form validation errors
        return;
      }
      console.error("Error updating profile:", error);
      message.error("Cập nhật profile thất bại");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!profile) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: "40px" }}>
          <Text type="secondary">Không tìm thấy thông tin profile</Text>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      <Card>
        <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Title level={2} style={{ margin: 0 }}>
            My Profile
          </Title>
          {!isEditing && (
            <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>
              Edit Profile
            </Button>
          )}
        </div>

        {!isEditing ? (
          // View Mode
          <div>
            {/* Avatar Section */}
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              {profile.avatar ? (
                <Avatar
                  src={profile.avatar}
                  size={120}
                  style={{
                    border: "4px solid #f0f0f0",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                />
              ) : (
                <Avatar
                  size={120}
                  style={{
                    border: "4px solid #f0f0f0",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    fontSize: 48,
                  }}
                  icon={<UserOutlined />}
                >
                  {profile.firstName?.[0]?.toUpperCase() || profile.lastName?.[0]?.toUpperCase() || "U"}
                </Avatar>
              )}
              <div style={{ marginTop: "16px" }}>
                <Title level={3} style={{ margin: 0 }}>
                  {profile.firstName} {profile.lastName}
                </Title>
                <Text type="secondary" style={{ fontSize: "16px" }}>
                  {profile.roleName || "User"}
                </Text>
                {profile.departmentName && (
                  <div style={{ marginTop: "8px" }}>
                    <Text type="secondary">{profile.departmentName}</Text>
                  </div>
                )}
              </div>
            </div>

            <Divider />

            {/* Personal Information */}
            <Title level={4} style={{ marginBottom: "16px", color: "#1890ff" }}>
              Personal Information
            </Title>
            <Row gutter={[24, 16]}>
              <Col xs={24} sm={12}>
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <UserOutlined style={{ fontSize: 18, color: "#8c8c8c", marginRight: "12px", marginTop: "4px" }} />
                  <div style={{ flex: 1 }}>
                    <Text type="secondary" style={{ fontSize: "12px", display: "block", marginBottom: "4px" }}>
                      First Name
                    </Text>
                    <Text strong style={{ fontSize: "16px", display: "block" }}>
                      {profile.firstName || "-"}
                    </Text>
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <UserOutlined style={{ fontSize: 18, color: "#8c8c8c", marginRight: "12px", marginTop: "4px" }} />
                  <div style={{ flex: 1 }}>
                    <Text type="secondary" style={{ fontSize: "12px", display: "block", marginBottom: "4px" }}>
                      Last Name
                    </Text>
                    <Text strong style={{ fontSize: "16px", display: "block" }}>
                      {profile.lastName || "-"}
                    </Text>
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <CalendarOutlined style={{ fontSize: 18, color: "#8c8c8c", marginRight: "12px", marginTop: "4px" }} />
                  <div style={{ flex: 1 }}>
                    <Text type="secondary" style={{ fontSize: "12px", display: "block", marginBottom: "4px" }}>
                      Date of Birth
                    </Text>
                    <Text strong style={{ fontSize: "16px", display: "block" }}>
                      {profile.dob || "-"}
                    </Text>
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <UserOutlined style={{ fontSize: 18, color: "#8c8c8c", marginRight: "12px", marginTop: "4px" }} />
                  <div style={{ flex: 1 }}>
                    <Text type="secondary" style={{ fontSize: "12px", display: "block", marginBottom: "4px" }}>
                      Gender
                    </Text>
                    <Text strong style={{ fontSize: "16px", display: "block" }}>
                      {profile.gender || "-"}
                    </Text>
                  </div>
                </div>
              </Col>
            </Row>

            <Divider />

            {/* Contact Information */}
            <Title level={4} style={{ marginBottom: "16px", color: "#1890ff" }}>
              Contact Information
            </Title>
            <Row gutter={[24, 16]}>
              <Col xs={24} sm={12}>
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <MailOutlined style={{ fontSize: 18, color: "#8c8c8c", marginRight: "12px", marginTop: "4px" }} />
                  <div style={{ flex: 1 }}>
                    <Text type="secondary" style={{ fontSize: "12px", display: "block", marginBottom: "4px" }}>
                      Email
                    </Text>
                    <Text strong style={{ fontSize: "16px", display: "block", wordBreak: "break-word" }}>
                      {profile.email || "-"}
                    </Text>
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <PhoneOutlined style={{ fontSize: 18, color: "#8c8c8c", marginRight: "12px", marginTop: "4px" }} />
                  <div style={{ flex: 1 }}>
                    <Text type="secondary" style={{ fontSize: "12px", display: "block", marginBottom: "4px" }}>
                      Phone Number
                    </Text>
                    <Text strong style={{ fontSize: "16px", display: "block" }}>
                      {profile.phoneNumber || "-"}
                    </Text>
                  </div>
                </div>
              </Col>
              <Col xs={24}>
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <HomeOutlined style={{ fontSize: 18, color: "#8c8c8c", marginRight: "12px", marginTop: "4px" }} />
                  <div style={{ flex: 1 }}>
                    <Text type="secondary" style={{ fontSize: "12px", display: "block", marginBottom: "4px" }}>
                      Address
                    </Text>
                    <Text strong style={{ fontSize: "16px", display: "block" }}>
                      {profile.address || "-"}
                    </Text>
                  </div>
                </div>
              </Col>
            </Row>
          </div>
        ) : (
          // Edit Mode
          <Form form={form} layout="vertical" onFinish={handleSave}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="First Name"
                  name="firstName"
                  rules={[{ required: true, message: "First name is required" }]}
                >
                  <Input prefix={<UserOutlined />} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Last Name"
                  name="lastName"
                  rules={[{ required: true, message: "Last name is required" }]}
                >
                  <Input prefix={<UserOutlined />} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Phone Number"
                  name="phoneNumber"
                  rules={[{ required: true, message: "Phone number is required" }]}
                >
                  <Input prefix={<PhoneOutlined />} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Gender"
                  name="gender"
                  rules={[{ required: true, message: "Gender is required" }]}
                >
                  <Select options={GENDER_OPTIONS} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Date of Birth"
                  name="dob"
                  rules={[{ required: true, message: "Date of birth is required" }]}
                >
                  <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item
                  label="Address"
                  name="address"
                  rules={[{ required: true, message: "Address is required" }]}
                >
                  <TextArea rows={3} prefix={<HomeOutlined />} />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item label="Avatar URL (optional)" name="avatar">
                  <Input placeholder="Enter image URL" />
                </Form.Item>
              </Col>
            </Row>

            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <Button icon={<CloseOutlined />} onClick={handleCancel} disabled={saving}>
                Cancel
              </Button>
              <Button type="primary" icon={<SaveOutlined />} htmlType="submit" loading={saving}>
                Save Changes
              </Button>
            </div>
          </Form>
        )}
      </Card>
    </div>
  );
}

