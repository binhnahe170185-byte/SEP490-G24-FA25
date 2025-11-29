import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Typography,
  message,
  Popconfirm,
  Tag,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import FeedbackQuestionApi from "../../../vn.fpt.edu.api/FeedbackQuestion";

const { Title } = Typography;
const { Option } = Select;

const DEFAULT_ANSWER_OPTIONS = [
  { value: 1, label: "Not Satisfied", icon: "FrownOutlined", color: "#ff4d4f" },
  { value: 2, label: "Neutral", icon: "MehOutlined", color: "#faad14" },
  { value: 3, label: "Satisfied", icon: "SmileOutlined", color: "#52c41a" },
  { value: 4, label: "Very Satisfied", icon: "HeartOutlined", color: "#1890ff" },
];

const ICON_COMPONENTS = {
  FrownOutlined: require("@ant-design/icons").FrownOutlined,
  MehOutlined: require("@ant-design/icons").MehOutlined,
  SmileOutlined: require("@ant-design/icons").SmileOutlined,
  HeartOutlined: require("@ant-design/icons").HeartOutlined,
};
const VN_DATE_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const hasTimezone = /([zZ])|([+-]\d{2}:?\d{2})$/.test(value);
    const raw = hasTimezone ? value : `${value}Z`;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
};

const formatDateTime = (value) => {
  const date = parseDate(value);
  if (!date) return "N/A";
  return VN_DATE_FORMATTER.format(date);
};

const LABELS_MAP = {
  1: "Very Unsatisfied",
  2: "Neutral",
  3: "Satisfied",
  4: "Very Satisfied",
};

export default function FeedbackQuestionManage() {
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [viewingQuestion, setViewingQuestion] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const data = await FeedbackQuestionApi.getAllQuestions();
      setQuestions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load questions:", error);
      message.error("Failed to load questions list");
    } finally {
      setLoading(false);
    }
  };


  const handleCreate = () => {
    setEditingQuestion(null);
    form.resetFields();
    form.setFieldsValue({
      answerOptions: DEFAULT_ANSWER_OPTIONS,
    });
    setModalVisible(true);
  };

  const handleEdit = (question) => {
    setEditingQuestion(question);
    // Ensure options sorted by value 1-4
    const sortedOptions = DEFAULT_ANSWER_OPTIONS.map((defaultOpt) => {
      const matched = (question.answerOptions || []).find(
        (opt) => opt.value === defaultOpt.value
      );
      return matched ? matched : defaultOpt;
    });
    form.setFieldsValue({
      questionText: question.questionText,
      evaluationLabel: question.evaluationLabel,
      isActive: question.isActive,
      answerOptions: sortedOptions,
    });
    setModalVisible(true);
  };

  const handleView = (question) => {
    const sortedOptions = DEFAULT_ANSWER_OPTIONS.map((defaultOpt) => {
      const matched = (question.answerOptions || []).find(
        (opt) => opt.value === defaultOpt.value
      );
      return matched ? matched : defaultOpt;
    });
    setViewingQuestion({
      ...question,
      answerOptions: sortedOptions,
    });
    setViewModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await FeedbackQuestionApi.deleteQuestion(id);
      message.success("Question deleted successfully");
      loadQuestions();
    } catch (error) {
      console.error("Failed to delete question:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to delete question";
      message.error(errorMessage);
    }
  };

  const handleSubmit = async (values) => {
    try {
      const payload = {
        questionText: values.questionText,
        evaluationLabel: values.evaluationLabel || null,
        answerOptions: DEFAULT_ANSWER_OPTIONS.map((defaultOpt, index) => ({
          ...defaultOpt,
          label: values.answerOptions?.[index]?.label || defaultOpt.label,
        })),
      };

      if (editingQuestion) {
        payload.isActive = values.isActive;
        await FeedbackQuestionApi.updateQuestion(editingQuestion.id, payload);
        message.success("Question updated successfully");
      } else {
        await FeedbackQuestionApi.createQuestion(payload);
        message.success("Question created successfully");
      }
      setModalVisible(false);
      loadQuestions();
    } catch (error) {
      console.error("Failed to save question:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to save question";
      message.error(errorMessage);
    }
  };

  const columns = [
    {
      title: "Order",
      dataIndex: "orderIndex",
      key: "orderIndex",
      width: 80,
    },
    {
      title: "Question",
      dataIndex: "questionText",
      key: "questionText",
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive) => (
        <Tag color={isActive ? "blue" : "volcano"}>
          {isActive ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            shape="circle"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          />
          <Button
            shape="circle"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Confirm delete?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button
              shape="circle"
              icon={<DeleteOutlined />}
              danger
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <Space style={{ marginBottom: "24px", width: "100%", justifyContent: "space-between" }}>
        <Title level={2}>Feedback Questions Management</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Create New Question
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={questions}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title={editingQuestion ? "Edit Question" : "Create New Question"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="questionText"
            label="Question Text"
            rules={[{ required: true, message: "Please enter question text" }]}
          >
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>

          <Form.Item
            name="evaluationLabel"
            label="Evaluation Label (Nội dung đánh giá)"
            tooltip="Nội dung này sẽ được hiển thị trong biểu đồ phân tích thay vì câu hỏi đầy đủ. Để trống nếu muốn hiển thị câu hỏi."
          >
            <Input maxLength={200} showCount placeholder="Ví dụ: Giảng viên giải thích rõ ràng" />
          </Form.Item>

          <Form.Item
            label="Answer Options (Satisfaction level increases from 1-4)"
            required
          >
            {DEFAULT_ANSWER_OPTIONS.map((option, index) => {
              const IconComponent = ICON_COMPONENTS[option.icon];
              return (
                <div
                  key={option.value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 10,
                    padding: "10px 14px",
                    border: "1px solid #e8e8e8",
                    borderRadius: 8,
                    background: "#fafafa",
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: "#fff",
                      border: "1px solid #e0e0e0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 600,
                    }}
                  >
                    {option.value}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: 230,
                    }}
                  >
                    {IconComponent && (
                      <IconComponent style={{ color: option.color, fontSize: 22 }} />
                    )}
                    <Tag color={option.color} style={{ fontSize: 13, padding: "4px 10px" }}>
                      {LABELS_MAP[option.value]}
                    </Tag>
                  </div>
                  <Form.Item
                    name={["answerOptions", index, "label"]}
                    initialValue={option.label}
                    style={{ flex: 1, marginBottom: 0 }}
                    rules={[{ required: true, message: "Please enter label" }]}
                  >
                    <Input placeholder="Custom label shown to students" />
                  </Form.Item>
                </div>
              );
            })}
          </Form.Item>

          {editingQuestion && (
            <Form.Item
              name="isActive"
              label="Status"
              valuePropName="value"
            >
              <Select>
                <Option value={true}>Active</Option>
                <Option value={false}>Inactive</Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title="Question Details"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>,
        ]}
        width={700}
      >
            {viewingQuestion && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <strong>Question:</strong>
              <div style={{ marginTop: 4 }}>{viewingQuestion.questionText}</div>
            </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 16,
                    marginBottom: 16,
                  }}
                >
                  <div style={{ background: "#fafafa", padding: 12, borderRadius: 8 }}>
                    <div style={{ fontSize: 12, color: "#888" }}>Created At</div>
                    <div style={{ fontWeight: 600 }}>
                      {formatDateTime(viewingQuestion.createdAt)}
                    </div>
                  </div>
                  {(!viewingQuestion.updatedAt ||
                    viewingQuestion.updatedAt !== viewingQuestion.createdAt) && (
                    <div style={{ background: "#fafafa", padding: 12, borderRadius: 8 }}>
                      <div style={{ fontSize: 12, color: "#888" }}>Updated At</div>
                      <div style={{ fontWeight: 600 }}>
                        {formatDateTime(viewingQuestion.updatedAt)}
                      </div>
                    </div>
                  )}
                </div>
            {viewingQuestion.answerOptions.map((option, index) => {
              const IconComponent = ICON_COMPONENTS[option.icon];
              return (
                <div
                  key={option.value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 8,
                    padding: "8px 12px",
                    border: "1px solid #f0f0f0",
                    borderRadius: 6,
                  }}
                >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "#fff",
                          border: "1px solid #e0e0e0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 600,
                        }}
                      >
                        {option.value}
                      </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                          width: 230,
                    }}
                  >
                    {IconComponent && (
                          <IconComponent style={{ color: option.color, fontSize: 22 }} />
                    )}
                        <Tag color={option.color} style={{ fontSize: 13, padding: "4px 10px" }}>
                          {`${option.value} - ${LABELS_MAP[option.value]}`}
                        </Tag>
                  </div>
                      <div style={{ fontWeight: 500 }}>{option.label}</div>
                </div>
              );
            })}
            <div style={{ marginTop: 16 }}>
              <strong>Status:</strong>{" "}
              <Tag color={viewingQuestion.isActive ? "blue" : "volcano"}>
                {viewingQuestion.isActive ? "Active" : "Inactive"}
              </Tag>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

