import React, { useState, useEffect } from 'react';
import './CreateSchedule.css';
import SemestersTable from './components/SemestersTable';
import RoomsTable from './components/RoomsTable';
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
import { message } from 'antd';

const CreateSchedule = () => {
  const [semesterId, setSemesterId] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [lecturerId, setLecturerId] = useState('');
  const [weekday, setWeekday] = useState('');
  const [slotId, setSlotId] = useState('');
  const [roomId, setRoomId] = useState('');

  const [patterns, setPatterns] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(null);
  const [previewWeekStart, setPreviewWeekStart] = useState(null);

  const [semester, setSemester] = useState({ id: null, start: null, end: null });

  // State for API data
  const [semesterData, setSemesterData] = useState([]);
  const [roomData, setRoomData] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [timeslots, setTimeslots] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Static data
  const weekdays = [
    { value: '2', label: 'Mon' },
    { value: '3', label: 'Tue' },
    { value: '4', label: 'Wed' },
    { value: '5', label: 'Thu' },
    { value: '6', label: 'Fri' },
  ];

  // Generate slots from timeslots (will be updated when timeslots are loaded)
  // Slots should map to timeId from timeslots
  const slots = timeslots.length > 0
    ? timeslots.map((ts) => ({
      value: String(ts.timeId),
      label: `Slot ${ts.timeId} (${ts.startTime}-${ts.endTime})`
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
    return `Week ${toYMD(weekStart)} → ${toYMD(addDays(weekStart, 4))}`;
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

        // Format room data for table
        const formattedRoomData = roomsList.map(room => ({
          room: room.roomName,
          type: room.status || '-'
        }));
        setRoomData(formattedRoomData);

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
        setRoomData([]);
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
          date: holiday.date,
          reason: holiday.name || holiday.description || ''
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
    setPreviewWeekStart(new Date(initWeek));
  }, []);

  // Regenerate lessons when lecturer, patterns, semester, holidays, or rooms change
  useEffect(() => {
    if (patterns.length > 0 && semester.start && semester.end && classId && rooms.length > 0) {
      const newLessons = generateLessonsFromPatterns(patterns, semester.start, semester.end, lecturerId);
      setLessons(newLessons);
    }
  }, [lecturerId, patterns, semester.start, semester.end, classId, rooms, holidays]);

  // Generate lessons from patterns for entire semester
  const generateLessonsFromPatterns = (patterns, semStart, semEnd, lecturer) => {
    const generatedLessons = [];
    const holidaysDates = holidays.map(h => toYMD(fromYMD(h.date)));

    // Start from Monday of semester
    let currentDate = mondayOf(semStart);
    const endDate = semEnd;

    // Generate lessons for each week in semester
    while (currentDate <= endDate) {
      // For each weekday (Mon-Fri)
      for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
        const lessonDate = addDays(currentDate, dayOffset);

        // Skip if beyond semester end
        if (lessonDate > endDate) break;

        // Skip if holiday
        const dateStr = toYMD(lessonDate);
        if (holidaysDates.includes(dateStr)) continue;

        // Check if this weekday matches any pattern
        const weekdayNum = lessonDate.getDay() || 7; // 1=Sun, 2=Mon, etc. Convert to 2=Mon, 7=Sun
        const normalizedWeekday = weekdayNum === 0 ? 7 : weekdayNum; // Mon=2, Tue=3, etc.

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
            });
          }
        });
      }

      // Move to next week
      currentDate = addDays(currentDate, 7);
    }

    return generatedLessons;
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

      // Set week start to Monday of first lesson
      const firstLessonDate = schedule.length > 0 ? fromYMD(schedule[0].date) : semStart;
      const weekStartMonday = mondayOf(firstLessonDate);
      setCurrentWeekStart(weekStartMonday);
      setPreviewWeekStart(new Date(weekStartMonday));

      // Convert schedule data từ API sang format cho calendar
      const convertedLessons = schedule.map(lesson => {
        const lessonDate = fromYMD(lesson.date);
        const dayOfWeek = lessonDate.getDay(); // 0=Sun, 1=Mon, 2=Tue, etc.
        // Convert to weekday format: Mon=2, Tue=3, Wed=4, Thu=5, Fri=6
        const weekday = dayOfWeek === 0 ? 7 : dayOfWeek + 1; // Mon should be 2, Tue=3, etc.

        // Use timeId as slot (assuming timeId maps to slot 1-8)
        const slot = lesson.timeId || 1;

        return {
          date: lesson.date,
          weekday: weekday,
          slot: slot,
          room: lesson.roomName || '',
          lecturer: '', // API không trả về lecturer
          subjectCode: lesson.subjectCode || '',
          startTime: lesson.startTime || '',
          endTime: lesson.endTime || '',
          timeId: lesson.timeId
        };
      });

      console.log('Converted lessons:', convertedLessons);
      setLessons(convertedLessons);
      
      // Set subject code and name from schedule
      const firstSubjectCode = schedule[0]?.subjectCode || '';
      const firstSubjectName = schedule[0]?.subjectName || schedule[0]?.className || '';
      if (firstSubjectCode) {
        setSubjectCode(firstSubjectCode);
      }
      setSubjectName(firstSubjectName);

      // Also update semesterId and classId in parent state
      setSemesterId(semId);
      setClassId(clsId);

      return;
    }

    // Fallback: should not happen since PickSemesterAndClass handles API calls
    // But keep this as a safety check
    console.warn('handleLoadClass: No schedule data received from API');
  };

  const handleAddPattern = () => {
    if (!weekday || !slotId || !roomId) {
      alert('Select weekday, slot, room');
      return;
    }

    const exists = patterns.some(p => p.weekday === parseInt(weekday) && p.slot === parseInt(slotId));
    if (exists) {
      alert('Duplicate weekday+slot');
      return;
    }

    const newPatterns = [...patterns, {
      weekday: parseInt(weekday),
      slot: parseInt(slotId),
      room: roomId,
    }];

    setPatterns(newPatterns);

    // Regenerate lessons if class is loaded
    if (semester.start && semester.end && classId) {
      const newLessons = generateLessonsFromPatterns(newPatterns, semester.start, semester.end, lecturerId);
      setLessons(newLessons);
    }

    setWeekday('');
    setSlotId('');
    setRoomId('');
  };

  const handleRemovePattern = (index) => {
    const newPatterns = patterns.filter((_, i) => i !== index);
    setPatterns(newPatterns);

    // Regenerate lessons if class is loaded
    if (semester.start && semester.end && classId) {
      const newLessons = generateLessonsFromPatterns(newPatterns, semester.start, semester.end, lecturerId);
      setLessons(newLessons);
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

  const handlePrevWeekPreview = () => {
    if (!previewWeekStart) return;
    const newWeek = clampWeekStartWithinSemester(addDays(previewWeekStart, -7));
    setPreviewWeekStart(newWeek);
  };

  const handleNextWeekPreview = () => {
    if (!previewWeekStart) return;
    const newWeek = clampWeekStartWithinSemester(addDays(previewWeekStart, 7));
    setPreviewWeekStart(newWeek);
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
      message.error('Vui lòng chọn semester và class');
      return;
    }
    if (patterns.length === 0) {
      console.warn('Validation failed: No patterns');
      message.error('Vui lòng thêm ít nhất 1 pattern');
      return;
    }
    if (!lecturerId) {
      console.warn('Validation failed: Missing lecturer');
      message.error('Vui lòng chọn lecturer');
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
        message.success(`Đã lưu schedule thành công! Đã tạo ${lessonsCreated} lessons.`);
      } else {
        message.success('Đã lưu schedule thành công!');
      }
      
      // Optionally reload the schedule to show the saved data
      // You can trigger a reload here if needed
    } catch (error) {
      console.error('=== Error saving schedule ===');
      console.error('Error object:', error);
      console.error('Error message:', error?.message);
      console.error('Error response:', error?.response);
      console.error('Error response data:', error?.response?.data);
      console.error('Error response status:', error?.response?.status);
      console.error('Error stack:', error?.stack);
      
      let errorMessage = 'Không thể lưu schedule. Vui lòng thử lại.';
      
      if (error?.response?.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      console.error('Displaying error message:', errorMessage);
      message.error(errorMessage);
    } finally {
      setSaving(false);
      console.log('Save process completed');
    }
  };

  const renderCalendar = (weekStart, isPreview = false) => {
    // Use timeslots if available, otherwise use default 8 slots
    const slotsToRender = timeslots.length > 0
      ? timeslots.map(ts => ({ timeId: ts.timeId, label: `Slot ${ts.timeId}` }))
      : Array.from({ length: 8 }, (_, i) => ({ timeId: i + 1, label: `Slot ${i + 1}` }));

    const calendarData = slotsToRender.map((slotInfo) => {
      const slot = slotInfo.timeId;
      const dayCells = Array(5).fill(null).map((_, dayIdx) => {
        const weekdayNum = dayIdx + 2; // Mon=2, Tue=3, etc.

        if (isPreview) {
          const patternMatch = patterns.find(p => p.weekday === weekdayNum && parseInt(p.slot) === slot);
          if (patternMatch) {
            // Find room name from roomId
            const room = rooms.find(r => r.value === patternMatch.room);
            const roomName = room ? room.label : patternMatch.room;
            return (
              <td key={dayIdx}>
                <div>{roomName}{lecturerId ? ` | ${lecturerId}` : ''}</div>
              </td>
            );
          }
          return <td key={dayIdx}></td>;
        } else {
          if (!weekStart) return <td key={dayIdx}></td>;

          const lessonMatch = lessons.find(l => {
            try {
              if (!l.date) return false;

              const lessonDate = fromYMD(l.date);
              // Calculate which day of week the lesson is on (0=Sun, 1=Mon, etc.)
              const lessonDayOfWeek = lessonDate.getDay();
              // Convert to our format: Mon=2, Tue=3, Wed=4, Thu=5, Fri=6
              const lessonWeekday = lessonDayOfWeek === 0 ? 7 : lessonDayOfWeek + 1;

              // Check if lesson is in current week (Mon-Fri)
              const weekEnd = addDays(weekStart, 4); // Friday of the week
              const isInWeek = lessonDate >= weekStart && lessonDate <= weekEnd;

              // Match both weekday and slot (using timeId)
              const matchesWeekday = lessonWeekday === weekdayNum;
              const lessonTimeId = l.timeId || l.slot;
              const matchesSlot = parseInt(lessonTimeId) === slot;

              return isInWeek && matchesWeekday && matchesSlot;
            } catch (error) {
              console.error('Error matching lesson:', error, l);
              return false;
            }
          });

          if (lessonMatch) {
            const displayText = lessonMatch.room || lessonMatch.subjectCode || '';
            return (
              <td key={dayIdx}>
                <div>{displayText}{lessonMatch.startTime ? ` (${lessonMatch.startTime}-${lessonMatch.endTime})` : ''}</div>
              </td>
            );
          }
          return <td key={dayIdx}></td>;
        }
      });

      return (
        <tr key={slot}>
          <th>{slotInfo.label}</th>
          {dayCells}
        </tr>
      );
    });

    return calendarData;
  };

  const weekdayMap = { 2: 'Mon', 3: 'Tue', 4: 'Wed', 5: 'Thu', 6: 'Fri' };

  if (loading) {
    return (
      <div className="create-schedule-app">
        <main className="create-schedule-main" style={{ padding: '20px', textAlign: 'center' }}>
          <p>Loading data...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="create-schedule-app">
      <main className="create-schedule-main">
        {/* FILTERS / PICKERS */}
        <div className="create-schedule-grid create-schedule-cols-2">
          <PickSemesterAndClass
            semesterId={semesterId}
            classId={classId}
            subjectCode={subjectCode}
            subjectName={subjectName}
            onSemesterChange={setSemesterId}
            onClassChange={setClassId}
            onSubjectChange={(code, name) => {
              setSubjectCode(code);
              setSubjectName(name);
            }}
            onLoadClass={handleLoadClass}
          />
          <LecturerSelector
            lecturerId={lecturerId}
            onLecturerChange={setLecturerId}
          />
        </div>

        {/* CATALOG SNAPSHOTS */}
        <div className="create-schedule-grid create-schedule-cols-2" style={{ marginTop: '16px' }}>
          <SemestersTable data={semesterData} />
          <RoomsTable data={roomData} />
        </div>

        {/* STEP 2: Patterns */}
        <div className="create-schedule-grid create-schedule-cols-1" style={{ marginTop: '16px' }}>
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
          />
        </div>

        {/* CALENDAR VIEW */}
        <div className="create-schedule-grid create-schedule-cols-2" style={{ marginTop: '16px' }}>
          <CalendarTable
            title="Class Timetable (loaded)"
            weekStart={currentWeekStart}
            weekRange={currentWeekStart ? getWeekRange(currentWeekStart) : 'Week'}
            onPrevWeek={handlePrevWeek}
            onNextWeek={handleNextWeek}
            renderCalendar={() => renderCalendar(currentWeekStart, false)}
          />
          <CalendarTable
            title="Preview (patterns × semester)"
            weekStart={previewWeekStart}
            weekRange={previewWeekStart ? getWeekRange(previewWeekStart) : 'Week'}
            onPrevWeek={handlePrevWeekPreview}
            onNextWeek={handleNextWeekPreview}
            renderCalendar={() => renderCalendar(previewWeekStart, true)}
          />
        </div>

        {/* SAVE */}
        <SaveButton onSave={handleSave} saving={saving} />
      </main>
    </div>
  );
};

export default CreateSchedule;
