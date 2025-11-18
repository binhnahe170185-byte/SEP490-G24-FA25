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

const { TextArea } = Input;

const HomeworkSubmissionPage = () => {
  const { classId, lessonId, homeworkId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const slot = location.state?.slot || null;
  const homework = location.state?.homework || null;

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [evaluationVisible, setEvaluationVisible] = useState(false);
  const [currentSubmission, setCurrentSubmission] = useState(null);
  const [savingEvaluation, setSavingEvaluation] = useState(false);
  const [evaluationForm] = Form.useForm();
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const buildPreviewUrl = (url) => {
    if (!url) return null;
    try {
      const parsed = new URL(url, window.location.href);
      const lowerHost = parsed.hostname.toLowerCase();
      const isDrive = lowerHost.includes("drive.google.com");
      const isLocalhost =
        lowerHost.includes("localhost") || lowerHost.includes("127.0.0.1");
      const filePath = parsed.pathname || "";
      const ext = filePath.split(".").pop()?.toLowerCase();
      const directTypes = ["png", "jpg", "jpeg", "gif", "webp", "svg", "pdf"];
      const officeTypes = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"];

      if (isLocalhost) {
        return parsed.toString();
      }

      if (isDrive) {
        if (parsed.pathname.includes("/preview")) {
          return parsed.toString();
        }
        const shareIdMatch = parsed.pathname.match(/\/d\/([A-Za-z0-9_-]+)/);
        if (shareIdMatch) {
          return `https://drive.google.com/file/d/${shareIdMatch[1]}/preview`;
        }
        return `https://drive.google.com/viewerng/viewer?embedded=true&url=${encodeURIComponent(
          url
        )}`;
      }

      if (ext && directTypes.includes(ext)) {
        return parsed.toString();
      }

      if (ext && officeTypes.includes(ext)) {
        return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
          parsed.toString()
        )}`;
      }

      return `https://docs.google.com/viewer?url=${encodeURIComponent(
        url
      )}&embedded=true`;
    } catch (error) {
      return url;
    }
  };

  const handleOpenPreview = (url) => {
    const preview = buildPreviewUrl(url);
    if (!preview) {
      message.warning("Preview is unavailable for this file.");
      return;
    }
    setPreviewUrl(preview);
    setPreviewModalVisible(true);
  };

  const handleClosePreview = () => {
    setPreviewModalVisible(false);
    setPreviewUrl(null);
  };

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        const data = await LecturerHomework.getHomeworkSubmissions(homeworkId);
        setSubmissions(data);
      } catch (error) {
        console.error("Failed to load homework submissions:", error);
        message.error("Unable to load submissions");
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
    { value: "Submitted", label: "Submitted" },
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

  const handleEvaluationSubmit = async () => {
    try {
      const values = await evaluationForm.validateFields();
      setSavingEvaluation(true);
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
      message.success("Submission evaluated");
      closeEvaluation();
    } catch (error) {
      console.error("Failed to evaluate submission:", error);
      message.error("Unable to save evaluation");
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
      width: 160,
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
              type="link"
              icon={<FileTextOutlined />}
              href={filePath}
              target="_blank"
              rel="noreferrer"
              download
              style={{ padding: 0 }}
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
              state: { slot, course: location.state?.course },
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

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div>
          <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            onClick={() =>
              navigate(`/lecturer/homework/${classId}/${lessonId}`, {
                state: { slot, course: location.state?.course },
              })
            }
            style={{ paddingLeft: 0 }}
          >
            Back to homework
          </Button>
          <h1 style={{ margin: "8px 0 0", fontSize: 28, fontWeight: 600 }}>
            Homework submission page
          </h1>
          <p style={{ margin: 0, color: "#595959" }}>
            Homework #{homeworkId}
            {meta.homeworkTitle ? ` • ${meta.homeworkTitle}` : ""}
          </p>
        </div>
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
        title="Preview attachment"
        open={previewModalVisible}
        onCancel={handleClosePreview}
        footer={null}
        width={900}
        destroyOnClose
      >
        {previewUrl ? (
          <iframe
            src={previewUrl}
            title="Submission preview"
            style={{ width: "100%", height: 520, border: "none" }}
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        ) : (
          <Empty description="No preview available" />
        )}
      </Modal>

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
