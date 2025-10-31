import React, { useState } from "react";
import { Modal, Form, Input, Button, message } from "antd";
import NewsApi from "../../../vn.fpt.edu.api/News";

export default function AddNewsModal({ visible, onCancel, onSuccess }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      const payload = {
        title: values.title.trim(),
        content: values.content?.trim() || null,
        newsImage: values.newsImage?.trim() || null,
      };

      await NewsApi.createNews(payload);
      message.success("News created successfully");
      form.resetFields();
      onSuccess();
    } catch (e) {
      console.error("Error creating news:", e);
      message.error(`Failed to create news: ${e.response?.data?.message ?? e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="Add New News"
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      okText="Create"
      cancelText="Cancel"
      confirmLoading={loading}
      width={700}
    >
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          label="Title"
          name="title"
          rules={[
            { required: true, message: "Please enter news title" },
            { max: 255, message: "Title must not exceed 255 characters" }
          ]}
        >
          <Input placeholder="Enter news title" />
        </Form.Item>

        <Form.Item
          label="Content"
          name="content"
        >
          <Input.TextArea
            rows={6}
            placeholder="Enter news content..."
            showCount
            maxLength={5000}
          />
        </Form.Item>

        <Form.Item
          label="News Image URL"
          name="newsImage"
          rules={[
            { max: 512, message: "Image URL must not exceed 512 characters" }
          ]}
        >
          <Input placeholder="Enter image URL (optional)" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

