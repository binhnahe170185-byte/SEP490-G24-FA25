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
  const [conflictMapSize, setConflictMapSize] = useState(0);
  const [semesterLessons, setSemesterLessons] = useState([]);
  const [loadingSemesterLessons, setLoadingSemesterLessons] = useState(false);
  const [studentScheduleCache, setStudentScheduleCache] = useState({
    studentIds: [],
    studentTimeMap: {},
  });
  const [loadingStudentCache, setLoadingStudentCache] = useState(false);

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

  // Load semester lessons and build conflict map
  useEffect(() => {
    const loadSemesterLessons = async () => {
      const semId = semester.id || semesterId;
      if (!semId) {
        setSemesterLessons([]);
        setConflictMap({});
        setConflictMapSize(0);
        return;
      }

      try {
        setLoadingSemesterLessons(true);
        console.log('Loading semester lessons for semester:', semId);
        const lessons = await ClassList.getAllLessonsBySemester(semId);
        console.log('Loaded semester lessons:', lessons?.length || 0);
        setSemesterLessons(lessons || []);

        // Build conflict map: key = "date|slot|room", value = array of conflicts
        const newConflictMap = {};
        (lessons || []).forEach(lesson => {
          if (!lesson.date || !lesson.timeId || !lesson.roomId) {
            console.warn('Invalid lesson data:', lesson);
            return;
          }
          const key = `${lesson.date}|${lesson.timeId}|${lesson.roomId}`;
          if (!newConflictMap[key]) {
            newConflictMap[key] = [];
          }
          // Get lecturer display (prioritize email if available, then substring before @)
          const lecturerDisplay = lesson.lecturerEmail
            ? getEmailUsername(lesson.lecturerEmail)
            : (lesson.lecturerCode || '');

          newConflictMap[key].push({
            lessonId: lesson.lessonId || lesson.id,
            classId: lesson.classId,
            className: lesson.className,
            lecturerId: lesson.lecturerId,
            lecturerCode: lecturerDisplay,
            date: lesson.date,
            timeId: lesson.timeId,
            roomId: lesson.roomId,
            roomName: lesson.roomName
          });
        });

        const mapSize = Object.keys(newConflictMap).length;
        console.log('Built conflict map with', mapSize, 'keys');
        setConflictMap(newConflictMap);
        setConflictMapSize(mapSize);
      } catch (error) {
        console.error('Failed to load semester lessons:', error);
        setSemesterLessons([]);
        setConflictMap({});
        setConflictMapSize(0);
      } finally {
        setLoadingSemesterLessons(false);
      }
    };

    loadSemesterLessons();
  }, [semester.id, semesterId]);

  // Load student schedule cache when class and semester are selected
  useEffect(() => {
    const loadStudentScheduleCache = async () => {
      const semId = semester.id || semesterId;
      if (!semId || !classId) {
        setStudentScheduleCache({ studentIds: [], studentTimeMap: {} });
        return;
      }

      try {
        setLoadingStudentCache(true);
        console.log('Loading student schedule cache for class:', classId, 'semester:', semId);
        const cache = await ClassList.getStudentScheduleCache(classId, semId);
        console.log('Loaded student schedule cache:', cache);

        // Convert backend format to frontend format
        const studentTimeMap = {};
        if (cache.studentTimeMap) {
          Object.keys(cache.studentTimeMap).forEach(studentId => {
            const timeSet = cache.studentTimeMap[studentId];
            // Convert array to Set if needed
            studentTimeMap[parseInt(studentId, 10)] = new Set(Array.isArray(timeSet) ? timeSet : []);
          });
        }

        setStudentScheduleCache({
          studentIds: cache.studentIds || [],
          studentTimeMap: studentTimeMap
        });
      } catch (error) {
        console.error('Failed to load student schedule cache:', error);
        setStudentScheduleCache({ studentIds: [], studentTimeMap: {} });
      } finally {
        setLoadingStudentCache(false);
      }
    };

    loadStudentScheduleCache();
  }, [classId, semester.id, semesterId]);

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

  // Check if a date-slot-room combination has conflict using conflict map
  // Exclude currentLessonId to avoid false positives when editing existing lesson
  const checkConflictFromMap = (date, timeId, roomId, currentClassId, currentLecturerId, currentLessonId = null) => {
    const reasons = [];
    let hasConflict = false;

    // Check all conflicts for this date+timeId combination (not just specific room)
    const timeKey = `${date}|${timeId}`;
    const roomKey = `${date}|${timeId}|${roomId}`;

    // Check room-specific conflicts
    const roomConflicts = conflictMap[roomKey] || [];
    roomConflicts.forEach(conflict => {
      // Exclude current lesson being edited
      if (currentLessonId && conflict.lessonId === currentLessonId) {
        return;
      }
      // Room conflict: room is occupied by any OTHER class (exclude current class)
      if (conflict.roomId === parseInt(roomId, 10)) {
        // Exclude if it's the same class - room conflict only for other classes
        if (!currentClassId || conflict.classId !== parseInt(currentClassId, 10)) {
          reasons.push(`Room ${conflict.roomName} is occupied by ${conflict.className}`);
          hasConflict = true;
        }
      }
    });

    // Check all conflicts for this date+timeId (to catch class and lecturer conflicts regardless of room)
    Object.keys(conflictMap).forEach(key => {
      if (key.startsWith(timeKey + '|')) {
        const conflicts = conflictMap[key] || [];
        conflicts.forEach(conflict => {
          // Exclude current lesson being edited
          if (currentLessonId && conflict.lessonId === currentLessonId) {
            return;
          }
          // Class conflict: same class already has lesson at this date/time (even different room)
          if (currentClassId && conflict.classId === parseInt(currentClassId, 10)) {
            // Only add once
            if (!reasons.some(r => r.includes('Class') && r.includes('already has a lesson'))) {
              reasons.push(`Class ${conflict.className} already has a lesson at this time`);
              hasConflict = true;
            }
          }

          // Lecturer conflict: same lecturer already has lesson (exclude if same class)
          if (currentLecturerId && conflict.lecturerId === parseInt(currentLecturerId, 10)) {
            // If same lecturer teaching same class, it's not a conflict (they can teach same class)
            // But if teaching different class at same time, it's a conflict
            if (!currentClassId || conflict.classId !== parseInt(currentClassId, 10)) {
              const lecturerDisplay = conflict.lecturerCode || 'Unknown';
              // Only add once per lecturer
              if (!reasons.some(r => r.includes('Lecturer') && r.includes(lecturerDisplay))) {
                reasons.push(`Lecturer ${lecturerDisplay} is already teaching ${conflict.className} at this time`);
                hasConflict = true;
              }
            }
          }
        });
      }
    });

    return { hasConflict, reasons };
  };

  // Check student conflicts
  const checkStudentConflict = (date, timeId, currentLessonId = null) => {
    if (!studentScheduleCache.studentIds || studentScheduleCache.studentIds.length === 0) {
      return { hasConflict: false, reasons: [] };
    }

    const classTimeKey = `${date}|${timeId}`;
    const conflictedStudents = [];

    studentScheduleCache.studentIds.forEach(studentId => {
      const studentSlots = studentScheduleCache.studentTimeMap[studentId];
      if (studentSlots && studentSlots.has(classTimeKey)) {
        // Note: We can't exclude by lessonId here because studentTimeMap doesn't have lessonId info
        // But this is okay - if student already has a lesson at this time, it's still a conflict
        conflictedStudents.push(studentId);
      }
    });

    if (conflictedStudents.length > 0) {
      return {
        hasConflict: true,
        reasons: [`${conflictedStudents.length} student(s) already have lessons at this time`]
      };
    }

    return { hasConflict: false, reasons: [] };
  };

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

  // Helper function to check and format error message for attendance/homework errors
  const getDeleteErrorMessage = (error) => {
    const errorMessage = error?.response?.data?.message || error?.message || '';

    // Check if error is about attendance or homework
    if (errorMessage.toLowerCase().includes('attendance') ||
      errorMessage.toLowerCase().includes('homework')) {
      return 'The class has active schedule and is in operation. Cannot delete this schedule.';
    }

    return errorMessage || 'Failed to delete lesson. Please try again.';
  };

  // DELETE lesson
  const handleDeleteLesson = async (lessonId) => {
    const id = Number(lessonId);
    if (!id) return;

    try {
      setSaving(true);
      await ClassList.deleteLesson(id);

      setLoadedLessons((prev) => prev.filter((l) => Number(l.lessonId) !== id));

      // Reload semester lessons to update conflict map
      const semId = semester.id || semesterId;
      if (semId) {
        try {
          const lessons = await ClassList.getAllLessonsBySemester(semId);
          setSemesterLessons(lessons || []);

          // Rebuild conflict map
          const newConflictMap = {};
          (lessons || []).forEach(lesson => {
            if (!lesson.date || !lesson.timeId || !lesson.roomId) {
              return;
            }
            const key = `${lesson.date}|${lesson.timeId}|${lesson.roomId}`;
            if (!newConflictMap[key]) {
              newConflictMap[key] = [];
            }
            const lecturerDisplay = lesson.lecturerEmail
              ? getEmailUsername(lesson.lecturerEmail)
              : (lesson.lecturerCode || '');

            newConflictMap[key].push({
              lessonId: lesson.lessonId || lesson.id,
              classId: lesson.classId,
              className: lesson.className,
              lecturerId: lesson.lecturerId,
              lecturerCode: lecturerDisplay,
              date: lesson.date,
              timeId: lesson.timeId,
              roomId: lesson.roomId,
              roomName: lesson.roomName
            });
          });

          setConflictMap(newConflictMap);
          setConflictMapSize(Object.keys(newConflictMap).length);
        } catch (error) {
          console.error('Failed to reload conflict map:', error);
        }
      }

      setEditModalVisible(false);
      setSelectedLesson(null);

      notiApi.success({
        message: 'Success',
        description: 'Lesson deleted successfully',
        placement: 'bottomRight',
        duration: 3,
      });
    } catch (error) {
      const errorMessage = getDeleteErrorMessage(error);

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

      let deletedCount = 0;
      let hasError = false;
      let errorMessage = '';

      for (const lesson of toDelete) {
        if (lesson.lessonId) {
          try {
            await ClassList.deleteLesson(Number(lesson.lessonId));
            deletedCount++;
          } catch (err) {
            console.error('Error deleting lesson', lesson.lessonId, err);
            hasError = true;
            const errMsg = getDeleteErrorMessage(err);
            if (!errorMessage) {
              errorMessage = errMsg;
            }
          }
        }
      }

      // If there were errors, show error notification and stop
      if (hasError) {
        notiApi.error({
          message: 'Error',
          description: errorMessage,
          placement: 'bottomRight',
          duration: 5,
        });
        setSaving(false);
        return;
      }

      // Only show success if all deletions succeeded
      notiApi.success({
        message: 'Success',
        description: `Deleted Schedule of ${subCode}`,
        placement: 'bottomRight',
        duration: 4,
      });

      // Update loaded lessons - remove successfully deleted ones
      setLoadedLessons((prev) =>
        prev.filter((l) => (l.subjectCode || '').toString() !== subCode.toString())
      );

      // Reload semester lessons to update conflict map
      const semId = semester.id || semesterId;
      if (semId) {
        try {
          const lessons = await ClassList.getAllLessonsBySemester(semId);
          setSemesterLessons(lessons || []);

          // Rebuild conflict map
          const newConflictMap = {};
          (lessons || []).forEach(lesson => {
            if (!lesson.date || !lesson.timeId || !lesson.roomId) {
              return;
            }
            const key = `${lesson.date}|${lesson.timeId}|${lesson.roomId}`;
            if (!newConflictMap[key]) {
              newConflictMap[key] = [];
            }
            const lecturerDisplay = lesson.lecturerEmail
              ? getEmailUsername(lesson.lecturerEmail)
              : (lesson.lecturerCode || '');

            newConflictMap[key].push({
              lessonId: lesson.lessonId || lesson.id,
              classId: lesson.classId,
              className: lesson.className,
              lecturerId: lesson.lecturerId,
              lecturerCode: lecturerDisplay,
              date: lesson.date,
              timeId: lesson.timeId,
              roomId: lesson.roomId,
              roomName: lesson.roomName
            });
          });

          setConflictMap(newConflictMap);
          setConflictMapSize(Object.keys(newConflictMap).length);
        } catch (error) {
          console.error('Failed to reload conflict map:', error);
        }
      }

      setEditModalVisible(false);
      setSelectedLesson(null);
    } catch (error) {
      const errorMessage = getDeleteErrorMessage(error);
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

  const handleUpdateLesson = async (lessonId, updatedData) => {
    const id = Number(lessonId);
    try {
      setSaving(true);
      await ClassList.updateLesson(id, updatedData);

      setLoadedLessons((prev) =>
        prev.map((l) => {
          if (Number(l.lessonId) === id) {
            const room = rooms.find((r) => r.value === String(updatedData.roomId));
            const lecturerOpt = lecturers.find((lec) => String(lec.value) === String(updatedData.lecturerId));
            return {
              ...l,
              ...updatedData,
              room: room ? room.label : l.room,
              roomId: String(updatedData.roomId),
              // Cập nhật luôn display name của lecturer để calendar hiển thị đúng
              lecturer: lecturerOpt ? lecturerOpt.label : l.lecturer,
            };
          }
          return l;
        })
      );

      // Reload semester lessons to update conflict map
      const semId = semester.id || semesterId;
      if (semId) {
        try {
          const lessons = await ClassList.getAllLessonsBySemester(semId);
          setSemesterLessons(lessons || []);

          // Rebuild conflict map
          const newConflictMap = {};
          (lessons || []).forEach(lesson => {
            if (!lesson.date || !lesson.timeId || !lesson.roomId) {
              return;
            }
            const key = `${lesson.date}|${lesson.timeId}|${lesson.roomId}`;
            if (!newConflictMap[key]) {
              newConflictMap[key] = [];
            }
            const lecturerDisplay = lesson.lecturerEmail
              ? getEmailUsername(lesson.lecturerEmail)
              : (lesson.lecturerCode || '');

            newConflictMap[key].push({
              lessonId: lesson.lessonId || lesson.id,
              classId: lesson.classId,
              className: lesson.className,
              lecturerId: lesson.lecturerId,
              lecturerCode: lecturerDisplay,
              date: lesson.date,
              timeId: lesson.timeId,
              roomId: lesson.roomId,
              roomName: lesson.roomName
            });
          });

          setConflictMap(newConflictMap);
          setConflictMapSize(Object.keys(newConflictMap).length);
        } catch (error) {
          console.error('Failed to reload conflict map:', error);
        }
      }

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

      let deletedCount = 0;
      let hasDeleteError = false;
      let deleteErrorMessage = '';

      for (const lesson of lessonsToDelete) {
        if (lesson.lessonId) {
          try {
            await ClassList.deleteLesson(Number(lesson.lessonId));
            deletedCount++;
          } catch (error) {
            console.error(`Error deleting lesson ${lesson.lessonId}:`, error);
            hasDeleteError = true;
            const errMsg = getDeleteErrorMessage(error);
            if (!deleteErrorMessage) {
              deleteErrorMessage = errMsg;
            }
          }
        }
      }

      // If there were errors deleting lessons, show error and stop
      if (hasDeleteError) {
        notiApi.error({
          message: 'Error',
          description: deleteErrorMessage,
          placement: 'bottomRight',
          duration: 5,
        });
        setSaving(false);
        return;
      }

      setLoadedLessons((prev) =>
        prev.filter((l) => (l.subjectCode || '').toString() !== subjectCode.toString())
      );

      if (deleteOnly) {
        notiApi.success({
          message: 'Success',
          description: `Deleted ${deletedCount} lesson(s) successfully`,
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
    const prevWeekNumber = prevDate.isoWeek();
    // For ISO week, the year is determined by the year of Thursday (day 4) in that week
    // This ensures correct year assignment for weeks that span across calendar years
    const prevWeekThursday = prevDate.isoWeekday(4);
    const prevWeekYear = prevWeekThursday.year();

    setWeekNumber(prevWeekNumber);
    // Check if ISO week year changed
    if (prevWeekYear !== year) {
      setYear(prevWeekYear);
    }
  };

  const handleNextWeek = () => {
    if (!year || !weekNumber) return;
    const currentDate = dayjs().year(year).isoWeek(weekNumber).isoWeekday(1);
    const nextDate = currentDate.add(1, 'week');
    const nextWeekNumber = nextDate.isoWeek();
    // For ISO week, the year is determined by the year of Thursday (day 4) in that week
    // This ensures correct year assignment for weeks that span across calendar years
    const nextWeekThursday = nextDate.isoWeekday(4);
    const nextWeekYear = nextWeekThursday.year();

    setWeekNumber(nextWeekNumber);
    // Check if ISO week year changed
    if (nextWeekYear !== year) {
      setYear(nextWeekYear);
    }
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
            <Tag
              key="holiday"
              color="gold"
              title={holidayName} // Show full name on hover
            >
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
        lecturers={lecturers}
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
