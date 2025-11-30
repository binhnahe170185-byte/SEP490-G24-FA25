import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Table, Typography, Spin, Button, Space } from "antd";
import { ArrowLeftOutlined, BarChartOutlined } from "@ant-design/icons";
import AttendanceApi from "../../../vn.fpt.edu.api/Attendance";
import ClassListApi from "../../../vn.fpt.edu.api/ClassList";
import "./AttendanceReport.css";

const { Title, Text } = Typography;

export default function AttendanceReport() {
    const { classId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [classInfo, setClassInfo] = useState(null);
    const [attendanceData, setAttendanceData] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!classId) {
            setError("Class ID is required");
            setLoading(false);
            return;
        }

        let isMounted = true;

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Fetch class info
                const classData = await ClassListApi.getStudents(classId);
                
                if (!isMounted) return;

                if (!classData) {
                    setError("Class not found");
                    return;
                }

                const subject = classData.subject ?? classData.Subject ?? {};
                setClassInfo({
                   
                    className: classData.className ?? classData.class_name ?? classData.ClassName ?? "-",
                    subjectCode: subject.subjectCode ?? subject.SubjectCode ?? classData.subjectCode ?? "-"
                });

                // Fetch attendance report
                const reportData = await AttendanceApi.getAttendanceReport(classId);
                
                if (!isMounted) return;

                // Normalize report data
                const normalizedData = reportData.map((item, index) => {
                    const student = item.student ?? item.Student ?? {};
                    const user = student.user ?? student.User ?? {};
                    const firstName = user.firstName ?? user.FirstName ?? student.firstName ?? student.FirstName ?? "";
                    const lastName = user.lastName ?? user.LastName ?? student.lastName ?? student.LastName ?? "";
                    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || 
                                    (student.fullName ?? student.full_name ?? student.FullName ?? "");

                    return {
                        key: student.studentId ?? student.StudentId ?? index,
                        studentId: student.studentId ?? student.StudentId ?? "-",
                        studentCode: student.studentCode ?? student.student_code ?? student.StudentCode ?? "-",
                        studentName: fullName || "-",
                        presentCount: item.presentCount ?? item.present_count ?? item.PresentCount ?? 0,
                        absentCount: item.absentCount ?? item.absent_count ?? item.AbsentCount ?? 0,
                    };
                });

                setAttendanceData(normalizedData);
            } catch (err) {
                console.error("Error fetching attendance report:", err);
                if (isMounted) {
                    setError(err.response?.data?.message || err.message || "Failed to load attendance report");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            isMounted = false;
        };
    }, [classId]);

    const handleBack = () => {
        navigate('/lecturer/schedule');
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
            title: "Student Name",
            dataIndex: "studentName",
            key: "studentName",
            render: (text) => <strong>{text || "-"}</strong>,
        },
        {
            title: "Present",
            dataIndex: "presentCount",
            key: "presentCount",
            align: "center",
            render: (count) => <Text strong style={{ color: "#52c41a" }}>{count ?? 0}</Text>,
        },
        {
            title: "Absent",
            dataIndex: "absentCount",
            key: "absentCount",
            align: "center",
            render: (count) => <Text strong style={{ color: "#ff4d4f" }}>{count ?? 0}</Text>,
        },
    ];

    if (loading) {
        return (
            <div style={{ padding: "24px", textAlign: "center" }}>
                <Spin size="large" />
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: "24px" }}>
                <Card>
                    <Space direction="vertical" style={{ width: "100%" }}>
                        <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
                            Back
                        </Button>
                        <Text type="danger">{error}</Text>
                    </Space>
                </Card>
            </div>
        );
    }

    return (
        <div style={{ padding: "24px" }}>
            <Card>
                <Space direction="vertical" size="large" style={{ width: "100%" }}>
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <Button 
                                icon={<ArrowLeftOutlined />} 
                                onClick={handleBack}
                                style={{ marginBottom: 16 }}
                            >
                                Back
                            </Button>
                            <div>
                                <Title level={2} style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                                    <BarChartOutlined />
                                    Attendance Report
                                </Title>
                                {classInfo && (
                                    <Text type="secondary" style={{ fontSize: 16, marginTop: 8, display: "block" }}>
                                        {classInfo.className} - {classInfo.subjectName} ({classInfo.subjectCode})
                                    </Text>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <Table
                        columns={columns}
                        dataSource={attendanceData}
                        loading={loading}
                        rowKey="key"
                        pagination={false}
                        bordered
                        locale={{
                            emptyText: "No attendance data available",
                        }}
                    />
                </Space>
            </Card>
        </div>
    );
}

