import React, { useState, useEffect, useCallback } from "react";
import { Table, Card, Typography, Spin, message, Tag, Statistic, Row, Col, Input, Space } from "antd";
import { FileTextOutlined, SearchOutlined, TrophyOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { useAuth } from "../../login/AuthContext";
import StudentGrades from "../../../vn.fpt.edu.api/StudentGrades";

const { Title, Text } = Typography;
const { Search } = Input;

export default function AcademicTranscript() {
  const { user } = useAuth();
  const [transcript, setTranscript] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const studentId = user?.studentId || user?.id;

  const loadAcademicTranscript = useCallback(async () => {
    if (!studentId) {
      message.error("Student ID not found");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await StudentGrades.getAcademicTranscript(studentId);
      setTranscript(data);
    } catch (error) {
      console.error("Failed to load academic transcript:", error);
      message.error("Failed to load academic transcript");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadAcademicTranscript();
  }, [loadAcademicTranscript]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "passed":
        return "green";
      case "failed":
        return "red";
      case "in progress":
      case "not started":
        return "blue";
      default:
        return "default";
    }
  };

  const getStatusText = (status, grade) => {
    if (!grade && (status === "Not Started" || status === "In Progress")) {
      return "In Progress";
    }
    if (grade && grade >= 5.0) {
      return "Passed";
    }
    if (grade && grade < 5.0) {
      return "Failed";
    }
    return status || "In Progress";
  };

  const filteredCourses = transcript?.courses?.filter(course => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      course.subjectCode.toLowerCase().includes(searchLower) ||
      course.subjectName.toLowerCase().includes(searchLower) ||
      course.semesterName.toLowerCase().includes(searchLower)
    );
  }) || [];

  const columns = [
    {
      title: "No.",
      key: "no",
      width: 70,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Code",
      dataIndex: "subjectCode",
      key: "subjectCode",
      width: 150,
      sorter: (a, b) => a.subjectCode.localeCompare(b.subjectCode),
    },
    {
      title: "Name",
      dataIndex: "subjectName",
      key: "subjectName",
      sorter: (a, b) => a.subjectName.localeCompare(b.subjectName),
    },
    {
      title: "Semester",
      dataIndex: "semesterName",
      key: "semesterName",
      width: 150,
      sorter: (a, b) => a.semesterName.localeCompare(b.semesterName),
    },
    {
      title: "Grade",
      dataIndex: "grade",
      key: "grade",
      width: 120,
      align: "center",
      sorter: (a, b) => {
        const gradeA = a.grade ?? 0;
        const gradeB = b.grade ?? 0;
        return gradeA - gradeB;
      },
      render: (grade) => (
        <Text strong style={{ fontSize: "16px" }}>
          {grade != null ? grade.toFixed(2) : "-"}
        </Text>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 150,
      align: "center",
      filters: [
        { text: "Passed", value: "Passed" },
        { text: "Failed", value: "Failed" },
        { text: "In Progress", value: "In Progress" },
      ],
      onFilter: (value, record) => {
        const status = getStatusText(record.status, record.grade);
        return status === value;
      },
      render: (_, record) => {
        const statusText = getStatusText(record.status, record.grade);
        return (
          <Tag color={getStatusColor(statusText)}>
            {statusText}
          </Tag>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>Loading academic transcript...</p>
      </div>
    );
  }

  if (!transcript) {
    return (
      <div style={{ padding: "24px" }}>
        <Card>
          <Text>No transcript data available</Text>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px" }}>
      <Card style={{ borderRadius: 12, marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: "100%" }} size="large">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Title level={2} style={{ margin: 0 }}>
              <FileTextOutlined /> Academic Transcript
            </Title>
            <Search
              placeholder="Search by subject code, name, or semester"
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              style={{ width: 400 }}
              onSearch={setSearch}
              onChange={(e) => {
                if (!e.target.value) {
                  setSearch("");
                }
              }}
            />
          </div>

          {/* Statistics Cards */}
          <Row gutter={16}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Average GPA"
                  value={transcript.averageGPA}
                  precision={2}
                  prefix={<TrophyOutlined />}
                  valueStyle={{ color: "#1890ff", fontSize: "24px", fontWeight: "bold" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Total Courses"
                  value={transcript.totalCourses}
                  prefix={<FileTextOutlined />}
                  valueStyle={{ fontSize: "24px", fontWeight: "bold" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Passed"
                  value={transcript.passedCourses}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: "#52c41a", fontSize: "24px", fontWeight: "bold" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Failed"
                  value={transcript.failedCourses}
                  prefix={<CloseCircleOutlined />}
                  valueStyle={{ color: "#ff4d4f", fontSize: "24px", fontWeight: "bold" }}
                />
              </Card>
            </Col>
          </Row>

          {/* Courses Table */}
          <Table
            columns={columns}
            dataSource={filteredCourses}
            rowKey="courseId"
            loading={loading}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} courses`,
              pageSizeOptions: ["10", "20", "50", "100"],
            }}
            scroll={{ x: "max-content" }}
          />
        </Space>
      </Card>
    </div>
  );
}

