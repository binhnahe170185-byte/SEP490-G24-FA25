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

// Helper function to get email username (part before @)
const getEmailUsername = (email) => {
  if (!email) return '';
  const atIndex = email.indexOf('@');
  return atIndex > 0 ? email.substring(0, atIndex) : email;
};

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
  addDays = null,
  // Total lesson validation
  totalLesson = null,
  mondayOf = null,
  scheduleComplete = false
}) => {
  const [conflictStatus, setConflictStatus] = useState({
    hasConflict: false,
    message: '',
    checking: false
  });

  // Calculate total lessons that will be generated from current patterns
  const calculateTotalLessonsFromPatterns = (patterns, semStart, semEnd) => {
    if (!patterns || patterns.length === 0 || !semStart || !semEnd || !mondayOf || !toYMD || !addDays) {
      return 0;
    }

    const holidaysDates = holidays.map(h => h.date);
    let lessonCount = 0;
    let currentDate = mondayOf(semStart);
    const endDate = semEnd;

    // Generate lessons for each week in semester (without totalLesson limit)
    while (currentDate <= endDate) {
      // For each weekday (Mon-Sun)
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const lessonDate = addDays(currentDate, dayOffset);

        // Skip if beyond semester end
        if (lessonDate > endDate) break;

        // Skip if holiday
        const dateStr = toYMD(lessonDate);
        if (holidaysDates.includes(dateStr)) continue;

        // Check if this weekday matches any pattern
        const weekdayNum = lessonDate.getDay();
        const normalizedWeekday = weekdayNum === 0 ? 8 : weekdayNum + 1; // Convert: Mon=2 ... Sat=7, Sun=8

        patterns.forEach(pattern => {
          if (pattern.weekday === normalizedWeekday) {
            lessonCount++;
          }
        });
      }

      // Move to next week
      currentDate = addDays(currentDate, 7);
    }

    return lessonCount;
  };

  // Calculate and validate total lesson count
  const [lessonCountStatus, setLessonCountStatus] = useState({
    currentCount: 0,
    requiredCount: 0,
    isInsufficient: false
  });

  useEffect(() => {
    if (totalLesson && totalLesson > 0 && semesterStart && semesterEnd && patterns.length > 0) {
      const currentCount = calculateTotalLessonsFromPatterns(patterns, semesterStart, semesterEnd);
      const isInsufficient = currentCount < totalLesson;
      setLessonCountStatus({
        currentCount,
        requiredCount: totalLesson,
        isInsufficient
      });
    } else {
      setLessonCountStatus({
        currentCount: 0,
        requiredCount: 0,
        isInsufficient: false
      });
    }
  }, [patterns, semesterStart, semesterEnd, totalLesson, holidays, mondayOf, toYMD, addDays]);

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

    // Track unique conflicts by type and entity (to avoid duplicates)
    const roomConflictMap = new Map(); // key: roomName-className, value: count
    const classConflictMap = new Map(); // key: className, value: count
    const lecturerConflictMap = new Map(); // key: lecturerDisplay-className, value: count
    const studentConflictSet = new Set(); // track unique student conflicts
    let studentConflictCount = 0;

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
              const roomKey = `${conflict.roomName}-${conflict.className}`;
              roomConflictMap.set(roomKey, (roomConflictMap.get(roomKey) || 0) + 1);
            }
            // Class conflict: same class already has lesson
            if (classId && conflict.classId === parseInt(classId, 10)) {
              classConflictMap.set(conflict.className, (classConflictMap.get(conflict.className) || 0) + 1);
            }
            // Lecturer conflict: same lecturer already has lesson
            if (lecturerId && conflict.lecturerId === parseInt(lecturerId, 10)) {
              const lecturerDisplay = conflict.lecturerCode
                ? (conflict.lecturerCode.includes('@') ? getEmailUsername(conflict.lecturerCode) : conflict.lecturerCode)
                : 'Unknown';
              const lecturerKey = `${lecturerDisplay}-${conflict.className}`;
              lecturerConflictMap.set(lecturerKey, (lecturerConflictMap.get(lecturerKey) || 0) + 1);
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
            // Track unique student conflict (same students, different dates)
            const studentKey = conflictedStudents.sort().join(',');
            if (!studentConflictSet.has(studentKey)) {
              studentConflictSet.add(studentKey);
            }
            studentConflictCount++;
            conflicts.push(dateStr);
          }
        }
      }
      // Move to next week
      currentDate = addDays(currentDate, 7);
    }

    if (conflicts.length > 0) {
      // Build unique conflict details (one per conflict type/entity)
      const conflictDetails = [];

      // Room conflicts
      roomConflictMap.forEach((count, key) => {
        const [roomName, className] = key.split('-');
        conflictDetails.push(`Room ${roomName} is occupied by ${className} (${count} occurrence(s))`);
      });

      // Class conflicts
      classConflictMap.forEach((count, className) => {
        conflictDetails.push(`Class ${className} already has a lesson (${count} occurrence(s))`);
      });

      // Lecturer conflicts
      lecturerConflictMap.forEach((count, key) => {
        const [lecturerDisplay, className] = key.split('-');
        conflictDetails.push(`Lecturer ${lecturerDisplay} is already teaching ${className} (${count} occurrence(s))`);
      });

      // Student conflicts
      if (studentConflictSet.size > 0) {
        conflictDetails.push(`Student conflict: ${studentConflictCount} occurrence(s) detected`);
      }

      // Build summary messages
      const messages = [];
      if (roomConflictMap.size > 0) {
        const totalRoomConflicts = Array.from(roomConflictMap.values()).reduce((sum, count) => sum + count, 0);
        messages.push(`Room conflict: ${totalRoomConflicts} occurrence(s)`);
      }
      if (classConflictMap.size > 0) {
        const totalClassConflicts = Array.from(classConflictMap.values()).reduce((sum, count) => sum + count, 0);
        messages.push(`Class conflict: ${totalClassConflicts} occurrence(s)`);
      }
      if (lecturerConflictMap.size > 0) {
        const totalLecturerConflicts = Array.from(lecturerConflictMap.values()).reduce((sum, count) => sum + count, 0);
        messages.push(`Lecturer conflict: ${totalLecturerConflicts} occurrence(s)`);
      }
      if (studentConflictSet.size > 0) {
        messages.push(`Student conflict: ${studentConflictCount} occurrence(s)`);
      }

      setConflictStatus({
        hasConflict: true,
        message: messages.join(' | '),
        checking: false,
        details: conflictDetails, // Show unique conflicts only
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

  const addButtonDisabled = !hasValues || isUnavailable || isChecking || scheduleComplete;
  const addButtonTooltip = scheduleComplete
    ? 'The class is full. No new schedule can be added.'
    : !hasValues
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
      {!lecturerId && patterns.length > 0 && (
        <Alert
          message="Please assign lecturer"
          description="You have added schedule(s) but have not selected a lecturer. Please select a lecturer before saving the schedule."
          type="warning"
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

                </div>
              )}
            </div>
          }
          type={isUnavailable ? 'error' : 'success'}

        />
      )}
      {lessonCountStatus.isInsufficient && totalLesson && totalLesson > 0 && (
        <Alert
          message="Insufficient Lessons"
          description={
            <Typography.Text>
              Subject requires <strong>{lessonCountStatus.requiredCount}</strong> lessons, please add more patterns to meet the requirement.
            </Typography.Text>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      {!lessonCountStatus.isInsufficient && lessonCountStatus.currentCount > 0 && totalLesson && totalLesson > 0 && (
        <Alert
          message="Lesson Count Status"
          description={
            <Typography.Text type="success">
              Current patterns will generate enough lessons out of required <strong>{lessonCountStatus.requiredCount}</strong> lesson(s).
            </Typography.Text>
          }
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      {scheduleComplete && (
        <Alert
          message="The class has been fully scheduled"
          description={
            <Typography.Text>
              This class already has enough classes to meet the course requirements. No new classes can be added.
            </Typography.Text>
          }
          type="info"
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
              disabled={scheduleComplete}
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
              disabled={scheduleComplete}
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
              disabled={scheduleComplete}
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

