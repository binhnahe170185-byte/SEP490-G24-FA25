import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  Table,
  Tag,
  Spin,
  message,
  Empty,
  Badge,
  Button,
} from "antd";
import { useNavigate } from "react-router-dom";
import { CalendarOutlined, ClockCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import LecturerHomework from "../../../../vn.fpt.edu.api/LecturerHomework";

const formatDate = (date) => {
  if (!date) return "--";
  return dayjs(date).format("DD/MM/YYYY");
};

const formatTimeRange = (start, end) => {
  if (!start && !end) return "--";
  return [start, end].filter(Boolean).join(" - ");
};

const LessonHomeworkTable = ({ course }) => {
  const [lessons, setLessons] = useState([]);
  const [homeworksMap, setHomeworksMap] = useState({});
  const [loading, setLoading] = useState(false);
  const classId = course?.classId || course?.courseId;
  const classLabel = course?.className || course?.classCode || "Class";
  const subjectLabel = course?.subjectName || course?.courseName || "Subject";
  const subjectCode = course?.subjectCode || course?.subject?.code || "";
  const navigate = useNavigate();

  const totalHomeworks = useMemo(() => {
    return Object.values(homeworksMap).reduce(
      (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
      0
    );
  }, [homeworksMap]);

  const loadLessonData = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const slots = await LecturerHomework.getSlots(classId);
      setLessons(slots);

      if (!slots.length) {
        setHomeworksMap({});
        return;
      }

      const homeworkEntries = await Promise.all(
        slots.map(async (slot) => {
          try {
            const data = await LecturerHomework.getHomeworksBySlot(
              slot.lessonId,
              classId
            );
            return [slot.lessonId, data];
          } catch (error) {
            console.error("Failed to load homeworks for slot:", slot, error);
            return [slot.lessonId, []];
          }
        })
      );

      const map = homeworkEntries.reduce((acc, [lessonId, data]) => {
        acc[lessonId] = data;
        return acc;
      }, {});

      setHomeworksMap(map);
    } catch (error) {
      console.error("Failed to load lessons:", error);
      message.error("Unable to load lessons and homework");
      setLessons([]);
      setHomeworksMap({});
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    if (!classId) {
      setLessons([]);
      setHomeworksMap({});
      return;
    }
    loadLessonData();
  }, [classId, loadLessonData]);

  const handleViewHomeworkDetail = useCallback(
    (lesson) => {
      if (!course || !lesson?.lessonId) return;
      const destinationClassId = course.classId || course.courseId;
      navigate(`/student/homework/${destinationClassId}/${lesson.lessonId}`, {
        state: {
          course,
          lesson,
          homeworks: homeworksMap[lesson.lessonId] || [],
        },
      });
    },
    [course, homeworksMap, navigate]
  );

  const columns = [
    {
      title: "Lesson",
      key: "lessonNumber",
      width: 100,
      align: "center",
      render: (_, __, index) => (
        <Tag color="geekblue" style={{ padding: "2px 12px" }}>
          Lesson {index + 1}
        </Tag>
      ),
    },
    {
      title: "Slot",
      dataIndex: "slotId",
      key: "slotId",
      width: 90,
      render: (slotId) => (
        <Tag color="blue" style={{ padding: "2px 12px" }}>
          Slot {slotId}
        </Tag>
      ),
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: 150,
      render: (date) => (
        <span>
          <CalendarOutlined style={{ marginRight: 6 }} />
          {formatDate(date)}
        </span>
      ),
    },
    {
      title: "Time",
      key: "time",
      width: 160,
      render: (_, record) => (
        <span>
          <ClockCircleOutlined style={{ marginRight: 6 }} />
          {formatTimeRange(record.startTime, record.endTime)}
        </span>
      ),
    },
    {
      title: "Homework",
      key: "homeworkCount",
      width: 160,
      render: (_, record) => {
        const lessonHomeworks = homeworksMap[record.lessonId] || [];
        return (
          <Badge
            count={lessonHomeworks.length}
            showZero
            style={{ backgroundColor: lessonHomeworks.length ? "#52c41a" : undefined }}
          >
            <Tag
              color={lessonHomeworks.length > 0 ? "green" : undefined}
              style={{ padding: "2px 12px", marginLeft: 8 }}
            >
              {lessonHomeworks.length} item{lessonHomeworks.length === 1 ? "" : "s"}
            </Tag>
          </Badge>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 140,
      align: "center",
      render: (_, record) => (
        <Button
          type="link"
          onClick={(event) => {
            event.stopPropagation();
            handleViewHomeworkDetail(record);
          }}
        >
          View homeworks
        </Button>
      ),
    },
  ];

  if (!course) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: "40px", color: "#8c8c8c" }}>
          <p>Select a course to view lesson information</p>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: "50px" }}>
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  if (!lessons.length) {
    return (
      <Card
        title={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Lesson & Homework</div>
              <div style={{ fontSize: 14, color: "#595959", fontWeight: 400 }}>
                {classLabel} - {subjectCode ? `${subjectLabel} (${subjectCode})` : subjectLabel}
              </div>
            </div>
            <Tag color="default">No lessons</Tag>
          </div>
        }
      >
        <Empty description="No lessons available for this course" />
      </Card>
    );
  }

  return (
    <Card
      title={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Lesson & Homework</div>
            <div style={{ fontSize: 14, color: "#595959", fontWeight: 400 }}>
              {classLabel} - {subjectCode ? `${subjectLabel} (${subjectCode})` : subjectLabel}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Tag color="geekblue" style={{ padding: "4px 12px" }}>
              {lessons.length} lesson{lessons.length === 1 ? "" : "s"}
            </Tag>
            <Tag color="green" style={{ padding: "4px 12px" }}>
              {totalHomeworks} homework{totalHomeworks === 1 ? "" : "s"}
            </Tag>
          </div>
        </div>
      }
    >
      <Table
        columns={columns}
        dataSource={lessons}
        rowKey="lessonId"
        pagination={{
          pageSize: 8,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} lessons`,
        }}
        onRow={(record) => ({
          onClick: () => handleViewHomeworkDetail(record),
          style: { cursor: "pointer" },
        })}
        bordered
        size="middle"
      />
    </Card>
  );
};

export default LessonHomeworkTable;
