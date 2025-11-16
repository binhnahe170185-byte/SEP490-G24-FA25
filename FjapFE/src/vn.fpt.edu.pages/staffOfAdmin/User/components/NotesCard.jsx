import React from "react";
import { Card, Alert } from "antd";

const title = <span style={{ fontWeight: 600, fontSize: 16, color: "#333" }}>Notes</span>;

function NotesCard() {
  return (
    <Card
      title={title}
      bordered={false}
      bodyStyle={{ padding: 16 }}
      style={{ marginTop: 16 }}
    >
      <Alert
        type="info"
        showIcon
        message={
          <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
            <li>Staff requires department so we auto-set Academic/Administration role.</li>
            <li>Lecturer skips department selection, role is fixed.</li>
            <li>Email and phone must be unique in the system.</li>
            <li>Avatar: JPG/PNG/GIF/WEBP, max 5MB, auto resize 200x200px.</li>
          </ul>
        }
      />
    </Card>
  );
}

export default NotesCard;


