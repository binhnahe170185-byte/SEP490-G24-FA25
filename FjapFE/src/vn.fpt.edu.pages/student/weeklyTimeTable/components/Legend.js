import React from "react";

export default function Legend({ status }) {
    return (
        <div style={{ marginTop: 12, display: "flex", gap: 16, alignItems: "center" }}>
            <span><i className="legend-dot pending" />{status.pending.text}</span>
            <span><i className="legend-dot done" />{status.done.text}</span>
            <span><i className="legend-dot absent" />{status.absent.text}</span>
        </div>
    );
}