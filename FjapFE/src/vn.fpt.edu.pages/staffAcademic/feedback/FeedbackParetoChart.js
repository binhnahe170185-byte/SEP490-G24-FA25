import React from "react";
import { Card, Typography } from "antd";
import { Column } from "@ant-design/charts";

const { Text } = Typography;

function truncateLabel(value, max = 26) {
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

export default function FeedbackParetoChart({ data, loading, summary }) {
  const hasData = Array.isArray(data) && data.length > 0;
  
  // Debug log
  if (hasData) {
    console.log("Chart data:", JSON.stringify(data, null, 2));
    console.log("Chart data length:", data.length);
  }

  const config = {
    data,
    xField: "categoryIndex",
    yField: "count",
    xAxis: {
      label: {
        formatter: (v) => v || "",
        autoHide: false,
        autoRotate: false,
        offset: 20, // đẩy label xuống
      },
    },
    padding: [20, 20, 80, 50], // bottom padding lớn để có chỗ cho note
    yAxis: {
      title: { text: "Number of Feedbacks" },
    },
    tooltip: {
      customItems: (items) => {
        if (!items || !items.length) return items;
        const origin = items[0].data;
        const categoryName = origin.categoryLabel || origin.issue || items[0].name || "Unknown";
        const description = origin.description || "";
        const count = origin.count || 0;
        const percent =
          typeof origin.percent === "number"
            ? `${origin.percent.toFixed(1)}%`
            : "";
        const cum =
          typeof origin.cumulativePercent === "number"
            ? `${origin.cumulativePercent.toFixed(1)}%`
            : "";

        const tooltipItems = [];
        
        // Category name
        tooltipItems.push({
          name: "Category",
          value: categoryName,
        });

        // Description (if available)
        if (description) {
          tooltipItems.push({
            name: "Description",
            value: description,
          });
        }

        // Count
        tooltipItems.push({
          name: "Count",
          value: `${count} feedback${count !== 1 ? "s" : ""}`,
        });

        // Percentage
        if (percent) {
          tooltipItems.push({
            name: "Percentage",
            value: percent,
          });
        }

        // Cumulative
        if (cum) {
          tooltipItems.push({
            name: "Cumulative",
            value: cum,
          });
        }

        return tooltipItems;
      },
    },
    columnStyle: {
      radius: [2, 2, 0, 0],
    },
    autoFit: true,
  };

  return (
    <Card
      title="Pareto Issues from Student Feedback"
      style={{ width: "100%" }}
      loading={loading}
    >
      {!hasData ? (
        <div style={{ textAlign: "center", padding: "40px 16px" }}>
          <Text type="secondary">No feedback data available for the selected filters.</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: "block" }}>
            Try removing filters or re-analyze feedbacks to populate categories.
          </Text>
        </div>
      ) : (
        <>
          {summary && (
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Total feedback: <strong>{summary.totalFeedback}</strong> &nbsp;|&nbsp; Top{" "}
                {summary.displayedIssues} {summary.displayedIssues === 1 ? "issue" : "issues"} account for{" "}
                <strong>{summary.topPercent.toFixed(1)}%</strong> of feedback.
              </Text>
            </div>
          )}
          <div style={{ width: "100%", overflowX: "auto", overflowY: "hidden", marginTop: 24 }}>
            <div style={{ minWidth: 720, height: 280 }}>
              <Column {...config} />
            </div>
          </div>
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
            <Text strong style={{ fontSize: 14 }}>Category Details:</Text>
            <ul style={{ marginTop: 8, paddingLeft: 20, marginBottom: 0 }}>
              {data.map((item, idx) => (
                <li key={item.categoryIndex || idx} style={{ marginBottom: 12, lineHeight: 1.6 }}>
                  <div>
                    <strong>{item.categoryIndex}</strong>: {item.categoryLabel || item.issue}
                    <span style={{ color: "#666", marginLeft: 8 }}>
                      ({item.count} feedback
                      {typeof item.percent === "number" && `, ${item.percent.toFixed(1)}%`})
                    </span>
                  </div>
                  {item.description && (
                    <div style={{ marginTop: 4, marginLeft: 20, fontSize: 12, color: "#888", fontStyle: "italic" }}>
                      {item.description}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </Card>
  );
}

