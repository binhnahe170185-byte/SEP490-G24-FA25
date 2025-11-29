import React from "react";
import { Card, Typography, Empty, Row, Col, Skeleton } from "antd";
import ProgressRingChart from "./ProgressRingChart";

const { Text, Title } = Typography;

function truncateText(text, maxLength = 100) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

export default function QuestionParetoChart({ data, loading }) {
  const hasData = Array.isArray(data) && data.length > 0;

  if (loading) {
    return (
      <Card
        title="Question Analysis - Average Scores"
        style={{ width: "100%" }}
      >
        <Row gutter={[16, 16]}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Col xs={24} sm={12} lg={8} key={i}>
              <Card
                style={{
                  borderRadius: 8,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                <Skeleton active paragraph={{ rows: 2 }} />
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card
        title="Question Analysis - Average Scores"
        style={{ width: "100%" }}
      >
        <Empty
          description="No question data available for the selected filters."
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <Card
      title="Question Analysis - Average Scores"
      style={{ width: "100%" }}
    >
      <Row gutter={[16, 16]}>
        {data.map((item) => {
          const percentage = item.percentage || 0;
          
          // Determine color based on percentage
          let color;
          if (percentage >= 70) {
            color = "#52c41a"; // Green
          } else if (percentage >= 40) {
            color = "#fa8c16"; // Orange
          } else {
            color = "#ff4d4f"; // Red
          }

          return (
            <Col xs={24} sm={12} lg={8} key={item.questionId}>
              <Card
                hoverable
                style={{
                  borderRadius: 8,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  transition: "all 0.3s ease",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
                bodyStyle={{
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  flex: 1,
                }}
              >
                {/* Question Text or Evaluation Label */}
                <div
                  style={{
                    marginBottom: 20,
                    minHeight: 48,
                    textAlign: "center",
                  }}
                >
                  <Text
                    strong
                    style={{
                      fontSize: 14,
                      lineHeight: 1.5,
                      color: "#262626",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    Q{item.orderIndex}: {truncateText(item.evaluationLabel || item.questionText, 80)}
                  </Text>
                </div>

                {/* Progress Ring Chart */}
                <div style={{ marginBottom: 16, position: "relative" }}>
                  <ProgressRingChart
                    percentage={percentage}
                    size={150}
                  />
                </div>

                {/* Stats */}
                <div
                  style={{
                    textAlign: "center",
                    width: "100%",
                    marginTop: "auto",
                  }}
                >
                  <div style={{ marginBottom: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Average Score:{" "}
                    </Text>
                    <Text
                      strong
                      style={{
                        fontSize: 14,
                        color: color,
                      }}
                    >
                      {item.averageScore.toFixed(2)}/10
                    </Text>
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {item.responseCount} response
                      {item.responseCount !== 1 ? "s" : ""}
                    </Text>
                  </div>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
    </Card>
  );
}