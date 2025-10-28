import React, { useState } from "react";
import { Card, Form, DatePicker, Input, Button, message, Space, Typography, Row, Col } from "antd";
import { SaveOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import SemesterApi from "../../vn.fpt.edu.api/Semester";
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
    <Card style={{ borderRadius: 12, boxShadow: "0 6px 18px rgba(0,0,0,0.06)" }}>
      <div style={{ marginBottom: 24 }}>
        <Space align="center" style={{ marginBottom: 16 }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={handleCancel}
            style={{ marginRight: 8 }}
          >
            Back to Semester List
          </Button>
          <Title level={3} style={{ margin: 0 }}>Add New Semester</Title>
        </Space>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        style={{ maxWidth: 600 }}
      >
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label="Semester Name"
              name="name"
              rules={[
                { required: true, message: "Please enter semester name" },
                { min: 2, message: "Semester name must be at least 2 characters" }
              ]}
            >
              <Input placeholder="e.g., Fall Semester 2024-2025" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Start Date"
              name="startDate"
              rules={[{ required: true, message: "Please select start date" }]}
            >
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="End Date"
              name="endDate"
              rules={[{ required: true, message: "Please select end date" }]}
            >
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Space>
            <Button 
              type="primary" 
              htmlType="submit" 
              icon={<SaveOutlined />}
              loading={loading}
            >
              Create Semester
            </Button>
            <Button onClick={handleCancel}>
              Cancel
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
