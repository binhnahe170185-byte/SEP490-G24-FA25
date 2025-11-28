import React from "react";
import { Modal, Tabs, Typography, Card, Avatar, Button, Space, message } from "antd";
import {
    CalendarOutlined,
    ClockCircleOutlined,
    UserOutlined,
    TeamOutlined,
    ScheduleOutlined,
    CloseOutlined,
    VideoCameraOutlined,
    BookOutlined,
    LinkOutlined,
    CheckSquareOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

const { Title, Text } = Typography;

const STATUS = {
    pending: { color: "#3b82f6", text: "Not Yet" },
    done: { color: "#22c55e", text: "Present" },
    absent: { color: "#ef4444", text: "Absent" },
};

export default function LessonDetailModal({ visible, lesson, onClose }) {
    const navigate = useNavigate();

    if (!lesson) return null;

    const status = STATUS[lesson?.status] || STATUS.pending;
    const recordTime = dayjs().format("DD/MM/YYYY HH:mm:ss");

    // Extract data from lesson
    const courseName = lesson?.code || lesson?.subjectCode || "N/A";
    const date = lesson?.date ? dayjs(lesson.date).format("dddd DD/MM/YYYY") : "N/A";
    const slot = lesson?.slotId ? `Slot ${lesson.slotId}` : "N/A";
    const time = lesson?.timeLabel || (lesson?.startTime && lesson?.endTime ?
        `${lesson.startTime} - ${lesson.endTime}` : "N/A");

    // Get instructor and studentGroup from lesson data
    const instructorCode = lesson?.instructor || "N/A";
    const studentGroupCode = lesson?.studentGroup || "N/A";
    const classId = lesson?.classId || lesson?.class_id || null;
    const lessonId = lesson?.lessonId || lesson?.lesson_id || null;
    const canTakeAttendance = Boolean(classId && lessonId);
    const canViewHomework = Boolean(classId && lessonId);

    const handleViewStudents = () => {
        if (classId) {
            navigate(`/lecturer/class/${classId}/students`);
            onClose();
        }
    };

    const handleViewAttendanceReport = () => {
        if (classId) {
            navigate(`/lecturer/attendanceReport/${classId}`);
            onClose();
        }
    };

    const handleTakeAttendance = () => {
        if (!canTakeAttendance) {
            message.warning("Attendance information for this lesson is missing.");
            return;
        }
        navigate("/lecturer/attendance", {
            state: {
                classId,
                lessonId
            }
        });
        onClose();
    };

    const handleOpenHomework = () => {
        if (!canViewHomework) return;
        navigate(`/lecturer/homework/${classId}/${lessonId}`, {
            state: {
                lesson,
                from: {
                    page: "lecturer-schedule",
                },
            },
        });
        onClose();
    };

    return (
        <Modal
            open={visible}
            onCancel={onClose}
            footer={null}
            width={800}
            closeIcon={null}
            style={{ top: 20 }}
        >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <ClockCircleOutlined style={{ color: status.color, fontSize: 16 }} />
                    <Text strong style={{ color: status.color, fontSize: 14 }}>
                        {status.text?.toUpperCase()}
                    </Text>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <ClockCircleOutlined style={{ color: "#666", fontSize: 14 }} />
                    <Text style={{ fontSize: 12, color: "#666" }}>
                        Record time: {recordTime}
                    </Text>
                </div>
            </div>

            {/* Tabs */}
            <Tabs
                defaultActiveKey="details"
                items={[
                    {
                        key: "details",
                        label: "Class Information",
                        children: (
                            <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
                                {/* Left Column - Course Information */}
                                <Card
                                    style={{ flex: 1 }}
                                    bodyStyle={{ padding: 16 }}
                                    title={
                                        <Space>
                                            <span style={{ fontSize: 16 }}>🎓</span>
                                            <Title level={5} style={{ margin: 0, color: "#1890ff" }}>
                                                Course Information
                                            </Title>
                                        </Space>
                                    }
                                >
                                    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                                        {/* Course Name */}
                                        <div style={{
                                            background: "#e6f4ff",
                                            padding: "6px 12px",
                                            borderRadius: 4,
                                            fontSize: 14,
                                            fontWeight: 500
                                        }}>
                                            {courseName}
                                        </div>

                                        {/* Date */}
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <CalendarOutlined style={{ color: "#1890ff" }} />
                                            <Text>Date: {date}</Text>
                                        </div>

                                        {/* Slot */}
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <Text>#</Text>
                                            <Text>Slot: {slot}</Text>
                                        </div>

                                        {/* Time */}
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <ClockCircleOutlined style={{ color: "#1890ff" }} />
                                            <Text>Time: {time}</Text>
                                        </div>
                                    </Space>
                                </Card>

                                {/* Right Column - People */}
                                <Card
                                    style={{ flex: 1 }}
                                    bodyStyle={{ padding: 16 }}
                                    title={
                                        <Space>
                                            <span style={{ fontSize: 16 }}>👥</span>
                                            <Title level={5} style={{ margin: 0, color: "#1890ff" }}>
                                                People
                                            </Title>
                                        </Space>
                                    }
                                >
                                    <Space direction="vertical" size="large" style={{ width: "100%" }}>
                                        {/* Attendance */}
                                        <div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                                <ScheduleOutlined style={{ fontSize: 16 }} />
                                                <Text strong>Take Attendance</Text>
                                            </div>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                    marginLeft: 24,
                                                    cursor: classId ? "pointer" : "default"
                                                }}
                                                onClick={handleTakeAttendance}
                                            >

                                                <Text strong style={{ color: canTakeAttendance ? "#389e0d" : "#999" }}>
                                                    Attendance - {studentGroupCode}
                                                </Text>
                                                <LinkOutlined style={{ fontSize: 12, color: classId ? "#389e0d" : "#999" }} />

                                            </div>

                                        </div>

                                        {/* Attendance Report */}
                                        <div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                                <TeamOutlined style={{ fontSize: 16 }} />
                                                <Text strong>Attendance report</Text>
                                            </div>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                    marginLeft: 24,
                                                    cursor: classId ? "pointer" : "default"
                                                }}
                                                onClick={handleViewAttendanceReport}
                                            >
                                                <Text style={{ color: classId ? "#1890ff" : "inherit" }}>
                                                    View Attendance Report
                                                </Text>
                                                <LinkOutlined style={{ fontSize: 12, color: classId ? "#1890ff" : "#666" }} />
                                            </div>
                                        </div>

                                    </Space>
                                </Card>
                            </div>
                        )
                    },
                    {
                        key: "resources",
                        label: "Resources & Links",
                        children: (
                            <div style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 16,
                                marginTop: 16
                            }}>
                                {/* Google Meet Card */}
                                <Card
                                    bodyStyle={{ padding: 16, textAlign: "center" }}
                                    hoverable
                                >
                                    <VideoCameraOutlined style={{ fontSize: 32, color: "#34a853", marginBottom: 12 }} />
                                    <Title level={5} style={{ marginBottom: 8 }}>Google Meet</Title>
                                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
                                        Join online meeting for this class
                                    </Text>
                                    <Button type="primary" ghost>
                                        Join Meeting <LinkOutlined />
                                    </Button>
                                </Card>

                                {/* Lesson Homework Card */}
                                <Card
                                    bodyStyle={{ padding: 16, textAlign: "center" }}
                                    hoverable
                                    onClick={canViewHomework ? handleOpenHomework : undefined}
                                    style={{ cursor: canViewHomework ? "pointer" : "default" }}
                                >
                                    <BookOutlined style={{ fontSize: 32, color: "#1890ff", marginBottom: 12 }} />
                                    <Title level={5} style={{ marginBottom: 8 }}>Lesson's Homework</Title>
                                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
                                        Access lesson homework and assignments
                                    </Text>
                                    <Button
                                        type="primary"
                                        ghost
                                        disabled={!canViewHomework}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            handleOpenHomework();
                                        }}
                                    >
                                        Open Homework <LinkOutlined />
                                    </Button>
                                </Card>

                                {/* Student Group Card */}
                                <Card
                                    bodyStyle={{ padding: 16, textAlign: "center" }}
                                    hoverable
                                >
                                    <TeamOutlined style={{ fontSize: 32, color: "#722ed1", marginBottom: 12 }} />
                                    <Title level={5} style={{ marginBottom: 8 }}>
                                        Class Name: {studentGroupCode}
                                    </Title>
                                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
                                        View student class details
                                    </Text>
                                    <Button 
                                        type="primary" 
                                        ghost
                                        onClick={handleViewStudents}
                                        disabled={!classId}
                                    >
                                        View <LinkOutlined />
                                    </Button>
                                </Card>

                                {/* Instructor Profile Card */}
                                <Card
                                    bodyStyle={{ padding: 16, textAlign: "center" }}
                                    hoverable
                                >
                                    <UserOutlined style={{ fontSize: 32, color: "#ff7a45", marginBottom: 12 }} />
                                    <Title level={5} style={{ marginBottom: 8 }}>Instructor Profile</Title>
                                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
                                        View instructor details and contact information
                                    </Text>
                                    <Button type="primary" ghost>
                                        View Profile <LinkOutlined />
                                    </Button>
                                </Card>
                            </div>
                        )
                    }
                ]}
            />

            {/* Footer Close Button */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <Button onClick={onClose}>
                    <CloseOutlined /> Close
                </Button>
            </div>
        </Modal>
    );
}

