import React, { useEffect, useState } from "react";
import { Card, Space, Select, DatePicker, Button, Typography, message, Tabs } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import FeedbackApi from "../../../vn.fpt.edu.api/Feedback";
import ClassList from "../../../vn.fpt.edu.api/ClassList";
import SemesterApi from "../../../vn.fpt.edu.api/Semester";
import { api } from "../../../vn.fpt.edu.api/http";
import QuestionParetoChart from "./QuestionParetoChart";
import FeedbackTextSummary from "./FeedbackTextSummary";

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

export default function FeedbackAnalyticsPage() {
  const [classes, setClasses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [filters, setFilters] = useState({
    classId: null,
    semesterId: null,
    range: [null, null],
  });
  const [activeTab, setActiveTab] = useState("questions");
  const [questionData, setQuestionData] = useState([]);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [textSummaryData, setTextSummaryData] = useState(null);
  const [textSummaryLoading, setTextSummaryLoading] = useState(false);

  useEffect(() => {
    loadClasses();
    loadSemesters();
    loadQuestionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload data when filters change
  useEffect(() => {
    if (activeTab === "questions") {
      loadQuestionData();
    } else if (activeTab === "text") {
      loadTextSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.classId, filters.semesterId, filters.range]);

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

  const buildParams = () => {
    const params = {};
    if (filters.classId) params.classId = filters.classId;
    if (filters.semesterId) params.semesterId = filters.semesterId;
    const [from, to] = filters.range || [];
    // Only add date filters if both are set, otherwise query all feedbacks
    if (from && to) {
      params.from = from.toISOString();
      params.to = to.toISOString();
    }
    return params;
  };

  const loadQuestionData = async () => {
    try {
      setQuestionLoading(true);
      const params = buildParams();
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
      const params = buildParams();
      console.log("Loading text summary with params:", params);
      const result = await FeedbackApi.getTextSummary(params);
      console.log("Text summary API result:", result);
      
      // Handle different response formats
      if (result && typeof result === 'object') {
        // Check if result has the expected structure
        if (result.positiveSummary || result.negativeSummary) {
          setTextSummaryData(result);
        } else if (result.data) {
          // If wrapped in data property
          setTextSummaryData(result.data);
        } else {
          // If it's already the correct format
          setTextSummaryData(result);
        }
      } else {
        setTextSummaryData(null);
      }
    } catch (error) {
      console.error("Failed to load text summary:", error);
      console.error("Error details:", error.response?.data || error.message);
      const errorMsg = error.response?.data?.message || error.message || "Failed to load text analysis";
      message.error(errorMsg);
      setTextSummaryData(null);
    } finally {
      setTextSummaryLoading(false);
    }
  };

  const onRangeChange = (values) => {
    setFilters((prev) => ({ ...prev, range: values || [null, null] }));
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    if (key === "questions") {
      loadQuestionData();
    } else if (key === "text") {
      loadTextSummary();
    }
  };

  const handleReload = () => {
    if (activeTab === "questions") {
      loadQuestionData();
    } else if (activeTab === "text") {
      loadTextSummary();
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>Feedback Analytics</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            placeholder="Filter by Class"
            style={{ width: 220 }}
            allowClear
            value={filters.classId}
            onChange={(value) =>
              setFilters((prev) => ({ ...prev, classId: value || null }))
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
            value={filters.semesterId}
            onChange={(value) =>
              setFilters((prev) => ({ ...prev, semesterId: value || null }))
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
            onChange={onRangeChange}
          />

          <Button icon={<ReloadOutlined />} onClick={handleReload}>
            Reload
          </Button>
        </Space>
      </Card>

      <Tabs defaultActiveKey="questions" onChange={handleTabChange}>
        <TabPane tab="Question Analysis" key="questions">
          <QuestionParetoChart data={questionData} loading={questionLoading} />
        </TabPane>
        <TabPane tab="Text Analysis" key="text">
          <FeedbackTextSummary data={textSummaryData} loading={textSummaryLoading} />
        </TabPane>
      </Tabs>
    </div>
  );
}


