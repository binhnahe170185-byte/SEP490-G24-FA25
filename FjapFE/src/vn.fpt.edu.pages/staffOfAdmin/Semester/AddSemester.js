import React, { useState } from "react";
import { Card, Form, DatePicker, Input, Button, message, Space, Typography, Row, Col } from "antd";
import { SaveOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import SemesterApi from "../../../vn.fpt.edu.api/Semester";
import dayjs from "dayjs";

const { Title } = Typography;

export default function AddSemester() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload = {
        name: values.name.trim(),
        startDate: values.startDate.format("YYYY-MM-DD"),
        endDate: values.endDate.format("YYYY-MM-DD"),
      };

      const response = await SemesterApi.createSemester(payload);
      message.success("Semester created successfully");
      
      // Navigate back to semester list
      navigate("/staffOfAdmin", { state: { activeTab: "sem:list" } });
    } catch (error) {
      console.error("Error creating semester:", error);
      message.error("Failed to create semester");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/staffOfAdmin", { state: { activeTab: "sem:list" } });
  };

  return (
    <div style={{ width: "100%", margin: "0", padding: "0" }}>
      <Card 
        style={{ 
          borderRadius: 12, 
          boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
          width: "100%"
        }}
        bodyStyle={{ padding: "20px 0" }}
      >
        <div style={{ marginBottom: 24, padding: "0 8px" }}>
          <Row align="middle" justify="space-between" gutter={16}>
            <Col>
              <Button 
                icon={<ArrowLeftOutlined />} 
                onClick={handleCancel}
              >
                Back to Semester List
              </Button>
            </Col>
            <Col flex={1}>
              <div style={{ textAlign: "center" }}>
                <Title level={3} style={{ margin: 0 }}>Add New Semester</Title>
              </div>
            </Col>
            <Col style={{ visibility: "hidden" }}>
              <Button icon={<ArrowLeftOutlined />} />
            </Col>
          </Row>
        </div>

        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 8px" }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            size="middle"
          >
            <Form.Item
              label={<strong>Semester Name</strong>}
              name="name"
              rules={[
                { required: true, message: "Please enter semester name" },
                { min: 2, message: "Semester name must be at least 2 characters" }
              ]}
              style={{ marginBottom: 16 }}
            >
              <Input placeholder="e.g., Fall Semester 2024-2025" />
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label={<strong>Start Date</strong>}
                  name="startDate"
                  rules={[{ required: true, message: "Please select start date" }]}
                  style={{ marginBottom: 16 }}
                >
                  <DatePicker 
                    style={{ width: "100%" }} 
                    format="DD/MM/YYYY"
                    placeholder="Select start date"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label={<strong>End Date</strong>}
                  name="endDate"
                  rules={[{ required: true, message: "Please select end date" }]}
                  style={{ marginBottom: 16 }}
                >
                  <DatePicker 
                    style={{ width: "100%" }} 
                    format="DD/MM/YYYY"
                    placeholder="Select end date"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
              <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  icon={<SaveOutlined />}
                  loading={loading}
                  size="middle"
                  style={{ minWidth: 140 }}
                >
                  Create Semester
                </Button>
                <Button 
                  onClick={handleCancel}
                  size="middle"
                  style={{ minWidth: 140 }}
                >
                  Cancel
                </Button>
              </div>
            </Form.Item>
          </Form>
        </div>
      </Card>
    </div>
  );
}
