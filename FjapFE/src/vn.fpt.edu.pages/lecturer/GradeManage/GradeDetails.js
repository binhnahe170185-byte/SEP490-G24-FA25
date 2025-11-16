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
  Progress
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

  const userId = user?.id ;
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
    const passMark = courseDetails?.passMark ?? 5.0;
    const passedStudents = students.filter(s => {
      const avg = parseFloat(s.average);
      if (isNaN(avg)) return false;
      const meetsScore = avg >= passMark;
      // Enforce attendance 80% if available
      const attendanceRate = s.attendanceRate;
      const meetsAttendance = attendanceRate == null ? true : attendanceRate >= 0.8;
      return meetsScore && meetsAttendance;
    }).length;
    const failedStudents = students.filter(s => {
      const avg = parseFloat(s.average);
      const attendanceRate = s.attendanceRate;
      const meetsAttendance = attendanceRate == null ? true : attendanceRate >= 0.8;
      return isNaN(avg) || avg < passMark || !meetsAttendance;
    }).length;
    const incompleteStudents = students.filter(s => !s.average || s.average === 0).length;
    const averageGrade = students.length > 0 
      ? (students.reduce((sum, s) => sum + (parseFloat(s.average) || 0), 0) / totalStudents).toFixed(2)
      : 0;
    const passRate = totalStudents > 0 ? ((passedStudents / totalStudents) * 100).toFixed(1) : 0;

    return {
      totalStudents,
      passedStudents,
      failedStudents,
      incompleteStudents,
      averageGrade,
      passRate
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
          if (!avg || avg === 0) {
            return <Tag color="default" icon={<ClockCircleOutlined />}>Inprogress</Tag>;
          }
          const passMark = courseDetails?.passMark ?? 5.0;
          const attendanceRate = record.attendanceRate;
          const meetsAttendance = attendanceRate == null ? true : attendanceRate >= 0.8;
          const isPassed = avg >= passMark && meetsAttendance;
          return (
            <Tag 
              color={isPassed ? "green" : "red"} 
              icon={isPassed ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            >
              {isPassed ? "Passed" : "Failed"}
            </Tag>
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