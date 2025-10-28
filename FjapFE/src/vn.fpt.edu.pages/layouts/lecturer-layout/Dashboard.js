import React, { useEffect, useMemo } from "react";
import { Card, Col, Row, Space, Typography, Button, Statistic, Badge } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  BookOutlined, 
  FileTextOutlined, 
  TeamOutlined, 
  CalendarOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  BarChartOutlined
} from "@ant-design/icons";
import CATEGORIES from "./categories";

const sectionStyle = {
  marginBottom: 40,
};

const cardStyle = {
  height: "100%",
  borderRadius: 16,
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
  border: "1px solid #f0f0f0",
  transition: "all 0.3s ease",
};

const hoverCardStyle = {
  ...cardStyle,
  transform: "translateY(-2px)",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
};

const LecturerDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.focusCategory) {
      const element = document.getElementById(
        `lecturer-cat-${location.state.focusCategory}`
      );
      if (element) {
        requestAnimationFrame(() => {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    }
  }, [location.state?.focusCategory]);

  // Mock data for statistics
  const stats = {
    totalClasses: 8,
    pendingHomework: 12,
    upcomingLessons: 5,
    totalStudents: 156
  };

  const quickActions = [
    {
      title: "Create Homework",
      description: "Assign new homework to your classes",
      icon: <PlusOutlined style={{ fontSize: 24, color: "#1890ff" }} />,
      action: () => navigate("/lecturer/homework/create"),
      color: "#1890ff"
    },
    {
      title: "View Classes",
      description: "Manage your current classes",
      icon: <TeamOutlined style={{ fontSize: 24, color: "#52c41a" }} />,
      action: () => navigate("/lecturer/classes"),
      color: "#52c41a"
    },
    {
      title: "Grade Assignments",
      description: "Review and grade student submissions",
      icon: <EditOutlined style={{ fontSize: 24, color: "#fa8c16" }} />,
      action: () => navigate("/lecturer/grades"),
      color: "#fa8c16"
    },
    {
      title: "View Schedule",
      description: "Check your upcoming lessons",
      icon: <CalendarOutlined style={{ fontSize: 24, color: "#722ed1" }} />,
      action: () => navigate("/lecturer/schedule"),
      color: "#722ed1"
    }
  ];

  const categoryCards = useMemo(
    () =>
      CATEGORIES.map((category) => (
        <section
          key={category.id}
          id={`lecturer-cat-${category.id}`}
          style={sectionStyle}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {category.title}
            </Typography.Title>
            <Button type="link" size="small">
              View All
            </Button>
          </div>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
            {category.description}
          </Typography.Paragraph>

          <Row gutter={[24, 24]}>
            {category.items.map((item, index) => (
              <Col xs={24} sm={12} lg={8} key={index}>
                <Card 
                  style={cardStyle} 
                  hoverable
                  bodyStyle={{ padding: 20 }}
                >
                  <Space direction="vertical" size={12} style={{ width: "100%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: 8, 
                        background: "#f0f9ff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        {index === 0 ? <FileTextOutlined style={{ color: "#1890ff" }} /> :
                         index === 1 ? <BookOutlined style={{ color: "#52c41a" }} /> :
                         <BarChartOutlined style={{ color: "#fa8c16" }} />}
                      </div>
                      <Typography.Text strong style={{ fontSize: 16 }}>
                        {item}
                      </Typography.Text>
                    </div>
                    <Typography.Text type="secondary" style={{ fontSize: 14 }}>
                      {index === 0
                        ? "Create and manage assignments with ease. Set deadlines, attach files, and track submissions."
                        : index === 1
                        ? "Access your class materials, lesson plans, and teaching resources in one place."
                        : "Monitor student progress, view analytics, and generate reports for better insights."}
                    </Typography.Text>
                    <Button 
                      type="text" 
                      size="small" 
                      icon={<EyeOutlined />}
                      style={{ alignSelf: "flex-start", padding: 0 }}
                    >
                      Learn more
                    </Button>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </section>
      )),
    []
  );

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Welcome Section */}
      <div style={{ marginBottom: 40 }}>
        <Typography.Title level={2} style={{ marginBottom: 8, color: "#1f2937" }}>
          Welcome back, Lecturer! 👋
        </Typography.Title>
        <Typography.Paragraph style={{ marginBottom: 32, fontSize: 16, color: "#6b7280" }}>
          Manage your classes, create assignments, and track student progress all in one place.
        </Typography.Paragraph>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[24, 24]} style={{ marginBottom: 40 }}>
        <Col xs={12} sm={6}>
          <Card style={cardStyle}>
            <Statistic
              title="Total Classes"
              value={stats.totalClasses}
              prefix={<TeamOutlined style={{ color: "#1890ff" }} />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={cardStyle}>
            <Statistic
              title="Pending Homework"
              value={stats.pendingHomework}
              prefix={<FileTextOutlined style={{ color: "#fa8c16" }} />}
              valueStyle={{ color: "#fa8c16" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={cardStyle}>
            <Statistic
              title="Upcoming Lessons"
              value={stats.upcomingLessons}
              prefix={<CalendarOutlined style={{ color: "#52c41a" }} />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={cardStyle}>
            <Statistic
              title="Total Students"
              value={stats.totalStudents}
              prefix={<TeamOutlined style={{ color: "#722ed1" }} />}
              valueStyle={{ color: "#722ed1" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <section style={sectionStyle}>
        <Typography.Title level={3} style={{ marginBottom: 16 }}>
          Quick Actions
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
          Get started with these common tasks
        </Typography.Paragraph>
        
        <Row gutter={[24, 24]}>
          {quickActions.map((action, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <Card 
                style={cardStyle} 
                hoverable
                bodyStyle={{ padding: 20, textAlign: "center" }}
                onClick={action.action}
              >
                <Space direction="vertical" size={16} style={{ width: "100%" }}>
                  <div style={{ 
                    width: 60, 
                    height: 60, 
                    borderRadius: 16, 
                    background: `${action.color}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto"
                  }}>
                    {action.icon}
                  </div>
                  <div>
                    <Typography.Text strong style={{ fontSize: 16, display: "block", marginBottom: 8 }}>
                      {action.title}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 14 }}>
                      {action.description}
                    </Typography.Text>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      {/* Category Sections */}
      {categoryCards}
    </div>
  );
};

export default LecturerDashboard;
