import React, { useState, useEffect, useCallback } from "react";
import { 
  Breadcrumb, 
  Card, 
  Table, 
  Input, 
  Button, 
  message, 
  Spin,
  Tag,
  Space,
  Modal
} from "antd";
import { 
  SaveOutlined, 
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined 
} from "@ant-design/icons";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../login/AuthContext";
import ManagerGrades from "../../../vn.fpt.edu.api/ManagerGrades";

export default function EnterGrades() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [courseDetails, setCourseDetails] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedData, setEditedData] = useState({});

  const userId = user?.id ;
  const courseFromState = location.state?.course;

  // Load course details và danh sách sinh viên
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ManagerGrades.getCourseDetails(userId, courseId);
      setCourseDetails(data);
      setStudents(data.students);
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

  // Handle input change
  const handleGradeChange = (studentId, field, value) => {
    // Validate number input
    const numValue = parseFloat(value);
    if (value !== "" && (isNaN(numValue) || numValue < 0 || numValue > 10)) {
      message.warning("Grade must be between 0 and 10");
      return;
    }

    setEditedData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value === "" ? null : numValue
      }
    }));
  };

  // Save all changes
  const handleSaveAll = async () => {
    if (Object.keys(editedData).length === 0) {
      message.info("No changes to save");
      return;
    }

    Modal.confirm({
      title: "Save Changes",
      content: `You are about to update grades for ${Object.keys(editedData).length} student(s). Continue?`,
      okText: "Save",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          setSaving(true);
          
          // Save từng student
          for (const studentId in editedData) {
            await ManagerGrades.updateStudentGrade(
              userId,
              courseId,
              studentId,
              editedData[studentId]
            );
          }

          message.success("Grades saved successfully");
          setEditedData({});
          loadData(); // Reload data
        } catch (error) {
          console.error("Failed to save grades:", error);
          message.error("Failed to save grades");
        } finally {
          setSaving(false);
        }
      }
    });
  };

  // Calculate average
  const calculateAverage = (record) => {
    const grades = [
      record.participation,
      record.assignment,
      record.progressTest1,
      record.progressTest2,
      record.finalExam
    ].filter(g => g != null);
    
    if (grades.length === 0) return 0;
    return (grades.reduce((sum, g) => sum + g, 0) / grades.length).toFixed(1);
  };

  const columns = [
    {
      title: "Student ID",
      dataIndex: "studentId",
      key: "studentId",
      width: 120,
      fixed: "left",
    },
    {
      title: "Student Name",
      dataIndex: "studentName",
      key: "studentName",
      width: 200,
      fixed: "left",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 200,
    },
    {
      title: "Participation (10%)",
      dataIndex: "participation",
      key: "participation",
      width: 150,
      align: "center",
      render: (value, record) => (
        <Input
          type="number"
          min={0}
          max={10}
          step={0.1}
          value={editedData[record.studentId]?.participation ?? value}
          onChange={(e) => handleGradeChange(record.studentId, "participation", e.target.value)}
          style={{ width: 80 }}
        />
      ),
    },
    {
      title: "Assignment (20%)",
      dataIndex: "assignment",
      key: "assignment",
      width: 150,
      align: "center",
      render: (value, record) => (
        <Input
          type="number"
          min={0}
          max={10}
          step={0.1}
          value={editedData[record.studentId]?.assignment ?? value}
          onChange={(e) => handleGradeChange(record.studentId, "assignment", e.target.value)}
          style={{ width: 80 }}
        />
      ),
    },
    {
      title: "Progress Test 1 (15%)",
      dataIndex: "progressTest1",
      key: "progressTest1",
      width: 150,
      align: "center",
      render: (value, record) => (
        <Input
          type="number"
          min={0}
          max={10}
          step={0.1}
          value={editedData[record.studentId]?.progressTest1 ?? value}
          onChange={(e) => handleGradeChange(record.studentId, "progressTest1", e.target.value)}
          style={{ width: 80 }}
        />
      ),
    },
    {
      title: "Progress Test 2 (15%)",
      dataIndex: "progressTest2",
      key: "progressTest2",
      width: 150,
      align: "center",
      render: (value, record) => (
        <Input
          type="number"
          min={0}
          max={10}
          step={0.1}
          value={editedData[record.studentId]?.progressTest2 ?? value}
          onChange={(e) => handleGradeChange(record.studentId, "progressTest2", e.target.value)}
          style={{ width: 80 }}
        />
      ),
    },
    {
      title: "Final Exam (40%)",
      dataIndex: "finalExam",
      key: "finalExam",
      width: 150,
      align: "center",
      render: (value, record) => (
        <Input
          type="number"
          min={0}
          max={10}
          step={0.1}
          value={editedData[record.studentId]?.finalExam ?? value}
          onChange={(e) => handleGradeChange(record.studentId, "finalExam", e.target.value)}
          style={{ width: 80 }}
        />
      ),
    },
    {
      title: "Average",
      key: "average",
      width: 100,
      align: "center",
      fixed: "right",
      render: (_, record) => {
        const avg = calculateAverage(record);
        return (
          <span style={{ fontWeight: 600 }}>
            {avg}
          </span>
        );
      },
    },
    {
      title: "Status",
      key: "status",
      width: 100,
      align: "center",
      fixed: "right",
      render: (_, record) => {
        const avg = parseFloat(calculateAverage(record));
        const passMark = courseDetails?.passMark ?? 5.0;
        const isPassed = avg >= passMark;
        return (
          <Tag color={isPassed ? "green" : "red"} icon={isPassed ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
            {isPassed ? "Passed" : "Failed"}
          </Tag>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>Loading course data...</p>
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
          { title: "Enter Grades" },
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
        </Space>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ margin: 0, marginBottom: 8 }}>
              {courseFromState?.courseCode || courseDetails?.courseCode} - {courseFromState?.courseName || courseDetails?.courseName}
            </h2>
            <Space size="large">
              <span>📚 Class: {courseFromState?.className || courseDetails?.className}</span>
              <span>📅 Semester: {courseFromState?.semester || courseDetails?.semester}</span>
              <span>👨‍🎓 Students: {students.length}</span>
            </Space>
          </div>
          <Button
            type="primary"
            size="large"
            icon={<SaveOutlined />}
            onClick={handleSaveAll}
            loading={saving}
            disabled={Object.keys(editedData).length === 0}
          >
            Save All Changes {Object.keys(editedData).length > 0 && `(${Object.keys(editedData).length})`}
          </Button>
        </div>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={students}
          rowKey="studentId"
          scroll={{ x: 1500 }}
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