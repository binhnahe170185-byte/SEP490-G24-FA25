// src/vn.fpt.edu.pages/admin/ImportStudent.js
import React, { useState, useEffect } from "react";
import {
  Card, Form, Select, Button, Row, Col, message, Space, Typography, Divider, 
  Alert, Upload, Table, Tag, Modal, Progress, Input, Tooltip
} from "antd";
import {
  FileExcelOutlined, UploadOutlined, DownloadOutlined, 
  CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined, CalendarOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import AdminApi from "../../../vn.fpt.edu.api/Admin";
import { api } from "../../../vn.fpt.edu.api/http";

const { Title, Text } = Typography;
const { Option } = Select;

export default function ImportStudent() {
  console.log("=== ImportStudent component loaded ===");
  const [form] = Form.useForm();
  const [msg, msgCtx] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [levels, setLevels] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [selectedLevelFilter, setSelectedLevelFilter] = useState(null); // Filter by level in preview
  
  // Watch form values to enable/disable upload reactively
  const levelId = Form.useWatch("levelId", form);

  // Auto-pick enrollment semester based on a date (like AddStudent.js)
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
    }
  };

  // Load levels and semesters
  useEffect(() => {
    loadOptions();
  }, []);

  // When semesters loaded, auto-select by today's date
  useEffect(() => {
    const initialEnrollDate = dayjs();
    if (semesters?.length) {
      pickEnrollmentSemesterByDate(initialEnrollDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semesters]);

  const loadOptions = async () => {
    setLoadingOptions(true);
    try {
      // Get levels
      const levelResponse = await api.get("/api/staffAcademic/classes/options");
      const levelData = levelResponse?.data?.data || levelResponse?.data;
      if (levelData?.levels) {
        const levelOptions = levelData.levels.map(level => ({
          levelId: level.id || level.levelId,
          id: level.id || level.levelId,
          name: level.name || level.levelName || "",
          levelName: level.name || level.levelName || ""
        }));
        setLevels(levelOptions);
      }

      // Get semesters
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

      // Auto-select enrollment semester based on today's date
      // Note: The useEffect hook will handle this after semesters state is set
    } catch (error) {
      console.error("Failed to load options:", error);
      msg.error("Failed to load levels and semesters");
    } finally {
      setLoadingOptions(false);
    }
  };

  // Download template
  const handleDownloadTemplate = async () => {
    setLoading(true);
    try {
      // Fetch the template file from Assets folder
      const templatePath = require('./Assets/ScheduleImportTemplate.xlsx');
      const response = await fetch(templatePath);
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ScheduleImportTemplate.xlsx';
      document.body.appendChild(link);
      link.click();

      // Clean up
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        window.URL.revokeObjectURL(url);
      }, 100);

      msg.success("Template downloaded successfully");
    } catch (error) {
      console.error("Download error:", error);
      msg.error("Failed to download template. Please ensure the template file exists in Assets folder.");
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload for preview
  const handleFileUpload = async (file) => {
    const enrollmentSemesterId = form.getFieldValue("enrollmentSemesterId");

    if (!enrollmentSemesterId) {
      msg.error("Please select enrollment semester first");
      return false;
    }

    // If level is selected before upload, only show students with that level
    // If not selected, show all students (can filter later)
    const levelId = form.getFieldValue("levelId"); // Optional - if selected, filter by it

    setPreviewLoading(true);
    try {
      const preview = await AdminApi.previewImportStudents(file, enrollmentSemesterId, levelId || null);
      
      console.log("Preview response:", preview);
      console.log("Preview students count:", preview?.students?.length);
      console.log("Preview validRows:", preview?.validRows);
      console.log("Preview invalidRows:", preview?.invalidRows);
      
      // Ensure preview has students array
      if (!preview || !preview.students) {
        console.error("Invalid preview response:", preview);
        msg.error("Invalid response from server. Please try again.");
        setPreviewData(null);
        return false;
      }
      
      setPreviewData(preview);
      
      // Reset level filter when new preview is loaded (unless level was pre-selected)
      if (!levelId) {
        setSelectedLevelFilter(null);
      } else {
        // If level was pre-selected, set filter to match
        setSelectedLevelFilter(levelId);
      }
      
      if (preview.validRows > 0) {
        const filteredCount = levelId 
          ? preview.students.filter(s => s.levelId === levelId && s.isValid).length
          : preview.validRows;
        msg.success(`Preview loaded: ${filteredCount} valid rows, ${preview.invalidRows} invalid rows${levelId ? ` (filtered by selected level)` : ''}`);
      } else if (preview.students && preview.students.length > 0) {
        msg.warning(`Found ${preview.students.length} rows but all are invalid. Please check your data.`);
      } else {
        msg.warning("No data found in the file. Please check the file format.");
      }
    } catch (error) {
      console.error("Preview error:", error);
      console.error("Error response:", error?.response);
      const errorMsg = error?.response?.data?.message || error?.message || "Failed to preview file";
      msg.error(errorMsg);
      setPreviewData(null);
    } finally {
      setPreviewLoading(false);
    }

    return false; // Prevent default upload
  };

  // Handle import
  const handleImport = async () => {
    if (!previewData || previewData.validRows === 0) {
      msg.error("No valid data to import");
      return;
    }

    const enrollmentSemesterId = form.getFieldValue("enrollmentSemesterId");

    if (!enrollmentSemesterId) {
      msg.error("Please select enrollment semester");
      return;
    }

    // Filter students based on selected level filter (if any)
    let studentsToImport = previewData.students.filter(s => s.isValid);
    
    if (selectedLevelFilter) {
      studentsToImport = studentsToImport.filter(s => s.levelId === selectedLevelFilter);
    }

    if (studentsToImport.length === 0) {
      msg.error("No valid students to import (after filtering)");
      return;
    }

    // Prepare import request
    const validStudents = studentsToImport.map(s => ({
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      gender: s.gender,
      dob: s.dob,
      address: s.address || "",
      phoneNumber: s.phoneNumber || "",
      avatarUrl: s.avatarUrl || "", // Avatar URL from Google Drive
      studentCode: s.studentCode, // Already generated in preview
      levelId: s.levelId, // Level from Excel
      levelName: s.levelName || "",
    }));

    const importRequest = {
      enrollmentSemesterId: enrollmentSemesterId,
      levelId: null, // No longer required at request level
      students: validStudents
    };

    setImporting(true);
    try {
      const result = await AdminApi.importStudents(importRequest);
      setImportResult(result);
      setResultModalOpen(true);

      if (result.successCount > 0) {
        msg.success(`Successfully imported ${result.successCount} student(s)`);
      }
      if (result.errorCount > 0) {
        msg.warning(`${result.errorCount} student(s) failed to import`);
      }

      // Clear preview after import
      setPreviewData(null);
      setSelectedLevelFilter(null);
    } catch (error) {
      console.error("Import error:", error);
      const errorMsg = error?.response?.data?.message || error?.message || "Failed to import students";
      msg.error(errorMsg);
    } finally {
      setImporting(false);
    }
  };

  // Get unique levels from preview data for filter
  const uniqueLevels = previewData && previewData.students ? 
    [...new Map(previewData.students
      .filter(s => s && s.levelId && s.levelName)
      .map(s => [s.levelId, { levelId: s.levelId, levelName: s.levelName }]))
      .values()] : [];

  // Filter preview data based on selected level
  const filteredPreviewData = previewData && previewData.students ? {
    ...previewData,
    totalRows: selectedLevelFilter 
      ? (previewData.students.filter(s => s && s.levelId === selectedLevelFilter).length)
      : (previewData.totalRows || previewData.students.length),
    students: selectedLevelFilter 
      ? (previewData.students.filter(s => s && s.levelId === selectedLevelFilter))
      : previewData.students,
    validRows: selectedLevelFilter 
      ? (previewData.students.filter(s => s && s.levelId === selectedLevelFilter && s.isValid).length)
      : (previewData.validRows || previewData.students.filter(s => s && s.isValid).length),
    invalidRows: selectedLevelFilter 
      ? (previewData.students.filter(s => s && s.levelId === selectedLevelFilter && !s.isValid).length)
      : (previewData.invalidRows || previewData.students.filter(s => s && !s.isValid).length),
  } : null;

  // Table columns for preview - flexible widths to use full available space
  const previewColumns = [
    {
      title: "#",
      dataIndex: "rowNumber",
      key: "rowNumber",
      width: 50,
      align: "center",
      fixed: "left",
    },
    {
      title: "First Name",
      dataIndex: "firstName",
      key: "firstName",
      ellipsis: true,
    },
    {
      title: "Last Name",
      dataIndex: "lastName",
      key: "lastName",
      ellipsis: true,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      ellipsis: true,
    },
    {
      title: "Gender",
      dataIndex: "gender",
      key: "gender",
      width: 80,
      align: "center",
    },
    {
      title: "DOB",
      dataIndex: "dob",
      key: "dob",
      width: 110,
      align: "center",
      render: (dob) => dob ? dayjs(dob).format("DD/MM/YYYY") : "",
    },
    {
      title: "Phone",
      dataIndex: "phoneNumber",
      key: "phoneNumber",
      width: 120,
    },
    {
      title: "Level",
      dataIndex: "levelName",
      key: "levelName",
      width: 100,
      align: "center",
      render: (levelName, record) => levelName ? (
        <Tag color="purple" style={{ margin: 0 }}>{levelName}</Tag>
      ) : (
        <Tag color="red" style={{ margin: 0 }}>Missing</Tag>
      ),
    },
    {
      title: "Avatar",
      dataIndex: "avatarUrl",
      key: "avatarUrl",
      width: 200,
      ellipsis: {
        showTitle: false,
      },
      render: (url) => url ? (
        <Tooltip title={url}>
          <Tag color="green" style={{ margin: 0, cursor: "pointer" }}>
            <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              View Link
            </a>
          </Tag>
        </Tooltip>
      ) : (
        <Tag color="default" style={{ margin: 0 }}>No Avatar</Tag>
      ),
    },
    {
      title: "Student Code",
      dataIndex: "studentCode",
      key: "studentCode",
      width: 140,
      render: (code) => code ? <Tag color="blue" style={{ margin: 0 }}>{code}</Tag> : "-",
    },
    {
      title: "Status",
      key: "status",
      width: 90,
      align: "center",
      render: (_, record) => (
        record.isValid ? (
          <Tag icon={<CheckCircleOutlined />} color="success" style={{ margin: 0 }}>OK</Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="error" style={{ margin: 0 }}>Err</Tag>
        )
      ),
    },
    {
      title: "Errors",
      dataIndex: "errors",
      key: "errors",
      width: 200,
      ellipsis: {
        showTitle: false,
      },
      render: (errors) => errors && errors.length > 0 ? (
        <Tooltip title={errors.join(", ")}>
          <Tag color="red" style={{ margin: 0, cursor: "pointer" }}>
            {errors.length} error{errors.length > 1 ? "s" : ""}
          </Tag>
        </Tooltip>
      ) : "-",
    },
  ];

  const enrollmentSemesterId = form.getFieldValue("enrollmentSemesterId");
  const selectedSemester = semesters.find(s => 
    (s.semesterId || s.id) === Number(enrollmentSemesterId)
  );

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
        <div style={{ marginBottom: 16, padding: "0 8px" }}>
          <Space align="center" style={{ marginBottom: 4 }}>
            <FileExcelOutlined style={{ fontSize: 24, color: "#0071c5" }} />
            <Title level={3} style={{ margin: 0 }}>
              Import Students from Excel
            </Title>
          </Space>
        </div>

        <Divider style={{ margin: "16px 0" }} />

        {/* Description */}
        <div style={{ padding: "0 8px", marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Import multiple students at once by uploading an Excel file. Select enrollment semester and level, then preview and confirm.
          </Text>
        </div>

        {/* Configuration Form - Compact Layout */}
        <div style={{ padding: "0 8px" }}>
          <Form
            form={form}
            layout="vertical"
            autoComplete="off"
          >
            {/* Hidden field for enrollment semester (auto-selected, not editable) */}
            <Form.Item name="enrollmentSemesterId" hidden rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            
            {/* Display auto-selected semester info - Compact */}
            {selectedSemester && (
              <Alert
                message={
                  <Space size="small">
                    <CalendarOutlined />
                    <span style={{ fontSize: 13 }}>
                      <strong>Enrollment Semester:</strong> {selectedSemester.name}
                      {selectedSemester.startDate && (
                        <span style={{ marginLeft: 8, color: "#666" }}>
                          (Starts: {dayjs(selectedSemester.startDate).format("DD/MM/YYYY")})
                        </span>
                      )}
                    </span>
                  </Space>
                }
                type="info"
                showIcon
                style={{ marginBottom: 12, padding: "8px 12px" }}
                description={null}
              />
            )}

          <Row gutter={16} align="middle">
            {/* Level Selection - Optional filter before preview */}
            <Col xs={24} sm={8} md={6}>
              <Form.Item
                label={
                  <span style={{ 
                    fontSize: 14, 
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: 4
                  }}>
                    Level (Optional Filter)
                  </span>
                }
                name="levelId"
                tooltip="If selected before upload, only students with this level will be shown in preview. If not selected, all students will be shown and you can filter later."
                style={{ marginBottom: 12 }}
              >
                <Select
                  placeholder="Select level to filter (optional)"
                  loading={loadingOptions}
                  showSearch
                  optionFilterProp="children"
                  allowClear
                  onChange={(value) => {
                    // If preview already loaded and level changed, reset preview to reload
                    if (previewData && value !== form.getFieldValue("levelId")) {
                      msg.info("Please re-upload the file to apply the new level filter");
                    }
                  }}
                  filterOption={(input, option) =>
                    (option?.children ?? "").toLowerCase().includes(input.toLowerCase())
                  }
                  style={{ width: "100%" }}
                >
                  {levels.map(level => (
                    <Option key={String(level.levelId || level.id)} value={Number(level.levelId || level.id)}>
                      {level.name || level.levelName}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            {/* Download Template - Inline */}
            <Col xs={24} sm={16} md={18}>
              <Space size="small" wrap style={{ marginTop: 30 }}>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleDownloadTemplate}
                  type="primary"
                  loading={loading}
                  size="middle"
                >
                  Download Template
                </Button>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Template includes Instructions and Students sheets
                </Text>
              </Space>
            </Col>
          </Row>

            {/* Quick Guide - Compact */}
            <Alert
              message="Quick Guide"
              description="Required: FirstName, LastName, Email, Level, Gender, Dob. Optional: Address, PhoneNumber, Avatar (Google Drive link). Each row can have different level. Select level before upload to filter, or leave empty to see all students and filter later."
              type="info"
              showIcon
              style={{ marginBottom: 12, padding: "8px 12px", fontSize: 12 }}
            />
          </Form>
        </div>

        {/* Upload - Compact */}
        <div style={{ marginBottom: 16, padding: "0 8px" }}>
          <Upload.Dragger
            name="file"
            accept=".xlsx,.xls"
            beforeUpload={handleFileUpload}
            showUploadList={false}
            disabled={previewLoading}
            style={{ 
              padding: "20px",
              cursor: previewLoading ? "not-allowed" : "pointer",
              opacity: previewLoading ? 0.6 : 1
            }}
          >
            <p className="ant-upload-drag-icon" style={{ marginBottom: 8 }}>
              <UploadOutlined style={{ fontSize: 40, color: previewLoading ? "#999" : "#1890ff" }} />
            </p>
            <p className="ant-upload-text" style={{ fontSize: 14, marginBottom: 4 }}>
              Click or drag file to this area to upload
            </p>
            <p className="ant-upload-hint" style={{ fontSize: 12 }}>
              Support for Excel files (.xlsx, .xls) only. Level should be specified in Excel file (column D).
            </p>
          </Upload.Dragger>
          {previewLoading && (
            <div style={{ textAlign: "center", padding: 12 }}>
              <Text style={{ fontSize: 13 }}>Processing file, please wait...</Text>
            </div>
          )}
        </div>

        {/* Preview Table */}
        {previewData && (
          <>
            <Divider style={{ margin: "16px 0" }} />
            <div style={{ marginBottom: 12, padding: "0 8px" }}>
              <Row gutter={16} align="middle">
                <Col xs={24} sm={12}>
                  <Space size="small" wrap>
                    <Title level={4} style={{ margin: 0, fontSize: 18 }}>Preview</Title>
                    <Tag color="blue">Total: {filteredPreviewData.totalRows}</Tag>
                    <Tag color="success">Valid: {filteredPreviewData.students.filter(s => s.isValid).length}</Tag>
                    <Tag color="error">Invalid: {filteredPreviewData.students.filter(s => !s.isValid).length}</Tag>
                  </Space>
                </Col>
                <Col xs={24} sm={12} style={{ textAlign: "right" }}>
                  <Space size="small">
                    <Text strong style={{ fontSize: 13 }}>Filter by Level:</Text>
                    <Select
                      placeholder="All Levels"
                      allowClear
                      value={selectedLevelFilter}
                      onChange={setSelectedLevelFilter}
                      style={{ minWidth: 150 }}
                      size="small"
                    >
                      {uniqueLevels.map(level => (
                        <Option key={level.levelId} value={level.levelId}>
                          {level.levelName}
                        </Option>
                      ))}
                    </Select>
                  </Space>
                </Col>
              </Row>
            </div>

            <div style={{ padding: "0 8px" }}>
              <Table
                columns={previewColumns}
                dataSource={filteredPreviewData?.students || []}
                rowKey={(record) => `row-${record.rowNumber}`}
                pagination={{ pageSize: 10, showSizeChanger: false }}
                size="small"
                style={{ marginBottom: 24, width: "100%" }}
                locale={{
                  emptyText: filteredPreviewData?.students?.length === 0 
                    ? "No students found (after filtering)" 
                    : "No data"
                }}
              />
            </div>

            <div style={{ textAlign: "right", padding: "0 8px" }}>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    setPreviewData(null);
                    setSelectedLevelFilter(null);
                    form.resetFields();
                    loadOptions();
                  }}
                >
                  Reset
                </Button>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={handleImport}
                  loading={importing}
                  disabled={filteredPreviewData.students.filter(s => s.isValid).length === 0}
                  size="large"
                >
                  {selectedLevelFilter 
                    ? `Import Selected Level (${filteredPreviewData.students.filter(s => s.isValid).length} students)`
                    : `Import All (${filteredPreviewData.students.filter(s => s.isValid).length} students)`}
                </Button>
              </Space>
            </div>
          </>
        )}
      </Card>

      {/* Import Result Modal */}
      <Modal
        open={resultModalOpen}
        title="Import Result"
        onOk={() => {
          setResultModalOpen(false);
          setImportResult(null);
        }}
        onCancel={() => {
          setResultModalOpen(false);
          setImportResult(null);
        }}
        width={800}
      >
        {importResult && (
          <div>
            <Space direction="vertical" style={{ width: "100%" }} size="large">
              <div>
                <Text strong>Summary:</Text>
                <div style={{ marginTop: 8 }}>
                  <Tag color="success" style={{ fontSize: 14, padding: "4px 12px" }}>
                    Success: {importResult.successCount}
                  </Tag>
                  <Tag color="error" style={{ fontSize: 14, padding: "4px 12px", marginLeft: 8 }}>
                    Failed: {importResult.errorCount}
                  </Tag>
                </div>
              </div>

              {importResult.successCount > 0 && (
                <Progress
                  percent={Math.round((importResult.successCount / (importResult.successCount + importResult.errorCount)) * 100)}
                  status="success"
                />
              )}

              {importResult.results && importResult.results.length > 0 && (
                <div>
                  <Text strong>Details:</Text>
                  <Table
                    columns={[
                      { title: "Email", dataIndex: "email", key: "email" },
                      { 
                        title: "Status", 
                        key: "status",
                        render: (_, record) => record.success ? (
                          <Tag color="success">Success</Tag>
                        ) : (
                          <Tag color="error">Failed</Tag>
                        )
                      },
                      { title: "Student Code", dataIndex: "studentCode", key: "studentCode" },
                      { title: "Error", dataIndex: "errorMessage", key: "errorMessage" },
                    ]}
                    dataSource={importResult.results}
                    rowKey="email"
                    pagination={{ pageSize: 10 }}
                    size="small"
                  />
                </div>
              )}
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
}

