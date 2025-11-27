import React, { useEffect } from 'react';
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

  // Khi mở modal hoặc đổi lesson → fill form
  useEffect(() => {
    if (visible && lesson) {
      form.setFieldsValue({
        date: lesson.date ? dayjs(lesson.date) : null,
        timeId: lesson.timeId
          ? String(lesson.timeId)
          : lesson.slot
          ? String(lesson.slot)
          : undefined,
        roomId: lesson.roomId ? String(lesson.roomId) : undefined,
      });
    } else {
      form.resetFields();
    }
  }, [visible, lesson, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const updatedData = {
        date: values.date
          ? values.date.format('YYYY-MM-DD')
          : lesson.date,
        timeId: Number(values.timeId),
        roomId: Number(values.roomId),
      };

      console.log('handleSubmit - lesson:', lesson);
      console.log('handleSubmit - lessonId:', lesson?.lessonId);
      console.log('handleSubmit - updatedData:', updatedData);

      if (!lesson?.lessonId) {
        console.error('Lesson ID is missing!', lesson);
        return;
      }

      if (typeof onUpdate === 'function') {
        await onUpdate(Number(lesson.lessonId), updatedData);
      } else {
        console.error('onUpdate callback is not provided');
      }
    } catch (error) {
      console.error('Form validation or update failed:', error);
      // cho parent xử lý
    }
  };

const handleDelete = (e) => {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  console.log('handleDelete called - lesson:', lesson);
  console.log('handleDelete - lessonId:', lesson?.lessonId);
  console.log('handleDelete - onDelete callback:', onDelete);

  if (!lesson?.lessonId) {
    console.error('Lesson ID is missing for delete!', lesson);
    return;
  }

  if (typeof onDelete === 'function') {
    const id = Number(lesson.lessonId);
    console.log('Calling onDelete with lessonId:', id);
    onDelete(id);   // gọi thẳng lên cha, không confirm ở đây
  } else {
    console.error(
      'onDelete callback is not provided or not a function',
      onDelete
    );
  }
};

  if (!lesson) return null;

  const slotOptions = timeslots.map((ts) => ({
    value: String(ts.timeId),
    label: `Slot ${ts.timeId} (${ts.startTime || ''} - ${ts.endTime || ''})`,
  }));

  const roomOptions = rooms.map((room) => ({
    value: room.value,
    label: room.label,
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
            <Text>
              {lesson.subjectCode || ''} - {lesson.subjectName || ''}
            </Text>
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
              disabledDate={(current) =>
                current && current < dayjs().startOf('day')
              }
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

      <Divider style={{ margin: '12px 0' }} />

      <Space style={{ width: '100%', justifyContent: 'flex-start' }}>
        <Button
          danger
          type="default"
          icon={<DeleteOutlined />}
          onClick={handleDelete}
          disabled={saving || !lesson?.lessonId}
        >
          Delete Lesson
        </Button>
      </Space>
    </Modal>
  );
};

export default LessonEditModal;
