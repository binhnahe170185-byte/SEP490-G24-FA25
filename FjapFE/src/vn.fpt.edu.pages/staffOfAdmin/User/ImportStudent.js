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
      await AdminApi.downloadStudentTemplate();
      msg.success("Template downloaded successfully");
    } catch (error) {
      console.error("Download error:", error);
      const errorMsg = error?.response?.data?.message || error?.message || "Failed to download template";
      msg.error(`Failed to download template: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload for preview
  const handleFileUpload = async (file) => {
    const enrollmentSemesterId = form.getFieldValue("enrollmentSemesterId");
    const levelId = form.getFieldValue("levelId");

    if (!enrollmentSemesterId) {
      msg.error("Please select enrollment semester first");
      return false;
    }

    if (!levelId) {
      msg.error("Please select level first");
      return false;
    }

    setPreviewLoading(true);
    try {
      const preview = await AdminApi.previewImportStudents(file, enrollmentSemesterId, levelId);
      setPreviewData(preview);
      
      if (preview.validRows > 0) {
        msg.success(`Preview loaded: ${preview.validRows} valid rows, ${preview.invalidRows} invalid rows`);
      } else {
        msg.warning("No valid rows found in the file");
      }
    } catch (error) {
      console.error("Preview error:", error);
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
    const levelId = form.getFieldValue("levelId");

    if (!enrollmentSemesterId || !levelId) {
      msg.error("Please select semester and level");
      return;
    }

    // Prepare import request
    const validStudents = previewData.students
      .filter(s => s.isValid)
      .map(s => ({
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        gender: s.gender,
        dob: s.dob,
        address: s.address || "",
        phoneNumber: s.phoneNumber || "",
        studentCode: s.studentCode, // Already generated in preview
      }));

    const importRequest = {
      enrollmentSemesterId: enrollmentSemesterId,
      levelId: levelId,
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
    } catch (error) {
      console.error("Import error:", error);
      const errorMsg = error?.response?.data?.message || error?.message || "Failed to import students";
      msg.error(errorMsg);
    } finally {
      setImporting(false);
    }
  };

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
      width: 150,
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
            {/* Level Selection - Compact */}
            <Col xs={24} sm={8} md={6}>
              <Form.Item
                label={
                  <span style={{ 
                    fontSize: 14, 
                    fontWeight: "bold", 
                    color: "#ff4d4f",
                    display: "flex",
                    alignItems: "center",
                    gap: 4
                  }}>
                    <span style={{ fontSize: 16 }}>⚠️</span>
                    Level <span style={{ color: "#ff4d4f" }}>*</span>
                  </span>
                }
                name="levelId"
                rules={[{ required: true, message: "Please select level" }]}
                style={{ marginBottom: 12 }}
              >
                <Select
                  placeholder="Select level"
                  loading={loadingOptions}
                  showSearch
                  optionFilterProp="children"
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
              description="Required: FirstName, LastName, Email, Gender, Dob. Optional: Address, PhoneNumber."
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
              Support for Excel files (.xlsx, .xls) only. {!levelId && "Please select level first."}
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
              <Space size="small">
                <Title level={4} style={{ margin: 0, fontSize: 18 }}>Preview</Title>
                <Tag color="blue">Total: {previewData.totalRows}</Tag>
                <Tag color="success">Valid: {previewData.validRows}</Tag>
                <Tag color="error">Invalid: {previewData.invalidRows}</Tag>
              </Space>
            </div>

            <div style={{ padding: "0 8px" }}>
              <Table
                columns={previewColumns}
                dataSource={previewData.students}
                rowKey="rowNumber"
                pagination={{ pageSize: 10, showSizeChanger: false }}
                size="small"
                style={{ marginBottom: 24, width: "100%" }}
              />
            </div>

            <div style={{ textAlign: "right", padding: "0 8px" }}>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    setPreviewData(null);
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
                  disabled={previewData.validRows === 0}
                  size="large"
                >
                  Confirm Import ({previewData.validRows} students)
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

