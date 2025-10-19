import React from "react";
import { Card, Typography } from "antd";

const STATUS = {
    pending: { color: "#3b82f6", text: "Not Yet" },
    done: { color: "#22c55e", text: "Present" },
    absent: { color: "#ef4444", text: "Absent" },
};

export default function ClassChip({ item }) {
    const s = STATUS[item.status] || STATUS.pending;
    return (
        <Card size="small" bordered style={{ borderColor: s.color, background: "#fff" }} bodyStyle={{ padding: 8 }}>
            <Typography.Text strong>{item.code}</Typography.Text>
            <div style={{ fontSize: 12, marginTop: 6 }}>
                <div>🕒 {item.time}</div>
                <div style={{ marginTop: 2 }}>🏫 {item.room}</div>
            </div>
        </Card>
    );
}