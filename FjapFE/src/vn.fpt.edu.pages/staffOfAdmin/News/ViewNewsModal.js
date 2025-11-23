import React, { useEffect, useMemo, useState } from "react";
import { Modal, Tag, Typography, Alert } from "antd";
import UserApi from "../../../vn.fpt.edu.api/Admin";
import { formatDateTimeWithTimezone, formatApprovedAt } from "./dateUtils";

const { Title, Paragraph, Text } = Typography;

// Helper để format News ID
const formatNewsId = (id) => {
  if (!id) return "N/A";
  const numId = typeof id === "number" ? id : parseInt(id, 10);
  if (isNaN(numId)) return `NEW${String(id).padStart(4, "0")}`;
  return `NEW${String(numId).padStart(4, "0")}`;
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
  
  // Check if URL is invalid (e.g., Pinterest pin URL that is not a direct image)
  if (trimmedUrl.includes("pinterest.com/pin/") && !trimmedUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)) {
    console.warn("Invalid image URL detected. Pinterest pin URLs are not supported. Please use a direct image URL.");
    console.warn("Guide: Right-click on the image on Pinterest > 'Copy image address' to get the direct URL.");
    // Don't return Pinterest URL as it won't load
    return null;
  }
  
  // Nếu đã là absolute URL (bắt đầu với http:// hoặc https://)
  if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")) {
    // Check if it's a shortened URL or suspiciously short URL
    const shortenedUrlPatterns = [
      "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "buff.ly",
      "short.link", "is.gd", "v.gd", "rebrand.ly", "cutt.ly",
      "byvn.net", "tiny.cc", "shorturl.at", "rebrandly.com", "short.cm"
    ];
    
    const isShortenedUrl = shortenedUrlPatterns.some(pattern => 
      trimmedUrl.toLowerCase().includes(pattern.toLowerCase())
    );
    
    // Check if URL is short and doesn't have image extension (likely shortened URL)
    const hasImageExtension = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(trimmedUrl);
    const isSuspiciouslyShort = trimmedUrl.length < 50 && !hasImageExtension;
    
    // If it's a shortened URL or suspiciously short, use proxy to resolve it
    if (isShortenedUrl || isSuspiciouslyShort) {
      try {
        const stripped = trimmedUrl.replace(/^https?:\/\//i, "");
        return `https://images.weserv.nl/?url=${encodeURIComponent(stripped)}`;
      } catch (e) {
        console.error("Error creating proxy URL:", e);
        return trimmedUrl;
      }
    }
    
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
  // Hooks phải khai báo trước mọi return
  const [imageError, setImageError] = useState(false);
  const [approvedByInfo, setApprovedByInfo] = useState(null);
  const [updatedByInfo, setUpdatedByInfo] = useState(null);
  
  useEffect(() => {
    setImageError(false);
  }, [news?.newsImage, news?.__raw?.NewsImage, news?.id]);

  // Extract data từ news (có thể undefined nếu news null)
  const newsId = news?.id || news?.newsId || news?.__raw?.Id || null;
  const title = news?.title || news?.__raw?.Title || "";
  const content = news?.content || news?.__raw?.Content || "";
  const rawImageUrl = news?.newsImage || news?.__raw?.NewsImage || null;
  const newsImage = processImageUrl(rawImageUrl);
  const [displayUrl, setDisplayUrl] = useState(newsImage);
  const isHttpUrl = useMemo(() => typeof newsImage === "string" && /^(http|https):\/\//i.test(newsImage), [newsImage]);
  const isDataUrl = useMemo(() => typeof newsImage === "string" && newsImage.startsWith("data:image/"), [newsImage]);
  const [usedProxy, setUsedProxy] = useState(false);
  useEffect(() => {
    setImageError(false);
    setUsedProxy(false);
    setDisplayUrl(newsImage || null);
  }, [newsImage, newsId]);

  // Check if image URL is invalid
  const isInvalidImageUrl = rawImageUrl && 
    rawImageUrl.includes("pinterest.com/pin/") && 
    !rawImageUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i);
  const status = (news?.status || news?.__raw?.Status || "").toLowerCase();
  const authorName = news?.authorName || news?.__raw?.CreatorName || null;
  const authorEmail = news?.authorEmail || news?.__raw?.CreatorEmail || news?.author || null;
  const author = authorName || authorEmail || "N/A";
  const createdAt = news?.createdAt || news?.__raw?.CreatedAt || null;
  const updatedAt = news?.updatedAt || news?.__raw?.UpdatedAt || null;
  const approvedAt = news?.approvedAt || news?.__raw?.ApprovedAt || null;
  
  // Lấy UpdatedBy và UpdatedByNavigation
  const updatedByNavigation = news?.__raw?.UpdatedByNavigation || null;
  const updatedById = news?.updatedBy || 
                     news?.__raw?.UpdatedBy || 
                     news?.__raw?.data?.UpdatedBy ||
                     (news?.__raw?._fullResponse && (news.__raw._fullResponse.UpdatedBy || news.__raw._fullResponse.updatedBy)) ||
                     (news?.__raw && typeof news.__raw === 'object' && 'UpdatedBy' in news.__raw ? news.__raw.UpdatedBy : null) ||
                     null;
  
  // Kiểm tra xem đã được update chưa (dựa vào UpdatedBy có giá trị không)
  const hasBeenUpdated = updatedById !== null && updatedById !== undefined;
  const reviewComment = news?.reviewComment || news?.__raw?.ReviewComment || null;
  
  const approvedByNavigation = news?.__raw?.ApprovedByNavigation || null;
  
  // Lấy approvedById từ nhiều nguồn để đảm bảo không bị miss
  const approvedById = news?.approvedBy || 
                       news?.__raw?.ApprovedBy || 
                       news?.__raw?.data?.ApprovedBy ||
                       (news?.__raw?._fullResponse && (news.__raw._fullResponse.ApprovedBy || news.__raw._fullResponse.approvedBy)) ||
                       (news?.__raw && typeof news.__raw === 'object' && 'ApprovedBy' in news.__raw ? news.__raw.ApprovedBy : null) ||
                       null;
  
  // Debug log để kiểm tra approvedById từ các nguồn
  if ((status === "published" || status === "rejected") && news) {
    console.log("=== DEBUG ViewNewsModal - ApprovedBy Extraction ===");
    console.log("news?.approvedBy:", news?.approvedBy);
    console.log("news?.__raw?.ApprovedBy:", news?.__raw?.ApprovedBy);
    console.log("news?.__raw?.data?.ApprovedBy:", news?.__raw?.data?.ApprovedBy);
    console.log("Final approvedById:", approvedById);
    console.log("approvedByNavigation:", approvedByNavigation);
    console.log("news.__raw:", news.__raw);
  }
  
  // Fetch approvedBy user info nếu không có ApprovedByNavigation
  useEffect(() => {
    const fetchApprovedByInfo = async () => {
      // Chỉ fetch nếu: status là published/rejected, có approvedById, không có ApprovedByNavigation, và có news
      if ((status === "published" || status === "rejected") && approvedById && !approvedByNavigation && news) {
        try {
          console.log("=== DEBUG ViewNewsModal - Fetching ApprovedBy Info ===");
          console.log("approvedById:", approvedById);
          const userInfo = await UserApi.getUserById(approvedById);
          console.log("Fetched userInfo:", userInfo);
          setApprovedByInfo(userInfo);
        } catch (error) {
          console.error("Error fetching approvedBy user info:", error);
          console.error("Error details:", error.response?.data || error.message);
        }
      } else {
        // Reset nếu không cần fetch
        if (!approvedById || approvedByNavigation) {
          setApprovedByInfo(null);
        }
      }
    };
    
    fetchApprovedByInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, approvedById, approvedByNavigation, news?.id, news?.newsId, news]);

  // Fetch updatedBy user info nếu không có UpdatedByNavigation
  useEffect(() => {
    const fetchUpdatedByInfo = async () => {
      // Chỉ fetch nếu: có updatedById, không có UpdatedByNavigation, và có news
      if (updatedById && !updatedByNavigation && news) {
        try {
          const userInfo = await UserApi.getUserById(updatedById);
          setUpdatedByInfo(userInfo);
        } catch (error) {
          console.error("Error fetching updatedBy user info:", error);
          console.error("Error details:", error.response?.data || error.message);
        }
      } else {
        // Reset nếu không cần fetch
        if (!updatedById || updatedByNavigation) {
          setUpdatedByInfo(null);
        }
      }
    };
    
    fetchUpdatedByInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updatedById, updatedByNavigation, news?.id, news?.newsId, news]);
  
  if (!news) return null;
  
  // Debug log để kiểm tra ApprovedByNavigation
  if (status === "published" || status === "rejected") {
    console.log("=== DEBUG Approved Info ===");
    console.log("status:", status);
    console.log("approvedAt:", approvedAt);
    console.log("approvedById:", approvedById);
    console.log("approvedByNavigation:", approvedByNavigation);
    console.log("approvedByInfo (fetched):", approvedByInfo);
    console.log("news.__raw:", news.__raw);
  }
  
  // Lấy thông tin từ ApprovedByNavigation hoặc từ fetched approvedByInfo
  const approvedByData = approvedByNavigation || approvedByInfo;
  const approvedByName = approvedByData 
    ? `${approvedByData.FirstName || approvedByData.firstName || ''} ${approvedByData.LastName || approvedByData.lastName || ''}`.trim() 
    : null;
  const approvedByEmail = approvedByData?.Email || approvedByData?.email || null;
  const approvedBy = approvedByName || approvedByEmail || null;

  // Lấy thông tin từ UpdatedByNavigation hoặc từ fetched updatedByInfo
  const updatedByData = updatedByNavigation || updatedByInfo;
  const updatedByName = updatedByData 
    ? `${updatedByData.FirstName || updatedByData.firstName || ''} ${updatedByData.LastName || updatedByData.lastName || ''}`.trim() 
    : null;
  const updatedByEmail = updatedByData?.Email || updatedByData?.email || null;
  const updatedBy = updatedByName || updatedByEmail || null;

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
      destroyOnClose
      title={
        <Title level={3} style={{ margin: 10, textTransform: "uppercase", fontWeight: 600, fontSize: 20 }}>
          NEWS DETAIL
        </Title>
      }
      styles={{
        body: {
          padding: "16px 32px 24px 24px", // body padding dưới header chuẩn
          maxHeight: "85vh",
          overflowY: "auto",
          overflowX: "hidden",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
        },
        content: {
          padding: 0,
        },
      }}
      style={{
        top: 40,
      }}
    >
      {/* Header đã được chuyển sang Modal.title để tránh tràn khi cuộn */}

      {/* Metadata Section */}
      <div
        style={{
          marginBottom: 20,
          background: "#fafafa",
          borderRadius: 10,
          padding: 12,
          border: "1px solid #f0f0f0",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "10px 8px",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Text strong style={{ color: "#434343", minWidth: 150 }}>
            ID:
          </Text>
          <Text style={{ color: "#1f1f1f", fontWeight: 500 }}>{formatNewsId(newsId)}</Text>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "10px 8px",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Text strong style={{ color: "#434343", minWidth: 150 }}>
            Author:
          </Text>
          <Text style={{ color: "#1f1f1f" }}>{author}</Text>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "10px 8px",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Text strong style={{ color: "#434343", minWidth: 150 }}>
            Created Time:
          </Text>
          <Text style={{ color: "#1f1f1f" }}>{formatDateTimeWithTimezone(createdAt)}</Text>
        </div>
        {/* Updated By và Updated Time - Chỉ hiển thị nếu đã được update (có UpdatedBy) */}
        {hasBeenUpdated && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 8px",
                borderBottom: "1px solid #f0f0f0",
              }}
            >
              <Text strong style={{ color: "#434343", minWidth: 150 }}>
                Updated By:
              </Text>
              <Text style={{ color: "#1f1f1f" }}>{updatedBy || "N/A"}</Text>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 8px",
                borderBottom: "1px solid #f0f0f0",
              }}
            >
              <Text strong style={{ color: "#434343", minWidth: 150 }}>
                Updated Time:
              </Text>
              <Text style={{ color: "#1f1f1f" }}>{formatDateTimeWithTimezone(updatedAt)}</Text>
            </div>
          </>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "10px 8px",
            borderBottom: status === "published" ? "1px solid #f0f0f0" : "none",
            alignItems: "center",
          }}
        >
          <Text strong style={{ color: "#434343", minWidth: 150 }}>
            Status:
          </Text>
          <Tag color={STATUS_COLORS[status] || "default"}>
            {STATUS_LABELS[status] || status}
          </Tag>
        </div>
        {/* Approved By and Approved At - Hiển thị cho cả published và rejected news (luôn hiển thị, kể cả khi không có dữ liệu) */}
        {(status === "published" || status === "rejected") && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 8px",
                borderBottom: "1px solid #f0f0f0",
              }}
            >
              <Text strong style={{ color: "#434343", minWidth: 150 }}>
                Approved At:
              </Text>
              <Text style={{ color: "#1f1f1f" }}>
                {approvedAt ? formatApprovedAt(approvedAt) : "N/A"}
              </Text>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 8px",
              }}
            >
              <Text strong style={{ color: "#434343", minWidth: 150 }}>
                Approved By:
              </Text>
              <Text style={{ color: "#1f1f1f" }}>{approvedBy || "N/A"}</Text>
            </div>
          </>
        )}
      </div>

      {/* Review Comment Section - Hiển thị khi news bị rejected */}
      {status === "rejected" && reviewComment && (
        <Alert
          message="Rejection Review Comment"
          description={
            <div>
              <p style={{ marginBottom: 8, fontWeight: 500, color: "#1f1f1f" }}>
                This news was rejected. Review comment:
              </p>
              <div style={{
                background: "#fafafa",
                padding: "12px 16px",
                borderRadius: 6,
                border: "1px solid #f0f0f0",
                marginTop: 8,
                color: "#434343",
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
              }}>
                {reviewComment}
              </div>
            </div>
          }
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Image Section */}
      {(isInvalidImageUrl || imageError) && (
        <Alert
          message="Invalid Image URL"
          description={
            <div>
              <p style={{ marginBottom: 8 }}>
                The image URL is invalid or cannot be loaded. Please use a <strong>direct image URL</strong>.
              </p>
              <p style={{ margin: 0, fontSize: 13 }}>
                <strong>Guide:</strong> Right-click on the image → select "Copy image address" or "Open image in new tab" to get the direct URL.
              </p>
            </div>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}
      {/* Image frame always displays; image inside is hidden if error */}
      <div
        style={{
          marginBottom: 20,
          borderRadius: 8,
          overflow: "hidden",
          background: "#f9f9f9",
          minHeight: "180px",
          maxHeight: "280px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid #f0f0f0",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        {displayUrl && !imageError && (
          <img
            src={displayUrl}
            alt="News"
            style={{ width: "100%", maxHeight: "280px", objectFit: "contain" }}
            referrerPolicy={isDataUrl ? undefined : "no-referrer"}
            crossOrigin={isDataUrl ? undefined : "anonymous"}
            onError={() => {
              // For data URLs, if they fail, it's likely corrupted
              if (isDataUrl) {
                setImageError(true);
                return;
              }
              
              // For HTTP URLs, try proxy as fallback
              if (isHttpUrl && !usedProxy) {
                try {
                  const stripped = newsImage.replace(/^https?:\/\//i, "");
                  const proxied = `https://images.weserv.nl/?url=${encodeURIComponent(stripped)}`;
                  setUsedProxy(true);
                  setDisplayUrl(proxied);
                  return;
                } catch (e) {
                  console.error("Error creating proxy URL:", e);
                }
              }
              setImageError(true);
            }}
          />
        )}
        {!newsImage && (
          <div style={{ color: "#999", fontSize: 13 }}>
            No image provided
          </div>
        )}
        {(imageError || isInvalidImageUrl) && newsImage && (
          <div style={{ color: "#fa541c", fontSize: 13, textAlign: "center", padding: "8px" }}>
            <div style={{ marginBottom: 4 }}>Cannot load image.</div>
            {isHttpUrl && rawImageUrl && (
              <div style={{ fontSize: 11, color: "#8c8c8c", wordBreak: "break-all" }}>
                URL: {rawImageUrl.length > 60 ? `${rawImageUrl.substring(0, 60)}...` : rawImageUrl}
              </div>
            )}
            <div style={{ fontSize: 11, color: "#8c8c8c", marginTop: 4 }}>
              Please check if the URL is valid or try updating the image.
            </div>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div style={{ marginTop: newsImage || isInvalidImageUrl ? 0 : 12 }}>
        <Title
          level={2}
          style={{
            marginBottom: 12,
            fontSize: 22,
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
