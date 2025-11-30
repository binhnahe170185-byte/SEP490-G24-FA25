import React, { useState, useEffect } from 'react';
import './EditSchedule.css';
import CalendarTable from '../createSchedule/components/CalendarTable';
import PickSemesterAndClass from '../createSchedule/components/PickSemesterAndClass';
import LecturerSelector from '../createSchedule/components/LecturerSelector';
import LessonEditModal from './components/LessonEditModal';
import SemesterApi from '../../../vn.fpt.edu.api/Semester';
import RoomApi from '../../../vn.fpt.edu.api/Room';
import TimeslotApi from '../../../vn.fpt.edu.api/Timeslot';
import HolidayApi from '../../../vn.fpt.edu.api/Holiday';
import ClassList from '../../../vn.fpt.edu.api/ClassList';
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

const { confirm } = Modal;

const EditSchedule = () => {
  const [api, contextHolder] = notification.useNotification();

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

  const [semester, setSemester] = useState({ id: null, start: null, end: null });

  const [semesterData, setSemesterData] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [timeslots, setTimeslots] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classStudents, setClassStudents] = useState([]);

  // State cho conflict checking (batch transfer)
  const [semesterLessons, setSemesterLessons] = useState([]);
  const [conflictMap, setConflictMap] = useState({});
  const [studentScheduleCache, setStudentScheduleCache] = useState({
    studentIds: [],
    studentTimeMap: {}
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

  const clampWeekStartWithinSemester = (weekStart, semStart = null, semEnd = null) => {
    const startDate = semStart || semester.start;
    const endDate = semEnd || semester.end;
    if (!startDate || !endDate) return weekStart;
    const s = mondayOf(startDate);
    const e = mondayOf(endDate);
    if (weekStart < s) return s;
    if (weekStart > e) return e;
    return weekStart;
  };

  const getWeekRange = (weekStart) =>
    `Week ${toYMD(weekStart)} → ${toYMD(addDays(weekStart, 6))}`;

  const normalizeDateString = (rawDate) => {
    if (!rawDate) return '';
    if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      return rawDate;
    }
    try {
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) {
        return toYMD(parsed);
      }
    } catch {
      // ignore
    }
    return String(rawDate);
  };

  // Fetch static data
  useEffect(() => {
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
        setSemesterData(formattedSemesters);

        const roomsResponse = await RoomApi.getRooms({ pageSize: 100 });
        const roomsList = roomsResponse.items || [];
        const formattedRooms = roomsList.map((room) => ({
          value: String(room.roomId),
          label: room.roomName,
        }));
        setRooms(formattedRooms);

        const timeslotsList = await TimeslotApi.getTimeslots();
        setTimeslots(timeslotsList);
      } catch (error) {
        console.error('Error fetching data:', error);
        setRooms([]);
        setTimeslots([]);
        setSemesterData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
        setSemester((prev) => ({
          ...prev,
          id: semesterId,
        }));
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
        const formattedHolidays = holidaysList.map((holiday) => ({
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
        setHolidays(formattedHolidays);
      } catch (error) {
        console.error('Error fetching holidays:', error);
        setHolidays([]);
      }
    };

    fetchHolidays();
  }, [semester.id, semesterId]);

  // Load all lessons of semester for conflict checking
  useEffect(() => {
    const loadSemesterLessons = async () => {
      const semId = semester.id || semesterId;
      if (!semId) {
        setSemesterLessons([]);
        setConflictMap({});
        return;
      }

      try {
        const lessons = await ClassList.getAllLessonsBySemester(semId);
        setSemesterLessons(lessons || []);

        // Build conflict map: key = "date|slot|room", value = array of conflicts
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
            ? lesson.lecturerEmail.substring(0, lesson.lecturerEmail.indexOf('@'))
            : (lesson.lecturerCode || '');

          newConflictMap[key].push({
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
      } catch (error) {
        console.error('Failed to load semester lessons:', error);
        setSemesterLessons([]);
        setConflictMap({});
      }
    };

    loadSemesterLessons();
  }, [semester.id, semesterId]);

  // Load student schedule cache for conflict checking
  useEffect(() => {
    const loadStudentScheduleCache = async () => {
      const semId = semester.id || semesterId;
      if (!semId || !classId) {
        setStudentScheduleCache({ studentIds: [], studentTimeMap: {} });
        return;
      }

      try {
        const cache = await ClassList.getStudentScheduleCache(classId, semId);
        const studentTimeMap = {};
        if (cache.studentTimeMap) {
          Object.keys(cache.studentTimeMap).forEach(studentId => {
            const timeSet = cache.studentTimeMap[studentId];
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
      }
    };

    loadStudentScheduleCache();
  }, [classId, semester.id, semesterId]);

  // Init week
  useEffect(() => {
    const today = new Date();
    setCurrentWeekStart(mondayOf(today));
  }, []);

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
        .filter((student) => student.studentId);
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

    setSemester({
      id: semId,
      start: semStart,
      end: semEnd,
    });

    let firstLessonDate = semStart;
    if (schedule.length > 0) {
      try {
        const firstDate = schedule[0].date;
        if (typeof firstDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(firstDate)) {
          firstLessonDate = fromYMD(firstDate);
        } else {
          const parsedDate = new Date(firstDate);
          if (!isNaN(parsedDate.getTime())) {
            firstLessonDate = parsedDate;
          }
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
          if (!isNaN(parsedDate.getTime())) {
            dateStr = toYMD(parsedDate);
          }
        }
      } catch (e) {
        console.error('Error parsing date:', lesson.date, e);
        if (typeof lesson.date === 'string') {
          const match = lesson.date.match(/(\d{4}-\d{2}-\d{2})/);
          if (match) dateStr = match[1];
        }
      }

      const lessonDate = fromYMD(dateStr);
      const dayOfWeek = lessonDate.getDay();
      const weekday = dayOfWeek === 0 ? 8 : dayOfWeek + 1;

      const slot = lesson.timeId || 1;
      const roomName = lesson.roomName || '';
      const room = rooms.find((r) => r.label === roomName);
      const roomId = room ? room.value : null;

      return {
        lessonId: Number(lesson.lessonId || lesson.id),
        date: dateStr,
        weekday,
        slot,
        room: roomName,
        roomId,
        lecturer: lesson.lecturerCode || '',
        subjectCode: lesson.subjectCode || '',
        subjectName: lesson.subjectName || '',
        subjectId: lesson.subjectId || null, // Thêm subjectId
        className: lesson.className || '',
        startTime: lesson.startTime || '',
        endTime: lesson.endTime || '',
        timeId: lesson.timeId,
        lectureId: lesson.lectureId || lesson.lecturerId,
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

  // === DELETE LESSON ===
  const handleDeleteLesson = async (lessonId) => {
    const id = Number(lessonId);
    console.log('handleDeleteLesson called with lessonId:', id);

    if (!id) {
      console.error('handleDeleteLesson: lessonId is invalid', lessonId);
      return;
    }

    try {
      setSaving(true);
      console.log('Calling ClassList.deleteLesson with lessonId:', id);

      const response = await ClassList.deleteLesson(id);
      console.log('Delete API call successful, response:', response);

      // Xóa khỏi loadedLessons
      setLoadedLessons((prev) => {
        const filtered = prev.filter((l) => Number(l.lessonId) !== id);
        console.log(
          'Updated loadedLessons, removed lesson:',
          id,
          'remaining:',
          filtered.length
        );
        return filtered;
      });

      // Đóng modal edit
      setEditModalVisible(false);
      setSelectedLesson(null);

      api.success({
        message: 'Success',
        description: 'Lesson deleted successfully',
        placement: 'bottomRight',
        duration: 3,
      });
    } catch (error) {
      console.error('Error deleting lesson:', error);
      console.error('Error response:', error?.response);
      console.error('Error data:', error?.response?.data);
      console.error('Error message:', error?.message);

      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to delete lesson. Please try again.';

      api.error({
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
            const room = rooms.find(
              (r) => r.value === String(updatedData.roomId)
            );
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

      api.success({
        message: 'Success',
        description: 'Lesson updated successfully',
        placement: 'bottomRight',
        duration: 3,
      });

      setEditModalVisible(false);
      setSelectedLesson(null);
    } catch (error) {
      console.error('Error updating lesson:', error);
      api.error({
        message: 'Error',
        description:
          error?.response?.data?.message || 'Failed to update lesson',
        placement: 'bottomRight',
        duration: 5,
      });
    } finally {
      setSaving(false);
    }
  };
  const handleBatchTransfer = async (transferData) => {
    console.log('=== handleBatchTransfer in EditSchedule ===');
    console.log('transferData:', transferData);

    const { subjectCode, patterns, lecturerId: transferLecturerId, deleteOnly } = transferData;

    if (!subjectCode) {
      console.error('Invalid transfer data: missing subjectCode');
      api.error({
        message: 'Error',
        description: 'Subject code is required',
        placement: 'bottomRight',
        duration: 4,
      });
      return;
    }

    // Validation for transfer mode (not delete-only)
    if (!deleteOnly) {
      if (!patterns || patterns.length === 0) {
        console.error('Invalid transfer data:', { subjectCode, patterns });
        api.error({
          message: 'Error',
          description: 'Invalid transfer data',
          placement: 'bottomRight',
          duration: 4,
        });
        return;
      }

      if (!transferLecturerId) {
        console.error('Lecturer ID is missing in transfer data');
        api.error({
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
      console.log(deleteOnly ? 'Starting batch delete...' : 'Starting batch transfer...');

      // Tìm tất cả lessons có cùng subjectCode
      const lessonsToDelete = loadedLessons.filter(
        (l) =>
          (l.subjectCode || '').toString() === subjectCode.toString()
      );

      console.log(
        `Found ${lessonsToDelete.length} lessons to delete with subjectCode: ${subjectCode}`
      );

      // Xóa tất cả lessons có cùng subjectCode
      for (const lesson of lessonsToDelete) {
        if (lesson.lessonId) {
          try {
            console.log(`Deleting lesson ${lesson.lessonId}...`);
            await ClassList.deleteLesson(Number(lesson.lessonId));
            console.log(`Deleted lesson ${lesson.lessonId} successfully`);
          } catch (error) {
            console.error(`Error deleting lesson ${lesson.lessonId}:`, error);
          }
        }
      }

      console.log('Finished deleting lessons');

      // Update loaded lessons - remove deleted lessons
      setLoadedLessons((prev) =>
        prev.filter((l) => (l.subjectCode || '').toString() !== subjectCode.toString())
      );

      // If deleteOnly, stop here
      if (deleteOnly) {
        api.success({
          message: 'Success',
          description: `Đã xóa ${lessonsToDelete.length} lessons thành công`,
          placement: 'bottomRight',
          duration: 5,
        });

        setEditModalVisible(false);
        setSelectedLesson(null);
        return;
      }

      // Tạo schedule mới với patterns (giống create schedule)
      const effectiveSemesterId = semester.id || semesterId;
      console.log('Creating new schedule with:', {
        semesterId: effectiveSemesterId,
        classId,
        lecturerId: transferLecturerId,
        patternsCount: patterns.length,
      });

      if (!effectiveSemesterId || !classId || !transferLecturerId) {
        throw new Error('Missing semester, class, or lecturer information');
      }

      const payload = {
        semesterId: parseInt(effectiveSemesterId, 10),
        classId: parseInt(classId, 10),
        lecturerId: parseInt(transferLecturerId, 10),
        patterns,
      };

      console.log('Calling createSchedule with payload:', payload);
      const createResponse = await ClassList.createSchedule(payload);
      console.log('createSchedule response:', createResponse);

      // Reload lessons sau khi tạo lại schedule
      if (effectiveSemesterId && classId) {
        const scheduleData = await ClassList.getSchedule(
          effectiveSemesterId,
          classId
        );

        if (scheduleData && scheduleData.schedule) {
          const convertedLessons = scheduleData.schedule.map((lesson) => {
            let dateStr = lesson.date;
            try {
              if (
                typeof lesson.date === 'string' &&
                /^\d{4}-\d{2}-\d{2}$/.test(lesson.date)
              ) {
                dateStr = lesson.date;
              } else {
                const parsedDate = new Date(lesson.date);
                dateStr = toYMD(parsedDate);
              }
            } catch (e) {
              console.error('Error parsing date:', lesson.date, e);
            }

            const lessonDate = fromYMD(dateStr);
            const dayOfWeek = lessonDate.getDay();
            const weekday = dayOfWeek === 0 ? 8 : dayOfWeek + 1;

            const slot = lesson.timeId || 1;
            const roomName = lesson.roomName || '';
            const room = rooms.find((r) => r.label === roomName);
            const roomId = room ? room.value : null;

            return {
              lessonId: Number(lesson.lessonId || lesson.id),
              date: dateStr,
              weekday,
              slot,
              room: roomName,
              roomId,
              lecturer: lesson.lecturerCode || '',
              subjectCode: lesson.subjectCode || '',
              subjectName: lesson.subjectName || '',
              className: lesson.className || '',
              startTime: lesson.startTime || '',
              endTime: lesson.endTime || '',
              timeId: lesson.timeId,
              subjectId: lesson.subjectId, // giữ lại nếu backend có
              isLoaded: true,
            };
          });

          setLoadedLessons(convertedLessons);
        }
      }

      api.success({
        message: 'Success',
        description: 'Batch transfer completed successfully',
        placement: 'bottomRight',
        duration: 5,
      });

      setEditModalVisible(false);
      setSelectedLesson(null);
    } catch (error) {
      console.error('Error in batch transfer:', error);
      api.error({
        message: 'Error',
        description:
          error?.response?.data?.message || 'Failed to transfer lessons',
        placement: 'bottomRight',
        duration: 5,
      });
    } finally {
      setSaving(false);
    }
  };


  const handlePrevWeek = () => {
    if (!currentWeekStart) return;
    const newWeek = clampWeekStartWithinSemester(addDays(currentWeekStart, -7));
    setCurrentWeekStart(newWeek);
  };

  const handleNextWeek = () => {
    if (!currentWeekStart) return;
    const newWeek = clampWeekStartWithinSemester(addDays(currentWeekStart, 7));
    setCurrentWeekStart(newWeek);
  };

  const renderCalendar = (weekStart) => {
    if (!weekStart) return { columns: [], dataSource: [] };

    const slotsToRender =
      timeslots.length > 0
        ? timeslots.map((ts) => ({
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
      ...['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(
        (dayLabel, idx) => {
          const dayDate = addDays(weekStart, idx);
          const dateStr = toYMD(dayDate);
          const [year, month, day] = dateStr.split('-');
          const formattedDate = `${day}/${month}`;

          return {
            title: (
              <div style={{ textAlign: 'center' }}>
                <div>{dayLabel}</div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 'normal',
                    color: '#666',
                  }}
                >
                  {formattedDate}
                </div>
              </div>
            ),
            dataIndex: `day${idx}`,
            key: `day${idx}`,
            align: 'left',
            render: (content) => content || '',
          };
        }
      ),
    ];

    const dataSource = slotsToRender.map((slotInfo) => {
      const slot = slotInfo.timeId;
      const row = {
        key: `slot-${slot}`,
        slotLabel: slotInfo.label,
      };

      Array.from({ length: 7 }).forEach((_, dayIdx) => {
        const dayDate = addDays(weekStart, dayIdx);
        const dateStr = toYMD(dayDate);
        const holidayName = holidayLookup[dateStr];

        const loadedLesson = loadedLessons.find((l) => {
          if (!l.date) return false;
          const lessonTimeId = l.timeId || l.slot;
          return (
            l.date === dateStr && Number(lessonTimeId) === Number(slot)
          );
        });

        const cellContents = [];
        let cellStyle = {};
        const classNames = [];

        if (holidayName) classNames.push('holiday-cell');

        if (loadedLesson) {
          const loadedSubjectCode = loadedLesson.subjectCode || '';
          const loadedSubjectName = loadedLesson.subjectName || '';
          const loadedRoomName = loadedLesson.room || '';
          const loadedLecturerCode = loadedLesson.lecturer || '';

          const parts = [];
          if (loadedSubjectCode) parts.push(loadedSubjectCode);
          if (loadedSubjectName) parts.push(loadedSubjectName);
          if (loadedRoomName) parts.push(loadedRoomName);
          if (loadedLecturerCode) parts.push(loadedLecturerCode);

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
          if (cellContents.length === 0) {
            cellContents.push(
              <Tag key="holiday" color="gold">
                {holidayName}
              </Tag>
            );
          } else {
            cellContents.unshift(
              <Tag key="holiday" color="gold" style={{ marginBottom: 4 }}>
                {holidayName}
              </Tag>
            );
          }
          cellStyle = {
            ...(cellStyle || {}),
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
              ? cellContents.map((content, idx) =>
                typeof content === 'string'
                  ? <div key={idx}>{content}</div>
                  : React.cloneElement(content, { key: idx })
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
        <Layout.Content
          className="edit-schedule-main"
          style={{ padding: '40px', textAlign: 'center' }}
        >
          <Space direction="vertical" size="large">
            <Spin size="large" />
            <Typography.Text type="secondary">
              Loading data...
            </Typography.Text>
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
              Select semester & class, then click on a lesson to edit or delete
              it.
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

          <Row
            gutter={[16, 16]}
            style={{ display: 'flex', alignItems: 'stretch' }}
          >
            <Col xs={24} xl={24} style={{ display: 'flex' }}>
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <PickSemesterAndClass
                  semesterId={semesterId}
                  classId={classId}
                  onSemesterChange={setSemesterId}
                  onClassChange={setClassId}
                  onLoadClass={handleLoadClass}
                />
              </div>
            </Col>
          </Row>

          <CalendarTable
            title="Class Timetable"
            weekStart={currentWeekStart}
            weekRange={
              currentWeekStart ? getWeekRange(currentWeekStart) : 'Week'
            }
            onPrevWeek={handlePrevWeek}
            onNextWeek={handleNextWeek}
            renderCalendar={() => renderCalendar(currentWeekStart)}
          />
        </Space>
      </Layout.Content>

      <LessonEditModal
        visible={editModalVisible}
        lesson={selectedLesson}
        rooms={rooms}
        timeslots={timeslots}
        onUpdate={handleUpdateLesson}
        onDelete={handleDeleteLesson}
        onBatchTransfer={handleBatchTransfer}
        onCancel={() => {
          setEditModalVisible(false);
          setSelectedLesson(null);
        }}
        saving={saving}
        semester={semester}
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
