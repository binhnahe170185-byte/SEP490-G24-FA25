import React, { useEffect, useMemo, useState, useCallback } from "react";
import { 
  Button, Input, Space, Table, Tooltip, message, Card, Modal, 
  Select, Tag, Popconfirm, notification, Typography, Divider, Collapse, Row, Col
} from "antd";
import { 
  SearchOutlined, EyeOutlined, EditOutlined, DeleteOutlined, 
  PlusOutlined, CheckCircleOutlined, CloseCircleOutlined, 
  SendOutlined, InfoCircleOutlined
} from "@ant-design/icons";
import NewsApi from "../../../vn.fpt.edu.api/News";
import UserApi from "../../../vn.fpt.edu.api/Admin";
import AddNewsModal from "./AddNewsModal";
import ViewNewsModal from "./ViewNewsModal";
import EditNewsModal from "./EditNewsModal";
import { formatDateTimeWithTimezone, formatApprovedAt } from "./dateUtils";
import "../admin.css";

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "" },
  { label: "Draft", value: "draft" },
  { label: "Pending Review", value: "pending" },
  { label: "Published", value: "published" },
  { label: "Rejected", value: "rejected" },
];

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

// Helper để format News ID
const formatNewsId = (id) => {
  if (!id) return "";
  return `NW${String(id).padStart(3, "0")}`;
};

// Helper để format date
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return date.toISOString().split("T")[0];
  } catch {
    return dateStr;
  }
};

const normalize = (items = []) =>
  items.map((n) => {
    // C# DTO serialize thành PascalCase: Id, Title, Status, CreatorEmail, CreatedAt, etc.
    // Ưu tiên PascalCase trước (từ database/DTO), sau đó fallback về camelCase
    const rawCreatedBy = n.CreatedBy ?? n.createdBy ?? null;
    
    // Debug log để kiểm tra CreatedBy
    if (rawCreatedBy !== null && rawCreatedBy !== undefined) {
      console.log(`DEBUG normalize: News ID ${n.Id ?? n.id}, CreatedBy (raw):`, rawCreatedBy, typeof rawCreatedBy);
    }
    
    const item = {
      id: n.Id ?? n.id ?? null,
      newsId: n.Id ?? n.id ?? null,
      title: n.Title ?? n.title ?? "",
      content: n.Content ?? n.content ?? "",
      newsImage: n.NewsImage ?? n.newsImage ?? null,
      status: (n.Status ?? n.status ?? "").toLowerCase(),
      author: n.CreatorEmail ?? n.creatorEmail ?? n.CreatorName ?? n.creatorName ?? n.author ?? "",
      authorEmail: n.CreatorEmail ?? n.creatorEmail ?? null,
      authorName: n.CreatorName ?? n.creatorName ?? null,
      authorId: rawCreatedBy !== null && rawCreatedBy !== undefined ? Number(rawCreatedBy) : null,
      createdDate: formatDate(n.CreatedAt ?? n.createdAt),
      createdAt: n.CreatedAt ?? n.createdAt ?? null,
      updatedAt: n.UpdatedAt ?? n.updatedAt ?? null,
      reviewComment: n.ReviewComment ?? n.reviewComment ?? null,
      approvedBy: n.ApprovedBy ?? n.approvedBy ?? null,
      approvedAt: n.ApprovedAt ?? n.approvedAt ?? null,
      __raw: n,
    };
    
    return item;
  });

// Helpers: detect role robustly across different storages/claims
const parseMaybeNumber = (v) => {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};

const getCurrentRoleId = () => {
  try {
    // 1) profile.roleId or profile.user.roleId
    const profileStr = localStorage.getItem("profile");
    if (profileStr) {
      const profile = JSON.parse(profileStr);
      const fromProfile = parseMaybeNumber(
        profile?.roleId ?? profile?.user?.roleId ?? profile?.user?.RoleId
      );
      if (fromProfile !== null) return fromProfile;
    }

    // 2) loose localStorage key
    const looseRoleId = parseMaybeNumber(localStorage.getItem("roleId"));
    if (looseRoleId !== null) return looseRoleId;

    // 3) JWT claim: role_id or roleId
    const token = localStorage.getItem("token");
    if (token && token.includes(".")) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const fromToken = parseMaybeNumber(payload?.role_id ?? payload?.roleId);
      if (fromToken !== null) return fromToken;
    }
  } catch (e) {
    console.error("Error getting role:", e);
  }
  return null;
};

const getCurrentUserId = () => {
  try {
    // Backend dùng "sub" claim trong JWT token để lưu Account.UserId
    // Account.UserId là UserId từ bảng User (không phải AccountId)
    // Ưu tiên lấy từ JWT token trước vì đây là nguồn chính xác nhất
    const token = localStorage.getItem("token");
    if (token && token.includes(".")) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        console.log("DEBUG getCurrentUserId: JWT payload:", payload);
        // Backend dùng "sub" claim cho userId (Account.UserId = User.UserId)
        const fromToken = parseMaybeNumber(payload?.sub);
        if (fromToken !== null) {
          console.log("DEBUG getCurrentUserId: Got userId from JWT 'sub' claim:", fromToken);
          return fromToken;
        }
      } catch (e) {
        console.error("DEBUG getCurrentUserId: Error parsing JWT token:", e);
      }
    }

    // Fallback: Lấy userId từ profile
    const profileStr = localStorage.getItem("profile");
    if (profileStr) {
      try {
        const profile = JSON.parse(profileStr);
        console.log("DEBUG getCurrentUserId: Profile:", profile);
        const userId = parseMaybeNumber(
          profile?.accountId ?? profile?.account_id ?? profile?.userId ?? profile?.user_id ?? profile?.user?.userId ?? profile?.user?.accountId
        );
        if (userId !== null) {
          console.log("DEBUG getCurrentUserId: Got userId from profile:", userId);
          return userId;
        }
      } catch (e) {
        console.error("DEBUG getCurrentUserId: Error parsing profile:", e);
      }
    }
  } catch (e) {
    console.error("DEBUG getCurrentUserId: Error getting user ID:", e);
  }
  console.log("DEBUG getCurrentUserId: Could not find userId");
  return null;
};

export default function NewsList({ title = "News Management" }) {
  const [api, contextHolder] = notification.useNotification();
  
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [currentRoleId, setCurrentRoleId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    search: "",
    status: "",
  });

  // Modals
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [viewReasonModalVisible, setViewReasonModalVisible] = useState(false);
  const [loadingReviewComment, setLoadingReviewComment] = useState(false);
  const [approvedByInfoMap, setApprovedByInfoMap] = useState({});

  useEffect(() => {
    const roleId = getCurrentRoleId();
    const userId = getCurrentUserId();
    console.log("=== DEBUG: User Info ===");
    console.log("Current Role ID:", roleId);
    console.log("Current User ID:", userId);
    console.log("Profile from localStorage:", localStorage.getItem("profile"));
    console.log("Token (first 50 chars):", localStorage.getItem("token")?.substring(0, 50));
    setCurrentRoleId(roleId);
    setCurrentUserId(userId);
  }, []);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        pageSize,
        ...(filters.status ? { status: filters.status } : {}),
      };
      const response = await NewsApi.getNews(params);
      const { total, items } = response;

      if (!items || !Array.isArray(items)) {
        console.error("Invalid response format:", response);
        message.error("Invalid data format");
        return;
      }

      // Apply client-side filtering for search only (status is now filtered server-side)
      let filteredItems = items;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredItems = filteredItems.filter(
          (item) =>
            (item.title ?? item.Title ?? "").toLowerCase().includes(searchLower) ||
            (item.content ?? item.Content ?? "").toLowerCase().includes(searchLower)
        );
      }

      const normalized = normalize(filteredItems);
      
      // Filter logic:
      // - Head (role 2): Filter out draft news - Head không xem được draft
      // - Staff (role 6, 7): Filter draft news - chỉ xem được draft của chính mình
      let finalNews = normalized;
      const currentRoleIdNum = Number(currentRoleId);
      const isStaffRole = [6, 7].includes(currentRoleIdNum);
      
      if (currentRoleIdNum === 2) {
        // Head: Filter out all draft news
        finalNews = normalized.filter(item => {
          const itemStatus = (item.status || item.__raw?.Status || "").toLowerCase();
          return itemStatus !== "draft";
        });
      } else if (isStaffRole) {
        // Staff: Filter draft news - chỉ xem được draft của chính mình
        const currentUserIdNum = currentUserId ? Number(currentUserId) : null;
        finalNews = normalized.filter(item => {
          const itemStatus = (item.status || item.__raw?.Status || "").toLowerCase();
          if (itemStatus === "draft") {
            // Chỉ hiển thị draft nếu là của chính mình
            const itemAuthorId = item.authorId ? Number(item.authorId) : null;
            return itemAuthorId !== null && currentUserIdNum !== null && itemAuthorId === currentUserIdNum;
          }
          return true; // Hiển thị tất cả các status khác
        });
      }
      
      // Update total: adjust total after filtering
      const adjustedTotal = (currentRoleIdNum === 2 || isStaffRole)
        ? finalNews.length 
        : (filters.search ? filteredItems.length : total);
      
      setTotal(adjustedTotal);
      setNews(finalNews);
    } catch (e) {
      console.error("Error fetching news:", e);
      message.error(`Unable to load news: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters.search, filters.status, currentRoleId, currentUserId]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const onChangeFilter = (field, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleRefresh = () => {
    fetchNews();
  };

  const openView = async (record) => {
    setSelectedNews(record);
    setViewModalVisible(true);
    
    // Fetch detail từ API để lấy ApprovedByNavigation và các thông tin đầy đủ
    if (record.id || record.newsId) {
      try {
        const newsDetail = await NewsApi.getNewsById(record.id || record.newsId);
        
        // Debug log để kiểm tra dữ liệu từ API - LOG TOÀN BỘ RESPONSE
        console.log("=== DEBUG openView - News Detail from API (FULL) ===");
        console.log("newsDetail (full object):", JSON.stringify(newsDetail, null, 2));
        console.log("newsDetail keys:", Object.keys(newsDetail || {}));
        console.log("newsDetail?.ApprovedBy:", newsDetail?.ApprovedBy);
        console.log("newsDetail?.approvedBy:", newsDetail?.approvedBy);
        console.log("newsDetail?.ApprovedAt:", newsDetail?.ApprovedAt);
        console.log("newsDetail?.approvedAt:", newsDetail?.approvedAt);
        console.log("newsDetail?.ApprovedByNavigation:", newsDetail?.ApprovedByNavigation);
        console.log("newsDetail?.data:", newsDetail?.data);
        
        // Extract approvedBy từ response - kiểm tra nhiều nguồn
        const approvedByIdFromResponse = newsDetail?.ApprovedBy || 
                                        newsDetail?.approvedBy || 
                                        (newsDetail?.data && (newsDetail.data.ApprovedBy || newsDetail.data.approvedBy)) ||
                                        null;
        
        // Extract approvedAt từ response
        const approvedAtFromResponse = newsDetail?.ApprovedAt || newsDetail?.approvedAt || null;
        
        console.log("=== DEBUG openView - Extraction Results ===");
        console.log("approvedByIdFromResponse:", approvedByIdFromResponse);
        console.log("approvedAtFromResponse:", approvedAtFromResponse);
        
        // Merge approved info và các thông tin khác từ detail vào record
        // Sử dụng giá trị đã extract từ response
        const updatedRecord = {
          ...record,
          approvedAt: approvedAtFromResponse || record.approvedAt || null,
          approvedBy: approvedByIdFromResponse || record.approvedBy || null,
          reviewComment: newsDetail?.ReviewComment || newsDetail?.reviewComment || record.reviewComment || null,
          __raw: {
            ...(record.__raw || {}),
            // Sử dụng giá trị đã extract, không dùng trực tiếp từ newsDetail
            ApprovedAt: approvedAtFromResponse || record.__raw?.ApprovedAt || null,
            ApprovedBy: approvedByIdFromResponse || record.__raw?.ApprovedBy || null,
            ApprovedByNavigation: newsDetail?.ApprovedByNavigation || record.__raw?.ApprovedByNavigation || null,
            ReviewComment: newsDetail?.ReviewComment || newsDetail?.reviewComment || record.__raw?.ReviewComment || null,
            // Preserve toàn bộ response data để có thể access sau
            data: newsDetail?.data || newsDetail || null,
            // Preserve toàn bộ newsDetail để debug
            _fullResponse: newsDetail,
          }
        };
        
        console.log("=== DEBUG openView - Updated Record ===");
        console.log("updatedRecord.approvedBy:", updatedRecord.approvedBy);
        console.log("updatedRecord.__raw.ApprovedBy:", updatedRecord.__raw?.ApprovedBy);
        console.log("updatedRecord.__raw.ApprovedByNavigation:", updatedRecord.__raw?.ApprovedByNavigation);
        
        // Fetch approvedBy user info nếu không có ApprovedByNavigation - TRƯỚC KHI setSelectedNews
        const approvedById = updatedRecord.approvedBy || updatedRecord.__raw?.ApprovedBy || null;
        const approvedByNavigation = updatedRecord.__raw?.ApprovedByNavigation || null;
        
        if (approvedById && !approvedByNavigation) {
          try {
            console.log("=== DEBUG openView - Fetching ApprovedBy Info ===");
            console.log("approvedById:", approvedById);
            const userInfo = await UserApi.getUserById(approvedById);
            console.log("Fetched userInfo:", userInfo);
            
            // Update approvedByInfoMap TRƯỚC KHI setSelectedNews
            setApprovedByInfoMap(prev => ({
              ...prev,
              [approvedById]: userInfo
            }));
            
            // Merge userInfo vào updatedRecord để đảm bảo có data ngay
            updatedRecord.__raw.ApprovedByNavigation = userInfo;
          } catch (error) {
            console.error("Error fetching approvedBy user info:", error);
            console.error("Error details:", error.response?.data || error.message);
          }
        }
        
        // Set selectedNews SAU KHI đã fetch và merge userInfo
        setSelectedNews(updatedRecord);
      } catch (error) {
        console.error("Error fetching news detail:", error);
        // Vẫn hiển thị modal với record hiện tại nếu có lỗi
      }
    }
  };

  const openEdit = (record) => {
    // Chỉ được edit khi status là draft hoặc rejected và là Staff
    if (currentRoleId !== 6) {
      message.warning("Only Staff can edit news");
      return;
    }
    if (record.status !== "draft" && record.status !== "rejected" && record.status !== "pending") {
      message.warning("News can only be edited when status is 'draft', 'pending' or 'rejected'");
      return;
    }
    setSelectedNews(record);
    setEditModalVisible(true);
  };

  const handleDelete = async (record) => {
    try {
      await NewsApi.deleteNews(record.id);
      api.success({
        message: "Success",
        description: "News deleted successfully",
        placement: "topRight",
        duration: 3,
      });
      fetchNews();
    } catch (e) {
      console.error("Error deleting news:", e);
      api.error({
        message: "Error",
        description: `Failed to delete news: ${e.response?.data?.message ?? e.message}`,
        placement: "topRight",
        duration: 3,
      });
    }
  };

  const handleSubmitForReview = async (record) => {
    try {
      await NewsApi.submitForReview(record.id);
      api.success({
        message: "Success",
        description: "News submitted for review successfully",
        placement: "topRight",
        duration: 3,
      });
      fetchNews();
    } catch (e) {
      console.error("Error submitting news:", e);
      api.error({
        message: "Error",
        description: `Failed to submit news: ${e.response?.data?.message ?? e.message}`,
        placement: "topRight",
        duration: 3,
      });
    }
  };

  const handleApprove = async (record) => {
    try {
      await NewsApi.approveNews(record.id);
      message.success("News approved and published successfully");
      fetchNews();
    } catch (e) {
      console.error("Error approving news:", e);
      message.error(`Failed to approve news: ${e.response?.data?.message ?? e.message}`);
    }
  };

  const handleReject = async (record, reviewComment) => {
    try {
      await NewsApi.rejectNews(record.id, reviewComment);
      message.success("News rejected successfully");
      setRejectModalVisible(false);
      setRejectComment("");
      setSelectedNews(null);
      fetchNews();
    } catch (e) {
      console.error("Error rejecting news:", e);
      message.error(`Failed to reject news: ${e.response?.data?.message ?? e.message}`);
    }
  };

  const openRejectModal = (record) => {
    setSelectedNews(record);
    setRejectComment("");
    setRejectModalVisible(true);
  };

  const openViewReasonModal = async (record) => {
    setSelectedNews(record);
    setViewReasonModalVisible(true);
    
    // Luôn fetch detail từ API để lấy ReviewComment và ApprovedBy/ApprovedAt (vì NewsListDto không có)
    if (record.id || record.newsId) {
      setLoadingReviewComment(true);
      try {
        const newsDetail = await NewsApi.getNewsById(record.id || record.newsId);
        
        // Debug log toàn bộ response
        console.log("=== DEBUG openViewReasonModal - News Detail from API (FULL) ===");
        console.log("newsDetail (full object):", JSON.stringify(newsDetail, null, 2));
        console.log("newsDetail keys:", Object.keys(newsDetail || {}));
        
        // Extract approvedBy từ response - kiểm tra nhiều nguồn
        const approvedByIdFromResponse = newsDetail?.ApprovedBy || 
                                        newsDetail?.approvedBy || 
                                        (newsDetail?.data && (newsDetail.data.ApprovedBy || newsDetail.data.approvedBy)) ||
                                        null;
        
        // Extract approvedAt từ response
        const approvedAtFromResponse = newsDetail?.ApprovedAt || newsDetail?.approvedAt || null;
        
        console.log("=== DEBUG openViewReasonModal - Extraction Results ===");
        console.log("approvedByIdFromResponse:", approvedByIdFromResponse);
        console.log("approvedAtFromResponse:", approvedAtFromResponse);
        
        // Merge reviewComment và approved info từ detail vào record
        const updatedRecord = {
          ...record,
          reviewComment: newsDetail?.ReviewComment || newsDetail?.reviewComment || null,
          approvedAt: approvedAtFromResponse || record.approvedAt || null,
          approvedBy: approvedByIdFromResponse || record.approvedBy || null,
          __raw: {
            ...(record.__raw || {}),
            ReviewComment: newsDetail?.ReviewComment || newsDetail?.reviewComment || null,
            ApprovedAt: approvedAtFromResponse || record.__raw?.ApprovedAt || null,
            ApprovedBy: approvedByIdFromResponse || record.__raw?.ApprovedBy || null,
            ApprovedByNavigation: newsDetail?.ApprovedByNavigation || record.__raw?.ApprovedByNavigation || null,
            data: newsDetail?.data || newsDetail || null,
            _fullResponse: newsDetail,
          }
        };
        
        // Fetch approvedBy user info nếu không có ApprovedByNavigation - TRƯỚC KHI setSelectedNews
        const approvedById = updatedRecord.approvedBy || updatedRecord.__raw?.ApprovedBy || null;
        const approvedByNavigation = updatedRecord.__raw?.ApprovedByNavigation || null;
        
        if (approvedById && !approvedByNavigation) {
          try {
            console.log("=== DEBUG openViewReasonModal - Fetching ApprovedBy Info ===");
            console.log("approvedById:", approvedById);
            const userInfo = await UserApi.getUserById(approvedById);
            console.log("Fetched userInfo:", userInfo);
            
            // Update approvedByInfoMap TRƯỚC KHI setSelectedNews
            setApprovedByInfoMap(prev => ({
              ...prev,
              [approvedById]: userInfo
            }));
            
            // Merge userInfo vào updatedRecord để đảm bảo có data ngay
            updatedRecord.__raw.ApprovedByNavigation = userInfo;
          } catch (error) {
            console.error("Error fetching approvedBy user info:", error);
            console.error("Error details:", error.response?.data || error.message);
          }
        }
        
        // Set selectedNews SAU KHI đã fetch và merge userInfo
        setSelectedNews(updatedRecord);
      } catch (error) {
        console.error("Error fetching news detail:", error);
        message.error("Failed to load rejection reason");
      } finally {
        setLoadingReviewComment(false);
      }
    }
  };

  const handleRejectConfirm = () => {
    if (!rejectComment || !rejectComment.trim()) {
      message.error("Review comment is required");
      return;
    }
    if (selectedNews) {
      handleReject(selectedNews, rejectComment.trim());
    }
  };

  // Mapping vai trò
  const isStaff = [6, 7].includes(Number(currentRoleId));
  const isStaffRole6 = Number(currentRoleId) === 6; // Chỉ role 6 mới được xóa
  const isHead = [2, 5].includes(Number(currentRoleId));

  const columns = useMemo(
    () => [
      {
        title: "NEWS ID",
        dataIndex: "newsId",
        key: "newsId",
        render: (id) => formatNewsId(id),
        width: 100,
      },
      {
        title: "TITLE",
        dataIndex: "title",
        key: "title",
        ellipsis: { showTitle: false },
        render: (text) => (
          <Tooltip placement="topLeft" title={text}>
            {text}
          </Tooltip>
        ),
      },
      {
        title: "AUTHOR",
        dataIndex: "author",
        key: "author",
        width: 200,
        render: (email, record) => email || record.authorEmail || record.authorName || "N/A",
      },
      {
        title: "CREATED DATE",
        dataIndex: "createdDate",
        key: "createdDate",
        width: 120,
      },
      {
        title: "STATUS",
        dataIndex: "status",
        key: "status",
        width: 130,
        render: (status) => (
          <Tag color={STATUS_COLORS[status] || "default"}>
            {STATUS_LABELS[status] || status}
          </Tag>
        ),
      },
      {
        title: "ACTIONS",
        key: "actions",
        align: "center",
        width: 220,
        fixed: "right",
        render: (_, record) => {
          // Đảm bảo status được normalize đúng
          const rawStatus = record.status ?? record.__raw?.Status ?? record.__raw?.status ?? "";
          const status = String(rawStatus).toLowerCase().trim();
          
          // Debug: Log status để kiểm tra
          if (rawStatus && String(rawStatus).toLowerCase().includes("reject")) {
            console.log("DEBUG Status check:", {
              rawStatus,
              normalizedStatus: status,
              recordId: record.id || record.newsId
            });
          }
          
          // Đảm bảo authorId và currentUserId được so sánh đúng kiểu (Number)
          const recordAuthorId = record.authorId ? Number(record.authorId) : null;
          const currentUserIdNum = currentUserId ? Number(currentUserId) : null;
          const isOwner = recordAuthorId !== null && currentUserIdNum !== null && recordAuthorId === currentUserIdNum;
          
          // Debug logs cho submit
          if (status === "draft" && isStaffRole6) {
            console.log(`=== DEBUG Submit - News ID: ${record.id || record.newsId} ===`);
            console.log("Record:", record);
            console.log("record.authorId (raw):", record.authorId);
            console.log("record.authorId (Number):", recordAuthorId);
            console.log("currentUserId (raw):", currentUserId);
            console.log("currentUserId (Number):", currentUserIdNum);
            console.log("isOwner:", isOwner);
            console.log("status:", status);
            console.log("isStaffRole6:", isStaffRole6);
            console.log("canSubmit:", isStaffRole6 && status === "draft" && isOwner);
          }
          
          // Điều kiện cho Staff:
          // - Draft: View, Edit, Delete, Submit (chỉ người tạo mới được submit)
          // - Pending: View, Edit, Delete
          // - Published: View, Delete
          // - Rejected: View (KHÔNG được Edit và Delete)
          const showEdit = isStaff && (status === "draft" || status === "pending") && status !== "rejected";
          // Delete: 
          // - Staff (role 6): có thể xóa draft, pending, published (KHÔNG được xóa rejected)
          // - Head (role 2): có thể xóa pending, published, rejected (không có draft trong list nên không cần check)
          const showDelete = (isStaffRole6 && status !== "rejected") || 
            (isHead && Number(currentRoleId) === 2 && (status === "pending" || status === "published" || status === "rejected"));
          // Submit: chỉ người tạo (role 6) mới được submit khi status là draft
          const canSubmit = isStaffRole6 && status === "draft" && isOwner;
          
          // Điều kiện cho Head (role 2):
          // - Pending: Approve, Reject, Delete
          // - Rejected: View review comment (hiển thị trong ViewNewsModal và button), Delete
          // - Published: View, Delete
          // - Head KHÔNG có quyền Edit
          const canApprove = isHead && status === "pending";
          const canReject = isHead && status === "pending";
          // View Rejection Reason: Hiển thị cho cả Head và Staff khi news bị rejected
          // Hiển thị cho tất cả rejected news (có thể có hoặc không có review comment)
          const canViewRejectReason = (isHead || isStaff) && status === "rejected";
          
          // Debug log để kiểm tra
          if (status === "rejected") {
            console.log("=== DEBUG View Rejection Reason ===");
            console.log("News ID:", record.id || record.newsId);
            console.log("Status:", status);
            console.log("isHead:", isHead);
            console.log("isStaff:", isStaff);
            console.log("currentRoleId:", currentRoleId);
            console.log("canViewRejectReason:", canViewRejectReason);
            console.log("reviewComment:", record.reviewComment || record.__raw?.ReviewComment);
          }

          return (
            <Space size={[4, 8]} wrap>
              {/* View Button - Luôn active */}
              <Tooltip title="View Details">
                <Button 
                  size="small" 
                  icon={<EyeOutlined />} 
                  onClick={() => openView(record)}
                  style={{ minWidth: 32 }}
                />
              </Tooltip>
              
              {/* Edit Button - Chỉ hiện cho Staff khi có thể edit, Head (role 2) không có Edit */}
              {!isHead && showEdit && (
                <Tooltip title="Edit News">
                  <Button 
                    size="small" 
                    icon={<EditOutlined />} 
                    onClick={() => openEdit(record)}
                    style={{ minWidth: 32 }}
                  />
                </Tooltip>
              )}
              
              {/* Delete Button - Chỉ hiện khi có thể delete */}
              {showDelete && (
                <Tooltip title="Delete News">
                  <Popconfirm
                    title="Delete this news?"
                    description="This action cannot be undone."
                    onConfirm={() => handleDelete(record)}
                    okText="Delete"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true }}
                  >
                    <Button 
                      size="small" 
                      icon={<DeleteOutlined />} 
                      danger
                      style={{ minWidth: 32 }}
                    />
                  </Popconfirm>
                </Tooltip>
              )}
              
              {/* Submit Button - Chỉ hiện khi có thể submit */}
              {canSubmit && (
                <Tooltip title="Submit for Review">
                  <Popconfirm
                    title="Submit for review?"
                    description="This news will be sent to Head for approval."
                    onConfirm={() => handleSubmitForReview(record)}
                    okText="Yes"
                    cancelText="No"
                    okButtonProps={{ type: "primary" }}
                  >
                    <Button 
                      size="small" 
                      icon={<SendOutlined />} 
                      type="primary"
                      className="submit-news-button"
                      style={{ 
                        minWidth: 36,
                        height: 28,
                        background: "#722ed1",
                        borderColor: "#722ed1",
                        fontWeight: 600,
                        boxShadow: "0 2px 6px rgba(114, 46, 209, 0.35)",
                        transition: "all 0.3s ease"
                      }}
                    />
                  </Popconfirm>
                </Tooltip>
              )}
              
              {/* Head Buttons - Approve và Reject (giữ nguyên logic ẩn/hiện) */}
              {canApprove && (
                <Popconfirm
                  title="Approve this news?"
                  description="This news will be published immediately."
                  onConfirm={() => handleApprove(record)}
                  okText="Approve"
                  cancelText="Cancel"
                  okButtonProps={{ type: "primary" }}
                >
                  <Tooltip title="Approve">
                    <Button 
                      size="small" 
                      icon={<CheckCircleOutlined />} 
                      type="primary"
                      style={{ minWidth: 32 }}
                    />
                  </Tooltip>
                </Popconfirm>
              )}
              
              {canReject && (
                <Tooltip title="Reject">
                  <Button 
                    size="small" 
                    icon={<CloseCircleOutlined />} 
                    danger
                    onClick={() => openRejectModal(record)}
                    style={{ minWidth: 32 }}
                  />
                </Tooltip>
              )}

              {/* View Reject Reason Button - Hiện cho rejected news (cả Head và Staff) */}
              {canViewRejectReason && (
                <Tooltip title="View Rejection Reason">
                  <Button 
                    size="small" 
                    icon={<InfoCircleOutlined />} 
                    onClick={() => openViewReasonModal(record)}
                    style={{ minWidth: 32, color: "#fa8c16", borderColor: "#fa8c16" }}
                  />
                </Tooltip>
              )}
            </Space>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isStaff, isStaffRole6, isHead, currentUserId]
  );

  return (
    <>
      {contextHolder}
      <Card 
        bodyStyle={{ padding: 24 }} 
        style={{ 
          borderRadius: 12, 
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          background: "#ffffff"
        }}
      >
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: "1px solid #f0f0f0"
        }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#1a1a1a" }}>{title}</h3>
        </div>

        <div style={{ 
          display: "flex", 
          gap: 12, 
          alignItems: "center", 
          flexWrap: "wrap", 
          marginBottom: 20,
          padding: "12px 16px",
          background: "#fafafa",
          borderRadius: 8
        }}>
          <Input
            placeholder="Search news..."
            allowClear
            prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
            value={filters.search}
            onChange={(e) => onChangeFilter("search", e.target.value)}
            onPressEnter={handleRefresh}
            style={{ width: 300, borderRadius: 6 }}
          />

          <Select
            placeholder="All Statuses"
            value={filters.status || undefined}
            onChange={(value) => onChangeFilter("status", value)}
            style={{ width: 180, borderRadius: 6 }}
            options={STATUS_OPTIONS}
            allowClear
          />

          <Space style={{ marginLeft: "auto" }}>
            {isStaff && (
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => setAddModalVisible(true)}
                size="middle"
                style={{
                  borderRadius: 6,
                  fontWeight: 500,
                  boxShadow: "0 2px 4px rgba(24, 144, 255, 0.2)"
                }}
              >
                Add News
              </Button>
            )}
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={news}
          loading={loading}
          rowKey="id"
          bordered={false}
          style={{ background: "#ffffff" }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (total, range) => (
              <span style={{ color: "#595959", fontWeight: 400 }}>
                Showing <strong>{range[0]}-{range[1]}</strong> of <strong>{total}</strong> items
              </span>
            ),
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
            style: { marginTop: 16 }
          }}
        />
      </Card>

      {/* Add News Modal */}
      {isStaff && (
        <AddNewsModal
          visible={addModalVisible}
          onCancel={() => setAddModalVisible(false)}
          onSuccess={() => {
            setAddModalVisible(false);
            fetchNews();
          }}
        />
      )}

      {/* View News Modal */}
      <ViewNewsModal
        visible={viewModalVisible}
        news={selectedNews ? (() => {
          // Lấy approvedById từ nhiều nguồn
          const approvedById = selectedNews.approvedBy || 
                               selectedNews.__raw?.ApprovedBy || 
                               selectedNews.__raw?.data?.ApprovedBy ||
                               null;
          
          // Lấy approvedByInfo từ map hoặc từ __raw
          const approvedByInfoFromMap = approvedById ? approvedByInfoMap[approvedById] : null;
          const approvedByNavigation = selectedNews.__raw?.ApprovedByNavigation || approvedByInfoFromMap || null;
          
          console.log("=== DEBUG ViewNewsModal Prop Merge ===");
          console.log("selectedNews.approvedBy:", selectedNews.approvedBy);
          console.log("selectedNews.__raw?.ApprovedBy:", selectedNews.__raw?.ApprovedBy);
          console.log("approvedById:", approvedById);
          console.log("approvedByInfoFromMap:", approvedByInfoFromMap);
          console.log("approvedByNavigation:", approvedByNavigation);
          
          return {
            ...selectedNews,
            approvedBy: approvedById || selectedNews.approvedBy || null,
            __raw: {
              ...selectedNews.__raw,
              // Merge approvedByInfo vào __raw - ưu tiên ApprovedByNavigation từ API, sau đó từ map
              ApprovedBy: approvedById || selectedNews.__raw?.ApprovedBy || null,
              ApprovedByNavigation: approvedByNavigation,
            }
          };
        })() : null}
        onCancel={() => setViewModalVisible(false)}
      />

      {/* Edit News Modal */}
      {isStaff && (
        <EditNewsModal
          visible={editModalVisible}
          news={selectedNews}
          onCancel={() => setEditModalVisible(false)}
          onSuccess={() => {
            setEditModalVisible(false);
            fetchNews();
          }}
        />
      )}

      {/* Reject News Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
            <span>Reject News</span>
          </div>
        }
        open={rejectModalVisible}
        onOk={handleRejectConfirm}
        onCancel={() => {
          setRejectModalVisible(false);
          setRejectComment("");
          setSelectedNews(null);
        }}
        okText="Reject"
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
        width={800}
        destroyOnClose
      >
        {selectedNews && (() => {
          const newsTitle = selectedNews.title || selectedNews.__raw?.Title || 'N/A';
          const newsContent = selectedNews.content || selectedNews.__raw?.Content || '';
          const newsImage = selectedNews.newsImage || selectedNews.__raw?.NewsImage || null;
          
          // Process image URL
          const processImageUrl = (imageUrl) => {
            if (!imageUrl || typeof imageUrl !== "string") return null;
            const trimmedUrl = imageUrl.trim();
            if (!trimmedUrl) return null;
            if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")) {
              return trimmedUrl;
            }
            if (trimmedUrl.startsWith("/")) {
              const baseUrl = process.env.REACT_APP_API_BASE || 
                             (typeof window !== "undefined" ? window.location.origin : "");
              return `${baseUrl}${trimmedUrl}`;
            }
            return trimmedUrl;
          };
          
          const displayImageUrl = processImageUrl(newsImage);
          
          return (
            <div>
              {/* News Information Section - Compact */}
              <Card 
                size="small" 
                style={{ marginBottom: 16, background: '#fafafa' }}
                bodyStyle={{ padding: '12px 16px' }}
              >
                <Row gutter={[12, 8]}>
                  <Col span={6}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>News ID:</Typography.Text>
                  </Col>
                  <Col span={18}>
                    <Typography.Text strong style={{ fontSize: 12 }}>
                      {formatNewsId(selectedNews.id || selectedNews.newsId)}
                    </Typography.Text>
                  </Col>
                  
                  <Col span={6}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>Title:</Typography.Text>
                  </Col>
                  <Col span={18}>
                    <Typography.Text strong style={{ fontSize: 12 }} ellipsis={{ tooltip: newsTitle }}>
                      {newsTitle}
                    </Typography.Text>
                  </Col>
                  
                  <Col span={6}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>Author:</Typography.Text>
                  </Col>
                  <Col span={18}>
                    <Typography.Text style={{ fontSize: 12 }}>
                      {selectedNews.author || selectedNews.authorEmail || selectedNews.__raw?.CreatorEmail || 'N/A'}
                    </Typography.Text>
                  </Col>
                  
                  <Col span={6}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>Status:</Typography.Text>
                  </Col>
                  <Col span={18}>
                    <Tag color={STATUS_COLORS[selectedNews.status] || "default"} style={{ fontSize: 11, margin: 0 }}>
                      {STATUS_LABELS[selectedNews.status] || selectedNews.status}
                    </Tag>
                  </Col>
                  
                  <Col span={6}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>Created:</Typography.Text>
                  </Col>
                  <Col span={18}>
                    <Typography.Text style={{ fontSize: 12 }}>
                      {selectedNews.createdDate || formatDate(selectedNews.createdAt || selectedNews.__raw?.CreatedAt) || 'N/A'}
                    </Typography.Text>
                  </Col>
                </Row>
              </Card>

              {/* Content and Image Section */}
              {(newsContent || displayImageUrl) && (
                <Collapse
                  items={[
                    {
                      key: '1',
                      label: <Typography.Text strong>View News Content & Image</Typography.Text>,
                      children: (
                        <div>
                          {/* Image Preview */}
                          {displayImageUrl && (
                            <div style={{ marginBottom: 16, textAlign: 'center' }}>
                              <img
                                src={displayImageUrl}
                                alt="News preview"
                                style={{
                                  maxWidth: '100%',
                                  maxHeight: '200px',
                                  objectFit: 'contain',
                                  borderRadius: 6,
                                  border: '1px solid #f0f0f0',
                                }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          
                          {/* Content Preview */}
                          {newsContent && (
                            <div>
                              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                                Content:
                              </Typography.Text>
                              <div style={{
                                background: '#fff',
                                border: '1px solid #f0f0f0',
                                borderRadius: 6,
                                padding: '12px',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                fontSize: 13,
                                lineHeight: 1.6,
                                whiteSpace: 'pre-wrap',
                                color: '#434343',
                              }}>
                                {newsContent}
                              </div>
                            </div>
                          )}
                        </div>
                      ),
                    },
                  ]}
                  style={{ marginBottom: 16 }}
                />
              )}
            </div>
          );
        })()}

        {/* Rejection Reason Input */}
        <div>
          <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
            Rejection Reason <span style={{ color: '#ff4d4f' }}>*</span>
          </Typography.Text>
          <Input.TextArea
            placeholder="Please provide a detailed explanation for rejecting this news. This comment will be visible to the news author."
            rows={6}
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            maxLength={500}
            showCount
            style={{ marginBottom: 12 }}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            This comment will be sent to the news author to help them understand why the news was rejected.
          </Typography.Text>
        </div>
      </Modal>

      {/* View Rejection Reason Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <InfoCircleOutlined style={{ color: '#fa8c16', fontSize: 20 }} />
            <span>Rejection Reason</span>
          </div>
        }
        open={viewReasonModalVisible}
        onCancel={() => {
          setViewReasonModalVisible(false);
          setSelectedNews(null);
          setLoadingReviewComment(false);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setViewReasonModalVisible(false);
            setSelectedNews(null);
            setLoadingReviewComment(false);
          }}>
            Close
          </Button>
        ]}
        width={600}
        destroyOnClose
      >
        {selectedNews && (
          <div>
            {/* News Information */}
            <Card 
              size="small" 
              style={{ marginBottom: 20, background: '#fafafa' }}
              title={<Typography.Text strong>News Information</Typography.Text>}
            >
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography.Text type="secondary">News ID:</Typography.Text>
                  <Typography.Text strong>{formatNewsId(selectedNews.id || selectedNews.newsId)}</Typography.Text>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography.Text type="secondary">Title:</Typography.Text>
                  <Typography.Text strong style={{ maxWidth: '70%', textAlign: 'right' }}>
                    {selectedNews.title || selectedNews.__raw?.Title || 'N/A'}
                  </Typography.Text>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography.Text type="secondary">Author:</Typography.Text>
                  <Typography.Text>
                    {selectedNews.author || selectedNews.authorEmail || selectedNews.__raw?.CreatorEmail || 'N/A'}
                  </Typography.Text>
                </div>
                {/* Approved By and Approved At - Hiển thị cho cả published và rejected news (luôn hiển thị, kể cả khi không có dữ liệu) */}
                {(() => {
                  const newsStatus = (selectedNews.status || selectedNews.__raw?.Status || "").toLowerCase();
                  // Hiển thị Approved info cho cả published và rejected news
                  if (newsStatus !== "published" && newsStatus !== "rejected") {
                    return null;
                  }
                  
                  const approvedAt = selectedNews.approvedAt || selectedNews.__raw?.ApprovedAt || null;
                  const approvedByNavigation = selectedNews.__raw?.ApprovedByNavigation || null;
                  const approvedById = selectedNews.approvedBy || selectedNews.__raw?.ApprovedBy || null;
                  const approvedByInfo = approvedById ? approvedByInfoMap[approvedById] : null;
                  
                  // Debug log
                  console.log("=== DEBUG View Rejection Reason - Approved Info ===");
                  console.log("status:", newsStatus);
                  console.log("approvedAt:", approvedAt);
                  console.log("approvedById:", approvedById);
                  console.log("approvedByNavigation:", approvedByNavigation);
                  console.log("approvedByInfo (fetched):", approvedByInfo);
                  console.log("selectedNews.__raw:", selectedNews.__raw);
                  
                  // Lấy thông tin từ ApprovedByNavigation hoặc từ fetched approvedByInfo
                  const approvedByData = approvedByNavigation || approvedByInfo;
                  const approvedByName = approvedByData 
                    ? `${approvedByData.FirstName || approvedByData.firstName || ''} ${approvedByData.LastName || approvedByData.lastName || ''}`.trim() 
                    : null;
                  const approvedByEmail = approvedByData?.Email || approvedByData?.email || null;
                  const approvedBy = approvedByName || approvedByEmail || null;
                  
                  return (
                    <>
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography.Text type="secondary">Approved At:</Typography.Text>
                        <Typography.Text>
                          {approvedAt ? formatApprovedAt(approvedAt) : "N/A"}
                        </Typography.Text>
                      </div>
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography.Text type="secondary">Approved By:</Typography.Text>
                        <Typography.Text>{approvedBy || "N/A"}</Typography.Text>
                      </div>
                    </>
                  );
                })()}
              </Space>
            </Card>

            {/* Rejection Reason */}
            <div>
              <Typography.Text strong style={{ display: 'block', marginBottom: 12, fontSize: 16 }}>
                Rejection Reason:
              </Typography.Text>
              {loadingReviewComment ? (
                <div style={{
                  background: '#fff7e6',
                  border: '1px solid #ffe58f',
                  borderRadius: 6,
                  padding: '16px',
                  minHeight: 100,
                  textAlign: 'center',
                }}>
                  <Typography.Text type="secondary">Loading rejection reason...</Typography.Text>
                </div>
              ) : (
                <div style={{
                  background: '#fff7e6',
                  border: '1px solid #ffe58f',
                  borderRadius: 6,
                  padding: '16px',
                  minHeight: 100,
                }}>
                  <Typography.Text style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {selectedNews.reviewComment || 
                     selectedNews.__raw?.ReviewComment || 
                     selectedNews.__raw?.reviewComment || 
                     'No rejection reason provided.'}
                  </Typography.Text>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

