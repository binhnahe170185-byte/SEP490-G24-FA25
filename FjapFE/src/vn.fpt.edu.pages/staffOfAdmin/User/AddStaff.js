// src/vn.fpt.edu.pages/admin/AddStaff.js
import React, { useState, useEffect } from "react";
import { Card, Form, Button, Row, Col, message, Space, Typography, Alert, Modal } from "antd";
import {
  IdcardOutlined,
  SaveOutlined,
  ReloadOutlined,
  CheckCircleTwoTone,
  CloseCircleTwoTone,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import AdminApi from "../../../vn.fpt.edu.api/Admin";
import PersonalInfoCard from "./components/PersonalInfoCard";
import AddressCard from "./components/AddressCard";
import AvatarCard from "./components/AvatarCard";
import NotesCard from "./components/NotesCard";

const { Title, Text } = Typography;

const NAME_REGEX = /^[A-Za-zÀ-ỿà-ỹ\s.'-]+$/u;
const PHONE_REGEX = /^(?:\+?84|0)(?:\d){8,9}$/;

// Staff type options - Department selection determines role
const STAFF_TYPE_OPTIONS = [
  { value: "staff", label: "Staff" },
  { value: "lecturer", label: "Lecturer" },
];

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
];

export default function AddStaff() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [staffType, setStaffType] = useState(null); // "staff" or "lecturer"
  const navigate = useNavigate();
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successInfo, setSuccessInfo] = useState({ userId: null, roleLabel: "", departmentName: "" });
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const phoneRule = {
    validator: (_, value) => {
      const normalized = value ? value.replace(/[\s-]/g, "") : "";
      if (!normalized) {
        return Promise.reject(new Error("Enter phone"));
      }
      if (!PHONE_REGEX.test(normalized)) {
        return Promise.reject(new Error("Phone must start with 0 or +84"));
      }
      return Promise.resolve();
    },
  };

  const disabledDob = (current) =>
    current && (current > dayjs().endOf("day") || current < dayjs().subtract(100, "years"));

  // Load departments
  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    setLoadingDepartments(true);
    try {
      const data = await AdminApi.getDepartments();
      const normalizedData = Array.isArray(data) 
        ? data.map(dept => ({
            departmentId: dept.departmentId || dept.id,
            id: dept.departmentId || dept.id,
            name: dept.name || dept.departmentName || "",
            departmentName: dept.name || dept.departmentName || ""
          }))
        : [];
      setDepartments(normalizedData);
    } catch (error) {
      console.error("Failed to load departments:", error);
      message.error("Failed to load departments list");
    } finally {
      setLoadingDepartments(false);
    }
  };

  // Determine role ID based on department name
  // Academic department → role 7 (Academic Staff)
  // Administration department → role 6 (Administration Staff)
  // Lecturer → role 3
  const getRoleIdFromDepartment = (departmentId) => {
    if (!departmentId) return null;
    const department = departments.find(d => 
      (d.departmentId || d.id) === departmentId
    );
    if (!department) return null;
    
    const deptName = (department.name || department.departmentName || "").toLowerCase();
    if (deptName.includes("academic")) {
      return 7; // Academic Staff
    } else if (deptName.includes("administration") || deptName.includes("admin")) {
      return 6; // Administration Staff
    }
    return null;
  };

  // Get role label for display
  const getRoleLabel = (roleId) => {
    const roleMap = {
      7: "Academic Staff",
      6: "Administration Staff",
      3: "Lecturer"
    };
    return roleMap[roleId] || `Role #${roleId}`;
  };

  // Handle staff type change
  const handleStaffTypeChange = (value) => {
    setStaffType(value);
    // Reset department and role when switching types
    form.setFieldsValue({ 
      departmentId: undefined,
      roleId: undefined 
    });
    // Clear validation errors
    form.validateFields(['departmentId']).catch(() => {});
  };

  // Handle department change - auto set role
  const handleDepartmentChange = (departmentId) => {
    // Normalize departmentId to number
    const normalizedDeptId = typeof departmentId === 'string' 
      ? parseInt(departmentId, 10) 
      : departmentId;
    
    // Ensure departmentId is set in form with normalized value
    form.setFieldsValue({ departmentId: normalizedDeptId });
    
    if (staffType === "staff" && normalizedDeptId) {
      const roleId = getRoleIdFromDepartment(normalizedDeptId);
      if (roleId) {
        form.setFieldsValue({ roleId });
      }
      
      // Trigger validation to clear any errors - use setTimeout to ensure value is set first
      setTimeout(() => {
        form.validateFields(['departmentId']).catch(() => {});
      }, 100);
    }
  };

  // Handle form submit
  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // Determine role ID
      let roleId;
      if (values.staffType === "lecturer") {
        roleId = 3; // Lecturer
      } else if (values.staffType === "staff" && values.departmentId) {
        // Get role from department
        roleId = getRoleIdFromDepartment(values.departmentId);
        if (!roleId) {
          message.error("Could not determine role from selected department. Please ensure department name contains 'Academic' or 'Administration'");
          setLoading(false);
          return;
        }
      } else {
        message.error("Please select staff type and department");
        setLoading(false);
        return;
      }

      // Format date - ensure it's a valid date string
      let dob = null;
      if (values.dob) {
        dob = dayjs(values.dob).format("YYYY-MM-DD");
      }
      
      // Validate DOB is not required but if provided should be valid
      if (!dob) {
        message.error("Please select date of birth");
        setLoading(false);
        return;
      }
      
      // Prepare user data - ensure all fields are properly formatted
      // Note: Backend model has Address and PhoneNumber as non-nullable strings
      const userData = {
        firstName: values.firstName?.trim() || "",
        lastName: values.lastName?.trim() || "",
        email: values.email?.trim().toLowerCase() || "",
        phoneNumber: values.phoneNumber?.trim() || "", // Empty string instead of null (backend requires non-null)
        gender: values.gender || "Other",
        dob: dob,
        address: values.address?.trim() || "", // Empty string instead of null (backend requires non-null)
        avatar: null, // Will be set to base64 if avatarFile exists
        roleId: roleId,
        departmentId: values.departmentId ? Number(values.departmentId) : null,
        status: "Active",
      };

      console.log("Submitting user data:", userData);

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        message.error("Invalid email format");
        setLoading(false);
        return;
      }

      // Validate phone number format (required)
      const normalizedPhone = userData.phoneNumber.replace(/[\s-]/g, "");
      if (!PHONE_REGEX.test(normalizedPhone)) {
        message.error("Phone number must start with 0 or +84 and have 10-11 digits");
        setLoading(false);
        return;
      }
      userData.phoneNumber = normalizedPhone;

      // Convert avatar file to base64 if exists (resize to 200x200 first)
      if (avatarFile) {
        try {
          // Resize and convert to base64
          const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const img = new Image();
              img.onload = () => {
                // Create canvas to resize image
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const maxSize = 200;
                
                // Calculate dimensions (crop to square)
                let width = img.width;
                let height = img.height;
                let x = 0;
                let y = 0;
                
                if (width > height) {
                  x = (width - height) / 2;
                  width = height;
                } else {
                  y = (height - width) / 2;
                  height = width;
                }
                
                canvas.width = maxSize;
                canvas.height = maxSize;
                
                // Draw resized image
                ctx.drawImage(img, x, y, width, height, 0, 0, maxSize, maxSize);
                
                // Convert to base64 (use JPEG for smaller size, quality 0.75 to reduce size)
                const base64String = canvas.toDataURL('image/jpeg', 0.75);
                console.log(`Avatar base64 length: ${base64String.length} characters`);
                resolve(base64String);
              };
              img.onerror = reject;
              img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(avatarFile);
          });
          
          userData.avatar = base64;
        } catch (error) {
          console.error("Error converting avatar to base64:", error);
          message.error("Lỗi khi xử lý ảnh avatar");
          setLoading(false);
          return;
        }
      }

      // Call API with JSON (avatar is now base64 string in userData.avatar)
      const response = await AdminApi.createUser(userData);
      
      // If we reach here, API call succeeded (no exception thrown)
      // Extract userId from response if available
      const userId = response?.data?.userId || response?.userId;
      const roleLabel = getRoleLabel(userData.roleId);
      const deptName = departments.find(d => (d.departmentId || d.id) === userData.departmentId)?.name || "";
      setSuccessInfo({ userId, roleLabel, departmentName: deptName });
      setSuccessModalOpen(true);
      
      // Set loading to false after message
      setLoading(false);
      
      // Reset form after success
      setTimeout(() => {
        form.resetFields();
        setStaffType(null);
        setAvatarFile(null);
        setAvatarPreview(null);
      }, 500);
    } catch (error) {
      console.error("Error creating user:", error);
      
      // Extract error message - same pattern as AddSemester but with specific handling
      let errorMessage = "Failed to create user. Please try again.";
      
      if (error?.response?.data) {
        const errorData = error.response.data;
        errorMessage = errorData.message || errorData.error || errorMessage;
        
        // Handle specific error messages
        const errorLower = errorMessage.toLowerCase();
        if (errorLower.includes("email") && (errorLower.includes("exist") || errorLower.includes("already"))) {
          errorMessage = "Email already exists in the system";
        } else if (errorLower.includes("phone") && (errorLower.includes("exist") || errorLower.includes("already"))) {
          errorMessage = "Phone number already exists in the system";
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      // Show error message BEFORE setting loading to false (like AddSemester)
      setErrorText(errorMessage);
      setErrorModalOpen(true);
      
      // Set loading to false after message
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    setStaffType(null);
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  // Handle avatar upload
  const handleAvatarChange = (info) => {
    const file = info.file;
    
    // Validate file type
    const isImage = file.type?.startsWith('image/');
    if (!isImage) {
      message.error('Chỉ chấp nhận file ảnh!');
      return;
    }

    // Validate file size (max 5MB)
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('File size không được vượt quá 5MB!');
      return;
    }

    // Set file and preview
    setAvatarFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarRemove = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  return (
    <div style={{ width: "100%", margin: 0, padding: 0 }}>
      <Card
        style={{
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          width: "100%",
        }}
        bodyStyle={{ padding: 24 }}
      >
        <div style={{ marginBottom: 16 }}>
          <Space align="center">
            <IdcardOutlined style={{ fontSize: 24, color: "#0071c5" }} />
            <Title level={3} style={{ margin: 0 }}>
              Add Staff
            </Title>
          </Space>
          <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
            Staff roles are determined by department. Lecturer does not require department selection.
          </Text>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          size="large"
        >
          <Row gutter={16}>
            <Col xs={24} lg={16}>
              <PersonalInfoCard
                staffTypeOptions={STAFF_TYPE_OPTIONS}
                genderOptions={GENDER_OPTIONS}
                departments={departments}
                loadingDepartments={loadingDepartments}
                staffType={staffType}
                onStaffTypeChange={handleStaffTypeChange}
                onDepartmentChange={handleDepartmentChange}
                nameRegex={NAME_REGEX}
                phoneRule={phoneRule}
                disabledDob={disabledDob}
              />
              <AddressCard />
            </Col>
            <Col xs={24} lg={8}>
              <AvatarCard
                avatarPreview={avatarPreview}
                onAvatarChange={handleAvatarChange}
                onAvatarRemove={handleAvatarRemove}
              />
              <NotesCard />
            </Col>
          </Row>
          <Form.Item style={{ marginTop: 16, marginBottom: 0 }}>
            <Space size="middle" wrap>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={loading}
                style={{ minWidth: 140 }}
              >
                Create Staff
              </Button>
              <Button htmlType="button" onClick={handleReset} icon={<ReloadOutlined />}>
                Reset
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
      <Modal
        open={successModalOpen}
        centered
        title={<span><CheckCircleTwoTone twoToneColor="#52c41a" /> <span style={{ marginLeft: 8 }}>User created successfully</span></span>}
        onOk={() => {
          setSuccessModalOpen(false);
          navigate(staffType === "lecturer" ? "/staffOfAdmin/users/lecturer" : "/staffOfAdmin/users/staff");
        }}
        onCancel={() => {
          setSuccessModalOpen(false);
          form.resetFields();
          setStaffType(null);
        }}
        okText="Back to user list"
        cancelText="Continue adding"
      >
        <div style={{ marginTop: 4, lineHeight: 1.8 }}>
          {successInfo?.roleLabel ? <div>Role: <strong>{successInfo.roleLabel}</strong></div> : null}
          {successInfo?.departmentName ? <div>Department: <strong>{successInfo.departmentName}</strong></div> : null}
          {successInfo?.userId ? <div>User ID: <strong>{successInfo.userId}</strong></div> : null}
        </div>
      </Modal>
      <Modal
        open={errorModalOpen}
        centered
        title={<span><CloseCircleTwoTone twoToneColor="#ff4d4f" /> <span style={{ marginLeft: 8 }}>Failed to create user</span></span>}
        onOk={() => {
          setErrorModalOpen(false);
          navigate("/staffOfAdmin/users/staff");
        }}
        onCancel={() => setErrorModalOpen(false)}
        okText="Back to user list"
        cancelText="Back to form"
      >
        <div style={{ marginTop: 4, lineHeight: 1.8 }}>
          <div style={{ marginBottom: 8 }}>{errorText}</div>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>Please check inputs and try again.</div>
        </div>
      </Modal>
    </div>
  );
}
