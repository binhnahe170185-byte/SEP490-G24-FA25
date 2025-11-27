import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Select,
  Button,
  Space,
  List,
  Tag,
  Empty,
  Tooltip,
  Typography,
  Alert,
  Spin
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import '../CreateSchedule.css';

const WeeklySchedules = ({
  weekday,
  slotId,
  roomId,
  patterns = [],
  weekdays = [],
  slots = [],
  rooms = [],
  weekdayMap = {},
  onWeekdayChange,
  onSlotChange,
  onRoomChange,
  onAddPattern,
  onRemovePattern,
  filteringOptions = false,
  // Conflict checking props
  conflictMap = {},
  semesterStart = null,
  semesterEnd = null,
  classId = null,
  lecturerId = null,
  holidays = [],
  studentScheduleCache = { studentIds: [], studentTimeMap: {} },
  // Helper functions
  findNextDateForWeekday = null,
  toYMD = null,
  addDays = null
}) => {
  const [conflictStatus, setConflictStatus] = useState({ 
    hasConflict: false, 
    message: '', 
    checking: false 
  });

  // Check conflict when selections change
  useEffect(() => {
    if (!weekday || !slotId || !roomId || !semesterStart || !classId || !lecturerId) {
      setConflictStatus({ hasConflict: false, message: '', checking: false });
      return;
    }

    if (!findNextDateForWeekday || !toYMD || !addDays) {
      return;
    }

    setConflictStatus({ hasConflict: false, message: '', checking: true });

    // Check all dates in semester for this weekday+slot+room combination
    let currentDate = findNextDateForWeekday(semesterStart, weekday);
    const endDate = semesterEnd;
    const conflicts = [];
    const conflictDetails = [];

    while (currentDate && currentDate <= endDate) {
      const dateStr = toYMD(currentDate);
      // Skip holidays
      const isHoliday = holidays.some(h => h.date === dateStr);
      if (!isHoliday) {
        const key = `${dateStr}|${slotId}|${roomId}`;
        const classTimeKey = `${dateStr}|${slotId}`;
        const existingConflicts = conflictMap[key];
        
        if (existingConflicts && existingConflicts.length > 0) {
          existingConflicts.forEach(conflict => {
            // Room conflict: room is occupied
            if (conflict.roomId === parseInt(roomId, 10)) {
              conflictDetails.push(`Room ${conflict.roomName} is occupied by ${conflict.className} on ${dateStr}`);
            }
            // Class conflict: same class already has lesson
            if (classId && conflict.classId === parseInt(classId, 10)) {
              conflictDetails.push(`Class ${conflict.className} already has a lesson on ${dateStr}`);
            }
            // Lecturer conflict: same lecturer already has lesson
            if (lecturerId && conflict.lecturerId === parseInt(lecturerId, 10)) {
              conflictDetails.push(`Lecturer ${conflict.lecturerCode} is already teaching ${conflict.className} on ${dateStr}`);
            }
          });
          conflicts.push(dateStr);
        }

        // Check student conflicts: students in this class already have lessons at this date/time
        if (studentScheduleCache.studentIds && studentScheduleCache.studentIds.length > 0) {
          const conflictedStudents = [];
          studentScheduleCache.studentIds.forEach(studentId => {
            const studentSlots = studentScheduleCache.studentTimeMap[studentId];
            if (studentSlots && studentSlots.has(classTimeKey)) {
              conflictedStudents.push(studentId);
            }
          });

          if (conflictedStudents.length > 0) {
            const previewList = conflictedStudents.slice(0, 5).join(', ');
            const suffix = conflictedStudents.length > 5 ? ` (+${conflictedStudents.length - 5} more)` : '';
            conflictDetails.push(`Student conflict: students [${previewList}${suffix}] are already scheduled at ${dateStr} timeId ${slotId}`);
            conflicts.push(dateStr);
          }
        }
      }
      // Move to next week
      currentDate = addDays(currentDate, 7);
    }

    if (conflicts.length > 0) {
      // Group conflicts by type
      const roomConflicts = conflictDetails.filter(d => d.includes('Room'));
      const classConflicts = conflictDetails.filter(d => d.includes('Class'));
      const lecturerConflicts = conflictDetails.filter(d => d.includes('Lecturer'));
      const studentConflicts = conflictDetails.filter(d => d.includes('Student'));
      
      const messages = [];
      if (roomConflicts.length > 0) {
        messages.push(`Room conflict: ${roomConflicts.length} occurrence(s)`);
      }
      if (classConflicts.length > 0) {
        messages.push(`Class conflict: ${classConflicts.length} occurrence(s)`);
      }
      if (lecturerConflicts.length > 0) {
        messages.push(`Lecturer conflict: ${lecturerConflicts.length} occurrence(s)`);
      }
      if (studentConflicts.length > 0) {
        messages.push(`Student conflict: ${studentConflicts.length} occurrence(s)`);
      }

      setConflictStatus({
        hasConflict: true,
        message: messages.join(' | '),
        checking: false,
        details: conflictDetails.slice(0, 5), // Show first 5 conflicts
        totalConflicts: conflicts.length
      });
    } else {
      setConflictStatus({
        hasConflict: false,
        message: 'Slot is available',
        checking: false
      });
    }
  }, [weekday, slotId, roomId, semesterStart, semesterEnd, classId, lecturerId, conflictMap, holidays, studentScheduleCache, findNextDateForWeekday, toYMD, addDays]);

  const hasValues = weekday && slotId && roomId;
  const isChecking = conflictStatus.checking;
  const isUnavailable = conflictStatus.hasConflict;
  const availabilityMessage = conflictStatus.message;

  const addButtonDisabled = !hasValues || isUnavailable || isChecking;
  const addButtonTooltip = !hasValues
    ? 'Select weekday, slot & room'
    : isChecking
      ? 'Checking slot availability...'
      : isUnavailable
        ? availabilityMessage || 'This slot is not available'
        : 'Add schedule';
  const getRoomLabel = (roomValue) => {
    const room = rooms.find(r => String(r.value) === String(roomValue));
    return room?.label || roomValue;
  };

  return (
    <Card
      title="Weekly Schedules"
      className="create-schedule-card"
      extra={
        <Tooltip title={addButtonTooltip}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onAddPattern}
            disabled={addButtonDisabled}
          >
            Add schedule
          </Button>
        </Tooltip>
      }
    >
      {(isChecking || filteringOptions) && (
        <Alert
          message={filteringOptions ? "Filtering valid options..." : "Checking availability..."}
          type="info"
          icon={<Spin size="small" />}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      {availabilityMessage && !isChecking && (
        <Alert
          message={
            <div>
              <div style={{ marginBottom: conflictStatus.details ? 8 : 0 }}>
                {availabilityMessage}
              </div>
              {conflictStatus.details && conflictStatus.details.length > 0 && (
                <div style={{ marginTop: 8, fontSize: '12px' }}>
                  <Typography.Text type="secondary" strong>Details:</Typography.Text>
                  <ul style={{ marginTop: 4, marginBottom: 0, paddingLeft: 20 }}>
                    {conflictStatus.details.map((detail, idx) => (
                      <li key={idx} style={{ marginBottom: 4 }}>
                        <Typography.Text type="danger" style={{ fontSize: '12px' }}>
                          {detail}
                        </Typography.Text>
                      </li>
                    ))}
                  </ul>
                  {conflictStatus.totalConflicts > conflictStatus.details.length && (
                    <Typography.Text type="secondary" style={{ fontSize: '12px', fontStyle: 'italic' }}>
                      ... and {conflictStatus.totalConflicts - conflictStatus.details.length} more conflict(s)
                    </Typography.Text>
                  )}
                </div>
              )}
            </div>
          }
          type={isUnavailable ? 'error' : 'success'}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <Form layout="vertical">
        <Space
          direction="horizontal"
          size="large"
          wrap
          className="create-schedule-space-responsive"
        >
          <Form.Item label="Weekday" style={{ minWidth: 200 }}>
            <Select
              value={weekday || undefined}
              onChange={onWeekdayChange}
              placeholder="Select weekday"
              options={weekdays}
              allowClear
              loading={filteringOptions}
              notFoundContent={filteringOptions ? <Spin size="small" /> : null}
            />
          </Form.Item>

          <Form.Item label="Slot" style={{ minWidth: 200 }}>
            <Select
              value={slotId || undefined}
              onChange={onSlotChange}
              placeholder="Select slot"
              options={slots}
              allowClear
              loading={filteringOptions}
              notFoundContent={filteringOptions ? <Spin size="small" /> : null}
            />
          </Form.Item>

          <Form.Item label="Room" style={{ minWidth: 200 }}>
            <Select
              value={roomId || undefined}
              onChange={onRoomChange}
              placeholder="Select room"
              options={rooms}
              allowClear
              showSearch
              optionFilterProp="label"
              loading={filteringOptions}
              notFoundContent={filteringOptions ? <Spin size="small" /> : null}
            />
          </Form.Item>
        </Space>
      </Form>

      <List
        header="Pending patterns"
        dataSource={patterns}
        locale={{ emptyText: <Empty description="No patterns yet" /> }}
        renderItem={(pattern, idx) => (
          <List.Item
            actions={[
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => onRemovePattern(idx)}
              >
                Remove
              </Button>
            ]}
          >
            <Space size="small" wrap>
              <Tag color="blue">{weekdayMap[pattern.weekday] || pattern.weekday}</Tag>
              <Tag color="green">Slot {pattern.slot}</Tag>
              <Tag color="purple">Room {getRoomLabel(pattern.room)}</Tag>
            </Space>
          </List.Item>
        )}
        style={{ marginTop: 12 }}
      />
    </Card>
  );
};

export default WeeklySchedules;

