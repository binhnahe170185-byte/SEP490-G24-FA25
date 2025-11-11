import React, { useState } from "react";
import { Card, Form, Input, Button, message, Space, Typography, Row, Col, Select, Modal } from "antd";
import { SaveOutlined, ArrowLeftOutlined, CheckCircleTwoTone, CloseCircleTwoTone } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import RoomApi from "../../../vn.fpt.edu.api/Room";

const { Title } = Typography;

const STATUS_OPTIONS = [
  { label: "Active", value: "Active" },
  { label: "Inactive", value: "Inactive" },
];

export default function AddRoom() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successInfo, setSuccessInfo] = useState({ roomName: "", roomId: null });
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorText, setErrorText] = useState("");

  // Validate duplicate room name
  const validateRoomName = async (_, value) => {
    if (!value || !value.trim()) {
      return Promise.resolve();
    }

    const roomName = value.trim();
    
    try {
      const response = await RoomApi.getRooms({ search: roomName, pageSize: 100 });
      const rooms = response?.items || [];
      
      // Check if any room has the same name (case-insensitive)
      const duplicate = rooms.some(
        room => room.roomName?.trim().toLowerCase() === roomName.toLowerCase()
      );
      
      if (duplicate) {
        return Promise.reject(new Error(`Room name "${roomName}" already exists`));
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error("Error validating room name:", error);
      // Don't block submission if validation check fails
      return Promise.resolve();
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

      const response = await RoomApi.createRoom(payload);
      
      // If we reach here, API call succeeded (no exception thrown)
      const roomData = response?.data || response;
      const roomId = roomData?.roomId || roomData?.id;
      const roomName = payload.roomName;
      
      setSuccessInfo({ roomName, roomId });
      setSuccessModalOpen(true);
      
      // Set loading to false after showing modal
      setLoading(false);
      
      // Reset form after success
      setTimeout(() => {
        form.resetFields();
        form.setFieldsValue({ status: "Active" });
      }, 500);
    } catch (error) {
      console.error("Error creating room:", error);
      
      // Handle validation errors
      if (error?.errorFields) {
        // Form validation errors are already shown by Ant Design
        setLoading(false);
        return;
      }
      
      // Extract error message
      let errorMessage = "Failed to create room. Please try again.";
      
      if (error?.response?.data) {
        const errorData = error.response.data;
        errorMessage = errorData.message || errorData.error || errorMessage;
        
        // Handle specific error messages
        const errorLower = errorMessage.toLowerCase();
        if (errorLower.includes("room name") && (errorLower.includes("exist") || errorLower.includes("already"))) {
          errorMessage = "Room name already exists in the system";
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      // Show error modal
      setErrorText(errorMessage);
      setErrorModalOpen(true);
      
      // Set loading to false after showing modal
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/staffOfAdmin", { state: { activeTab: "rooms:list" } });
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
                Back to Room List
              </Button>
            </Col>
            <Col flex={1}>
              <div style={{ textAlign: "center" }}>
                <Title level={3} style={{ margin: 0 }}>Add New Room</Title>
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
            initialValues={{
              status: "Active"
            }}
          >
            <Form.Item
              label={<strong>Room Name</strong>}
              name="roomName"
              rules={[
                { required: true, message: "Please enter room name" },
                { min: 2, message: "Room name must be at least 2 characters" },
                { max: 100, message: "Room name must not exceed 100 characters" },
                { validator: validateRoomName }
              ]}
              validateTrigger="onBlur"
              style={{ marginBottom: 16 }}
            >
              <Input 
                placeholder="e.g., Room 101, Lab A, Conference Hall"
                onBlur={() => {
                  // Trigger validation on blur
                  form.validateFields(['roomName']);
                }}
              />
            </Form.Item>

            <Form.Item
              label={<strong>Status</strong>}
              name="status"
              rules={[{ required: true, message: "Please select status" }]}
              style={{ marginBottom: 24 }}
            >
              <Select placeholder="Select status">
                {STATUS_OPTIONS.map(opt => (
                  <Select.Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
              <Space style={{ width: "100%", justifyContent: "flex-end" }}>
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
                  Create Room
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </div>
      </Card>

      {/* Success Modal */}
      <Modal
        open={successModalOpen}
        centered
        title={
          <span>
            <CheckCircleTwoTone twoToneColor="#52c41a" /> 
            <span style={{ marginLeft: 8 }}>Room created successfully</span>
          </span>
        }
        onOk={() => {
          setSuccessModalOpen(false);
          navigate("/staffOfAdmin", { state: { activeTab: "rooms:list" } });
        }}
        onCancel={() => {
          setSuccessModalOpen(false);
          form.resetFields();
          form.setFieldsValue({ status: "Active" });
        }}
        okText="Back to room list"
        cancelText="Continue adding"
      >
        <div style={{ marginTop: 4, lineHeight: 1.8 }}>
          {successInfo?.roomName && (
            <div>
              Room Name: <strong>{successInfo.roomName}</strong>
            </div>
          )}
          {successInfo?.roomId && (
            <div>
              Room ID: <strong>{successInfo.roomId}</strong>
            </div>
          )}
        </div>
      </Modal>

      {/* Error Modal */}
      <Modal
        open={errorModalOpen}
        centered
        title={
          <span>
            <CloseCircleTwoTone twoToneColor="#ff4d4f" /> 
            <span style={{ marginLeft: 8 }}>Failed to create room</span>
          </span>
        }
        onOk={() => {
          setErrorModalOpen(false);
          navigate("/staffOfAdmin", { state: { activeTab: "rooms:list" } });
        }}
        onCancel={() => setErrorModalOpen(false)}
        okText="Back to room list"
        cancelText="Back to form"
      >
        <div style={{ marginTop: 4, lineHeight: 1.8 }}>
          <div style={{ marginBottom: 8 }}>{errorText}</div>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>
            Please check inputs and try again.
          </div>
        </div>
      </Modal>
    </div>
  );
}

