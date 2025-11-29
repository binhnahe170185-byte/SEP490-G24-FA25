import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Form,
  Button,
  Radio,
  Checkbox,
  Input,
  Space,
  Typography,
  message,
  Spin,
  Breadcrumb,
  Row,
  Col,
} from "antd";
import {
  ArrowLeftOutlined,
  SmileOutlined,
  MehOutlined,
  FrownOutlined,
  HeartOutlined,
  StarOutlined,
  StarFilled,
  LikeOutlined,
  DislikeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
  FireOutlined,
  TrophyOutlined,
  CrownOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../login/AuthContext";
import FeedbackApi from "../../../vn.fpt.edu.api/Feedback";
import FeedbackQuestionApi from "../../../vn.fpt.edu.api/FeedbackQuestion";
import SpeechToText from "../../../vn.fpt.edu.common/components/SpeechToText";
import ClassList from "../../../vn.fpt.edu.api/ClassList";

const { Title, Text } = Typography;
const { TextArea } = Input;

const getIconComponent = (iconName) => {
  const iconMap = {
    FrownOutlined: <FrownOutlined />,
    MehOutlined: <MehOutlined />,
    SmileOutlined: <SmileOutlined />,
    HeartOutlined: <HeartOutlined />,
    StarOutlined: <StarOutlined />,
    StarFilled: <StarFilled />,
    LikeOutlined: <LikeOutlined />,
    DislikeOutlined: <DislikeOutlined />,
    CheckCircleOutlined: <CheckCircleOutlined />,
    CloseCircleOutlined: <CloseCircleOutlined />,
    ThunderboltOutlined: <ThunderboltOutlined />,
    FireOutlined: <FireOutlined />,
    TrophyOutlined: <TrophyOutlined />,
    CrownOutlined: <CrownOutlined />,
    RocketOutlined: <RocketOutlined />,
  };
  return iconMap[iconName] || <MehOutlined />;
};

export default function EndOfCourseFeedbackPage() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [classInfo, setClassInfo] = useState(null);
  const [freeText, setFreeText] = useState("");
  const [freeTextTranscript, setFreeTextTranscript] = useState("");

  useEffect(() => {
    loadData();
  }, [classId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load class info using ClassList API
      const classData = await ClassList.getById(classId);
      setClassInfo(classData);

      // Load questions (subjectId is optional, questions are shared across all subjects)
      const subjectId = classData?.subjectId;
      const questionsData = await FeedbackQuestionApi.getActiveQuestions(subjectId);
      setQuestions(Array.isArray(questionsData) ? questionsData : []);
    } catch (error) {
      console.error("Failed to load data:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to load data";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeechTranscript = (transcript) => {
    // Update with complete transcript (which includes existing text + new voice input)
    if (transcript !== undefined && transcript !== null) {
      setFreeTextTranscript(transcript);
      form.setFieldsValue({ freeText: transcript });
      setFreeText(transcript);
    }
  };

  const handleSubmit = async (values) => {
    try {
      console.debug("Submitting feedback form values:", values);

      const resolvedStudentId = user?.studentId || user?.student?.studentId || user?.id;
      if (!resolvedStudentId) {
        message.error("Unable to detect your student ID. Please sign in again.");
        return;
      }

      const resolvedSubjectId =
        classInfo?.subjectId ??
        classInfo?.SubjectId ??
        questions?.[0]?.subjectId ??
        questions?.[0]?.SubjectId;
      if (!resolvedSubjectId) {
        message.error("Subject information for this class is missing.");
        return;
      }

      // Validate questions are loaded
      if (!questions || questions.length === 0) {
        message.error("No questions found. Please refresh the page.");
        return;
      }

      // Validate all questions are answered
      const answers = {};
      let hasAllAnswers = true;
      const missingQuestions = [];
      
      questions.forEach((question) => {
        const answerValue =
          values.answers?.[question.id] ??
          values.answers?.[String(question.id)];
        if (answerValue === undefined || answerValue === null) {
          hasAllAnswers = false;
          missingQuestions.push(question.questionText);
        } else {
          answers[question.id] = Number(answerValue);
        }
      });

      if (!hasAllAnswers) {
        message.error(`Please answer all questions. Missing: ${missingQuestions.join(", ")}`);
        return;
      }

      setSubmitting(true);

      const payload = {
        studentId: resolvedStudentId,
        classId: parseInt(classId, 10),
        subjectId: resolvedSubjectId,
        answers: answers,
        wantsOneToOne: values.wantsOneToOne || false,
        freeText: values.freeText?.trim() || null,
        freeTextTranscript: freeTextTranscript || null,
      };

      console.log("Submitting feedback payload:", payload);
      
      await FeedbackApi.createFeedback(payload);
      message.success("Feedback submitted successfully!");
      
      // Check if there are more pending feedbacks
      try {
        const pendingFeedbacks = await FeedbackApi.getPendingFeedbackClasses();
        if (pendingFeedbacks && pendingFeedbacks.length > 0) {
          // Redirect to next pending feedback
          const nextClass = pendingFeedbacks[0];
          navigate(`/student/feedback/${nextClass.classId}`);
        } else {
          navigate("/student/homepage");
        }
      } catch (err) {
        // If check fails, just go to homepage
        navigate("/student/homepage");
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to submit feedback";
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      <style>{`
        .feedback-radio-option {
          display: inline-flex !important;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          border: 1px solid #d9d9d9;
          border-radius: 10px;
          min-width: 220px;
          transition: all 0.2s ease;
          cursor: pointer;
          background-color: #fff;
          --option-color: #1890ff;
        }
        .feedback-radio-option:hover {
          border-color: var(--option-color);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        }
        .feedback-radio-option.ant-radio-wrapper-checked {
          border-color: var(--option-color);
          background-color: rgba(24, 144, 255, 0.08);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .feedback-radio-option__content {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
          font-weight: 500;
        }
        .feedback-radio-option .feedback-radio-icon {
          font-size: 22px;
          color: var(--option-color);
          display: inline-flex;
          align-items: center;
        }
        .feedback-radio-option .feedback-radio-label {
          color: #23262f;
        }
      `}</style>
      <Breadcrumb style={{ marginBottom: "24px" }}>
        <Breadcrumb.Item>
          <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/student/homepage")}
          >
            Home
          </Button>
        </Breadcrumb.Item>
        <Breadcrumb.Item>End-of-Course Feedback</Breadcrumb.Item>
      </Breadcrumb>

      <Card>
        <Title level={2}>End-of-Course Feedback</Title>
        {classInfo && (
          <Text type="secondary" style={{ fontSize: "16px", display: "block", marginBottom: "24px" }}>
            Class: {classInfo.className} - Subject: {classInfo.subjectName || classInfo.subjectCode}
          </Text>
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          onFinishFailed={(info) => {
            console.warn("Feedback form validation failed:", info);
            message.error("Please fill out all required fields before submitting.");
          }}
          initialValues={{
            answers: {},
            wantsOneToOne: false,
          }}
        >
          {questions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <Text type="secondary">No questions available. Please contact administrator.</Text>
            </div>
          ) : (
            <>
              {questions.map((question) => {
                const options = question.answerOptions || [
                  { value: 1, label: "Not Satisfied", icon: "FrownOutlined", color: "#ff4d4f" },
                  { value: 2, label: "Neutral", icon: "MehOutlined", color: "#faad14" },
                  { value: 3, label: "Satisfied", icon: "SmileOutlined", color: "#52c41a" },
                  { value: 4, label: "Very Satisfied", icon: "HeartOutlined", color: "#1890ff" },
                ];
                
                return (
                  <Form.Item
                    key={question.id}
                    name={['answers', question.id]}
                    label={question.questionText}
                    rules={[{ required: true, message: "Please select a satisfaction level" }]}
                  >
                    <Radio.Group>
                      <Space direction="horizontal" wrap size="large">
                        {options.map((option) => (
                          <Radio
                            key={option.value}
                            value={option.value}
                            className="feedback-radio-option"
                            style={{ "--option-color": option.color }}
                          >
                            <span className="feedback-radio-option__content">
                              <span className="feedback-radio-icon">
                                {getIconComponent(option.icon)}
                              </span>
                              <span className="feedback-radio-label">{option.label}</span>
                            </span>
                          </Radio>
                        ))}
                      </Space>
                    </Radio.Group>
                  </Form.Item>
                );
              })}

              <Form.Item
                label="Additional comments (max 1200 characters)"
                name="freeText"
                extra={
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Text type="secondary">
                      {freeText.length}/1200 characters
                    </Text>
                    <SpeechToText 
                      onTranscript={handleSpeechTranscript} 
                      initialText={freeText}
                    />
                  </div>
                }
              >
                <TextArea
                  rows={6}
                  maxLength={1200}
                  showCount
                  value={freeText}
                  onChange={(e) => {
                    setFreeText(e.target.value);
                    form.setFieldsValue({ freeText: e.target.value });
                  }}
                  placeholder="Enter additional comments or use the microphone button..."
                />
              </Form.Item>

              <Form.Item name="wantsOneToOne" valuePropName="checked">
                <Checkbox>Would you like 1-on-1 support after the course?</Checkbox>
              </Form.Item>
            </>
          )}

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting} size="large">
                Submit Feedback
              </Button>
              <Button onClick={() => navigate("/student/homepage")} size="large">
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

