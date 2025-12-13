import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, Table, Tag, Spin, Empty, Button, Badge } from "antd";
import { CalendarOutlined, ClockCircleOutlined, FileTextOutlined } from "@ant-design/icons";
import { useNotify } from "../../../vn.fpt.edu.common/notifications";
import LecturerHomework from "../../../vn.fpt.edu.api/LecturerHomework";
import dayjs from "dayjs";

export default function SlotsList({ course, lecturerId }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [homeworksMap, setHomeworksMap] = useState({}); // Map lessonId -> homeworks[]
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const navigate = useNavigate();
  const location = useLocation();
  const { error: notifyError } = useNotify();

  const buildHomeworkMap = (homeworks) => {
    const map = {};
    homeworks.forEach((hw) => {
      const lessonKey = hw.lessonId || hw.slotId || hw.lesson_id;
      if (!lessonKey) return;
      if (!map[lessonKey]) {
        map[lessonKey] = [];
      }
      map[lessonKey].push(hw);
    });
    return map;
  };

  const loadSlots = useCallback(async () => {
    if (!course || !course.classId) return;

    try {
      setLoading(true);
      const [data, courseHomeworks] = await Promise.all([
        LecturerHomework.getSlots(course.classId),
        LecturerHomework.getHomeworksByCourse(course.classId),
      ]);
      setSlots(data);
      setPagination((prev) => ({ ...prev, current: 1 }));
      setHomeworksMap(buildHomeworkMap(courseHomeworks || []));
    } catch (error) {
      console.error("Failed to load slots:", error);
      console.error("Error response:", error?.response);

      let errorMessage = "Unable to load slots. Please try again.";
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      notifyError(
        "homework-slots-load-error",
        "Load failed",
        errorMessage
      );
      setHomeworksMap({});
    } finally {
      setLoading(false);
    }
  }, [course, notifyError]);

  useEffect(() => {
    if (course && course.classId) {
      loadSlots();
    }
  }, [course, loadSlots]);

  const handleTableChange = (newPagination) => {
    setPagination((prev) => ({
      ...prev,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    }));
  };

  const getPrimaryHomework = useCallback(
    (lessonId) => {
      const lessonHomeworks = homeworksMap[lessonId] || [];
      if (!lessonHomeworks.length) return null;
      const getTimestamp = (hw) => {
        if (!hw) return null;
        const reference = hw.createdAt || hw.deadline;
        return reference ? dayjs(reference) : null;
      };

      return lessonHomeworks.reduce((latest, current) => {
        if (!latest) return current;
        const latestTime = getTimestamp(latest);
        const currentTime = getTimestamp(current);

        if (!currentTime && !latestTime) return latest;
        if (!latestTime) return current;
        if (!currentTime) return latest;

        return currentTime.isAfter(latestTime) ? current : latest;
      }, null);
    },
    [homeworksMap]
  );

  const getSubmissionSummary = useCallback(
    (lessonId) => {
      const homework = getPrimaryHomework(lessonId);
      if (!homework) {
        return { submitted: 0, total: 0 };
      }
      return {
        submitted: homework.submissions || 0,
        total: homework.totalStudents || homework.maxStudents || 0,
      };
    },
    [getPrimaryHomework]
  );

  const columns = [
    {
      title: "Lesson",
      key: "lessonNumber",
      width: 100,
      align: "center",
      render: (_, __, index) => (
        <Tag color="geekblue" style={{ fontSize: 13, padding: "2px 12px" }}>
          Lesson {(pagination.current - 1) * pagination.pageSize + index + 1}
        </Tag>
      ),
    },
    {
      title: "Slot",
      dataIndex: "slotId",
      key: "slotId",
      width: 90,
      render: (slotId) => (
        <Tag color="blue" style={{ fontSize: 14, padding: "4px 12px" }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <CalendarOutlined style={{ color: "#8c8c8c" }} />
          <span>{date ? dayjs(date).format("DD/MM/YYYY") : "N/A"}</span>
        </div>
      ),
      sorter: (a, b) => {
        if (!a.date || !b.date) return 0;
        return dayjs(a.date).unix() - dayjs(b.date).unix();
      },
    },
    {
      title: "Time",
      key: "time",
      width: 150,
      render: (_, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ClockCircleOutlined style={{ color: "#8c8c8c" }} />
          <span>
            {record.startTime && record.endTime
              ? `${record.startTime} - ${record.endTime}`
              : record.startTime || record.endTime || "N/A"}
          </span>
        </div>
      ),
    },
    {
      title: "Subject Code",
      dataIndex: "subjectCode",
      key: "subjectCode",
      width: 130,
    },
    {
      title: "Class",
      dataIndex: "className",
      key: "className",
      width: 150,
    },
    {
      title: "Submissions",
      key: "submissions",
      width: 140,
      align: "center",
      render: (_, record) => {
        const { submitted, total } = getSubmissionSummary(record.lessonId);
        return (
          <Tag color={submitted > 0 ? "green" : undefined}>
            {submitted}
            {total ? `/${total}` : ""}
          </Tag>
        );
      },
    },
    {
      title: "Homeworks",
      key: "homeworks",
      width: 120,
      align: "center",
      render: (_, record) => {
        const homeworks = homeworksMap[record.lessonId] || [];
        return (
          <Badge count={homeworks.length} showZero>
            <Tag color={homeworks.length > 0 ? "green" : undefined}>
              {homeworks.length} item{homeworks.length === 1 ? "" : "s"}
            </Tag>
          </Badge>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 170,
      align: "center",
      render: (_, record) => (
        <Button
          type="primary"
          icon={<FileTextOutlined />}
          size="small"
          onClick={() =>
            navigate(`/lecturer/homework/${record.classId}/${record.lessonId}`, {
              state: {
                slot: record,
                course,
                from: {
                  page: "lecturer-homework",
                  pathname: location.pathname,
                  search: location.search,
                  courseId: course?.classId,
                  semesterId: course?.semesterId,
                  course,
                },
              },
            })
          }
        >
          View detail
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: "50px" }}>
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  if (!course) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: "50px", color: "#8c8c8c" }}>
          <Empty description="Select a course to view its slots" />
        </div>
      </Card>
    );
  }

  if (slots.length === 0) {
    return (
      <Card
        title={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Slot list</div>
              <div style={{ fontSize: 14, color: "#595959", fontWeight: 400 }}>
                {course.className} {course.subjectCode && course.subjectName && `- ${course.subjectName} (${course.subjectCode})`}
              </div>
            </div>
          </div>
        }
      >
        <Empty description="No slots available for this course" />
      </Card>
    );
  }

  return (
    <Card
      title={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Slot list</div>
            <div style={{ fontSize: 14, color: "#595959", fontWeight: 400 }}>
              {course.className} {course.subjectCode && course.subjectName && `- ${course.subjectName} (${course.subjectCode})`}
            </div>
          </div>
          <Tag color="green" style={{ fontSize: 14, padding: "4px 12px" }}>
            {slots.length} {slots.length === 1 ? "slot" : "slots"}
          </Tag>
        </div>
      }
    >
      <Table
        columns={columns}
        dataSource={slots}
        rowKey="lessonId"
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} ${total === 1 ? "slot" : "slots"}`,
        }}
        onChange={handleTableChange}
        bordered
        size="middle"
      />
    </Card>
  );
}
