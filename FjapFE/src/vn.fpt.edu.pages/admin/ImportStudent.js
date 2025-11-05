// src/vn.fpt.edu.pages/admin/ImportStudent.js
import React, { useState, useEffect } from "react";
import {
  Card, Form, Select, Button, Row, Col, message, Space, Typography, Divider, 
  Alert, Upload, Table, Tag, Modal, Progress, Input
} from "antd";
import {
  FileExcelOutlined, UploadOutlined, DownloadOutlined, 
  CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined, CalendarOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import AdminApi from "../../vn.fpt.edu.api/Admin";
import { api } from "../../vn.fpt.edu.api/http";

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

  // Table columns for preview
  const previewColumns = [
    {
      title: "Row",
      dataIndex: "rowNumber",
      key: "rowNumber",
      width: 60,
    },
    {
      title: "First Name",
      dataIndex: "firstName",
      key: "firstName",
    },
    {
      title: "Last Name",
      dataIndex: "lastName",
      key: "lastName",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Gender",
      dataIndex: "gender",
      key: "gender",
      width: 100,
    },
    {
      title: "DOB",
      dataIndex: "dob",
      key: "dob",
      width: 120,
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
      width: 150,
      render: (code) => code ? <Tag color="blue">{code}</Tag> : "-",
    },
    {
      title: "Target Semester",
      dataIndex: "targetSemesterName",
      key: "targetSemesterName",
      width: 150,
    },
    {
      title: "Status",
      key: "status",
      width: 100,
      render: (_, record) => (
        record.isValid ? (
          <Tag icon={<CheckCircleOutlined />} color="success">Valid</Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="error">Invalid</Tag>
        )
      ),
    },
    {
      title: "Errors",
      dataIndex: "errors",
      key: "errors",
      render: (errors) => errors && errors.length > 0 ? (
        <div>
          {errors.map((err, idx) => (
            <Tag key={idx} color="red" style={{ marginBottom: 4 }}>
              {err}
            </Tag>
          ))}
        </div>
      ) : "-",
    },
  ];

  const enrollmentSemesterId = form.getFieldValue("enrollmentSemesterId");
  const selectedSemester = semesters.find(s => 
    (s.semesterId || s.id) === Number(enrollmentSemesterId)
  );

  return (
    <div style={{ maxWidth: "100%", margin: "0", padding: "0" }}>
      {msgCtx}
      <Card
        style={{
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <Space align="center" style={{ marginBottom: 8 }}>
            <FileExcelOutlined style={{ fontSize: 24, color: "#0071c5" }} />
            <Title level={3} style={{ margin: 0 }}>
              Import Students from Excel
            </Title>
          </Space>
          <Text type="secondary">
            Import multiple students at once by uploading an Excel file. Select enrollment semester and level, then preview and confirm.
          </Text>
        </div>

        <Divider />

        {/* Configuration Form */}
        <Form
          form={form}
          layout="vertical"
          autoComplete="off"
        >
          <Row gutter={16}>
            {/* Hidden field for enrollment semester (auto-selected, not editable) */}
            <Form.Item name="enrollmentSemesterId" hidden rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            
            {/* Display auto-selected semester info */}
            {selectedSemester && (
              <Col xs={24}>
                <Alert
                  message={
                    <Space>
                      <CalendarOutlined />
                      <span>
                        <strong>Enrollment Semester (Auto-selected):</strong> {selectedSemester.name}
                        {selectedSemester.startDate && (
                          <span style={{ marginLeft: 8, color: "#666" }}>
                            (Starts: {dayjs(selectedSemester.startDate).format("DD/MM/YYYY")})
                          </span>
                        )}
                      </span>
                    </Space>
                  }
                  description="The enrollment semester is automatically selected based on today's date. Students will be enrolled in this semester."
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              </Col>
            )}
            <Col xs={24} sm={12}>
              <Form.Item
                label={<strong>Level</strong>}
                name="levelId"
                rules={[{ required: true, message: "Please select level" }]}
                tooltip="The level for all imported students"
              >
                <Select
                  placeholder="Select level"
                  loading={loadingOptions}
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option?.children ?? "").toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {levels.map(level => (
                    <Option key={String(level.levelId || level.id)} value={Number(level.levelId || level.id)}>
                      {level.name || level.levelName}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>

        <Divider />

        {/* Instructions */}
        <Alert
          message="Quick Guide"
          description="Download the Excel template, fill in student information, then upload the file. Required fields: FirstName, LastName, Email, Gender, Dob. Optional: Address, PhoneNumber."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        {/* Download Template */}
        <div style={{ marginBottom: 24 }}>
          <Card 
            style={{ 
              backgroundColor: "#f0f9ff",
              border: "1px solid #bae6fd"
            }}
          >
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <div>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleDownloadTemplate}
                  size="large"
                  type="primary"
                  loading={loading}
                >
                  Download Template Excel
                </Button>
              </div>
              <div>
                <Text type="secondary">
                  Template includes Instructions sheet and Students sheet with sample data. See Instructions sheet for detailed requirements.
                </Text>
              </div>
            </Space>
          </Card>
        </div>

        {/* Upload */}
        <div style={{ marginBottom: 24 }}>
          <Upload.Dragger
            name="file"
            accept=".xlsx,.xls"
            beforeUpload={handleFileUpload}
            showUploadList={false}
            disabled={previewLoading || !form.getFieldValue("levelId")}
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined style={{ fontSize: 48, color: "#1890ff" }} />
            </p>
            <p className="ant-upload-text">Click or drag file to this area to upload</p>
            <p className="ant-upload-hint">
              Support for Excel files (.xlsx, .xls) only. Please select level first.
            </p>
          </Upload.Dragger>
          {previewLoading && (
            <div style={{ textAlign: "center", padding: 20 }}>
              <Text>Processing file, please wait...</Text>
            </div>
          )}
        </div>

        {/* Preview Table */}
        {previewData && (
          <>
            <Divider />
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Title level={4} style={{ margin: 0 }}>Preview</Title>
                <Tag color="blue">Total: {previewData.totalRows}</Tag>
                <Tag color="success">Valid: {previewData.validRows}</Tag>
                <Tag color="error">Invalid: {previewData.invalidRows}</Tag>
              </Space>
            </div>

            <Table
              columns={previewColumns}
              dataSource={previewData.students}
              rowKey="rowNumber"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1200 }}
              style={{ marginBottom: 24 }}
            />

            <div style={{ textAlign: "right" }}>
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

