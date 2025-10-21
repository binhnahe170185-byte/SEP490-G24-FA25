import React, { useState, useEffect, useCallback } from "react";
import { 
  Breadcrumb, 
  Card, 
  Table, 
  Button, 
  message, 
  Spin,
  InputNumber,
  Space,
  Modal,
  Form
} from "antd";
import { 
  ArrowLeftOutlined,
  SaveOutlined,
  EyeOutlined
} from "@ant-design/icons";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../login/AuthContext";
import ManagerGrades from "../../../vn.fpt.edu.api/ManagerGrades";

export default function GradeEntry() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [courseDetails, setCourseDetails] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingKey, setEditingKey] = useState('');
  const [form] = Form.useForm();

  const managerId = user?.managerId || "MOCK_MANAGER_123";
  const courseFromState = location.state?.course;

  // Load course details
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ManagerGrades.getCourseDetails(managerId, courseId);
      setCourseDetails(data);
      setStudents(data.students.map(s => ({ ...s, key: s.studentId })));
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

  const isEditing = (record) => record.key === editingKey;

  const edit = (record) => {
    form.setFieldsValue({
      participation: record.participation,
      assignment: record.assignment,
      progressTest1: record.progressTest1,
      progressTest2: record.progressTest2,
      finalExam: record.finalExam,
      ...record,
    });
    setEditingKey(record.key);
  };

  const cancel = () => {
    setEditingKey('');
  };

  const save = async (key) => {
    try {
      const row = await form.validateFields();
      const newData = [...students];
      const index = newData.findIndex((item) => key === item.key);

      if (index > -1) {
        const item = newData[index];
        
        // Calculate average
        const weights = {
          participation: 0.1,
          assignment: 0.1,
          progressTest1: 0.15,
          progressTest2: 0.15,
          finalExam: 0.5
        };

        const average = (
          (row.participation || 0) * weights.participation +
          (row.assignment || 0) * weights.assignment +
          (row.progressTest1 || 0) * weights.progressTest1 +
          (row.progressTest2 || 0) * weights.progressTest2 +
          (row.finalExam || 0) * weights.finalExam
        );

        const status = average >= 5.0 ? "Passed" : "Failed";

        const updatedItem = {
          ...item,
          ...row,
          average: parseFloat(average.toFixed(2)),
          status
        };

        newData.splice(index, 1, updatedItem);

        // Save to API
        setSaving(true);
        await ManagerGrades.updateStudentGrade(
          managerId, 
          courseId, 
          item.studentId, 
          row
        );

        setStudents(newData);
        setEditingKey('');
        message.success("Grade updated successfully");
      }
    } catch (errInfo) {
      console.log('Validate Failed:', errInfo);
      message.error("Failed to update grade");
    } finally {
      setSaving(false);
    }
  };

  const EditableCell = ({
    editing,
    dataIndex,
    title,
    inputType,
    record,
    index,
    children,
    ...restProps
  }) => {
    return (
      <td {...restProps}>
        {editing ? (
          <Form.Item
            name={dataIndex}
            style={{ margin: 0 }}
            rules={[
              {
                validator: (_, value) => {
                  if (value === null || value === undefined || value === '') {
                    return Promise.resolve();
                  }
                  if (value < 0 || value > 10) {
                    return Promise.reject(new Error('Grade must be between 0 and 10'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber
              min={0}
              max={10}
              step={0.1}
              precision={1}
              style={{ width: '100%' }}
            />
          </Form.Item>
        ) : (
          children
        )}
      </td>
    );
  };

  const columns = [
    {
      title: "No.",
      key: "index",
      width: 60,
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
      title: "Participation (10%)",
      dataIndex: "participation",
      key: "participation",
      width: 150,
      align: "center",
      editable: true,
      render: (value) => value != null ? value.toFixed(1) : "-",
    },
    {
      title: "Assignment (10%)",
      dataIndex: "assignment",
      key: "assignment",
      width: 140,
      align: "center",
      editable: true,
      render: (value) => value != null ? value.toFixed(1) : "-",
    },
    {
      title: "PT1 (15%)",
      dataIndex: "progressTest1",
      key: "progressTest1",
      width: 120,
      align: "center",
      editable: true,
      render: (value) => value != null ? value.toFixed(1) : "-",
    },
    {
      title: "PT2 (15%)",
      dataIndex: "progressTest2",
      key: "progressTest2",
      width: 120,
      align: "center",
      editable: true,
      render: (value) => value != null ? value.toFixed(1) : "-",
    },
    {
      title: "Final (50%)",
      dataIndex: "finalExam",
      key: "finalExam",
      width: 130,
      align: "center",
      editable: true,
      render: (value) => value != null ? value.toFixed(1) : "-",
    },
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
      title: "Action",
      key: "action",
      width: 150,
      align: "center",
      render: (_, record) => {
        const editable = isEditing(record);
        return editable ? (
          <Space>
            <Button 
              type="link" 
              onClick={() => save(record.key)}
              loading={saving}
            >
              Save
            </Button>
            <Button type="link" onClick={cancel}>
              Cancel
            </Button>
          </Space>
        ) : (
          <Button
            type="link"
            disabled={editingKey !== ''}
            onClick={() => edit(record)}
          >
            Edit
          </Button>
        );
      },
    },
  ];

  const mergedColumns = columns.map((col) => {
    if (!col.editable) {
      return col;
    }
    return {
      ...col,
      onCell: (record) => ({
        record,
        inputType: 'number',
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record),
      }),
    };
  });

  const handleSaveAll = () => {
    Modal.confirm({
      title: 'Save all changes?',
      content: 'Are you sure you want to save all grade changes?',
      okText: 'Yes',
      cancelText: 'No',
      onOk: async () => {
        try {
          message.success("All grades saved successfully");
          navigate(`/manager/grades/${courseId}`, {
            state: { course: courseFromState }
          });
        } catch (error) {
          message.error("Failed to save grades");
        }
      },
    });
  };

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
          <Button 
            icon={<EyeOutlined />}
            onClick={() => navigate(`/manager/grades/${courseId}`, {
              state: { course: courseFromState }
            })}
          >
            View Details
          </Button>
          <Button 
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSaveAll}
          >
            Save All Changes
          </Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, marginBottom: 16 }}>
          {courseFromState?.courseCode || courseDetails?.courseCode} - {courseFromState?.courseName || courseDetails?.courseName}
        </h2>
        <Space size="large">
          <span>📚 Class: {courseFromState?.className || courseDetails?.className}</span>
          <span>📅 Semester: {courseFromState?.semester || courseDetails?.semester}</span>
          <span>👨‍🎓 Total Students: {students.length}</span>
        </Space>
      </Card>

      <Card 
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>Enter Student Grades</span>
            <span style={{ fontSize: 13, color: '#8c8c8c', fontWeight: 400 }}>
              Click "Edit" to modify grades. Grades are from 0-10.
            </span>
          </div>
        }
      >
        <Form form={form} component={false}>
          <Table
            components={{
              body: {
                cell: EditableCell,
              },
            }}
            columns={mergedColumns}
            dataSource={students}
            scroll={{ x: 1400 }}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} students`,
            }}
          />
        </Form>
      </Card>
    </div>
  );
}