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
    const [attendanceData, setAttendanceData] = useState({ students: [], lessons: [] });
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
                const totalLesson = subject.totalLesson ?? subject.TotalLesson ?? 0;

                setClassInfo({
                    className: classData.className ?? classData.class_name ?? classData.ClassName ?? "-",
                    subjectCode: subject.subjectCode ?? subject.SubjectCode ?? classData.subjectCode ?? "-",
                    totalLesson: totalLesson
                });

                // Fetch attendance report
                const reportData = await AttendanceApi.getAttendanceReport(classId);

                if (!isMounted) return;

                // Normalize report data - API trả về data với lessons array
                const normalizedData = reportData.map((item, index) => {
                    const student = item.student ?? item.Student ?? {};
                    const user = student.user ?? student.User ?? {};
                    const firstName = user.firstName ?? user.FirstName ?? student.firstName ?? student.FirstName ?? "";
                    const lastName = user.lastName ?? user.LastName ?? student.lastName ?? student.LastName ?? "";
                    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() ||
                        (student.fullName ?? student.full_name ?? student.FullName ?? "");

                    // Lấy lessons array từ item
                    const lessons = item.lessons ?? item.Lessons ?? [];

                    // Tạo object với key là date_timeSlot để support multiple lessons per day
                    const lessonsByKey = {};
                    let absentCount = 0;

                    lessons.forEach(lesson => {
                        const date = lesson.date ?? lesson.Date ?? "";
                        const timeSlot = lesson.timeSlot ?? lesson.TimeSlot ?? "";
                        const status = lesson.status ?? lesson.Status ?? null;

                        if (date && timeSlot) {
                            // Use composite key: date_timeSlot
                            const lessonKey = `${date}_${timeSlot}`;
                            lessonsByKey[lessonKey] = {
                                status: status,
                                lessonId: lesson.lessonId ?? lesson.LessonId,
                                date: date,
                                timeSlot: timeSlot,
                            };
                        }

                        // Đếm số buổi vắng (chỉ đếm những buổi đã điểm danh là Absent)
                        if (status === "Absent" || status === "absent") {
                            absentCount++;
                        }
                    });

                    // Tính percent absent dựa trên totalLesson của subject
                    // Công thức: (số buổi vắng / tổng số buổi học của môn) * 100
                    const percentAbsent = totalLesson > 0
                        ? Math.round((absentCount / totalLesson) * 100)
                        : 0;

                    return {
                        key: student.studentId ?? student.StudentId ?? index,
                        studentId: student.studentId ?? student.StudentId ?? "-",
                        studentCode: student.studentCode ?? student.student_code ?? student.StudentCode ?? "-",
                        studentName: fullName || "-",
                        percentAbsent: percentAbsent,
                        absentCount: absentCount,
                        totalLesson: totalLesson,
                        lessonsByKey: lessonsByKey,
                        lessons: lessons,
                    };
                });

                // Lấy tất cả các lessons duy nhất (date + timeSlot) từ tất cả students
                const allLessons = new Map(); // lessonKey -> { date, timeSlot }
                normalizedData.forEach(item => {
                    Object.entries(item.lessonsByKey).forEach(([key, lesson]) => {
                        if (!allLessons.has(key)) {
                            allLessons.set(key, {
                                date: lesson.date,
                                timeSlot: lesson.timeSlot,
                                key: key
                            });
                        }
                    });
                });

                // Sắp xếp lessons theo date, rồi theo timeSlot
                const sortedLessons = Array.from(allLessons.values()).sort((a, b) => {
                    // Sort by date first
                    if (a.date !== b.date) {
                        return a.date.localeCompare(b.date);
                    }
                    // Then by time slot
                    return a.timeSlot.localeCompare(b.timeSlot);
                });

                setAttendanceData({
                    students: normalizedData,
                    lessons: sortedLessons,
                });
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

    // Tạo columns động dựa trên lessons
    const buildColumns = () => {
        const baseColumns = [
            {
                title: "No.",
                key: "no",
                width: 60,
                align: "center",
                fixed: "left",
                render: (_value, _record, index) => index + 1,
            },
            {
                title: "Student Name",
                dataIndex: "studentName",
                key: "studentName",
                fixed: "left",
                width: 200,
                render: (text) => <strong>{text || "-"}</strong>,
            },
            {
                title: "Absent",
                dataIndex: "percentAbsent",
                key: "percentAbsent",
                fixed: "left",
                width: 120,
                align: "center",
                render: (percent, record) => {
                    if (record.totalLesson === 0) {
                        return <Text style={{ color: "#666" }}>-</Text>;
                    }
                    // Màu xanh nếu <= 20%, đỏ nếu > 20%
                    const color = percent <= 20 ? "#52c41a" : "#ff4d4f";
                    return (
                        <Text strong style={{ color: color, fontSize: "14px" }}>
                            {percent}%
                        </Text>
                    );

                },
            },
        ];

        // Kiểm tra nếu attendanceData chưa có structure đúng
        if (!attendanceData || !attendanceData.lessons) {
            return baseColumns;
        }

        // Thêm columns cho mỗi lesson (date + timeSlot)
        const lessonColumns = attendanceData.lessons.map((lesson) => {
            // Parse date string "YYYY-MM-DD" without timezone conversion
            const [year, month, day] = lesson.date.split('-').map(Number);
            const dateObj = new Date(year, month - 1, day);

            const formattedDate = dateObj.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
            });

            return {
                title: (
                    <div style={{ textAlign: 'center', lineHeight: '1.3' }}>
                        <div style={{ fontWeight: 'bold' }}>{formattedDate}</div>
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                            {lesson.timeSlot}
                        </div>
                    </div>
                ),
                key: `lesson_${lesson.key}`,
                align: "center",
                width: 100,
                render: (_value, record) => {
                    const lessonData = record.lessonsByKey?.[lesson.key];
                    const status = lessonData?.status;

                    if (status === "Present" || status === "present") {
                        return <Text strong style={{ color: "#52c41a", fontSize: "16px" }}>P</Text>;
                    } else if (status === "Absent" || status === "absent") {
                        return <Text strong style={{ color: "#ff4d4f", fontSize: "16px" }}>A</Text>;
                    } else {
                        return <Text style={{ color: "#999", fontSize: "16px" }}>-</Text>;
                    }
                },
            };
        });

        return [...baseColumns, ...lessonColumns];
    };

    const columns = buildColumns();

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
                    <div style={{ overflowX: "auto" }}>
                        <Table
                            columns={columns}
                            dataSource={attendanceData.students || []}
                            loading={loading}
                            rowKey="key"
                            pagination={false}
                            bordered
                            scroll={{ x: "max-content" }}
                            locale={{
                                emptyText: "No attendance data available",
                            }}
                        />
                    </div>
                </Space>
            </Card>
        </div>
    );
}
