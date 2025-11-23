import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  DatePicker,
  Space,
  Button,
  Typography,
  Divider,
} from 'antd';
import { DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

const LessonEditModal = ({
  visible,
  lesson,
  rooms = [],
  timeslots = [],
  onUpdate,
  onDelete,
  onCancel,
  saving = false,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible && lesson) {
      form.setFieldsValue({
        date: lesson.date ? dayjs(lesson.date) : null,
        timeId: lesson.timeId ? String(lesson.timeId) : String(lesson.slot),
        roomId: lesson.roomId ? String(lesson.roomId) : null,
      });
    } else {
      form.resetFields();
    }
  }, [visible, lesson, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const updatedData = {
        date: values.date ? values.date.format('YYYY-MM-DD') : lesson.date,
        timeId: parseInt(values.timeId, 10),
        roomId: parseInt(values.roomId, 10),
      };
      
      console.log('handleSubmit - lesson:', lesson);
      console.log('handleSubmit - lessonId:', lesson?.lessonId);
      console.log('handleSubmit - updatedData:', updatedData);
      
      if (!lesson?.lessonId) {
        console.error('Lesson ID is missing!', lesson);
        return;
      }
      
      if (onUpdate) {
        await onUpdate(lesson.lessonId, updatedData);
      } else {
        console.error('onUpdate callback is not provided');
      }
    } catch (error) {
      console.error('Form validation or update failed:', error);
      // Error will be handled by parent component
      throw error;
    }
  };

  const handleDelete = () => {
    console.log('handleDelete - lesson:', lesson);
    console.log('handleDelete - lessonId:', lesson?.lessonId);
    
    if (!lesson?.lessonId) {
      console.error('Lesson ID is missing for delete!', lesson);
      return;
    }
    
    if (onDelete) {
      onDelete(lesson.lessonId);
    } else {
      console.error('onDelete callback is not provided');
    }
  };

  if (!lesson) return null;

  const slotOptions = timeslots.map(ts => ({
    value: String(ts.timeId),
    label: `Slot ${ts.timeId} (${ts.startTime || ''} - ${ts.endTime || ''})`
  }));

  const roomOptions = rooms.map(room => ({
    value: room.value,
    label: room.label
  }));

  return (
    <Modal
      title="Edit Lesson"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>Subject: </Text>
            <Text>{lesson.subjectCode || ''} - {lesson.subjectName || ''}</Text>
          </div>
          <div>
            <Text strong>Class: </Text>
            <Text>{lesson.className || ''}</Text>
          </div>
          <div>
            <Text strong>Lecturer: </Text>
            <Text>{lesson.lecturer || ''}</Text>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          <Form.Item
            label="Date"
            name="date"
            rules={[{ required: true, message: 'Please select a date' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              disabledDate={(current) => {
                // Disable dates before today
                return current && current < dayjs().startOf('day');
              }}
            />
          </Form.Item>

          <Form.Item
            label="Time Slot"
            name="timeId"
            rules={[{ required: true, message: 'Please select a time slot' }]}
          >
            <Select
              placeholder="Select time slot"
              options={slotOptions}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>

          <Form.Item
            label="Room"
            name="roomId"
            rules={[{ required: true, message: 'Please select a room' }]}
          >
            <Select
              placeholder="Select room"
              options={roomOptions}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>

          <Divider style={{ margin: '12px 0' }} />

          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={handleDelete}
              loading={saving}
            >
              Delete Lesson
            </Button>
            <Button onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={saving}
            >
              Save Changes
            </Button>
          </Space>
        </Space>
      </Form>
    </Modal>
  );
};

export default LessonEditModal;

