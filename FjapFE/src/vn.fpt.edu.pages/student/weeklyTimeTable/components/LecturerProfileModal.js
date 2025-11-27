import React, { useState, useEffect } from "react";
import { Modal, Typography, Avatar, Descriptions, Spin, message } from "antd";
import { UserOutlined, MailOutlined, CloseOutlined } from "@ant-design/icons";
import { api } from "../../../../vn.fpt.edu.api/http";

const { Title, Text } = Typography;

export default function LecturerProfileModal({ visible, lecturerId, onClose }) {
    const [lecturer, setLecturer] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && lecturerId) {
            fetchLecturerProfile();
        } else {
            setLecturer(null);
        }
    }, [visible, lecturerId]);

    const fetchLecturerProfile = async () => {
        if (!lecturerId) return;
        
        setLoading(true);
        try {
            const response = await api.get(`/api/Lecturers/${lecturerId}`);
            const data = response.data?.data || response.data;
            setLecturer(data);
        } catch (error) {
            console.error("Error fetching lecturer profile:", error);
            message.error("Failed to load lecturer profile");
            onClose();
        } finally {
            setLoading(false);
        }
    };

    if (!visible) return null;

    return (
        <Modal
            open={visible}
            onCancel={onClose}
            footer={null}
            width={600}
            closeIcon={null}
            style={{ top: 20 }}
        >
            {loading ? (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
                    <Spin size="large" />
                </div>
            ) : lecturer ? (
                <div style={{ padding: "8px 0" }}>
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                        <Title level={4} style={{ margin: 0 }}>Lecturer Profile</Title>
                        <button
                            onClick={onClose}
                            style={{
                                border: "none",
                                background: "transparent",
                                cursor: "pointer",
                                fontSize: 18,
                                padding: 0,
                                display: "flex",
                                alignItems: "center"
                            }}
                        >
                            <CloseOutlined />
                        </button>
                    </div>

                    {/* Avatar and Basic Info */}
                    <div style={{ textAlign: "center", marginBottom: 32 }}>
                        <Avatar
                            size={120}
                            src={lecturer.avatar}
                            icon={!lecturer.avatar && <UserOutlined />}
                            style={{ marginBottom: 16 }}
                        />
                        <Title level={3} style={{ margin: "8px 0" }}>
                            {lecturer.fullName || `${lecturer.firstName} ${lecturer.lastName}`}
                        </Title>
                        <Text type="secondary" style={{ fontSize: 16 }}>
                            {lecturer.lecturerCode}
                        </Text>
                    </div>

                    {/* Details */}
                    <Descriptions column={1} bordered>
                        <Descriptions.Item label="Lecturer Code">
                            {lecturer.lecturerCode}
                        </Descriptions.Item>
                        <Descriptions.Item label="Full Name">
                            {lecturer.fullName || `${lecturer.firstName} ${lecturer.lastName}`}
                        </Descriptions.Item>
                        <Descriptions.Item label={<><MailOutlined /> Email</>}>
                            {lecturer.email}
                        </Descriptions.Item>
                        <Descriptions.Item label="Gender">
                            {lecturer.gender}
                        </Descriptions.Item>
                    </Descriptions>
                </div>
            ) : (
                <div style={{ textAlign: "center", padding: 40 }}>
                    <Text type="secondary">No lecturer information available</Text>
                </div>
            )}
        </Modal>
    );
}

