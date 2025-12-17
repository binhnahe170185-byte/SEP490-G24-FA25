import React, { useState, useEffect } from 'react';
import { api } from '../../../../vn.fpt.edu.api/http';
import {
  Card,
  Form,
  Select,
  Typography,
  Space,
  Alert,
  Tag,
} from 'antd';
import { BookOutlined, UserOutlined } from '@ant-design/icons';
import '../CreateSchedule.css';

// Helper function to get email username (part before @)
const getEmailUsername = (email) => {
  if (!email) return '';
  const atIndex = email.indexOf('@');
  return atIndex > 0 ? email.substring(0, atIndex) : email;
};

const LecturerSelector = ({
  lecturerId,
  lecturerCode,
  onLecturerChange,
  subjectCode,
  subjectName
}) => {
  const [lecturers, setLecturers] = useState([]);
  const [loadingLecturers, setLoadingLecturers] = useState(true);
  const [lecturerError, setLecturerError] = useState(null);

  useEffect(() => {
    const fetchLecturers = async () => {
      try {
        setLoadingLecturers(true);
        setLecturerError(null);
        const response = await api.get('/api/Lecturers');
        const data = response.data?.data || [];

        const mappedLecturers = data.map(lecturer => ({
          value: String(lecturer.lecturerId),
          label: lecturer.email ? getEmailUsername(lecturer.email) : lecturer.lecturerCode,
          lecturerCode: lecturer.lecturerCode,
          email: lecturer.email
        }));

        setLecturers(mappedLecturers);
      } catch (err) {
        console.error('Failed to fetch lecturers:', err);
        setLecturerError('Failed to load lecturers. Please try again.');
      } finally {
        setLoadingLecturers(false);
      }
    };

    fetchLecturers();
  }, []);

  return (
    <Card
      title={<Typography.Text strong>Assign Lecturer</Typography.Text>}
      className="create-schedule-card"
    >
      <Form layout="vertical">
        <Space
          direction="vertical"
          size="middle"
          style={{ width: '100%' }}
        >


          <Form.Item
            label="Choose lecturer"
            style={{ minWidth: 220 }}
            className="create-schedule-form-item"
          >
            <Select
              id="lecturer_id"
              value={lecturerId || undefined}
              onChange={(value) => {
                if (!value) {
                  onLecturerChange('', '', '');
                  return;
                }
                const selected = lecturers.find(l => l.value === value);
                onLecturerChange(value, selected?.lecturerCode || '', selected?.email || '');
              }}
              placeholder="Lecturer"
              loading={loadingLecturers}
              options={lecturers}
              showSearch
              optionFilterProp="label"
              allowClear
              suffixIcon={<UserOutlined />}
            />
            {lecturerError && (
              <Alert
                message={lecturerError}
                type="error"
                showIcon
                style={{ marginTop: 8 }}
              />
            )}
            {lecturerId && !lecturerError && (
              <Tag icon={<UserOutlined />} color="blue" style={{ marginTop: 8 }}>
                {(() => {
                  const selectedLecturer = lecturers.find(l => l.value === lecturerId);
                  return selectedLecturer?.email
                    ? getEmailUsername(selectedLecturer.email)
                    : lecturerCode || '';
                })()}
              </Tag>
            )}
          </Form.Item>
        </Space>
      </Form>
    </Card>
  );
};

export default LecturerSelector;

