import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Card,
  Table,
  Select,
  Button,
  Space,
  Tag,
  Typography,
  message,
  Input,
  Empty,
} from "antd";
import { EyeOutlined, ReloadOutlined } from "@ant-design/icons";
import FeedbackApi from "../../../vn.fpt.edu.api/Feedback";
import ClassList from "../../../vn.fpt.edu.api/ClassList";
import { api } from "../../../vn.fpt.edu.api/http";
import { useAuth } from "../../login/AuthContext";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

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

export default function FeedbackListViewOnly() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get base path based on current route
  const getBasePath = () => {
    const path = location.pathname;
    return path.startsWith('/headOfAdmin') ? '/headOfAdmin' : '/staffOfAdmin';
  };
  
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState({
    classId: null,
    sentiment: null,
    urgency: null,
    status: null,
  });
  const [classes, setClasses] = useState([]);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    loadFeedbacks();
  }, [page, pageSize, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadClasses = async () => {
    try {
      const data = await ClassList.getAll();
      setClasses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load classes:", error);
      try {
        const res = await api.get("/api/staffAcademic/classes");
        const payload = res?.data?.data || res?.data || [];
        setClasses(Array.isArray(payload) ? payload : []);
      } catch (fallbackErr) {
        console.error("Fallback load classes failed:", fallbackErr);
        setClasses([]);
      }
    }
  };

  const loadFeedbacks = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        pageSize,
        ...filters,
      };
      const { items, total: totalCount } = await FeedbackApi.getFeedbacks(params);
      setFeedbacks(items || []);
      setTotal(totalCount || 0);
    } catch (error) {
      console.error("Failed to load feedbacks:", error);
      message.error("Failed to load feedback list");
    } finally {
      setLoading(false);
    }
  };

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

  const getUrgencyColor = (urgency) => {
    if (urgency >= 7) return "red";
    if (urgency >= 4) return "orange";
    return "default";
  };

  const filteredFeedbacks = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return feedbacks;
    return feedbacks.filter((fb) => {
      const fields = [
        fb.studentName,
        fb.className,
        fb.subjectName,
        fb.freeText,
        fb.mainIssue,
      ];
      return fields.some(
        (value) =>
          typeof value === "string" &&
          value.toLowerCase().includes(keyword)
      );
    });
  }, [feedbacks, searchText]);

  const columns = [
    {
      title: "No.",
      key: "index",
      width: 70,
      align: "center",
      render: (text, record, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: "Student ID",
      dataIndex: "studentCode",
      key: "studentCode",
      width: 110,
    },
    {
      title: "Student Name",
      dataIndex: "studentName",
      key: "studentName",
      width: 180,
    },
    {
      title: "Class",
      dataIndex: "className",
      key: "className",
      width: 160,
    },
    {
      title: "Subject",
      dataIndex: "subjectName",
      key: "subjectName",
      width: 220,
    },
    {
      title: "Comments",
      dataIndex: "freeText",
      key: "freeText",
      width: "30%",
      render: (text) => <FeedbackText text={text} />,
    },
    {
      title: "Satisfaction",
      dataIndex: "satisfactionScore",
      key: "satisfactionScore",
      width: 120,
      render: (score) => {
        if (score == null) return <Text>-</Text>;
        const percent = (score * 100).toFixed(0);
        return (
          <Tag color={score >= 0.7 ? "green" : score >= 0.4 ? "orange" : "red"}>
            {percent}%
          </Tag>
        );
      },
    },
    {
      title: "Sentiment",
      dataIndex: "sentiment",
      key: "sentiment",
      width: 100,
      render: (sentiment) => (
        <Tag color={getSentimentColor(sentiment)}>{sentiment || "N/A"}</Tag>
      ),
    },
    {
      title: "Urgency",
      dataIndex: "urgency",
      key: "urgency",
      width: 100,
      render: (urgency) => (
        <Tag color={getUrgencyColor(urgency)}>{urgency}/10</Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status) => {
        const colorMap = {
          New: "blue",
          Reviewed: "orange",
          Actioned: "green",
        };
        return <Tag color={colorMap[status] || "default"}>{status}</Tag>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      fixed: "right",
      render: (text, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`${getBasePath()}/feedback/${record.id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <Title level={2}>Student Feedback</Title>
      <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
        View-only access to student feedback. You can view and filter feedbacks but cannot edit or modify them.
      </Text>

      <Card style={{ marginBottom: "16px" }}>
        <Space wrap>
          <Input
            placeholder="Search by student, class, subject..."
            allowClear
            style={{ width: 260 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />

          <Select
            placeholder="Filter by Class"
            style={{ width: 200 }}
            allowClear
            value={filters.classId}
            onChange={(value) =>
              setFilters({ ...filters, classId: value || null })
            }
          >
            {classes.map((cls) => (
              <Option key={cls.classId} value={cls.classId}>
                {cls.className}
              </Option>
            ))}
          </Select>

          <Select
            placeholder="Filter by Sentiment"
            style={{ width: 150 }}
            allowClear
            value={filters.sentiment}
            onChange={(value) =>
              setFilters({ ...filters, sentiment: value || null })
            }
          >
            <Option value="Positive">Positive</Option>
            <Option value="Neutral">Neutral</Option>
            <Option value="Negative">Negative</Option>
          </Select>

          <Select
            placeholder="Filter by Urgency"
            style={{ width: 150 }}
            allowClear
            value={filters.urgency}
            onChange={(value) =>
              setFilters({ ...filters, urgency: value || null })
            }
          >
            <Option value={7}>High (≥7)</Option>
            <Option value={4}>Medium (≥4)</Option>
            <Option value={1}>Low (≥1)</Option>
          </Select>

          <Select
            placeholder="Filter by Status"
            style={{ width: 150 }}
            allowClear
            value={filters.status}
            onChange={(value) =>
              setFilters({ ...filters, status: value || null })
            }
          >
            <Option value="New">New</Option>
            <Option value="Reviewed">Reviewed</Option>
            <Option value="Actioned">Actioned</Option>
          </Select>

          <Button
            icon={<ReloadOutlined />}
            onClick={loadFeedbacks}
            loading={loading}
          >
            Refresh
          </Button>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={filteredFeedbacks}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: searchText ? filteredFeedbacks.length : total,
            showSizeChanger: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} feedbacks`,
            onChange: (newPage, newPageSize) => {
              setPage(newPage);
              setPageSize(newPageSize);
            },
          }}
          scroll={{ x: 1400 }}
          locale={{
            emptyText: (
              <Empty
                description="No feedback found"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
        />
      </Card>
    </div>
  );
}

