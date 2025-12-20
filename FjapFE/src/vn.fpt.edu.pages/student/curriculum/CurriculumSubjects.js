import React, { useState, useEffect, useCallback } from "react";
import { Table, Card, Typography, Spin, message, Tag, Descriptions, Button, Modal, Input, Space, Empty, Select } from "antd";
import { EyeOutlined, FileTextOutlined, SearchOutlined, LinkOutlined, FilterOutlined } from "@ant-design/icons";
import StudentGrades from "../../../vn.fpt.edu.api/StudentGrades";
import { getMaterials, getMaterialsCounts } from "../../../vn.fpt.edu.api/Material";
import { api } from "../../../vn.fpt.edu.api/http";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

// Map levelId to N1, N2, N3, N4, N5
const getLevelDisplay = (levelId, levelName) => {
  if (levelName) {
    // Nếu có levelName, kiểm tra xem có chứa N1, N2, etc không
    const match = levelName.match(/N[1-5]/i);
    if (match) return match[0].toUpperCase();
  }

  // Map levelId: 1 -> N1, 2 -> N2, 3 -> N3, 4 -> N4, 5 -> N5
  if (levelId >= 1 && levelId <= 5) {
    return `N${levelId}`;
  }

  return levelName || `N${levelId}` || "N/A";
};

export default function CurriculumSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [materialModalVisible, setMaterialModalVisible] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [selectedSubjectForMaterials, setSelectedSubjectForMaterials] = useState(null);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [materialsCountMap, setMaterialsCountMap] = useState({}); // Cache materials count để disable button nếu không có materials
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const loadCurriculumSubjects = useCallback(async (searchTerm = "", page = 1, pageSize = 20) => {
    try {
      setLoading(true);
      const response = await StudentGrades.getCurriculumSubjects(searchTerm, page, pageSize);
      let subjectsList = response.items || [];

      // Fetch all subjects with level information in one call
      let allSubjectsMap = {};
      try {
        const allSubjectsResponse = await api.get("/api/manager/subjects");
        const allSubjects = allSubjectsResponse?.data?.data || allSubjectsResponse?.data || [];
        if (Array.isArray(allSubjects)) {
          allSubjects.forEach(subj => {
            allSubjectsMap[subj.subjectId] = {
              levelId: subj.levelId || null,
              levelName: subj.level?.levelName || subj.levelName || null,
            };
          });
        }
      } catch (error) {
        console.error("Failed to load all subjects for level mapping:", error);
      }

      // Map level information to curriculum subjects
      const subjectsWithLevel = subjectsList.map(subject => ({
        ...subject,
        levelId: allSubjectsMap[subject.subjectId]?.levelId || null,
        levelName: allSubjectsMap[subject.subjectId]?.levelName || null,
      }));

      // Apply level filter if selected
      let filteredSubjects = subjectsWithLevel;
      if (levelFilter) {
        filteredSubjects = subjectsWithLevel.filter(subject => {
          const levelDisplay = getLevelDisplay(subject.levelId, subject.levelName);
          return levelDisplay === levelFilter;
        });
      }

      setSubjects(filteredSubjects);
      setPagination({
        current: response.page || page,
        pageSize: response.pageSize || pageSize,
        total: response.total || 0,
      });

      // Load materials counts cho tất cả subjects trong 1 API call
      if (filteredSubjects.length > 0) {
        try {
          const subjectCodes = filteredSubjects.map(s => s.subjectCode).filter(Boolean);
          if (subjectCodes.length > 0) {
            const counts = await getMaterialsCounts(subjectCodes, "active");
            setMaterialsCountMap(counts);
          }
        } catch (error) {
          console.error("Failed to load materials counts:", error);
          // Không hiển thị error message vì đây không phải lỗi nghiêm trọng
        }
      }
    } catch (error) {
      console.error("Failed to load curriculum subjects:", error);
      message.error("Failed to load curriculum subjects");
    } finally {
      setLoading(false);
    }
  }, [levelFilter]);

  useEffect(() => {
    loadCurriculumSubjects(search, pagination.current, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelFilter]);

  const handleSearch = (value) => {
    setSearch(value);
    setPagination((prev) => ({ ...prev, current: 1 }));
    loadCurriculumSubjects(value, 1, pagination.pageSize);
  };

  const handleLevelFilterChange = (value) => {
    setLevelFilter(value);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleTableChange = (newPagination) => {
    setPagination((prev) => ({
      ...prev,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    }));
    loadCurriculumSubjects(search, newPagination.current, newPagination.pageSize);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "green";
      case "inactive":
        return "default";
      case "completed":
      case "passed":
        return "green";
      case "in progress":
        return "blue";
      case "failed":
        return "red";
      case "not started":
        return "default";
      default:
        return "default";
    }
  };

  const getLevelColor = (levelDisplay) => {
    const levelColors = {
      "N1": "purple",
      "N2": "blue",
      "N3": "cyan",
      "N4": "green",
      "N5": "orange",
    };
    return levelColors[levelDisplay] || "default";
  };

  const handleViewDetail = (record) => {
    setSelectedSubject(record);
    setDetailModalVisible(true);
  };

  const handleCloseModal = () => {
    setDetailModalVisible(false);
    setSelectedSubject(null);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      return dayjs(dateStr).format("DD/MM/YYYY HH:mm");
    } catch {
      return dateStr;
    }
  };

  const handleViewMaterials = async (record) => {
    // Nếu đã check và không có materials, không làm gì
    const materialsCount = materialsCountMap[record.subjectCode];
    if (materialsCount !== undefined && materialsCount === 0) {
      return;
    }

    setSelectedSubjectForMaterials({
      subjectCode: record.subjectCode,
      subjectName: record.subjectName,
    });
    setMaterialModalVisible(true);
    setLoadingMaterials(true);

    try {
      // Fetch materials từ API theo subjectCode và status=active
      const response = await getMaterials({
        subject: record.subjectCode,
        status: "active"
      });

      const materials = response.items || [];
      // Sắp xếp materials mới nhất trước
      const sortedMaterials = [...materials].sort((a, b) => {
        const dateA = a.createdAt || a.createdDate || a.created || null;
        const dateB = b.createdAt || b.createdDate || b.created || null;
        const timeA = dateA ? new Date(dateA).getTime() : 0;
        const timeB = dateB ? new Date(dateB).getTime() : 0;
        return timeB - timeA; // DESC - mới nhất trước
      });

      // Cache materials count
      const count = sortedMaterials.length;
      setMaterialsCountMap(prev => ({
        ...prev,
        [record.subjectCode]: count
      }));

      setSelectedMaterials(sortedMaterials);
    } catch (error) {
      console.error("Failed to load materials:", error);
      message.error("Failed to load materials");
      setSelectedMaterials([]);
      // Cache count = 0 nếu có lỗi
      setMaterialsCountMap(prev => ({
        ...prev,
        [record.subjectCode]: 0
      }));
    } finally {
      setLoadingMaterials(false);
    }
  };

  const handleCloseMaterialModal = () => {
    setMaterialModalVisible(false);
    setSelectedMaterials([]);
    setSelectedSubjectForMaterials(null);
  };

  const columns = [
    {
      title: "STT",
      dataIndex: "stt",
      key: "stt",
      width: 80,
      align: "center",
      render: (_, __, index) => {
        const currentPage = pagination.current;
        const pageSize = pagination.pageSize;
        return (currentPage - 1) * pageSize + index + 1;
      },
    },
    {
      title: "Subject Code",
      dataIndex: "subjectCode",
      key: "subjectCode",
      width: 150,
      render: (code) => <Text strong>{code}</Text>,
    },
    {
      title: "Subject Name",
      dataIndex: "subjectName",
      key: "subjectName",
    },
    {
      title: "Level",
      key: "level",
      width: 100,
      align: "center",
      render: (_, record) => {
        const levelDisplay = getLevelDisplay(record.levelId, record.levelName);
        return (
          <Tag color={getLevelColor(levelDisplay)} style={{ fontSize: 13, padding: "4px 12px", fontWeight: 500 }}>
            {levelDisplay}
          </Tag>
        );
      },
    },
    {
      title: "Pass Mark",
      dataIndex: "passMark",
      key: "passMark",
      width: 120,
      align: "center",
      render: (passMark) => (
        <Text strong>{passMark != null ? passMark.toFixed(1) : "N/A"}</Text>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status || "N/A"}
        </Tag>
      ),
    },
    {
      title: "Materials",
      key: "materials",
      width: 180,
      align: "center",
      render: (_, record) => {
        const materialsCount = materialsCountMap[record.subjectCode];
        const hasMaterials = materialsCount === undefined || materialsCount > 0;

        return (
          <Button
            type={hasMaterials ? "primary" : "default"}
            icon={<FileTextOutlined />}
            onClick={() => handleViewMaterials(record)}
            disabled={!hasMaterials}
            style={{
              minWidth: 140,
              height: 32,
              borderRadius: 6,
              fontWeight: 500,
              ...(hasMaterials
                ? {
                  background: "#1890ff",
                  borderColor: "#1890ff",
                  color: "#fff"
                }
                : {
                  background: "#f5f5f5",
                  borderColor: "#d9d9d9",
                  color: "#8c8c8c",
                  cursor: "not-allowed"
                }
              )
            }}
          >
            View Materials
          </Button>
        );
      },
    },
    {
      title: "Detail",
      key: "detail",
      width: 100,
      align: "center",
      render: (_, record) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          View
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>Loading curriculum subjects...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", background: "#f0f2f5", minHeight: "100vh" }}>
      <Card
        style={{
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }} size="large">
          {/* Header Section */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Title level={2} style={{ margin: 0, color: "#1890ff" }}>
              Subjects and Materials
            </Title>
          </div>

          {/* Enhanced Search Bar */}
          <Card
            size="small"
            style={{
              border: "none",
              borderRadius: 8
            }}
          >
            <Space direction="vertical" style={{ width: "100%" }} size="middle">
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 300 }}>
                  <Search
                    placeholder="Search by subject code, name, or description..."
                    allowClear
                    enterButton={<SearchOutlined />}
                    size="large"
                    value={search}
                    onSearch={handleSearch}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      if (!e.target.value) {
                        handleSearch("");
                      }
                    }}
                    style={{
                      borderRadius: 6,
                    }}
                  />
                </div>
                <div style={{ minWidth: 150 }}>
                  <Select
                    placeholder="Filter by Level"
                    allowClear
                    size="large"
                    value={levelFilter}
                    onChange={handleLevelFilterChange}
                    style={{ width: "100%", borderRadius: 6 }}
                    suffixIcon={<FilterOutlined />}
                  >
                    <Option value="N1">N1</Option>
                    <Option value="N2">N2</Option>
                    <Option value="N3">N3</Option>
                    <Option value="N4">N4</Option>
                    <Option value="N5">N5</Option>
                  </Select>
                </div>
              </div>
            </Space>
          </Card>

          {/* Table */}
          <Table
            columns={columns}
            dataSource={subjects}
            rowKey="subjectId"
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} subjects`,
              pageSizeOptions: ["10", "20", "50", "100"],
            }}
            onChange={handleTableChange}
            style={{ background: "#fff" }}
          />
        </Space>
      </Card>

      <Modal
        title="Subject Details"
        open={detailModalVisible}
        onCancel={handleCloseModal}
        footer={[
          <Button key="close" onClick={handleCloseModal}>
            Close
          </Button>,
        ]}
        width={700}
      >
        {selectedSubject && (
          <div>
            <Descriptions bordered column={1} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="Subject Code">
                <Text strong>{selectedSubject.subjectCode}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Subject Name">
                <Text strong>{selectedSubject.subjectName}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Level">
                <Tag color={getLevelColor(getLevelDisplay(selectedSubject.levelId, selectedSubject.levelName))}>
                  {getLevelDisplay(selectedSubject.levelId, selectedSubject.levelName)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Description">
                <Text>{selectedSubject.description || "N/A"}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Pass Mark">
                <Text strong>
                  {selectedSubject.passMark != null
                    ? selectedSubject.passMark.toFixed(1)
                    : "N/A"}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Total Lesson">
                <Text strong>
                  {selectedSubject.totalLesson != null
                    ? selectedSubject.totalLesson
                    : "N/A"}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(selectedSubject.status)}>
                  {selectedSubject.status || "Not Started"}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <Title level={5} style={{ marginBottom: 16 }}>
              Grade Components
            </Title>
            {selectedSubject.gradeComponents &&
              selectedSubject.gradeComponents.length > 0 ? (
              <Table
                dataSource={selectedSubject.gradeComponents}
                rowKey={(record, index) => index}
                pagination={false}
                size="small"
                columns={[
                  {
                    title: "Component Name",
                    dataIndex: "gradeTypeName",
                    key: "gradeTypeName",
                  },
                  {
                    title: "Weight (%)",
                    dataIndex: "weight",
                    key: "weight",
                    align: "center",
                    render: (weight) => <Text strong>{weight}%</Text>,
                  },
                  {
                    title: "Max Score",
                    dataIndex: "maxScore",
                    key: "maxScore",
                    align: "center",
                    render: (maxScore) => <Text strong>{maxScore}</Text>,
                  },
                ]}
                style={{ marginBottom: 24 }}
              />
            ) : (
              <Text type="secondary" style={{ marginBottom: 24, display: "block" }}>
                No grade components configured
              </Text>
            )}
          </div>
        )}
      </Modal>

      {/* Material Detail Modal */}
      <Modal
        title={
          selectedSubjectForMaterials
            ? `Materials - ${selectedSubjectForMaterials.subjectCode} - ${selectedSubjectForMaterials.subjectName}`
            : "Materials"
        }
        open={materialModalVisible}
        onCancel={handleCloseMaterialModal}
        footer={[
          <Button key="close" onClick={handleCloseMaterialModal}>
            Close
          </Button>,
        ]}
        width={800}
      >
        {loadingMaterials ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <Spin size="large" />
            <p style={{ marginTop: 16 }}>Loading materials...</p>
          </div>
        ) : selectedMaterials && selectedMaterials.length > 0 ? (
          <Table
            dataSource={selectedMaterials}
            rowKey="materialId"
            pagination={
              selectedMaterials.length > 10
                ? {
                  pageSize: 10,
                  showSizeChanger: false,
                  showTotal: (total) => `Total ${total} materials`,
                }
                : false
            }
            size="middle"
            columns={[
              {
                title: "Title",
                dataIndex: "title",
                key: "title",
                render: (title) => <Text strong>{title || "N/A"}</Text>,
              },
              {
                title: "Description",
                dataIndex: "description",
                key: "description",
                render: (desc) => <Text>{desc || "N/A"}</Text>,
              },
              {
                title: "Created Date",
                dataIndex: "createdAt",
                key: "createdAt",
                width: 180,
                render: (date) => <Text type="secondary">{formatDate(date)}</Text>,
              },
              {
                title: "Action",
                key: "action",
                width: 140,
                align: "center",
                render: (_, record) => {
                  const fileUrl = record.fileUrl || record.filePath || null;
                  return (
                    <Button
                      type="primary"
                      icon={<LinkOutlined />}
                      onClick={() => {
                        if (fileUrl) {
                          window.open(fileUrl, "_blank");
                        } else {
                          message.warning("File URL not available");
                        }
                      }}
                    >
                      Open Drive
                    </Button>
                  );
                },
              },
            ]}
          />
        ) : (
          <Empty
            description="No materials available for this subject"
            style={{ margin: "40px 0" }}
          />
        )}
      </Modal>
    </div>
  );
}

