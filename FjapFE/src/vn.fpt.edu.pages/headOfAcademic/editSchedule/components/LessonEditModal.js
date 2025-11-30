import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Select,
  DatePicker,
  Space,
  Button,
  Typography,
  Divider,
  Alert,
  message,
} from 'antd';
import { DeleteOutlined, SaveOutlined, SwapOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import WeeklySchedules from '../../createSchedule/components/WeeklySchedule';
import LecturerSelector from '../../createSchedule/components/LecturerSelector';

const { Text } = Typography;

const LessonEditModal = ({
  visible,
  lesson,
  rooms = [],
  timeslots = [],
  weekdays = [], // Danh sách weekday để chọn
  onUpdate,
  onDelete,
  onCancel,
  onBatchTransfer, // Callback cho batch transfer
  saving = false,
  // Props cho batch transfer với pattern selection
  semester = { id: null, start: null, end: null },
  conflictMap = {},
  holidays = [],
  studentScheduleCache = { studentIds: [], studentTimeMap: {} },
  classId = null,
  lecturerId = null,
}) => {
  const [form] = Form.useForm();
  const [mode, setMode] = useState('edit'); // 'edit' hoặc 'batch'

  // State cho pattern selection (batch transfer mode)
  const [weekday, setWeekday] = useState('');
  const [slotId, setSlotId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [patterns, setPatterns] = useState([]);

  // State cho lecturer selection (batch transfer mode)
  const [localLecturerId, setLocalLecturerId] = useState('');
  const [localLecturerCode, setLocalLecturerCode] = useState('');

  // Helper functions cho pattern selection
  const toYMD = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const fromYMD = (str) => {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const mondayOf = (date) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  };

  const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  };

  const findNextDateForWeekday = (startDate, targetWeekday) => {
    if (!startDate || !targetWeekday) return null;
    const normalizedTarget = parseInt(targetWeekday, 10);
    if (Number.isNaN(normalizedTarget)) return null;
    const baseDate = new Date(startDate);
    for (let offset = 0; offset < 7; offset++) {
      const candidate = addDays(baseDate, offset);
      const weekday = candidate.getDay();
      const normalized = weekday === 0 ? 8 : weekday + 1;
      if (normalized === normalizedTarget) {
        return candidate;
      }
    }
    return null;
  };

  // Reset mode khi đóng modal
  useEffect(() => {
    if (!visible) {
      setMode('edit');
      form.resetFields();
      setWeekday('');
      setSlotId('');
      setRoomId('');
      setPatterns([]);
      setLocalLecturerId('');
      setLocalLecturerCode('');
    }
  }, [visible, form]);

  // Khi mở modal hoặc đổi lesson → fill form
  useEffect(() => {
    if (visible && lesson) {
      if (mode === 'edit') {
        form.setFieldsValue({
          date: lesson.date ? dayjs(lesson.date) : null,
          timeId: lesson.timeId
            ? String(lesson.timeId)
            : lesson.slot
              ? String(lesson.slot)
              : undefined,
          roomId: lesson.roomId ? String(lesson.roomId) : undefined,
        });
      }
    } else if (!visible) {
      form.resetFields();
    }
  }, [visible, lesson, form, mode]);

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

  const handleAddPattern = () => {
    if (!weekday || !slotId || !roomId) {
      return;
    }

    const exists = patterns.some(p => p.weekday === parseInt(weekday) && p.slot === parseInt(slotId));
    if (exists) {
      return;
    }

    const newPatterns = [...patterns, {
      weekday: parseInt(weekday),
      slot: parseInt(slotId),
      room: roomId,
    }];

    setPatterns(newPatterns);
    setWeekday('');
    setSlotId('');
    setRoomId('');
  };

  const handleRemovePattern = (index) => {
    const newPatterns = patterns.filter((_, i) => i !== index);
    setPatterns(newPatterns);
  };

  const handleBatchTransfer = async () => {
    console.log('handleBatchTransfer called');
    console.log('patterns:', patterns);
    console.log('lesson:', lesson);
    console.log('lesson keys:', lesson ? Object.keys(lesson) : 'no lesson');

    if (patterns.length === 0) {
      message.error('Vui lòng chọn ít nhất một pattern (weekday, slot, room)');
      return;
    }

    // Validate lecturer selection
    if (!localLecturerId) {
      message.error('Vui lòng chọn Lecturer');
      return;
    }

    // Dùng subjectCode thay vì subjectId
    const subjectCode = lesson?.subjectCode || '';

    if (!subjectCode) {
      console.error('Subject Code is missing!', lesson);
      message.error('Không tìm thấy Subject Code. Vui lòng thử lại.');
      return;
    }

    if (typeof onBatchTransfer !== 'function') {
      console.error('onBatchTransfer callback is not provided', onBatchTransfer);
      message.error('Lỗi: Callback không được cung cấp');
      return;
    }

    try {
      // Format patterns cho API (giống create schedule)
      const formattedPatterns = patterns.map((pattern) => ({
        weekday: pattern.weekday,
        timeId: parseInt(pattern.slot, 10),
        roomId: parseInt(pattern.room, 10),
      }));

      const transferData = {
        subjectCode,      // dùng code
        patterns: formattedPatterns,
        lecturerId: parseInt(localLecturerId, 10), // thêm lecturerId
      };

      console.log('handleBatchTransfer - transferData:', transferData);
      console.log('Calling onBatchTransfer...');

      await onBatchTransfer(transferData);

      console.log('onBatchTransfer completed');
    } catch (error) {
      console.error('Error in handleBatchTransfer:', error);
      message.error(
        'Có lỗi xảy ra khi chuyển lesson: ' + (error?.message || 'Unknown error')
      );
    }
  };

  const handleBatchDelete = () => {
    const subjectCode = lesson?.subjectCode || '';
    const subjectName = lesson?.subjectName || '';

    if (!subjectCode) {
      message.error('Không tìm thấy Subject Code');
      return;
    }

    Modal.confirm({
      title: 'Xóa toàn bộ Lessons',
      content: `Bạn có chắc chắn muốn xóa TẤT CẢ lessons của môn "${subjectCode} - ${subjectName}"? Hành động này không thể hoàn tác.`,
      okText: 'Xóa tất cả',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        const transferData = {
          subjectCode,
          deleteOnly: true, // Flag để chỉ xóa, không tạo mới
        };
        await onBatchTransfer(transferData);
      },
    });
  };


  const handleSwitchMode = () => {
    setMode(mode === 'edit' ? 'batch' : 'edit');
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

  const weekdayOptions = weekdays.length > 0
    ? weekdays
    : [
      { value: '2', label: 'Mon' },
      { value: '3', label: 'Tue' },
      { value: '4', label: 'Wed' },
      { value: '5', label: 'Thu' },
      { value: '6', label: 'Fri' },
      { value: '7', label: 'Sat' },
      { value: '8', label: 'Sun' },
    ];

  return (
    <Modal
      title={mode === 'edit' ? 'Edit Lesson' : 'Chuyển toàn bộ Lesson'}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={mode === 'batch' ? 900 : 600}
      destroyOnClose
      style={{ top: 80 }}
      centered={false}
    >
      {mode === 'edit' ? (
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

            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Button
                danger
                type="default"
                icon={<DeleteOutlined />}
                onClick={handleDelete}
                disabled={saving || !lesson?.lessonId}
              >
                Delete Lesson
              </Button>
              <Space>
                <Button
                  icon={<SwapOutlined />}
                  onClick={handleSwitchMode}
                  disabled={saving}
                >
                  Chuyển toàn bộ Lesson
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
          </Space>
        </Form>
      ) : (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Alert
            message="Chuyển toàn bộ Lesson"
            description="Chọn lịch mới (pattern) để chuyển toàn bộ lessons có cùng SubjectId sang lịch mới. Xử lý conflict giống như create schedule."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <div>
            <Text strong>Subject: </Text>
            <Text>
              {lesson?.subjectCode || ''} - {lesson?.subjectName || ''}
            </Text>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          <LecturerSelector
            lecturerId={localLecturerId}
            lecturerCode={localLecturerCode}
            onLecturerChange={(id, code) => {
              setLocalLecturerId(id);
              setLocalLecturerCode(code || '');
            }}
            subjectCode={lesson?.subjectCode || ''}
            subjectName={lesson?.subjectName || ''}
          />

          <Divider style={{ margin: '12px 0' }} />

          <WeeklySchedules
            weekday={weekday}
            slotId={slotId}
            roomId={roomId}
            patterns={patterns}
            weekdays={weekdayOptions}
            slots={slotOptions}
            rooms={roomOptions}
            weekdayMap={{ 2: 'Mon', 3: 'Tue', 4: 'Wed', 5: 'Thu', 6: 'Fri', 7: 'Sat', 8: 'Sun' }}
            onWeekdayChange={setWeekday}
            onSlotChange={setSlotId}
            onRoomChange={setRoomId}
            onAddPattern={handleAddPattern}
            onRemovePattern={handleRemovePattern}
            filteringOptions={false}
            conflictMap={conflictMap}
            semesterStart={semester.start}
            semesterEnd={semester.end}
            classId={classId}
            lecturerId={lecturerId}
            holidays={holidays}
            studentScheduleCache={studentScheduleCache}
            findNextDateForWeekday={findNextDateForWeekday}
            toYMD={toYMD}
            addDays={addDays}
            totalLesson={null}
            mondayOf={mondayOf}
          />

          <Divider style={{ margin: '12px 0' }} />

          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={handleSwitchMode}
                disabled={saving}
              >
                Quay lại
              </Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleBatchDelete}
                disabled={saving}
              >
                Xóa toàn bộ Lessons
              </Button>
            </Space>
            <Button
              type="primary"
              onClick={handleBatchTransfer}
              icon={<SwapOutlined />}
              loading={saving}
              disabled={patterns.length === 0}
            >
              Chuyển toàn bộ Lesson
            </Button>
          </Space>
        </Space>
      )}
    </Modal>
  );
};

export default LessonEditModal;
