import React, { useState } from "react";
import { Modal, Tabs, Typography, Card, Avatar, Button, Space } from "antd";
import {
    CalendarOutlined,
    ClockCircleOutlined,
    UserOutlined,
    TeamOutlined,
    CloseOutlined,
    VideoCameraOutlined,
    BookOutlined,
    LinkOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import LecturerProfileModal from "./LecturerProfileModal";

const { Title, Text } = Typography;

const STATUS = {
    pending: { color: "#3b82f6", text: "Not Yet" },
    done: { color: "#22c55e", text: "Present" },
    absent: { color: "#ef4444", text: "Absent" },
};

export default function LessonDetailModal({ visible, lesson, onClose }) {
    const navigate = useNavigate();
    const [lecturerModalVisible, setLecturerModalVisible] = useState(false);

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

    const handleViewStudents = () => {
        if (classId) {
            navigate(`/student/class/${classId}/students`);
            onClose();
        }
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
                                        {/* Instructor */}
                                        <div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                                <UserOutlined style={{ fontSize: 16 }} />
                                                <Text strong>Lecturer</Text>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 24 }}>
                                                <Avatar size={24} style={{ backgroundColor: "#f0f0f0", color: "#000" }}>
                                                    {instructorCode.charAt(0)}
                                                </Avatar>
                                                <Text>{instructorCode}</Text>
                                                <LinkOutlined style={{ fontSize: 12, color: "#666" }} />
                                            </div>
                                        </div>

                                        {/* List student in class */}
                                        <div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                                <TeamOutlined style={{ fontSize: 16 }} />
                                                <Text strong>Class Name</Text>
                                            </div>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                    marginLeft: 24,
                                                    cursor: classId ? "pointer" : "default"
                                                }}
                                                onClick={handleViewStudents}
                                            >
                                                <Avatar size={24} style={{ backgroundColor: "#f0f0f0", color: "#000" }}>
                                                    {studentGroupCode.charAt(0)}
                                                </Avatar>
                                                <Text style={{ color: classId ? "#1890ff" : "inherit" }}>
                                                    {studentGroupCode}
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

                                {/* EduNext Card */}
                                <Card
                                    bodyStyle={{ padding: 16, textAlign: "center" }}
                                    hoverable
                                >
                                    <BookOutlined style={{ fontSize: 32, color: "#1890ff", marginBottom: 12 }} />
                                    <Title level={5} style={{ marginBottom: 8 }}>EduNext</Title>
                                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
                                        Access course materials and resources
                                    </Text>
                                    <Button type="primary" ghost>
                                        Open EduNext <LinkOutlined />
                                    </Button>
                                </Card>

                                {/* Student Group Card */}
                                <Card
                                    bodyStyle={{ padding: 16, textAlign: "center" }}
                                    hoverable
                                >
                                    <TeamOutlined style={{ fontSize: 32, color: "#722ed1", marginBottom: 12 }} />
                                    <Title level={5} style={{ marginBottom: 8 }}>Student Group</Title>
                                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
                                        View student group details
                                    </Text>
                                    <Button type="primary" ghost>
                                        View Group <LinkOutlined />
                                    </Button>
                                </Card>

                                {/* Lecturer Profile Card */}
                                <Card
                                    bodyStyle={{ padding: 16, textAlign: "center" }}
                                    hoverable
                                    onClick={() => {
                                        if (lesson?.lectureId) {
                                            setLecturerModalVisible(true);
                                        }
                                    }}
                                    style={{ cursor: lesson?.lectureId ? "pointer" : "default" }}
                                >
                                    <UserOutlined style={{ fontSize: 32, color: "#ff7a45", marginBottom: 12 }} />
                                    <Title level={5} style={{ marginBottom: 8 }}>Lecturer Profile</Title>
                                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
                                        View lecturer details and contact information
                                    </Text>
                                    <Button 
                                        type="primary" 
                                        ghost
                                        disabled={!lesson?.lectureId}
                                    >
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

            {/* Lecturer Profile Modal */}
            <LecturerProfileModal
                visible={lecturerModalVisible}
                lecturerId={lesson?.lectureId}
                onClose={() => setLecturerModalVisible(false)}
            />
        </Modal>
    );
}

