import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  DatePicker,
} from "antd";
import { EyeOutlined, ReloadOutlined, SyncOutlined } from "@ant-design/icons";
import FeedbackApi from "../../../vn.fpt.edu.api/Feedback";
import ClassList from "../../../vn.fpt.edu.api/ClassList";
import SemesterApi from "../../../vn.fpt.edu.api/Semester";
import { api } from "../../../vn.fpt.edu.api/http";
import { useAuth } from "../../login/AuthContext";
import QuestionParetoChart from "./QuestionParetoChart";
import FeedbackTextSummary from "./FeedbackTextSummary";

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

export default function FeedbackList() {
  const navigate = useNavigate();
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
  const [semesters, setSemesters] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState("list");
  const [analyticsFilters, setAnalyticsFilters] = useState({
    classId: null,
    semesterId: null,
    range: [null, null],
  });
  const [questionData, setQuestionData] = useState([]);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [textSummaryData, setTextSummaryData] = useState(null);
  const [textSummaryLoading, setTextSummaryLoading] = useState(false);

  // Check if user has permission (role 5 or 7)
  const canReAnalyzeAll = user?.roleId === 5 || user?.roleId === 7;

  useEffect(() => {
    loadClasses();
    loadSemesters();
  }, []);

  useEffect(() => {
    loadFeedbacks();
  }, [page, pageSize, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === "questions") {
      loadQuestionData();
    } else if (activeTab === "text") {
      loadTextSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, analyticsFilters.classId, analyticsFilters.semesterId, analyticsFilters.range]);

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

  const loadSemesters = async () => {
    try {
      const result = await SemesterApi.getSemesters();
      const items = result?.items || result || [];
      setSemesters(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error("Failed to load semesters:", error);
      setSemesters([]);
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

  const buildAnalyticsParams = () => {
    const params = {};
    if (analyticsFilters.classId) params.classId = analyticsFilters.classId;
    if (analyticsFilters.semesterId) params.semesterId = analyticsFilters.semesterId;
    const [from, to] = analyticsFilters.range || [];
    if (from && to) {
      params.from = from.toISOString();
      params.to = to.toISOString();
    }
    return params;
  };

  const loadQuestionData = async () => {
    try {
      setQuestionLoading(true);
      const params = buildAnalyticsParams();
      const result = await FeedbackApi.getQuestionPareto(params);
      setQuestionData(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error("Failed to load question data:", error);
      message.error("Failed to load question analysis");
      setQuestionData([]);
    } finally {
      setQuestionLoading(false);
    }
  };

  const loadTextSummary = async () => {
    try {
      setTextSummaryLoading(true);
      const params = buildAnalyticsParams();
      const result = await FeedbackApi.getTextSummary(params);
      
      if (result && typeof result === 'object') {
        if (result.positiveSummary || result.negativeSummary) {
          setTextSummaryData(result);
        } else if (result.data) {
          setTextSummaryData(result.data);
        } else {
          setTextSummaryData(result);
        }
      } else {
        setTextSummaryData(null);
      }
    } catch (error) {
      console.error("Failed to load text summary:", error);
      const errorMsg = error.response?.data?.message || error.message || "Failed to load text analysis";
      message.error(errorMsg);
      setTextSummaryData(null);
    } finally {
      setTextSummaryLoading(false);
    }
  };

  const handleAnalyticsReload = () => {
    if (activeTab === "questions") {
      loadQuestionData();
    } else if (activeTab === "text") {
      loadTextSummary();
    }
  };

  const columns = [
    {
      title: "Student",
      dataIndex: "studentName",
      key: "studentName",
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
          onClick={() => navigate(`/staffAcademic/feedback/${record.id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <Title level={2}>Feedback List</Title>

      <Tabs defaultActiveKey="list" onChange={setActiveTab}>
        <TabPane tab="Feedback List" key="list">
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

        <TabPane tab="Question Analysis" key="questions">
          <Card style={{ marginBottom: 16 }}>
            <Space wrap>
              <Select
                placeholder="Filter by Class"
                style={{ width: 220 }}
                allowClear
                value={analyticsFilters.classId}
                onChange={(value) =>
                  setAnalyticsFilters((prev) => ({ ...prev, classId: value || null }))
                }
              >
                {classes.map((cls) => (
                  <Option key={cls.classId} value={cls.classId}>
                    {cls.className}
                  </Option>
                ))}
              </Select>

              <Select
                placeholder="Filter by Semester"
                style={{ width: 220 }}
                allowClear
                value={analyticsFilters.semesterId}
                onChange={(value) =>
                  setAnalyticsFilters((prev) => ({ ...prev, semesterId: value || null }))
                }
              >
                {semesters.map((sem) => (
                  <Option key={sem.semesterId} value={sem.semesterId}>
                    {sem.name} ({sem.semesterCode})
                  </Option>
                ))}
              </Select>

              <RangePicker
                allowEmpty={[true, true]}
                onChange={(values) =>
                  setAnalyticsFilters((prev) => ({ ...prev, range: values || [null, null] }))
                }
              />

              <Button icon={<ReloadOutlined />} onClick={handleAnalyticsReload}>
                Reload
              </Button>
            </Space>
          </Card>

          <QuestionParetoChart data={questionData} loading={questionLoading} />
        </TabPane>

        <TabPane tab="Text Analysis" key="text">
          <Card style={{ marginBottom: 16 }}>
            <Space wrap>
              <Select
                placeholder="Filter by Class"
                style={{ width: 220 }}
                allowClear
                value={analyticsFilters.classId}
                onChange={(value) =>
                  setAnalyticsFilters((prev) => ({ ...prev, classId: value || null }))
                }
              >
                {classes.map((cls) => (
                  <Option key={cls.classId} value={cls.classId}>
                    {cls.className}
                  </Option>
                ))}
              </Select>

              <Select
                placeholder="Filter by Semester"
                style={{ width: 220 }}
                allowClear
                value={analyticsFilters.semesterId}
                onChange={(value) =>
                  setAnalyticsFilters((prev) => ({ ...prev, semesterId: value || null }))
                }
              >
                {semesters.map((sem) => (
                  <Option key={sem.semesterId} value={sem.semesterId}>
                    {sem.name} ({sem.semesterCode})
                  </Option>
                ))}
              </Select>

              <RangePicker
                allowEmpty={[true, true]}
                onChange={(values) =>
                  setAnalyticsFilters((prev) => ({ ...prev, range: values || [null, null] }))
                }
              />

              <Button icon={<ReloadOutlined />} onClick={handleAnalyticsReload}>
                Reload
              </Button>
            </Space>
          </Card>

          <FeedbackTextSummary data={textSummaryData} loading={textSummaryLoading} />
        </TabPane>
      </Tabs>
    </div>
  );
}

