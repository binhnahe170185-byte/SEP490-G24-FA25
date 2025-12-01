import React, { useState } from 'react';
import { Card, Typography, Button, Upload, message, Modal, Input } from 'antd';
import { UploadOutlined, RightOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

const HomeworkSubmission = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState(null);
  
  // Hardcoded homework data for submission
  const [pendingHomeworks] = useState([
    {
      id: 1,
      title: 'PRF192 Assignment 5',
      subject: 'PRF192',
      dueDate: '2024-12-25',
      className: 'PRF192-AE1',
      description: 'Complete exercises from chapter 5'
    },
    {
      id: 3,
      title: 'Project Proposal - SWP391',
      subject: 'SWP391',
      dueDate: '2024-12-30',
      className: 'SWP391-AE1',
      description: 'Submit final project proposal'
    }
  ]);

  const handleSubmit = (homework) => {
    setSelectedHomework(homework);
    setIsModalVisible(true);
  };

  const handleModalSubmit = async () => {
    message.success('Homework submitted successfully!');
    setIsModalVisible(false);
    setSelectedHomework(null);
  };

  const handleFileChange = (info) => {
    if (info.file.status === 'done') {
      message.success(`${info.file.name} uploaded successfully`);
    } else if (info.file.status === 'error') {
      message.error(`${info.file.name} upload failed.`);
    }
  };

  return (
    <>
      <Card 
        className="function-card section-card"
        title={
          <div className="section-card-header">
            <UploadOutlined className="function-icon homework-icon" />
            <Title level={4} className="function-title">Submit Homework</Title>
          </div>
        }
      >
        <div className="section-card-content">
          {pendingHomeworks.length > 0 ? (
            pendingHomeworks.slice(0, 2).map((homework) => (
              <div key={homework.id} className="homework-item">
                <Text className="homework-title">{homework.title}</Text>
                <div className="homework-meta">
                  <span>{homework.subject} - {homework.className}</span>
                  <span>Due: {dayjs(homework.dueDate).format('DD/MM/YYYY')}</span>
                </div>
                <Button 
                  type="primary" 
                  size="small" 
                  style={{ marginTop: 8 }}
                  onClick={() => handleSubmit(homework)}
                >
                  Submit
                </Button>
              </div>
            ))
          ) : (
            <Text style={{ color: '#999' }}>No homework to submit</Text>
          )}
        </div>
        <Button 
          type="default" 
          icon={<RightOutlined />}
          className="function-button"
          onClick={() => message.info('Feature under development')}
          style={{ marginTop: 16 }}
        >
          View All Pending Homework
        </Button>
      </Card>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileTextOutlined />
            <span>Submit Homework: {selectedHomework?.title}</span>
          </div>
        }
        open={isModalVisible}
        onOk={handleModalSubmit}
        onCancel={() => {
          setIsModalVisible(false);
          setSelectedHomework(null);
        }}
        okText="Submit"
        cancelText="Cancel"
        width={600}
      >
        {selectedHomework && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>Subject: </Text>
              <Text>{selectedHomework.subject} - {selectedHomework.className}</Text>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>Due Date: </Text>
              <Text>{dayjs(selectedHomework.dueDate).format('DD/MM/YYYY')}</Text>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>Description: </Text>
              <Text>{selectedHomework.description}</Text>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <Text strong>Upload File: </Text>
              <Upload
                action="https://www.mocky.io/v2/5cc8019d300000980a055e76"
                onChange={handleFileChange}
                multiple
              >
                <Button icon={<UploadOutlined />}>Select File</Button>
              </Upload>
            </div>

            <div>
              <Text strong>Notes (optional): </Text>
              <TextArea 
                rows={4} 
                placeholder="Enter notes for lecturer..."
                style={{ marginTop: 8 }}
              />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default HomeworkSubmission;

