// Suggested path: src/vn.fpt.edu.pages/manager/SubjectManage/SubjectForm.js
import React, { useState, useEffect, useCallback } from "react";
import { Form, Input, InputNumber, Select, Button, Card, message, Spin } from "antd";
import { SaveOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import SubjectListApi from "../../../vn.fpt.edu.api/SubjectList";

const { TextArea } = Input;

// This component can be used for both Create and Edit pages
export default function SubjectForm({ mode = "create" }) {
  const { subjectId } = useParams(); // Get subjectId from URL for the Edit page
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Options state now only needs 'levels'
  const [options, setOptions] = useState({
    levels: [],
  });
  const navigate = useNavigate();

  const isEditMode = mode === "edit";

  // Fetch data for the subject being edited
  const loadSubjectData = useCallback(async () => {
    if (!subjectId) return;
    
    setLoading(true);
    try {
      const data = await SubjectListApi.getById(subjectId);
      form.setFieldsValue({
        subjectCode: data.subjectCode,
        subjectName: data.subjectName,
        description: data.description,
        passMark: data.passMark,
        // Remove semesterId and classId, keeping only levelId
        levelId: data.levelId,
      });
    } catch (error) {
      console.error("Failed to load subject:", error);
      message.error("Failed to load subject data");
      navigate("/manager/subject");
    } finally {
      setLoading(false);
    }
  }, [subjectId, form, navigate]);

  // Fetch the list of Levels for the dropdown
  const loadFormOptions = async () => {
    try {
      const data = await SubjectListApi.getFormOptions();
      // The API now only returns 'levels'
      setOptions({
        levels: data.levels || [],
      });
    } catch (error) {
      console.error("Failed to load form options:", error);
      message.error("Failed to load form options");
    }
  };

  useEffect(() => {
    loadFormOptions();
    if (isEditMode) {
      loadSubjectData();
    }
  }, [isEditMode, loadSubjectData]);

  // Handle form submission (Save/Update)
  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (isEditMode) {
        await SubjectListApi.update(subjectId, values);
        message.success("Subject updated successfully!");
      } else {
        await SubjectListApi.create(values);
        message.success("Subject created successfully!");
      }
      navigate("/manager/subject");
    } catch (error) {
      console.error("Submit error:", error);
      const errorMsg = error.response?.data?.message || "Operation failed";
      message.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate("/manager/subject");
  };

  if (loading && isEditMode) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
      </div>
    );
  }

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
      style={{ maxWidth: 800, margin: "24px auto" }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          label="Subject Code"
          name="subjectCode"
          rules={[
            { required: true, message: "Please enter the subject code" },
            { max: 20, message: "Subject code cannot exceed 20 characters" },
          ]}
        >
          <Input placeholder="e.g., SWP391" />
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

        <Form.Item
          label="Pass Mark"
          name="passMark"
          initialValue={5.0}
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

        {/* --- KEEPING THE LEVEL SELECTION --- */}
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

        {/* --- SEMESTER AND CLASS SELECTIONS HAVE BEEN REMOVED --- */}
        
        <Form.Item style={{ marginTop: 32 }}>
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={submitting}
            >
              {isEditMode ? "Update" : "Create"}
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Card>
  );
}