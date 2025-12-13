import React, { useEffect, useMemo, useState } from "react";
import { Modal, Form, Input, DatePicker, Upload, Button } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useAuth } from "../../login/AuthContext";
import { useNotify } from "../../../vn.fpt.edu.common/notifications";
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
  const { pending: notifyPending, success: notifySuccess, error: notifyError } = useNotify();
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
    let notifyKey = null;
    const actionType = homework ? "update" : "create";

    try {
      const values = await form.validateFields();

      // Validate required fields
      const trimmedTitle = values.title?.trim();
      if (!trimmedTitle) {
        form.setFields([
          {
            name: "title",
            errors: ["Homework title cannot be empty"],
          },
        ]);
        notifyError(
          "homework-validation-title",
          "Validation failed",
          "Please enter a homework title."
        );
        return;
      }

      const trimmedContent = values.content?.trim();
      if (!trimmedContent) {
        form.setFields([
          {
            name: "content",
            errors: ["Homework description cannot be empty"],
          },
        ]);
        notifyError(
          "homework-validation-content",
          "Validation failed",
          "Please enter a homework description."
        );
        return;
      }

      // Validate deadline is not in the past
      if (values.deadline && values.deadline.isBefore(dayjs())) {
        notifyError(
          "homework-validation-deadline",
          "Invalid deadline",
          "Deadline must be in the present or future."
        );
        return;
      }

      notifyKey = `homework-${actionType}-${homework?.homeworkId || Date.now()}`;
      notifyPending(
        notifyKey,
        homework ? "Updating homework" : "Creating homework",
        `Processing "${trimmedTitle}"...`
      );

      setSubmitting(true);
      const data = new FormData();
      data.append("lessonId", slot.lessonId);
      data.append("title", trimmedTitle);
      data.append("content", trimmedContent);
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
        notifySuccess(
          notifyKey,
          "Homework updated",
          `"${trimmedTitle}" has been updated successfully.`
        );
      } else {
        await LecturerHomework.createHomework(data, true);
        notifySuccess(
          notifyKey,
          "Homework created",
          `"${trimmedTitle}" has been created successfully.`
        );
      }

      form.resetFields();
      setFileList([]);
      setRemovedExistingFile(false);
      onSuccess();
    } catch (error) {
      // If validation error from form, don't show notification
      if (error?.errorFields) {
        return;
      }

      console.error("Failed to save homework:", error);
      console.error("Error response:", error?.response);

      // Extract detailed error message from various response formats
      let errorMessage = homework ? "Unable to update homework" : "Unable to create homework";

      if (error?.response?.data) {
        const data = error.response.data;

        // Format 1: { message: "error message" }
        if (data.message) {
          errorMessage = data.message;
        }
        // Format 2: { errors: { field: ["error1", "error2"] } }
        else if (data.errors) {
          const errorsList = [];
          for (const field in data.errors) {
            if (Array.isArray(data.errors[field])) {
              errorsList.push(...data.errors[field]);
            } else {
              errorsList.push(data.errors[field]);
            }
          }
          if (errorsList.length > 0) {
            errorMessage = errorsList.join(". ");
          }
        }
        // Format 3: { error: "error message" }
        else if (data.error) {
          errorMessage = data.error;
        }
        // Format 4: String response
        else if (typeof data === 'string') {
          errorMessage = data;
        }
      }
      // Fallback to error.message
      else if (error?.message) {
        errorMessage = error.message;
      }

      notifyError(
        notifyKey || `homework-${actionType}-error`,
        homework ? "Update failed" : "Create failed",
        errorMessage
      );
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

        <Form.Item
          name="deadline"
          label="Deadline"
          rules={[
            {
              validator: (_, value) => {
                if (!value) {
                  return Promise.resolve();
                }
                if (value.isBefore(dayjs())) {
                  return Promise.reject(new Error("Deadline must be in the present or future"));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <DatePicker
            showTime
            format="DD/MM/YYYY HH:mm"
            style={{ width: "100%" }}
            placeholder="Select the due date"
            disabledDate={(current) => {
              // Disable dates before today
              return current && current.isBefore(dayjs().startOf('day'));
            }}
            disabledTime={(current) => {
              // If selected date is today, disable past hours and minutes
              if (!current || !current.isSame(dayjs(), 'day')) {
                return {};
              }

              const now = dayjs();
              const currentHour = now.hour();
              const currentMinute = now.minute();

              return {
                disabledHours: () => {
                  const hours = [];
                  for (let i = 0; i < currentHour; i++) {
                    hours.push(i);
                  }
                  return hours;
                },
                disabledMinutes: (selectedHour) => {
                  if (selectedHour === currentHour) {
                    const minutes = [];
                    for (let i = 0; i <= currentMinute; i++) {
                      minutes.push(i);
                    }
                    return minutes;
                  }
                  return [];
                },
              };
            }}
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
