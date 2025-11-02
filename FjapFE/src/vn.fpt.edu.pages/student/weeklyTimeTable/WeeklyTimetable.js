import React, { useEffect, useMemo, useState } from "react";
import dayjsLib from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { Alert, Divider, Typography } from "antd";
import FilterBar from "./components/FilterBar";
import TimetableTable from "./components/TimetableTable";
import Legend from "./components/Legend";
import LessonDetailModal from "./components/LessonDetailModal";
import "./WeeklyTimetable.css";
import { api } from "../../../vn.fpt.edu.api/http";
import { useAuth } from "../../login/AuthContext";
dayjsLib.extend(isoWeek);
const dayjs = (d) => dayjsLib(d);

const STATUS = {
  pending: { color: "#3b82f6", text: "Not Yet" },
  done: { color: "#22c55e", text: "Present" },
  absent: { color: "#ef4444", text: "Absent" },
};

const DEFAULT_SLOTS = Array.from({ length: 8 }, (_, idx) => ({
  id: idx + 1,
  label: `Slot ${idx + 1}`,
}));

const WEEKDAY_HEADERS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function formatTimeRange(start, end) {
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
}


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

  const timeLabel = raw.timeLabel ?? formatTimeRange(startTime, endTime);

  // --- subjectCode extraction (try many possible shapes)
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
    raw.class?.subject?.name ??
    raw.class?.subject?.subjectName ??
    null;

  // Map instructor and studentGroup
  const instructorCode = raw.lecturerCode ?? raw.lecturer_code ?? raw.lectureCode ?? raw.instructor ?? null;
  const studentGroup = raw.studentGroup ?? className ?? null;

  // Map attendance status from backend to frontend
  // Backend: 'Present', 'Absent', 'Late', 'Excused', null
  // Frontend: 'pending' (Not Yet), 'done' (Present), 'absent' (Absent)
  const mapAttendanceStatus = (attendance) => {
    if (!attendance) return 'pending';
    const status = attendance.toLowerCase();
    if (status === 'present' || status === 'late' || status === 'excused') return 'done';
    if (status === 'absent') return 'absent';
    return 'pending';
  };

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
    (raw.classId ?? raw.class_id ?? "lesson") +
    "-" +
    (rawDate || fallbackId || Math.random().toString(36).slice(2));

  return {
    id,
    lessonId: raw.lessonId ?? raw.lesson_id ?? null,
    classId: raw.classId ?? raw.class_id ?? null,
    date: rawDate ? dayjs(rawDate).format("YYYY-MM-DD") : rawDate,
    rawDate,
    weekday: Number.isFinite(weekday) && weekday > 0 ? weekday : dateObj?.isoWeekday() ?? null,
    slotId: Number.isFinite(slotId) && slotId > 0 ? slotId : null,
    status: mapAttendanceStatus(raw.attendance ?? raw.Attendance ?? raw.raw?.attendance ?? raw.raw?.Attendance),
    // expose subjectCode separately and prefer it for display
    subjectCode: subjectCode ?? null,
    code:
      subjectCode ??
      classCode ??
      className ??
      (raw.classId ? `Class ${raw.classId}` : raw.lectureId ? `Lecture ${raw.lectureId}` : "Lesson"),
    timeLabel: timeLabel ?? (Number.isFinite(slotId) && slotId > 0 ? `Slot ${slotId}` : null),
    startTime: startTime ?? null,
    endTime: endTime ?? null,
    roomLabel:
      roomName ??
      (raw.roomId ?? raw.room_id ? `Room ${raw.roomId ?? raw.room_id}` : null),
    roomId: raw.roomId ?? raw.room_id ?? null,
    lectureId: raw.lectureId ?? raw.lecture_id ?? null,
    instructor: instructorCode,
    studentGroup: studentGroup,
    raw,
  };
}


export default function WeeklyTimetable({ items }) {
  const { user } = useAuth();
  const [remoteItems, setRemoteItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [anchorDate, setAnchorDate] = useState(dayjs().isoWeekday(1));
  const [year, setYear] = useState(anchorDate.year());
  const [weekNumber, setWeekNumber] = useState(anchorDate.isoWeek());
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const sourceItems = useMemo(() => {
    return items ?? remoteItems;
  }, [items, remoteItems]);

  useEffect(() => {
    if (items) return; // allow manual data injection for tests
    if (!user?.studentId) {
      setRemoteItems([]);
      return;
    }

    let cancelled = false;
    async function fetchLessons() {
      setLoading(true);
      try {
        const { data } = await api.get(`/api/Students/${user.studentId}/lesson`);
        const rows = Array.isArray(data?.data) ? data.data : [];
        const normalized = rows
          .map((row, idx) => normalizeLesson(row, idx))
          .filter(Boolean);
        if (!cancelled) {
          setRemoteItems(normalized);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setRemoteItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchLessons();
    return () => {
      cancelled = true;
    };
  }, [items, user?.studentId]);

  const normalizedItems = useMemo(() => {
    return (Array.isArray(sourceItems) ? sourceItems : [])
      .map((row, idx) => normalizeLesson(row, idx))
      .filter(Boolean);
  }, [sourceItems]);

  const week = useMemo(() => {
    const start = dayjs(anchorDate).year(year).isoWeek(weekNumber).isoWeekday(1);
    const end = start.add(6, "day");
    const days = Array.from({ length: 7 }, (_, i) => start.add(i, "day"));
    return { start, end, days };
  }, [anchorDate, year, weekNumber]);

  const weekItems = useMemo(() => {
    const startStr = week.start.startOf("day");
    const endStr = week.end.endOf("day");
    return normalizedItems.filter((it) => {
      if (!it?.date && !it?.rawDate) return false;
      const d = dayjs(it.date ?? it.rawDate);
      return d.isAfter(startStr.subtract(1, "ms")) && d.isBefore(endStr.add(1, "ms"));
    });
  }, [normalizedItems, week.start, week.end]);

  const slots = useMemo(() => {
    // keep DEFAULT_SLOTS length/order but always use the simple label "Slot N"
    return DEFAULT_SLOTS.map((s, idx) => ({
      id: s.id,
      label: `Slot ${s.id}`, // always default label
    }));
  }, [weekItems]);

  // build cellMap: sử dụng weekday từ date
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

  const goPrevWeek = () => {
    setAnchorDate((d) => {
      const newDate = dayjs(d).subtract(1, "week");
      setWeekNumber(newDate.isoWeek());
      return newDate;
    });
  };
  const goNextWeek = () => {
    setAnchorDate((d) => {
      const newDate = dayjs(d).add(1, "week");
      setWeekNumber(newDate.isoWeek());
      return newDate;
    });
  };

  const handleChipClick = (lesson) => {
    setSelectedLesson(lesson);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedLesson(null);
  };

  const weekLabel = `${week.start.format("DD/MM")} - ${week.end.format("DD/MM")}`;

  return (
    <div className="weekly-page-wrapper">
      <div className="weekly-container">
        <div className="weekly-header">
          <Typography.Title level={4} className="weekly-title" style={{ margin: 0 }}>
            Weekly timetable
          </Typography.Title>
          <FilterBar
            year={year}
            onYearChange={setYear}
            weekNumber={weekNumber}
            onWeekChange={setWeekNumber}
            onPrev={goPrevWeek}
            onNext={goNextWeek}
            weekLabel={weekLabel}
          />
        </div>

        <Divider style={{ margin: "12px 0" }} />
        <TimetableTable
          week={week}
          cellMap={cellMap}
          slots={slots}
          weekdayHeaders={WEEKDAY_HEADERS}
          loading={loading}
          onChipClick={handleChipClick}
        />

        <Legend status={STATUS} />
      </div>

      <LessonDetailModal
        visible={modalVisible}
        lesson={selectedLesson}
        onClose={handleCloseModal}
      />
    </div>
  );
}
