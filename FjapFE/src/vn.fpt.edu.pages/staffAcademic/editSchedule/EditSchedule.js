import React, { useState, useEffect } from 'react';
import dayjsLib from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import {
  Layout,
  Space,
  Row,
  Col,
  Typography,
  Tag,
  Spin,
  Modal,
} from 'antd';
import {
  CalendarOutlined,
  BookOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { notification } from 'antd';
import './EditSchedule.css';

import CalendarTable from '../createSchedule/components/CalendarTable';
import PickSemesterAndClass from './components/PickSemesterAndClass';
import LessonEditModal from './components/LessonEditModal';

import SemesterApi from '../../../vn.fpt.edu.api/Semester';
import RoomApi from '../../../vn.fpt.edu.api/Room';
import TimeslotApi from '../../../vn.fpt.edu.api/Timeslot';
import HolidayApi from '../../../vn.fpt.edu.api/Holiday';
import ClassList from '../../../vn.fpt.edu.api/ClassList';
import { api } from '../../../vn.fpt.edu.api/http';

dayjsLib.extend(isoWeek);
const dayjs = (d) => dayjsLib(d);

const { confirm } = Modal;

// Helper: get username part before @
const getEmailUsername = (email) => {
  if (!email) return '';
  const atIndex = email.indexOf('@');
  return atIndex > 0 ? email.substring(0, atIndex) : email;
};

// Helper: normalize api response -> array
const unwrapToArray = (res) => {
  // Supports:
  // 1) axios response: res.data.data = []
  // 2) unwrapped object: res.data = []
  // 3) already array: res = []
  const raw = res?.data?.data ?? res?.data ?? res;
  return Array.isArray(raw) ? raw : [];
};

const EditSchedule = () => {
  const [notiApi, contextHolder] = notification.useNotification();

  const [semesterId, setSemesterId] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [className, setClassName] = useState('');
  const [lecturerId, setLecturerId] = useState('');
  const [lecturerCode, setLecturerCode] = useState('');

  const [loadedLessons, setLoadedLessons] = useState([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const [year, setYear] = useState(() => dayjs().year());
  const [weekNumber, setWeekNumber] = useState(() => dayjs().isoWeek());

  const [semester, setSemester] = useState({ id: null, start: null, end: null });

  const [semesterData, setSemesterData] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [timeslots, setTimeslots] = useState([]); // ALWAYS array
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [classStudents, setClassStudents] = useState([]);
  const [lecturers, setLecturers] = useState([]);

  const [conflictMap, setConflictMap] = useState({});
  const [studentScheduleCache, setStudentScheduleCache] = useState({
    studentIds: [],
    studentTimeMap: {},
  });

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

  const getWeekRange = (weekStart) =>
    `Week ${toYMD(weekStart)} → ${toYMD(addDays(weekStart, 6))}`;

  const normalizeDateString = (rawDate) => {
    if (!rawDate) return '';
    if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return rawDate;
    try {
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) return toYMD(parsed);
    } catch {
      // ignore
    }
    return String(rawDate);
  };

  // Fetch static data (Semesters, Rooms, Timeslots, Lecturers)
  useEffect(() => {
    let alive = true;

    const fetchData = async () => {
      try {
        setLoading(true);

        const semestersResponse = await SemesterApi.getSemesters({ pageSize: 100 });
        const semestersList = semestersResponse.items || [];
        const formattedSemesters = semestersList.map((sem) => ({
          code: sem.semesterCode || sem.name,
          start: sem.startDate,
          end: sem.endDate,
          status: new Date(sem.endDate) >= new Date() ? 'Active' : 'Archived',
        }));
        if (alive) setSemesterData(formattedSemesters);

        const roomsResponse = await RoomApi.getRooms({ pageSize: 100 });
        const roomsList = roomsResponse.items || [];
        const formattedRooms = roomsList.map((room) => ({
          value: String(room.roomId),
          label: room.roomName,
        }));
        if (alive) setRooms(formattedRooms);

        // ✅ FIX TIMESLOTS: unwrap correctly
        const timeslotsRes = await TimeslotApi.getTimeslots();
        const list = unwrapToArray(timeslotsRes);

        // Debug once
        console.log('[Timeslots] raw response:', timeslotsRes);
        console.log('[Timeslots] parsed list:', list, 'length=', list.length);

        if (alive) setTimeslots(list);

        // Lecturers
        const lecturersResponse = await api.get('/api/Lecturers');
        const lecturersList = lecturersResponse.data?.data || [];
        const formattedLecturers = lecturersList.map((lec) => ({
          value: String(lec.lecturerId),
          label: lec.email
            ? lec.email.split('@')[0]
            : (lec.lecturerCode || `Lecturer ${lec.lecturerId}`),
        }));
        if (alive) setLecturers(formattedLecturers);
      } catch (error) {
        console.error('❌ Error fetching data:', error);
        console.error('Error details:', error.response?.data);

        if (!alive) return;
        setRooms([]);
        setTimeslots([]); // still array
        setSemesterData([]);
        setLecturers([]);
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchData();

    return () => {
      alive = false;
    };
  }, []);

  // Sync semester when semesterId change
  useEffect(() => {
    if (semesterId && semesterId !== semester.id) {
      const semData = semesterData.find(
        (s) => s.code === semesterId || String(s.code) === String(semesterId)
      );
      if (semData) {
        setSemester({
          id: semesterId,
          start: fromYMD(semData.start),
          end: fromYMD(semData.end),
        });
      } else if (semesterId) {
        setSemester((prev) => ({ ...prev, id: semesterId }));
      }
    }
  }, [semesterId, semesterData, semester.id]);

  // Fetch holidays
  useEffect(() => {
    const fetchHolidays = async () => {
      const semId = semester.id || semesterId;
      if (!semId) {
        setHolidays([]);
        return;
      }
      try {
        const holidaysList = await HolidayApi.getHolidaysBySemester(semId);
        const formatted = (holidaysList || []).map((holiday) => ({
          date: normalizeDateString(holiday.date),
          name:
            holiday.name ||
            holiday.holidayName ||
            holiday.reason ||
            holiday.description ||
            'Holiday',
          description: holiday.description || '',
          holidayId: holiday.holidayId,
        }));
        setHolidays(formatted);
      } catch (error) {
        console.error('Error fetching holidays:', error);
        setHolidays([]);
      }
    };
    fetchHolidays();
  }, [semester.id, semesterId]);

  // Init week
  useEffect(() => {
    const today = new Date();
    const initWeek = mondayOf(today);
    setCurrentWeekStart(initWeek);
    setYear(dayjs(today).year());
    setWeekNumber(dayjs(today).isoWeek());
  }, []);

  // Sync currentWeekStart with year/weekNumber
  useEffect(() => {
    if (year && weekNumber) {
      const weekStart = dayjs().year(year).isoWeek(weekNumber).isoWeekday(1).toDate();
      setCurrentWeekStart(weekStart);
    }
  }, [year, weekNumber]);

  const fetchClassStudents = async (clsId) => {
    if (!clsId) {
      setClassStudents([]);
      return;
    }
    try {
      const studentResponse = await ClassList.getStudents(clsId);
      const responseData = studentResponse?.data || studentResponse || {};
      const rawStudents = responseData?.students || responseData?.items || [];
      const formatted = (Array.isArray(rawStudents) ? rawStudents : [])
        .map((student) => {
          const user = student.user || {};
          const firstName = student.firstName || user.firstName || '';
          const lastName = student.lastName || user.lastName || '';
          const fullName = `${firstName} ${lastName}`.trim();
          return {
            studentId: student.studentId || student.id || student.userId,
            studentCode: student.studentCode || student.code,
            fullName: fullName || student.name || '',
          };
        })
        .filter((s) => s.studentId);
      setClassStudents(formatted);
    } catch (error) {
      console.error('Failed to fetch class students:', error);
      setClassStudents([]);
    }
  };

  const handleLoadClass = async (data) => {
    if (!data || !data.schedule) {
      console.warn('handleLoadClass: No schedule data received from API');
      return;
    }

    const {
      schedule,
      semesterId: semId,
      classId: clsId,
      semesterOptions: semOpt,
      subjectCode: subCode,
      subjectName: subName,
    } = data;

    let semStart;
    let semEnd;

    if (semOpt && semOpt.startDate && semOpt.endDate) {
      semStart = fromYMD(semOpt.startDate);
      semEnd = fromYMD(semOpt.endDate);
    } else if (schedule && schedule.length > 0) {
      const firstDate = fromYMD(schedule[0].date);
      semStart = mondayOf(firstDate);
      semEnd = addDays(semStart, 6 * 7);
    } else {
      console.error('Cannot determine semester dates');
      return;
    }

    setSemester({ id: semId, start: semStart, end: semEnd });

    let firstLessonDate = semStart;
    if (schedule.length > 0) {
      try {
        const firstDate = schedule[0].date;
        if (typeof firstDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(firstDate)) {
          firstLessonDate = fromYMD(firstDate);
        } else {
          const parsedDate = new Date(firstDate);
          if (!isNaN(parsedDate.getTime())) firstLessonDate = parsedDate;
        }
      } catch (e) {
        console.error('Error parsing first lesson date:', e);
      }
    }

    const weekStartMonday = mondayOf(firstLessonDate);
    setCurrentWeekStart(weekStartMonday);

    const convertedLessons = schedule.map((lesson) => {
      let dateStr = lesson.date;

      try {
        if (typeof lesson.date === 'string') {
          if (/^\d{4}-\d{2}-\d{2}$/.test(lesson.date)) {
            dateStr = lesson.date;
          } else {
            const parsedDate = new Date(lesson.date);
            dateStr = toYMD(parsedDate);
          }
        } else if (lesson.date instanceof Date) {
          dateStr = toYMD(lesson.date);
        } else {
          const parsedDate = new Date(lesson.date);
          if (!isNaN(parsedDate.getTime())) dateStr = toYMD(parsedDate);
        }
      } catch (e) {
        console.error('Error parsing date:', lesson.date, e);
        if (typeof lesson.date === 'string') {
          const match = lesson.date.match(/(\d{4}-\d{2}-\d{2})/);
          if (match) dateStr = match[1];
        }
      }

      const slot = lesson.timeId || 1;
      const roomName = lesson.roomName || '';
      const room = rooms.find((r) => r.label === roomName);
      const roomId = room ? room.value : null;

      const lecturerDisplay = lesson.lecturerEmail
        ? getEmailUsername(lesson.lecturerEmail)
        : (lesson.lecturerCode || '');

      return {
        lessonId: Number(lesson.lessonId || lesson.id),
        date: dateStr,
        slot,
        room: roomName,
        roomId,
        lecturer: lecturerDisplay,
        subjectCode: lesson.subjectCode || '',
        subjectName: lesson.subjectName || '',
        className: lesson.className || '',
        startTime: lesson.startTime || '',
        endTime: lesson.endTime || '',
        timeId: lesson.timeId,
        lecturerId: lesson.lecturerId || lesson.lectureId,
        isLoaded: true,
      };
    });

    setLoadedLessons(convertedLessons);

    const firstSubjectCode = subCode || schedule[0]?.subjectCode || '';
    const firstSubjectName = subName || schedule[0]?.subjectName || '';
    const firstClassName = schedule[0]?.className || '';

    if (firstSubjectCode) setSubjectCode(firstSubjectCode);
    if (firstSubjectName) setSubjectName(firstSubjectName);
    if (firstClassName) setClassName(firstClassName);

    setSemesterId(semId);
    setClassId(clsId);
    fetchClassStudents(clsId);
  };

  const handleLessonClick = (lesson) => {
    if (lesson && lesson.isLoaded) {
      setSelectedLesson(lesson);
      setEditModalVisible(true);
    }
  };

  // DELETE lesson
  const handleDeleteLesson = async (lessonId) => {
    const id = Number(lessonId);
    if (!id) return;

    try {
      setSaving(true);
      await ClassList.deleteLesson(id);

      setLoadedLessons((prev) => prev.filter((l) => Number(l.lessonId) !== id));
      setEditModalVisible(false);
      setSelectedLesson(null);

      notiApi.success({
        message: 'Success',
        description: 'Lesson deleted successfully',
        placement: 'bottomRight',
        duration: 3,
      });
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to delete lesson. Please try again.';

      notiApi.error({
        message: 'Error',
        description: errorMessage,
        placement: 'bottomRight',
        duration: 5,
      });
    } finally {
      setSaving(false);
    }
  };

  // DELETE ALL by subjectCode
  const handleDeleteAll = async (subCode) => {
    if (!subCode) {
      notiApi.error({
        message: 'Error',
        description: 'Missing subject code',
        placement: 'bottomRight',
        duration: 4,
      });
      return;
    }

    try {
      setSaving(true);
      const toDelete = loadedLessons.filter(
        (l) => (l.subjectCode || '').toString() === subCode.toString()
      );

      for (const lesson of toDelete) {
        if (lesson.lessonId) {
          try {
            await ClassList.deleteLesson(Number(lesson.lessonId));
          } catch (err) {
            console.error('Error deleting lesson', lesson.lessonId, err);
          }
        }
      }

      setLoadedLessons((prev) =>
        prev.filter((l) => (l.subjectCode || '').toString() !== subCode.toString())
      );

      notiApi.success({
        message: 'Success',
        description: `Deleted ${toDelete.length} lessons of ${subCode}`,
        placement: 'bottomRight',
        duration: 4,
      });

      setEditModalVisible(false);
      setSelectedLesson(null);
    } catch (error) {
      notiApi.error({
        message: 'Error',
        description:
          error?.response?.data?.message ||
          error?.message ||
          'Failed to delete all lessons',
        placement: 'bottomRight',
        duration: 5,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateLesson = async (lessonId, updatedData) => {
    const id = Number(lessonId);
    try {
      setSaving(true);
      await ClassList.updateLesson(id, updatedData);

      setLoadedLessons((prev) =>
        prev.map((l) => {
          if (Number(l.lessonId) === id) {
            const room = rooms.find((r) => r.value === String(updatedData.roomId));
            return {
              ...l,
              ...updatedData,
              room: room ? room.label : l.room,
              roomId: String(updatedData.roomId),
            };
          }
          return l;
        })
      );

      notiApi.success({
        message: 'Success',
        description: 'Lesson updated successfully',
        placement: 'bottomRight',
        duration: 3,
      });

      setEditModalVisible(false);
      setSelectedLesson(null);
    } catch (error) {
      notiApi.error({
        message: 'Error',
        description: error?.response?.data?.message || 'Failed to update lesson',
        placement: 'bottomRight',
        duration: 5,
      });
    } finally {
      setSaving(false);
    }
  };

  // Batch transfer giữ nguyên logic của bạn (không đổi)
  const handleBatchTransfer = async (transferData) => {
    console.log('=== handleBatchTransfer in EditSchedule ===');
    console.log('transferData:', transferData);

    const { subjectCode, patterns, lecturerId: transferLecturerId, deleteOnly } = transferData;

    if (!subjectCode) {
      notiApi.error({
        message: 'Error',
        description: 'Subject code is required',
        placement: 'bottomRight',
        duration: 4,
      });
      return;
    }

    if (!deleteOnly) {
      if (!patterns || patterns.length === 0) {
        notiApi.error({
          message: 'Error',
          description: 'Invalid transfer data',
          placement: 'bottomRight',
          duration: 4,
        });
        return;
      }
      if (!transferLecturerId) {
        notiApi.error({
          message: 'Error',
          description: 'Lecturer information is required',
          placement: 'bottomRight',
          duration: 4,
        });
        return;
      }
    }

    try {
      setSaving(true);

      const lessonsToDelete = loadedLessons.filter(
        (l) => (l.subjectCode || '').toString() === subjectCode.toString()
      );

      for (const lesson of lessonsToDelete) {
        if (lesson.lessonId) {
          try {
            await ClassList.deleteLesson(Number(lesson.lessonId));
          } catch (error) {
            console.error(`Error deleting lesson ${lesson.lessonId}:`, error);
          }
        }
      }

      setLoadedLessons((prev) =>
        prev.filter((l) => (l.subjectCode || '').toString() !== subjectCode.toString())
      );

      if (deleteOnly) {
        notiApi.success({
          message: 'Success',
          description: `Deleted ${lessonsToDelete.length} lesson(s) successfully`,
          placement: 'bottomRight',
          duration: 5,
        });

        setEditModalVisible(false);
        setSelectedLesson(null);
        return;
      }

      const effectiveSemesterId = semester.id || semesterId;

      if (!effectiveSemesterId || !classId || !transferLecturerId) {
        throw new Error('Missing semester, class, or lecturer information');
      }

      const payload = {
        semesterId: parseInt(effectiveSemesterId, 10),
        classId: parseInt(classId, 10),
        lecturerId: parseInt(transferLecturerId, 10),
        patterns,
      };

      await ClassList.createSchedule(payload);

      if (effectiveSemesterId && classId) {
        const scheduleData = await ClassList.getSchedule(effectiveSemesterId, classId);
        if (scheduleData && scheduleData.schedule) {
          const convertedLessons = scheduleData.schedule.map((lesson) => {
            let dateStr = lesson.date;
            try {
              if (typeof lesson.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(lesson.date)) {
                dateStr = lesson.date;
              } else {
                const parsedDate = new Date(lesson.date);
                dateStr = toYMD(parsedDate);
              }
            } catch (e) {
              console.error('Error parsing date:', lesson.date, e);
            }

            const slot = lesson.timeId || 1;
            const roomName = lesson.roomName || '';
            const room = rooms.find((r) => r.label === roomName);
            const roomId = room ? room.value : null;

            const lecturerDisplay = lesson.lecturerEmail
              ? getEmailUsername(lesson.lecturerEmail)
              : (lesson.lecturerCode || '');

            return {
              lessonId: Number(lesson.lessonId || lesson.id),
              date: dateStr,
              slot,
              room: roomName,
              roomId,
              lecturer: lecturerDisplay,
              subjectCode: lesson.subjectCode || '',
              subjectName: lesson.subjectName || '',
              className: lesson.className || '',
              startTime: lesson.startTime || '',
              endTime: lesson.endTime || '',
              timeId: lesson.timeId,
              lecturerId: lesson.lecturerId || lesson.lectureId,
              subjectId: lesson.subjectId,
              isLoaded: true,
            };
          });

          setLoadedLessons(convertedLessons);
        }
      }

      notiApi.success({
        message: 'Success',
        description: 'Batch transfer completed successfully',
        placement: 'bottomRight',
        duration: 5,
      });

      setEditModalVisible(false);
      setSelectedLesson(null);
    } catch (error) {
      notiApi.error({
        message: 'Error',
        description: error?.response?.data?.message || 'Failed to transfer lessons',
        placement: 'bottomRight',
        duration: 5,
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePrevWeek = () => {
    if (!year || !weekNumber) return;
    const currentDate = dayjs().year(year).isoWeek(weekNumber).isoWeekday(1);
    const prevDate = currentDate.subtract(1, 'week');
    setWeekNumber(prevDate.isoWeek());
    if (prevDate.year() !== year) setYear(prevDate.year());
  };

  const handleNextWeek = () => {
    if (!year || !weekNumber) return;
    const currentDate = dayjs().year(year).isoWeek(weekNumber).isoWeekday(1);
    const nextDate = currentDate.add(1, 'week');
    setWeekNumber(nextDate.isoWeek());
    if (nextDate.year() !== year) setYear(nextDate.year());
  };

  const handleYearChange = (newYear) => {
    setYear(newYear);
    setWeekNumber((prev) => {
      const testDate = dayjs().year(newYear).isoWeek(prev);
      return testDate.isValid() ? prev : 1;
    });
  };

  const handleWeekChange = (newWeekNumber) => {
    setWeekNumber(newWeekNumber);
  };

  const renderCalendar = (weekStart) => {
    if (!weekStart) return { columns: [], dataSource: [] };

    // ✅ timeslots is always array, but still guard for safety
    const timeslotsArr = Array.isArray(timeslots) ? timeslots : [];

    const slotsToRender =
      timeslotsArr.length > 0
        ? timeslotsArr.map((ts) => ({
          timeId: ts.timeId,
          label: `Slot ${ts.timeId}`,
        }))
        : Array.from({ length: 8 }, (_, i) => ({
          timeId: i + 1,
          label: `Slot ${i + 1}`,
        }));

    const holidayLookup = holidays.reduce((acc, holiday) => {
      if (holiday.date) {
        acc[holiday.date] =
          holiday.name ||
          holiday.holidayName ||
          holiday.reason ||
          holiday.description ||
          'Holiday';
      }
      return acc;
    }, {});

    const columns = [
      {
        title: 'Slot / Day',
        dataIndex: 'slotLabel',
        key: 'slotLabel',
        fixed: 'left',
        width: 140,
      },
      ...['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayLabel, idx) => {
        const dayDate = addDays(weekStart, idx);
        const dateStr = toYMD(dayDate);
        const [, month, day] = dateStr.split('-');
        const formattedDate = `${day}/${month}`;

        return {
          title: (
            <div style={{ textAlign: 'center' }}>
              <div>{dayLabel}</div>
              <div style={{ fontSize: 12, fontWeight: 'normal', color: '#666' }}>
                {formattedDate}
              </div>
            </div>
          ),
          dataIndex: `day${idx}`,
          key: `day${idx}`,
          align: 'left',
          render: (content) => content || '',
        };
      }),
    ];

    const dataSource = slotsToRender.map((slotInfo) => {
      const slot = slotInfo.timeId;
      const row = { key: `slot-${slot}`, slotLabel: slotInfo.label };

      Array.from({ length: 7 }).forEach((_, dayIdx) => {
        const dayDate = addDays(weekStart, dayIdx);
        const dateStr = toYMD(dayDate);
        const holidayName = holidayLookup[dateStr];

        const loadedLesson = loadedLessons.find((l) => {
          if (!l.date) return false;
          const lessonTimeId = l.timeId || l.slot;
          return l.date === dateStr && Number(lessonTimeId) === Number(slot);
        });

        const cellContents = [];
        let cellStyle = {};
        const classNames = [];

        if (holidayName) classNames.push('holiday-cell');

        if (loadedLesson) {
          const parts = [];
          if (loadedLesson.subjectCode) parts.push(loadedLesson.subjectCode);
          if (loadedLesson.room) parts.push(loadedLesson.room);
          if (loadedLesson.lecturer) parts.push(loadedLesson.lecturer);

          cellContents.push(parts.length > 0 ? parts.join(' | ') : '');
          cellStyle = {
            backgroundColor: '#e3f2fd',
            color: '#1976d2',
            fontWeight: 'bold',
            border: '2px solid #1976d2',
            cursor: 'pointer',
          };
          classNames.push('lesson-loaded', 'lesson-clickable');
        }

        if (holidayName) {
          const holidayTag = (
            <Tag key="holiday" color="gold" style={{ marginBottom: 4 }}>
              {holidayName}
            </Tag>
          );
          if (cellContents.length === 0) cellContents.push(holidayTag);
          else cellContents.unshift(holidayTag);

          cellStyle = {
            ...cellStyle,
            backgroundColor: cellStyle.backgroundColor || '#fffde7',
            border: '2px dashed #fbc02d',
            color: cellStyle.color || '#f57f17',
          };
        }

        const cellClassName = classNames.join(' ').trim();
        row[`day${dayIdx}`] = (
          <div
            className={`calendar-cell ${cellClassName}`}
            style={cellStyle}
            onClick={() => loadedLesson && handleLessonClick(loadedLesson)}
            title={loadedLesson ? 'Click to edit or delete' : ''}
          >
            {cellContents.length > 0
              ? cellContents.map((content, idx2) =>
                typeof content === 'string'
                  ? <div key={idx2}>{content}</div>
                  : React.cloneElement(content, { key: idx2 })
              )
              : ''}
          </div>
        );
      });

      return row;
    });

    return { columns, dataSource };
  };

  if (loading) {
    return (
      <Layout className="edit-schedule-app">
        <Layout.Content className="edit-schedule-main" style={{ padding: 40, textAlign: 'center' }}>
          <Space direction="vertical" size="large">
            <Spin size="large" />
            <Typography.Text type="secondary">Loading data...</Typography.Text>
          </Space>
        </Layout.Content>
      </Layout>
    );
  }

  return (
    <Layout className="edit-schedule-app">
      {contextHolder}
      <Layout.Content className="edit-schedule-main">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div className="edit-schedule-header-panel">
            <Typography.Title level={3} style={{ margin: 0 }}>
              Edit Class Timetable
            </Typography.Title>
            <Typography.Text type="secondary">
              Select semester & class, then click on a lesson to edit or delete it.
            </Typography.Text>

            <Space size="small" wrap style={{ marginTop: 8 }}>
              {subjectCode && subjectName && (
                <Tag icon={<BookOutlined />} color="processing">
                  {subjectCode} — {subjectName}
                </Tag>
              )}
              {lecturerCode && (
                <Tag icon={<UserOutlined />} color="blue">
                  {lecturerCode}
                </Tag>
              )}
              {holidays.length > 0 && (
                <Tag icon={<CalendarOutlined />} color="gold">
                  {holidays.length} holidays loaded
                </Tag>
              )}
            </Space>
          </div>

          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <PickSemesterAndClass
                semesterId={semesterId}
                classId={classId}
                onSemesterChange={setSemesterId}
                onClassChange={setClassId}
                onLoadClass={handleLoadClass}
              />
            </Col>
          </Row>

          <CalendarTable
            title="Class Timetable"
            weekStart={currentWeekStart}
            weekRange={currentWeekStart ? getWeekRange(currentWeekStart) : 'Week'}
            onPrevWeek={handlePrevWeek}
            onNextWeek={handleNextWeek}
            renderCalendar={() => renderCalendar(currentWeekStart)}
            year={year}
            onYearChange={handleYearChange}
            weekNumber={weekNumber}
            onWeekChange={handleWeekChange}
            weekLabel={
              currentWeekStart
                ? `${dayjs(currentWeekStart).format('DD/MM')} - ${dayjs(addDays(currentWeekStart, 6)).format('DD/MM')}`
                : ''
            }
          />
        </Space>
      </Layout.Content>

      <LessonEditModal
        visible={editModalVisible}
        lesson={selectedLesson}
        rooms={rooms}
        timeslots={timeslots}
        lecturers={[]}
        semester={semester}
        onUpdate={handleUpdateLesson}
        onDelete={handleDeleteLesson}
        onDeleteAllLessons={handleDeleteAll}
        onBatchTransfer={handleBatchTransfer}
        onCancel={() => {
          setEditModalVisible(false);
          setSelectedLesson(null);
        }}
        saving={saving}
        conflictMap={conflictMap}
        holidays={holidays}
        studentScheduleCache={studentScheduleCache}
        classId={classId}
        lecturerId={lecturerId}
      />
    </Layout>
  );
};

export default EditSchedule;
