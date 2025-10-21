import React from "react";
import { Card, Progress, Tag, Button, Space, Statistic, Row, Col } from "antd";
import { 
  EyeOutlined, 
  EditOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  TrophyOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

export default function CourseCard({ course, managerId, onRefresh }) {
  const navigate = useNavigate();

  const getStatusColor = () => {
    if (course.completionPercent === 100) return "success";
    if (course.completionPercent > 0) return "processing";
    return "default";
  };

  const getStatusIcon = () => {
    if (course.completionPercent === 100) return <CheckCircleOutlined />;
    return <ClockCircleOutlined />;
  };

  return (
    <Card
      hoverable
      style={{ 
        height: "100%",
        border: "1px solid #e8e8e8",
        borderRadius: 8,
      }}
      bodyStyle={{ padding: 20 }}
    >
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#1890ff" }}>
              {course.courseCode}
            </h3>
            <p style={{ margin: "4px 0 0 0", fontSize: 14, color: "#262626" }}>
              {course.courseName}
            </p>
          </div>
          <Tag color={getStatusColor()} icon={getStatusIcon()}>
            {course.status}
          </Tag>
        </div>
        
        <Space size={16} style={{ fontSize: 13, color: "#595959" }}>
          <span>📚 {course.className}</span>
          <span>📅 {course.semester}</span>
        </Space>
      </div>

      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Statistic
            title="Students"
            value={course.students}
            prefix={<UserOutlined />}
            valueStyle={{ fontSize: 18 }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Average"
            value={course.average}
            precision={1}
            prefix={<TrophyOutlined />}
            valueStyle={{ fontSize: 18, color: '#1890ff' }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Passed"
            value={course.passed}
            suffix={`/${course.students}`}
            valueStyle={{ fontSize: 18, color: '#52c41a' }}
          />
        </Col>
      </Row>

      {/* Progress */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Grading Progress</span>
          <span style={{ fontSize: 13, color: "#595959" }}>
            {course.gradingProgress}/{course.gradingTotal}
          </span>
        </div>
        <Progress 
          percent={course.gradingPercent} 
          status={course.gradingPercent === 100 ? "success" : "active"}
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#87d068',
          }}
        />
      </div>

      {/* Results Summary */}
      <div style={{ 
        backgroundColor: "#f5f5f5", 
        padding: 12, 
        borderRadius: 6,
        marginBottom: 16 
      }}>
        <Space size={24} style={{ width: "100%", justifyContent: "space-around" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: "#52c41a" }}>
              {course.passed}
            </div>
            <div style={{ fontSize: 12, color: "#595959" }}>Passed</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: "#ff4d4f" }}>
              {course.failed}
            </div>
            <div style={{ fontSize: 12, color: "#595959" }}>Failed</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: "#faad14" }}>
              {course.incomplete}
            </div>
            <div style={{ fontSize: 12, color: "#595959" }}>Incomplete</div>
          </div>
        </Space>
      </div>

      {/* Actions */}
      <Space style={{ width: "100%" }}>
        <Button 
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/manager/grades/${course.courseId}`, {
            state: { course }
          })}
          style={{ flex: 1 }}
        >
          View Details
        </Button>
        <Button 
          icon={<EditOutlined />}
          onClick={() => navigate(`/manager/grades/enter/${course.courseId}`, {
            state: { course }
          })}
        >
          Enter Grades
        </Button>
      </Space>
    </Card>
  );
}