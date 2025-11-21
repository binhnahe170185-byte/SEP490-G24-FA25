import React, { useState, useEffect } from 'react';
import './CreateSchedule.css';
import CalendarTable from './components/CalendarTable';
import PickSemesterAndClass from './components/PickSemesterAndClass';
import LecturerSelector from './components/LecturerSelector';
import WeeklyPatterns from './components/WeeklyPatterns';
import SaveButton from './components/SaveButton';
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
} from 'antd';
import {
  CalendarOutlined,
  BookOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { notification } from 'antd';

const CreateSchedule = () => {
  const [api, contextHolder] = notification.useNotification();

  const [semesterId, setSemesterId] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [className, setClassName] = useState('');
  const [lecturerId, setLecturerId] = useState('');
  const [lecturerCode, setLecturerCode] = useState('');
  const [weekday, setWeekday] = useState('');
  const [slotId, setSlotId] = useState('');
  const [roomId, setRoomId] = useState('');

  const [patterns, setPatterns] = useState([]);
  const [loadedLessons, setLoadedLessons] = useState([]); // Lessons từ API (tất cả lịch học của class)
  const [previewLessons, setPreviewLessons] = useState([]); // Lessons từ patterns (preview)
  const [currentWeekStart, setCurrentWeekStart] = useState(null);

  const [semester, setSemester] = useState({ id: null, start: null, end: null });

  // State for API data
  const [semesterData, setSemesterData] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [timeslots, setTimeslots] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classStudents, setClassStudents] = useState([]);
  const [availabilityMap, setAvailabilityMap] = useState({});
  const [pendingAvailability, setPendingAvailability] = useState({ status: 'idle' });
  // Static data
  const weekdays = [
    { value: '2', label: 'Mon' },
    { value: '3', label: 'Tue' },
    { value: '4', label: 'Wed' },
    { value: '5', label: 'Thu' },
    { value: '6', label: 'Fri' },
    { value: '7', label: 'Sat' },
    { value: '8', label: 'Sun' },
  ];

  // Generate slots from timeslots (will be updated when timeslots are loaded)
  // Slots should map to timeId from timeslots
  const slots = timeslots.length > 0
    ? timeslots.map((ts) => ({
      value: String(ts.timeId),
      label: `Slot ${ts.timeId}`
    }))
    : Array.from({ length: 8 }, (_, i) => ({ value: String(i + 1), label: `Slot ${i + 1}` }));

  // Helper functions
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

  const buildAvailabilityKey = (lesson) => {
    if (!lesson || !lesson.date) return null;
    const slotValue = lesson.timeId || lesson.slot;
    if (!slotValue) return null;
    const roomKey = lesson.roomId || lesson.room;
    if (!roomKey) return null;
    return `${lesson.date}|${slotValue}|${roomKey}`;
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

  const getWeekRange = (weekStart) => {
    return `Week ${toYMD(weekStart)} → ${toYMD(addDays(weekStart, 6))}`;
  };
  const getStudentIds = () => {
    return (classStudents || [])
      .map(student => student?.studentId || student?.id)
      .filter((id) => id !== undefined && id !== null)
      .map(id => parseInt(id, 10))
      .filter(id => !Number.isNaN(id));
  };
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
    } catch (error) {
      console.warn('Unable to normalize date string:', rawDate, error);
    }
    return String(rawDate);
  };

  // Fetch data from APIs
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch semesters
        const semestersResponse = await SemesterApi.getSemesters({ pageSize: 100 });
        const semestersList = semestersResponse.items || [];
        const formattedSemesters = semestersList.map(sem => ({
          code: sem.semesterCode || sem.name,
          start: sem.startDate,
          end: sem.endDate,
          status: new Date(sem.endDate) >= new Date() ? 'Active' : 'Archived'
        }));
        setSemesterData(formattedSemesters);

        // Fetch rooms
        console.log('Fetching rooms...');
        const roomsResponse = await RoomApi.getRooms({ pageSize: 100 });
        console.log('Rooms response:', roomsResponse);
        const roomsList = roomsResponse.items || [];
        console.log('Rooms list:', roomsList);

        if (roomsList.length === 0) {
          console.warn('No rooms found in response');
        }

        const formattedRooms = roomsList.map(room => ({
          value: String(room.roomId),
          label: room.roomName
        }));
        console.log('Formatted rooms:', formattedRooms);
        setRooms(formattedRooms);

        // Fetch timeslots
        const timeslotsList = await TimeslotApi.getTimeslots();
        setTimeslots(timeslotsList);
      } catch (error) {
        console.error('Error fetching data:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          statusText: error.response?.statusText
        });
        // Set empty arrays on error to prevent crashes
        setRooms([]);
        setTimeslots([]);
        setSemesterData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Sync semester.id when semesterId changes (from dropdown selection)
  useEffect(() => {
    if (semesterId && semesterId !== semester.id) {
      // Find semester data to get start/end dates
      const semData = semesterData.find(s => s.code === semesterId || String(s.code) === String(semesterId));
      if (semData) {
        setSemester({
          id: semesterId,
          start: fromYMD(semData.start),
          end: fromYMD(semData.end)
        });
        console.log('Synced semester from semesterId:', { id: semesterId, start: semData.start, end: semData.end });
      } else if (semesterId) {
        // If we have semesterId but no data yet, at least set the id
        setSemester(prev => ({
          ...prev,
          id: semesterId
        }));
        console.log('Set semester.id from semesterId:', semesterId);
      }
    }
  }, [semesterId, semesterData, semester.id]);

  // Fetch holidays when semester is selected
  useEffect(() => {
    const fetchHolidays = async () => {
      const semId = semester.id || semesterId;
      if (!semId) {
        setHolidays([]);
        return;
      }

      try {
        const holidaysList = await HolidayApi.getHolidaysBySemester(semId);
        const formattedHolidays = holidaysList.map(holiday => ({
          date: normalizeDateString(holiday.date),
          name: holiday.name || holiday.holidayName || holiday.reason || holiday.description || 'Holiday',
          description: holiday.description || '',
          holidayId: holiday.holidayId
        }));
        setHolidays(formattedHolidays);
      } catch (error) {
        console.error('Error fetching holidays:', error);
        setHolidays([]);
      }
    };

    fetchHolidays();
  }, [semester.id, semesterId]);

  // Initialize week
  useEffect(() => {
    const today = new Date();
    const initWeek = mondayOf(today);
    setCurrentWeekStart(initWeek);
  }, []);

  // Regenerate preview lessons when lecturer, patterns, semester, holidays, or rooms change
  useEffect(() => {
    if (patterns.length > 0 && semester.start && semester.end && rooms.length > 0) {
      const newPreviewLessons = generateLessonsFromPatterns(
        patterns,
        semester.start,
        semester.end,
        lecturerCode,
        subjectCode,
        subjectName
      );
      setPreviewLessons(newPreviewLessons);
    } else {
      setPreviewLessons([]);
    }
  }, [lecturerCode, subjectCode, subjectName, patterns, semester.start, semester.end, rooms, holidays]);
  useEffect(() => {
    if (!previewLessons || previewLessons.length === 0 || !lecturerId || !classId) {
      setAvailabilityMap({});
      return;
    }

    const uniqueLessons = new Map();
    previewLessons.forEach((lesson) => {
      const key = buildAvailabilityKey(lesson);
      if (key && !uniqueLessons.has(key)) {
        uniqueLessons.set(key, lesson);
      }
    });

    if (uniqueLessons.size === 0) {
      setAvailabilityMap({});
      return;
    }

    let cancelled = false;

    const fetchAvailability = async () => {
      const entries = [];
      const studentIds = getStudentIds();
      for (const [key, lesson] of uniqueLessons.entries()) {
        try {
          const payload = {
            date: lesson.date,
            timeId: parseInt(lesson.timeId || lesson.slot, 10),
            classId: classId ? parseInt(classId, 10) : undefined,
            roomId: lesson.roomId ? parseInt(lesson.roomId, 10) : undefined,
            lecturerId: lecturerId ? parseInt(lecturerId, 10) : undefined,
            studentIds,
          };
          const availability = await ClassList.checkAvailability(payload);
          const reasons = [];
          if (availability?.isRoomBusy) reasons.push('Room busy');
          if (availability?.isLecturerBusy) reasons.push('Lecturer busy');
          if (availability?.isClassBusy) reasons.push('Class busy');
          if (availability?.conflictedStudentIds?.length) {
            reasons.push(`${availability.conflictedStudentIds.length} students busy`);
          }
          entries.push([key, { ...availability, message: reasons.length > 0 ? reasons.join(' | ') : 'Slot looks good' }]);
        } catch (error) {
          console.error('Failed to check availability for preview lesson:', error);
        }
      }

      if (!cancelled) {
        setAvailabilityMap(Object.fromEntries(entries));
      }
    };

    fetchAvailability();

    return () => {
      cancelled = true;
    };
  }, [previewLessons, lecturerId, classId, classStudents]);

  useEffect(() => {
    if (!weekday || !slotId || !roomId || !semester.start || !lecturerId || !classId) {
      setPendingAvailability({ status: 'idle' });
      return;
    }

    const nextDate = findNextDateForWeekday(semester.start, weekday);
    if (!nextDate) {
      setPendingAvailability({ status: 'idle' });
      return;
    }

    const studentIds = getStudentIds();
    const payload = {
      date: toYMD(nextDate),
      timeId: parseInt(slotId, 10),
      classId: classId ? parseInt(classId, 10) : undefined,
      roomId: roomId ? parseInt(roomId, 10) : undefined,
      lecturerId: lecturerId ? parseInt(lecturerId, 10) : undefined,
      studentIds,
    };

    let cancelled = false;
    setPendingAvailability({ status: 'loading' });

    ClassList.checkAvailability(payload)
      .then((result) => {
        if (cancelled) return;
        const reasons = [];
        if (result?.isClassBusy) reasons.push('Class already scheduled');
        if (result?.isRoomBusy) reasons.push('Room is occupied');
        if (result?.isLecturerBusy) reasons.push('Lecturer is busy');
        if (result?.conflictedStudentIds && result.conflictedStudentIds.length > 0) {
          reasons.push(`${result.conflictedStudentIds.length} students have other classes`);
        }
        const hasConflict = reasons.length > 0;
        setPendingAvailability({
          status: 'ready',
          hasConflict,
          result,
          message: hasConflict ? reasons.join(' | ') : 'Slot is available',
        });
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Failed to check pending selection availability:', error);
        setPendingAvailability({
          status: 'error',
          hasConflict: true,
          message: error?.response?.data?.message || 'Unable to verify slot availability',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [weekday, slotId, roomId, lecturerId, classId, semester.start, classStudents]);
  // Generate lessons from patterns for entire semester
  const generateLessonsFromPatterns = (patterns, semStart, semEnd, lecturer, subjectCodeValue, subjectNameValue) => {
    const generatedLessons = [];
    const holidaysDates = holidays.map(h => h.date);

    // Start from Monday of semester
    let currentDate = mondayOf(semStart);
    const endDate = semEnd;

    // Generate lessons for each week in semester
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
        // JavaScript Date.getDay(): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
        // We need: 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri (Sunday = 7)
        const weekdayNum = lessonDate.getDay();
        const normalizedWeekday = weekdayNum === 0 ? 8 : weekdayNum + 1; // Convert: Mon=2 ... Sat=7, Sun=8

        patterns.forEach(pattern => {
          if (pattern.weekday === normalizedWeekday) {
            // Find room name from roomId
            const room = rooms.find(r => r.value === pattern.room);
            const roomName = room ? room.label : pattern.room;
            generatedLessons.push({
              date: dateStr,
              weekday: normalizedWeekday,
              slot: pattern.slot, // This is timeId
              timeId: pattern.slot, // Also store as timeId for consistency
              room: roomName,
              roomId: pattern.room,
              lecturer: lecturer || '',
              subjectCode: subjectCodeValue || '',
              subjectName: subjectNameValue || '',
              isPreview: true // Đánh dấu đây là lesson preview từ patterns
            });
          }
        });
      }

      // Move to next week
      currentDate = addDays(currentDate, 7);
    }

    return generatedLessons;
  };
  const fetchClassStudents = async (clsId) => {
    if (!clsId) {
      setClassStudents([]);
      return;
    }
    try {
      const studentResponse = await ClassList.getStudents(clsId);
      const rawStudents = studentResponse?.data
        || studentResponse?.students
        || studentResponse?.items
        || studentResponse
        || [];
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
    // Nếu nhận được data từ PickSemesterAndClass (API call)
    if (data && data.schedule) {
      const { schedule, semesterId: semId, classId: clsId, semesterOptions: semOpt } = data;

      console.log('Received schedule data:', { schedule, semOpt, semId, clsId });

      // Tính toán semester start/end từ schedule data nếu không có từ semOpt
      let semStart, semEnd;
      if (semOpt && semOpt.startDate && semOpt.endDate) {
        semStart = fromYMD(semOpt.startDate);
        semEnd = fromYMD(semOpt.endDate);
      } else if (schedule && schedule.length > 0) {
        // Tính từ schedule: lấy date đầu tiên và cộng thêm 6 ngày (1 tuần)
        const firstDate = fromYMD(schedule[0].date);
        semStart = mondayOf(firstDate);
        semEnd = addDays(semStart, 6 * 7); // Giả sử semester kéo dài 7 tuần
      } else {
        console.error('Cannot determine semester dates');
        return;
      }

      setSemester({
        id: semId,
        start: semStart,
        end: semEnd,
      });

      // Set week start to Monday of first lesson or semester start
      let firstLessonDate = semStart;
      if (schedule.length > 0) {
        try {
          // Parse first lesson date
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

      // Convert schedule data từ API sang format cho calendar
      const convertedLessons = schedule.map(lesson => {
        // Ensure date is in YYYY-MM-DD format
        let dateStr = lesson.date;
        try {
          if (typeof lesson.date === 'string') {
            // If it's already in YYYY-MM-DD format, use it directly
            if (/^\d{4}-\d{2}-\d{2}$/.test(lesson.date)) {
              dateStr = lesson.date;
            } else {
              // Parse other date string formats
              const parsedDate = new Date(lesson.date);
              dateStr = toYMD(parsedDate);
            }
          } else if (lesson.date instanceof Date) {
            // If it's a Date object, convert to YYYY-MM-DD
            dateStr = toYMD(lesson.date);
          } else {
            // Try to parse as date
            const parsedDate = new Date(lesson.date);
            if (!isNaN(parsedDate.getTime())) {
              dateStr = toYMD(parsedDate);
            }
          }
        } catch (e) {
          console.error('Error parsing date:', lesson.date, e);
          // Fallback: try to extract YYYY-MM-DD from string if possible
          if (typeof lesson.date === 'string') {
            const match = lesson.date.match(/(\d{4}-\d{2}-\d{2})/);
            if (match) {
              dateStr = match[1];
            } else {
              dateStr = lesson.date;
            }
          }
        }

        const lessonDate = fromYMD(dateStr);
        const dayOfWeek = lessonDate.getDay(); // 0=Sun, 1=Mon, 2=Tue, etc.
        // Convert to weekday format: Mon=2 ... Sat=7, Sun=8
        const weekday = dayOfWeek === 0 ? 8 : dayOfWeek + 1; // Mon should be 2, Tue=3, etc.

        // Use timeId as slot (assuming timeId maps to slot 1-8)
        const slot = lesson.timeId || 1;

        // Find roomId from rooms array based on roomName
        const roomName = lesson.roomName || '';
        const room = rooms.find(r => r.label === roomName);
        const roomId = room ? room.value : null;

        return {
          date: dateStr, // Ensure YYYY-MM-DD format
          weekday: weekday,
          slot: slot,
          room: roomName,
          roomId: roomId, // Add roomId for conflict checking
          lecturer: lesson.lecturerCode || '', // map lecturerCode từ API
          subjectCode: lesson.subjectCode || '',
          subjectName: lesson.subjectName || '',
          className: lesson.className || '',
          startTime: lesson.startTime || '',
          endTime: lesson.endTime || '',
          timeId: lesson.timeId,
          isLoaded: true // Đánh dấu đây là lesson đã load từ API
        };
      });

      console.log('Converted loaded lessons:', convertedLessons);
      setLoadedLessons(convertedLessons);

      // Set subject code and name from schedule
      const firstSubjectCode = schedule[0]?.subjectCode || '';
      const firstSubjectName = schedule[0]?.subjectName || '';
      const firstClassName = schedule[0]?.className || '';
      if (firstSubjectCode) {
        setSubjectCode(firstSubjectCode);
      }
      setSubjectName(firstSubjectName);
      setClassName(firstClassName);

      // Also update semesterId and classId in parent state
      setSemesterId(semId);
      setClassId(clsId);
      fetchClassStudents(clsId);
      return;
    }

    // Fallback: should not happen since PickSemesterAndClass handles API calls
    // But keep this as a safety check
    console.warn('handleLoadClass: No schedule data received from API');
  };

  const handleAddPattern = () => {
    if (!weekday || !slotId || !roomId) {
      api.error({
        message: 'Error',
        description: 'Please select weekday, slot, and room',
        placement: 'bottomRight',
        duration: 4,
      });
      return;
    }

    const exists = patterns.some(p => p.weekday === parseInt(weekday) && p.slot === parseInt(slotId));
    if (exists) {
      api.error({
        message: 'Error',
        description: 'Duplicate pattern: This weekday and slot combination already exists',
        placement: 'bottomRight',
        duration: 4,
      });
      return;
    }
    if (pendingAvailability?.hasConflict) {
      api.error({
        message: 'Slot unavailable',
        description: pendingAvailability?.message || 'The selected slot is not available for this class',
        placement: 'bottomRight',
        duration: 5,
      });
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

  const handleSave = async () => {
    console.log('=== handleSave called ===');
    console.log('Current state:', {
      semesterId: semester.id,
      classId: classId,
      lecturerId: lecturerId,
      patternsCount: patterns.length,
      patterns: patterns
    });

    // Use semester.id or fallback to semesterId
    const effectiveSemesterId = semester.id || semesterId;
    if (!effectiveSemesterId || !classId) {
      console.warn('Validation failed: Missing semester or class', {
        semesterId: effectiveSemesterId,
        classId: classId,
        semester: semester
      });
      api.error({
        message: 'Error',
        description: 'Please select semester and class',
        placement: 'bottomRight',
        duration: 4,
      });
      return;
    }
    if (patterns.length === 0) {
      console.warn('Validation failed: No patterns');
      api.error({
        message: 'Error',
        description: 'Please select pattern',
        placement: 'bottomRight',
        duration: 4,
      });
      return;
    }
    if (!lecturerId) {
      console.warn('Validation failed: Missing lecturer');
      api.error({
        message: 'Error',
        description: 'Please select lecturer',
        placement: 'bottomRight',
        duration: 4,
      });
      return;
    }

    try {
      setSaving(true);
      console.log('Starting save process...');

      // Format patterns for API
      const formattedPatterns = patterns.map(pattern => {
        const formatted = {
          weekday: pattern.weekday, // 2=Mon, 3=Tue, etc.
          timeId: parseInt(pattern.slot), // timeId from slot
          roomId: parseInt(pattern.room) // roomId
        };
        console.log('Formatted pattern:', formatted, 'from original:', pattern);
        return formatted;
      });

      // Use semester.id or fallback to semesterId
      const effectiveSemesterId = semester.id || semesterId;
      const payload = {
        semesterId: parseInt(effectiveSemesterId),
        classId: parseInt(classId),
        lecturerId: parseInt(lecturerId),
        patterns: formattedPatterns
      };

      console.log('Saving schedule with payload:', payload);
      console.log('Payload JSON:', JSON.stringify(payload, null, 2));

      const response = await ClassList.createSchedule(payload);
      console.log('Schedule saved successfully, response:', response);
      console.log('Response type:', typeof response);
      console.log('Response keys:', response ? Object.keys(response) : 'null');
      console.log('Full response structure:', JSON.stringify(response, null, 2));

      // Extract lessonsCreated from response
      // Backend returns: { code: 200, message: "...", data: { lessonsCreated: ... } }
      let lessonsCreated = 0;
      if (response?.data?.lessonsCreated !== undefined) {
        lessonsCreated = response.data.lessonsCreated;
      } else if (response?.lessonsCreated !== undefined) {
        lessonsCreated = response.lessonsCreated;
      }

      console.log('Lessons created:', lessonsCreated);

      if (lessonsCreated > 0) {
        api.success({
          message: 'Save successfully',
          description: `Timetable saved successfully!`,
          placement: 'bottomRight',
          duration: 5,
        });
      }

      // Optionally reload the schedule to show the saved data
      // You can trigger a reload here if needed
    } catch (error) {
      console.error('=== Error saving schedule ===');
      console.error('Error response status:', error?.response?.status);
      console.error('Error response data:', error?.response?.data);

      // Prefer custom, specific messages on 409 conflicts (mapped from BE conflict keywords)
      if (error?.response?.status === 409) {
        const serverMsg = (error?.response?.data?.message || '').toString();

        // Extract only the first conflict occurrence (priority: class -> room -> lecturer)
        const classRegex = /Class conflict:\s*class\s*#?\d+\s*already has a lesson at\s*(\d{4}-\d{2}-\d{2})\s*timeId\s*(\d+)/i;
        const roomRegex = /Room conflict:\s*room\s*#?(\d+)\s*is occupied at\s*(\d{4}-\d{2}-\d{2})\s*timeId\s*(\d+)/i;
        const lecturerRegex = /Lecturer conflict:\s*lecturer\s*#?\d+\s*is teaching at\s*(\d{4}-\d{2}-\d{2})\s*timeId\s*(\d+)/i;

        let firstMessage = '';
        const classMatch = classRegex.exec(serverMsg);
        if (classMatch) {
          const [, date, timeId] = classMatch;
          firstMessage = `Class Conflict: The class already has a lesson on ${date}, slot ${timeId}.`;
        } else {
          const roomMatch = roomRegex.exec(serverMsg);
          if (roomMatch) {
            const [, roomId, date, timeId] = roomMatch;
            firstMessage = `Room Conflict: Room #${roomId} is already occupied on ${date}, slot ${timeId}.`;
          } else {
            const lecturerMatch = lecturerRegex.exec(serverMsg);
            if (lecturerMatch) {
              const [, date, timeId] = lecturerMatch;
              firstMessage = `Lecturer Conflict: The lecturer is already teaching on ${date}, slot ${timeId}.`;
            } else {
              const studentRegex = /Student conflict:\s*students\s*\[(.+?)\]/i;
              const studentMatch = studentRegex.exec(serverMsg);
              if (studentMatch) {
                const conflicted = studentMatch[1];
                firstMessage = `Student Conflict: ${conflicted} already have lessons at the same time.`;
              }
            }
          }
        }

        api.error({
          message: 'Schedule Conflict Detected',
          description: firstMessage || 'A schedule conflict has been detected. Please adjust your patterns and try again.',
          placement: 'bottomRight',
          duration: 8,
        });

      } else {
        const fallback =
          error?.response?.data?.message ||
          error?.message ||
          'Unable to save the schedule. Please try again.';

        api.error({
          message: 'Save Failed',
          description: fallback,
          placement: 'bottomRight',
          duration: 6,
        });
      }

    } finally {
      setSaving(false);
      console.log('Save process completed');
    }
  };


  // Helper function to check if two lessons conflict (same date & slot regardless of room)
  // We only care about the class occupying a slot, not the physical room, because the BE enforces room conflicts separately.
  const isLessonConflict = (previewLesson, loadedLesson) => {
    if (!previewLesson || !loadedLesson) return false;

    // Must be on the same date
    if (previewLesson.date !== loadedLesson.date) return false;

    // Must be at the same time slot
    const timeId1 = previewLesson.timeId || previewLesson.slot;
    const timeId2 = loadedLesson.timeId || loadedLesson.slot;
    return parseInt(timeId1, 10) === parseInt(timeId2, 10);
  };

  const renderCalendar = (weekStart) => {
    if (!weekStart) return { columns: [], dataSource: [] };

    const slotsToRender = timeslots.length > 0
      ? timeslots.map(ts => ({ timeId: ts.timeId, label: `Slot ${ts.timeId}` }))
      : Array.from({ length: 8 }, (_, i) => ({ timeId: i + 1, label: `Slot ${i + 1}` }));

    const holidayLookup = holidays.reduce((acc, holiday) => {
      if (holiday.date) {
        acc[holiday.date] = holiday.name || holiday.description || 'Holiday';
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
      ...['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayLabel, idx) => ({
        title: dayLabel,
        dataIndex: `day${idx}`,
        key: `day${idx}`,
        align: 'left',
        render: (content) => content || '',
      })),
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

        const loadedLesson = loadedLessons.find(l => {
          if (!l.date) return false;
          const lessonTimeId = l.timeId || l.slot;
          return l.date === dateStr && parseInt(lessonTimeId) === slot;
        });

        const previewLesson = previewLessons.find(l => {
          if (!l.date) return false;
          const lessonTimeId = l.timeId || l.slot;
          return l.date === dateStr && parseInt(lessonTimeId) === slot;
        });

        const cellContents = [];
        let cellStyle = {};
        const classNames = [];

        if (holidayName) {
          classNames.push('holiday-cell');
        }

        if (previewLesson) {
          // Conflict with loaded lessons
          const loadedConflict = loadedLesson && isLessonConflict(previewLesson, loadedLesson);

          // Conflict within preview lessons generated by patterns (class-level conflict regardless of room)
          const hasPreviewClassConflict = previewLessons.some(other => {
            if (!other || other === previewLesson) return false;
            if (!other.date) return false;
            const otherTimeId = other.timeId || other.slot;
            const thisTimeId = previewLesson.timeId || previewLesson.slot;
            return other.date === dateStr && parseInt(otherTimeId) === parseInt(thisTimeId);
          });

          const availabilityKey = buildAvailabilityKey(previewLesson);
          const slotAvailability = availabilityKey ? availabilityMap[availabilityKey] : null;
          const slotReasons = [];
          if (slotAvailability?.isRoomBusy) slotReasons.push('Room busy');
          if (slotAvailability?.isLecturerBusy) slotReasons.push('Lecturer busy');
          if (slotAvailability?.isClassBusy) slotReasons.push('Class already scheduled');
          if (slotAvailability?.conflictedStudentIds?.length) {
            slotReasons.push(`${slotAvailability.conflictedStudentIds.length} students busy`);
          }
          const availabilityConflict = slotReasons.length > 0;
          const hasConflict = loadedConflict || hasPreviewClassConflict || availabilityConflict;

          // Preview lesson exists - display SubjectCode, SubjectName, RoomName
          const previewSubjectCode = subjectCode || '';
          const previewSubjectName = subjectName || '';
          const previewRoomName = previewLesson.room || '';

          const parts = [];
          if (previewSubjectCode) parts.push(previewSubjectCode);
          if (previewSubjectName) parts.push(previewSubjectName);
          if (previewRoomName) parts.push(previewRoomName);

          const displayText = parts.join(' | ');

          if (hasConflict) {
            // Conflict: red background - show preview with conflict indicator
            const conflictParts = [];
            if (loadedConflict && loadedLesson) {
              const loadedSubjectCode = loadedLesson.subjectCode || '';
              const loadedSubjectName = loadedLesson.subjectName || '';
              const loadedRoomName = loadedLesson.room || '';
              const loadedParts = [];
              if (loadedSubjectCode) loadedParts.push(loadedSubjectCode);
              if (loadedSubjectName) loadedParts.push(loadedSubjectName);
              if (loadedRoomName) loadedParts.push(loadedRoomName);
              if (loadedParts.length > 0) {
                conflictParts.push(loadedParts.join(' | '));
              }
            }
            if (hasPreviewClassConflict) {
              conflictParts.push('Duplicate pattern in preview');
            }
            if (availabilityConflict && slotReasons.length > 0) {
              conflictParts.push(slotReasons.join(' | '));
            }
            const conflictText = conflictParts.length > 0 ? conflictParts.join(' || ') : 'Conflict';
            cellContents.push(`${displayText} ⚠️ (${conflictText})`);
            cellStyle = {
              backgroundColor: '#ffebee',
              color: '#c62828',
              fontWeight: 'bold',
              border: '2px solid #c62828'
            };
            classNames.push('lesson-conflict');
          } else {
            // No conflict: green background
            const availabilityHint = slotAvailability?.message || '';
            cellContents.push(availabilityHint ? `${displayText} (${availabilityHint})` : displayText);
            cellStyle = {
              backgroundColor: '#e8f5e9',
              color: '#2e7d32',
              fontWeight: 'bold',
              border: '2px solid #2e7d32'
            };
            classNames.push('lesson-preview');
          }
        } else if (loadedLesson) {
          // Only loaded lesson exists (no preview) - display SubjectCode, SubjectName, RoomName
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
            backgroundColor: '#f5f5f5',
            color: '#333'
          };
          classNames.push('lesson-loaded');
        }

        if (holidayName) {
          cellContents.unshift(
            <Tag key="holiday" color="gold" style={{ marginBottom: 4 }}>
              {holidayName}
            </Tag>
          );
          cellStyle = {
            ...(cellStyle || {}),
            backgroundColor: cellStyle.backgroundColor || '#fffde7',
            border: '2px dashed #fbc02d',
            color: cellStyle.color || '#f57f17'
          };
        }

        const cellClassName = classNames.join(' ').trim();
        row[`day${dayIdx}`] = (
          <div className={`calendar-cell ${cellClassName}`} style={cellStyle}>
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

  const weekdayMap = { 2: 'Mon', 3: 'Tue', 4: 'Wed', 5: 'Thu', 6: 'Fri', 7: 'Sat', 8: 'Sun' };

  if (loading) {
    return (
      <Layout className="create-schedule-app">
        <Layout.Content className="create-schedule-main" style={{ padding: '40px', textAlign: 'center' }}>
          <Space direction="vertical" size="large">
            <Spin size="large" />
            <Typography.Text type="secondary">Loading data...</Typography.Text>
          </Space>
        </Layout.Content>
      </Layout>
    );
  }

  return (
    <Layout className="create-schedule-app">
      {contextHolder}
      <Layout.Content className="create-schedule-main">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div className="create-schedule-header-panel">
            <Typography.Title level={3} style={{ margin: 0 }}>
              Create Class Timetable
            </Typography.Title>
            <Typography.Text type="secondary">
              Pick semester & class, define weekly patterns, then preview conflicts before saving.
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
            <Col xs={24} xl={16}>
              <PickSemesterAndClass
                semesterId={semesterId}
                classId={classId}
                onSemesterChange={setSemesterId}
                onClassChange={setClassId}
                onLoadClass={handleLoadClass}
              />
            </Col>
            <Col xs={24} xl={8}>
              <LecturerSelector
                lecturerId={lecturerId}
                lecturerCode={lecturerCode}
                onLecturerChange={(id, code) => {
                  setLecturerId(id);
                  setLecturerCode(code || '');
                }}
                subjectCode={subjectCode}
                subjectName={subjectName}
                onSubjectChange={(code, name) => {
                  setSubjectCode(code);
                  setSubjectName(name);
                }}
              />
            </Col>
          </Row>

          <WeeklyPatterns
            weekday={weekday}
            slotId={slotId}
            roomId={roomId}
            patterns={patterns}
            weekdays={weekdays}
            slots={slots}
            rooms={rooms}
            weekdayMap={weekdayMap}
            onWeekdayChange={setWeekday}
            onSlotChange={setSlotId}
            onRoomChange={setRoomId}
            onAddPattern={handleAddPattern}
            onRemovePattern={handleRemovePattern}
            pendingAvailability={pendingAvailability}
          />

          <CalendarTable
            title="Class Timetable"
            weekStart={currentWeekStart}
            weekRange={currentWeekStart ? getWeekRange(currentWeekStart) : 'Week'}
            onPrevWeek={handlePrevWeek}
            onNextWeek={handleNextWeek}
            renderCalendar={() => renderCalendar(currentWeekStart)}
          />

          <SaveButton onSave={handleSave} saving={saving} />
        </Space>
      </Layout.Content>
    </Layout>
  );
};

export default CreateSchedule;
