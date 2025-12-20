import React from "react";

export default function ProgressRingChart({ percentage = 0, size = 120, label }) {
  const normalizedPercentage = Math.max(0, Math.min(100, percentage));
  const radius = (size - 20) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (normalizedPercentage / 100) * circumference;

  // Determine color based on percentage
  let color;
  if (normalizedPercentage >= 70) {
    color = "#52c41a"; // Green
  } else if (normalizedPercentage >= 40) {
    color = "#fa8c16"; // Orange
  } else {
    color = "#ff4d4f"; // Red
  }

  // Calculate segments (20 segments)
  const numSegments = 20;
  const segmentAngle = (2 * Math.PI) / numSegments;
  const filledSegments = Math.round((normalizedPercentage / 100) * numSegments);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <defs>
            <linearGradient id={`gradient-${normalizedPercentage}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="1" />
              <stop offset="100%" stopColor={color} stopOpacity="0.8" />
            </linearGradient>
          </defs>
          
          {/* Segments */}
          {Array.from({ length: numSegments }).map((_, index) => {
            const startAngle = index * segmentAngle;
            const endAngle = (index + 1) * segmentAngle;
            const x1 = center + radius * Math.cos(startAngle);
            const y1 = center + radius * Math.sin(startAngle);
            const x2 = center + radius * Math.cos(endAngle);
            const y2 = center + radius * Math.sin(endAngle);
            const largeArcFlag = segmentAngle > Math.PI ? 1 : 0;

            return (
              <path
                key={`segment-${index}`}
                d={`M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                fill={index < filledSegments ? `url(#gradient-${normalizedPercentage})` : "#f0f0f0"}
                stroke="#fff"
                strokeWidth="1"
              />
            );
          })}
        </svg>
        
        {/* Percentage text in center */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: size * 0.2,
            fontWeight: "bold",
            color: "#262626", // Dark color for better contrast
            textAlign: "center",
            lineHeight: 1,
            pointerEvents: "none",
            textShadow: "0 1px 3px rgba(255, 255, 255, 0.9), 0 0 2px rgba(0, 0, 0, 0.2)", // White shadow for contrast
          }}
        >
          {normalizedPercentage.toFixed(0)}%
        </div>
      </div>
      
      {label && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: "#666",
            textAlign: "center",
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
