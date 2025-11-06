import React, { useState, useEffect, useCallback } from "react";
import { Card, Table, Tag, Spin, message, Empty, Button, Badge } from "antd";
import { CalendarOutlined, ClockCircleOutlined, HomeOutlined, FileTextOutlined } from "@ant-design/icons";
import LecturerHomework from "../../../vn.fpt.edu.api/LecturerHomework";
import dayjs from "dayjs";
import HomeworkModal from "./HomeworkModal";

export default function SlotsList({ course, lecturerId }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [homeworkModalVisible, setHomeworkModalVisible] = useState(false);
  const [homeworksMap, setHomeworksMap] = useState({}); // Map lessonId -> homeworks[]

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
      }
    } catch (error) {
      console.error("Failed to load slots:", error);
      message.error("Không thể tải danh sách slot");
    } finally {
      setLoading(false);
    }
  }, [course]);

  useEffect(() => {
    if (course && course.classId) {
      loadSlots();
    }
  }, [course, loadSlots]);

  const columns = [
    {
      title: "Slot",
      dataIndex: "slotId",
      key: "slotId",
      width: 100,
      render: (slotId) => (
        <Tag color="blue" style={{ fontSize: 14, padding: "4px 12px" }}>
          Slot {slotId}
        </Tag>
      ),
    },
    {
      title: "Ngày",
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
      title: "Thời gian",
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
      title: "Phòng học",
      dataIndex: "roomName",
      key: "roomName",
      width: 150,
      render: (roomName) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <HomeOutlined style={{ color: "#8c8c8c" }} />
          <span>{roomName || "N/A"}</span>
        </div>
      ),
    },
    {
      title: "Mã môn",
      dataIndex: "subjectCode",
      key: "subjectCode",
      width: 120,
    },
    {
      title: "Lớp",
      dataIndex: "className",
      key: "className",
      width: 150,
    },
    {
      title: "Bài tập",
      key: "homeworks",
      width: 120,
      align: "center",
      render: (_, record) => {
        const homeworks = homeworksMap[record.lessonId] || [];
        return (
          <Badge count={homeworks.length} showZero>
            <Tag color={homeworks.length > 0 ? "green" : "default"} style={{ cursor: "pointer" }}>
              {homeworks.length} bài
            </Tag>
          </Badge>
        );
      },
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 150,
      align: "center",
      render: (_, record) => (
        <Button
          type="primary"
          icon={<FileTextOutlined />}
          size="small"
          onClick={() => {
            setSelectedSlot(record);
            setHomeworkModalVisible(true);
          }}
        >
          Quản lý bài tập
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
          <Empty description="Vui lòng chọn môn học để xem danh sách slot" />
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
              <div style={{ fontSize: 16, fontWeight: 600 }}>Danh sách slot</div>
              <div style={{ fontSize: 14, color: "#595959", fontWeight: 400 }}>
                {course.className} {course.subjectCode && course.subjectName && `- ${course.subjectName} (${course.subjectCode})`}
              </div>
            </div>
          </div>
        }
      >
        <Empty description="Không có slot nào cho môn học này" />
      </Card>
    );
  }

  return (
    <Card
      title={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Danh sách slot</div>
              <div style={{ fontSize: 14, color: "#595959", fontWeight: 400 }}>
                {course.className} {course.subjectCode && course.subjectName && `- ${course.subjectName} (${course.subjectCode})`}
              </div>
            </div>
          <Tag color="green" style={{ fontSize: 14, padding: "4px 12px" }}>
            {slots.length} slot
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
            `${range[0]}-${range[1]} của ${total} slot`,
        }}
        bordered
        size="middle"
      />

      {selectedSlot && (
        <HomeworkModal
          visible={homeworkModalVisible}
          slot={selectedSlot}
          homeworks={homeworksMap[selectedSlot.lessonId] || []}
          onClose={() => {
            setHomeworkModalVisible(false);
            setSelectedSlot(null);
          }}
          onRefresh={() => {
            // Reload homeworks for this slot
            LecturerHomework.getHomeworksBySlot(selectedSlot.lessonId, selectedSlot.classId)
              .then(homeworks => {
                setHomeworksMap(prev => ({
                  ...prev,
                  [selectedSlot.lessonId]: homeworks
                }));
              });
          }}
        />
      )}
    </Card>
  );
}

