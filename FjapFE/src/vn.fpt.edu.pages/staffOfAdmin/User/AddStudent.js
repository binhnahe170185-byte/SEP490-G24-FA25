// src/vn.fpt.edu.pages/admin/AddStudent.js
import React, { useState, useEffect } from "react";
import {
  Card, Form, Input, Select, DatePicker, Button, Row, Col, message, Space, Typography, Divider, Alert, Tabs, Upload, Modal
} from "antd";
import { useNavigate } from "react-router-dom";
import { CheckCircleTwoTone, CloseCircleTwoTone } from "@ant-design/icons";
import {
  UserOutlined, MailOutlined, PhoneOutlined, HomeOutlined,
  IdcardOutlined, CalendarOutlined, SaveOutlined, ReloadOutlined,
  UploadOutlined, FileExcelOutlined, BookOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import AdminApi from "../../../vn.fpt.edu.api/Admin";
import { api } from "../../../vn.fpt.edu.api/http";
import ImportStudent from "./ImportStudent";

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const NAME_REGEX = /^[A-Za-zÀ-ỿà-ỹ\s.'-]+$/u;
const PHONE_REGEX = /^(?:\+?84|0)(?:\d){8,9}$/;

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
];

export default function AddStudent() {
  const [form] = Form.useForm();
  const [msg, msgCtx] = message.useMessage();
  const navigate = useNavigate();
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successInfo, setSuccessInfo] = useState({ userId: null, studentId: null, studentCode: "", semesterName: "" });
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [loading, setLoading] = useState(false);
  const [levels, setLevels] = useState([]);
  const [semesters, setSemesters] = useState([]); // All semesters with full info
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [activeTab, setActiveTab] = useState("manual");
  const [currentSemester, setCurrentSemester] = useState(null); // Semester that student will be added to

  // Phone validation rule (same as AddStaff)
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
      msg.error("Failed to load levels and semesters");
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
        Modal.warning({
          title: "Missing date of birth",
          centered: true,
          content: "Please select date of birth before creating a student."
        });
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
        Modal.warning({
          title: "Invalid email",
          centered: true,
          content: "Please enter a valid email address (e.g., name@example.com)."
        });
        setLoading(false);
        return;
      }

      // Validate phone number format (required)
      const normalizedPhone = userData.phoneNumber.replace(/[\s-]/g, "");
      if (!normalizedPhone) {
        Modal.warning({
          title: "Phone number is required",
          centered: true,
          content: "Please enter a phone number."
        });
        setLoading(false);
        return;
      }
      if (!PHONE_REGEX.test(normalizedPhone)) {
        Modal.warning({
          title: "Invalid phone number",
          centered: true,
          content: "Phone number must start with 0 or +84 and have 10-11 digits."
        });
        setLoading(false);
        return;
      }
      userData.phoneNumber = normalizedPhone;

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
        Modal.warning({
          title: "Level is required",
          centered: true,
          content: "Please select a level for the student."
        });
        setLoading(false);
        return;
      }

      // Determine current semester (the semester student will be added to)
      // Calculate immediately since state update is async
      let targetSemester = null;
      
      if (!values.enrollmentSemesterId || !semesters.length) {
        Modal.warning({
          title: "Enrollment semester is required",
          centered: true,
          content: "Please wait for semesters to load or pick an enrollment semester."
        });
        setLoading(false);
        return;
      }

      const enrollmentSem = semesters.find(s => 
        (s.semesterId || s.id) === Number(values.enrollmentSemesterId)
      );

      if (!enrollmentSem || !enrollmentSem.startDate) {
        Modal.warning({
          title: "Invalid enrollment semester",
          centered: true,
          content: "Please re-select a valid enrollment semester."
        });
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
        Modal.warning({
          title: "Cannot determine semester",
          centered: true,
          content: "Please check enrollment semester selection and try again."
        });
        setLoading(false);
        return;
      }

      // Backend will compute enrollment date = now and semester; we still compute for code UX
      // Try create user + student backend (single call). Fallback to legacy flow if not supported.
      let studentResponse;
      try {
        studentResponse = await AdminApi.createStudentUser(studentPayload);
      } catch (e) {
        const backendMsg = e?.response?.data?.message || e?.message || "Backend endpoint is not available.";
        setErrorText(backendMsg);
        setErrorModalOpen(true);
        setLoading(false);
        return;
      }
      
      const studentId = studentResponse?.data?.studentId || studentResponse?.studentId;
      const userId = studentResponse?.data?.userId || studentResponse?.userId;
      const studentCode = studentResponse?.data?.studentCode || form.getFieldValue('studentCode');
      const semesterName = targetSemester?.name || studentResponse?.data?.semesterName || "";

      setSuccessInfo({ userId, studentId, studentCode: studentCode || "", semesterName: semesterName || "" });
      setSuccessModalOpen(true);
      
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
      
      setErrorText(errorMessage || "Failed to create student. Please try again.");
      setErrorModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Show popup when antd form validation fails before submit
  const handleFinishFailed = (info) => {
    try {
      const firstErr = info?.errorFields?.[0];
      const errMsg = firstErr?.errors?.[0] || "Please fix the highlighted fields and try again.";
      Modal.warning({
        title: "Validation error",
        centered: true,
        content: errMsg,
      });
    } catch {
      Modal.warning({ title: "Validation error", centered: true, content: "Please check the form and try again." });
    }
  };

  const handleReset = () => {
    form.resetFields();
    setCurrentSemester(null);
  };

  return (
    <div style={{ width: "100%", margin: "0", padding: "0" }}>
      {msgCtx}
      <Card
        style={{
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          width: "100%",
        }}
        bodyStyle={{ padding: "20px 0" }}
      >
        {/* Header */}
        <div style={{ marginBottom: 24, padding: "0 8px" }}>
          <Space align="center" style={{ marginBottom: 8 }}>
            <BookOutlined style={{ fontSize: 24, color: "#0071c5" }} />
            <Title level={3} style={{ margin: 0 }}>
              Add Student
            </Title>
          </Space>
        </div>

        <Divider style={{ margin: "16px 0" }} />

        {/* Description */}
        <div style={{ padding: "0 8px", marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Add students manually or import from Excel. Level and enrollment semester are required.
          </Text>
        </div>

        {/* Tabs for Manual and Import */}
        <div style={{ padding: "0 8px" }}>
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
                <div style={{ padding: "0 8px" }}>
                  {/* Form */}
                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    onFinishFailed={handleFinishFailed}
                    autoComplete="off"
                    size="middle"
                    scrollToFirstError
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
                            { min: 2, message: "Last name must be at least 2 characters" },
                            { pattern: NAME_REGEX, message: "Only letters allowed" }
                          ]}
                          style={{ marginBottom: 16 }}
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
                            { min: 2, message: "First name must be at least 2 characters" },
                            { pattern: NAME_REGEX, message: "Only letters allowed" }
                          ]}
                          style={{ marginBottom: 16 }}
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
                          style={{ marginBottom: 16 }}
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
                          rules={[phoneRule]}
                          style={{ marginBottom: 16 }}
                        >
                          <Input
                            prefix={<PhoneOutlined />}
                            placeholder="0xxxxxxxxx"
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
                          style={{ marginBottom: 16 }}
                        >
                          <Select placeholder="Select gender" style={{ width: "100%" }}>
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
                          style={{ marginBottom: 16 }}
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
                      style={{ marginBottom: 16 }}
                    >
                      <TextArea
                        prefix={<HomeOutlined />}
                        placeholder="Enter address (optional)"
                        rows={2}
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
                          style={{ marginBottom: 16 }}
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
                          style={{ marginBottom: 16 }}
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
                  <ul style={{ marginBottom: 0, paddingLeft: 20, fontSize: 13 }}>
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
                style={{ marginBottom: 24, fontSize: 13 }}
              />

                    {/* Submit Buttons */}
                    <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
                      <Space size="middle">
                        <Button
                          type="primary"
                          htmlType="submit"
                          icon={<SaveOutlined />}
                          loading={loading}
                          size="middle"
                          style={{ minWidth: 120 }}
                        >
                          Create Student
                        </Button>
                        <Button
                          htmlType="button"
                          onClick={handleReset}
                          icon={<ReloadOutlined />}
                          size="middle"
                        >
                          Reset
                        </Button>
                      </Space>
                    </Form.Item>
            </Form>
                </div>
              ),
            },
            {
              key: "import",
              label: (
                <span>
                  <FileExcelOutlined /> Import from Excel
                </span>
              ),
              children: <ImportStudent key="import-student-tab" />,
            },
          ]}
          />
        </div>
      </Card>
      <Modal
        open={successModalOpen}
        centered
        title={<span><CheckCircleTwoTone twoToneColor="#52c41a" /> <span style={{ marginLeft: 8 }}>Student created successfully</span></span>}
        onOk={() => {
          setSuccessModalOpen(false);
          navigate("/staffOfAdmin/users/student");
        }}
        onCancel={() => {
          setSuccessModalOpen(false);
          form.resetFields();
          // Re-initialize auto semester and clear student code so next select level will regenerate
          setTimeout(() => {
            pickEnrollmentSemesterByDate(dayjs());
            form.setFieldsValue({ studentCode: "" });
          }, 0);
        }}
        okText="Back to student list"
        cancelText="Continue adding"
      >
        <div style={{ marginTop: 4, lineHeight: 1.8 }}>
          {successInfo?.studentCode ? <div>Student Code: <strong>{successInfo.studentCode}</strong></div> : null}
          {successInfo?.semesterName ? <div>Semester: <strong>{successInfo.semesterName}</strong></div> : null}
          {successInfo?.userId ? <div>User ID: <strong>{successInfo.userId}</strong></div> : null}
          {successInfo?.studentId ? <div>Student ID: <strong>{successInfo.studentId}</strong></div> : null}
        </div>
      </Modal>
      <Modal
        open={errorModalOpen}
        centered
        title={<span><CloseCircleTwoTone twoToneColor="#ff4d4f" /> <span style={{ marginLeft: 8 }}>Failed to create student</span></span>}
        onOk={() => {
          setErrorModalOpen(false);
          navigate("/staffOfAdmin/users/student");
        }}
        onCancel={() => {
          setErrorModalOpen(false);
        }}
        okText="Back to student list"
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

