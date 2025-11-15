import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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

const { Title, Text } = Typography;

const formatDate = (date) => {
  if (!date) return "--";
  return dayjs(date).format("DD/MM/YYYY");
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

const LessonHomeworkDetail = () => {
  const { classId, lessonId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
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
  const [homeworkComments, setHomeworkComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [submissionMethod, setSubmissionMethod] = useState("local");
  const [docLink, setDocLink] = useState("");

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

  const buildPreviewUrl = (url) => {
    if (!url) return null;
    const fileExtension = url.split("?")[0].split(".").pop()?.toLowerCase();
    const previewableImages = ["png", "jpg", "jpeg", "gif", "webp", "svg"];
    if (previewableImages.includes(fileExtension)) {
      return url;
    }
    const encoded = encodeURIComponent(url);
    return `https://docs.google.com/viewer?url=${encoded}&embedded=true`;
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

  const courseInfo = location.state?.course || null;

  useEffect(() => {
    if (hasPrefetchedHomeworks || !classId || !lessonId) {
      return;
    }
    let ignore = false;
    const fetchHomeworks = async () => {
      setLoading(true);
      try {
        const data = await LecturerHomework.getHomeworksBySlot(lessonId, classId);
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
  }, [classId, lessonId, hasPrefetchedHomeworks]);

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
  }, [homeworks]);

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
      if (submissionMethod === "local") {
        if (!values.files || values.files.length === 0) {
          message.warning("Please attach files from your device.");
          return;
        }
      }
      if (submissionMethod === "drive") {
        if (!values.driveLink) {
          message.warning("Please provide a Google Drive link.");
          return;
        }
      }
      if (submissionMethod === "doc") {
        if (!docLink) {
          message.warning("Please create the Google Doc before submitting.");
          return;
        }
      }
      setSubmitting(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      message.success("Homework submitted successfully");
      handleCloseSubmitModal();
      console.log("Homework submission payload", {
        homeworkId: selectedHomework?.homeworkId,
        ...values,
        submissionMethod,
        driveLink: values.driveLink,
        docLink,
      });
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
                  href={homework.filePath}
                  target="_blank"
                  rel="noopener noreferrer"
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

        <Divider style={{ margin: "16px 0" }} />
        <div>
          <Text strong>Private comments</Text>
          {comments.length === 0 ? (
            <div style={{ marginTop: 8, color: "#8c8c8c" }}>
              No comments yet. Ask your lecturer something...
            </div>
          ) : (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  style={{
                    backgroundColor: "#f5f5f5",
                    borderRadius: 8,
                    padding: 10,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{comment.author}</div>
                  <div style={{ fontSize: 12, color: "#8c8c8c" }}>{comment.createdAt}</div>
                  <div style={{ marginTop: 4 }}>{comment.content}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <Input.TextArea
              rows={3}
              placeholder="Add private comment..."
              value={commentInputs[homeworkId]}
              onChange={(e) => handleCommentChange(homeworkId, e.target.value)}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <Button type="primary" onClick={() => handleSubmitComment(homeworkId)}>
                Post
              </Button>
            </div>
          </div>
        </div>
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
            Lesson homework
          </Title>
          <Text type="secondary">
            {subjectName} {subjectCode ? `(${subjectCode})` : ""} · {classLabel}
          </Text>
        </div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
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
        onCancel={() => setPreviewModalVisible(false)}
      >
        {previewUrl ? (
          <iframe
            src={previewUrl}
            title="Attachment preview"
            style={{ width: "100%", height: 500, border: "none" }}
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

          <Form.Item label="Notes (optional)" name="comment">
            <Input.TextArea rows={4} placeholder="Anything you want to mention to the lecturer..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LessonHomeworkDetail;
