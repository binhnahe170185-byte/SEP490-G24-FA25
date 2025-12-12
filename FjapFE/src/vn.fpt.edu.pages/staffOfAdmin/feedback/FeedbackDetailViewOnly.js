import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Card,
  Typography,
  Tag,
  Button,
  Space,
  Divider,
  Progress,
  List,
  message,
  Spin,
  Breadcrumb,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import FeedbackApi from "../../../vn.fpt.edu.api/Feedback";

const { Title, Text, Paragraph } = Typography;

const VI_TIME_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const parseUtcDate = (value) => {
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
  const date = parseUtcDate(value);
  if (!date) return "N/A";
  return VI_TIME_FORMATTER.format(date);
};

const getAnswerLabel = (question, answerValue) => {
  if (!answerValue) return "N/A";
  
  const options = question?.answerOptions || [];
  const option = options.find((opt) => opt.value === answerValue);
  
  if (option) {
    return option.label;
  }
  
  // Fallback to default labels if options not available
  const defaultLabels = {
    1: "Not Satisfied",
    2: "Neutral",
    3: "Satisfied",
    4: "Very Satisfied",
  };
  return defaultLabels[answerValue] || `Value ${answerValue}`;
};

export default function FeedbackDetailViewOnly() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get base path based on current route
  const getBasePath = () => {
    const path = location.pathname;
    return path.startsWith('/headOfAdmin') ? '/headOfAdmin' : '/staffOfAdmin';
  };
  
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    loadFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const data = await FeedbackApi.getFeedbackById(id);
      setFeedback(data);
    } catch (error) {
      console.error("Failed to load feedback:", error);
      message.error("Failed to load feedback");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!feedback) {
    return <div>Feedback not found</div>;
  }

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case "Positive":
        return "green";
      case "Negative":
        return "red";
      default:
        return "blue";
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      <Breadcrumb style={{ marginBottom: "24px" }}>
        <Breadcrumb.Item>
          <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(`${getBasePath()}/feedback`)}
          >
            Feedback List
          </Button>
        </Breadcrumb.Item>
        <Breadcrumb.Item>Feedback Details</Breadcrumb.Item>
      </Breadcrumb>

      <Card>
        <Space style={{ marginBottom: "24px", width: "100%", justifyContent: "space-between" }}>
          <Title level={2}>Feedback Details</Title>
          <Space>
            <Tag color={feedback.status === "New" ? "blue" : feedback.status === "Reviewed" ? "orange" : "green"}>
              {feedback.status}
            </Tag>
          </Space>
        </Space>

        <Divider />

        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div>
            <div>
              <Text strong>Student: </Text>
              <Text style={{ marginLeft: "45px" }}>
                {feedback.studentName} ({feedback.studentCode})
              </Text>
            </div>
            <div>
              <Text strong>Class: </Text>
              <Text style={{ marginLeft: "63px" }}>{feedback.className}</Text>
            </div>
            <div>
              <Text strong>Subject: </Text>
              <Text style={{ marginLeft: "47px" }}>
                {feedback.subjectName} ({feedback.subjectCode})
              </Text>
            </div>
            <div>
              <Text strong>Submitted At: </Text>
              <Text style={{ marginLeft: "10px" }}>{formatDateTime(feedback.createdAt)}</Text>
            </div>
          </div>

          <Divider>Answers</Divider>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  <th style={{ textAlign: "left", padding: "12px", width: "60%" }}>Question</th>
                  <th style={{ textAlign: "left", padding: "12px" }}>Answer</th>
                </tr>
              </thead>
              <tbody>
                {feedback.questions && feedback.questions.length > 0
                  ? feedback.questions.map((question) => {
                      const answerValue = feedback.answers?.[question.id];
                      const label = getAnswerLabel(question, answerValue);
                      return (
                        <tr
                          key={question.id}
                          style={{ borderTop: "1px solid #f0f0f0", background: "#fff" }}
                        >
                          <td style={{ padding: "12px 16px" }}>{question.questionText}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <Tag color="blue">{label}</Tag>
                          </td>
                        </tr>
                      );
                    })
                  : feedback.answers &&
                    Object.keys(feedback.answers).map((questionId) => {
                      const answerValue = feedback.answers[questionId];
                      const defaultLabels = {
                        1: "Not Satisfied",
                        2: "Neutral",
                        3: "Satisfied",
                        4: "Very Satisfied",
                      };
                      const label = defaultLabels[answerValue] || `Value ${answerValue}`;
                      return (
                        <tr
                          key={questionId}
                          style={{ borderTop: "1px solid #f0f0f0", background: "#fff" }}
                        >
                          <td style={{ padding: "12px 16px" }}>Question {questionId}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <Tag color="blue">{label}</Tag>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>

          <div>
            <Text strong>Wants 1-on-1 Support: </Text>
            <Tag color={feedback.wantsOneToOne ? "green" : "default"}>
              {feedback.wantsOneToOne ? "Yes" : "No"}
            </Tag>
          </div>

          {feedback.freeText && (
            <div>
              <Text strong>Additional Comments: </Text>
              <Paragraph>{feedback.freeText}</Paragraph>
            </div>
          )}

          <Divider>AI Analysis</Divider>

          <div>
            <Text strong>Urgency:</Text>{" "}
            <Tag
              color={feedback.urgency >= 7 ? "red" : feedback.urgency >= 4 ? "orange" : "default"}
            >
              {feedback.urgency}/10
            </Tag>
          </div>

          {feedback.mainIssue && (
            <div>
              <Text strong>Main Issue: </Text>
              <Paragraph style={{ marginTop: 8 }}>{feedback.mainIssue}</Paragraph>
            </div>
          )}

          {feedback.keywords && feedback.keywords.length > 0 && (
            <div>
              <Text strong>Keywords: </Text>
              <Space wrap style={{ marginTop: 8 }}>
                {feedback.keywords.map((keyword, idx) => (
                  <Tag key={idx}>{keyword}</Tag>
                ))}
              </Space>
            </div>
          )}

          {feedback.aiSuggestions && feedback.aiSuggestions.length > 0 && (
            <div>
              <Text strong>AI Suggestions:</Text>
              <List
                size="small"
                style={{ marginTop: 8 }}
                dataSource={feedback.aiSuggestions}
                renderItem={(item, idx) => (
                  <List.Item>
                    <CheckCircleOutlined style={{ color: "#52c41a", marginRight: "8px" }} />
                    {item}
                  </List.Item>
                )}
              />
            </div>
          )}

          <Card size="small" style={{ borderRadius: 10 }}>
            <Text strong>Satisfaction Score</Text>
            <Progress
              style={{ marginTop: 8 }}
              percent={feedback.satisfactionScore * 100}
              format={(percent) => `${percent.toFixed(0)}%`}
              strokeColor="#52c41a"
            />
          </Card>
        </Space>
      </Card>
    </div>
  );
}
