import React, { useState } from "react";
import { Card, Table, Tag, Typography, Collapse, Empty } from "antd";
import { CaretRightOutlined } from "@ant-design/icons";

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

export default function FeedbackTextSummary({ data, loading }) {
  const [expandedRows, setExpandedRows] = useState({});

  if (loading) {
    return (
      <Card title="Text Feedback Summary" loading={loading} style={{ width: "100%" }}>
        <Empty description="Loading analysis..." />
      </Card>
    );
  }

  if (!data || (data.totalPositiveCount === 0 && data.totalNegativeCount === 0)) {
    return (
      <Card title="Text Feedback Summary" style={{ width: "100%" }}>
        <Empty description="No text feedback data available for the selected filters." />
      </Card>
    );
  }

  const negativeColumns = [
    {
      title: "Topic",
      dataIndex: "topic",
      key: "topic",
      render: (text, record) => (
        <Text strong={record.mentionCount >= 5}>{text}</Text>
      ),
    },
    {
      title: "Summary",
      dataIndex: "summary",
      key: "summary",
      render: (text) => <Paragraph style={{ margin: 0 }}>{text}</Paragraph>,
    },
    {
      title: "Mentions",
      dataIndex: "mentionCount",
      key: "mentionCount",
      width: 100,
      sorter: (a, b) => b.mentionCount - a.mentionCount,
      render: (count, record) => (
        <Tag color={count >= 5 ? "red" : count >= 3 ? "orange" : "default"}>
          {count}
        </Tag>
      ),
    },
    {
      title: "Urgency",
      dataIndex: "urgencyScore",
      key: "urgencyScore",
      width: 100,
      render: (score) => (
        <Tag color={score >= 7 ? "red" : score >= 4 ? "orange" : "default"}>
          {score}/10
        </Tag>
      ),
    },
  ];

  const positiveColumns = [
    {
      title: "Topic",
      dataIndex: "topic",
      key: "topic",
    },
    {
      title: "Summary",
      dataIndex: "summary",
      key: "summary",
      render: (text) => <Paragraph style={{ margin: 0 }}>{text}</Paragraph>,
    },
    {
      title: "Mentions",
      dataIndex: "mentionCount",
      key: "mentionCount",
      width: 100,
      render: (count) => <Tag>{count}</Tag>,
    },
  ];

  const negativeData = (data.negativeSummary || []).map((item, idx) => ({
    ...item,
    key: `negative-${idx}`,
    rowStyle: item.mentionCount >= 5 ? { backgroundColor: "#fff1f0" } : {},
  }));

  const positiveData = (data.positiveSummary || []).map((item, idx) => ({
    ...item,
    key: `positive-${idx}`,
  }));

  const getRowClassName = (record) => {
    if (record.mentionCount >= 5) return "highlight-row";
    return "";
  };

  return (
    <Card title="Text Feedback Summary" style={{ width: "100%" }}>
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          Total: <strong>{data.totalPositiveCount + data.totalNegativeCount}</strong> feedbacks
          {data.totalPositiveCount > 0 && (
            <span style={{ marginLeft: 16 }}>
              Positive: <Tag color="green">{data.totalPositiveCount}</Tag>
            </span>
          )}
          {data.totalNegativeCount > 0 && (
            <span style={{ marginLeft: 8 }}>
              Negative: <Tag color="red">{data.totalNegativeCount}</Tag>
            </span>
          )}
        </Text>
      </div>

      <Collapse
        defaultActiveKey={["negative", "positive"]}
        expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
      >
        {data.totalNegativeCount > 0 && (
          <Panel
            header={
              <span>
                Negative Feedback {data.negativeSummary?.length > 0 && `(${data.negativeSummary.length} topics)`}{" "}
                <Tag color="red">{data.totalNegativeCount} feedbacks</Tag>
              </span>
            }
            key="negative"
          >
            {negativeData.length > 0 ? (
              <Table
                columns={negativeColumns}
                dataSource={negativeData}
                pagination={{ pageSize: 10 }}
                rowClassName={getRowClassName}
                expandable={{
                  expandedRowRender: (record) => (
                    <div style={{ padding: "8px 0" }}>
                      <Text strong>Examples:</Text>
                      <ul style={{ marginTop: 8, marginBottom: 0 }}>
                        {record.examples?.map((example, idx) => (
                          <li key={idx} style={{ marginBottom: 4 }}>
                            <Text type="secondary">"{example}"</Text>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ),
                  rowExpandable: (record) => record.examples && record.examples.length > 0,
                }}
              />
            ) : (
              <Empty 
                description="AI analysis is in progress. Please wait or try reloading." 
                style={{ padding: "40px 0" }}
              />
            )}
          </Panel>
        )}

        {data.positiveSummary?.length > 0 && (
          <Panel
            header={
              <span>
                Positive Feedback ({data.positiveSummary.length} topics){" "}
                <Tag color="green">{data.totalPositiveCount} feedbacks</Tag>
              </span>
            }
            key="positive"
          >
            <Table
              columns={positiveColumns}
              dataSource={positiveData}
              pagination={{ pageSize: 10 }}
              expandable={{
                expandedRowRender: (record) => (
                  <div style={{ padding: "8px 0" }}>
                    <Text strong>Examples:</Text>
                    <ul style={{ marginTop: 8, marginBottom: 0 }}>
                      {record.examples?.map((example, idx) => (
                        <li key={idx} style={{ marginBottom: 4 }}>
                          <Text type="secondary">"{example}"</Text>
                        </li>
                      ))}
                    </ul>
                  </div>
                ),
                rowExpandable: (record) => record.examples && record.examples.length > 0,
              }}
            />
          </Panel>
        )}
      </Collapse>

      <style>{`
        .highlight-row {
          background-color: #fff1f0 !important;
          font-weight: 500;
        }
        .highlight-row:hover {
          background-color: #ffe7e5 !important;
        }
      `}</style>
    </Card>
  );
}
