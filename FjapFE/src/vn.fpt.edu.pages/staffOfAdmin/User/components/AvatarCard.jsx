import React from "react";
import { Card, Upload, Button } from "antd";
import { UploadOutlined, UserOutlined } from "@ant-design/icons";

const title = <span style={{ fontWeight: 600, fontSize: 16, color: "#333" }}>Avatar</span>;

function AvatarCard({ avatarPreview, onAvatarChange, onAvatarRemove }) {
  return (
    <Card
      title={title}
      bordered={false}
      bodyStyle={{ padding: 16, display: "flex", justifyContent: "center" }}
    >
      <div style={{ textAlign: "center" }}>
        <Upload
          name="avatar"
          showUploadList={false}
          beforeUpload={() => false}
          onChange={onAvatarChange}
          accept="image/*"
          maxCount={1}
        >
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 12,
              border: "1px dashed #d9d9d9",
              background: "#fafafa",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="avatar"
                style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              <UserOutlined style={{ fontSize: 40, color: "#bfbfbf" }} />
            )}
          </div>
          <Button
            size="small"
            type="link"
            icon={<UploadOutlined />}
            style={{ marginTop: 8, padding: 0 }}
          >
            Change Avatar
          </Button>
        </Upload>
        {avatarPreview && (
          <Button type="text" size="small" danger onClick={onAvatarRemove} style={{ marginTop: 4 }}>
            Remove
          </Button>
        )}
      </div>
    </Card>
  );
}

export default AvatarCard;

