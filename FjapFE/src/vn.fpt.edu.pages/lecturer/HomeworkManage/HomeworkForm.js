import React, { useEffect } from "react";
import { Modal, Form, Input, DatePicker, Upload, message, Button } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useAuth } from "../../login/AuthContext";
import LecturerHomework from "../../../vn.fpt.edu.api/LecturerHomework";
import dayjs from "dayjs";

const { TextArea } = Input;

export default function HomeworkForm({ visible, slot, homework, onClose, onSuccess }) {
  const [form] = Form.useForm();
  const { user } = useAuth();

  useEffect(() => {
    if (visible) {
      if (homework) {
        // Edit mode
        form.setFieldsValue({
          title: homework.title,
          content: homework.content,
          deadline: homework.deadline ? dayjs(homework.deadline) : null,
        });
      } else {
        // Create mode
        form.resetFields();
      }
    }
  }, [visible, homework, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        lessonId: slot.lessonId,
        title: values.title,
        content: values.content,
        deadline: values.deadline ? values.deadline.toISOString() : null,
        createdBy: user?.id || user?.lecturerId || 1,
      };

      if (homework) {
        // Update
        await LecturerHomework.updateHomework(homework.homeworkId, data);
        message.success("Homework updated successfully");
      } else {
        // Create
        await LecturerHomework.createHomework(data);
        message.success("Homework created successfully");
      }

      onSuccess();
    } catch (error) {
      console.error("Failed to save homework:", error);
      message.error(homework ? "Unable to update homework" : "Unable to create homework");
    }
  };

  return (
    <Modal
      title={homework ? "Edit homework" : "Add new homework"}
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      okText={homework ? "Update" : "Create"}
      cancelText="Cancel"
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          deadline: null,
        }}
      >
        <Form.Item
          name="title"
          label="Homework title"
          rules={[{ required: true, message: "Please enter a title" }]}
        >
          <Input placeholder="Enter the homework title" />
        </Form.Item>

        <Form.Item
          name="content"
          label="Description"
          rules={[{ required: true, message: "Please enter the homework description" }]}
        >
          <TextArea
            rows={6}
            placeholder="Add homework instructions and details..."
          />
        </Form.Item>

        <Form.Item
          name="deadline"
          label="Deadline"
        >
          <DatePicker
            showTime
            format="DD/MM/YYYY HH:mm"
            style={{ width: "100%" }}
            placeholder="Select the due date"
          />
        </Form.Item>

        <Form.Item
          name="file"
          label="Attachments"
        >
          <Upload beforeUpload={() => false}>
            <Button icon={<UploadOutlined />}>Choose file</Button>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
}
