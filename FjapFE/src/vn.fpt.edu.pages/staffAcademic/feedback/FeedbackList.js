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
  Popconfirm,
  Tabs,
  Empty,
} from "antd";
import { EyeOutlined, ReloadOutlined, SyncOutlined } from "@ant-design/icons";
import FeedbackApi from "../../../vn.fpt.edu.api/Feedback";
import DailyFeedbackApi from "../../../vn.fpt.edu.api/DailyFeedback";
import ClassList from "../../../vn.fpt.edu.api/ClassList";
import { api } from "../../../vn.fpt.edu.api/http";
import { useAuth } from "../../login/AuthContext";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

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

export default function FeedbackList() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get base path based on current route
  const getBasePath = () => {
    const path = location.pathname;
    return path.startsWith('/headOfAcademic') ? '/headOfAcademic' : '/staffAcademic';
  };
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reAnalyzing, setReAnalyzing] = useState(false);
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
  const [activeTab, setActiveTab] = useState("course");

  // Daily feedback state
  const [dailyFeedbacks, setDailyFeedbacks] = useState([]);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [dailyPage, setDailyPage] = useState(1);
  const [dailyPageSize, setDailyPageSize] = useState(20);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [updatingDailyId, setUpdatingDailyId] = useState(null);
  const [dailyFilters, setDailyFilters] = useState({
    classId: null,
    status: null,
  });

  // Check if user has permission (role 5 or 7)
  const canReAnalyzeAll = user?.roleId === 5 || user?.roleId === 7;

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    loadFeedbacks();
  }, [page, pageSize, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === "daily") {
      loadDailyFeedbacks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, dailyPage, dailyPageSize, dailyFilters.classId, dailyFilters.status]);


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

  const loadDailyFeedbacks = async () => {
    try {
      setDailyLoading(true);
      const params = {
        page: dailyPage,
        pageSize: dailyPageSize,
      };

      if (dailyFilters.classId) {
        params.classId = dailyFilters.classId;
      }

      if (dailyFilters.status) {
        params.status = dailyFilters.status;
      }

      // Use new endpoint that supports both filtered and all feedbacks
      const result = await DailyFeedbackApi.getAllDailyFeedbacks(params);
      const items = result.items || [];
      const totalCount = result.total || 0;

      setDailyFeedbacks(items || []);
      setDailyTotal(totalCount || 0);
    } catch (error) {
      console.error("Failed to load daily feedbacks:", error);
      message.error("Failed to load daily feedback list");
      setDailyFeedbacks([]);
      setDailyTotal(0);
    } finally {
      setDailyLoading(false);
    }
  };

  const handleDailyStatusUpdate = async (record, status) => {
    if (!status || status === record.status) return;

    try {
      setUpdatingDailyId(record.id);
      await DailyFeedbackApi.updateStatus(record.id, status);
      message.success("Daily feedback status updated");
      await loadDailyFeedbacks();
    } catch (error) {
      console.error("Failed to update daily feedback status:", error);
      message.error("Failed to update daily feedback status");
    } finally {
      setUpdatingDailyId(null);
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

  const handleReAnalyzeAll = async () => {
    try {
      setReAnalyzing(true);
      const result = await FeedbackApi.reAnalyzeAllWithoutCategory(50); // Limit 50 per batch
      message.success(
        `Re-analyzed ${result.processed} feedbacks: ${result.succeeded} succeeded, ${result.failed} failed`
      );
      // Reload feedback list to show updated data
      await loadFeedbacks();
    } catch (error) {
      console.error("Failed to re-analyze all:", error);
      const errorMsg = error.response?.data?.message || "Failed to re-analyze all feedbacks";
      message.error(errorMsg);
    } finally {
      setReAnalyzing(false);
    }
  };

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
      title: "Satisfaction",
      dataIndex: "satisfactionScore",
      key: "satisfactionScore",
      render: (score) => `${(score * 100).toFixed(0)}%`,
    },
    {
      title: "Sentiment",
      dataIndex: "sentiment",
      key: "sentiment",
      render: (sentiment) => (
        <Tag color={getSentimentColor(sentiment)}>{sentiment}</Tag>
      ),
    },
    {
      title: "Urgency",
      dataIndex: "urgency",
      key: "urgency",
      render: (urgency) => (
        <Tag color={getUrgencyColor(urgency)}>{urgency}/10</Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status) => (
        <Tag color={status === "New" ? "blue" : status === "Reviewed" ? "green" : "default"}>
          {status}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Button
          icon={<EyeOutlined />}
          onClick={() => navigate(`${getBasePath()}/feedback/${record.id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  const dailyColumns = [
    {
      title: "No.",
      key: "index",
      width: 70,
      align: "center",
      render: (text, record, index) =>
        (dailyPage - 1) * dailyPageSize + index + 1,
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
      title: "Feedback",
      dataIndex: "feedbackText",
      key: "feedbackText",
      width: "45%",
      render: (text) => <FeedbackText text={text} />,
    },
    {
      title: "Urgency",
      dataIndex: "urgency",
      key: "urgency",
      render: (urgency) => (
        <Tag
          color={
            urgency >= 7 ? "red" : urgency >= 4 ? "orange" : "green"
          }
        >
          {urgency}/10
        </Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status, record) => (
        <Select
          size="small"
          value={status}
          style={{ width: "100%" }}
          loading={updatingDailyId === record.id}
          onChange={(value) => handleDailyStatusUpdate(record, value)}
        >
          <Option value="New">New</Option>
          <Option value="Reviewed">Reviewed</Option>
          <Option value="Actioned">Actioned</Option>
        </Select>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <Title level={2}>
        {activeTab === "daily" ? "Daily Feedback" : "Course Feedback"}
      </Title>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Course Feedback" key="course">
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
                onChange={(value) => setFilters({ ...filters, classId: value })}
              >
                {classes.map((cls) => (
                  <Option key={cls.classId} value={cls.classId}>
                    {cls.className}
                  </Option>
                ))}
              </Select>

              <Select
                placeholder="Sentiment"
                style={{ width: 150 }}
                allowClear
                value={filters.sentiment}
                onChange={(value) => setFilters({ ...filters, sentiment: value })}
              >
                <Option value="Positive">Positive</Option>
                <Option value="Neutral">Neutral</Option>
                <Option value="Negative">Negative</Option>
              </Select>

              <Select
                placeholder="Urgency"
                style={{ width: 150 }}
                allowClear
                value={filters.urgency}
                onChange={(value) => setFilters({ ...filters, urgency: value })}
              >
                <Option value={7}>≥ 7 (High)</Option>
                <Option value={4}>≥ 4 (Medium)</Option>
              </Select>

              <Select
                placeholder="Status"
                style={{ width: 150 }}
                allowClear
                value={filters.status}
                onChange={(value) => setFilters({ ...filters, status: value })}
              >
                <Option value="New">New</Option>
                <Option value="Reviewed">Reviewed</Option>
                <Option value="Actioned">Actioned</Option>
              </Select>

              <Button icon={<ReloadOutlined />} onClick={loadFeedbacks}>
                Refresh
              </Button>
              {canReAnalyzeAll && (
                <Popconfirm
                  title="Re-analyze all feedbacks without category?"
                  description="This will re-analyze up to 50 feedbacks that don't have a category assigned. This may take a few minutes and consume AI API quota."
                  onConfirm={handleReAnalyzeAll}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button
                    icon={<SyncOutlined />}
                    type="primary"
                    danger
                    loading={reAnalyzing}
                  >
                    Re-analyze All
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </Card>

          <Table
            columns={columns}
            dataSource={filteredFeedbacks}
            loading={loading}
            rowKey="id"
            pagination={{
              current: page,
              pageSize,
              total,
              onChange: (p, ps) => {
                setPage(p);
                setPageSize(ps);
              },
            }}
          />
        </TabPane>

        <TabPane tab="Daily Feedback" key="daily">
          <Card style={{ marginBottom: "16px" }}>
            <Space wrap>
              <Select
                placeholder="Filter by Class (Optional)"
                style={{ width: 220 }}
                allowClear
                value={dailyFilters.classId}
                onChange={(value) => {
                  setDailyFilters((prev) => ({
                    ...prev,
                    classId: value || null,
                  }));
                  // Reset to page 1 when class changes
                  setDailyPage(1);
                }}
              >
                {classes.map((cls) => (
                  <Option key={cls.classId} value={cls.classId}>
                    {cls.className}
                  </Option>
                ))}
              </Select>

              <Select
                placeholder="Status"
                style={{ width: 150 }}
                allowClear
                value={dailyFilters.status}
                onChange={(value) => {
                  setDailyFilters((prev) => ({
                    ...prev,
                    status: value || null,
                  }));
                  // Reset to page 1 when status changes
                  setDailyPage(1);
                }}
              >
                <Option value="New">New</Option>
                <Option value="Reviewed">Reviewed</Option>
                <Option value="Actioned">Actioned</Option>
              </Select>

              <Button icon={<ReloadOutlined />} onClick={loadDailyFeedbacks}>
                Refresh
              </Button>
            </Space>
          </Card>

          <Table
            columns={dailyColumns}
            dataSource={dailyFeedbacks}
            loading={dailyLoading}
            rowKey="id"
            pagination={{
              current: dailyPage,
              pageSize: dailyPageSize,
              total: dailyTotal,
              onChange: (p, ps) => {
                setDailyPage(p);
                setDailyPageSize(ps);
              },
            }}
            locale={{
              emptyText: <Empty description="No daily feedbacks found" />,
            }}
          />
        </TabPane>
      </Tabs>
    </div>
  );
}

