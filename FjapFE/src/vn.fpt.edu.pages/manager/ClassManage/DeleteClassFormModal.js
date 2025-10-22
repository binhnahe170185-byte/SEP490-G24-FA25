import React, { useCallback, useState } from "react";
import { Button, Modal, Tooltip, message } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import ClassListApi from "../../../vn.fpt.edu.api/ClassList";

const DeleteClassFormModal = ({ classId, className, onDeleted }) => {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleConfirmDelete = useCallback(async () => {
    if (!classId) {
      message.error("Missing class identifier");
      return;
    }

    setDeleting(true);
    try {
      const response = await ClassListApi.delete(classId);
      const successMessage =
        response?.message ?? response?.data?.message ?? "Class deleted";
      message.success(successMessage);
      setOpen(false);
      onDeleted?.();
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ??
        error?.message ??
        "Failed to delete class";
      message.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  }, [classId, onDeleted]);

  return (
    <>
      <Tooltip title="Delete class" color="red">
        <Button
          danger
          type="text"
          icon={<DeleteOutlined />}
          onClick={() => setOpen(true)}
          disabled={!classId || deleting}
        />
      </Tooltip>
      <Modal
        open={open}
        title="Delete Class"
        centered
        maskClosable={false}
        closable={!deleting}
        confirmLoading={deleting}
        okType="danger"
        okText="Delete"
        onCancel={() => setOpen(false)}
        onOk={handleConfirmDelete}
      >
        <div style={{ textAlign: "center", padding: "16px 8px" }}>
          <p style={{ fontWeight: 600, fontSize: 16, color: "#dc2626" }}>
            Are you sure you want to delete this class?
          </p>
          <p>
            <strong>Class ID:</strong> {classId}
          </p>
          <p>
            <strong>Class Name:</strong> {className ?? "-"}
          </p>
        </div>
      </Modal>
    </>
  );
};

export default DeleteClassFormModal;
