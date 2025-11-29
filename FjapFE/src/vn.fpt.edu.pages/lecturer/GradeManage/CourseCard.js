import React from "react";
import { Card, Progress, Tag, Button } from "antd";
import { 
  EyeOutlined, 
  EditOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined
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