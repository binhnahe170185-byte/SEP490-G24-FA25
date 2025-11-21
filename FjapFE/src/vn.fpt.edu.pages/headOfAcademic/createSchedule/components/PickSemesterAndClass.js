import React, { useState, useEffect } from 'react';
import { api } from '../../../../vn.fpt.edu.api/http';
import {
  Card,
  Form,
  Select,
  Button,
  Space,
  Typography,
  notification,
  Spin,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import '../CreateSchedule.css';

const PickSemesterAndClass = ({
  semesterId,
  classId,
  onSemesterChange,
  onClassChange,
  onLoadClass
}) => {
  const [notificationApi, contextHolder] = notification.useNotification();

  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [semesterOptions, setSemesterOptions] = useState([]);
  const [allClassesBySemester, setAllClassesBySemester] = useState({}); // { semesterId: [classes] }
  // Load semesters and classes grouped by semester from single API
  useEffect(() => {
    const fetchScheduleOptions = async () => {
      try {
        setLoadingOptions(true);
        const response = await api.get('/api/staffAcademic/classes/schedule-options');
        const data = response.data?.data || response.data;

        if (data) {
          // Format semesters
          if (data.semesters && Array.isArray(data.semesters)) {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

            const formattedSemesters = data.semesters
              .map(sem => {
                const id = sem.id || sem.semesterId;
                const name = sem.name || '';
                const startDate = sem.startDate || '';
                const endDate = sem.endDate || '';

                const label = startDate && endDate
                  ? `${name} (${startDate} → ${endDate})`
                  : name || 'Unknown Semester';

                return {
                  value: id,
                  label: label,
                  startDate: startDate,
                  endDate: endDate
                };
              })
              .filter(sem => {
                // Only show semesters that are current or future (endDate >= today)
                if (!sem.endDate) return false; // Exclude semesters without endDate
                const endDateObj = new Date(sem.endDate);
                endDateObj.setHours(0, 0, 0, 0);
                return endDateObj >= today;
              });
            setSemesterOptions(formattedSemesters);
          }

          // Store classes grouped by semester
          if (data.classesBySemester) {
            // Convert keys to numbers for easier lookup
            const grouped = {};
            Object.keys(data.classesBySemester).forEach(semId => {
              const classes = data.classesBySemester[semId];
              grouped[parseInt(semId)] = classes.map(cls => {
                const className = cls.class_name || cls.className || '';
                const subjectCode = cls.subject_code || cls.subjectCode || '';
                const label = subjectCode
                  ? `${className} - ${subjectCode}`
                  : className;
                return {
                  value: cls.class_id || cls.classId,
                  label: label
                };
              });
            });
            setAllClassesBySemester(grouped);
          }
        }
      } catch (error) {
        console.error('Failed to load schedule options:', error);
        setSemesterOptions([]);
        setAllClassesBySemester({});
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchScheduleOptions();
  }, []);


  // Get classes for selected semester
  const displayClasses = semesterId
    ? (allClassesBySemester[parseInt(semesterId)] || [])
    : [];

  const handleLoadClass = async () => {
    if (!semesterId) {
      notificationApi.error({
        message: 'Error',
        description: 'Please select a semester',
        placement: 'bottomRight',
        duration: 4,
      });
      return;
    }
    if (!classId) {
      notificationApi.error({
        message: 'Error',
        description: 'Please select a class',
        placement: 'bottomRight',
        duration: 4,
      });
      return;
    }

    try {
      setLoadingSchedule(true);
      // Gọi API schedule với semesterId và classId
      const response = await api.get('/api/staffAcademic/classes/schedule', {
        params: {
          semesterId: parseInt(semesterId),
          classId: parseInt(classId)
        }
      });

      const scheduleData = response.data?.data || response.data || [];

      // Gọi callback onLoadClass với schedule data
      if (onLoadClass) {
        onLoadClass({
          semesterId: parseInt(semesterId),
          classId: parseInt(classId),
          schedule: scheduleData,
          semesterOptions: semesterOptions.find(s => s.value === semesterId)
        });
      }
    } catch (error) {
      console.error('Failed to load schedule:', error);
      notificationApi.error({
        message: 'Error',
        description: 'Failed to load class schedule. Please try again.',
        placement: 'bottomRight',
        duration: 5,
      });
    } finally {
      setLoadingSchedule(false);
    }
  };

  return (
    <Card
      title={<Typography.Text strong>Pick Semester & Class</Typography.Text>}
      className="create-schedule-card"
    >
      {contextHolder}
      <Form layout="vertical">
        <Space
          direction="vertical"
          size="middle"
          style={{ width: '100%' }}
          className="create-schedule-space-vertical"
        >
          <Space direction="horizontal" size="large" className="create-schedule-space-responsive">
            <Form.Item
              label="Semester"
              style={{ minWidth: 220 }}
              className="create-schedule-form-item"
            >
              <Select
                showSearch
                placeholder="Select semester"
                value={semesterId || undefined}
                onChange={(value) => {
                  onSemesterChange(value);
                  onClassChange('');
                }}
                options={semesterOptions}
                optionFilterProp="label"
                loading={loadingOptions}
                allowClear
              />
            </Form.Item>

            <Form.Item
              label="Class"
              style={{ minWidth: 220 }}
              className="create-schedule-form-item"
            >
              <Select
                placeholder={semesterId ? 'Select class' : 'Choose semester first'}
                value={classId || undefined}
                onChange={onClassChange}
                options={displayClasses}
                disabled={!semesterId || displayClasses.length === 0}
                allowClear
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>

            <Form.Item
              label=" "
              colon={false}
              style={{ minWidth: 220 }}
              className="create-schedule-form-item"
            >
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={handleLoadClass}
                disabled={!semesterId || !classId}
                loading={loadingSchedule}
                style={{ width: '100%', height: '32px' }}
              >
                Load Class
              </Button>
            </Form.Item>
          </Space>
          {loadingOptions && (
            <Space size="small" align="center">
              <Spin size="small" />
              <Typography.Text type="secondary">Loading semester & class data...</Typography.Text>
            </Space>
          )}
        </Space>
      </Form>
    </Card>
  );
};

export default PickSemesterAndClass;

