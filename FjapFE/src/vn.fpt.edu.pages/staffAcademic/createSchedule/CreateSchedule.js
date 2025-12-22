import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  Card,
} from 'antd';
import {
  CalendarOutlined,
  BookOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { notification } from 'antd';
import './CreateSchedule.css';
import CalendarTable from './components/CalendarTable';
import PickSemesterAndClass from './components/PickSemesterAndClass';
import LecturerSelector from './components/LecturerSelector';
import WeeklySchedules from './components/WeeklySchedule';
import SaveButton from './components/SaveButton';
import SemesterApi from '../../../vn.fpt.edu.api/Semester';
import RoomApi from '../../../vn.fpt.edu.api/Room';
import TimeslotApi from '../../../vn.fpt.edu.api/Timeslot';
import HolidayApi from '../../../vn.fpt.edu.api/Holiday';
import ClassList from '../../../vn.fpt.edu.api/ClassList';

dayjsLib.extend(isoWeek);
const dayjs = (d) => dayjsLib(d);

// Helper function to get email username (part before @)
const getEmailUsername = (email) => {
  if (!email) return '';
  const atIndex = email.indexOf('@');
  return atIndex > 0 ? email.substring(0, atIndex) : email;
};

const CreateSchedule = () => {
  const [api, contextHolder] = notification.useNotification();

  const [semesterId, setSemesterId] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [className, setClassName] = useState('');
  const [lecturerId, setLecturerId] = useState('');
  const [lecturerCode, setLecturerCode] = useState('');
  const [lecturerEmail, setLecturerEmail] = useState('');
  const [weekday, setWeekday] = useState('');
  const [slotId, setSlotId] = useState('');
  const [roomId, setRoomId] = useState('');

  const [patterns, setPatterns] = useState([]);
  const [loadedLessons, setLoadedLessons] = useState([]); // Lessons từ API (tất cả lịch học của class)
  const [previewLessons, setPreviewLessons] = useState([]); // Lessons từ patterns (preview)
  const [currentWeekStart, setCurrentWeekStart] = useState(null);
  // Year and week state for FilterBar
  const [year, setYear] = useState(() => dayjs().year());
  const [weekNumber, setWeekNumber] = useState(() => dayjs().isoWeek());

  const [semester, setSemester] = useState({ id: null, start: null, end: null });

  // State for API data
  const [semesterData, setSemesterData] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [timeslots, setTimeslots] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isClassLoaded, setIsClassLoaded] = useState(false); // Chỉ cho phép thao tác sau khi Load Class
  const savingRef = useRef(false);
  const [classStudents, setClassStudents] = useState([]);
  const [totalLesson, setTotalLesson] = useState(null); // Total lesson count from subject
  const [scheduleComplete, setScheduleComplete] = useState(false); // Flag to indicate if schedule is complete
  // Conflict checking is now handled in WeeklySchedule component

  // New state for semester lessons and conflict map
  const [semesterLessons, setSemesterLessons] = useState([]); // All lessons in selected semester
  const [conflictMap, setConflictMap] = useState({}); // Object: "date|slot|room" -> [{ classId, lecturerId, className, ... }]
  const [conflictMapSize, setConflictMapSize] = useState(0); // Track size for React to detect changes
  const [loadingSemesterLessons, setLoadingSemesterLessons] = useState(false);

  // Student schedule cache for student conflict checking
  const [studentScheduleCache, setStudentScheduleCache] = useState({
    studentIds: [],
    studentTimeMap: {} // { studentId: Set of "date|timeId" strings }
  });
  const [loadingStudentCache, setLoadingStudentCache] = useState(false);

  // Filtered options for valid selections
  const [filteredLecturers, setFilteredLecturers] = useState([]);
  const [filteredWeekdays, setFilteredWeekdays] = useState([]);
  const [filteredSlots, setFilteredSlots] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [filteringOptions, setFilteringOptions] = useState(false);
  // Static data - use useMemo to prevent reference changes
  const weekdays = useMemo(() => [
    { value: '2', label: 'Mon' },
    { value: '3', label: 'Tue' },
    { value: '4', label: 'Wed' },
    { value: '5', label: 'Thu' },
    { value: '6', label: 'Fri' },
    { value: '7', label: 'Sat' },
    { value: '8', label: 'Sun' },
  ], []);

  // Generate slots from timeslots (will be updated when timeslots are loaded)
  // Slots should map to timeId from timeslots
  const slots = useMemo(() => {
    return timeslots.length > 0
      ? timeslots.map((ts) => ({
        value: String(ts.timeId),
        label: `Slot ${ts.timeId}`
      }))
      : Array.from({ length: 8 }, (_, i) => ({ value: String(i + 1), label: `Slot ${i + 1}` }));
  }, [timeslots]);

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

  // buildAvailabilityKey is no longer needed - conflict checking is in WeeklySchedule

  // Check if a date-slot-room combination has conflict using conflict map
  const checkConflictFromMap = (date, timeId, roomId, currentClassId, currentLecturerId) => {
    const reasons = [];
    let hasConflict = false;

    // Check all conflicts for this date+timeId combination (not just specific room)
    // This ensures we catch class conflicts even if room is different
    const timeKey = `${date}|${timeId}`;
    const roomKey = `${date}|${timeId}|${roomId}`;

    // Check room-specific conflicts
    const roomConflicts = conflictMap[roomKey] || [];
    roomConflicts.forEach(conflict => {
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
          // Class conflict: same class already has lesson at this date/time (even different room)
          // This prevents same class from having 2 lessons at same time
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
              const lecturerDisplay = conflict.lecturerCode
                ? (conflict.lecturerCode.includes('@') ? getEmailUsername(conflict.lecturerCode) : conflict.lecturerCode)
                : 'Unknown';
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

  // Check if a weekday+slot+room combination has any available date in semester
  const hasAvailableDateInSemester = (weekdayValue, timeId, roomId, currentClassId, currentLecturerId) => {
    if (!semester.start || !semester.end) return false;

    let currentDate = findNextDateForWeekday(semester.start, weekdayValue);
    const endDate = semester.end;

    while (currentDate && currentDate <= endDate) {
      const dateStr = toYMD(currentDate);
      // Skip holidays
      const isHoliday = holidays.some(h => h.date === dateStr);
      if (!isHoliday) {
        const conflict = checkConflictFromMap(dateStr, parseInt(timeId, 10), parseInt(roomId, 10), currentClassId, currentLecturerId);
        if (!conflict.hasConflict) {
          // Also check student conflicts
          const classTimeKey = `${dateStr}|${timeId}`;
          if (studentScheduleCache.studentIds && studentScheduleCache.studentIds.length > 0) {
            const hasStudentConflict = studentScheduleCache.studentIds.some(studentId => {
              const studentSlots = studentScheduleCache.studentTimeMap[studentId];
              return studentSlots && studentSlots.has(classTimeKey);
            });
            if (!hasStudentConflict) {
              return true; // Found at least one available date
            }
          } else {
            return true; // No students in class, so no student conflict
          }
        }
      }
      // Move to next week
      currentDate = addDays(currentDate, 7);
    }

    return false; // No available date found
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

        // Fetch rooms - only Active rooms
        console.log('Fetching rooms...');
        const roomsResponse = await RoomApi.getRooms({ pageSize: 100 });
        console.log('Rooms response:', roomsResponse);
        const roomsList = roomsResponse.items || [];
        console.log('Rooms list:', roomsList);

        if (roomsList.length === 0) {
          console.warn('No rooms found in response');
        }

        // Filter only Active rooms
        const activeRooms = roomsList.filter(room => room.status === 'Active' || room.status === 'active');
        console.log('Active rooms:', activeRooms.length, 'out of', roomsList.length);

        const formattedRooms = activeRooms.map(room => ({
          value: String(room.roomId),
          label: room.roomName,
          status: room.status || 'Active'
        }));
        console.log('Formatted rooms (Active only):', formattedRooms);
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

  // Extract loadSemesterLessons logic into a reusable function
  const loadSemesterLessons = useCallback(async () => {
    const semId = semester.id || semesterId;
    if (!semId) {
      setSemesterLessons([]);
      setConflictMap({});
      setConflictMapSize(0);
      return;
    }

    try {
      setLoadingSemesterLessons(true);
      console.log('Loading all lessons for semester:', semId);
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
          classId: lesson.classId,
          className: lesson.className,
          lecturerId: lesson.lecturerId,
          lecturerCode: lecturerDisplay, // Store substring email or lecturerCode
          date: lesson.date,
          timeId: lesson.timeId,
          roomId: lesson.roomId,
          roomName: lesson.roomName
        });
      });

      const mapSize = Object.keys(newConflictMap).length;
      console.log('Built conflict map with', mapSize, 'keys');
      console.log('Sample conflict keys:', Object.keys(newConflictMap).slice(0, 5));
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
  }, [semester.id, semesterId]);

  // Load all lessons of semester when semester is selected
  useEffect(() => {
    loadSemesterLessons();
  }, [loadSemesterLessons]);

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
        // Backend: { studentIds: [1,2,3], studentTimeMap: { 1: Set<string>, 2: Set<string> } }
        // Frontend: { studentIds: [1,2,3], studentTimeMap: { 1: Set<string>, 2: Set<string> } }
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

  // Check if schedule is complete when loadedLessons or totalLesson changes
  useEffect(() => {
    if (totalLesson !== null && totalLesson !== undefined && loadedLessons.length > 0) {
      const isComplete = loadedLessons.length >= totalLesson;
      setScheduleComplete(isComplete);

      if (isComplete) {
        api.warning({
          message: 'The class has been fully scheduled.',
          description: `This class already has ${loadedLessons.length}/${totalLesson} class. Cannot add more schedule.`,
          placement: 'bottomRight',
          duration: 5,
        });
      }
    } else {
      setScheduleComplete(false);
    }
  }, [loadedLessons.length, totalLesson, api]);

  // Initialize week
  useEffect(() => {
    const today = new Date();
    const initWeek = mondayOf(today);
    setCurrentWeekStart(initWeek);
    setYear(dayjs(today).year());
    setWeekNumber(dayjs(today).isoWeek());
  }, []);

  // Sync currentWeekStart with year and weekNumber
  useEffect(() => {
    if (year && weekNumber) {
      const weekStart = dayjs().year(year).isoWeek(weekNumber).isoWeekday(1).toDate();
      setCurrentWeekStart(weekStart);
    }
  }, [year, weekNumber]);

  // Regenerate preview lessons when lecturer, patterns, semester, holidays, rooms, or totalLesson change
  useEffect(() => {
    // Preview should show whenever we have patterns and semester dates, even if lecturer/subject not selected yet
    if (patterns.length > 0 && semester.start && semester.end) {
      // Use empty strings if lecturer/subject not selected yet, so preview still shows
      const newPreviewLessons = generateLessonsFromPatterns(
        patterns,
        semester.start,
        semester.end,
        lecturerEmail || '', // Use lecturerEmail or empty string
        subjectCode || '', // Use subjectCode or empty string
        subjectName || '', // Use subjectName or empty string
        totalLesson // Pass totalLesson to limit preview lessons
      );
      console.log('Preview lessons generated:', newPreviewLessons.length, 'from', patterns.length, 'patterns');
      setPreviewLessons(newPreviewLessons);
    } else {
      setPreviewLessons([]);
    }
  }, [lecturerEmail, subjectCode, subjectName, patterns, semester.start, semester.end, rooms, holidays, totalLesson]);
  // Conflict checking is now handled in WeeklySchedule component
  // No need to check availability for preview lessons

  // Filter options to show only valid selections using conflict map
  // This runs whenever prerequisites change to filter out unavailable options
  useEffect(() => {
    // Skip if prerequisites not met (classId and semester are required, lecturerId is optional for filtering)
    if (!classId || !semester.start || !semester.end) {
      setFilteringOptions(false);
      setFilteredWeekdays(weekdays);
      setFilteredSlots(slots);
      setFilteredRooms(rooms);
      return;
    }

    // Skip if no options available
    if (weekdays.length === 0 || slots.length === 0 || rooms.length === 0) {
      setFilteringOptions(false);
      return;
    }

    // Skip if conflict map is not ready yet
    if (conflictMapSize === 0 && loadingSemesterLessons) {
      console.log('Waiting for conflict map to load...');
      setFilteringOptions(true);
      return;
    }

    console.log('Filtering options with conflict map size:', conflictMapSize);
    setFilteringOptions(true);

    // Use lecturerId if available, otherwise use null (will check room/class conflicts only)
    const effectiveLecturerId = lecturerId || null;

    // Filter based on current selections
    // NEW LOGIC: When weekday is selected -> filter slots (only show slots with at least 1 available room)
    // When slot is selected -> filter rooms (only show rooms that are available for that slot)

    // Case 1: User has selected weekday and slot -> filter rooms (only available rooms for this weekday+slot)
    // But still show all available slots for this weekday (so user can change slot)
    if (weekday && slotId) {
      // Filter rooms for the selected weekday+slot
      const validRooms = [];
      for (const room of rooms) {
        // Check if room is available (not occupied) for this weekday+slot combination
        // Room must be Active (already filtered in fetchData) and available in semester
        if (hasAvailableDateInSemester(weekday, slotId, room.value, classId, effectiveLecturerId)) {
          validRooms.push(room);
        }
      }
      console.log(`Filtered rooms for weekday ${weekday} + slot ${slotId}:`, validRooms.length, 'out of', rooms.length);
      setFilteredRooms(validRooms.length > 0 ? validRooms : []);

      // Still show all available slots for this weekday (so user can change slot selection)
      const validSlots = [];
      for (const slot of slots) {
        // Check if this slot has at least one available room for this weekday
        let slotHasAvailableRoom = false;
        for (const room of rooms) {
          if (hasAvailableDateInSemester(weekday, slot.value, room.value, classId, effectiveLecturerId)) {
            slotHasAvailableRoom = true;
            break;
          }
        }
        if (slotHasAvailableRoom) {
          validSlots.push(slot);
        }
      }
      console.log(`Filtered slots for weekday ${weekday}:`, validSlots.length, 'out of', slots.length);
      setFilteredSlots(validSlots.length > 0 ? validSlots : []);
    }
    // Case 2: User has selected only weekday -> filter slots (only show slots with at least 1 available room)
    else if (weekday) {
      const validSlots = [];
      const validRooms = [];

      // Check each slot: must have at least one room available for this weekday
      for (const slot of slots) {
        let slotHasAvailableRoom = false;
        for (const room of rooms) {
          if (hasAvailableDateInSemester(weekday, slot.value, room.value, classId, effectiveLecturerId)) {
            slotHasAvailableRoom = true;
            // Collect all available rooms for this weekday (will be filtered when slot is selected)
            if (!validRooms.find(r => r.value === room.value)) {
              validRooms.push(room);
            }
          }
        }
        if (slotHasAvailableRoom) {
          validSlots.push(slot);
        }
      }

      console.log(`Filtered slots for weekday ${weekday}:`, validSlots.length, 'out of', slots.length);
      setFilteredSlots(validSlots.length > 0 ? validSlots : []);
      // Don't filter rooms yet (wait for slot selection)
      setFilteredRooms(rooms);
    }
    // Case 3: User has selected only slot -> filter weekdays and rooms
    else if (slotId) {
      const validWeekdays = [];
      const validRooms = [];

      // Check each weekday: must have at least one room available for this slot
      for (const wd of weekdays) {
        let weekdayHasAvailableRoom = false;
        for (const room of rooms) {
          if (hasAvailableDateInSemester(wd.value, slotId, room.value, classId, effectiveLecturerId)) {
            weekdayHasAvailableRoom = true;
            if (!validRooms.find(r => r.value === room.value)) {
              validRooms.push(room);
            }
          }
        }
        if (weekdayHasAvailableRoom) {
          validWeekdays.push(wd);
        }
      }

      setFilteredWeekdays(validWeekdays.length > 0 ? validWeekdays : []);
      setFilteredRooms(validRooms.length > 0 ? validRooms : []);
    }
    // Case 4: User has selected slot and room -> filter weekdays
    else if (slotId && roomId) {
      const validWeekdays = [];
      for (const wd of weekdays) {
        if (hasAvailableDateInSemester(wd.value, slotId, roomId, classId, effectiveLecturerId)) {
          validWeekdays.push(wd);
        }
      }
      console.log(`Filtered weekdays for slot ${slotId} + room ${roomId}:`, validWeekdays.length, 'out of', weekdays.length);
      setFilteredWeekdays(validWeekdays.length > 0 ? validWeekdays : []);
    }
    // Case 5: User has selected weekday and room -> filter slots
    else if (weekday && roomId) {
      const validSlots = [];
      for (const slot of slots) {
        if (hasAvailableDateInSemester(weekday, slot.value, roomId, classId, effectiveLecturerId)) {
          validSlots.push(slot);
        }
      }
      setFilteredSlots(validSlots.length > 0 ? validSlots : []);
    }
    // Case 6: User has selected only room -> filter weekdays and slots
    else if (roomId) {
      const validWeekdays = [];
      const validSlots = [];

      // Check each weekday: must have at least one slot available for this room
      for (const wd of weekdays) {
        let weekdayHasAvailableSlot = false;
        for (const slot of slots) {
          if (hasAvailableDateInSemester(wd.value, slot.value, roomId, classId, effectiveLecturerId)) {
            weekdayHasAvailableSlot = true;
            if (!validSlots.find(s => s.value === slot.value)) {
              validSlots.push(slot);
            }
          }
        }
        if (weekdayHasAvailableSlot) {
          validWeekdays.push(wd);
        }
      }

      setFilteredWeekdays(validWeekdays.length > 0 ? validWeekdays : []);
      setFilteredSlots(validSlots.length > 0 ? validSlots : []);
    }
    // Case 7: User hasn't selected anything -> show all options (will be filtered when weekday is selected)
    else {
      setFilteredWeekdays(weekdays);
      setFilteredSlots(slots);
      setFilteredRooms(rooms);
    }

    setFilteringOptions(false);
  }, [weekday, slotId, roomId, lecturerId, classId, semester.start, semester.end, conflictMapSize, holidays, weekdays, slots, rooms, loadingSemesterLessons, studentScheduleCache]);

  // Calculate total lessons that will be generated from patterns (without totalLesson limit)
  // Used for validation to ensure we have enough lessons
  const calculateTotalLessonsFromPatterns = (patterns, semStart, semEnd) => {
    if (!patterns || patterns.length === 0 || !semStart || !semEnd) {
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

  // Generate lessons from patterns for entire semester
  const generateLessonsFromPatterns = (patterns, semStart, semEnd, lecturer, subjectCodeValue, subjectNameValue, totalLessonCount) => {
    const generatedLessons = [];
    const holidaysDates = holidays.map(h => h.date);

    // Start from Monday of semester start week
    let currentDate = mondayOf(semStart);
    const endDate = semEnd;

    // Generate lessons for each week in semester
    while (currentDate <= endDate && (!totalLessonCount || generatedLessons.length < totalLessonCount)) {
      // For each weekday (Mon-Sun)
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        // Stop if we've reached the total lesson count
        if (totalLessonCount && generatedLessons.length >= totalLessonCount) {
          break;
        }

        const lessonDate = addDays(currentDate, dayOffset);

        // Skip if before semester start (important: only generate from semStart onwards)
        if (lessonDate < semStart) continue;

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
          // Stop if we've reached the total lesson count
          if (totalLessonCount && generatedLessons.length >= totalLessonCount) {
            return;
          }

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
      setTotalLesson(null);
      return;
    }
    try {
      const studentResponse = await ClassList.getStudents(clsId);
      const responseData = studentResponse?.data || studentResponse || {};

      // Extract students
      const rawStudents = responseData?.students
        || responseData?.items
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

      // Extract totalLesson from subject
      const subjectTotalLesson = responseData?.subject?.totalLesson
        || responseData?.totalLesson
        || null;
      if (subjectTotalLesson !== null && subjectTotalLesson !== undefined) {
        setTotalLesson(parseInt(subjectTotalLesson, 10));
        console.log('Total lesson from subject:', subjectTotalLesson);
      } else {
        setTotalLesson(null);
      }
    } catch (error) {
      console.error('Failed to fetch class students:', error);
      setClassStudents([]);
      setTotalLesson(null);
    }
  };
  const handleLoadClass = async (data) => {
    // Clear Pending Schedule to avoid duplicates when loading a new class
    setPatterns([]);

    // Mỗi lần load class mới thì reset flag và dữ liệu pending
    setIsClassLoaded(false);

    // Nếu nhận được data từ PickSemesterAndClass (API call)
    if (data && data.schedule) {
      const { schedule, semesterId: semId, classId: clsId, semesterOptions: semOpt, subjectCode: subCode, subjectName: subName, className: clsName } = data;

      console.log('Received schedule data:', { schedule, semOpt, semId, clsId, subCode, subName, clsName });

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

        // Get lecturer display (prioritize email if available, then substring before @)
        const lecturerDisplay = lesson.lecturerEmail
          ? getEmailUsername(lesson.lecturerEmail)
          : (lesson.lecturerCode || '');

        return {
          date: dateStr, // Ensure YYYY-MM-DD format
          weekday: weekday,
          slot: slot,
          room: roomName,
          roomId: roomId, // Add roomId for conflict checking
          lecturer: lecturerDisplay, // map lecturerEmail or lecturerCode from API
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

      // Set subject code and name from API getInformationOfClass (priority) or from schedule (fallback)
      const subjectCodeFromApi = subCode || '';
      const subjectNameFromApi = subName || '';
      const firstSubjectCode = subjectCodeFromApi || schedule[0]?.subjectCode || '';
      const firstSubjectName = subjectNameFromApi || schedule[0]?.subjectName || '';
      // Priority: className from PickSemesterAndClass > className from schedule[0] > empty string
      const firstClassName = clsName || schedule[0]?.className || '';

      if (firstSubjectCode) {
        setSubjectCode(firstSubjectCode);
      }
      if (firstSubjectName) {
        setSubjectName(firstSubjectName);
      }
      if (firstClassName) {
        setClassName(firstClassName);
      }

      // Also update semesterId and classId in parent state
      setSemesterId(semId);
      setClassId(clsId);
      await fetchClassStudents(clsId);

      // Đánh dấu là đã load dữ liệu lớp thành công
      setIsClassLoaded(true);

      // Check if schedule is complete after fetching class students
      // Note: We need to wait for totalLesson to be set, so we'll check in useEffect
      return;
    }

    // Fallback: should not happen since PickSemesterAndClass handles API calls
    // But keep this as a safety check
    console.warn('handleLoadClass: No schedule data received from API');
  };

  const handleAddPattern = () => {
    // Check if schedule is already complete
    if (scheduleComplete) {
      api.error({
        message: 'Không thể thêm lịch học',
        description: `Lớp này đã có đủ ${totalLesson} buổi học. Không thể thêm lịch học mới.`,
        placement: 'bottomRight',
        duration: 4,
      });
      return;
    }

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

    // Conflict checking is now handled in WeeklySchedule component
    // If we reach here, it means no conflict (button was enabled)
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
    // Nếu đã có currentWeekStart thì ưu tiên di chuyển theo ngày thực tế
    if (currentWeekStart) {
      let newWeekStart = addDays(currentWeekStart, -7);
      // Nếu đã chọn semester thì không cho vượt ra ngoài phạm vi semester
      newWeekStart = clampWeekStartWithinSemester(newWeekStart);
      setCurrentWeekStart(newWeekStart);
      const d = dayjs(newWeekStart);
      setYear(d.year());
      setWeekNumber(d.isoWeek());
      return;
    }

    // Fallback: logic cũ theo year/weekNumber
    if (!year || !weekNumber) return;
    const currentDate = dayjs().year(year).isoWeek(weekNumber).isoWeekday(1);
    const prevDate = currentDate.subtract(1, 'week');
    const newWeekNum = prevDate.isoWeek();
    const newYear = prevDate.year();
    setWeekNumber(newWeekNum);
    if (newYear !== year) {
      setYear(newYear);
    }
  };

  const handleNextWeek = () => {
    if (currentWeekStart) {
      let newWeekStart = addDays(currentWeekStart, 7);
      newWeekStart = clampWeekStartWithinSemester(newWeekStart);
      setCurrentWeekStart(newWeekStart);
      const d = dayjs(newWeekStart);
      setYear(d.year());
      setWeekNumber(d.isoWeek());
      return;
    }

    if (!year || !weekNumber) return;
    const currentDate = dayjs().year(year).isoWeek(weekNumber).isoWeekday(1);
    const nextDate = currentDate.add(1, 'week');
    const newWeekNum = nextDate.isoWeek();
    const newYear = nextDate.year();
    setWeekNumber(newWeekNum);
    if (newYear !== year) {
      setYear(newYear);
    }
  };

  const getMaxIsoWeekOfYear = (yr) => {
    if (!yr) return 52;
    // Chuẩn ISO: số tuần của năm được xác định bởi tuần chứa ngày 28/12
    return dayjs(`${yr}-12-28`).isoWeek();
  };

  const handleYearChange = (newYear) => {
    const maxWeek = getMaxIsoWeekOfYear(newYear);
    setYear(newYear);
    // Giữ weekNumber hiện tại nếu còn trong khoảng của năm mới, nếu không thì clamp về maxWeek
    setWeekNumber((prev) => {
      if (!prev || prev < 1) return 1;
      if (prev > maxWeek) return maxWeek;
      return prev;
    });
  };

  const handleWeekChange = (newWeekNumber) => {
    setWeekNumber(newWeekNumber);
  };

  const handleSave = async () => {
    // ====== LOCK SAVE - CHECK VÀ SET NGAY ĐẦU HÀM ĐỂ CHẶN SPAM ======
    // Check ref TRƯỚC (sync) để tránh race condition khi spam click
    if (savingRef.current) {
      console.log('Save is already in progress (ref check), ignore this click.');
      return;
    }

    // Set lock NGAY LẬP TỨC (sync) để chặn các clicks tiếp theo
    savingRef.current = true;
    // Set state để update UI (async nhưng không quan trọng vì đã có ref lock)
    setSaving(true);

    console.log('=== handleSave called ===');
    console.log('Current state:', {
      semesterId: semester.id,
      classId: classId,
      lecturerId: lecturerId,
      patternsCount: patterns.length,
      patterns: patterns
    });

    // Dùng semester.id hoặc fallback semesterId
    const effectiveSemesterId = semester.id || semesterId;

    // ====== VALIDATION ======
    if (!effectiveSemesterId || !classId) {
      console.warn('Validation failed: Missing semester or class', {
        semesterId: effectiveSemesterId,
        classId: classId,
        semester: semester
      });
      // Unlock khi validation fail
      savingRef.current = false;
      setSaving(false);
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
      // Unlock khi validation fail
      savingRef.current = false;
      setSaving(false);
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
      // Unlock khi validation fail
      savingRef.current = false;
      setSaving(false);
      api.error({
        message: 'Error',
        description: 'Please select lecturer',
        placement: 'bottomRight',
        duration: 4,
      });
      return;
    }

    // Validate totalLesson: check if patterns will generate enough lessons
    if (totalLesson && totalLesson > 0 && semester.start && semester.end) {
      const totalLessonsToBeGenerated = calculateTotalLessonsFromPatterns(
        patterns,
        semester.start,
        semester.end
      );
      if (totalLessonsToBeGenerated < totalLesson) {
        console.warn('Validation failed: Insufficient lessons', {
          totalLesson: totalLesson,
          lessonsToBeGenerated: totalLessonsToBeGenerated
        });
        // Unlock khi validation fail
        savingRef.current = false;
        setSaving(false);
        api.error({
          message: 'Insufficient Lessons',
          description: `Subject requires ${totalLesson} lessons, but patterns will only generate ${totalLessonsToBeGenerated} lessons. Please add more patterns or adjust the schedule.`,
          placement: 'bottomRight',
          duration: 6,
        });
        return;
      }
      // Note: If totalLessonsToBeGenerated > totalLesson, backend will limit to totalLesson
      // This is acceptable - backend will create exactly totalLesson lessons
      if (totalLessonsToBeGenerated > totalLesson) {
        console.log('Patterns will generate more lessons than required. Backend will limit to', totalLesson);
      }
    }

    // ====== PRE-SAVE CONFLICT VALIDATION ON UI ======
    // Double-check that each pattern still has at least one available date in the semester
    // using latest conflictMap + studentScheduleCache, before calling API
    if (semester.start && semester.end && patterns.length > 0) {
      const conflictDetails = [];

      patterns.forEach((pattern) => {
        const weekdayValue = String(pattern.weekday);
        const timeIdValue = String(pattern.slot);
        const roomValue = String(pattern.room);

        const hasAvailable = hasAvailableDateInSemester(
          weekdayValue,
          timeIdValue,
          roomValue,
          classId || null,
          lecturerId || null
        );

        if (!hasAvailable) {
          // Build human‑readable description for this pattern
          const weekdayLabel = weekdayMap[pattern.weekday] || `Weekday ${pattern.weekday}`;
          const slotLabel = `Slot ${pattern.slot}`;
          const roomObj = rooms.find((r) => String(r.value) === roomValue);
          const roomLabel = roomObj ? roomObj.label : `Room ${roomValue}`;

          conflictDetails.push(`${weekdayLabel} | ${slotLabel} | ${roomLabel} has no available date in this semester (conflicts with existing timetable).`);
        }
      });

      if (conflictDetails.length > 0) {
        console.warn('Pre-save conflict validation failed for patterns:', conflictDetails);
        savingRef.current = false;
        setSaving(false);

        api.error({
          message: 'Schedule conflicts detected',
          description: (
            <div>
              <div style={{ marginBottom: 4 }}>
                Some weekly patterns cannot be scheduled because they conflict with existing classes / rooms / lecturers / students.
              </div>
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                {conflictDetails.map((msg, idx) => (
                  <li key={idx}>{msg}</li>
                ))}
              </ul>
            </div>
          ),
          placement: 'bottomRight',
          duration: 8,
        });

        return;
      }
    }

    try {
      console.log('Starting save process...');

      const formattedPatterns = patterns.map(pattern => {
        const formatted = {
          weekday: pattern.weekday, // 2=Mon, 3=Tue, etc.
          timeId: parseInt(pattern.slot), // timeId from slot
          roomId: parseInt(pattern.room) // roomId
        };
        console.log('Formatted pattern:', formatted, 'from original:', pattern);
        return formatted;
      });

      const payload = {
        semesterId: parseInt(effectiveSemesterId),
        classId: parseInt(classId),
        lecturerId: parseInt(lecturerId),
        patterns: formattedPatterns,
        totalLesson: totalLesson ? parseInt(totalLesson, 10) : null
      };

      console.log('Saving schedule with payload:', payload);
      console.log('Payload JSON:', JSON.stringify(payload, null, 2));

      const response = await ClassList.createSchedule(payload);
      console.log('Schedule saved successfully, response:', response);
      console.log('Response type:', typeof response);
      console.log('Response keys:', response ? Object.keys(response) : 'null');
      console.log('Full response structure:', JSON.stringify(response, null, 2));

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

        // Refresh conflict map after successful save to include newly created lessons
        // This prevents race condition when creating schedules for multiple classes
        console.log('Refreshing conflict map after successful save...');
        await loadSemesterLessons();

        // Also reload the class schedule to show newly created lessons
        if (classId && effectiveSemesterId) {
          try {
            const scheduleResponse = await ClassList.getSchedule(effectiveSemesterId, classId);
            const scheduleData = scheduleResponse || [];
            const convertedLessons = scheduleData.map(lesson => {
              const dateStr = lesson.date;
              const lessonDate = fromYMD(dateStr);
              const dayOfWeek = lessonDate.getDay();
              const weekday = dayOfWeek === 0 ? 8 : dayOfWeek + 1;
              const slot = lesson.timeId || 1;
              const roomName = lesson.roomName || '';
              const room = rooms.find(r => r.label === roomName);
              const roomId = room ? room.value : null;
              const lecturerDisplay = lesson.lecturerEmail
                ? getEmailUsername(lesson.lecturerEmail)
                : (lesson.lecturerCode || '');

              return {
                date: dateStr,
                weekday: weekday,
                slot: slot,
                room: roomName,
                roomId: roomId,
                lecturer: lecturerDisplay,
                subjectCode: lesson.subjectCode || '',
                subjectName: lesson.subjectName || '',
                className: lesson.className || '',
                startTime: lesson.startTime || '',
                endTime: lesson.endTime || '',
                timeId: lesson.timeId,
                isLoaded: true
              };
            });
            setLoadedLessons(convertedLessons);
            console.log('Reloaded class schedule:', convertedLessons.length, 'lessons');
          } catch (error) {
            console.error('Failed to reload class schedule:', error);
            // Don't fail the save operation if reload fails
          }
        }

        // Sau khi lưu thành công thì xoá cache hiện tại ở Weekly Schedules:
        // - Xoá toàn bộ patterns (Pending Schedule)
        // - Reset lựa chọn weekday / slot / room
        setPatterns([]);
        setWeekday('');
        setSlotId('');
        setRoomId('');
      }
    } catch (error) {
      console.error('=== Error saving schedule ===');
      console.error('Error response status:', error?.response?.status);
      console.error('Error response data:', error?.response?.data);

      if (error?.response?.status === 409) {
        const serverMsg = (error?.response?.data?.message || '').toString();
        api.error({
          message: 'Schedule Conflict Detected (Backend)',
          description: 'Phát hiện conflict từ server. Vui lòng kiểm tra lại patterns và thử lại. ' + serverMsg,
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
      savingRef.current = false;
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

  // Conflict checking is now handled in WeeklySchedule component
  // No need to check overall conflicts for preview lessons

  const renderCalendar = (weekStart) => {
    if (!weekStart) return { columns: [], dataSource: [] };

    const slotsToRender = timeslots.length > 0
      ? timeslots.map(ts => ({ timeId: ts.timeId, label: `Slot ${ts.timeId}` }))
      : Array.from({ length: 8 }, (_, i) => ({ timeId: i + 1, label: `Slot ${i + 1}` }));

    const holidayLookup = holidays.reduce((acc, holiday) => {
      if (holiday && holiday.date) {
        // Chuẩn hoá lại ngày nghỉ để đảm bảo đúng format YYYY-MM-DD
        const normalized = normalizeDateString(holiday.date);
        if (normalized) {
          acc[normalized] =
            holiday.name ||
            holiday.holidayName ||
            holiday.reason ||
            holiday.description ||
            'Holiday';
        }
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
        const [year, month, day] = dateStr.split('-');
        const formattedDate = `${day}/${month}`;

        return {
          title: (
            <div style={{ textAlign: 'center' }}>
              <div>{dayLabel}</div>
              <div style={{ fontSize: '12px', fontWeight: 'normal', color: '#666' }}>
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
          // Preview lesson exists - display ClassName, RoomName
          // Conflict checking is handled in WeeklySchedule component
          const previewClassName = previewLesson.className || className || '';
          const previewRoomName = previewLesson.room || '';
          const previewLecturer = previewLesson.lecturer || '';
          // Ensure lecturer display is substring if it's an email (same as loaded lesson)
          const previewLecturerDisplay = previewLecturer.includes('@')
            ? getEmailUsername(previewLecturer)
            : previewLecturer;
          const parts = [];
          if (previewClassName) parts.push(previewClassName);
          if (previewRoomName) parts.push(previewRoomName);
          if (previewLecturerDisplay) parts.push(previewLecturerDisplay);

          const displayText = parts.join(' | ');
          cellContents.push(displayText);
          cellStyle = {
            backgroundColor: '#e8f5e9',
            color: '#2e7d32',
            fontWeight: 'bold',
            border: '2px solid #2e7d32'
          };
          classNames.push('lesson-preview');
        } else if (loadedLesson) {
          // Only loaded lesson exists (no preview) - display ClassName, RoomName
          const loadedClassName = loadedLesson.className || className || '';
          const loadedRoomName = loadedLesson.room || '';
          const loadedLecturer = loadedLesson.lecturer || '';
          // Ensure lecturer display is substring if it's an email
          const loadedLecturerDisplay = loadedLecturer.includes('@')
            ? getEmailUsername(loadedLecturer)
            : loadedLecturer;

          const parts = [];
          if (loadedClassName) parts.push(loadedClassName);
          if (loadedRoomName) parts.push(loadedRoomName);
          if (loadedLecturerDisplay) parts.push(loadedLecturerDisplay);

          cellContents.push(parts.length > 0 ? parts.join(' | ') : '');
          // Dùng style xanh dương giống EditSchedule để đồng bộ UI
          cellStyle = {
            backgroundColor: '#e3f2fd',
            color: '#1976d2',
            fontWeight: 'bold',
            border: '2px solid #1976d2'
          };
          classNames.push('lesson-loaded');
        }

        if (holidayName) {
          // Always show holiday tag, even if cell is empty
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
              Pick semester & class, define weekly schedule, then preview conflicts before saving.
            </Typography.Text>
            <Space size="small" wrap style={{ marginTop: 8 }}>
              {subjectCode && subjectName && (
                <Tag icon={<BookOutlined />} color="processing">
                  {subjectCode} — {subjectName}
                </Tag>
              )}
              {lecturerEmail && (
                <Tag icon={<UserOutlined />} color="blue">
                  {lecturerEmail.includes('@') ? lecturerEmail.substring(0, lecturerEmail.indexOf('@')) : lecturerEmail}
                </Tag>
              )}
              {holidays.length > 0 && (
                <Tag icon={<CalendarOutlined />} color="gold">
                  {holidays.length} holidays loaded
                </Tag>
              )}
              {totalLesson !== null && totalLesson !== undefined && (
                <Tag color={scheduleComplete ? "warning" : "success"}>
                  Lessons: {loadedLessons.length}/{totalLesson}
                </Tag>
              )}
            </Space>
          </div>

          <Row gutter={[16, 16]} style={{ display: 'flex', alignItems: 'stretch' }}>
            <Col xs={24} xl={16} style={{ display: 'flex' }}>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                <PickSemesterAndClass
                  semesterId={semesterId}
                  classId={classId}
                  onSemesterChange={(value) => {
                    // Đổi semester thì bắt buộc phải load lại class
                    setSemesterId(value);
                    setClassId('');
                    setPatterns([]);
                    setLoadedLessons([]);
                    setPreviewLessons([]);
                    setIsClassLoaded(false);
                  }}
                  onClassChange={(value) => {
                    // Đổi class trong cùng semester cũng yêu cầu load lại
                    setClassId(value);
                    setPatterns([]);
                    setPreviewLessons([]);
                    setIsClassLoaded(false);
                  }}
                  onLoadClass={handleLoadClass}
                />
              </div>
            </Col>
            <Col xs={24} xl={8} style={{ display: 'flex' }}>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                <LecturerSelector
                  lecturerId={lecturerId}
                  lecturerCode={lecturerCode}
                  onLecturerChange={(id, code, email) => {
                    setLecturerId(id || '');
                    setLecturerCode(code || '');
                    setLecturerEmail(email || '');
                  }}
                  subjectCode={subjectCode}
                  subjectName={subjectName}
                />
              </div>
            </Col>
          </Row>

          <WeeklySchedules
            weekday={weekday}
            slotId={slotId}
            roomId={roomId}
            patterns={patterns}
            weekdays={filteredWeekdays.length > 0 ? filteredWeekdays : weekdays}
            slots={filteredSlots.length > 0 ? filteredSlots : slots}
            rooms={filteredRooms.length > 0 ? filteredRooms : rooms}
            weekdayMap={weekdayMap}
            onWeekdayChange={setWeekday}
            onSlotChange={setSlotId}
            onRoomChange={setRoomId}
            onAddPattern={handleAddPattern}
            onRemovePattern={handleRemovePattern}
            filteringOptions={filteringOptions}
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
            totalLesson={totalLesson}
            mondayOf={mondayOf}
            scheduleComplete={scheduleComplete}
            controlsDisabled={!isClassLoaded}
          />

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
            weekLabel={currentWeekStart ? `${dayjs(currentWeekStart).format('DD/MM')} - ${dayjs(addDays(currentWeekStart, 6)).format('DD/MM')}` : ''}
          />

          <SaveButton
            onSave={handleSave}
            saving={saving}
            disabled={!isClassLoaded}
            disabledReason="Please load class timetable before saving."
          />
        </Space>
      </Layout.Content>
    </Layout>
  );
};

export default CreateSchedule;


