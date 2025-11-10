import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Select,
  Table,
  Tag,
  Button,
  Space,
  Typography,
  message,
  Spin,
  Empty,
  Row,
  Col,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import AttendanceApi from "../../../vn.fpt.edu.api/Attendance";
import { useLocation, useNavigate } from "react-router-dom";
import "./Attendance.css";

const { Title, Text } = Typography;
const { Option } = Select;

const STATUS_OPTIONS = [
  { value: "Absent", label: "Absent", color: "red", icon: <CloseCircleOutlined /> },
  { value: "Present", label: "Present", color: "green", icon: <CheckCircleOutlined /> },
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
  const location = useLocation();
  const navigate = useNavigate();
  const [prefillClassId, setPrefillClassId] = useState(location.state?.classId || null);
  const [prefillLessonId, setPrefillLessonId] = useState(location.state?.lessonId || null);
  const [prefillClassApplied, setPrefillClassApplied] = useState(false);
  const [prefillLessonApplied, setPrefillLessonApplied] = useState(false);
  useEffect(() => {
    const state = location.state;
    if (state && (state.classId || state.lessonId)) {
      setPrefillClassId(state.classId || null);
      setPrefillLessonId(state.lessonId || null);
      setPrefillClassApplied(false);
      setPrefillLessonApplied(false);
    }
  }, [location.state]);

  const loadClasses = useCallback(async () => {
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
  }, []);

  // Load classes on mount
  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const loadLessons = useCallback(async (classId) => {
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
  }, []);

  const loadStudents = useCallback(async (lessonId) => {
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
          map[student.studentId] = student.status || "Absent";
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
  }, []);

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
      const originalStatus = student.status || "Absent";
      const currentStatus = attendanceMap[student.studentId] || "Absent";
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
        status: attendanceMap[student.studentId] || "Absent",
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

  useEffect(() => {
    if (!prefillClassApplied && prefillClassId && classes.length > 0) {
      const classExists = classes.some((cls) => cls.classId === prefillClassId);
      if (classExists) {
        setSelectedClassId(prefillClassId);
        loadLessons(prefillClassId);
      }
      setPrefillClassApplied(true);
    }
  }, [classes, prefillClassApplied, prefillClassId, loadLessons]);

  useEffect(() => {
    if (
      !prefillLessonApplied &&
      prefillLessonId &&
      lessons.length > 0 &&
      (!prefillClassId || prefillClassId === selectedClassId)
    ) {
      const lessonExists = lessons.some((lesson) => lesson.lessonId === prefillLessonId);
      if (lessonExists) {
        setSelectedLessonId(prefillLessonId);
        loadStudents(prefillLessonId);
      }
      setPrefillLessonApplied(true);
    }
  }, [
    lessons,
    prefillLessonApplied,
    prefillLessonId,
    prefillClassId,
    selectedClassId,
    loadStudents,
  ]);

  useEffect(() => {
    if (
      prefillClassApplied &&
      prefillLessonApplied &&
      (prefillClassId || prefillLessonId) &&
      location.state
    ) {
      navigate(location.pathname, { replace: true });
    }
  }, [
    prefillClassApplied,
    prefillLessonApplied,
    prefillClassId,
    prefillLessonId,
    location.pathname,
    location.state,
    navigate,
  ]);

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
        const currentStatus = attendanceMap[record.studentId] || record.status || "Absent";
        const statusOption = STATUS_OPTIONS.find((opt) => opt.value === currentStatus);

        return (
          <Space>
            {STATUS_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                type={currentStatus === opt.value ? "primary" : "default"}
                icon={opt.icon}
                onClick={() => handleStatusChange(record.studentId, opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </Space>
        );
      },
    },

  ];

  return (
    <div className="attendance-container">
      <Card>
        <Title level={2} style={{ marginBottom: 24 }}>
          Take Attendance
        </Title>



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

        {students.length > 0 && (
          <>
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

            <div style={{ marginTop: 24, textAlign: "right" }}>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                size="large"
                onClick={handleSave}
                loading={saving}
                disabled={!selectedLessonId || students.length === 0}
              >
                Save Attendance
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

