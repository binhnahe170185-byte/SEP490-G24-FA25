import React, { useState, useEffect } from "react";
import { Modal, List, Button, Typography, Space, message } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import FeedbackApi from "../../vn.fpt.edu.api/Feedback";

const { Title, Text } = Typography;

export default function MandatoryFeedbackModal() {
  const navigate = useNavigate();
  const [pendingClasses, setPendingClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    checkPendingFeedback();
  }, []);

  const checkPendingFeedback = async () => {
    try {
      setLoading(true);
      const classes = await FeedbackApi.getPendingFeedbackClasses();
      if (classes && classes.length > 0) {
        setPendingClasses(classes);
        setVisible(true);
      } else {
        setVisible(false);
      }
    } catch (error) {
      console.error("Failed to check pending feedback:", error);
      setVisible(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = (classId) => {
    setVisible(false);
    navigate(`/student/feedback/${classId}`);
  };

  const handleModalClose = () => {
    // Prevent closing - feedback is mandatory
    message.warning("Please submit feedback for all pending classes before continuing");
  };

  if (loading || !visible || pendingClasses.length === 0) {
    return null;
  }

  return (
    <Modal
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: "#ff4d4f", fontSize: "20px" }} />
          <Title level={4} style={{ margin: 0 }}>
            Mandatory Feedback Required
          </Title>
        </Space>
      }
      open={visible}
      closable={false}
      maskClosable={false}
      footer={null}
      width={600}
    >
      <div style={{ marginBottom: "16px" }}>
        <Text>
          You have {pendingClasses.length} class{pendingClasses.length > 1 ? "es" : ""} that require feedback before you can continue.
          Please submit feedback for all classes below.
        </Text>
      </div>

      <List
        dataSource={pendingClasses}
        renderItem={(item) => (
          <List.Item
            actions={[
              <Button
                type="primary"
                onClick={() => handleSubmitFeedback(item.classId)}
              >
                Submit Feedback
              </Button>,
            ]}
          >
            <List.Item.Meta
              title={item.className}
              description={
                <Space direction="vertical" size={0}>
                  <Text type="secondary">{item.subjectName}</Text>
                  <Text type="secondary" style={{ fontSize: "12px" }}>
                    {item.daysUntilEnd === 0
                      ? "Ends today"
                      : item.daysUntilEnd === 1
                      ? "Ends tomorrow"
                      : `Ends in ${item.daysUntilEnd} days`}
                  </Text>
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </Modal>
  );
}

