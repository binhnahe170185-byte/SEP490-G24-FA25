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
  Spin,
  message,
  List,
  Tag,
} from 'antd';
import {
  DeleteOutlined,
  SaveOutlined,
  SwapOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { api } from '../../../../vn.fpt.edu.api/http';

// Helper function to get email username (part before @)
const getEmailUsername = (email) => {
  if (!email) return '';
  const atIndex = email.indexOf('@');
  return atIndex > 0 ? email.substring(0, atIndex) : email;
};

const { Text } = Typography;

const LessonEditModal = ({
  visible,
  lesson,
  rooms = [],
  timeslots = [],
  lecturers = [],
  semester,
  holidays = [],
  conflictMap = {},
  studentScheduleCache = { studentIds: [], studentTimeMap: {} },
  classId = null,
  lecturerId = null,
  // callbacks
  onUpdate,
  onDelete,
  onDeleteAllLessons,
  onBatchTransfer,
  onCancel,
  saving = false,
}) => {
  const [form] = Form.useForm();
  // mode
  const [mode, setMode] = useState('edit'); // 'edit' | 'batch'

  // batch transfer state
  const [weekday, setWeekday] = useState('');
  const [slotId, setSlotId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [patterns, setPatterns] = useState([]);
  const [batchLecturerId, setBatchLecturerId] = useState('');

  const [allLecturers, setAllLecturers] = useState([]);
  const [loadingLecturers, setLoadingLecturers] = useState(false);
  const [allRooms, setAllRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [allTimeslots, setAllTimeslots] = useState([]);
  const [loadingTimeslots, setLoadingTimeslots] = useState(false);

  // Fetch all lecturers when modal opens
  useEffect(() => {
    const fetchLecturers = async () => {
      if (!visible) return;

      try {
        setLoadingLecturers(true);

        const response = await api.get('/api/Lecturers');
        const lecturersList = response.data?.data || [];

        const formattedLecturers = lecturersList.map((lec) => ({
          value: String(lec.lecturerId),
          label: lec.email ? lec.email.split('@')[0] : lec.lecturerCode || `Lecturer ${lec.lecturerId}`,
        }));

        setAllLecturers(formattedLecturers);

      } catch (error) {
        
        setAllLecturers([]);
      } finally {
        setLoadingLecturers(false);
      }
    };

    fetchLecturers();
  }, [visible]);

  // Fetch all rooms when modal opens
  useEffect(() => {
    const fetchRooms = async () => {
      if (!visible) return;

      try {
        setLoadingRooms(true);

        const response = await api.get('/api/StaffOfAdmin/rooms');
        const roomsList = response.data?.data || response.data?.items || [];



        const formattedRooms = roomsList.map((room) => ({
          value: String(room.roomId),
          label: room.roomName,
        }));

        setAllRooms(formattedRooms);

      } catch (error) {
        console.error('❌ Error fetching rooms:', error);
        setAllRooms([]);
      } finally {
        setLoadingRooms(false);
      }
    };

    fetchRooms();
  }, [visible]);

  // Fetch all timeslots when modal opens
  useEffect(() => {
    const fetchTimeslots = async () => {
      if (!visible) return;

      try {
        setLoadingTimeslots(true);

        const response = await api.get('/api/Timeslot');
        const timeslotsList = response.data?.data || response.data?.items || response.data || [];



        // Ensure timeslotsList is an array
        const safeTimeslotsList = Array.isArray(timeslotsList) ? timeslotsList : [];

        const formattedTimeslots = safeTimeslotsList.map((ts) => ({
          value: String(ts.timeId),
          label: `Slot ${ts.timeId} (${ts.startTime || ''} - ${ts.endTime || ''})`,
          timeId: ts.timeId,
          startTime: ts.startTime,
          endTime: ts.endTime,
        }));

        setAllTimeslots(formattedTimeslots);

      } catch (error) {

        setAllTimeslots([]);
      } finally {
        setLoadingTimeslots(false);
      }
    };

    fetchTimeslots();
  }, [visible]);



  // Khi mở modal hoặc đổi lesson → fill form
  useEffect(() => {
    if (visible && lesson) {

      // Tìm roomId từ roomName nếu roomId không có hoặc không khớp
      let finalRoomId = lesson.roomId ? String(lesson.roomId) : undefined;
      if (!finalRoomId && lesson.room) {
        // Tìm room trong allRooms hoặc rooms prop
        const safeRooms = allRooms.length > 0 ? allRooms : (Array.isArray(rooms) ? rooms : []);
        const foundRoom = safeRooms.find((r) => r.label === lesson.room);
        if (foundRoom) {
          finalRoomId = String(foundRoom.value);
        }
      }

      form.setFieldsValue({
        date: lesson.date ? dayjs(lesson.date) : null,
        timeId: lesson.timeId
          ? String(lesson.timeId)
          : lesson.slot
            ? String(lesson.slot)
            : undefined,
        roomId: finalRoomId,
        lecturerId: lesson.lecturerId ? String(lesson.lecturerId) : undefined,
      });
      if (lesson.lecturerId) {
        setBatchLecturerId(String(lesson.lecturerId));
      }
    } else {
      form.resetFields();
      setWeekday('');
      setSlotId('');
      setRoomId('');
      setPatterns([]);
      setMode('edit');
      setBatchLecturerId('');
    }
  }, [visible, lesson, form, allRooms, rooms]);

  // Cập nhật roomId khi allRooms được load xong
  useEffect(() => {
    if (visible && lesson && allRooms.length > 0) {
      const currentRoomId = form.getFieldValue('roomId');
      // Nếu chưa có roomId hoặc roomId không khớp với options, tìm lại từ roomName
      if (!currentRoomId && lesson.room) {
        const foundRoom = allRooms.find((r) => r.label === lesson.room);
        if (foundRoom) {
          form.setFieldValue('roomId', String(foundRoom.value));
        }
      }
    }
  }, [visible, lesson, allRooms, form]);

  // Check conflicts for a given date, timeId, roomId, lecturerId
  const checkConflicts = (date, timeId, roomId, lecturerId, currentLessonId) => {
    const reasons = [];
    let hasConflict = false;

    // Check room/class/lecturer conflicts using conflictMap
    const timeKey = `${date}|${timeId}`;
    const roomKey = `${date}|${timeId}|${roomId}`;

    // Check room-specific conflicts
    const roomConflicts = conflictMap[roomKey] || [];
    roomConflicts.forEach(conflict => {
      // Exclude current lesson being edited
      if (currentLessonId && conflict.lessonId === currentLessonId) {
        return;
      }
      // Room conflict: room is occupied by any OTHER class
      if (conflict.roomId === parseInt(roomId, 10)) {
        if (!classId || conflict.classId !== parseInt(classId, 10)) {
          reasons.push(`Room ${conflict.roomName} is occupied by ${conflict.className}`);
          hasConflict = true;
        }
      }
    });

    // Check all conflicts for this date+timeId
    Object.keys(conflictMap).forEach(key => {
      if (key.startsWith(timeKey + '|')) {
        const conflicts = conflictMap[key] || [];
        conflicts.forEach(conflict => {
          // Exclude current lesson being edited
          if (currentLessonId && conflict.lessonId === currentLessonId) {
            return;
          }
          // Class conflict: same class already has lesson at this date/time
          if (classId && conflict.classId === parseInt(classId, 10)) {
            if (!reasons.some(r => r.includes('Class') && r.includes('already has a lesson'))) {
              reasons.push(`Class ${conflict.className} already has a lesson at this time`);
              hasConflict = true;
            }
          }

          // Lecturer conflict: same lecturer already has lesson (exclude if same class)
          if (lecturerId && conflict.lecturerId === parseInt(lecturerId, 10)) {
            if (!classId || conflict.classId !== parseInt(classId, 10)) {
              const lecturerDisplay = conflict.lecturerCode || 'Unknown';
              if (!reasons.some(r => r.includes('Lecturer') && r.includes(lecturerDisplay))) {
                reasons.push(`Lecturer ${lecturerDisplay} is already teaching ${conflict.className} at this time`);
                hasConflict = true;
              }
            }
          }
        });
      }
    });

    // Check student conflicts
    if (studentScheduleCache.studentIds && studentScheduleCache.studentIds.length > 0) {
      const classTimeKey = `${date}|${timeId}`;
      const conflictedStudents = [];
      studentScheduleCache.studentIds.forEach(studentId => {
        const studentSlots = studentScheduleCache.studentTimeMap[studentId];
        if (studentSlots && studentSlots.has(classTimeKey)) {
          conflictedStudents.push(studentId);
        }
      });
      if (conflictedStudents.length > 0) {
        reasons.push(`${conflictedStudents.length} student(s) already have lessons at this time`);
        hasConflict = true;
      }
    }

    return { hasConflict, reasons };
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const selectedDate = values.date
        ? values.date.format('YYYY-MM-DD')
        : lesson.date;

      // Validate: Check if selected date is a holiday
      if (holidays && holidays.length > 0) {
        const isHoliday = holidays.some(h => {
          const holidayDate = h.date || h;
          return holidayDate === selectedDate;
        });
        if (isHoliday) {
          const holiday = holidays.find(h => {
            const holidayDate = h.date || h;
            return holidayDate === selectedDate;
          });
          const holidayName = holiday?.name || holiday?.holidayName || 'Holiday';
          message.error(`Cannot update lesson to ${selectedDate} - it is a holiday (${holidayName})`);
          return;
        }
      }

      const updatedTimeId = Number(values.timeId);
      const updatedRoomId = Number(values.roomId);
      const updatedLecturerId = Number(values.lecturerId);
      const currentLessonId = lesson?.lessonId ? Number(lesson.lessonId) : null;

      // Check conflicts before updating
      const conflictCheck = checkConflicts(
        selectedDate,
        updatedTimeId,
        updatedRoomId,
        updatedLecturerId,
        currentLessonId
      );

      if (conflictCheck.hasConflict) {
        const conflictMessage = conflictCheck.reasons.join('; ');
        message.error({
          content: `Cannot update lesson due to conflicts: ${conflictMessage}`,
          duration: 6,
        });
        return;
      }

      const updatedData = {
        date: selectedDate,
        timeId: updatedTimeId,
        roomId: updatedRoomId,
        lecturerId: updatedLecturerId,
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

    if (!lesson?.lessonId) {
      message.error('Lesson ID is missing for delete!');
      console.error('Lesson ID is missing for delete!', lesson);
      return;
    }

    const id = Number(lesson.lessonId);

    console.log('Starting delete API call with id:', id);
    if (typeof onDelete === 'function') {
      onDelete(id);
    } else {
      message.error('Delete callback is not configured');
      console.error('onDelete callback is not provided or not a function', onDelete);
    }
  };


  const handleDeleteAll = () => {
    if (!lesson?.subjectCode) {
      message.error('Subject code not found for this lesson');
      console.error('Subject code not found for this lesson', lesson);
      return;
    }

    console.log('Delete all lessons for subject:', lesson.subjectCode);
    if (typeof onDeleteAllLessons === 'function') {
      onDeleteAllLessons(lesson.subjectCode);
    } else {
      message.error('Delete-all callback is not configured');
      console.error('onDeleteAllLessons callback is not provided or not a function', onDeleteAllLessons);
    }
  };


  const handleAddPattern = () => {
    if (!weekday || !slotId || !roomId) {
      message.error('Please choose weekday, slot and room');
      return;
    }
    const exists = patterns.some(
      (p) => p.weekday === Number(weekday) && p.slot === Number(slotId)
    );
    if (exists) {
      message.error('This pattern already exists');
      return;
    }
    const newPattern = {
      weekday: Number(weekday),
      slot: Number(slotId),
      room: roomId,
    };
    setPatterns((prev) => [...prev, newPattern]);
    setWeekday('');
    setSlotId('');
    setRoomId('');
  };

  const handleRemovePattern = (idx) => {
    setPatterns((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleBatchTransfer = async () => {
    if (!lesson?.subjectCode) {
      message.error('Subject code not found');
      return;
    }
    if (patterns.length === 0) {
      message.error('Please add at least one pattern');
      return;
    }
    if (typeof onBatchTransfer !== 'function') {
      message.error('Batch transfer callback not configured');
      return;
    }
    const payload = {
      subjectCode: lesson.subjectCode,
      patterns: patterns.map((p) => ({
        weekday: p.weekday,
        timeId: Number(p.slot),
        roomId: Number(p.room),
      })),
      lecturerId: batchLecturerId
        ? Number(batchLecturerId)
        : lesson?.lecturerId
          ? Number(lesson.lecturerId)
          : undefined,
    };
    await onBatchTransfer(payload);
  };

  const handleSwitchMode = () => {
    setMode((m) => (m === 'edit' ? 'batch' : 'edit'));
  };

  if (!lesson) return null;

  // Safeguard: ensure arrays are defined
  // Use fetched data if available, otherwise fallback to props
  const safeRooms = allRooms.length > 0 ? allRooms : (Array.isArray(rooms) ? rooms : []);
  const safeTimeslots = allTimeslots.length > 0 ? allTimeslots : (Array.isArray(timeslots) ? timeslots : []);
  const safeLecturers = allLecturers.length > 0 ? allLecturers : (Array.isArray(lecturers) ? lecturers : []);

  const slotOptions = safeTimeslots.map((ts) => ({
    value: String(ts.value || ts.timeId),
    label: ts.label || `Slot ${ts.timeId} (${ts.startTime || ''} - ${ts.endTime || ''})`,
  }));

  const roomOptions = safeRooms.map((room) => ({
    value: String(room.value),
    label: room.label,
  }));

  const lecturerOptions = safeLecturers.map((lec) => ({
    value: String(lec.value),
    label: lec.label,
  }));

  const weekdayOptions = [
    { value: '2', label: 'Mon' },
    { value: '3', label: 'Tue' },
    { value: '4', label: 'Wed' },
    { value: '5', label: 'Thu' },
    { value: '6', label: 'Fri' },
    { value: '7', label: 'Sat' },
    { value: '8', label: 'Sun' },
  ];

  const weekdayLabelMap = {
    2: 'Mon',
    3: 'Tue',
    4: 'Wed',
    5: 'Thu',
    6: 'Fri',
    7: 'Sat',
    8: 'Sun',
  };

  // Debug logging
  console.log('=== LessonEditModal Debug ===');
  console.log('lesson:', lesson);
  console.log('roomOptions:', roomOptions);
  console.log('slotOptions:', slotOptions);
  console.log('lecturerOptions:', lecturerOptions);


  return (
    <Modal
      title={mode === 'edit' ? 'Edit Lesson' : 'Transfer all lessons'}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={mode === 'edit' ? 600 : 820}
      destroyOnClose
    >
      {mode === 'edit' ? (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Subject: </Text>
                <Text>
                  {lesson.subjectCode || ''} - {lesson.subjectName || ''}
                </Text>
              </div>
              <Button icon={<SwapOutlined />} onClick={handleSwitchMode}>
                Transfer all
              </Button>
            </div>
            <div>
              <Text strong>Class: </Text>
              <Text>{lesson.className || ''}</Text>
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
                  if (!current) return false;

                  // Disable dates before semester start date
                  if (semester?.start) {
                    const semesterStartDate = dayjs(semester.start);
                    if (current < semesterStartDate.startOf('day')) {
                      return true;
                    }
                  }

                  // Disable dates after semester end date
                  if (semester?.end) {
                    const semesterEndDate = dayjs(semester.end);
                    if (current > semesterEndDate.endOf('day')) {
                      return true;
                    }
                  }

                  // Disable holidays
                  if (holidays && holidays.length > 0) {
                    const currentDateStr = current.format('YYYY-MM-DD');
                    const isHoliday = holidays.some(h => {
                      const holidayDate = h.date || h;
                      return holidayDate === currentDateStr;
                    });
                    if (isHoliday) {
                      return true;
                    }
                  }

                  return false;
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
                loading={loadingTimeslots}
                notFoundContent={loadingTimeslots ? <Spin size="small" /> : 'No timeslots found'}
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
                loading={loadingRooms}
                notFoundContent={loadingRooms ? <Spin size="small" /> : 'No rooms found'}
              />
            </Form.Item>

            <Form.Item
              label="Lecturer"
              name="lecturerId"
              rules={[{ required: true, message: 'Please select a lecturer' }]}
            >
              <Select
                placeholder="Select lecturer"
                options={lecturerOptions}
                showSearch
                optionFilterProp="label"
                loading={loadingLecturers}
                notFoundContent={loadingLecturers ? <Spin size="small" /> : 'No lecturers found'}
              />
            </Form.Item>

            <Divider style={{ margin: '12px 0' }} />

            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Button
                type="default"
                danger
                icon={<DeleteOutlined />}
                htmlType="button"
                onClick={handleDelete}
                disabled={!lesson?.lessonId || saving}
              >
                Delete Lesson
              </Button>

              <Space>
                <Button
                  type="default"
                  danger
                  icon={<ExclamationCircleOutlined />}
                  htmlType="button"
                  onClick={handleDeleteAll}
                  disabled={!lesson?.subjectCode || saving}
                >
                  Delete schedule
                </Button>

                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={saving}
                  disabled={saving}
                >
                  Save Changes
                </Button>
              </Space>
            </Space>

          </Space>
        </Form>
      ) : (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong>Subject: </Text>
              <Text>
                {lesson.subjectCode || ''} - {lesson.subjectName || ''}
              </Text>
            </div>
            <Button onClick={handleSwitchMode}>Back to edit</Button>
          </div>

          <Divider style={{ margin: '8px 0' }} />

          <Select
            style={{ minWidth: 240 }}
            placeholder="Select lecturer"
            value={
              batchLecturerId
                ? batchLecturerId
                : lesson?.lecturerId
                  ? String(lesson.lecturerId)
                  : undefined
            }
            onChange={setBatchLecturerId}
            options={lecturerOptions}
            showSearch
            optionFilterProp="label"
          />

          <Space wrap size="small">
            <Select
              style={{ minWidth: 160 }}
              placeholder="Weekday"
              value={weekday || undefined}
              onChange={setWeekday}
              options={weekdayOptions}
            />
            <Select
              style={{ minWidth: 160 }}
              placeholder="Slot"
              value={slotId || undefined}
              onChange={setSlotId}
              options={slotOptions}
              showSearch
              optionFilterProp="label"
            />
            <Select
              style={{ minWidth: 180 }}
              placeholder="Room"
              value={roomId || undefined}
              onChange={setRoomId}
              options={roomOptions}
              showSearch
              optionFilterProp="label"
            />
            <Button type="primary" onClick={handleAddPattern} icon={<SaveOutlined />}>
              Add pattern
            </Button>
          </Space>

          <List
            header="Selected patterns"
            dataSource={patterns}
            locale={{ emptyText: 'No pattern yet' }}
            renderItem={(item, idx) => (
              <List.Item
                actions={[
                  <Button type="link" danger onClick={() => handleRemovePattern(idx)}>
                    Remove
                  </Button>,
                ]}
              >
                <Space size="small">
                  <Tag color="blue">
                    {weekdayLabelMap[item.weekday] || `Weekday ${item.weekday}`}
                  </Tag>
                  <Tag color="green">Slot {item.slot}</Tag>
                  <Tag color="purple">Room {roomOptions.find((r) => r.value === String(item.room))?.label || item.room}</Tag>
                </Space>
              </List.Item>
            )}
          />

          <Divider style={{ margin: '8px 0' }} />

          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button
              type="primary"
              icon={<SwapOutlined />}
              onClick={handleBatchTransfer}
              loading={saving}
              disabled={patterns.length === 0}
            >
              Transfer all by subject
            </Button>
          </Space>
        </Space>
      )}
    </Modal>
  );
};

export default LessonEditModal;
