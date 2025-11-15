import React from "react";
import { Card, Progress, Tag, Button, Row, Col } from "antd";
import { 
  EyeOutlined, 
  EditOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  TrophyOutlined
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";

export default function CourseCard({ course, userId, onRefresh }) {
  const navigate = useNavigate();
  const location = useLocation();
  const base = location.pathname.startsWith('/lecturer') ? '/lecturer' : '/manager';

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
        borderRadius: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        transition: "all 0.3s ease",
      }}
      bodyStyle={{ padding: 24 }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ 
              display: "inline-block", 
              padding: "4px 12px", 
              backgroundColor: "#e6f7ff", 
              borderRadius: 4,
              marginBottom: 8
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#1890ff" }}>
                {course.courseCode}
              </span>
            </div>
            <h3 style={{ 
              margin: "0 0 4px 0", 
              fontSize: 18, 
              fontWeight: 600, 
              color: "#262626",
              lineHeight: 1.4
            }}>
              {course.courseName}
            </h3>
            <p style={{ 
              margin: 0, 
              fontSize: 13, 
              color: "#8c8c8c" 
            }}>
              {course.className}
            </p>
          </div>
          <Tag 
            color={getStatusColor()} 
            icon={getStatusIcon()}
            style={{ 
              fontSize: 12,
              padding: "4px 12px",
              borderRadius: 6,
              marginLeft: 8
            }}
          >
            {course.status}
          </Tag>
        </div>
        
        <div style={{ 
          display: "flex", 
          gap: 16, 
          fontSize: 13, 
          color: "#595959",
          padding: "8px 0",
          borderTop: "1px solid #f0f0f0",
          borderBottom: "1px solid #f0f0f0"
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span>📅</span>
            <span>{course.semester}</span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span>📊</span>
            <span>{course.level}</span>
          </span>
        </div>
      </div>

      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={8}>
          <div style={{
            padding: "12px",
            backgroundColor: "#f0f9ff",
            borderRadius: 8,
            textAlign: "center"
          }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: "#1890ff", marginBottom: 4 }}>
              {course.students}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <UserOutlined /> Students
            </div>
          </div>
        </Col>
        <Col span={8}>
          <div style={{
            padding: "12px",
            backgroundColor: "#fff7e6",
            borderRadius: 8,
            textAlign: "center"
          }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: "#fa8c16", marginBottom: 4 }}>
              {course.average > 0 ? course.average.toFixed(1) : "-"}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <TrophyOutlined /> Average
            </div>
          </div>
        </Col>
        <Col span={8}>
          <div style={{
            padding: "12px",
            backgroundColor: "#f6ffed",
            borderRadius: 8,
            textAlign: "center"
          }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: "#52c41a", marginBottom: 4 }}>
              {course.passed}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <CheckCircleOutlined /> Passed
            </div>
          </div>
        </Col>
      </Row>

      {/* Progress */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#262626" }}>Grading Progress</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#1890ff" }}>
            {course.gradingProgress}/{course.gradingTotal} ({course.gradingPercent}%)
          </span>
        </div>
        <Progress 
          percent={course.gradingPercent} 
          status={course.gradingPercent === 100 ? "success" : "active"}
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#87d068',
          }}
          style={{ marginBottom: 4 }}
        />
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          fontSize: 12, 
          color: "#8c8c8c",
          marginTop: 4
        }}>
          <span>{course.completionStatus}</span>
        </div>
      </div>

      {/* Results Summary */}
      <div style={{ 
        backgroundColor: "#fafafa", 
        padding: 16, 
        borderRadius: 8,
        marginBottom: 20,
        border: "1px solid #f0f0f0"
      }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-around",
          alignItems: "center"
        }}>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ 
              fontSize: 28, 
              fontWeight: 700, 
              color: "#52c41a",
              lineHeight: 1.2,
              marginBottom: 4
            }}>
              {course.passed}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c", fontWeight: 500 }}>Passed</div>
          </div>
          <div style={{ 
            width: 1, 
            height: 40, 
            backgroundColor: "#e8e8e8" 
          }} />
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ 
              fontSize: 28, 
              fontWeight: 700, 
              color: "#ff4d4f",
              lineHeight: 1.2,
              marginBottom: 4
            }}>
              {course.failed}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c", fontWeight: 500 }}>Failed</div>
          </div>
          <div style={{ 
            width: 1, 
            height: 40, 
            backgroundColor: "#e8e8e8" 
          }} />
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ 
              fontSize: 28, 
              fontWeight: 700, 
              color: "#faad14",
              lineHeight: 1.2,
              marginBottom: 4
            }}>
              {course.incomplete}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c", fontWeight: 500 }}>Inprogress</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12 }}>
        <Button 
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => navigate(`${base}/grades/${course.courseId}`, {
            state: { course }
          })}
          style={{ flex: 1, height: 40, fontSize: 14, fontWeight: 500 }}
        >
          View Details
        </Button>
        <Button 
          icon={<EditOutlined />}
          onClick={() => navigate(`${base}/grades/enter/${course.courseId}`, {
            state: { course }
          })}
          style={{ height: 40, fontSize: 14, fontWeight: 500 }}
        >
          Enter Grades
        </Button>
      </div>
    </Card>
  );
}