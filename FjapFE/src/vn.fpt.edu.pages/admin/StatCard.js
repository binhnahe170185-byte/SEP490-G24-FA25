import React from "react";
import { Card, Typography } from "antd";

const { Text } = Typography;

const palette = {
  primary: { bg: "#FFF7F0", icon: "#F36F21" },
  secondary: { bg: "#EFF5FF", icon: "#002B5C" },
  neutral: { bg: "#F8FAFC", icon: "#64748B" },
};

export default function StatCard({ title, value, icon, helperText, variant = "neutral" }) {
  const colors = palette[variant] || palette.neutral;
  return (
    <Card
      style={{
        borderRadius: 12,
        boxShadow: "0 6px 14px rgba(15,23,42,0.06)",
      }}
      bodyStyle={{ padding: 16 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: colors.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: colors.icon,
            fontSize: 18,
          }}
        >
          {icon}
        </div>
        <Text type="secondary">{title}</Text>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      {helperText && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {helperText}
        </Text>
      )}
    </Card>
  );
}



