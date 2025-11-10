import React, { useEffect, useMemo, useState } from "react";
import { Modal, Form, Input, DatePicker, Upload, message, Button } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useAuth } from "../../login/AuthContext";
import LecturerHomework from "../../../vn.fpt.edu.api/LecturerHomework";
import dayjs from "dayjs";

const { TextArea } = Input;

export default function HomeworkForm({
  visible,
  slot,
  homework,
  onClose,
  onSuccess,
}) {
  const [form] = Form.useForm();
  const { user } = useAuth();
  const [fileList, setFileList] = useState([]);
  const [removedExistingFile, setRemovedExistingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const existingFileEntry = useMemo(() => {
    if (!homework?.filePath) return null;
    const name = homework.filePath.split("/").pop() || "attachment";
    return {
      uid: "-1",
      name,
      status: "done",
      url: homework.filePath,
    };
  }, [homework]);

  useEffect(() => {
    if (!visible) return;

    if (homework) {
      form.setFieldsValue({
        title: homework.title,
        content: homework.content,
        deadline: homework.deadline ? dayjs(homework.deadline) : null,
      });
      setFileList(existingFileEntry ? [existingFileEntry] : []);
    } else {
      form.resetFields();
      setFileList([]);
    }
    setRemovedExistingFile(false);
  }, [visible, homework, form, existingFileEntry]);

  const handleUploadChange = ({ fileList: newList }) => {
    const normalized = newList.slice(-1);
    setFileList(normalized);
    if (!normalized.length && homework?.filePath) {
      setRemovedExistingFile(true);
    } else if (normalized.length) {
      setRemovedExistingFile(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const data = new FormData();
      data.append("lessonId", slot.lessonId);
      data.append("title", values.title);
      data.append("content", values.content);
      data.append("createdBy", user?.id || user?.lecturerId || 1);
      if (values.deadline) {
        data.append("deadline", values.deadline.toISOString());
      }

      const currentFile = fileList[0];
      const filePayload = currentFile?.originFileObj;
      if (filePayload instanceof File || filePayload instanceof Blob) {
        data.append("file", filePayload);
      } else if (
        !fileList.length &&
        homework?.filePath &&
        removedExistingFile
      ) {
        data.append("removeFile", "true");
      }

      if (homework) {
        await LecturerHomework.updateHomework(homework.homeworkId, data, true);
        message.success("Homework updated successfully");
      } else {
        await LecturerHomework.createHomework(data, true);
        message.success("Homework created successfully");
      }

      form.resetFields();
      setFileList([]);
      setRemovedExistingFile(false);
      onSuccess();
    } catch (error) {
      console.error("Failed to save homework:", error);
      message.error(homework ? "Unable to update homework" : "Unable to create homework");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFileList([]);
    setRemovedExistingFile(false);
    onClose();
  };

  return (
    <Modal
      title={homework ? "Edit homework" : "Add new homework"}
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      okText={homework ? "Update" : "Create"}
      cancelText="Cancel"
      confirmLoading={submitting}
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
          <TextArea rows={6} placeholder="Add homework instructions and details..." />
        </Form.Item>

        <Form.Item name="deadline" label="Deadline">
          <DatePicker
            showTime
            format="DD/MM/YYYY HH:mm"
            style={{ width: "100%" }}
            placeholder="Select the due date"
          />
        </Form.Item>

        <Form.Item label="Attachments">
          <Upload
            beforeUpload={() => false}
            onChange={handleUploadChange}
            fileList={fileList}
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>Choose file</Button>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
}
