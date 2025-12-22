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
import dayjs from 'dayjs';
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
            const allSemesters = data.semesters.map(sem => {
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
            });

            // Filter: chỉ hiển thị các semester từ hiện tại trở đi (startDate >= today)
            const today = dayjs().startOf('day');
            const futureSemesters = allSemesters.filter(sem => {
              if (!sem.startDate) return false; // Bỏ qua semester không có startDate
              const semesterStart = dayjs(sem.startDate).startOf('day');
              // So sánh: semesterStart >= today (isSame hoặc isAfter)
              return semesterStart.isSame(today) || semesterStart.isAfter(today);
            });
            
            setSemesterOptions(futureSemesters);
          }

          // Store classes grouped by semester
          if (data.classesBySemester) {
            const grouped = {};
            Object.keys(data.classesBySemester).forEach(semId => {
              const classes = data.classesBySemester[semId];
              grouped[parseInt(semId)] = classes.map(cls => {
                const className = cls.class_name || cls.className || '';

                return {
                  value: cls.class_id || cls.classId,
                  label: className
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount


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

      // Find className from selected class in dropdown
      const selectedClass = displayClasses.find(c => String(c.value) === String(classId));
      const className = selectedClass?.label || '';

      // Gọi callback onLoadClass với schedule data
      if (onLoadClass) {
        onLoadClass({
          semesterId: parseInt(semesterId),
          classId: parseInt(classId),
          schedule: scheduleData,
          semesterOptions: semesterOptions.find(s => s.value === semesterId),
          className: className
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
          direction="horizontal"
          size="large"
          className="create-schedule-space-responsive"
        >
          {/* Semester */}
          <Form.Item
            label="Semester"
            style={{ flex: 1, minWidth: 220 }}
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

          {/* Class */}
          <Form.Item
            label="Class"
            style={{ flex: 1, minWidth: 220 }}
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

          {/* Button */}
          <Form.Item
            label=" "
            colon={false}
            style={{ flex: '0 0 auto' }}
            className="create-schedule-form-item"
          >
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={handleLoadClass}
              disabled={!semesterId || !classId}
              loading={loadingSchedule}
              style={{ width: 110, height: 32 }}
            >
              Load Class
            </Button>
          </Form.Item>
        </Space>

      </Form>
    </Card>
  );
};

export default PickSemesterAndClass;

