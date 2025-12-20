import React, { useState, useEffect, useCallback } from "react";
import {
  Breadcrumb,
  Card,
  Table,
  Button,
  message,
  Spin,
  Tag,
  Space,
  Statistic,
  Row,
  Col,
  Progress,
  Tooltip
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined
} from "@ant-design/icons";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../login/AuthContext";
import ManagerGrades from "../../../vn.fpt.edu.api/ManagerGrades";

export default function GradeDetails() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const base = location.pathname.startsWith('/lecturer') ? '/lecturer' : '/manager';

  const [courseDetails, setCourseDetails] = useState(null);
  const [students, setStudents] = useState([]);
  const [gradeComponentWeights, setGradeComponentWeights] = useState([]);
  const [loading, setLoading] = useState(true);

  const userId = user?.id;
  const courseFromState = location.state?.course;

  // Load course details và danh sách sinh viên
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ManagerGrades.getCourseDetails(userId, courseId);
      setCourseDetails(data);
      setGradeComponentWeights(data.gradeComponentWeights || []);

      // Map student data with dynamic grade components
      const mappedStudents = data.students.map(s => {
        const studentData = { ...s };
        console.log("GradeDetails - Student:", s.studentName, "GradeComponentScores:", s.gradeComponentScores); // Debug log

        // Map existing grade components to dynamic dataIndex using GradeComponentScores
        data.gradeComponentWeights?.forEach(weight => {
          const dataIndex = getDataIndexForComponent(weight.gradeTypeName, weight.subjectGradeTypeId);

          // Find score from GradeComponentScores
          const gradeComponentScore = s.gradeComponentScores?.find(gcs =>
            gcs.subjectGradeTypeId === weight.subjectGradeTypeId
          );

          console.log(`GradeDetails - Mapping ${weight.gradeTypeName} (${weight.subjectGradeTypeId}):`, gradeComponentScore?.score); // Debug log
          studentData[dataIndex] = gradeComponentScore?.score || null;
        });

        return studentData;
      });

      setStudents(mappedStudents);
    } catch (error) {
      console.error("Failed to load course details:", error);
      message.error("Failed to load course details");
    } finally {
      setLoading(false);
    }
  }, [userId, courseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate statistics
  const getStatistics = () => {
    const totalStudents = students.length;
    // Parse passMark to ensure it's a number
    const passMark = parseFloat(courseDetails?.passMark) || 5.0;
    const roundedPassMark = Math.round(passMark * 100) / 100;

    // Passed: Đã nhập điểm (có GradeId), >= passMark, và attendance >= 0.8
    const passedStudents = students.filter(s => {
      const hasGradeId = s.gradeId !== null && s.gradeId !== undefined;
      if (!hasGradeId) return false;

      const avg = parseFloat(s.average);
      if (isNaN(avg) || avg === null || avg === undefined) return false;

      // Round to avoid floating point precision issues
      const roundedAvg = Math.round(avg * 100) / 100;
      const meetsScore = roundedAvg >= roundedPassMark;

      // Enforce attendance 80% if available
      const attendanceRate = s.attendanceRate;
      const meetsAttendance = attendanceRate == null || attendanceRate === undefined ? true : attendanceRate >= 0.8;
      return meetsScore && meetsAttendance;
    }).length;

    // Failed: Đã nhập điểm (có GradeId), nhưng (< passMark hoặc attendance < 0.8)
    const failedStudents = students.filter(s => {
      const hasGradeId = s.gradeId !== null && s.gradeId !== undefined;
      if (!hasGradeId) return false;

      const avg = parseFloat(s.average);
      // Nếu đã có GradeId thì kể cả avg = 0 cũng tính là Failed
      if (isNaN(avg) || avg === null || avg === undefined) return false;

      // Round to avoid floating point precision issues
      const roundedAvg = Math.round(avg * 100) / 100;

      const attendanceRate = s.attendanceRate;
      const meetsAttendance = attendanceRate == null || attendanceRate === undefined ? true : attendanceRate >= 0.8;
      return roundedAvg < roundedPassMark || !meetsAttendance;
    }).length;

    // In Progress: Chưa nhập điểm (không có GradeId hoặc average = null/undefined)
    const incompleteStudents = students.filter(s => {
      const hasGradeId = s.gradeId !== null && s.gradeId !== undefined;
      if (!hasGradeId) return true;

      const avg = parseFloat(s.average);
      return isNaN(avg) || avg === null || avg === undefined;
    }).length;

    // Average grade chỉ tính cho những học sinh đã nhập điểm (có GradeId)
    const studentsWithGrades = students.filter(s => {
      const hasGradeId = s.gradeId !== null && s.gradeId !== undefined;
      if (!hasGradeId) return false;

      const avg = parseFloat(s.average);
      // Nếu đã có GradeId thì kể cả avg = 0 cũng tính vào average
      return !isNaN(avg) && avg !== null && avg !== undefined;
    });
    const averageGrade = studentsWithGrades.length > 0
      ? (studentsWithGrades.reduce((sum, s) => sum + parseFloat(s.average), 0) / studentsWithGrades.length).toFixed(2)
      : 0;
    const passRate = totalStudents > 0 ? ((passedStudents / totalStudents) * 100).toFixed(1) : 0;

    return {
      totalStudents,
      passedStudents,
      failedStudents,
      incompleteStudents,
      averageGrade,
      passRate,
      courseTotalLessons: students.length > 0 ? Math.max(...students.map(s => s.totalLessons || 0)) : 0
    };
  };

  const stats = getStatistics();

  const handleExport = async () => {
    try {
      message.loading("Exporting grades...", 0);
      await ManagerGrades.exportCourseGrades(userId, courseId);
      message.destroy();
      message.success("Grades exported successfully");
    } catch (error) {
      message.destroy();
      console.error("Failed to export grades:", error);
      message.error("Failed to export grades");
    }
  };

  // Helper function to map grade type names to data indices
  const getDataIndexForComponent = (gradeTypeName, subjectGradeTypeId) => {
    // Create a unique dataIndex based on SubjectGradeTypeId to avoid conflicts
    return `gradeComponent_${subjectGradeTypeId}`;
  };

  // Generate columns dynamically based on gradeComponentWeights
  const generateColumns = () => {
    const baseColumns = [
      {
        title: "No.",
        key: "index",
        width: 50,
        render: (_, __, index) => index + 1,
      },
      {
        title: "Student ID",
        dataIndex: "studentId",
        key: "studentId",
        width: 120,
      },
      {
        title: "Student Name",
        dataIndex: "studentName",
        key: "studentName",
        width: 170,
      },
      {
        title: "Email",
        dataIndex: "email",
        key: "email",
        width: 190,
      }
    ];

    // Add grade component columns dynamically
    // const gradeColumns = gradeComponentWeights.map(weight => {
    //   const dataIndex = getDataIndexForComponent(weight.gradeTypeName, weight.subjectGradeTypeId);
    //   return {
    //     title: `${weight.gradeTypeName} (${weight.weight}%)`,
    //     dataIndex: dataIndex,
    //     key: dataIndex,
    //     width: 150,
    //     align: "center",
    //     render: (value) => value != null ? value.toFixed(1) : "-",
    //   };
    // });

    const endColumns = [
      {
        title: "Attendance",
        key: "attendance",
        width: 130,
        align: "center",
        render: (_, record) => (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span>
              {record.presentLessons !== null && record.presentLessons !== undefined ? record.presentLessons : 0}
              /
              {record.totalLessons !== null && record.totalLessons !== undefined ? record.totalLessons : 0}
            </span>
            {record.attendanceRate !== null && record.attendanceRate !== undefined && (
              <span style={{ fontSize: 11, color: record.attendanceRate < 0.8 ? '#ff4d4f' : '#8c8c8c' }}>
                ({(record.attendanceRate * 100).toFixed(0)}%)
              </span>
            )}
          </div>
        ),
      },
      {
        title: "Average",
        dataIndex: "average",
        key: "average",
        width: 80,
        align: "center",
        render: (value) => (
          <span style={{ fontWeight: 600, fontSize: 15 }}>
            {value != null ? value.toFixed(1) : "-"}
          </span>
        ),
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 110,
        align: "center",
        render: (_, record) => {
          const avg = parseFloat(record.average);

          // Check if student has been graded (has GradeId) to distinguish between "not graded" and "graded with 0"
          const hasGradeId = record.gradeId !== null && record.gradeId !== undefined;

          // In Progress: Chưa nhập điểm (không có GradeId hoặc average = null/undefined)
          if (!hasGradeId || isNaN(avg) || avg === null || avg === undefined) {
            return <Tag color="default" icon={<ClockCircleOutlined />}>Inprogress</Tag>;
          }

          // Parse passMark to ensure it's a number
          const passMark = parseFloat(courseDetails?.passMark) || 5.0;
          const attendanceRate = record.attendanceRate;
          const meetsAttendance = attendanceRate == null || attendanceRate === undefined ? true : attendanceRate >= 0.8;

          // Round both values to 2 decimal places to avoid floating point precision issues
          const roundedAvg = Math.round(avg * 100) / 100;
          const roundedPassMark = Math.round(passMark * 100) / 100;

          // Passed if average >= passMark (with tolerance for floating point)
          // Note: If avg = 0 but has GradeId, it's already graded, so it's Failed
          const isPassed = roundedAvg >= roundedPassMark && meetsAttendance;

          let failReason = "";
          if (!isPassed) {
            if (!meetsAttendance) {
              failReason = `Attendance < 80% (${(attendanceRate * 100).toFixed(0)}%)`;
            } else if (roundedAvg < roundedPassMark) {
              failReason = `Average < ${roundedPassMark}`;
            }
          }

          return (
            <Tooltip title={failReason}>
              <Tag
                color={isPassed ? "green" : "red"}
                icon={isPassed ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
              >
                {isPassed ? "Passed" : "Failed"}
              </Tag>
            </Tooltip>
          );
        },
      }
    ];

    // return [...baseColumns, ...gradeColumns, ...endColumns];
    return [...baseColumns, ...endColumns];
  };

  const columns = generateColumns();

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>Loading course details...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: "Management" },
          { title: "Grade Management", onClick: () => navigate(`${base}/grades`) },
          { title: "Grade Details" },
        ]}
      />

      <div style={{ marginBottom: 24 }}>
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(`${base}/grades`)}
          >
            Back
          </Button>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => navigate(`${base}/grades/enter/${courseId}`, {
              state: { course: courseFromState }
            })}
          >
            Enter Grades
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
          >
            Export
          </Button>
        </Space>
      </div>

      {/* Course Info Card */}
      <Card style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, marginBottom: 16 }}>
          {courseFromState?.courseCode || courseDetails?.courseCode} - {courseFromState?.courseName || courseDetails?.courseName}
        </h2>
        <Space size="large">
          <span>📚 Class: {courseFromState?.className || courseDetails?.className}</span>
          <span>📅 Semester: {courseFromState?.semester || courseDetails?.semester}</span>
          <span>👨‍🎓 Total Students: {stats.totalStudents}</span>
          <span>✅ Pass mark: {courseDetails?.passMark ?? 5.0}</span>
          <span>📖 Total Lessons: {stats.courseTotalLessons}</span>
        </Space>
      </Card>

      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Average Grade"
              value={stats.averageGrade}
              precision={2}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Passed"
              value={stats.passedStudents}
              suffix={`/ ${stats.totalStudents}`}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Failed"
              value={stats.failedStudents}
              suffix={`/ ${stats.totalStudents}`}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Inprogress"
              value={stats.incompleteStudents}
              suffix={`/ ${stats.totalStudents}`}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Pass Rate Progress */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontWeight: 500, minWidth: 100 }}>Pass Rate:</span>
          <Progress
            percent={parseFloat(stats.passRate)}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
            style={{ flex: 1 }}
          />
        </div>
      </Card>

      {/* Students Table */}
      <Card title={<span style={{ fontSize: 16, fontWeight: 600 }}>Students Grade List</span>}>
        <Table
          columns={columns}
          dataSource={students}
          rowKey="studentId"
          // scroll={{ x: 1400 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} students`,
          }}
        />
      </Card>
    </div>
  );
}