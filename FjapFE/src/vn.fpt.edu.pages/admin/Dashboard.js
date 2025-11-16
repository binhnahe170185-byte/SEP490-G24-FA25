import React, { useEffect, useState } from "react";
import { Card, Col, Row, Typography, List, Button, Space } from "antd";
import AdminApi from "../../vn.fpt.edu.api/Admin";
import { UserOutlined, ApartmentOutlined, ReadOutlined, AlertOutlined } from "@ant-design/icons";
import StatCard from "./StatCard";

const { Title, Text } = Typography;

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDepartments: 0,
    totalSemesters: 0,
    systemAlerts: 0,
    usersByRole: [],
  });

  useEffect(() => {
    let mounted = true;
    AdminApi.getDashboard()
      .then((data) => {
        if (mounted) setStats(data || {});
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 6, height: 22, borderRadius: 2, background: "#ff6600" }} />
        <Title level={4} style={{ margin: 0 }}>Dashboard</Title>
      </div>
      <Text style={{ display: "block", marginBottom: 16, color: "#64748b" }}>
        Displays key statistics such as number of users, departments, semesters, and system alerts.
      </Text>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} lg={6}>
          <StatCard
            title="Total Users"
            value={stats.totalUsers || 0}
            icon={<UserOutlined />}
            variant="primary"
          />
        </Col>
        <Col xs={24} md={12} lg={6}>
          <StatCard
            title="Departments"
            value={stats.totalDepartments || 0}
            icon={<ApartmentOutlined />}
            variant="secondary"
          />
        </Col>
        <Col xs={24} md={12} lg={6}>
          <StatCard
            title="Semesters"
            value={stats.totalSemesters || 0}
            icon={<ReadOutlined />}
            variant="secondary"
          />
        </Col>
        <Col xs={24} md={12} lg={6}>
          <StatCard
            title="System Alerts"
            value={stats.systemAlerts || 0}
            icon={<AlertOutlined />}
            variant="neutral"
          />
        </Col>
      </Row>

      <div style={{ marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ width: 6, height: 22, borderRadius: 2, background: "#e2e8f0" }} />
          <Title level={5} style={{ margin: 0 }}>User Distribution by Role</Title>
        </div>
        <Row gutter={[16, 16]}>
          {(stats.usersByRole || []).map((r) => (
            <Col xs={24} sm={12} md={8} lg={6} key={r.roleId}>
              <StatCard
                title={`Role ${r.roleId}`}
                value={r.count}
                icon={<UserOutlined />}
                variant="neutral"
              />
            </Col>
          ))}
        </Row>
      </div>

    </div>
  );
}


