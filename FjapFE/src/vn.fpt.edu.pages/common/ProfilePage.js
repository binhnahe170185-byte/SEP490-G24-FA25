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
  Upload,
  Modal,
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
  CameraOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import ProfileApi from "../../vn.fpt.edu.api/Profile";
import { useAuth } from "../login/AuthContext";
import { useNotify } from "../../vn.fpt.edu.common/notifications";

const { Title, Text } = Typography;
const { TextArea } = Input;

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
];

// Format Japanese phone number: 09012345678 -> 090-1234-5678
// Supports both mobile (090, 080, 070) and landline (03, 06, etc.)
const formatJapanesePhone = (value) => {
  if (!value) return value;
  // Remove all non-digit characters
  const phoneNumber = value.replace(/\D/g, "");
  
  if (phoneNumber.length === 0) return "";
  
  // Format: 0X-XXXX-XXXX (10 digits) or 0XX-XXXX-XXXX (11 digits)
  if (phoneNumber.length <= 3) {
    return phoneNumber;
  } else if (phoneNumber.length <= 7) {
    return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3)}`;
  } else if (phoneNumber.length <= 10) {
    return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 7)}-${phoneNumber.slice(7)}`;
  } else {
    // For 11 digits (some landline numbers)
    return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 7)}-${phoneNumber.slice(7, 11)}`;
  }
};

// Validate Japanese phone number format (required check is handled separately)
const validateJapanesePhone = (_, value) => {
  if (!value) {
    // If empty, let the required rule handle it
    return Promise.resolve();
  }
  // Remove dashes for validation
  const phoneNumber = value.replace(/-/g, "");
  // Japanese phone: 0 followed by 9-10 digits
  const japanesePhoneRegex = /^0\d{9,10}$/;
  if (!japanesePhoneRegex.test(phoneNumber)) {
    return Promise.reject(
      new Error("Phone number must be a valid Japanese number (e.g., 090-1234-5678 or 03-1234-5678)")
    );
  }
  return Promise.resolve();
};

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingValues, setPendingValues] = useState(null);
  const [form] = Form.useForm();
  const { user, login } = useAuth();
  const { success: notifySuccess } = useNotify();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await ProfileApi.getProfile();
      setProfile(data);
      // Set form values for editing
      // Format phone number if it exists
      const formattedPhone = data.phoneNumber ? formatJapanesePhone(data.phoneNumber) : "";
      form.setFieldsValue({
        firstName: data.firstName,
        lastName: data.lastName,
        address: data.address,
        phoneNumber: formattedPhone,
        gender: data.gender,
        dob: data.dob ? dayjs(data.dob) : null,
        avatar: data.avatar,
      });
    } catch (error) {
      console.error("Error loading profile:", error);
      message.error("Failed to load profile information");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setAvatarPreview(null);
    // Reset form to original values
    if (profile) {
      // Format phone number when resetting
      const formattedPhone = profile.phoneNumber ? formatJapanesePhone(profile.phoneNumber) : "";
      form.setFieldsValue({
        firstName: profile.firstName,
        lastName: profile.lastName,
        address: profile.address,
        phoneNumber: formattedPhone,
        gender: profile.gender,
        dob: profile.dob ? dayjs(profile.dob) : null,
        avatar: profile.avatar,
      });
    }
  };

  const handleAvatarUpload = async (file) => {
    try {
      setUploadingAvatar(true);
      const response = await ProfileApi.uploadAvatar(file);
      // Response structure: { avatarUrl: string } or { data: { avatarUrl: string } }
      const avatarUrl = response?.avatarUrl || response?.data?.avatarUrl;
      
      if (avatarUrl) {
        form.setFieldsValue({ avatar: avatarUrl });
        setAvatarPreview(avatarUrl);
        message.success("Avatar uploaded successfully!");
      } else {
        message.error("Failed to receive avatar URL from server");
      }
      return false; // Prevent default upload behavior
    } catch (error) {
      console.error("Error uploading avatar:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to upload avatar";
      message.error(errorMessage);
      return false;
    } finally {
      setUploadingAvatar(false);
    }
  };

  const performSave = async (values) => {
    try {
      setSaving(true);

      // Format phone number before saving (remove dashes for storage, or keep formatted)
      // We'll keep the formatted version with dashes as it's more readable
      const phoneNumber = values.phoneNumber.trim();

      const payload = {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        address: values.address.trim(),
        phoneNumber: phoneNumber,
        gender: values.gender.trim(),
        dob: values.dob ? values.dob.format("YYYY-MM-DD") : null,
        avatar: values.avatar?.trim() || null,
      };

      const updated = await ProfileApi.updateProfile(payload);
      setProfile(updated);
      setIsEditing(false);
      setAvatarPreview(null);
      
      notifySuccess(
        "profile-updated",
        "Success",
        "Profile information has been updated successfully!"
      );
      message.success("Profile updated successfully!");

      // Update auth context if avatar changed
      if (updated.avatar && updated.avatar !== user?.picture) {
        const updatedUser = { ...user, picture: updated.avatar };
        login({ token: user?.token, profile: updatedUser });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      message.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      // Store values and show confirmation modal
      setPendingValues(values);
      setShowConfirmModal(true);
    } catch (error) {
      if (error?.errorFields) {
        // Form validation errors
        return;
      }
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
          <Text type="secondary">Profile information not found</Text>
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
                {profile.departmentName && (profile.roleId === 1 || profile.roleId === 4) && (
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
          // Edit Mode - Same layout as View Mode
          <Form form={form} layout="vertical" onFinish={handleSave}>
            {/* Avatar Section */}
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <Form.Item name="avatar" hidden>
                <Input />
              </Form.Item>
              <div style={{ position: "relative", display: "inline-block" }}>
                {avatarPreview || profile.avatar ? (
                  <Avatar
                    src={avatarPreview || profile.avatar}
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
                <Upload
                  beforeUpload={handleAvatarUpload}
                  showUploadList={false}
                  accept="image/*"
                  disabled={uploadingAvatar}
                >
                  <Button
                    type="primary"
                    shape="circle"
                    icon={<CameraOutlined />}
                    size="large"
                    loading={uploadingAvatar}
                    style={{
                      position: "absolute",
                      bottom: 0,
                      right: 0,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    }}
                  />
                </Upload>
              </div>
              <div style={{ marginTop: "16px" }}>
                <Text type="secondary" style={{ fontSize: "14px" }}>
                  Select avatar image (JPG, PNG, max 5MB)
                </Text>
              </div>
            </div>

            <Divider />

            {/* Personal Information */}
            <Title level={4} style={{ marginBottom: "16px", color: "#1890ff" }}>
              Personal Information
            </Title>
            <Row gutter={[24, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="firstName"
                  rules={[{ required: true, message: "First name is required" }]}
                >
                  <Input
                    prefix={<UserOutlined style={{ color: "#8c8c8c" }} />}
                    placeholder="First Name"
                    size="large"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="lastName"
                  rules={[{ required: true, message: "Last name is required" }]}
                >
                  <Input
                    prefix={<UserOutlined style={{ color: "#8c8c8c" }} />}
                    placeholder="Last Name"
                    size="large"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="dob"
                  rules={[{ required: true, message: "Date of birth is required" }]}
                >
                  <DatePicker
                    style={{ width: "100%" }}
                    format="YYYY-MM-DD"
                    placeholder="Date of Birth"
                    size="large"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="gender"
                  rules={[{ required: true, message: "Gender is required" }]}
                >
                  <Select
                    options={GENDER_OPTIONS}
                    placeholder="Gender"
                    size="large"
                  />
                </Form.Item>
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
                    <Text type="secondary" style={{ fontSize: "12px" }}>
                      (Email cannot be changed)
                    </Text>
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="phoneNumber"
                  rules={[
                    { required: true, message: "Phone number is required" },
                    { validator: validateJapanesePhone },
                  ]}
                >
                  <Input
                    prefix={<PhoneOutlined style={{ color: "#8c8c8c" }} />}
                    placeholder="090-1234-5678"
                    size="large"
                    onBlur={(e) => {
                      const formatted = formatJapanesePhone(e.target.value);
                      if (formatted !== e.target.value) {
                        form.setFieldsValue({ phoneNumber: formatted });
                      }
                    }}
                    maxLength={13} // 0XX-XXXX-XXXX
                  />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item
                  name="address"
                  rules={[{ required: true, message: "Address is required" }]}
                >
                  <TextArea
                    rows={3}
                    placeholder="Address"
                    size="large"
                  />
                </Form.Item>
              </Col>
            </Row>

            <div style={{ marginTop: "32px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <Button icon={<CloseOutlined />} onClick={handleCancel} disabled={saving} size="large">
                Cancel
              </Button>
              <Button type="primary" icon={<SaveOutlined />} htmlType="submit" loading={saving} size="large">
                Save Changes
              </Button>
            </div>
          </Form>
        )}
      </Card>

      <Modal
        title="Confirm Save"
        open={showConfirmModal}
        onOk={() => {
          if (pendingValues) {
            performSave(pendingValues);
          }
          setShowConfirmModal(false);
          setPendingValues(null);
        }}
        onCancel={() => {
          setShowConfirmModal(false);
          setPendingValues(null);
        }}
        okText="Save"
        cancelText="Cancel"
        okType="primary"
      >
        <p>Are you sure you want to save the changes to your profile?</p>
      </Modal>
    </div>
  );
}

