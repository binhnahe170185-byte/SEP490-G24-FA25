import React, { useState, useEffect } from "react";
import { Modal, Table, Button, Tag, Space, message, Popconfirm, Empty } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, FileTextOutlined } from "@ant-design/icons";
import LecturerHomework from "../../../vn.fpt.edu.api/LecturerHomework";
import dayjs from "dayjs";
import HomeworkForm from "./HomeworkForm";

export default function HomeworkModal({ visible, slot, homeworks, onClose, onRefresh }) {
  const [formVisible, setFormVisible] = useState(false);
  const [editingHomework, setEditingHomework] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = () => {
    setEditingHomework(null);
    setFormVisible(true);
  };

  const handleEdit = (homework) => {
    setEditingHomework(homework);
    setFormVisible(true);
  };

  const handleDelete = async (homeworkId) => {
    try {
      setLoading(true);
      await LecturerHomework.deleteHomework(homeworkId);
      message.success("Homework removed successfully");
      onRefresh();
    } catch (error) {
      console.error("Failed to delete homework:", error);
      message.error("Unable to delete homework");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSuccess = () => {
    setFormVisible(false);
    setEditingHomework(null);
    onRefresh();
  };

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
      title: "Deadline",
      dataIndex: "deadline",
      key: "deadline",
      width: 150,
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
      title: "Submissions",
      key: "submissions",
      width: 100,
      align: "center",
      render: (_, record) => (
        <Tag>{record.submissions || 0}/{record.totalStudents || 0}</Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Are you sure you want to remove this homework?"
            onConfirm={() => handleDelete(record.homeworkId)}
            okText="Delete"
            cancelText="Cancel"
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

  return (
    <>
      <Modal
        title={
          <div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Homework manager</div>
            <div style={{ fontSize: 14, color: "#8c8c8c", marginTop: 4 }}>
              Slot {slot?.slotId} - {slot?.date ? dayjs(slot.date).format("DD/MM/YYYY") : ""} 
              {slot?.startTime && slot?.endTime && ` (${slot.startTime} - ${slot.endTime})`}
            </div>
          </div>
        }
        open={visible}
        onCancel={onClose}
        footer={[
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Add homework
          </Button>,
          <Button key="close" onClick={onClose}>
            Close
          </Button>,
        ]}
        width={900}
        style={{ top: 20 }}
      >
        {homeworks.length === 0 ? (
          <Empty
            description="No homework yet"
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
            size="middle"
            loading={loading}
          />
        )}
      </Modal>

      {formVisible && (
        <HomeworkForm
          visible={formVisible}
          slot={slot}
          homework={editingHomework}
          onClose={() => {
            setFormVisible(false);
            setEditingHomework(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </>
  );
}



