import React, { useEffect, useMemo, useState, useCallback } from "react";
import { 
  Button, Input, Space, Table, Tooltip, message, Card, Modal, 
  Select, Tag, Popconfirm 
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
      authorId: n.CreatedBy ?? n.createdBy ?? null,
      createdDate: formatDate(n.CreatedAt ?? n.createdAt),
      createdAt: n.CreatedAt ?? n.createdAt ?? null,
      updatedAt: n.UpdatedAt ?? n.updatedAt ?? null,
      reviewComment: n.ReviewComment ?? n.reviewComment ?? null,
      approvedBy: n.ApprovedBy ?? n.approvedBy ?? null,
      approvedAt: n.ApprovedAt ?? n.approvedAt ?? null,
      __raw: n,
    };
    
    // Debug log để kiểm tra data từ database
    if (process.env.NODE_ENV === 'development') {
      console.log('Raw item from API:', n);
      console.log('Normalized news item:', item);
    }
    
    return item;
  });

// Get current user role from localStorage profile or token
const getCurrentRoleId = () => {
  try {
    // Try to get from profile first (stored in localStorage by AuthContext)
    const profileStr = localStorage.getItem("profile");
    if (profileStr) {
      const profile = JSON.parse(profileStr);
      if (profile?.roleId) {
        return parseInt(profile.roleId);
      }
    }
    
    // Fallback: Try to get from token claims
    const token = localStorage.getItem("token");
    if (token) {
      // Decode JWT to get role_id
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.role_id) {
        return parseInt(payload.role_id);
      }
    }
  } catch (e) {
    console.error("Error getting role:", e);
  }
  return null;
};

export default function NewsList({ title = "News Management" }) {
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [currentRoleId, setCurrentRoleId] = useState(null);

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
    console.log("Current role ID:", roleId);
    console.log("Profile from localStorage:", localStorage.getItem("profile"));
    console.log("Token from localStorage:", localStorage.getItem("token")?.substring(0, 20) + "...");
    setCurrentRoleId(roleId);
  }, []);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        pageSize,
        ...(filters.status ? { status: filters.status } : {}),
      };
      console.log("Fetching news with params:", params);
      const response = await NewsApi.getNews(params);
      console.log("News API response:", response);
      const { total, items } = response;

      if (!items || !Array.isArray(items)) {
        console.error("Invalid response format:", response);
        message.error("Invalid data format");
        return;
      }

      console.log("Raw news items from API:", items);

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

      console.log("Filtered items:", filteredItems);
      const normalized = normalize(filteredItems);
      console.log("Normalized news:", normalized);
      
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
    if (record.status !== "draft" && record.status !== "rejected") {
      message.warning("News can only be edited when status is 'draft' or 'rejected'");
      return;
    }
    setSelectedNews(record);
    setEditModalVisible(true);
  };

  const handleDelete = async (record) => {
    try {
      await NewsApi.deleteNews(record.id);
      message.success("News deleted successfully");
      fetchNews();
    } catch (e) {
      console.error("Error deleting news:", e);
      message.error(`Failed to delete news: ${e.response?.data?.message ?? e.message}`);
    }
  };

  const handleSubmitForReview = async (record) => {
    try {
      await NewsApi.submitForReview(record.id);
      message.success("News submitted for review successfully");
      fetchNews();
    } catch (e) {
      console.error("Error submitting news:", e);
      message.error(`Failed to submit news: ${e.response?.data?.message ?? e.message}`);
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

  const isStaff = currentRoleId === 6;
  const isHead = currentRoleId === 2;
  
  // Debug log để kiểm tra role detection
  useEffect(() => {
    console.log("Role detection:", {
      currentRoleId,
      isStaff,
      isHead
    });
  }, [currentRoleId, isStaff, isHead]);

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
          const status = record.status?.toLowerCase();
          
          // Debug logs
          if (process.env.NODE_ENV === 'development') {
            console.log('Render actions for record:', {
              id: record.id,
              status: status,
              recordStatus: record.status,
              isStaff,
              isHead,
              currentRoleId
            });
          }
          
          // Điều kiện cho Staff:
          // - Draft: View, Edit, Delete, Submit
          // - Pending: View (không Edit, không Delete)
          // - Published: View (không Edit, không Delete)
          // - Rejected: View, Edit, Delete
          const showEdit = isStaff && (status === "draft" || status === "rejected");
          const showDelete = isStaff && (status === "draft" || status === "rejected");
          const canSubmit = isStaff && status === "draft";
          
          // Điều kiện cho Head:
          // - Pending: Approve, Reject
          const canApprove = isHead && status === "pending";
          const canReject = isHead && status === "pending";
          
          if (process.env.NODE_ENV === 'development') {
            console.log('Button visibility:', {
              showEdit,
              showDelete,
              canSubmit,
              canApprove,
              canReject
            });
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
              
              {/* Submit Button - Luôn hiện (chỉ khi Staff), disabled khi không có chức năng, đặt ở cuối */}
              {isStaff && (
                <Tooltip title={canSubmit ? "Submit for Review" : "Cannot submit this news"}>
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
    [isStaff, isHead]
  );

  return (
    <>
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

