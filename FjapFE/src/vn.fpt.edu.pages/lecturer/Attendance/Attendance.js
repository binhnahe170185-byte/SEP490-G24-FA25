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
  notification,
  Avatar,
  Alert,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  SaveOutlined,
  ArrowLeftOutlined,
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
  const [api, contextHolder] = notification.useNotification();

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
  const [isOutside24Hours, setIsOutside24Hours] = useState(false);
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

        // Check if lesson is on the same date
        const lessonDate = new Date(data.date);
        const currentDate = new Date();

        // Reset time parts to compare only dates
        lessonDate.setHours(0, 0, 0, 0);
        currentDate.setHours(0, 0, 0, 0);

        const daysDifference = (currentDate - lessonDate) / (1000 * 60 * 60 * 24);

        // Only allow attendance on the lesson date itself (same day)
        const outside24Hours = daysDifference !== 0;
        setIsOutside24Hours(outside24Hours);

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

    const hasChanges = students.some((student) => {
      const originalStatus = student.status || "Absent";
      const currentStatus = attendanceMap[student.studentId] || "Absent";
      return originalStatus !== currentStatus;
    });

    try {
      setSaving(true);

      const attendances = students.map((student) => ({
        studentId: student.studentId,
        status: attendanceMap[student.studentId] || "Absent",
      }));

      const response = await AttendanceApi.updateBulkAttendance(selectedLessonId, attendances);
      api.success({
        message: 'Save Successful',
        description: 'Attendance has been saved successfully!',
        placement: 'bottomRight',
        duration: 5,
      });

      // Reload students to get updated data
      await loadStudents(selectedLessonId);
    } catch (error) {

      let errorMessage = 'Unable to save attendance. Please try again.';
      let errorDescription = 'An error occurred while saving attendance.';

      if (error?.response?.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
          errorDescription = errorMessage;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
          errorDescription = errorMessage;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
          errorDescription = errorMessage;
        }
      } else if (error?.message) {
        errorMessage = error.message;
        errorDescription = errorMessage;
      }

      api.error({
        message: 'Save Failed',
        description: errorDescription,
        placement: 'bottomRight',
        duration: 5,
      });
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
      // Preserve scheduleState when replacing navigation
      const scheduleState = location.state?.scheduleState;
      navigate(location.pathname, { 
        replace: true,
        state: scheduleState ? { scheduleState } : undefined
      });
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
      title: "Image",
      key: "avatar",
      width: 300,
      align: "center",
      render: (_value, record) => {
        const avatarSrc = record.avatar;
        if (avatarSrc) {
          return (
            <img
              src={avatarSrc}
              alt={`${record.firstName || ''} ${record.lastName || ''}`.trim() || 'Avatar'}
              style={{
                width: '120px',
                height: '190px',
                objectFit: 'cover',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'block',
                margin: '0 auto',
              }}
            />
          );
        }
        return (
          <div
            style={{
              width: '120px',
              height: '190px',
              backgroundColor: '#87d068',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '36px',
              fontWeight: 'bold',
              margin: '0 auto',
            }}
          >
            {(record.firstName?.charAt(0) || record.lastName?.charAt(0) || '?').toUpperCase()}
          </div>
        );
      },
    },
    {
      title: "Student Code",
      dataIndex: "studentCode",
      key: "studentCode",
      width: 120,
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
                disabled={isOutside24Hours}
              >
                {opt.label}
              </Button>
            ))}
          </Space>
        );
      },
    },

  ];

  const scheduleState = location.state?.scheduleState;
  const handleBackToSchedule = () => {
    navigate('/lecturer/schedule', {
      state: {
        scheduleState: scheduleState,
      },
    });
  };

  return (
    <div className="attendance-container">
      {contextHolder}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleBackToSchedule}
            style={{ marginRight: 16 }}
          >
            Back
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            Take Attendance
          </Title>
        </div>



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

        {/* attendance warning */}
        {lessonInfo && isOutside24Hours && (
          <Alert
            message="Attendance Closed"
            description={`You can only take attendance on the lesson date. This lesson was on ${lessonInfo.date}. Attendance cannot be changes after 23:59 of ${lessonInfo.date}.`}
            type="warning"
            showIcon
            style={{ marginBottom: 24 }}
          />
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


            <div style={{ marginTop: 24, textAlign: "right" }}>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                size="large"
                onClick={handleSave}
                loading={saving}
                disabled={!selectedLessonId || students.length === 0 || isOutside24Hours}
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

