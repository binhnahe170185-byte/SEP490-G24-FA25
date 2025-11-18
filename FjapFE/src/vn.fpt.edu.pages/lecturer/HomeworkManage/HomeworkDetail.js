import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Breadcrumb,
  Button,
  Card,
  Empty,
  message,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tag,
} from "antd";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import LecturerHomework from "../../../vn.fpt.edu.api/LecturerHomework";
import HomeworkForm from "./HomeworkForm";

const HomeworkDetail = () => {
  const { classId, lessonId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [slot, setSlot] = useState(location.state?.slot || null);
  const [homeworks, setHomeworks] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingHomework, setEditingHomework] = useState(null);
  const backOrigin = location.state?.from;
  const handleBackNavigation = useCallback(() => {
    if (backOrigin && typeof backOrigin === "object" && backOrigin.page === "lecturer-homework") {
      navigate(backOrigin.pathname || "/lecturer/homework", {
        state: {
          restoredCourse: backOrigin.course,
          restoredSemesterId: backOrigin.semesterId ?? backOrigin.course?.semesterId,
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
    navigate("/lecturer/homework");
  }, [backOrigin, navigate]);

  const loadSlotInfo = useCallback(async () => {
    if (slot) return;
    try {
      const slots = await LecturerHomework.getSlots(classId);
      const matched = slots.find(
        (item) => String(item.lessonId) === String(lessonId)
      );
      if (matched) {
        setSlot(matched);
      } else {
        setSlot({
          lessonId,
          classId,
        });
      }
    } catch (error) {
      console.error("Failed to load slot info:", error);
      setSlot({
        lessonId,
        classId,
      });
    }
  }, [classId, lessonId, slot]);

  const loadHomeworks = useCallback(async () => {
    try {
      setTableLoading(true);
      const data = await LecturerHomework.getHomeworksBySlot(
        lessonId,
        classId
      );
      setHomeworks(data);
    } catch (error) {
      console.error("Failed to load homeworks:", error);
      message.error("Unable to load homework list");
    } finally {
      setTableLoading(false);
    }
  }, [classId, lessonId]);

  useEffect(() => {
    loadSlotInfo();
  }, [loadSlotInfo]);

  useEffect(() => {
    loadHomeworks();
  }, [loadHomeworks]);

  const handleCreate = () => {
    setEditingHomework(null);
    setFormVisible(true);
  };

  const handleEdit = (record) => {
    setEditingHomework(record);
    setFormVisible(true);
  };

  const handleDelete = async (homeworkId) => {
    try {
      setTableLoading(true);
      await LecturerHomework.deleteHomework(homeworkId);
      message.success("Homework deleted successfully");
      await loadHomeworks();
    } catch (error) {
      console.error("Failed to delete homework:", error);
      message.error("Unable to delete homework");
      setTableLoading(false);
    }
  };

  const meta = useMemo(() => {
    if (!slot) return {};
    const dateLabel = slot.date ? dayjs(slot.date).format("DD/MM/YYYY") : "N/A";
    const timeLabel =
      slot.startTime && slot.endTime
        ? `${slot.startTime} - ${slot.endTime}`
        : slot.startTime || slot.endTime || "N/A";

    return {
      className: slot.className,
      subjectCode: slot.subjectCode,
      roomName: slot.roomName,
      dateLabel,
      timeLabel,
      slotId: slot.slotId,
    };
  }, [slot]);

  const columns = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: "Description",
      dataIndex: "content",
      key: "content",
      ellipsis: true,
      render: (text) => text || "No description",
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (value) =>
        value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "N/A",
    },
    {
      title: "Deadline",
      dataIndex: "deadline",
      key: "deadline",
      width: 160,
      render: (deadline) =>
        deadline ? (
          <Tag color={dayjs(deadline).isBefore(dayjs()) ? "red" : "blue"}>
            {dayjs(deadline).format("DD/MM/YYYY HH:mm")}
          </Tag>
        ) : (
          "No deadline"
        ),
    },
    {
      title: "Attachment",
      key: "attachment",
      width: 160,
      render: (_, record) =>
        record.filePath ? (
          <Button
            type="link"
            icon={<FileTextOutlined />}
            href={record.filePath}
            target="_blank"
            rel="noreferrer"
            download
            style={{ padding: 0 }}
          >
            Download file
          </Button>
        ) : (
          <span style={{ color: "#8c8c8c" }}>No file</span>
        ),
    },
    {
      title: "Submissions",
      key: "submissions",
      width: 160,
      align: "center",
      render: (_, record) => {
        const submitted = record.submissions || 0;
        const total = record.totalStudents || 0;
        const percent = total ? Math.round((submitted / total) * 100) : 0;
        return (
          <div>
            <Tag color={submitted > 0 ? "green" : undefined}>
              {submitted}/{total || "-"}
            </Tag>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>
              {total ? `${percent}% submitted` : "No roster data"}
            </div>
          </div>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      align: "center",
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<FileTextOutlined />}
            size="small"
            onClick={() =>
              navigate(
                `/lecturer/homework/${classId}/${lessonId}/submissions/${record.homeworkId}`,
                {
                  state: {
                    slot,
                    course: location.state?.course,
                    homework: record,
                    from: backOrigin,
                  },
                }
              )
            }
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Remove this homework?"
            okText="Delete"
            cancelText="Cancel"
            onConfirm={() => handleDelete(record.homeworkId)}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const breadcrumbItems = [
    { title: "Lecturer" },
    {
      title: (
        <span
          style={{ cursor: "pointer" }}
          onClick={handleBackNavigation}
        >
          Homework Management
        </span>
      ),
    },
    { title: "Homework Detail" },
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
            icon={<ArrowLeftOutlined />}
            onClick={handleBackNavigation}
          >
            Back
          </Button>
          <h1 style={{ margin: "8px 0 0", fontSize: 28, fontWeight: 600 }}>
            Homework detail
          </h1>
          <p style={{ margin: 0, color: "#595959" }}>
            Class {meta.className || classId} • Slot {meta.slotId || "-"}
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Add homework
        </Button>
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
          {meta.subjectCode && (
            <div>
              <div style={{ fontSize: 12, color: "#8c8c8c" }}>Subject</div>
              <div style={{ fontWeight: 600 }}>{meta.subjectCode}</div>
            </div>
          )}
          {meta.roomName && (
            <div>
              <div style={{ fontSize: 12, color: "#8c8c8c" }}>Room</div>
              <div style={{ fontWeight: 600 }}>{meta.roomName}</div>
            </div>
          )}
        </Space>
      </Card>

      <Card>
        {tableLoading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Spin />
          </div>
        ) : homeworks.length === 0 ? (
          <Empty
            description="No homework has been created for this slot"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              Add the first homework
            </Button>
          </Empty>
        ) : (
          <Table
            columns={columns}
            dataSource={homeworks}
            rowKey="homeworkId"
            pagination={false}
          />
        )}
      </Card>

      {formVisible && (
        <HomeworkForm
          visible={formVisible}
          slot={slot || { lessonId }}
          homework={editingHomework}
          onClose={() => {
            setFormVisible(false);
            setEditingHomework(null);
          }}
          onSuccess={() => {
            setFormVisible(false);
            setEditingHomework(null);
            loadHomeworks();
          }}
        />
      )}
    </div>
  );
};

export default HomeworkDetail;
