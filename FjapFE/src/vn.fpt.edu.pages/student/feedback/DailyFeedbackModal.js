import React, { useState, useEffect } from "react";
import { Modal, Form, Input, Button, message, Typography, Space, Spin } from "antd";
import { useAuth } from "../../login/AuthContext";
import DailyFeedbackApi from "../../../vn.fpt.edu.api/DailyFeedback";
import SpeechToText from "../../../vn.fpt.edu.common/components/SpeechToText";
import ClassList from "../../../vn.fpt.edu.api/ClassList";
import dayjs from "dayjs";

const { TextArea } = Input;
const { Text } = Typography;

export default function DailyFeedbackModal({ visible, lesson, onClose, onSuccess }) {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasFeedback, setHasFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackTextTranscript, setFeedbackTextTranscript] = useState("");

  useEffect(() => {
    if (visible && lesson?.lessonId) {
      checkExistingFeedback();
      form.resetFields();
      setFeedbackText("");
      setFeedbackTextTranscript("");
    }
  }, [visible, lesson?.lessonId]);

  const checkExistingFeedback = async () => {
    if (!lesson?.lessonId) return;
    try {
      setLoading(true);
      const result = await DailyFeedbackApi.checkFeedbackForLesson(lesson.lessonId);
      setHasFeedback(result?.hasFeedback || false);
    } catch (error) {
      // If 401 Unauthorized, user might not be logged in or token expired
      // Silently fail and allow user to submit (backend will handle validation)
      if (error?.response?.status === 401) {
        console.warn("Authentication required to check existing feedback");
        setHasFeedback(false);
      } else {
        console.error("Failed to check feedback:", error);
        setHasFeedback(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSpeechTranscript = (transcript) => {
    if (transcript !== undefined && transcript !== null) {
      setFeedbackTextTranscript(transcript);
      form.setFieldsValue({ feedbackText: transcript });
      setFeedbackText(transcript);
    }
  };

  const handleSubmit = async (values) => {
    console.log("=== handleSubmit called ===");
    console.log("Form values:", values);
    console.log("Lesson:", lesson);
    console.log("User:", user);
    
    if (!lesson) {
      console.error("Lesson is missing!");
      message.error("Lesson information is missing");
      return;
    }

    const studentId = user?.studentId || user?.student?.studentId || user?.id;
    console.log("Resolved studentId:", studentId);
    if (!studentId) {
      console.error("StudentId not found!");
      message.error("Unable to detect your student ID. Please sign in again.");
      return;
    }

    const classId = lesson.classId || lesson.class_id;
    const lessonId = lesson.lessonId || lesson.lesson_id;
    
    // Try to get subjectId from multiple sources
    let subjectId = lesson.subjectId || lesson.subject_id;
    
    // If subjectId is still missing, try to get from raw object or fetch class info
    if (!subjectId) {
      subjectId = lesson.raw?.class?.subjectId || 
                  lesson.raw?.class?.subject_id ||
                  lesson.raw?.subjectId ||
                  lesson.raw?.subject_id;
    }
    
    console.log("Lesson IDs - classId:", classId, "lessonId:", lessonId, "subjectId:", subjectId);

    // If still no subjectId, fetch class info
    if (!subjectId && classId) {
      try {
        console.log("Fetching class info to get subjectId...");
        const classInfo = await ClassList.getById(classId);
        subjectId = classInfo?.subjectId || classInfo?.SubjectId || classInfo?.subject_id;
        console.log("Fetched class info - subjectId:", subjectId);
      } catch (error) {
        console.error("Failed to fetch class info:", error);
      }
    }

    if (!classId || !lessonId || !subjectId) {
      console.error("Missing lesson information! classId:", classId, "lessonId:", lessonId, "subjectId:", subjectId);
      message.error("Missing lesson information. Please try again.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        studentId: studentId,
        lessonId: lessonId,
        classId: classId,
        subjectId: subjectId,
        feedbackText: values.feedbackText?.trim() || "",
        feedbackTextTranscript: feedbackTextTranscript || null,
      };

      console.log("Submitting daily feedback with payload:", payload);
      console.log("Lesson object:", lesson);
      console.log("User object:", user);

      await DailyFeedbackApi.createDailyFeedback(payload);
      message.success("Daily feedback submitted successfully!");
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
      form.resetFields();
      setFeedbackText("");
      setFeedbackTextTranscript("");
    } catch (error) {
      console.error("Failed to submit daily feedback:", error);
      console.error("Error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      console.error("Full error response:", JSON.stringify(error.response?.data, null, 2));
      
      let errorMessage = "Failed to submit daily feedback";
      
      if (error.response?.status === 401) {
        errorMessage = "Authentication failed. Please sign in again.";
      } else if (error.response?.status === 403) {
        errorMessage = error.response?.data?.message || "You don't have permission to submit feedback";
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.message || error.response?.data?.error || "Invalid request. Please check your input.";
      } else if (error.response?.status === 404) {
        errorMessage = error.response?.data?.message || "Lesson or class not found";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (!lesson) return null;

  const courseName = lesson?.code || lesson?.subjectCode || "N/A";
  const date = lesson?.date ? dayjs(lesson.date).format("dddd DD/MM/YYYY") : "N/A";

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      title="Daily Feedback - Suggestion Box"
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <Spin size="large" />
        </div>
      ) : hasFeedback ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <Text type="secondary">
            You have already submitted feedback for this lesson.
          </Text>
        </div>
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            console.log("Form onFinish triggered with values:", values);
            handleSubmit(values);
          }}
          onFinishFailed={(errorInfo) => {
            console.error("Form validation failed:", errorInfo);
            console.error("Error fields:", errorInfo.errorFields);
            message.error("Please check your input. Feedback must be at least 10 characters.");
          }}
          initialValues={{
            feedbackText: "",
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">
              <strong>Course:</strong> {courseName}
            </Text>
            <br />
            <Text type="secondary">
              <strong>Date:</strong> {date}
            </Text>
          </div>

          <Form.Item
            label="Your Feedback"
            name="feedbackText"
            rules={[
              { required: true, message: "Please provide your feedback" },
              { min: 10, message: "Feedback must be at least 10 characters" },
            ]}
            extra={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <Text type="secondary">
                  Share your thoughts about today's lesson
                </Text>
                <SpeechToText
                  onTranscript={handleSpeechTranscript}
                  initialText={feedbackText}
                />
              </div>
            }
          >
            <TextArea
              rows={6}
              placeholder="Enter your feedback about today's lesson... You can also use the microphone button to record your feedback."
              value={feedbackText}
              onChange={(e) => {
                setFeedbackText(e.target.value);
                form.setFieldsValue({ feedbackText: e.target.value });
              }}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={submitting}
                onClick={() => {
                  console.log("Submit button clicked!");
                }}
              >
                Submit Feedback
              </Button>
              <Button onClick={onClose}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}

