import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Breadcrumb,
  Button,
  Card,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
} from "antd";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  FileTextOutlined,
  StarOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import LecturerHomework from "../../../vn.fpt.edu.api/LecturerHomework";

import { useNotify } from "../../../vn.fpt.edu.common/notifications";

const { TextArea } = Input;

const HomeworkSubmissionPage = () => {
  const { classId, lessonId, homeworkId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const notify = useNotify();

  const slot = location.state?.slot || null;
  const homework = location.state?.homework || null;

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [evaluationVisible, setEvaluationVisible] = useState(false);
  const [currentSubmission, setCurrentSubmission] = useState(null);
  const [savingEvaluation, setSavingEvaluation] = useState(false);
  const [evaluationForm] = Form.useForm();

  const appendCacheBuster = (url) => {
    if (!url) return url;
    try {
      const parsed = new URL(url, window.location.href);
      parsed.searchParams.set("_", Date.now().toString());
      return parsed.toString();
    } catch {
      const separator = url.includes("?") ? "&" : "?";
      return `${url}${separator}_=${Date.now()}`;
    }
  };

  const handleOpenPreview = (url) => {
    if (!url) {
      notify.error("preview_error", "Error", "File path is missing.");
      return;
    }
    const targetUrl = appendCacheBuster(url);
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownloadFile = async (url) => {
    if (!url) {
      notify.error("download_error", "Download Failed", "File path is missing.");
      return;
    }
    try {
      // Extract filename from URL
      let filename = "download";
      try {
        const parsed = new URL(url, window.location.href);
        const pathParts = parsed.pathname.split("/");
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart && lastPart.includes(".")) {
          filename = decodeURIComponent(lastPart);
        }
      } catch {
        // Use default filename
      }

      // Check if it's a Google Drive link
      const isGoogleDrive = url.toLowerCase().includes("drive.google.com");
      if (isGoogleDrive) {
        const shareIdMatch = url.match(/\/d\/([A-Za-z0-9_-]+)/);
        if (shareIdMatch) {
          const downloadUrl = `https://drive.google.com/uc?export=download&id=${shareIdMatch[1]}`;
          window.open(downloadUrl, "_blank", "noopener,noreferrer");
          return;
        }
      }

      // For other files, fetch and download
      const response = await fetch(appendCacheBuster(url));

      if (!response.ok) {
        throw new Error("Failed to download file");
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      
      message.success(`Downloading ${filename}`);
    } catch (error) {
      console.error("Download error:", error);
      // Fallback: open in new tab
      window.open(appendCacheBuster(url), "_blank", "noopener,noreferrer");
    }
  };

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        const data = await LecturerHomework.getHomeworkSubmissions(homeworkId);
        setSubmissions(data);
      } catch (error) {
        console.error("Failed to load homework submissions:", error);
        notify.error("load_submission_error", "Load Failed", "Unable to load submissions");
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [homeworkId]);

  const meta = useMemo(() => {
    if (!slot && !homework) return {};
    return {
      className: slot?.className,
      subjectCode: slot?.subjectCode,
      slotId: slot?.slotId,
      dateLabel: slot?.date ? dayjs(slot.date).format("DD/MM/YYYY") : null,
      timeLabel:
        slot?.startTime && slot?.endTime
          ? `${slot.startTime} - ${slot.endTime}`
          : slot?.startTime || slot?.endTime || null,
      homeworkTitle: homework?.title,
    };
  }, [slot, homework]);

  const statusOptions = [
    { value: "Graded", label: "Graded" },
    { value: "Late", label: "Late" },
    { value: "Rejected", label: "Rejected" },
  ];

  const openEvaluation = (record) => {
    setCurrentSubmission(record);
    evaluationForm.setFieldsValue({
      status: record.status || "Graded",
      comment: record.comment || "",
      feedback: record.feedback || "",
    });
    setEvaluationVisible(true);
  };

  const closeEvaluation = () => {
    setEvaluationVisible(false);
    setCurrentSubmission(null);
    evaluationForm.resetFields();
  };

  // handleEvaluationSubmit rewrite:
  const handleEvaluationSubmit = async () => {
    const notifyKey = `evaluate_submission_${currentSubmission?.submissionId}`;
    try {
      const values = await evaluationForm.validateFields();
      setSavingEvaluation(true);
      notify.pending(notifyKey, "Saving Evaluation", "Please wait...");

      const updated = await LecturerHomework.updateHomeworkSubmission(
        homeworkId,
        currentSubmission.submissionId,
        values
      );
      setSubmissions((prev) =>
        prev.map((item) =>
          item.submissionId === updated.submissionId
            ? {
              ...item,
              status: updated.status,
              comment: updated.comment,
              feedback: updated.feedback,
            }
            : item
        )
      );
      notify.success(notifyKey, "Evaluated", "Submission evaluated successfully");
      closeEvaluation();
    } catch (error) {
      console.error("Failed to evaluate submission:", error);
      notify.error(notifyKey, "Evaluation Failed", "Unable to save evaluation. Please try again.");
    } finally {
      setSavingEvaluation(false);
    }
  };

  const columns = [
    {
      title: "Student",
      key: "student",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 600 }}>{record.studentName || "N/A"}</span>
          <span style={{ color: "#8c8c8c" }}>#{record.studentCode || record.studentId}</span>
        </Space>
      ),
    },
    {
      title: "Submitted At",
      dataIndex: "submittedAt",
      key: "submittedAt",
      width: 180,
      render: (value) =>
        value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "N/A",
      sorter: (a, b) => {
        const aTime = a.submittedAt ? dayjs(a.submittedAt).valueOf() : 0;
        const bTime = b.submittedAt ? dayjs(b.submittedAt).valueOf() : 0;
        return aTime - bTime;
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (status) => {
        if (!status) return <Tag>Submitted</Tag>;
        const lowered = status.toLowerCase();
        const color =
          lowered === "graded"
            ? "green"
            : lowered === "rejected"
              ? "red"
              : lowered === "late"
                ? "orange"
                : "default";
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: "File",
      dataIndex: "filePath",
      key: "filePath",
      width: 200,
      render: (filePath) =>
        filePath ? (
          <Space>
            <Button
              icon={<EyeOutlined />}
              onClick={() => handleOpenPreview(filePath)}
            >
              Preview
            </Button>
            <Button
              icon={<FileTextOutlined />}
              onClick={() => handleDownloadFile(filePath)}
            >
              Download
            </Button>
          </Space>
        ) : (
          <span style={{ color: "#8c8c8c" }}>No file</span>
        ),
    },
    {
      title: "Comment",
      dataIndex: "comment",
      key: "comment",
      render: (text) => text || "-",
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      align: "center",
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<StarOutlined />}
            onClick={() => openEvaluation(record)}
          >
            Evaluate
          </Button>
        </Space>
      ),
    },
  ];

  const breadcrumbItems = [
    { title: "Lecturer" },
    {
      title: (
        <span style={{ cursor: "pointer" }} onClick={() => navigate("/lecturer/homework")}>
          Homework Management
        </span>
      ),
    },
    {
      title: (
        <span
          style={{ cursor: "pointer" }}
          onClick={() =>
            navigate(`/lecturer/homework/${classId}/${lessonId}`, {
              state: {
                slot,
                course: location.state?.course,
                from: location.state?.from,
              },
            })
          }
        >
          Homework Detail
        </span>
      ),
    },
    { title: "Homework Submission" },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Breadcrumb items={breadcrumbItems} style={{ marginBottom: 16 }} />

      <div style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() =>
            navigate(`/lecturer/homework/${classId}/${lessonId}`, {
              state: {
                slot,
                course: location.state?.course,
                from: location.state?.from,
              },
            })
          }
        >
          Back
        </Button>
        <h1 style={{ margin: "12px 0 0", fontSize: 28, fontWeight: 600 }}>
          Homework submission page
        </h1>
        <p style={{ margin: 0, color: "#595959" }}>
          Homework #{homeworkId}
          {meta.homeworkTitle ? ` • ${meta.homeworkTitle}` : ""}
        </p>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <Space size="large" wrap>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CalendarOutlined style={{ color: "#8c8c8c" }} />
            <div>
              <div style={{ fontSize: 12, color: "#8c8c8c" }}>Date</div>
              <div style={{ fontWeight: 600 }}>{meta.dateLabel || "N/A"}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ClockCircleOutlined style={{ color: "#8c8c8c" }} />
            <div>
              <div style={{ fontSize: 12, color: "#8c8c8c" }}>Time</div>
              <div style={{ fontWeight: 600 }}>{meta.timeLabel || "N/A"}</div>
            </div>
          </div>
          {meta.className && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <UserOutlined style={{ color: "#8c8c8c" }} />
              <div>
                <div style={{ fontSize: 12, color: "#8c8c8c" }}>Class</div>
                <div style={{ fontWeight: 600 }}>{meta.className}</div>
              </div>
            </div>
          )}
          {meta.subjectCode && (
            <div>
              <div style={{ fontSize: 12, color: "#8c8c8c" }}>Subject</div>
              <div style={{ fontWeight: 600 }}>{meta.subjectCode}</div>
            </div>
          )}
        </Space>
      </Card>

      <Card>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Spin />
          </div>
        ) : submissions.length === 0 ? (
          <Empty description="No student submissions yet" />
        ) : (
          <Table
            columns={columns}
            dataSource={submissions}
            rowKey="submissionId"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
            }}
          />
        )}
      </Card>

      <Modal
        title={
          currentSubmission
            ? `Evaluate ${currentSubmission.studentName || "student"}`
            : "Evaluate submission"
        }
        open={evaluationVisible}
        onOk={handleEvaluationSubmit}
        confirmLoading={savingEvaluation}
        onCancel={closeEvaluation}
        okText="Save"
        destroyOnClose
      >
        <Form form={evaluationForm} layout="vertical">
          <Form.Item name="status" label="Status">
            <Select
              options={statusOptions}
              placeholder="Select evaluation status"
              allowClear
            />
          </Form.Item>
          <Form.Item name="comment" label="Comment">
            <TextArea rows={3} placeholder="Internal notes..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HomeworkSubmissionPage;
