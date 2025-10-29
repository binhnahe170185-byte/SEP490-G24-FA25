import React from "react";
import { Card, Typography } from "antd";

const STATUS = {
    pending: { color: "#3b82f6", text: "Not Yet" },
    done: { color: "#22c55e", text: "Present" },
    absent: { color: "#ef4444", text: "Absent" },
};

export default function ClassChip({ item, onClick }) {
    const s = STATUS[item?.status] || STATUS.pending;
    const title = item?.code ?? "Lesson";
    const timeText = item?.timeLabel ?? item?.time ?? (item?.slotId ? `Slot ${item.slotId}` : null);
    const roomText = item?.roomLabel ?? item?.room ?? (item?.roomId ? `Room ${item.roomId}` : null);
    return (
        <Card
            size="small"
            bordered
            style={{
                borderColor: s.color,
                background: "#fff",
                cursor: onClick ? "pointer" : "default",
                transition: "all 0.2s"
            }}
            bodyStyle={{ padding: 8 }}
            onClick={() => onClick && onClick(item)}
            hoverable={!!onClick}
        >
            <Typography.Text strong>{title}</Typography.Text>
            <div style={{ fontSize: 12, marginTop: 6 }}>
                {timeText ? <div>🕒 {timeText}</div> : null}
                {roomText ? <div style={{ marginTop: 2 }}>🏫 {roomText}</div> : null}
            </div>
        </Card>
    );
}

