import React, { useState, useEffect, useMemo } from 'react';
import { Card, Typography, Button, Empty, Spin, Table } from 'antd';
import { CalendarOutlined, RightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../login/AuthContext';
import { api } from '../../../vn.fpt.edu.api/http';
import dayjsLib from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjsLib.extend(isoWeek);
const dayjs = (d) => dayjsLib(d);

const { Title, Text } = Typography;

// Simple ClassChip for quick view (without time and room)
const SimpleClassChip = ({ item, onClick }) => {
  const STATUS = {
    pending: { color: "#3b82f6", background: "#e0f2fe" },
    done: { color: "#78dc9dff", background: "#dcfce7" },
    absent: { color: "#ef4444", background: "#fee2e2" },
  };
  const s = STATUS[item?.status] || STATUS.pending;
  const title = item?.code ?? "Lesson";
  
  return (
    <Card
      size="small"
      variant="outlined"
      style={{
        borderColor: s.color,
        background: s.background || "#fff",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s"
      }}
      styles={{ body: { padding: 6, textAlign: 'center' } }}
      onClick={() => onClick && onClick(item)}
      hoverable={!!onClick}
    >
      <Typography.Text strong style={{ fontSize: 12, display: 'block', textAlign: 'center' }}>{title}</Typography.Text>
    </Card>
  );
};

// Normalize lesson function (same as WeeklyTimetable)
function normalizeLesson(raw, fallbackId) {
  if (!raw) return null;

  const rawDate = raw.date ?? raw.lessonDate ?? raw.startDate ?? null;
  const dateObj = rawDate ? dayjs(rawDate) : null;
  const slotId = Number(
    raw.slotId ??
    raw.slot_id ??
    raw.slot ??
    raw.timeId ??
    raw.time_id ??
    raw.time?.timeId ??
    raw.time?.time_id ??
    0
  );
  const weekday = Number(
    raw.weekday ?? raw.week_day ?? (dateObj ? dateObj.isoWeekday() : NaN)
  );

  const startTime = raw.time?.startTime ?? raw.time?.start_time ?? raw.startTime ?? raw.start_time ?? null;
  const endTime = raw.time?.endTime ?? raw.time?.end_time ?? raw.endTime ?? raw.end_time ?? null;

  const formatTimeRange = (start, end) => {
    const formatTime = (value) => {
      if (!value) return null;
      if (typeof value === "string") {
        const [hh, mm] = value.split(":");
        if (hh !== undefined && mm !== undefined) return `${hh}:${mm}`;
        return value;
      }
      return value;
    };
    const startStr = formatTime(start);
    const endStr = formatTime(end);
    if (startStr && endStr) return `${startStr} - ${endStr}`;
    if (startStr) return startStr;
    if (endStr) return endStr;
    return null;
  };

  const timeLabel = raw.timeLabel ?? formatTimeRange(startTime, endTime);

  const subjectCode =
    raw.subjectCode ??
    raw.subject?.code ??
    raw.subject?.subjectCode ??
    raw.class?.subject?.code ??
    raw.class?.subject?.subjectCode ??
    raw.class?.subjectCode ??
    null;

  const classCode =
    raw.classCode ??
    raw.class?.classCode ??
    raw.class?.code ??
    null;

  const className =
    raw.className ??
    raw.class?.className ??
    raw.class?.name ??
    null;

  const subjectName =
    raw.subjectName ??
    raw.subject?.subjectName ??
    raw.subject?.name ??
    raw.class?.subject?.subjectName ??
    raw.class?.subject?.name ??
    null;

  const roomName =
    raw.roomLabel ??
    raw.roomName ??
    raw.room?.roomName ??
    raw.room?.name ??
    null;

  const id =
    raw.id ??
    raw.lessonId ??
    raw.lesson_id ??
    (raw.classId ?? raw.class_id ?? "lesson") + "-" + (rawDate || fallbackId || Math.random().toString(36).slice(2));

  // Map attendance status
  const mapAttendanceStatus = (attendance) => {
    if (!attendance) return 'pending';
    const status = attendance.toLowerCase();
    if (status === 'present' || status === 'late' || status === 'excused') return 'done';
    if (status === 'absent') return 'absent';
    return 'pending';
  };

  return {
    id,
    lessonId: raw.lessonId ?? raw.lesson_id ?? null,
    date: rawDate ? dayjs(rawDate).format("YYYY-MM-DD") : rawDate,
    rawDate,
    weekday: Number.isFinite(weekday) && weekday > 0 ? weekday : dateObj?.isoWeekday() ?? null,
    slotId: Number.isFinite(slotId) && slotId > 0 ? slotId : null,
    status: mapAttendanceStatus(raw.attendance ?? raw.Attendance ?? raw.raw?.attendance ?? raw.raw?.Attendance),
    subjectCode: subjectCode ?? null,
    code: subjectCode ?? classCode ?? className ?? (raw.classId ? `Class ${raw.classId}` : "Lesson"),
    subjectName: subjectName ?? null,
    className: className ?? null,
    timeLabel: timeLabel ?? (Number.isFinite(slotId) && slotId > 0 ? `Slot ${slotId}` : null),
    startTime: startTime ?? null,
    endTime: endTime ?? null,
    roomLabel: roomName ?? (raw.roomId ?? raw.room_id ? `Room ${raw.roomId ?? raw.room_id}` : null),
    roomId: raw.roomId ?? raw.room_id ?? null,
    raw,
  };
}

const ScheduleQuickView = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.studentId) {
      loadTodayLessons();
    }
  }, [user?.studentId]);

  const loadTodayLessons = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/api/Students/${user.studentId}/lesson`);
      const rawLessons = Array.isArray(data?.data) ? data.data : [];
      
      // Normalize lessons
      const normalized = rawLessons
        .map((row, idx) => normalizeLesson(row, idx))
        .filter(Boolean);
      
      setLessons(normalized);
    } catch (error) {
      console.error('Failed to load lessons:', error);
      setLessons([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate current week (Mon - Sun) - same logic as WeeklyTimetable
  const week = useMemo(() => {
    const anchorDate = dayjs().isoWeekday(1); // Monday of current week
    const start = anchorDate;
    const end = start.add(6, 'day');
    const days = Array.from({ length: 7 }, (_, i) => start.add(i, 'day'));
    return { start, end, days };
  }, []);

  // Filter lessons for current week
  const weekItems = useMemo(() => {
    const startStr = week.start.startOf('day');
    const endStr = week.end.endOf('day');
    return lessons.filter((it) => {
      if (!it?.date && !it?.rawDate) return false;
      const d = dayjs(it.date ?? it.rawDate);
      return d.isAfter(startStr.subtract(1, 'ms')) && d.isBefore(endStr.add(1, 'ms'));
    });
  }, [lessons, week.start, week.end]);

  // Default slots (6 slots)
  const slots = useMemo(() => {
    return Array.from({ length: 6 }, (_, idx) => ({
      id: idx + 1,
      label: `Slot ${idx + 1}`,
    }));
  }, []);

  // Build cellMap: map slotId|weekday to lessons
  const cellMap = useMemo(() => {
    const map = new Map();
    for (const it of weekItems) {
      if (!it?.slotId || !it?.weekday) continue;
      const key = `${it.slotId}|${it.weekday}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    }
    return map;
  }, [weekItems]);

  const WEEKDAY_HEADERS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  const handleChipClick = (lesson) => {
    // Optional: could navigate to lesson detail or do nothing for quick view
  };

  // Table columns for timetable
  const columns = useMemo(() => {
    const cols = [
      { 
        title: 'SLOT', 
        dataIndex: 'slotLabel', 
        key: 'slotLabel', 
        width: 80, 
        fixed: 'left', 
        render: (v) => <strong style={{ fontSize: 12 }}>{v}</strong> 
      },
    ];
    week.days.forEach((d, idx) => {
      cols.push({
        title: (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: 12 }}>{WEEKDAY_HEADERS[idx]}</div>
            <div style={{ fontSize: 11, color: '#666' }}>{d.format('DD/MM')}</div>
          </div>
        ),
        dataIndex: `day${idx}`,
        key: `day${idx}`,
        width: 100,
        render: (_, record) => {
          const slotId = record._slotId;
          const key = `${slotId}|${idx + 1}`;
          const items = cellMap.get(key) || [];
          if (!items.length) return null;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {items.map((it, i) => (
                <SimpleClassChip key={i} item={it} onClick={handleChipClick} />
              ))}
            </div>
          );
        },
      });
    });
    return cols;
  }, [week.days, cellMap]);

  // Table data source
  const dataSource = useMemo(() => {
    return slots.map((slot, idx) => ({
      key: `slot-${slot.id ?? idx + 1}`,
      _slotId: slot.id ?? idx + 1,
      slotLabel: slot.label ?? `Slot ${slot.id ?? idx + 1}`,
      ...Array.from({ length: 7 }).reduce((acc, _, i) => ({ ...acc, [`day${i}`]: null }), {}),
    }));
  }, [slots]);

  return (
    <Card 
      className="function-card section-card"
      title={
        <div className="section-card-header">
          <CalendarOutlined className="function-icon schedule-icon" />
          <Title level={4} className="function-title">This Week's Schedule</Title>
        </div>
      }
      extra={
        <Button 
          type="link" 
          icon={<RightOutlined />}
          onClick={() => navigate('/student/weeklyTimetable')}
          style={{ padding: 0 }}
        >
          View All
        </Button>
      }
    >
      <div className="section-card-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Spin size="large" />
          </div>
        ) : weekItems.length > 0 ? (
          <div className="schedule-timetable-wrapper">
            <Table
              columns={columns}
              dataSource={dataSource}
              pagination={false}
              bordered
              rowKey="key"
              scroll={{ x: 'max-content' }}
              size="small"
              style={{ fontSize: 12 }}
            />
          </div>
        ) : (
          <Empty 
            description={
              <span style={{ color: '#999' }}>
                No lessons scheduled for this week
              </span>
            }
            style={{ margin: '40px 0' }}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </div>
      <Button 
        type="primary" 
        icon={<RightOutlined />}
        className="function-button"
        onClick={() => navigate('/student/weeklyTimetable')}
        style={{ marginTop: 16 }}
        block
      >
        View Full Schedule
      </Button>
    </Card>
  );
};

export default ScheduleQuickView;

