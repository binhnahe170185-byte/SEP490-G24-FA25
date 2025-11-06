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
        message.success("Cập nhật bài tập thành công");
      } else {
        // Create
        await LecturerHomework.createHomework(data);
        message.success("Tạo bài tập thành công");
      }

      onSuccess();
    } catch (error) {
      console.error("Failed to save homework:", error);
      message.error(homework ? "Không thể cập nhật bài tập" : "Không thể tạo bài tập");
    }
  };

  return (
    <Modal
      title={homework ? "Chỉnh sửa bài tập" : "Thêm bài tập mới"}
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      okText={homework ? "Cập nhật" : "Tạo"}
      cancelText="Hủy"
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
          label="Tiêu đề bài tập"
          rules={[{ required: true, message: "Vui lòng nhập tiêu đề" }]}
        >
          <Input placeholder="Nhập tiêu đề bài tập" />
        </Form.Item>

        <Form.Item
          name="content"
          label="Nội dung"
          rules={[{ required: true, message: "Vui lòng nhập nội dung" }]}
        >
          <TextArea
            rows={6}
            placeholder="Nhập nội dung bài tập và hướng dẫn..."
          />
        </Form.Item>

        <Form.Item
          name="deadline"
          label="Hạn nộp"
        >
          <DatePicker
            showTime
            format="DD/MM/YYYY HH:mm"
            style={{ width: "100%" }}
            placeholder="Chọn hạn nộp bài"
          />
        </Form.Item>

        <Form.Item
          name="file"
          label="File đính kèm"
        >
          <Upload beforeUpload={() => false}>
            <Button icon={<UploadOutlined />}>Chọn file</Button>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
}
