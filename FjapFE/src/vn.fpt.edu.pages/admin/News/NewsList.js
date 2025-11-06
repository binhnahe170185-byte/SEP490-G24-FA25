import React, { useEffect, useMemo, useState, useCallback } from "react";
import { 
  Button, Input, Space, Table, Tooltip, message, Card, Modal, 
  Select, Tag, Popconfirm, notification
} from "antd";
import { 
  SearchOutlined, EyeOutlined, EditOutlined, DeleteOutlined, 
  PlusOutlined, CheckCircleOutlined, CloseCircleOutlined, 
  SendOutlined 
} from "@ant-design/icons";
import NewsApi from "../../../vn.fpt.edu.api/News";
import AddNewsModal from "./AddNewsModal";
import ViewNewsModal from "./ViewNewsModal";
import EditNewsModal from "./EditNewsModal";
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
      
      setTotal(total); // Use server-side total
      setNews(normalized);
    } catch (e) {
      console.error("Error fetching news:", e);
      message.error(`Unable to load news: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters.search, filters.status]);

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

  const openView = (record) => {
    setSelectedNews(record);
    setViewModalVisible(true);
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
      fetchNews();
    } catch (e) {
      console.error("Error rejecting news:", e);
      message.error(`Failed to reject news: ${e.response?.data?.message ?? e.message}`);
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
          // - Rejected: View, Edit, Delete
          const showEdit = isStaff && (status === "draft" || status === "pending" || status === "rejected");
          // Delete: Chỉ role 6 mới được xóa, và chỉ xóa được khi status là draft, pending, published hoặc rejected
          const showDelete = isStaffRole6 && (status === "draft" || status === "pending" || status === "published" || status === "rejected");
          // Submit: chỉ người tạo (role 6) mới được submit khi status là draft
          const canSubmit = isStaffRole6 && status === "draft" && isOwner;
          
          // Điều kiện cho Head:
          // - Pending: Approve, Reject
          const canApprove = isHead && status === "pending";
          const canReject = isHead && status === "pending";

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
              
              {/* Edit Button - Luôn hiện, disabled khi không có chức năng */}
              <Tooltip title={showEdit ? "Edit News" : "Cannot edit this news"}>
                {showEdit ? (
                  <Button 
                    size="small" 
                    icon={<EditOutlined />} 
                    onClick={() => openEdit(record)}
                    style={{ minWidth: 32 }}
                  />
                ) : (
                  <Button 
                    size="small" 
                    icon={<EditOutlined />} 
                    disabled
                    style={{ minWidth: 32 }}
                  />
                )}
              </Tooltip>
              
              {/* Delete Button - Luôn hiện, disabled khi không có chức năng */}
              <Tooltip title={showDelete ? "Delete News" : "Cannot delete this news"}>
                {showDelete ? (
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
                ) : (
                  <Button 
                    size="small" 
                    icon={<DeleteOutlined />} 
                    danger
                    disabled
                    style={{ minWidth: 32 }}
                  />
                )}
              </Tooltip>
              
              {/* Submit Button - Hiện ở tất cả các dòng, chỉ enable khi có thể submit */}
              {isStaffRole6 && (
                <Tooltip title={
                  canSubmit 
                    ? "Submit for Review" 
                    : status !== "draft" 
                      ? "Only draft news can be submitted" 
                      : !isOwner 
                        ? "You can only submit your own news" 
                        : "Cannot submit this news"
                }>
                  {canSubmit ? (
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
                  ) : (
                    <Button 
                      size="small" 
                      icon={<SendOutlined />} 
                      type="default"
                      disabled
                      style={{ 
                        minWidth: 36,
                        height: 28
                      }}
                    />
                  )}
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
                <Popconfirm
                  title="Reject this news?"
                  description="Please provide a review comment explaining why this news is rejected."
                  onConfirm={() => {
                    Modal.confirm({
                      title: "Reject News",
                      content: (
                        <Input.TextArea
                          placeholder="Enter review comment..."
                          rows={4}
                          id="reject-comment-input"
                        />
                      ),
                      onOk: () => {
                        const comment = document.getElementById("reject-comment-input").value;
                        if (!comment || !comment.trim()) {
                          message.error("Review comment is required");
                          return Promise.reject();
                        }
                        return handleReject(record, comment);
                      },
                    });
                  }}
                  okText="Reject"
                  cancelText="Cancel"
                  okButtonProps={{ danger: true }}
                >
                  <Tooltip title="Reject">
                    <Button 
                      size="small" 
                      icon={<CloseCircleOutlined />} 
                      danger
                      style={{ minWidth: 32 }}
                    />
                  </Tooltip>
                </Popconfirm>
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
        news={selectedNews}
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
    </>
  );
}

