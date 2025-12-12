import React, { useEffect, useState, useMemo } from "react";
import { Card, List, Typography, Spin, Tag, Row, Col, Empty, Tooltip, Collapse } from "antd";
import {
  MessageOutlined,
  TeamOutlined,
  BookOutlined,
  CalendarOutlined,
  SmileOutlined,
  FrownOutlined,
  MehOutlined,
  FireOutlined,
} from "@ant-design/icons";
import FeedbackApi from "../../../vn.fpt.edu.api/Feedback";
import FeedbackQuestionApi from "../../../vn.fpt.edu.api/FeedbackQuestion";

const { Title, Text } = Typography;

const getSentimentTag = (sentiment, score) => {
  const value = sentiment || "Neutral";
  if (value === "Positive") {
    return <Tag color="green">Positive{score != null ? ` (${(score * 100).toFixed(0)}%)` : ""}</Tag>;
  }
  if (value === "Negative") {
    return <Tag color="red">Negative{score != null ? ` (${(score * 100).toFixed(0)}%)` : ""}</Tag>;
  }
  return <Tag color="default">Neutral</Tag>;
};

const getUrgencyTag = (urgency) => {
  if (urgency >= 7) {
    return (
      <Tag color="red" icon={<FireOutlined />}>
        High urgency ({urgency})
      </Tag>
    );
  }
  if (urgency >= 4) {
    return <Tag color="orange">Medium ({urgency})</Tag>;
  }
  if (urgency > 0) {
    return <Tag color="blue">Low ({urgency})</Tag>;
  }
  return <Tag>None</Tag>;
};

const formatDateTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
};

const LecturerEndOfCourseFeedbackPage = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classLoading, setClassLoading] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    const loadClasses = async () => {
      try {
        setClassLoading(true);
        const data = await FeedbackApi.getLecturerClassesWithFeedback();
        const list = Array.isArray(data) ? data : [];
        setClasses(list);
        if (list.length > 0) {
          const first = list[0];
          setSelectedClassId(first.classId);
          setSelectedClass(first);
        }
      } catch (error) {
        console.error("Failed to load lecturer classes with feedback:", error);
        setClasses([]);
      } finally {
        setClassLoading(false);
      }
    };

    loadClasses();
  }, []);

  useEffect(() => {
    const loadFeedbacks = async () => {
      if (!selectedClassId) {
        setFeedbacks([]);
        return;
      }
      try {
        setFeedbackLoading(true);
        
        // Load questions để map với answers
        const questionsData = await FeedbackQuestionApi.getActiveQuestions(null);
        const questionsList = Array.isArray(questionsData) ? questionsData : [];
        setQuestions(questionsList);
        
        // Load feedbacks
        const data = await FeedbackApi.getLecturerClassFeedbacks(selectedClassId);
        const list = Array.isArray(data) ? data : [];
        setFeedbacks(list);
      } catch (error) {
        console.error("Failed to load feedbacks for class:", error);
        setFeedbacks([]);
        setQuestions([]);
      } finally {
        setFeedbackLoading(false);
      }
    };

    loadFeedbacks();
  }, [selectedClassId]);

  const metrics = useMemo(() => {
    if (!feedbacks || feedbacks.length === 0) {
      return {
        count: 0,
        avgSatisfaction: null,
        negativeCount: 0,
        positiveCount: 0,
      };
    }
    const count = feedbacks.length;
    const avgSatisfaction =
      feedbacks.reduce((sum, f) => sum + (f.satisfactionScore || 0), 0) / count;
    const negativeCount = feedbacks.filter((f) => f.sentiment === "Negative").length;
    const positiveCount = feedbacks.filter((f) => f.sentiment === "Positive").length;
    return {
      count,
      avgSatisfaction,
      negativeCount,
      positiveCount,
    };
  }, [feedbacks]);

  const renderSatisfactionIcon = (score) => {
    if (score == null) return <MehOutlined style={{ color: "#999" }} />;
    if (score >= 0.7) return <SmileOutlined style={{ color: "#52c41a" }} />;
    if (score <= 0.4) return <FrownOutlined style={{ color: "#ff4d4f" }} />;
    return <MehOutlined style={{ color: "#faad14" }} />;
  };

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Title level={2} style={{ marginBottom: 8 }}>
            Student End-of-Course Feedback
          </Title>
          <Text type="secondary">
            View anonymous feedback from your students by class. Student identities are hidden,
            each entry is shown as <strong>Student #N</strong>.
          </Text>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={8}>
          <Card
            title={
              <span>
                <TeamOutlined style={{ marginRight: 8 }} />
                Your Classes
              </span>
            }
            bodyStyle={{ padding: 0 }}
          >
            {classLoading ? (
              <div style={{ padding: 24, textAlign: "center" }}>
                <Spin />
              </div>
            ) : classes.length === 0 ? (
              <div style={{ padding: 24 }}>
                <Empty description="No classes found for this lecturer" />
              </div>
            ) : (
              <List
                dataSource={classes}
                renderItem={(item) => (
                  <List.Item
                    key={item.classId}
                    onClick={() => {
                      setSelectedClassId(item.classId);
                      setSelectedClass(item);
                    }}
                    style={{
                      cursor: "pointer",
                      paddingLeft: 16,
                      paddingRight: 16,
                      background:
                        selectedClassId === item.classId ? "rgba(24,144,255,0.06)" : "transparent",
                      borderLeft:
                        selectedClassId === item.classId
                          ? "3px solid #1890ff"
                          : "3px solid transparent",
                    }}
                  >
                    <List.Item.Meta
                      title={
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>{item.className}</span>
                          <Tag color="blue">
                            {item.feedbackCount ?? 0} feedback
                            {(item.feedbackCount ?? 0) !== 1 ? "s" : ""}
                          </Tag>
                        </div>
                      }
                      description={
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span>
                            <BookOutlined style={{ marginRight: 4 }} />
                            {item.subjectName}
                            {item.subjectCode ? ` (${item.subjectCode})` : ""}
                          </span>
                          <span>
                            <CalendarOutlined style={{ marginRight: 4 }} />
                            {item.semesterName}
                          </span>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Card
            title={
              <span>
                <MessageOutlined style={{ marginRight: 8 }} />
                {selectedClass
                  ? `Feedback for ${selectedClass.className}`
                  : "Select a class to view feedback"}
              </span>
            }
            extra={
              selectedClass && (
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <Tag>
                    Total: <strong>{metrics.count}</strong>
                  </Tag>
                  {metrics.avgSatisfaction != null && (
                    <Tag icon={renderSatisfactionIcon(metrics.avgSatisfaction)}>
                      Avg satisfaction: {(metrics.avgSatisfaction * 100).toFixed(0)}%
                    </Tag>
                  )}
                  <Tag color="red">Negative: {metrics.negativeCount}</Tag>
                  <Tag color="green">Positive: {metrics.positiveCount}</Tag>
                </div>
              )
            }
          >
            {feedbackLoading ? (
              <div style={{ padding: 24, textAlign: "center" }}>
                <Spin />
              </div>
            ) : !selectedClass ? (
              <div style={{ padding: 24 }}>
                <Empty description="Select a class on the left to view feedback" />
              </div>
            ) : feedbacks.length === 0 ? (
              <div style={{ padding: 24 }}>
                <Empty description="No feedback submitted for this class yet" />
              </div>
            ) : (
              <List
                dataSource={feedbacks}
                itemLayout="vertical"
                renderItem={(item, index) => (
                  <Card
                    key={item.id}
                    style={{ marginBottom: 12 }}
                    size="small"
                    title={
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span>
                          Student #{index + 1} &mdash;{" "}
                          <Text type="secondary">{formatDateTime(item.createdAt)}</Text>
                        </span>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {getSentimentTag(item.sentiment, item.sentimentScore)}
                          {getUrgencyTag(item.urgency)}
                        </div>
                      </div>
                    }
                  >
                    {item.mainIssue && (
                      <div style={{ marginBottom: 8 }}>
                        <Text strong>Main issue:</Text>{" "}
                        <Text>{item.mainIssue}</Text>
                      </div>
                    )}
                    {item.freeText && (
                      <div style={{ marginBottom: 8 }}>
                        <Text strong>Student comments:</Text>
                        <br />
                        <Text>{item.freeText}</Text>
                      </div>
                    )}
                    {item.answers && (
                      <div style={{ marginTop: 8 }}>
                        <Collapse
                          ghost
                          size="small"
                          items={[
                            {
                              key: `answers-${item.id}`,
                              label: (
                                <Text type="secondary" strong>
                                  Answers summary ({Object.keys(item.answers).length} questions) — Click to expand
                                </Text>
                              ),
                              children: (
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                  {Object.entries(item.answers)
                                    .sort(([a], [b]) => Number(a) - Number(b))
                                    .map(([qid, value]) => {
                                      const question = questions.find((q) => q.id === Number(qid));
                                      const questionText = question?.questionText || `Question #${qid}`;
                                      
                                      // Map value 1-4 to readable labels
                                      const answerLabels = {
                                        1: "Not Satisfied",
                                        2: "Neutral", 
                                        3: "Satisfied",
                                        4: "Very Satisfied"
                                      };
                                      const answerLabel = answerLabels[value] || `Rating ${value}`;
                                      
                                      return (
                                        <div 
                                          key={qid} 
                                          style={{ 
                                            display: "flex", 
                                            alignItems: "flex-start", 
                                            gap: 8,
                                            padding: "8px 12px",
                                            background: "#f5f5f5",
                                            borderRadius: 4
                                          }}
                                        >
                                          <Tag color="geekblue" style={{ minWidth: 50, textAlign: "center", flexShrink: 0 }}>
                                            {value}/4
                                          </Tag>
                                          <div style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 13, display: "block", marginBottom: 4 }}>
                                              <strong>{questionText}</strong>
                                            </Text>
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                              {answerLabel}
                                            </Text>
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              ),
                            },
                          ]}
                        />
                      </div>
                    )}
                  </Card>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default LecturerEndOfCourseFeedbackPage;


