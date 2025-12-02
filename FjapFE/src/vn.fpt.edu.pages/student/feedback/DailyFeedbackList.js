import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Typography,
  Space,
  Button,
  DatePicker,
  message,
  Empty,
  Spin,
} from "antd";
import {
  MessageOutlined,
  CalendarOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import DailyFeedbackApi from "../../../vn.fpt.edu.api/DailyFeedback";
import dayjs from "dayjs";

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

function FeedbackText({ text }) {
  const [expanded, setExpanded] = useState(false);

  if (!text) {
    return <Text>N/A</Text>;
  }

  return (
    <div style={{ maxWidth: 600 }}>
      {expanded ? (
        <>
          <Text style={{ whiteSpace: "pre-line" }}>{text}</Text>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            style={{
              marginLeft: 8,
              fontSize: 12,
              border: "none",
              background: "none",
              padding: 0,
              color: "#1890ff",
              cursor: "pointer",
            }}
          >
            Less
          </button>
        </>
      ) : (
        <>
          <Paragraph
            style={{ marginBottom: 0, whiteSpace: "pre-line" }}
            ellipsis={{ rows: 2 }}
          >
            {text}
          </Paragraph>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            style={{
              fontSize: 12,
              border: "none",
              background: "none",
              padding: 0,
              color: "#1890ff",
              cursor: "pointer",
            }}
          >
            More
          </button>
        </>
      )}
    </div>
  );
}

export default function DailyFeedbackList() {
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    classId: null,
    dateFrom: null,
    dateTo: null,
    page: 1,
    pageSize: 20,
  });
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadFeedbacks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const loadFeedbacks = async () => {
    try {
      setLoading(true);
      const params = {
        page: filters.page,
        pageSize: filters.pageSize,
      };

      if (filters.classId) {
        params.classId = filters.classId;
      }
      if (filters.dateFrom) {
        params.dateFrom = filters.dateFrom.format("YYYY-MM-DD");
      }
      if (filters.dateTo) {
        params.dateTo = filters.dateTo.format("YYYY-MM-DD");
      }

      const result = await DailyFeedbackApi.getStudentDailyFeedbacks(params);
      setFeedbacks(result.items || []);
      setTotal(result.total || 0);
    } catch (error) {
      console.error("Failed to load daily feedbacks:", error);
      message.error("Failed to load daily feedbacks");
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (dates) => {
    if (dates && dates.length === 2) {
      setFilters({
        ...filters,
        dateFrom: dates[0],
        dateTo: dates[1],
        page: 1,
      });
    } else {
      setFilters({
        ...filters,
        dateFrom: null,
        dateTo: null,
        page: 1,
      });
    }
  };

  const columns = [
    {
      title: "No.",
      key: "index",
      width: 80,
      align: "center",
      render: (text, record, index) =>
        (filters.page - 1) * filters.pageSize + index + 1,
    },
    {
      title: "Class",
      dataIndex: "className",
      key: "className",
    },
    {
      title: "Subject",
      dataIndex: "subjectName",
      key: "subjectName",
    },
    {
      title: "Feedback",
      dataIndex: "feedbackText",
      key: "feedbackText",
      width: "50%",
      render: (text) => <FeedbackText text={text} />,
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) =>
        date ? dayjs(date).format("DD/MM/YYYY HH:mm") : "N/A",
      sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
    },
  ];

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Title level={2} style={{ margin: 0 }}>
              <MessageOutlined style={{ color: "#52c41a" }} /> My Daily Feedbacks
            </Title>
            <Button
              icon={<CalendarOutlined />}
              onClick={() => navigate("/student/weeklyTimetable")}
            >
              Go to Schedule
            </Button>
          </div>

          {/* Filters */}
          <Card
            size="small"
            title={
              <>
                <FilterOutlined /> Filters
              </>
            }
          >
            <Space wrap>
              <RangePicker
                onChange={handleDateRangeChange}
                format="DD/MM/YYYY"
                placeholder={["From Date", "To Date"]}
              />
              <Button type="primary" onClick={loadFeedbacks}>
                Apply
              </Button>
              <Button
                onClick={() =>
                  setFilters({
                    ...filters,
                    dateFrom: null,
                    dateTo: null,
                    page: 1,
                  })
                }
              >
                Clear
              </Button>
            </Space>
          </Card>

          {/* Table */}
          <Spin spinning={loading}>
            <Table
              columns={columns}
              dataSource={feedbacks}
              rowKey="id"
              scroll={{ x: "max-content" }}
              pagination={{
                current: filters.page,
                pageSize: filters.pageSize,
                total: total,
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} feedbacks`,
                onChange: (page, pageSize) => {
                  setFilters({
                    ...filters,
                    page,
                    pageSize,
                  });
                },
              }}
              locale={{
                emptyText: (
                  <Empty
                    description="No daily feedbacks found"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ),
              }}
            />
          </Spin>
        </Space>
      </Card>
    </div>
  );
}

