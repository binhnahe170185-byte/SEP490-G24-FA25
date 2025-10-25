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
  
  const [courseDetails, setCourseDetails] = useState(null);
  const [students, setStudents] = useState([]);
  const [gradeComponentWeights, setGradeComponentWeights] = useState([]);
  const [loading, setLoading] = useState(true);

  const managerId = user?.managerId || "MOCK_MANAGER_123";
  const courseFromState = location.state?.course;

  // Load course details và danh sách sinh viên
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ManagerGrades.getCourseDetails(managerId, courseId);
      console.log("GradeDetails - API Response:", data); // Debug log
      console.log("GradeDetails - Students data:", data.students); // Debug log
      
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
  }, [managerId, courseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate statistics
  const getStatistics = () => {
    const totalStudents = students.length;
    const passedStudents = students.filter(s => parseFloat(s.average) >= 5.0).length;
    const failedStudents = students.filter(s => parseFloat(s.average) < 5.0).length;
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
      await ManagerGrades.exportCourseGrades(managerId, courseId);
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
        width: 5,
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
        width: 200,
      },
      {
        title: "Email",
        dataIndex: "email",
        key: "email",
        width: 220,
      }
    ];

    // Add grade component columns dynamically
    const gradeColumns = gradeComponentWeights.map(weight => {
      const dataIndex = getDataIndexForComponent(weight.gradeTypeName, weight.subjectGradeTypeId);
      return {
        title: `${weight.gradeTypeName} (${weight.weight}%)`,
        dataIndex: dataIndex,
        key: dataIndex,
        width: 150,
        align: "center",
        render: (value) => value != null ? value.toFixed(1) : "-",
      };
    });

    const endColumns = [
      {
        title: "Average",
        dataIndex: "average",
        key: "average",
        width: 100,
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
            return <Tag color="default" icon={<ClockCircleOutlined />}>Incomplete</Tag>;
          }
          const isPassed = avg >= 5.0;
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

    return [...baseColumns, ...gradeColumns, ...endColumns];
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
          { title: "Grade Management", onClick: () => navigate("/manager/grades") },
          { title: "Grade Details" },
        ]}
      />

      <div style={{ marginBottom: 24 }}>
        <Space>
          <Button 
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/manager/grades")}
          >
            Back
          </Button>
          <Button 
            type="primary"
            icon={<EditOutlined />}
            onClick={() => navigate(`/manager/grades/enter/${courseId}`, {
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
              title="Incomplete"
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
          scroll={{ x: 1400 }}
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