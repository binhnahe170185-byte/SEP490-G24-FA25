import React, { useState, useEffect } from 'react';
import { api } from '../../../../vn.fpt.edu.api/http';
import SubjectList from '../../../../vn.fpt.edu.api/SubjectList';
import {
  Card,
  Form,
  Select,
  Typography,
  Space,
  Alert,
  Spin,
  Tag,
} from 'antd';
import { BookOutlined, UserOutlined } from '@ant-design/icons';
import '../CreateSchedule.css';

const LecturerSelector = ({
  lecturerId,
  lecturerCode,
  onLecturerChange,
  subjectCode,
  subjectName,
  onSubjectChange
}) => {
  const [lecturers, setLecturers] = useState([]);
  const [loadingLecturers, setLoadingLecturers] = useState(true);
  const [lecturerError, setLecturerError] = useState(null);
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [subjectError, setSubjectError] = useState(null);

  useEffect(() => {
    const fetchLecturers = async () => {
      try {
        setLoadingLecturers(true);
        setLecturerError(null);
        const response = await api.get('/api/Lecturers');
        const data = response.data?.data || [];

        const mappedLecturers = data.map(lecturer => ({
          value: String(lecturer.lecturerId),
          label: lecturer.lecturerCode
        }));

        setLecturers(mappedLecturers);
      } catch (err) {
        console.error('Failed to fetch lecturers:', err);
        setLecturerError('Failed to load lecturers. Please try again.');
      } finally {
        setLoadingLecturers(false);
      }
    };

    const fetchSubjects = async () => {
      try {
        setLoadingSubjects(true);
        setSubjectError(null);
        const subjects = await SubjectList.getAllSubjectForStaffAcademic();

        if (Array.isArray(subjects)) {
          const formatted = subjects.map(subject => {
            const code = subject.subjectCode || subject.code || '';
            const name = subject.subjectName || subject.name || '';
            return {
              value: code,
              label: code && name ? `${code} - ${name}` : code || name || 'Unknown',
              subjectId: subject.subjectId || subject.id || null,
              subjectCode: code,
              subjectName: name
            };
          });
          setSubjectOptions(formatted);
        } else {
          setSubjectOptions([]);
        }
      } catch (err) {
        console.error('Failed to fetch subjects:', err);
        setSubjectError('Failed to load subjects. Please try again.');
        setSubjectOptions([]);
      } finally {
        setLoadingSubjects(false);
      }
    };

    fetchLecturers();
    fetchSubjects();
  }, []);

  const handleSubjectChange = (value) => {
    const selectedSubject = subjectOptions.find(option => option.value === value);
    if (onSubjectChange) {
      if (selectedSubject) {
        onSubjectChange(selectedSubject.subjectCode, selectedSubject.subjectName);
      } else {
        onSubjectChange('', '');
      }
    }
  };

  return (
    <Card
      title={<Typography.Text strong>Assign Subject & Lecturer</Typography.Text>}
      className="create-schedule-card"
    >
      <Form layout="vertical">
        <Space
          direction="horizontal"
          size="large"
          wrap
          className="create-schedule-space-responsive"
        >
          <Form.Item
            label="Choose subject"
            style={{ minWidth: 260 }}
            className="create-schedule-form-item"
          >
            <Select
              id="subject_code_assign"
              value={subjectCode || undefined}
              onChange={handleSubjectChange}
              placeholder="Subject Code"
              loading={loadingSubjects}
              options={subjectOptions}
              showSearch
              optionFilterProp="label"
              allowClear
              suffixIcon={loadingSubjects ? <Spin size="small" /> : <BookOutlined />}
            />
            {subjectError && (
              <Alert
                message={subjectError}
                type="error"
                showIcon
                style={{ marginTop: 8 }}
              />
            )}
            {subjectName && subjectCode && !subjectError && (
              <Tag color="green" style={{ marginTop: 8 }}>
                {subjectCode} — {subjectName}
              </Tag>
            )}
          </Form.Item>

          <Form.Item
            label="Choose lecturer"
            style={{ minWidth: 220 }}
            className="create-schedule-form-item"
          >
            <Select
              id="lecturer_id"
              value={lecturerId || undefined}
              onChange={(value) => {
                const selected = lecturers.find(l => l.value === value);
                onLecturerChange(value, selected?.label || '');
              }}
              placeholder="Lecturer Code"
              loading={loadingLecturers}
              options={lecturers}
              showSearch
              optionFilterProp="label"
              allowClear
              suffixIcon={loadingLecturers ? <Spin size="small" /> : <UserOutlined />}
            />
            {lecturerError && (
              <Alert
                message={lecturerError}
                type="error"
                showIcon
                style={{ marginTop: 8 }}
              />
            )}
            {lecturerCode && !lecturerError && (
              <Tag color="blue" style={{ marginTop: 8 }}>
                {lecturerCode}
              </Tag>
            )}
          </Form.Item>
        </Space>
      </Form>
    </Card>
  );
};

export default LecturerSelector;

