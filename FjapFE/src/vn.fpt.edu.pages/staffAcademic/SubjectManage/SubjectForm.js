import React, { useState, useEffect, useCallback } from "react";
import { 
  Form, Input, InputNumber, Select, Button, Card, message, Spin, 
  Table, Popconfirm, Divider, Typography, Dropdown, Space 
} from "antd";
import { 
  SaveOutlined, ArrowLeftOutlined, PlusOutlined, 
  DeleteOutlined, DownOutlined, ThunderboltOutlined 
} from "@ant-design/icons";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import SubjectListApi from "../../../vn.fpt.edu.api/SubjectList";
import { 
  calculateTotalWeight, 
  GRADE_TYPE_PRESETS 
} from "./SubjectValidationUtils";
import { useNotify } from "../../../vn.fpt.edu.common/notifications";

const { TextArea } = Input;
const { Text } = Typography;

export default function SubjectForm({ mode = "create" }) {
  const { subjectId } = useParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [options, setOptions] = useState({ levels: [] });
  const [gradeTypesData, setGradeTypesData] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const basePrefix = location.pathname.startsWith('/manager') ? '/manager' : '/staffAcademic';
  const { pending: notifyPending, success: notifySuccess, error: notifyError } = useNotify();

  const isEditMode = mode === "edit";

  const loadSubjectData = useCallback(async () => {
    if (!subjectId) return;
    
    setLoading(true);
    try {
      const data = await SubjectListApi.getById(subjectId);
      const gradeTypes = data.gradeTypes || [];
      setGradeTypesData(gradeTypes);
      form.setFieldsValue({
        subjectCode: data.subjectCode,
        subjectName: data.subjectName,
        description: data.description,
        passMark: data.passMark,
        levelId: data.levelId,
        gradeTypes: gradeTypes,
      });
    } catch (error) {
      console.error("Failed to load subject:", error);
      message.error("Failed to load subject data");
      navigate(`${basePrefix}/subject`);
    } finally {
      setLoading(false);
    }
  }, [subjectId, form, navigate]);

  const loadFormOptions = async () => {
    try {
      const data = await SubjectListApi.getFormOptions();
      setOptions({ levels: data.levels || [] });
    } catch (error) {
      console.error("Failed to load form options:", error);
      message.error("Failed to load form options");
    }
  };

  useEffect(() => {
    loadFormOptions();
    if (isEditMode) {
      loadSubjectData();
    } else {
      const defaultGradeTypes = [
        { gradeTypeName: "Assignment", weight: 20 },
        { gradeTypeName: "Midterm", weight: 30 },
        { gradeTypeName: "Final", weight: 50 },
      ];
      setGradeTypesData(defaultGradeTypes);
      form.setFieldsValue({ gradeTypes: defaultGradeTypes });
    }
  }, [isEditMode, loadSubjectData, form]);

  const applyPreset = (presetName) => {
    const preset = GRADE_TYPE_PRESETS[presetName];
    if (preset) {
      const newGradeTypes = [...preset];
      setGradeTypesData(newGradeTypes);
      form.setFieldsValue({ gradeTypes: newGradeTypes });
      message.success(`Applied preset: ${presetName}`);
    }
  };

  const presetMenuItems = Object.keys(GRADE_TYPE_PRESETS).map((key) => ({
    key,
    label: key,
    onClick: () => applyPreset(key),
  }));

  const validateGradeTypes = (_, gradeTypes) => {
    // Always use gradeTypesData from state as source of truth
    // since the Table component doesn't automatically update the form value
    // The form value might be undefined, null, or not an array
    const gradeTypesArray = Array.isArray(gradeTypesData) && gradeTypesData.length > 0
      ? gradeTypesData
      : (Array.isArray(gradeTypes) ? gradeTypes : []);
    
    if (!gradeTypesArray || gradeTypesArray.length === 0) {
      return Promise.reject(new Error("At least one grade type is required"));
    }

    // Validate each grade type: name and weight must not be empty
    for (let i = 0; i < gradeTypesArray.length; i++) {
      const gt = gradeTypesArray[i];
      const gradeTypeName = gt?.gradeTypeName?.trim() || '';
      const weight = gt?.weight;

      if (!gradeTypeName || gradeTypeName === '') {
        return Promise.reject(
          new Error(`Grade type #${i + 1}: Name is required and cannot be empty`)
        );
      }

      if (weight === null || weight === undefined || weight === '' || weight <= 0) {
        return Promise.reject(
          new Error(`Grade type #${i + 1} (${gradeTypeName}): Weight is required and must be greater than 0`)
        );
      }

      if (weight > 100) {
        return Promise.reject(
          new Error(`Grade type #${i + 1} (${gradeTypeName}): Weight cannot exceed 100%`)
        );
      }
    }

    const total = calculateTotalWeight(gradeTypesArray);
    if (Math.abs(total - 100) > 0.01) {
      return Promise.reject(
        new Error(`Total weight must equal 100%. Current total: ${total.toFixed(2)}%`)
      );
    }

    const names = gradeTypesArray.map(gt => gt?.gradeTypeName?.trim().toLowerCase()).filter(Boolean);
    const uniqueNames = new Set(names);
    if (names.length !== uniqueNames.size) {
      return Promise.reject(new Error("Grade type names must be unique"));
    }

    return Promise.resolve();
  };

  const handleSubmit = async (values) => {
    let notifyKey = null;
    const actionType = isEditMode ? "update" : "create";
    
    try {
      // Additional validation before submit - check for empty names or weights
      const invalidGradeTypes = [];
      gradeTypesData.forEach((gt, index) => {
        const name = (gt?.gradeTypeName || '').trim();
        const weight = gt?.weight;
        
        if (!name || name === '') {
          invalidGradeTypes.push(`Grade type #${index + 1}: Name is required`);
        }
        if (weight === null || weight === undefined || weight === '' || weight <= 0) {
          invalidGradeTypes.push(`Grade type #${index + 1}${name ? ` (${name})` : ''}: Weight is required and must be greater than 0`);
        }
        if (weight > 100) {
          invalidGradeTypes.push(`Grade type #${index + 1}${name ? ` (${name})` : ''}: Weight cannot exceed 100%`);
        }
      });
      
      if (invalidGradeTypes.length > 0) {
        const errorKey = `subject-validation-error-${Date.now()}`;
        notifyError(
          errorKey,
          "Validation Failed",
          `Please fix the following errors:\n${invalidGradeTypes.join('\n')}`
        );
        return; // Stop submission
      }
      
      // Normalize grade types: 
      // - Existing grade types (from DB) will have subjectGradeTypeId > 0
      // - New grade types (added in UI) will have subjectGradeTypeId = 0, null, or undefined
      const normalizedGradeTypes = gradeTypesData
        .map(gt => {
          // Preserve existing ID if present and valid (> 0), otherwise set to 0 for new ones
          const id = (gt.subjectGradeTypeId && gt.subjectGradeTypeId > 0) 
            ? gt.subjectGradeTypeId 
            : 0;
          return {
            subjectGradeTypeId: id,
            gradeTypeName: (gt.gradeTypeName || '').trim(),
            weight: gt.weight || 0
          };
        })
        // Filter out invalid grade types (should not happen if validation passed, but safety check)
        .filter(gt => gt.gradeTypeName && gt.gradeTypeName !== '' && gt.weight > 0);
      
      if (normalizedGradeTypes.length === 0) {
        message.error("At least one valid grade type is required");
        return;
      }
      
      const submitData = {
        ...values,
        gradeTypes: normalizedGradeTypes
      };

      const subjectName = values.subjectName?.trim() || values.subjectCode || "Subject";
      notifyKey = `subject-${actionType}-${isEditMode ? subjectId : Date.now()}`;
      
      notifyPending(
        notifyKey,
        isEditMode ? "Updating subject" : "Creating subject",
        `Processing ${subjectName}...`
      );

      setSubmitting(true);
      if (isEditMode) {
        await SubjectListApi.update(subjectId, submitData);
        notifySuccess(
          notifyKey,
          "Subject updated",
          `${subjectName} updated successfully.`
        );
      } else {
        await SubjectListApi.create(submitData);
        notifySuccess(
          notifyKey,
          "Subject created",
          `${subjectName} created successfully.`
        );
      }
      navigate(`${basePrefix}/subject`);
    } catch (error) {
      console.error("Submit error:", error);
      
      // Extract error message from response
      let errorMsg = "Operation failed";
      let errorTitle = "Save failed";
      
      if (error?.response?.data) {
        const errorData = error.response.data;
        errorMsg = errorData.message || errorData.error || errorMsg;
        
        // Check for duplicate subject code or name
        const errorLower = errorMsg.toLowerCase();
        if (errorLower.includes("subject code") && (errorLower.includes("already exists") || errorLower.includes("exist"))) {
          errorTitle = "Subject code already exists";
          errorMsg = errorMsg || "This subject code is already in use. Please use a different code.";
        } else if (errorLower.includes("subject name") && (errorLower.includes("already exists") || errorLower.includes("exist"))) {
          errorTitle = "Subject name already exists";
          errorMsg = errorMsg || "This subject name is already in use. Please use a different name.";
        }
      } else if (error?.message) {
        errorMsg = error.message;
      }
      
      notifyError(
        notifyKey ?? `subject-${actionType}-error`,
        errorTitle,
        errorMsg
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(`${basePrefix}/subject`);
  };

  const handleGradeTypeChange = (index, field, value) => {
    const newGradeTypes = [...gradeTypesData];
    if (!newGradeTypes[index]) {
      newGradeTypes[index] = {};
    }
    newGradeTypes[index][field] = value;
    setGradeTypesData(newGradeTypes);
    form.setFieldsValue({ gradeTypes: newGradeTypes });
  };

  const handleAddGradeType = () => {
    const newGradeTypes = [...gradeTypesData, { gradeTypeName: "", weight: 0 }];
    setGradeTypesData(newGradeTypes);
    form.setFieldsValue({ gradeTypes: newGradeTypes });
  };

  const handleRemoveGradeType = (index) => {
    const newGradeTypes = gradeTypesData.filter((_, i) => i !== index);
    setGradeTypesData(newGradeTypes);
    form.setFieldsValue({ gradeTypes: newGradeTypes });
    message.success("Grade type removed");
  };

  if (loading && isEditMode) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
      </div>
    );
  }

  const gradeTypeColumns = [
    {
      title: "No.",
      key: "index",
      width: 60,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Grade Type Name",
      dataIndex: "gradeTypeName",
      key: "gradeTypeName",
      render: (value, record, index) => (
        <Input 
          placeholder="e.g., Assignment, Midterm, Final"
          value={value}
          onChange={(e) => handleGradeTypeChange(index, 'gradeTypeName', e.target.value)}
        />
      ),
    },
    {
      title: "Weight (%)",
      dataIndex: "weight",
      key: "weight",
      width: 150,
      render: (value, record, index) => (
        <InputNumber
          style={{ width: "100%" }}
          placeholder="0-100"
          step={0.5}
          min={0}
          max={100}
          precision={2}
          value={value}
          onChange={(val) => handleGradeTypeChange(index, 'weight', val || 0)}
        />
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 80,
      align: "center",
      render: (_, __, index) => (
        <Popconfirm
          title="Delete this grade type?"
          onConfirm={() => handleRemoveGradeType(index)}
          okText="Yes"
          cancelText="No"
          disabled={gradeTypesData.length <= 1}
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            disabled={gradeTypesData.length <= 1}
          />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Card
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleCancel}
            type="text"
          />
          <span>{isEditMode ? "Edit Subject" : "Create New Subject"}</span>
        </div>
      }
      style={{ maxWidth: 1000, margin: "24px auto" }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
        initialValues={{
          passMark: 5.0,
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <Typography.Title level={5}>Basic Information</Typography.Title>
          
          <Form.Item
            label="Subject Code"
            name="subjectCode"
            rules={[
              { required: true, message: "Please enter the subject code" },
              { max: 50, message: "Subject code cannot exceed 50 characters" },
            ]}
          >
            <Input placeholder="e.g., PRN212, SWP391" />
          </Form.Item>

          <Form.Item
            label="Subject Name"
            name="subjectName"
            rules={[
              { required: true, message: "Please enter the subject name" },
              { max: 100, message: "Subject name cannot exceed 100 characters" },
            ]}
          >
            <Input placeholder="e.g., Software Engineering" />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <TextArea
              rows={4}
              placeholder="Enter a detailed description for the subject..."
              maxLength={500}
              showCount
            />
          </Form.Item>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Form.Item
              label="Pass Mark"
              name="passMark"
              rules={[
                { required: true, message: "Please enter the pass mark" },
                { type: "number", min: 0, max: 10, message: "Mark must be between 0 and 10" },
              ]}
            >
              <InputNumber
                style={{ width: "100%" }}
                placeholder="e.g., 5.0"
                step={0.5}
                min={0}
                max={10}
              />
            </Form.Item>

            <Form.Item
              label="Level"
              name="levelId"
              rules={[{ required: true, message: "Please select a level" }]}
            >
              <Select
                placeholder="Select a level"
                options={options.levels.map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
                allowClear
              />
            </Form.Item>
          </div>
        </div>

        <Divider />

        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Typography.Title level={5} style={{ margin: 0 }}>
              Grade Components (Weight Distribution)
            </Typography.Title>
            <Space>
              <Dropdown menu={{ items: presetMenuItems }} trigger={['click']}>
                <Button icon={<ThunderboltOutlined />}>
                  Use Preset <DownOutlined />
                </Button>
              </Dropdown>
              <Text strong style={{ 
                color: Math.abs(calculateTotalWeight(gradeTypesData) - 100) < 0.01 ? "#52c41a" : "#ff4d4f" 
              }}>
                Total: {calculateTotalWeight(gradeTypesData).toFixed(2)}% / 100%
              </Text>
            </Space>
          </div>

          <Form.Item
            name="gradeTypes"
            rules={[{ validator: validateGradeTypes }]}
          >
            <div>
              <Table
                dataSource={gradeTypesData.map((item, index) => ({ ...item, key: index }))}
                columns={gradeTypeColumns}
                pagination={false}
                bordered
                size="small"
              />
              
              <Button
                type="dashed"
                onClick={handleAddGradeType}
                icon={<PlusOutlined />}
                style={{ width: "100%", marginTop: 16 }}
              >
                Add Grade Type
              </Button>
            </div>
          </Form.Item>

          <div style={{ marginTop: 12, padding: 12, background: "#f0f2f5", borderRadius: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <strong>Note:</strong> Total weight must equal 100%. Common grade types include: 
              Assignment (10-30%), Quiz (10-20%), Midterm (20-40%), Final (30-50%), Project (20-40%).
            </Text>
          </div>
        </div>

        <Form.Item style={{ marginTop: 32, marginBottom: 0 }}>
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <Button onClick={handleCancel} size="large">
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={submitting}
              size="large"
            >
              {isEditMode ? "Update Subject" : "Create Subject"}
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Card>
  );
}


