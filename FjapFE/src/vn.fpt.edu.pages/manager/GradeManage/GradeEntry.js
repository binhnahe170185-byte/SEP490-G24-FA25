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
  const base = location.pathname.startsWith('/lecturer') ? '/lecturer' : '/manager';
  
  const [courseDetails, setCourseDetails] = useState(null);
  const [students, setStudents] = useState([]);
  const [gradeComponentWeights, setGradeComponentWeights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingKey, setEditingKey] = useState('');
  const [form] = Form.useForm();

  const userId = user?.id;
  const courseFromState = location.state?.course;

  // Load course details
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ManagerGrades.getCourseDetails(userId, courseId);
      setCourseDetails(data);
      setGradeComponentWeights(data.gradeComponentWeights || []);
      
      // Map student data with dynamic grade components
      const mappedStudents = data.students.map(s => {
        const studentData = { ...s, key: s.studentId };
        data.gradeComponentWeights?.forEach(weight => {
          const dataIndex = getDataIndexForComponent(weight.gradeTypeName, weight.subjectGradeTypeId);
          
          // Find score from GradeComponentScores
          const gradeComponentScore = s.gradeComponentScores?.find(gcs => 
            gcs.subjectGradeTypeId === weight.subjectGradeTypeId
          );
          studentData[dataIndex] = gradeComponentScore?.score || null;
        });
        
        return studentData;
      });
      
      setStudents(mappedStudents);
    } catch (error) {
      message.error("Failed to load course details");
    } finally {
      setLoading(false);
    }
  }, [userId, courseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Helper function to get weight for a grade component
  const getWeightForComponent = (componentName) => {
    const weight = gradeComponentWeights.find(w => 
      w.gradeTypeName.toLowerCase().includes(componentName.toLowerCase()) ||
      componentName.toLowerCase().includes(w.gradeTypeName.toLowerCase())
    );
    return weight ? weight.weight / 100 : 0; // Convert percentage to decimal
  };

  const isEditing = (record) => record.key === editingKey;

  const edit = (record) => {
    const formValues = {};
    
    // Set values for dynamic grade components
    gradeComponentWeights.forEach(weight => {
      const dataIndex = getDataIndexForComponent(weight.gradeTypeName, weight.subjectGradeTypeId);
      formValues[dataIndex] = record[dataIndex];
    });
    
    form.setFieldsValue(formValues);
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
        
        // Calculate average using weights from API
        let average = 0;
        gradeComponentWeights.forEach(weight => {
          const dataIndex = getDataIndexForComponent(weight.gradeTypeName, weight.subjectGradeTypeId);
          const score = row[dataIndex] || 0;
          average += score * (weight.weight / 100);
        });

        const status = average >= 5.0 ? "Passed" : "Failed";

        const updatedItem = {
          ...item,
          ...row,
          average: parseFloat(average.toFixed(2)),
          status
        };

        // Update dynamic grade components in the item
        gradeComponentWeights.forEach(weight => {
          const dataIndex = getDataIndexForComponent(weight.gradeTypeName, weight.subjectGradeTypeId);
          updatedItem[dataIndex] = row[dataIndex];
        });

        newData.splice(index, 1, updatedItem);

        // Prepare data for API - send dynamic grade components directly
        const gradeComponents = [];
        gradeComponentWeights.forEach(weight => {
          const dataIndex = getDataIndexForComponent(weight.gradeTypeName, weight.subjectGradeTypeId);
          const score = row[dataIndex];
          
          if (score !== null && score !== undefined) {
            gradeComponents.push({
              subjectGradeTypeId: weight.subjectGradeTypeId,
              score: score,
              comment: null
            });
          }
        });

        // Save to API
        setSaving(true);
        await ManagerGrades.updateStudentGradeComponents(
          userId, 
          courseId, 
          item.studentId, 
          item.gradeId,
          gradeComponents
        );

        setStudents(newData);
        setEditingKey('');
        message.success("Grade updated successfully");
        
        // Reload data to get updated values from server
        await loadData();
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

  // Generate columns dynamically based on gradeComponentWeights
  const generateColumns = () => {
    const baseColumns = [
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
        editable: true,
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
      }
    ];

    return [...baseColumns, ...gradeColumns, ...endColumns];
  };

  // Helper function to map grade type names to data indices
  const getDataIndexForComponent = (gradeTypeName, subjectGradeTypeId) => {
    // Create a unique dataIndex based on SubjectGradeTypeId to avoid conflicts
    return `gradeComponent_${subjectGradeTypeId}`;
  };

  const columns = generateColumns();

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
          navigate(`${base}/grades/${courseId}`, {
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
          { title: "Grade Management", onClick: () => navigate(`${base}/grades`) },
          { title: "Enter Grades" },
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
            icon={<EyeOutlined />}
            onClick={() => navigate(`${base}/grades/${courseId}`, {
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
            // scroll={{ x: 1400 }}
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