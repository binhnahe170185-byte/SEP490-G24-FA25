// src/vn.fpt.edu.pages/admin/AddStaff.js
import React, { useState, useEffect } from "react";
import {
  Card, Form, Input, Select, DatePicker, Button, Row, Col, message, Space, Typography, Divider, Alert
} from "antd";
import {
  UserOutlined, MailOutlined, PhoneOutlined, HomeOutlined,
  IdcardOutlined, CalendarOutlined, SaveOutlined, ReloadOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import AdminApi from "../../vn.fpt.edu.api/Admin";

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

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

  // Load departments
  useEffect(() => {
    loadDepartments();
    
    // TEST: Uncomment to verify message system works in this component
    // setTimeout(() => {
    //   message.info("TEST: Message system check - if you see this, messages should work!");
    // }, 2000);
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
      console.log("Loaded departments:", normalizedData);
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
    console.log("handleDepartmentChange called with:", departmentId, typeof departmentId);
    
    // Normalize departmentId to number
    const normalizedDeptId = typeof departmentId === 'string' 
      ? parseInt(departmentId, 10) 
      : departmentId;
    
    // Ensure departmentId is set in form with normalized value
    form.setFieldsValue({ departmentId: normalizedDeptId });
    
    if (staffType === "staff" && normalizedDeptId) {
      const roleId = getRoleIdFromDepartment(normalizedDeptId);
      console.log("Role determined:", roleId);
      if (roleId) {
        form.setFieldsValue({ roleId });
      }
      
      // Trigger validation to clear any errors - use setTimeout to ensure value is set first
      setTimeout(() => {
        form.validateFields(['departmentId']).then(() => {
          console.log("Department validation passed");
        }).catch((err) => {
          console.log("Department validation error:", err);
        });
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
        avatar: null, // Avatar is nullable in backend
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

      // Validate phone number format (if provided)
      if (userData.phoneNumber) {
        const phoneRegex = /^[0-9]{10,11}$/;
        if (!phoneRegex.test(userData.phoneNumber.replace(/[\s-]/g, ""))) {
          message.error("Phone number must have 10-11 digits");
          setLoading(false);
          return;
        }
        // Remove spaces and dashes
        userData.phoneNumber = userData.phoneNumber.replace(/[\s-]/g, "");
      }

      // Call API - same pattern as AddSemester
      const response = await AdminApi.createUser(userData);
      
      // If we reach here, API call succeeded (no exception thrown)
      // Extract userId from response if available
      const userId = response?.data?.userId || response?.userId;
      const roleLabel = getRoleLabel(userData.roleId);
      const successMsg = userId 
        ? `${roleLabel} created successfully! User ID: ${userId}`
        : `${roleLabel} created successfully!`;
      
      // Show success message BEFORE setting loading to false (like AddSemester)
      console.log("About to show success message:", successMsg);
      message.success(successMsg);
      console.log("message.success() called");
      
      // Set loading to false after message
      setLoading(false);
      
      // Reset form after success
      setTimeout(() => {
        form.resetFields();
        setStaffType(null);
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
      console.log("About to show error message:", errorMessage);
      message.error(errorMessage);
      console.log("message.error() called");
      
      // Set loading to false after message
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    setStaffType(null);
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <Card
        style={{
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <Space align="center" style={{ marginBottom: 8 }}>
            <IdcardOutlined style={{ fontSize: 24, color: "#0071c5" }} />
            <Title level={3} style={{ margin: 0 }}>
              Add Staff
            </Title>
          </Space>
          <Text type="secondary">
            Select staff type: Staff (requires department, role auto-set) or Lecturer (no department required). Department heads are assigned separately by admin.
          </Text>
        </div>

        <Divider />

        {/* Form */}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          size="large"
        >
          {/* Staff Type Selection */}
          <Form.Item
            label={<strong>Staff Type</strong>}
            name="staffType"
            rules={[
              { required: true, message: "Please select staff type" }
            ]}
          >
            <Select
              placeholder="Select staff type"
              onChange={handleStaffTypeChange}
              style={{ width: "100%" }}
            >
              {STAFF_TYPE_OPTIONS.map(type => (
                <Option key={type.value} value={type.value}>
                  {type.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Department - Required for Staff, Not shown for Lecturer */}
          {staffType === "staff" && (
            <Form.Item
              label={<strong>Department</strong>}
              name="departmentId"
              rules={[
                { 
                  required: true, 
                  message: "Please select a department"
                },
                {
                  validator: (_, value) => {
                    if (!value && value !== 0) {
                      return Promise.reject(new Error("Please select a department"));
                    }
                    // Convert to number if it's a string
                    const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
                    if (isNaN(numValue)) {
                      return Promise.reject(new Error("Invalid department selected"));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <Select
                placeholder="Select department"
                loading={loadingDepartments}
                onChange={(value) => {
                  console.log("Department selected:", value, typeof value);
                  handleDepartmentChange(value);
                }}
                style={{ width: "100%" }}
                allowClear={false}
                notFoundContent={loadingDepartments ? "Loading..." : "No data"}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.children ?? "").toLowerCase().includes(input.toLowerCase())
                }
              >
                {departments.map(dept => {
                  const deptId = dept.departmentId || dept.id;
                  const deptName = dept.name || dept.departmentName || "";
                  return (
                    <Option key={String(deptId)} value={Number(deptId)}>
                      {deptName}
                    </Option>
                  );
                })}
              </Select>
              <div style={{ marginTop: 4, fontSize: 12, color: "#8c8c8c" }}>
                Role will be automatically set based on department (Academic Staff for Academic Department, Administration Staff for Administration Department)
              </div>
            </Form.Item>
          )}

          {/* Hidden roleId field - auto-set based on department */}
          <Form.Item name="roleId" hidden>
            <Input />
          </Form.Item>

          <Divider style={{ margin: "24px 0" }}>Personal Information</Divider>

          {/* Name Row */}
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={<strong>Last Name</strong>}
                name="lastName"
                rules={[
                  { required: true, message: "Please enter last name" },
                  { min: 2, message: "Last name must be at least 2 characters" }
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="Enter last name"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label={<strong>First Name</strong>}
                name="firstName"
                rules={[
                  { required: true, message: "Please enter first name" },
                  { min: 2, message: "First name must be at least 2 characters" }
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="Enter first name"
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Contact Info Row */}
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={<strong>Email</strong>}
                name="email"
                rules={[
                  { required: true, message: "Please enter email" },
                  { type: "email", message: "Invalid email format" }
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="example@fpt.edu.vn"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label={<strong>Phone Number</strong>}
                name="phoneNumber"
                rules={[
                  {
                    pattern: /^[0-9\s-]{10,11}$/,
                    message: "Phone number must have 10-11 digits"
                  }
                ]}
              >
                <Input
                  prefix={<PhoneOutlined />}
                  placeholder="0123456789"
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Gender and DOB Row */}
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={<strong>Gender</strong>}
                name="gender"
                rules={[
                  { required: true, message: "Please select gender" }
                ]}
              >
                <Select placeholder="Select gender">
                  {GENDER_OPTIONS.map(gender => (
                    <Option key={gender.value} value={gender.value}>
                      {gender.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label={<strong>Date of Birth</strong>}
                name="dob"
                rules={[
                  { required: true, message: "Please select date of birth" }
                ]}
              >
                <DatePicker
                  style={{ width: "100%" }}
                  placeholder="Select date of birth"
                  format="DD/MM/YYYY"
                  disabledDate={(current) => {
                    // Cannot select future dates or dates more than 100 years ago
                    return current && (current > dayjs().endOf("day") || current < dayjs().subtract(100, "years"));
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Address */}
          <Form.Item
            label={<strong>Address</strong>}
            name="address"
          >
            <TextArea
              prefix={<HomeOutlined />}
              placeholder="Enter address (optional)"
              rows={3}
            />
          </Form.Item>

          {/* Info Alert */}
          <Alert
            message="Note"
            description={
              <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                <li>Select "Staff" and choose a department - role will be automatically set (Academic Staff for Academic Department, Administration Staff for Administration Department)</li>
                <li>Select "Lecturer" - no department required, role will be set to Lecturer</li>
                <li>Email and phone number must be unique in the system</li>
                <li>After creation, users can login with email through Google OAuth</li>
                <li>Default status will be "Active"</li>
                <li>Department heads are assigned separately by admin, not through this form</li>
              </ul>
            }
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />

          {/* Submit Buttons */}
          <Form.Item>
            <Space size="middle">
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={loading}
                size="large"
                style={{ minWidth: 120 }}
              >
                Create Staff
              </Button>
              <Button
                htmlType="button"
                onClick={handleReset}
                icon={<ReloadOutlined />}
                size="large"
              >
                Reset
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
