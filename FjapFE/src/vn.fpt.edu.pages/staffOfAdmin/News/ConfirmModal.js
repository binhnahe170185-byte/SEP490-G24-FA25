import React from "react";
import { Modal, Button, Space } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";

export default function ConfirmModal({
  visible,
  title,
  description,
  icon,
  okText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  okButtonProps = {},
  cancelButtonProps = {},
  centered = true,
}) {
  const displayIcon = icon || (
    <ExclamationCircleOutlined style={{ color: "#faad14", fontSize: 24 }} />
  );

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      centered={centered}
      footer={null}
      width={400}
      closable={false}
      maskClosable={false}
      style={{
        borderRadius: 8,
      }}
    >
      <div
        style={{
          padding: "24px 0",
          textAlign: "center",
        }}
      >
        {/* Icon */}
        <div style={{ marginBottom: 16 }}>{displayIcon}</div>

        {/* Title */}
        {title && (
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              marginBottom: 8,
              color: "#1a1a1a",
            }}
          >
            {title}
          </div>
        )}

        {/* Description */}
        {description && (
          <div
            style={{
              fontSize: 14,
              color: "#595959",
              marginBottom: 24,
              lineHeight: 1.5,
            }}
          >
            {description}
          </div>
        )}

        {/* Buttons */}
        <Space size={12} style={{ justifyContent: "center", width: "100%" }}>
          <Button
            onClick={onCancel}
            disabled={okButtonProps?.loading || okButtonProps?.disabled}
            style={{
              minWidth: 80,
              borderRadius: 6,
              borderColor: "#d9d9d9",
            }}
            {...cancelButtonProps}
          >
            {cancelText}
          </Button>
          <Button
            type="primary"
            onClick={onConfirm}
            style={{
              minWidth: 80,
              borderRadius: 6,
            }}
            {...okButtonProps}
          >
            {okText}
          </Button>
        </Space>
      </div>
    </Modal>
  );
}

