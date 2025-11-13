import React, { useCallback, useState } from "react";
import { Button, Modal, Tooltip } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import ClassListApi from "../../../vn.fpt.edu.api/ClassList";
import { useNotify } from "../../../vn.fpt.edu.common/notifications";

const DeleteClassFormModal = ({ classId, className, onDeleted }) => {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { pending: notifyPending, success: notifySuccess, error: notifyError } =
    useNotify();

  const handleConfirmDelete = useCallback(async () => {
    if (!classId) {
      notifyError(
        "delete-class-missing",
        "Delete failed",
        "Class identifier is missing."
      );
      return;
    }

    const key = `delete-class-${classId}`;
    notifyPending(
      key,
      "Deleting class",
      `Removing ${className ?? `Class #${classId}`}...`
    );
    setDeleting(true);
    try {
      const response = await ClassListApi.delete(classId);
      const successMessage =
        response?.message ?? response?.data?.message ?? "Class deleted";
      notifySuccess(key, "Class deleted", successMessage);
      setOpen(false);
      onDeleted?.();
    } catch (error) {
      const errorMessage =
        "Failed to delete class";
      notifyError(
        key,
        "Delete failed",
        errorMessage
      );
    } finally {
      setDeleting(false);
    }
  }, [classId, className, onDeleted, notifyError, notifyPending, notifySuccess]);

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
