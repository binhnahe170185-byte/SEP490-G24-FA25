import React, { useState, useEffect, useCallback } from "react";
import { Form, Input, InputNumber, Select, Button, Card, message, Spin } from "antd";
import { SaveOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import SubjectListApi from "../../../api/SubjectList";

const { TextArea } = Input;

export default function SubjectForm({ mode = "create", subjectId = null }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [options, setOptions] = useState({
    semesters: [],
    levels: [],
    classes: [],
  });
  const navigate = useNavigate();

  const isEditMode = mode === "edit";

  // Wrap loadSubjectData với useCallback
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
        semesterId: data.semesterId,
        levelId: data.levelId,
        classId: data.classId,
      });
    } catch (error) {
      console.error("Failed to load subject:", error);
      message.error("Failed to load subject data");
      navigate("/manager/subject");
    } finally {
      setLoading(false);
    }
  }, [subjectId, form, navigate]);

  const loadFormOptions = async () => {
    try {
      const data = await SubjectListApi.getFormOptions();
      setOptions({
        semesters: data.semesters || [],
        levels: data.levels || [],
        classes: data.classes || [],
      });
    } catch (error) {
      console.error("Failed to load form options:", error);
      message.error("Failed to load form options");
    }
  };

  // Load form options và subject data
  useEffect(() => {
    loadFormOptions();
    if (isEditMode && subjectId) {
      loadSubjectData();
    }
  }, [isEditMode, subjectId, loadSubjectData]);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (isEditMode) {
        await SubjectListApi.update(subjectId, values);
        message.success("Subject updated successfully");
      } else {
        await SubjectListApi.create(values);
        message.success("Subject created successfully");
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

  if (loading) {
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
      style={{ maxWidth: 800, margin: "0 auto" }}
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
            { required: true, message: "Please enter subject code" },
            { max: 20, message: "Subject code must be at most 20 characters" },
          ]}
        >
          <Input placeholder="e.g., MATH101" />
        </Form.Item>

        <Form.Item
          label="Subject Name"
          name="subjectName"
          rules={[
            { required: true, message: "Please enter subject name" },
            { max: 100, message: "Subject name must be at most 100 characters" },
          ]}
        >
          <Input placeholder="e.g., Mathematics Fundamentals" />
        </Form.Item>

        <Form.Item label="Description" name="description">
          <TextArea
            rows={4}
            placeholder="Enter subject description..."
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Form.Item
          label="Pass Mark"
          name="passMark"
          rules={[
            { required: true, message: "Please enter pass mark" },
            { type: "number", min: 0, max: 10, message: "Pass mark must be between 0 and 10" },
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
          label="Semester"
          name="semesterId"
          rules={[{ required: true, message: "Please select semester" }]}
        >
          <Select
            placeholder="Select semester"
            options={options.semesters.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
          />
        </Form.Item>

        <Form.Item
          label="Level"
          name="levelId"
          rules={[{ required: true, message: "Please select level" }]}
        >
          <Select
            placeholder="Select level"
            options={options.levels.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
          />
        </Form.Item>

        <Form.Item
          label="Class"
          name="classId"
          rules={[{ required: true, message: "Please select class" }]}
        >
          <Select
            placeholder="Select class"
            options={options.classes.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
          />
        </Form.Item>

        <Form.Item style={{ marginTop: 32 }}>
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={submitting}
            >
              {isEditMode ? "Update Subject" : "Create Subject"}
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Card>
  );
}