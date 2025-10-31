import React from "react";
import { Modal, Tag, Image, Typography, Alert } from "antd";

const { Title, Paragraph, Text } = Typography;

// Helper để format News ID
const formatNewsId = (id) => {
  if (!id) return "N/A";
  const numId = typeof id === "number" ? id : parseInt(id, 10);
  if (isNaN(numId)) return `NEW${String(id).padStart(4, "0")}`;
  return `NEW${String(numId).padStart(4, "0")}`;
};

// Helper để format date với timezone GMT+8
const formatDateTimeWithTimezone = (dateStr) => {
  if (!dateStr) return "N/A";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    // Convert to GMT+8 (Vietnam timezone)
    const gmt8Date = new Date(date.getTime() + (8 * 60 * 60 * 1000));
    
    const year = gmt8Date.getUTCFullYear();
    const month = String(gmt8Date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(gmt8Date.getUTCDate()).padStart(2, "0");
    
    let hours = gmt8Date.getUTCHours();
    const minutes = String(gmt8Date.getUTCMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    const formattedHours = String(hours).padStart(2, "0");
    
    return `${year}-${month}-${day} ${formattedHours}:${minutes} ${ampm} (GMT+8)`;
  } catch {
    return dateStr;
  }
};

const STATUS_COLORS = {
  draft: "default",
  pending: "processing",
  published: "success",
  rejected: "error",
};

const STATUS_LABELS = {
  draft: "Draft",
  pending: "Pending Review",
  published: "Published",
  rejected: "Rejected",
};

// Helper để xử lý URL ảnh
const processImageUrl = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== "string") return null;
  
  const trimmedUrl = imageUrl.trim();
  if (!trimmedUrl) return null;
  
  // Cảnh báo nếu là Pinterest pin URL (không phải direct image URL)
  if (trimmedUrl.includes("pinterest.com/pin/") && !trimmedUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)) {
    console.warn("Pinterest pin URL detected. Pinterest không hỗ trợ hotlinking. Vui lòng sử dụng direct image URL.");
    console.warn("Hướng dẫn: Click chuột phải vào ảnh trên Pinterest > 'Copy image address' để lấy direct URL.");
    // Không return URL Pinterest vì sẽ không load được
    return null;
  }
  
  // Nếu đã là absolute URL (bắt đầu với http:// hoặc https://)
  if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")) {
    return trimmedUrl;
  }
  
  // Nếu là relative path (bắt đầu với /)
  if (trimmedUrl.startsWith("/")) {
    // Lấy base URL từ API config hoặc window.location
    const baseUrl = process.env.REACT_APP_API_BASE || 
                   (typeof window !== "undefined" ? window.location.origin : "");
    return `${baseUrl}${trimmedUrl}`;
  }
  
  // Nếu là relative path không bắt đầu với /
  // Có thể là file path hoặc cloud storage URL - giữ nguyên để Image component xử lý
  return trimmedUrl;
};

export default function ViewNewsModal({ visible, news, onCancel }) {
  if (!news) return null;

  // Extract data from news object (support both normalized and raw data)
  const newsId = news.id || news.newsId || news.__raw?.Id || null;
  const title = news.title || news.__raw?.Title || "";
  const content = news.content || news.__raw?.Content || "";
  const rawImageUrl = news.newsImage || news.__raw?.NewsImage || null;
  const newsImage = processImageUrl(rawImageUrl);
  
  // Kiểm tra nếu URL là Pinterest pin (không phải direct image)
  const isPinterestPin = rawImageUrl && 
    rawImageUrl.includes("pinterest.com/pin/") && 
    !rawImageUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i);
  const status = (news.status || news.__raw?.Status || "").toLowerCase();
  const authorName = news.authorName || news.__raw?.CreatorName || null;
  const authorEmail = news.authorEmail || news.__raw?.CreatorEmail || news.author || null;
  const author = authorName || authorEmail || "N/A";
  const createdAt = news.createdAt || news.__raw?.CreatedAt || null;
  const updatedAt = news.updatedAt || news.__raw?.UpdatedAt || null;

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
      styles={{
        body: {
          padding: "24px 32px 24px 24px", // padding-right giảm vì CSS đã handle
          maxHeight: "85vh",
          overflowY: "auto",
          overflowX: "hidden",
        },
        content: {
          padding: 0,
        },
      }}
      style={{
        top: 40,
      }}
    >
      {/* Header Section */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: "2px solid #f0f0f0",
          position: "sticky",
          top: 0,
          background: "#ffffff",
          zIndex: 10,
          paddingRight: 0,
        }}
      >
        <Title level={3} style={{ margin: 0, textTransform: "uppercase", fontWeight: 600, fontSize: 18 }}>
          NEWS DETAIL
        </Title>
      </div>

      {/* Metadata Section */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "12px 0",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Text strong style={{ color: "#595959", minWidth: 140 }}>
            ID:
          </Text>
          <Text>{formatNewsId(newsId)}</Text>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "12px 0",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Text strong style={{ color: "#595959", minWidth: 140 }}>
            Author:
          </Text>
          <Text>{author}</Text>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "12px 0",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Text strong style={{ color: "#595959", minWidth: 140 }}>
            Created Time:
          </Text>
          <Text>{formatDateTimeWithTimezone(createdAt)}</Text>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "12px 0",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Text strong style={{ color: "#595959", minWidth: 140 }}>
            Updated Time:
          </Text>
          <Text>{formatDateTimeWithTimezone(updatedAt)}</Text>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "12px 0",
            alignItems: "center",
          }}
        >
          <Text strong style={{ color: "#595959", minWidth: 140 }}>
            Status:
          </Text>
          <Tag color={STATUS_COLORS[status] || "default"}>
            {STATUS_LABELS[status] || status}
          </Tag>
        </div>
      </div>

      {/* Image Section */}
      {isPinterestPin && (
        <Alert
          message="URL ảnh không hợp lệ"
          description={
            <div>
              <p style={{ marginBottom: 8 }}>
                Link Pinterest pin không thể hiển thị trực tiếp. Vui lòng sử dụng <strong>direct image URL</strong>.
              </p>
              <p style={{ margin: 0, fontSize: 13 }}>
                <strong>Hướng dẫn:</strong> Click chuột phải vào ảnh trên Pinterest → chọn "Copy image address" hoặc "Open image in new tab" để lấy direct URL.
              </p>
            </div>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}
      {newsImage && (
        <div
          style={{
            marginBottom: 20,
            borderRadius: 8,
            overflow: "hidden",
            background: "#fafafa",
            minHeight: "180px",
            maxHeight: "280px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Image
            src={newsImage}
            alt="News"
            style={{
              width: "100%",
              maxHeight: "280px",
              objectFit: "contain",
            }}
            preview={{
              mask: "Preview",
            }}
            onError={(e) => {
              console.error("Failed to load image:", newsImage);
              e.target.style.display = "none";
            }}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3uOD5obNiBpTuBAlKLpagFhF1AMJLfZYM2K8zk4y8mK8gS+tYCPmBR5wZb4nIqS0kgHsZYn2A5H3scA2cQ2AH7K5GcHsV0FNI9CLuFQLZEvPJ9CTwiM9LmYGwA6S5UHyE4X4rG4BxAWXWlBYeRA5hc3tLUFCSUC2F7IVGRi7AgbYeGdQYFxnPgGyKZGTHUrSDal2cHAYACL//1BYWwS6hmMcB4BQh4uOguxzgegxJLBBgNDIx0xFjOExfY0DA9H7//8/WGNgYN7FwPD36v//039s///7dxnQ9BcYBaUfAEA7IJeWnQXiSgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
          />
        </div>
      )}

      {/* Content Section */}
      <div style={{ marginTop: newsImage || isPinterestPin ? 0 : 20 }}>
        <Title
          level={2}
          style={{
            marginBottom: 16,
            fontSize: 24,
            fontWeight: 700,
            lineHeight: 1.4,
            color: "#1a1a1a",
          }}
        >
          {title}
        </Title>
        <Paragraph
          style={{
            whiteSpace: "pre-wrap",
            fontSize: 15,
            lineHeight: 1.75,
            color: "#434343",
            marginBottom: 0,
            textAlign: "justify",
          }}
        >
          {content || "No content available."}
        </Paragraph>
      </div>
    </Modal>
  );
}
