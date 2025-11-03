// src/vn.fpt.edu.pages/admin/AddStudent.js
import React, { useState, useEffect } from "react";
import {
  Card, Form, Input, Select, DatePicker, Button, Row, Col, message, Space, Typography, Divider, Alert, Tabs, Upload
} from "antd";
import {
  UserOutlined, MailOutlined, PhoneOutlined, HomeOutlined,
  IdcardOutlined, CalendarOutlined, SaveOutlined, ReloadOutlined,
  UploadOutlined, FileExcelOutlined, BookOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import AdminApi from "../../vn.fpt.edu.api/Admin";
import { api } from "../../vn.fpt.edu.api/http";

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
];

export default function AddStudent() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [levels, setLevels] = useState([]);
  const [semesters, setSemesters] = useState([]); // All semesters with full info
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [activeTab, setActiveTab] = useState("manual");
  const [importLoading, setImportLoading] = useState(false);
  const [currentSemester, setCurrentSemester] = useState(null); // Semester that student will be added to

  // Load levels and semesters
  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    setLoadingOptions(true);
    try {
      // Get levels from classes/options endpoint
      const response = await api.get("/api/staffAcademic/classes/options");
      const data = response?.data?.data || response?.data;
      
      if (data?.levels) {
        const levelOptions = data.levels.map(level => ({
          levelId: level.id || level.levelId,
          id: level.id || level.levelId,
          name: level.name || level.levelName || "",
          levelName: level.name || level.levelName || ""
        }));
        setLevels(levelOptions);
      }
      
      // Get semesters with full info (including startDate, endDate) from Semester API
      try {
        const semResponse = await api.get("/api/Semester?pageSize=100");
        const semData = semResponse?.data?.items || semResponse?.data?.data || [];
        const semesterOptions = semData.map(sem => ({
          semesterId: sem.semesterId || sem.id,
          id: sem.semesterId || sem.id,
          name: sem.name || "",
          semesterCode: sem.semesterCode || "",
          startDate: sem.startDate || "",
          endDate: sem.endDate || "",
        }));
        // Sort by startDate descending (newest first)
        semesterOptions.sort((a, b) => {
          const dateA = dayjs(a.startDate);
          const dateB = dayjs(b.startDate);
          return dateB - dateA;
        });
        setSemesters(semesterOptions);
      } catch (semError) {
        console.error("Failed to load semesters:", semError);
        // Fallback to classes/options if semester API fails
        if (data?.semesters) {
          const semesterOptions = data.semesters.map(sem => ({
            semesterId: sem.id || sem.semesterId,
            id: sem.id || sem.semesterId,
            name: sem.name || "",
            semesterCode: sem.semesterCode || "",
            startDate: sem.startDate || "",
            endDate: sem.endDate || "",
          }));
          setSemesters(semesterOptions);
        }
      }
    } catch (error) {
      console.error("Failed to load options:", error);
      message.error("Failed to load levels and semesters");
    } finally {
      setLoadingOptions(false);
    }
  };

  // Auto-pick enrollment semester based on a date
  const pickEnrollmentSemesterByDate = (date) => {
    if (!date || !semesters?.length) return;
    const sorted = [...semesters]
      .filter(s => !!s.startDate)
      .sort((a, b) => dayjs(a.startDate) - dayjs(b.startDate));
    const next = sorted.find(s => dayjs(s.startDate).isSame(date, 'day') || dayjs(s.startDate).isAfter(date, 'day'))
      || sorted[sorted.length - 1];
    const id = next?.semesterId || next?.id;
    if (id) {
      form.setFieldsValue({ enrollmentSemesterId: Number(id) });
      determineCurrentSemester(Number(id));
      // Also regenerate student code if level is chosen
      const levelId = form.getFieldValue('levelId');
      if (levelId) {
        generateStudentCode(Number(id), levelId);
      }
    }
  };

  // When semesters loaded, default by today's date
  useEffect(() => {
    const initialEnrollDate = dayjs();
    if (semesters?.length) {
      pickEnrollmentSemesterByDate(initialEnrollDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semesters]);

  // Auto-generate student code when both enrollment semester and level are selected
  useEffect(() => {
    const enrollmentSemesterId = form.getFieldValue('enrollmentSemesterId');
    const levelId = form.getFieldValue('levelId');
    if (enrollmentSemesterId && levelId && semesters.length > 0 && levels.length > 0) {
      generateStudentCode(enrollmentSemesterId, levelId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semesters, levels]);

  // Determine current semester based on enrollment semester
  const determineCurrentSemester = (enrollmentSemesterId) => {
    if (!enrollmentSemesterId || !semesters.length) {
      setCurrentSemester(null);
      return;
    }

    const enrollmentSem = semesters.find(s => 
      (s.semesterId || s.id) === Number(enrollmentSemesterId)
    );

    if (!enrollmentSem || !enrollmentSem.startDate) {
      setCurrentSemester(null);
      return;
    }

    const today = dayjs();
    const enrollmentStartDate = dayjs(enrollmentSem.startDate);

    // If today is before enrollment semester start date, use enrollment semester
    if (today.isBefore(enrollmentStartDate, 'day')) {
      setCurrentSemester(enrollmentSem);
      return;
    }

    // If today is on or after enrollment semester start date, find the next semester
    // Sort semesters by startDate ascending to find next one
    const sortedSemesters = [...semesters].sort((a, b) => {
      const dateA = dayjs(a.startDate || "9999-12-31");
      const dateB = dayjs(b.startDate || "9999-12-31");
      return dateA - dateB;
    });

    // Find first semester that starts after enrollment semester start date
    const nextSemester = sortedSemesters.find(sem => {
      if (!sem.startDate) return false;
      const semStartDate = dayjs(sem.startDate);
      return semStartDate.isAfter(enrollmentStartDate, 'day') || semStartDate.isSame(enrollmentStartDate, 'day');
    });

    // If no next semester found, use enrollment semester
    const finalSem = nextSemester || enrollmentSem;
    setCurrentSemester(finalSem);
  };

  // Handle enrollment semester change
  const handleEnrollmentSemesterChange = (value) => {
    form.setFieldsValue({ enrollmentSemesterId: value });
    determineCurrentSemester(value);
    // Auto-generate student code if level is also selected
    const levelId = form.getFieldValue('levelId');
    if (levelId) {
      generateStudentCode(value, levelId);
    }
  };

  // Extract level code from level name (e.g., "N2" from "N2" or "Level N2")
  const extractLevelCode = (levelName) => {
    if (!levelName) return "";
    // Try to find pattern like "N2", "N3", "N4", "N5", "N1", etc.
    const match = levelName.match(/N\d+/i);
    if (match) {
      return match[0].toUpperCase();
    }
    // If no match, try to extract from common patterns
    // Remove "Level" prefix and get the code
    const cleaned = levelName.replace(/^level\s*/i, "").trim();
    return cleaned || "";
  };

  // Get next sequence number from backend API
  const getNextSequenceNumber = async (semesterCode, levelCode) => {
    if (!semesterCode || !levelCode) return 1;
    
    try {
      // Call backend API to get next sequence
      const response = await api.get("/api/Students/next-sequence", {
        params: {
          semesterCode: semesterCode,
          levelCode: levelCode
        }
      });
      
      const sequence = response?.data?.data || response?.data || 1;
      return sequence;
    } catch (error) {
      console.error("Error getting next sequence:", error);
      // Default to 1 if error
      return 1;
    }
  };

  // Generate student code automatically
  const generateStudentCode = async (enrollmentSemesterId, levelId) => {
    if (!enrollmentSemesterId || !levelId || !semesters.length || !levels.length) {
      return;
    }

    const enrollmentSem = semesters.find(s => 
      (s.semesterId || s.id) === Number(enrollmentSemesterId)
    );
    const level = levels.find(l => 
      (l.levelId || l.id) === Number(levelId)
    );

    if (!enrollmentSem || !level) return;

    const semesterCode = enrollmentSem.semesterCode || "";
    const levelCode = extractLevelCode(level.name || level.levelName || "");

    if (!semesterCode || !levelCode) {
      // If no semester code or level code, don't auto-generate
      return;
    }

    // Get next sequence number
    const sequence = await getNextSequenceNumber(semesterCode, levelCode);
    
    // Format: {semesterCode}{levelCode}{sequence} (e.g., SP26N2123)
    const studentCode = `${semesterCode}${levelCode}${sequence.toString().padStart(3, '0')}`;
    
    // Set to form
    form.setFieldsValue({ studentCode });
  };

  // Handle level change
  const handleLevelChange = (value) => {
    form.setFieldsValue({ levelId: value });
    // Auto-generate student code if enrollment semester is also selected
    const enrollmentSemesterId = form.getFieldValue('enrollmentSemesterId');
    if (enrollmentSemesterId) {
      generateStudentCode(enrollmentSemesterId, value);
    }
  };

  // Handle manual form submit
  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // Format date
      let dob = null;
      if (values.dob) {
        dob = dayjs(values.dob).format("YYYY-MM-DD");
      }
      
      if (!dob) {
        message.error("Please select date of birth");
        setLoading(false);
        return;
      }

      // Format enrollment date
      let enrollmentDate = dayjs().format("YYYY-MM-DD");
      if (values.enrollmentDate) {
        enrollmentDate = dayjs(values.enrollmentDate).format("YYYY-MM-DD");
      }

      // Prepare user data
      const userData = {
        firstName: values.firstName?.trim() || "",
        lastName: values.lastName?.trim() || "",
        email: values.email?.trim().toLowerCase() || "",
        phoneNumber: values.phoneNumber?.trim() || "",
        gender: values.gender || "Other",
        dob: dob,
        address: values.address?.trim() || "",
        avatar: null,
        roleId: 4, // Student role
        departmentId: null,
        status: "Active",
      };

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
        userData.phoneNumber = userData.phoneNumber.replace(/[\s-]/g, "");
      }

      // Prepare payload for backend to create both user and student
      const studentPayload = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        gender: userData.gender,
        dob: dayjs(userData.dob).format("YYYY-MM-DD"),
        address: userData.address,
        avatar: userData.avatar,
        levelId: values.levelId ? Number(values.levelId) : null,
        studentCode: values.studentCode?.trim() || null,
      };

      // Validate required student fields
      if (!studentPayload.levelId) {
        message.error("Please select a level");
        setLoading(false);
        return;
      }

      // Determine current semester (the semester student will be added to)
      // Calculate immediately since state update is async
      let targetSemester = null;
      
      if (!values.enrollmentSemesterId || !semesters.length) {
        message.error("Please select enrollment semester");
        setLoading(false);
        return;
      }

      const enrollmentSem = semesters.find(s => 
        (s.semesterId || s.id) === Number(values.enrollmentSemesterId)
      );

      if (!enrollmentSem || !enrollmentSem.startDate) {
        message.error("Invalid enrollment semester selected");
        setLoading(false);
        return;
      }

      const today = dayjs();
      const enrollmentStartDate = dayjs(enrollmentSem.startDate);

      // If today is before enrollment semester start date, use enrollment semester
      if (today.isBefore(enrollmentStartDate, 'day')) {
        targetSemester = enrollmentSem;
      } else {
        // If today is on or after enrollment semester start date, find the next semester
        // Sort semesters by startDate ascending to find next one
        const sortedSemesters = [...semesters].sort((a, b) => {
          const dateA = dayjs(a.startDate || "9999-12-31");
          const dateB = dayjs(b.startDate || "9999-12-31");
          return dateA - dateB;
        });

        // Find first semester that starts after enrollment semester start date
        const nextSemester = sortedSemesters.find(sem => {
          if (!sem.startDate) return false;
          const semStartDate = dayjs(sem.startDate);
          return semStartDate.isAfter(enrollmentStartDate, 'day');
        });

        // If no next semester found, use enrollment semester
        targetSemester = nextSemester || enrollmentSem;
      }

      if (!targetSemester || !targetSemester.semesterId) {
        message.error("Could not determine current semester. Please check enrollment semester selection.");
        setLoading(false);
        return;
      }

      // Backend will compute enrollment date = now and semester; we still compute for code UX
      // Try create user + student backend (single call). Fallback to legacy flow if not supported.
      let studentResponse;
      try {
        studentResponse = await AdminApi.createStudentUser(studentPayload);
      } catch (e) {
        message.error("Backend endpoint /api/StaffOfAdmin/users/student is not available. Please restart backend to enable Student (role=4) creation.");
        setLoading(false);
        return;
      }
      
      const studentId = studentResponse?.data?.studentId || studentResponse?.studentId;
      const userId = studentResponse?.data?.userId || studentResponse?.userId;
      const semesterName = targetSemester?.name || studentResponse?.data?.semesterName || "";
      const successMsg = studentId 
        ? `Student created successfully! Student ID: ${studentId}, User ID: ${userId}. Added to semester: ${semesterName}`
        : `Student created successfully! User ID: ${userId}. Added to semester: ${semesterName}`;
      
      message.success(successMsg);
      
      // Reset form
      setTimeout(() => {
        form.resetFields();
        setCurrentSemester(null);
      }, 500);
    } catch (error) {
      console.error("Error creating student:", error);
      
      let errorMessage = "Failed to create student. Please try again.";
      
      if (error?.response?.data) {
        const errorData = error.response.data;
        errorMessage = errorData.message || errorData.error || errorMessage;
        
        const errorLower = errorMessage.toLowerCase();
        if (errorLower.includes("email") && (errorLower.includes("exist") || errorLower.includes("already"))) {
          errorMessage = "Email already exists in the system";
        } else if (errorLower.includes("phone") && (errorLower.includes("exist") || errorLower.includes("already"))) {
          errorMessage = "Phone number already exists in the system";
        } else if (errorLower.includes("student code") || errorLower.includes("studentcode")) {
          errorMessage = "Student code already exists in the system";
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    setCurrentSemester(null);
  };

  // Handle Excel import
  const handleImport = async (file) => {
    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post("/api/StaffOfAdmin/users/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const result = response?.data?.result || response?.data;
      const inserted = result?.inserted || 0;
      const skipped = result?.skipped || 0;
      const errors = result?.errors || [];

      if (inserted > 0) {
        message.success(`Successfully imported ${inserted} student(s)`);
      }
      if (skipped > 0) {
        message.warning(`${skipped} student(s) were skipped (duplicates or errors)`);
      }
      if (errors.length > 0) {
        console.error("Import errors:", errors);
        message.error(`Import completed with ${errors.length} error(s). Check console for details.`);
      }
    } catch (error) {
      console.error("Import error:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to import students";
      message.error(errorMessage);
    } finally {
      setImportLoading(false);
    }
    return false; // Prevent default upload
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
            <BookOutlined style={{ fontSize: 24, color: "#0071c5" }} />
            <Title level={3} style={{ margin: 0 }}>
              Add Student
            </Title>
          </Space>
          <Text type="secondary">
            Add students manually or import from Excel. Level and enrollment semester are required.
          </Text>
        </div>

        <Divider />

        {/* Tabs for Manual and Import */}
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: "manual",
              label: (
                <span>
                  <UserOutlined /> Manual Add
                </span>
              ),
              children: (
                <>
                  {/* Form */}
                  <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              autoComplete="off"
              size="large"
            >
              <Divider style={{ margin: "16px 0" }}>Personal Information</Divider>

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

              <Divider style={{ margin: "16px 0" }}>Student Information</Divider>

              {/* Student Code, Level Row */}
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={<strong>Student Code</strong>}
                    name="studentCode"
                    rules={[
                      { max: 50, message: "Student code must not exceed 50 characters" }
                    ]}
                    tooltip="Student code will be automatically generated when Level is selected"
                  >
                    <Input
                      prefix={<IdcardOutlined />}
                      placeholder="Auto-generated (e.g., SP26N2123)"
                      readOnly
                      style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={<strong>Level</strong>}
                    name="levelId"
                    rules={[
                      { required: true, message: "Please select a level" }
                    ]}
                  >
                    <Select
                      placeholder="Select level"
                      loading={loadingOptions}
                      style={{ width: "100%" }}
                      showSearch
                      optionFilterProp="children"
                      onChange={handleLevelChange}
                      filterOption={(input, option) =>
                        (option?.children ?? "").toLowerCase().includes(input.toLowerCase())
                      }
                    >
                      {levels.map(level => {
                        const levelId = level.levelId || level.id;
                        const levelName = level.name || level.levelName || "";
                        return (
                          <Option key={String(levelId)} value={Number(levelId)}>
                            {levelName}
                          </Option>
                        );
                      })}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              {/* Hidden field to submit auto-selected enrollment semester id */}
              <Form.Item name="enrollmentSemesterId" hidden rules={[{ required: true }]}> 
                <Input />
              </Form.Item>

              {/* Current Semester Display (auto-selected from enrollment date) */}
              {currentSemester && (
                <Row gutter={16}>
                  <Col xs={24}>
                    <Alert
                      message={
                        <Space>
                          <CalendarOutlined />
                          <span>
                            <strong>Current Semester:</strong> {currentSemester.name || ""}
                            {currentSemester.startDate && (
                              <span style={{ marginLeft: 8, color: "#666" }}>
                                (Starts: {dayjs(currentSemester.startDate).format("DD/MM/YYYY")})
                              </span>
                            )}
                          </span>
                        </Space>
                      }
                      description={`Student will be added to semester ${currentSemester.name || ""}.`}
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                  </Col>
                </Row>
              )}

              {/* Enrollment Date removed: backend uses server time for enrollmentDate */}

              {/* Info Alert */}
              <Alert
                message="Note"
                description={
                  <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                    <li>Level and Enrollment Semester are required for all students</li>
                    <li><strong>Auto Student Code:</strong> System will automatically generate student code when Level is selected. Format: {`{SemesterCode}{LevelCode}{Sequence}`} (e.g., SP26N2123)</li>
                    <li>System will automatically determine current semester based on Enrollment Date:
                      <ul style={{ marginTop: 8, marginBottom: 0 }}>
                        <li>If adding student before Enrollment Semester start date → Student will be added to that Enrollment Semester</li>
                        <li>If adding student on or after Enrollment Semester start date → Student will be added to the next semester</li>
                      </ul>
                    </li>
                    <li>Email and phone number must be unique in the system</li>
                    <li>After creation, students can login with email through Google OAuth</li>
                    <li>Default status will be "Active"</li>
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
                    Create Student
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
                </>
              ),
            },
            {
              key: "import",
              label: (
                <span>
                  <FileExcelOutlined /> Import from Excel
                </span>
              ),
              children: (
                <Card>
              <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <div>
                  <Title level={4}>Import Students from Excel</Title>
                  <Text type="secondary">
                    Upload an Excel file (.xlsx or .xls) to import multiple students at once.
                  </Text>
                </div>

                <Alert
                  message="Excel Format Requirements"
                  description={
                    <div>
                      <p style={{ marginBottom: 8 }}>Your Excel file should have the following columns (in order):</p>
                      <ol style={{ marginLeft: 20, marginBottom: 0 }}>
                        <li>FirstName</li>
                        <li>LastName</li>
                        <li>Address</li>
                        <li>Email (required)</li>
                        <li>Gender (Male/Female/Other)</li>
                        <li>Avatar (optional)</li>
                        <li>Dob (Date of Birth - format: YYYY-MM-DD)</li>
                        <li>PhoneNumber (optional)</li>
                        <li>RoleId (must be 4 for students)</li>
                      </ol>
                      <p style={{ marginTop: 16, marginBottom: 0 }}>
                        <strong>Note:</strong> The first row should be the header row. Students will be created with RoleId = 4.
                        You may need to manually assign levels and semesters after import.
                      </p>
                    </div>
                  }
                  type="warning"
                  showIcon
                />

                <Upload.Dragger
                  name="file"
                  accept=".xlsx,.xls"
                  beforeUpload={handleImport}
                  showUploadList={false}
                  disabled={importLoading}
                >
                  <p className="ant-upload-drag-icon">
                    <UploadOutlined style={{ fontSize: 48, color: "#1890ff" }} />
                  </p>
                  <p className="ant-upload-text">Click or drag file to this area to upload</p>
                  <p className="ant-upload-hint">
                    Support for Excel files (.xlsx, .xls) only
                  </p>
                </Upload.Dragger>

                {importLoading && (
                  <div style={{ textAlign: "center", padding: 20 }}>
                    <Text>Importing students, please wait...</Text>
                  </div>
                )}
              </Space>
                </Card>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

