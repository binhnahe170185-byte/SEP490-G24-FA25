import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Table, Tag, Spin, message, Empty, Button, Badge } from "antd";
import { CalendarOutlined, ClockCircleOutlined, FileTextOutlined } from "@ant-design/icons";
import LecturerHomework from "../../../vn.fpt.edu.api/LecturerHomework";
import dayjs from "dayjs";

export default function SlotsList({ course, lecturerId }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [homeworksMap, setHomeworksMap] = useState({}); // Map lessonId -> homeworks[]
  const navigate = useNavigate();

  const loadSlots = useCallback(async () => {
    if (!course || !course.classId) return;
    
    try {
      setLoading(true);
      const data = await LecturerHomework.getSlots(course.classId);
      setSlots(data);
      
      // Load homeworks for each slot
      if (data.length > 0) {
        const homeworksPromises = data.map(slot => 
          LecturerHomework.getHomeworksBySlot(slot.lessonId, slot.classId)
            .then(homeworks => ({ lessonId: slot.lessonId, homeworks }))
            .catch(() => ({ lessonId: slot.lessonId, homeworks: [] }))
        );
        
        const homeworksResults = await Promise.all(homeworksPromises);
        const map = {};
        homeworksResults.forEach(({ lessonId, homeworks }) => {
          map[lessonId] = homeworks;
        });
        setHomeworksMap(map);
      } else {
        setHomeworksMap({});
      }
    } catch (error) {
      console.error("Failed to load slots:", error);
      message.error("Unable to load slots");
    } finally {
      setLoading(false);
    }
  }, [course]);

  useEffect(() => {
    if (course && course.classId) {
      loadSlots();
    }
  }, [course, loadSlots]);

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
      width: 80,
      align: "center",
      render: (_, __, index) => (
        <Tag color="geekblue" style={{ fontSize: 13, padding: "2px 10px" }}>
          {index + 1}
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
              state: { slot: record, course },
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
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} ${total === 1 ? "slot" : "slots"}`,
        }}
        bordered
        size="middle"
      />
    </Card>
  );
}
