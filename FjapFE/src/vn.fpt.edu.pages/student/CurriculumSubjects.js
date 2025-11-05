import React, { useState, useEffect, useCallback } from "react";
import { Table, Card, Typography, Spin, message, Tag, Descriptions, Button, Modal, Badge, Input, Space } from "antd";
import { EyeOutlined, FileTextOutlined, SearchOutlined } from "@ant-design/icons";
import StudentGrades from "../../vn.fpt.edu.api/StudentGrades";

const { Title, Text } = Typography;
const { Search } = Input;

export default function CurriculumSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const loadCurriculumSubjects = useCallback(async (searchTerm = "", page = 1, pageSize = 20) => {
    try {
      setLoading(true);
      const response = await StudentGrades.getCurriculumSubjects(searchTerm, page, pageSize);
      setSubjects(response.items || []);
      setPagination({
        current: response.page || page,
        pageSize: response.pageSize || pageSize,
        total: response.total || 0,
      });
    } catch (error) {
      console.error("Failed to load curriculum subjects:", error);
      message.error("Failed to load curriculum subjects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurriculumSubjects(search, pagination.current, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (value) => {
    setSearch(value);
    setPagination((prev) => ({ ...prev, current: 1 }));
    loadCurriculumSubjects(value, 1, pagination.pageSize);
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

  const handleViewDetail = (record) => {
    setSelectedSubject(record);
    setDetailModalVisible(true);
  };

  const handleCloseModal = () => {
    setDetailModalVisible(false);
    setSelectedSubject(null);
  };

  const columns = [
    {
      title: "STT",
      dataIndex: "stt",
      key: "stt",
      width: 80,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Subject Code",
      dataIndex: "subjectCode",
      key: "subjectCode",
      width: 150,
    },
    {
      title: "Subject Name",
      dataIndex: "subjectName",
      key: "subjectName",
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
      width: 150,
      align: "center",
      render: (_, record) => {
        const materialsCount = record.materials?.length || 0;
        return (
          <Badge count={materialsCount} showZero>
            <Button
              type={materialsCount > 0 ? "default" : "dashed"}
              icon={<FileTextOutlined />}
              disabled={materialsCount === 0}
            >
              {materialsCount > 0 ? `${materialsCount} file(s)` : "No files"}
            </Button>
          </Badge>
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
    <div style={{ padding: "24px" }}>
      <Card style={{ borderRadius: 12 }}>
        <Space direction="vertical" style={{ width: "100%" }} size="large">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Title level={2} style={{ margin: 0 }}>
              Subjects and Materials
            </Title>
            <Search
              placeholder="Search by subject code, name, or description"
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              style={{ width: 400 }}
              onSearch={handleSearch}
              onChange={(e) => {
                if (!e.target.value) {
                  handleSearch("");
                }
              }}
            />
          </div>
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

            <Title level={5} style={{ marginBottom: 16 }}>
              Materials
            </Title>
            {selectedSubject.materials &&
            selectedSubject.materials.length > 0 ? (
              <Table
                dataSource={selectedSubject.materials}
                rowKey="materialId"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: "Title",
                    dataIndex: "title",
                    key: "title",
                  },
                  {
                    title: "Description",
                    dataIndex: "description",
                    key: "description",
                    render: (desc) => desc || "N/A",
                  },
                  {
                    title: "Action",
                    key: "action",
                    align: "center",
                    render: (_, record) => (
                      <Button
                        type="link"
                        onClick={() => window.open(record.fileUrl, "_blank")}
                      >
                        Download
                      </Button>
                    ),
                  },
                ]}
              />
            ) : (
              <Text type="secondary">No materials available</Text>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

