import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Table, Typography, Spin, Alert } from "antd";
import { UserOutlined } from "@ant-design/icons";
import ClassListApi from "../../../vn.fpt.edu.api/ClassList";
import "./ClassStudentsList.css";

const { Title, Text } = Typography;

// Function to split name into first name and last name
const splitName = (fullName) => {
    if (!fullName || typeof fullName !== "string") {
        return { firstName: "", lastName: "", fullName: "" };
    }

    const parts = fullName.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
        return { firstName: "", lastName: "", fullName: "" };
    }

    if (parts.length === 1) {
        return { firstName: parts[0], lastName: "", fullName };
    }

    // 2 or more parts: first part is last name, rest is first name
    const lastName = parts[0];
    const firstName = parts.slice(1).join(" ");

    return { firstName, lastName, fullName };
};

export default function ClassStudentsList() {
    const { classId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [classInfo, setClassInfo] = useState(null);
    const [students, setStudents] = useState([]);
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

                const data = await ClassListApi.getStudents(classId);

                if (!isMounted) return;

                if (!data) {
                    setClassInfo(null);
                    setStudents([]);
                    setError("Class not found");
                    return;
                }

                const subject = data.subject ?? data.Subject ?? {};
                const studentsList = data.students ?? data.Students ?? [];

                // Normalize and split student names
                const normalizedStudents = studentsList.map((item, index) => {
                    const user = item.user ?? item.User ?? {};
                    const firstName = user.firstName ?? user.FirstName ?? item.first_name ?? item.firstName ?? item.FirstName ?? "";
                    const lastName = user.lastName ?? user.LastName ?? item.last_name ?? item.lastName ?? item.LastName ?? "";
                    const fallbackName = item.full_name ?? item.fullName ?? item.FullName ?? "";

                    // Build full name
                    const nameParts = [firstName, lastName].filter(Boolean);
                    const fullNameFromParts = nameParts.length > 0 ? nameParts.join(" ").trim() : "";
                    const finalFullName = fullNameFromParts || fallbackName || "";

                    // Split name into first name and last name
                    const nameComponents = splitName(finalFullName);

                    return {
                        key: item.studentId ?? item.StudentId ?? item.studentCode ?? item.StudentCode ?? index,
                        studentId: item.studentId ?? item.StudentId ?? "-",
                        studentCode: item.student_code ?? item.studentCode ?? item.StudentCode ?? "-",
                        firstName: nameComponents.firstName,
                        lastName: nameComponents.lastName,
                        fullName: nameComponents.fullName,
                    };
                });

                setStudents(normalizedStudents);
                setClassInfo({
                    classId: data.classId ?? data.ClassId ?? classId,
                    className: data.className ?? data.class_name ?? data.ClassName ?? "-",
                    subjectName: subject.subjectName ?? subject.SubjectName ?? "-",
                    subjectCode: subject.subjectCode ?? subject.SubjectCode ?? data.subjectCode ?? "-",
                });
            } catch (err) {
                console.error("Failed to load class students", err);
                if (isMounted) {
                    setError("Unable to load student list. Please try again later.");
                    setClassInfo(null);
                    setStudents([]);
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

    const columns = [
        {
            title: "No.",
            key: "no",
            width: 80,
            align: "center",
            render: (_value, _record, index) => index + 1,
        },
        {
            title: "Student ID",
            dataIndex: "studentCode",
            key: "studentCode",
            width: 120,
            render: (value, record) => (
                <a
                    href={`#`}
                    onClick={(e) => {
                        e.preventDefault();
                        // Navigate to student detail if needed
                        // navigate(`/student/${record.studentId}`);
                    }}
                    style={{ color: "#1890ff" }}
                >
                    {value || "-"}
                </a>
            ),
        },
        {
            title: "First Name",
            dataIndex: "firstName",
            key: "firstName",
            render: (value) => value || "-",
        },
        {
            title: "Last Name",
            dataIndex: "lastName",
            key: "lastName",
            render: (value) => value || "-",
        },

        {
            title: "Full Name",
            dataIndex: "fullName",
            key: "fullName",
            render: (value) => (
                <span>
                    <UserOutlined style={{ color: "#8c8c8c", marginRight: 8 }} />
                    {value || "-"}
                </span>
            ),
        },
    ];

    if (loading) {
        return (
            <div className="class-students-container">
                <div className="loading-wrapper">
                    <Spin size="large" />
                </div>
            </div>
        );
    }

    if (error && !classInfo) {
        return (
            <div className="class-students-container">
                <Alert
                    message="Error"
                    description={error}
                    type="error"
                    showIcon
                    style={{ margin: "24px" }}
                />
            </div>
        );
    }

    return (
        <div className="class-students-container">
            {/* Header Section */}
            <div className="class-students-header">
                <div className="header-left">
                    <div className="course-icon">
                        <span style={{ fontSize: 24 }}>🎓</span>
                    </div>
                    <div className="header-info">
                        <Title level={3} style={{ margin: 0, fontWeight: 600 }}>
                            {classInfo?.subjectName
                                ? `${classInfo.subjectName} (${classInfo.subjectCode})`
                                : "Unknown Course"}
                        </Title>
                        <Text className="group-name">
                            Class {classInfo?.className || "N/A"}
                        </Text>
                    </div>
                </div>
                <div className="header-right">
                    <Text className="total-students">
                        Total: {students.length} student{students.length !== 1 ? 's' : ''}
                    </Text>
                </div>
            </div>

            {/* Main Content Card */}
            <Card className="students-card">
                <div className="card-header">
                    <Title level={4} style={{ margin: 0, fontWeight: 600 }}>
                        Class Members
                    </Title>
                    <Text className="card-subtitle">
                        Students registered in {classInfo?.className || "N/A"} for {" "}
                        {classInfo?.subjectName
                            ? `${classInfo.subjectName} (${classInfo.subjectCode})`
                            : "Unknown"}
                    </Text>
                </div>

                <Table
                    columns={columns}
                    dataSource={students}
                    loading={loading}
                    rowKey="key"
                    pagination={false}
                    className="students-table"
                    locale={{
                        emptyText: "No students in this class.",
                    }}
                />
            </Card>
        </div>
    );
}
