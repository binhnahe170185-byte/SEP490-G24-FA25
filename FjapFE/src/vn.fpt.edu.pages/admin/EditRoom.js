import React, { useState, useEffect } from "react";
import { Card, Form, Input, Button, message, Space, Typography, Row, Col, Select } from "antd";
import { SaveOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import RoomApi from "../../vn.fpt.edu.api/Room";

const { Title } = Typography;

const STATUS_OPTIONS = [
  { label: "Active", value: "Active" },
  { label: "Inactive", value: "Inactive" },
];

export default function EditRoom() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [room, setRoom] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Get room ID from location state
    const roomId = location?.state?.roomId;
    if (roomId) {
      fetchRoom(roomId);
    } else {
      message.error("Room ID not provided");
      navigate("/staffOfAdmin", { state: { activeTab: "rooms:list" } });
    }
  }, [location]);

  const fetchRoom = async (roomId) => {
    try {
      setLoading(true);
      const response = await RoomApi.getRoomById(roomId);
      if (response) {
        const roomData = response.data || response;
        setRoom(roomData);
        form.setFieldsValue({
          roomName: roomData.roomName,
          status: roomData.status || "Active",
        });
      }
    } catch (error) {
      console.error("Error fetching room:", error);
      message.error("Failed to load room data");
      navigate("/staffOfAdmin", { state: { activeTab: "rooms:list" } });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload = {
        roomName: values.roomName.trim(),
        status: values.status || "Active",
      };

      const roomId = room?.roomId || room?.id;
      await RoomApi.updateRoom(roomId, payload);
      message.success("Room updated successfully");
      
      // Navigate back to room list
      navigate("/staffOfAdmin", { state: { activeTab: "rooms:list" } });
    } catch (error) {
      console.error("Error updating room:", error);
      const errorMessage = error?.response?.data?.message || "Failed to update room";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/staffOfAdmin", { state: { activeTab: "rooms:list" } });
  };

  return (
    <Card style={{ borderRadius: 12, boxShadow: "0 6px 18px rgba(0,0,0,0.06)" }}>
      <div style={{ marginBottom: 24 }}>
        <Row align="middle" justify="space-between" gutter={16}>
          <Col>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={handleCancel}
            >
              Back to Room List
            </Button>
          </Col>
          <Col flex={1}>
            <div style={{ textAlign: "center" }}>
              <Title level={3} style={{ margin: 0 }}>Edit Room</Title>
            </div>
          </Col>
          <Col style={{ visibility: "hidden" }}>
            {/* spacer to balance header layout */}
            <Button icon={<ArrowLeftOutlined />} />
          </Col>
        </Row>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px" }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label={<strong>Room Name</strong>}
                name="roomName"
                rules={[
                  { required: true, message: "Please enter room name" },
                  { min: 2, message: "Room name must be at least 2 characters" },
                  { max: 100, message: "Room name must not exceed 100 characters" }
                ]}
              >
                <Input placeholder="e.g., Room 101, Lab A, Conference Hall" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label={<strong>Status</strong>}
                name="status"
                rules={[{ required: true, message: "Please select status" }]}
              >
                <Select placeholder="Select status">
                  {STATUS_OPTIONS.map(opt => (
                    <Select.Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
              <Button onClick={handleCancel} size="large">
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                icon={<SaveOutlined />}
                loading={loading}
                size="large"
              >
                Update Room
              </Button>
            </div>
          </Form.Item>
        </Form>
      </div>
    </Card>
  );
}

