import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../login/AuthContext";
import {
  Breadcrumb,
  Card,
  Spin,
  message,
  Tag,
  Button,
  Empty,
  Typography,
  Modal,
  Form,
  Input,
  Upload,
  Divider,
  Radio,
  Space,
} from "antd";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  PaperClipOutlined,
  UploadOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import LecturerHomework from "../../../vn.fpt.edu.api/LecturerHomework";
import StudentHomework from "../../../vn.fpt.edu.api/StudentHomework";

const { Title, Text } = Typography;

const formatDate = (date) => {
  if (!date) return "--";
  return dayjs(date).format("DD/MM/YYYY");
};

const formatDateTime = (value) => {
  if (!value) return "--";
  return dayjs(value).format("DD/MM/YYYY HH:mm");
};

const formatTimeRange = (start, end) => {
  if (!start && !end) return "--";
  return [start, end].filter(Boolean).join(" - ");
};

const getDeadlineStatus = (deadline) => {
  if (!deadline) return { color: "default", text: "No due date" };
  const due = dayjs(deadline);
  const today = dayjs();
  if (due.isBefore(today, "day")) {
    return { color: "red", text: "Overdue" };
  }
  if (due.isSame(today, "day")) {
    return { color: "orange", text: "Due today" };
  }
  const daysLeft = due.diff(today, "day");
  return {
    color: "green",
    text: `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`,
  };
};

const isSubmissionClosed = (deadline) => {
  if (!deadline) return false;
  return dayjs(deadline).isBefore(dayjs(), "day");
};

const getSubmissionStatusMeta = (status) => {
  const normalized = (status || "").toLowerCase();
  switch (normalized) {
    case "graded":
      return {
        label: "Graded",
        color: "green",
        description: "Marked and finalized by lecturer.",
      };
    case "late":
      return {
        label: "Late",
        color: "orange",
        description: "Submitted after the deadline. Awaiting review.",
      };
    case "rejected":
      return {
        label: "Rejected",
        color: "red",
        description: "Submission rejected. Please review lecturer feedback.",
      };
    default:
      return {
        label: "Submitted",
        color: "blue",
        description: "Waiting for lecturer to review.",
      };
  }
};

const normalizeStudentSubmissionPayload = (homeworkId, payload) => {
  if (!payload) {
    return null;
  }
  return {
    submissionId:
      payload.submissionId ||
      payload.homeworkSubmissionId ||
      payload.id ||
      null,
    homeworkId: payload.homeworkId || homeworkId,
    studentId: payload.studentId,
    studentCode: payload.studentCode || payload.student_code || null,
    studentName: payload.studentName || payload.student_name || null,
    submittedAt: payload.submittedAt || payload.createdAt,
    status: payload.status,
    comment: payload.comment,
    filePath: payload.filePath,
  };
};

const LessonHomeworkDetail = () => {
  const { classId, lessonId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const studentId = user?.studentId || user?.id;
  const preloadedHomeworks = location.state?.homeworks;
  const hasPrefetchedHomeworks = Array.isArray(preloadedHomeworks);

  const [homeworks, setHomeworks] = useState(preloadedHomeworks || []);
  const [loading, setLoading] = useState(!hasPrefetchedHomeworks);
  const [lessonInfo, setLessonInfo] = useState(location.state?.lesson || null);
  const [submitModalVisible, setSubmitModalVisible] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [homeworkComments, setHomeworkComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [submissionMethod, setSubmissionMethod] = useState("local");
  const [docLink, setDocLink] = useState("");
  const [studentSubmissions, setStudentSubmissions] = useState({});
  const previewObjectUrl = useRef(null);
  const backOrigin = location.state?.from;

  const normalizeUploadValue = (event) => {
    if (Array.isArray(event)) {
      return event;
    }
    return event?.fileList || [];
  };

  const handleCreateDoc = () => {
    const generatedLink = `https://docs.google.com/document/d/${Date.now()}`;
    setDocLink(generatedLink);
    message.success("New Google Doc created. Link attached to submission.");
  };

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

  const cleanupPreviewObjectUrl = () => {
    if (previewObjectUrl.current) {
      URL.revokeObjectURL(previewObjectUrl.current);
      previewObjectUrl.current = null;
    }
  };

  const getAuthHeaders = () => {
    const headers = {};
    try {
      const token = localStorage.getItem("token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    } catch {
      // ignore
    }
    return headers;
  };

  const handleOpenPreview = (url) => {
    if (!url) {
      message.warning("File path is missing.");
      return;
    }
    handleOpenInNewTab(url);
  };

  const handleClosePreviewModal = () => {
    cleanupPreviewObjectUrl();
    setPreviewModalVisible(false);
    setPreviewUrl(null);
    setPreviewLoading(false);
  };

  const handleOpenInNewTab = (url) => {
    if (!url) {
      message.warning("File path is missing.");
      return;
    }
    const target = appendCacheBuster(url);
    window.open(target, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    return () => {
      cleanupPreviewObjectUrl();
    };
  }, []);

  const courseInfo = location.state?.course || null;
  const weeklyTimetableState = location.state?.weeklyTimetableState;
  const handleBackNavigation = useCallback(() => {
    // Check if coming from weekly timetable
    if (backOrigin && typeof backOrigin === "object" && backOrigin.page === "student-weekly-timetable") {
      navigate("/student/weeklyTimetable", {
        replace: true,
        state: {
          weeklyTimetableState: weeklyTimetableState,
        },
      });
      return;
    }
    if (backOrigin && typeof backOrigin === "object" && backOrigin.page === "student-homework") {
      const destination =
        (backOrigin.pathname || "/student/homework") +
        (backOrigin.search || "");
      navigate(destination, {
        replace: true,
        state: {
          restoredCourse: backOrigin.course,
          restoredSemesterId:
            backOrigin.semesterId ?? backOrigin.course?.semesterId,
        },
      });
      return;
    }
    if (typeof backOrigin === "string") {
      navigate(backOrigin);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/student/homework");
  }, [backOrigin, navigate, weeklyTimetableState]);

  const loadStudentSubmissions = useCallback(
    (homeworkList) => {
      if (!studentId || !Array.isArray(homeworkList) || homeworkList.length === 0) {
        return;
      }

      const updates = {};
      homeworkList.forEach((hw) => {
        const hwId = hw.homeworkId || hw.id;
        if (!hwId) {
          return;
        }
        const normalized = normalizeStudentSubmissionPayload(hwId, hw.studentSubmission);
        if (normalized) {
          updates[hwId] = normalized;
        }
      });

      if (Object.keys(updates).length > 0) {
        setStudentSubmissions((prev) => ({ ...prev, ...updates }));
      }
    },
    [studentId]
  );

  useEffect(() => {
    if (!classId || !lessonId) {
      return;
    }
    let ignore = false;
    const fetchHomeworks = async () => {
      if (!hasPrefetchedHomeworks) {
        setLoading(true);
      }
      try {
        const data = await LecturerHomework.getHomeworksBySlot(lessonId, classId, {
          studentId,
        });
        if (!ignore) {
          setHomeworks(data);
          setHomeworkComments((prev) => {
            const next = { ...prev };
            data.forEach((hw) => {
              const key = hw.homeworkId || hw.id;
              if (key && !next[key]) {
                next[key] = [];
              }
            });
            return next;
          });
          setCommentInputs((prev) => {
            const next = { ...prev };
            data.forEach((hw) => {
              const key = hw.homeworkId || hw.id;
              if (key && next[key] === undefined) {
                next[key] = "";
              }
            });
            return next;
          });
        }
      } catch (error) {
        console.error("Failed to load homeworks:", error);
        if (!ignore) {
          message.error("Unable to load homework list for this lesson");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchHomeworks();
    return () => {
      ignore = true;
    };
  }, [classId, lessonId, studentId, hasPrefetchedHomeworks]);

  useEffect(() => {
    if (!homeworks.length) return;
    setHomeworkComments((prev) => {
      const next = { ...prev };
      homeworks.forEach((hw) => {
        const key = hw.homeworkId || hw.id;
        if (key && !next[key]) {
          next[key] = [];
        }
      });
      return next;
    });
    setCommentInputs((prev) => {
      const next = { ...prev };
      homeworks.forEach((hw) => {
        const key = hw.homeworkId || hw.id;
        if (key && next[key] === undefined) {
          next[key] = "";
        }
      });
      return next;
    });
    loadStudentSubmissions(homeworks);
  }, [homeworks, loadStudentSubmissions]);

  useEffect(() => {
    if (lessonInfo || !classId || !lessonId) {
      return;
    }
    let ignore = false;
    const fetchLessonInfo = async () => {
      try {
        const slots = await LecturerHomework.getSlots(classId);
        if (ignore) return;
        const found = slots.find(
          (slot) => String(slot.lessonId) === String(lessonId)
        );
        if (found) {
          setLessonInfo(found);
        }
      } catch (error) {
        console.error("Failed to load lesson info:", error);
      }
    };

    fetchLessonInfo();
    return () => {
      ignore = true;
    };
  }, [classId, lessonId, lessonInfo]);

  useEffect(() => {
    if (!studentId) {
      setStudentSubmissions({});
    }
  }, [studentId]);

  const subjectName =
    courseInfo?.subjectName ||
    courseInfo?.courseName ||
    lessonInfo?.subjectName ||
    "Subject";
  const subjectCode =
    courseInfo?.subjectCode ||
    lessonInfo?.subjectCode ||
    "";
  const classLabel =
    courseInfo?.className ||
    courseInfo?.classCode ||
    lessonInfo?.className ||
    classId;

  const handleOpenSubmitModal = (homework) => {
    if (isSubmissionClosed(homework.deadline)) {
      message.warning("This homework is overdue and can no longer be submitted.");
      return;
    }
    setSelectedHomework(homework);
    setSubmitModalVisible(true);
    form.resetFields();
    setSubmissionMethod("local");
    setDocLink("");
  };

  const handleCloseSubmitModal = () => {
    setSubmitModalVisible(false);
    setSelectedHomework(null);
    form.resetFields();
    setSubmissionMethod("local");
    setDocLink("");
  };

  const handleSubmitHomework = async () => {
    try {
      const values = await form.validateFields();
      if (!studentId) {
        message.error("User information is missing. Please login again.");
        return;
      }

      if (submissionMethod === "local" && (!values.files || values.files.length === 0)) {
        message.warning("Please attach files from your device.");
        return;
      }
      if (submissionMethod === "drive" && !values.driveLink) {
        message.warning("Please provide a Google Drive link.");
        return;
      }
      if (submissionMethod === "doc" && !docLink) {
        message.warning("Please create the Google Doc before submitting.");
        return;
      }

      setSubmitting(true);
      const homeworkKey = selectedHomework?.homeworkId || selectedHomework?.id;
      const savedSubmission = await StudentHomework.submitHomework({
        homeworkId: homeworkKey,
        studentId,
        method: submissionMethod,
        comment: values.comment,
        files: values.files || [],
        driveLink: values.driveLink,
        docLink,
      });

      message.success("Homework submitted successfully");
      if (homeworkKey && savedSubmission) {
        setStudentSubmissions((prev) => ({
          ...prev,
          [homeworkKey]: {
            ...savedSubmission,
            status: savedSubmission?.status || "Submitted",
            submittedAt: savedSubmission?.submittedAt || new Date().toISOString(),
          },
        }));
      }
      handleCloseSubmitModal();
    } catch (error) {
      if (error?.errorFields) return;
      message.error("Failed to submit homework");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentChange = (homeworkId, value) => {
    setCommentInputs((prev) => ({ ...prev, [homeworkId]: value }));
  };

  const handleSubmitComment = (homeworkId) => {
    const trimmed = (commentInputs[homeworkId] || "").trim();
    if (!trimmed) {
      message.warning("Please enter a comment before submitting.");
      return;
    }
    const newComment = {
      id: `${homeworkId}-${Date.now()}`,
      author: "You",
      content: trimmed,
      createdAt: dayjs().format("DD/MM/YYYY HH:mm"),
    };

    setHomeworkComments((prev) => {
      const current = prev[homeworkId] || [];
      return { ...prev, [homeworkId]: [...current, newComment] };
    });
    setCommentInputs((prev) => ({ ...prev, [homeworkId]: "" }));
    message.success("Comment posted");
  };

  const renderHomeworkCard = (homework) => {
    const status = getDeadlineStatus(homework.deadline);
    const submissionClosed = isSubmissionClosed(homework.deadline);
    const homeworkId = homework.homeworkId || homework.id;
    const comments = homeworkComments[homeworkId] || [];
    const submission = studentSubmissions[homeworkId];
    const submissionMeta = submission ? getSubmissionStatusMeta(submission.status) : null;
    return (
      <Card key={homework.homeworkId || homework.id} type="inner" style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <Title level={5} style={{ marginBottom: 4 }}>
              <FileTextOutlined style={{ marginRight: 8 }} />
              {homework.title || "Untitled homework"}
            </Title>
            {homework.createdByName && (
              <Text type="secondary">Assigned by {homework.createdByName}</Text>
            )}
          </div>
          <Tag color={status.color}>{status.text}</Tag>
        </div>

        <div style={{ marginTop: 12, fontSize: 14, color: "#595959" }}>
          {homework.deadline && (
            <div style={{ marginBottom: 4 }}>
              <CalendarOutlined style={{ marginRight: 6 }} />
              Due on {formatDate(homework.deadline)}
            </div>
          )}
          {homework.content && (
            <div style={{ whiteSpace: "pre-line" }}>{homework.content}</div>
          )}
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 16, flexWrap: "wrap" }}>
          {homework.submissions !== undefined && (
            <Tag color="geekblue">
              {homework.submissions}/{homework.totalStudents || homework.maxStudents || "--"} submissions
            </Tag>
          )}
          {homework.lessonId && (
            <Tag color="purple">Lesson #{homework.lessonId}</Tag>
          )}
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            {homework.filePath && (
              <>
                <Button
                  icon={<EyeOutlined />}
                  onClick={() => handleOpenPreview(homework.filePath)}
                >
                  Preview
                </Button>
                <Button
                  type="link"
                  icon={<PaperClipOutlined />}
                  onClick={() => handleOpenInNewTab(homework.filePath)}
                  style={{ paddingLeft: 0 }}
                >
                  Download
                </Button>
              </>
            )}
          </div>
          {submissionClosed && (
            <Text type="secondary" style={{ color: "#ff4d4f" }}>
              Submission closed (overdue)
            </Text>
          )}
          <Button
            type="primary"
            onClick={() => handleOpenSubmitModal(homework)}
            disabled={submissionClosed}
          >
            Submit homework
          </Button>
        </div>

        {submission && submissionMeta && (
          <div
            style={{
              marginTop: 16,
              padding: 16,
              backgroundColor: "#f0f5ff",
              borderRadius: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <Text strong>Your submission</Text>
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Tag color={submissionMeta.color} style={{ marginBottom: 0 }}>
                    {submissionMeta.label}
                  </Tag>
                  <Text type="secondary">{formatDateTime(submission.submittedAt)}</Text>
                </div>
                <div style={{ fontSize: 12, color: "#8c8c8c" }}>{submissionMeta.description}</div>
              </div>
              {submission.filePath && (
                <div style={{ display: "flex", gap: 8 }}>
                  <Button
                    icon={<EyeOutlined />}
                    onClick={() => handleOpenPreview(submission.filePath)}
                  >
                    Preview
                  </Button>
                  <Button
                    type="link"
                    icon={<PaperClipOutlined />}
                    onClick={() => handleOpenInNewTab(submission.filePath)}
                    style={{ paddingLeft: 0 }}
                  >
                    Open file
                  </Button>
                </div>
              )}
            </div>
            {submission.comment && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed #d9d9d9" }}>
                <Text strong>Note / Feedback:</Text>
                <div style={{ marginTop: 4 }}>{submission.comment}</div>
              </div>
            )}
          </div>
        )}


      </Card>
    );
  };

  return (
    <div style={{ padding: 24, backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: "Studies" },
          { title: "Homework" },
          { title: `Lesson ${lessonId}` },
        ]}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Homework
          </Title>
          <Text type="secondary">
            {subjectName} {subjectCode ? `(${subjectCode})` : ""} · {classLabel}
          </Text>
        </div>
        <Button icon={<ArrowLeftOutlined />} onClick={handleBackNavigation}>
          Back
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          <Tag color="blue">Lesson #{lessonId}</Tag>
          {lessonInfo?.slotId && <Tag color="geekblue">Slot {lessonInfo.slotId}</Tag>}
          {lessonInfo?.date && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CalendarOutlined />
              <span>{formatDate(lessonInfo.date)}</span>
            </div>
          )}
          {lessonInfo?.startTime && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ClockCircleOutlined />
              <span>{formatTimeRange(lessonInfo.startTime, lessonInfo.endTime)}</span>
            </div>
          )}
          {lessonInfo?.roomName && (
            <Tag>{lessonInfo.roomName}</Tag>
          )}
        </div>
      </Card>

      <Card title="Homework list">
        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Spin size="large" />
          </div>
        ) : homeworks.length === 0 ? (
          <Empty description="No homework assigned for this lesson yet" />
        ) : (
          <div>
            {homeworks.map(renderHomeworkCard)}
          </div>
        )}
      </Card>

      <Modal
        title="Preview attachment"
        width={900}
        open={previewModalVisible}
        footer={null}
        onCancel={handleClosePreviewModal}
        destroyOnClose
      >
        {previewLoading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Spin />
          </div>
        ) : previewUrl ? (
          <iframe
            src={previewUrl}
            title="Attachment preview"
            style={{ width: "100%", height: 520, border: "none" }}
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        ) : (
          <Empty description="No preview available" />
        )}
      </Modal>

      <Modal
        title={
          selectedHomework
            ? `Submit: ${selectedHomework.title || "Homework"}`
            : "Submit homework"
        }
        open={submitModalVisible}
        onCancel={handleCloseSubmitModal}
        onOk={handleSubmitHomework}
        confirmLoading={submitting}
        okText="Submit"
      >
        <Form layout="vertical" form={form}>
          <Form.Item label="Submission type" name="submissionMethod" initialValue="local">
            <Radio.Group
              onChange={(e) => {
                setSubmissionMethod(e.target.value);
                if (e.target.value !== "drive") {
                  form.setFieldsValue({ driveLink: undefined });
                }
                if (e.target.value !== "local") {
                  form.setFieldsValue({ files: [] });
                }
              }}
              value={submissionMethod}
            >
              <Space direction="vertical">
                <Radio value="local">Upload from device</Radio>
                <Radio value="drive">Attach Google Drive link</Radio>
                <Radio value="doc">Create new Google Doc</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          {submissionMethod === "local" && (
            <Form.Item
              label="Files"
              name="files"
              valuePropName="fileList"
              getValueFromEvent={normalizeUploadValue}
            >
              <Upload
                beforeUpload={() => false}
                multiple
                listType="text"
                customRequest={({ onSuccess }) => {
                  if (onSuccess) {
                    setTimeout(() => onSuccess("ok"), 0);
                  }
                }}
              >
                <Button icon={<UploadOutlined />}>Attach files</Button>
              </Upload>
            </Form.Item>
          )}

          {submissionMethod === "drive" && (
            <Form.Item
              label="Google Drive link"
              name="driveLink"
              rules={[
                {
                  required: true,
                  message: "Please paste the shareable Google Drive link",
                },
                {
                  type: "url",
                  message: "Please enter a valid URL",
                },
              ]}
            >
              <Input placeholder="https://drive.google.com/..." />
            </Form.Item>
          )}

          {submissionMethod === "doc" && (
            <Form.Item label="Google Doc">
              <Space align="start">
                <Input
                  style={{ width: 360 }}
                  placeholder="Click create to generate document"
                  value={docLink}
                  readOnly
                />
                <Button type="primary" onClick={handleCreateDoc}>
                  Create doc
                </Button>
                {docLink && (
                  <Button
                    type="link"
                    href={docLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open
                  </Button>
                )}
              </Space>
              {docLink && (
                <div style={{ marginTop: 8 }}>
                  <Tag color="green">Linked</Tag>
                </div>
              )}
            </Form.Item>
          )}


        </Form>
      </Modal>
    </div>
  );
};

export default LessonHomeworkDetail;
