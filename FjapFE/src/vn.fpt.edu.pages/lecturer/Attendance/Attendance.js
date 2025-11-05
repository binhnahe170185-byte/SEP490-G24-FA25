import React, { useState, useEffect } from "react";
import {
  Card,
  Select,
  Table,
  Tag,
  Button,
  Space,
  Typography,
  Row,
  Col,
  message,
  Spin,
  Empty,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  FileDoneOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import AttendanceApi from "../../../vn.fpt.edu.api/Attendance";
import "./Attendance.css";

const { Title, Text } = Typography;
const { Option } = Select;

const STATUS_OPTIONS = [
  { value: "Present", label: "Present", color: "green", icon: <CheckCircleOutlined /> },
  { value: "Absent", label: "Absent", color: "red", icon: <CloseCircleOutlined /> },
  { value: "Late", label: "Late", color: "orange", icon: <ClockCircleOutlined /> },
  { value: "Excused", label: "Excused", color: "blue", icon: <FileDoneOutlined /> },
];

export default function Attendance() {
  const [classes, setClasses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState([]);
  const [lessonInfo, setLessonInfo] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attendanceMap, setAttendanceMap] = useState({}); // { studentId: status }

  // Load classes on mount
  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setLoading(true);
      console.log("Loading classes...");
      const data = await AttendanceApi.getClasses();
      console.log("Classes loaded:", data);
      setClasses(data || []);
      if (!data || data.length === 0) {
        console.warn("No classes returned from API");
        message.warning("No classes available");
      }
    } catch (error) {
      console.error("Failed to load classes:", error);
      console.error("Error details:", error.response?.data || error.message);
      message.error(`Failed to load classes: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadLessons = async (classId) => {
    if (!classId) return;

    try {
      setLoading(true);
      const data = await AttendanceApi.getLessonsByClass(classId);
      setLessons(data);
      setSelectedLessonId(null);
      setStudents([]);
      setLessonInfo(null);
      setAttendanceMap({});
    } catch (error) {
      console.error("Failed to load lessons:", error);
      message.error("Failed to load lessons");
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (lessonId) => {
    if (!lessonId) return;

    try {
      setLoading(true);
      const data = await AttendanceApi.getStudentsByLesson(lessonId);
      if (data) {
        setLessonInfo({
          lessonId: data.lessonId,
          classId: data.classId,
          date: data.date,
          roomName: data.roomName,
          timeSlot: data.timeSlot,
          subjectName: data.subjectName,
        });

        // Initialize attendance map
        const map = {};
        data.students.forEach((student) => {
          map[student.studentId] = student.status || "Present";
        });
        setAttendanceMap(map);
        setStudents(data.students);
      }
    } catch (error) {
      console.error("Failed to load students:", error);
      message.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = (classId) => {
    setSelectedClassId(classId);
    loadLessons(classId);
  };

  const handleLessonChange = (lessonId) => {
    setSelectedLessonId(lessonId);
    loadStudents(lessonId);
  };

  const handleStatusChange = (studentId, status) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSave = async () => {
    if (!selectedLessonId) {
      message.warning("Please select a lesson first");
      return;
    }

    const hasChanges = students.some((student) => {
      const originalStatus = student.status || "Present";
      const currentStatus = attendanceMap[student.studentId] || "Present";
      return originalStatus !== currentStatus;
    });

    if (!hasChanges) {
      message.info("No changes to save");
      return;
    }

    try {
      setSaving(true);
      const attendances = students.map((student) => ({
        studentId: student.studentId,
        status: attendanceMap[student.studentId] || "Present",
      }));

      await AttendanceApi.updateBulkAttendance(selectedLessonId, attendances);
      message.success("Attendance saved successfully");

      // Reload students to get updated data
      await loadStudents(selectedLessonId);
    } catch (error) {
      console.error("Failed to save attendance:", error);
      message.error("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: "No.",
      key: "no",
      width: 60,
      align: "center",
      render: (_value, _record, index) => index + 1,
    },
    {
      title: "Student Code",
      dataIndex: "studentCode",
      key: "studentCode",
      width: 120,
    },
    {
      title: "Full Name",
      dataIndex: "fullName",
      key: "fullName",
      render: (text) => <strong>{text || "-"}</strong>,
    },
    {
      title: "Status",
      key: "status",
      width: 200,
      render: (_value, record) => {
        const currentStatus = attendanceMap[record.studentId] || record.status || "Present";
        const statusOption = STATUS_OPTIONS.find((opt) => opt.value === currentStatus);

        return (
          <Select
            value={currentStatus}
            onChange={(value) => handleStatusChange(record.studentId, value)}
            style={{ width: "100%" }}
            size="large"
          >
            {STATUS_OPTIONS.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                <Space>
                  {opt.icon}
                  {opt.label}
                </Space>
              </Option>
            ))}
          </Select>
        );
      },
    },
    {
      title: "Current Status",
      key: "currentStatus",
      width: 150,
      align: "center",
      render: (_value, record) => {
        const originalStatus = record.status || "Present";
        const statusOption = STATUS_OPTIONS.find((opt) => opt.value === originalStatus);
        return (
          <Tag color={statusOption?.color} icon={statusOption?.icon}>
            {statusOption?.label}
          </Tag>
        );
      },
    },
  ];

  const selectedClass = classes.find((c) => c.classId === selectedClassId);
  const selectedLesson = lessons.find((l) => l.lessonId === selectedLessonId);

  return (
    <div className="attendance-container">
      <Card>
        <Title level={2} style={{ marginBottom: 24 }}>
          Take Attendance
        </Title>

        {/* Filters */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={8}>
            <div>
              <Text strong>Select Class:</Text>
              <Select
                placeholder="Choose a class"
                style={{ width: "100%", marginTop: 8 }}
                size="large"
                value={selectedClassId}
                onChange={handleClassChange}
                loading={loading}
              >
                {classes.map((cls) => (
                  <Option key={cls.classId} value={cls.classId}>
                    {cls.className} - {cls.subjectName}
                  </Option>
                ))}
              </Select>
            </div>
          </Col>

          <Col xs={24} sm={12} md={8}>
            <div>
              <Text strong>Select Lesson:</Text>
              <Select
                placeholder="Choose a lesson"
                style={{ width: "100%", marginTop: 8 }}
                size="large"
                value={selectedLessonId}
                onChange={handleLessonChange}
                loading={loading}
                disabled={!selectedClassId || lessons.length === 0}
              >
                {lessons.map((lesson) => (
                  <Option key={lesson.lessonId} value={lesson.lessonId}>
                    {lesson.date} - {lesson.timeSlot} ({lesson.roomName})
                  </Option>
                ))}
              </Select>
            </div>
          </Col>

          <Col xs={24} sm={24} md={8}>
            <div style={{ marginTop: 32 }}>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                size="large"
                onClick={handleSave}
                loading={saving}
                disabled={!selectedLessonId || students.length === 0}
                block
              >
                Save Attendance
              </Button>
            </div>
          </Col>
        </Row>

        {/* Lesson Info */}
        {lessonInfo && (
          <Card
            style={{ marginBottom: 24, backgroundColor: "#f0f2f5" }}
            bodyStyle={{ padding: "16px 24px" }}
          >
            <Row gutter={[16, 8]}>
              <Col xs={24} sm={12} md={6}>
                <Text type="secondary">Subject:</Text>
                <br />
                <Text strong>{lessonInfo.subjectName}</Text>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Text type="secondary">Date:</Text>
                <br />
                <Text strong>{lessonInfo.date}</Text>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Text type="secondary">Time:</Text>
                <br />
                <Text strong>{lessonInfo.timeSlot}</Text>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Text type="secondary">Room:</Text>
                <br />
                <Text strong>{lessonInfo.roomName}</Text>
              </Col>
            </Row>
          </Card>
        )}

        {/* Students Table */}
        {loading && students.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <Spin size="large" />
          </div>
        ) : students.length > 0 ? (
          <Table
            columns={columns}
            dataSource={students}
            rowKey="studentId"
            pagination={false}
            bordered
          />
        ) : selectedLessonId ? (
          <Empty description="No students found for this lesson" />
        ) : (
          <Empty description="Please select a class and lesson to view students" />
        )}

        {/* Status Legend */}
        {students.length > 0 && (
          <Card
            style={{ marginTop: 24 }}
            title="Status Legend"
            bodyStyle={{ padding: "12px 24px" }}
          >
            <Space wrap>
              {STATUS_OPTIONS.map((opt) => (
                <Tag key={opt.value} color={opt.color} icon={opt.icon}>
                  {opt.label}
                </Tag>
              ))}
            </Space>
          </Card>
        )}
      </Card>
    </div>
  );
}

