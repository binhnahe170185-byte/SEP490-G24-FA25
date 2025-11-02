import React, { useState, useEffect } from 'react';
import './CreateSchedule.css';
import SemestersTable from './components/SemestersTable';
import RoomsTable from './components/RoomsTable';
import TimeslotsTable from './components/TimeslotsTable';
import HolidaysTable from './components/HolidaysTable';
import CalendarTable from './components/CalendarTable';
import PickSemesterAndClass from './components/PickSemesterAndClass';
import LecturerSelector from './components/LecturerSelector';
import WeeklyPatterns from './components/WeeklyPatterns';
import SaveButton from './components/SaveButton';

const CreateSchedule = () => {
  const [semesterId, setSemesterId] = useState('');
  const [classId, setClassId] = useState('');
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

  // Mock data
  const semesters = [
    { value: 'FA25', label: 'FA25 (2025-09-01 → 2025-12-20)', start: '2025-09-01', end: '2025-12-20' },
    { value: 'SU25', label: 'SU25 (2025-05-05 → 2025-08-15)', start: '2025-05-05', end: '2025-08-15' },
  ];

  const classes = [
    { value: 'PRJ301-SE1', label: 'PRJ301-SE1' },
    { value: 'JPD203-SE1', label: 'JPD203-SE1' },
  ];

  const lecturers = [
    { value: 'Ms.TranThiB', label: 'Ms. Tran Thi B' },
    { value: 'Mr.NguyenVanA', label: 'Mr. Nguyen Van A' },
  ];

  const weekdays = [
    { value: '2', label: 'Mon' },
    { value: '3', label: 'Tue' },
    { value: '4', label: 'Wed' },
    { value: '5', label: 'Thu' },
    { value: '6', label: 'Fri' },
  ];

  const slots = Array.from({ length: 8 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
  const rooms = [
    { value: 'E101', label: 'E101' },
    { value: 'E205', label: 'E205' },
    { value: 'LAB-A1', label: 'LAB-A1' },
  ];

  const semesterData = [
    { code: 'FA25', start: '2025-09-01', end: '2025-12-20', status: 'Active' },
    { code: 'SU25', start: '2025-05-05', end: '2025-08-15', status: 'Archived' },
    { code: 'SP25', start: '2025-01-15', end: '2025-04-30', status: 'Archived' },
  ];

  const roomData = [
    { room: 'E101', capacity: 40, type: 'Theory' },
    { room: 'E205', capacity: 35, type: 'Theory' },
    { room: 'LAB-A1', capacity: 28, type: 'Lab' },
  ];

  const timeslots = [
    { slot: '1', start: '08:00', end: '09:40' },
    { slot: '2', start: '10:00', end: '11:40' },
    { slot: '3', start: '13:00', end: '14:40' },
    { slot: '4', start: '15:00', end: '16:40' },
  ];

  const holidays = [
    { date: '2025-10-20', reason: 'Midterm Break' },
    { date: '2025-11-01', reason: 'University Event' },
  ];

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

  // Initialize week
  useEffect(() => {
    const today = new Date();
    const initWeek = mondayOf(today);
    setCurrentWeekStart(initWeek);
    setPreviewWeekStart(new Date(initWeek));
  }, []);

  // Regenerate lessons when lecturer changes (if patterns exist and class is loaded)
  useEffect(() => {
    if (patterns.length > 0 && semester.start && semester.end && classId) {
      const newLessons = generateLessonsFromPatterns(patterns, semester.start, semester.end, lecturerId);
      setLessons(newLessons);
    }
  }, [lecturerId, patterns, semester.start, semester.end, classId]);

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
            generatedLessons.push({
              date: dateStr,
              weekday: normalizedWeekday,
              slot: pattern.slot,
              room: pattern.room,
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
      setSubjectName(schedule[0]?.subjectCode || schedule[0]?.className || '');

      // Also update semesterId and classId in parent state
      setSemesterId(semId);
      setClassId(clsId);

      return;
    }

    // Fallback: xử lý theo cách cũ nếu không có data từ API
    if (!semesterId) {
      alert('Pick semester');
      return;
    }
    if (!classId) {
      alert('Pick class');
      return;
    }

    const selectedSem = semesters.find(s => s.value === semesterId);
    if (selectedSem) {
      const semStart = fromYMD(selectedSem.start);
      const semEnd = fromYMD(selectedSem.end);

      setSemester({
        id: semesterId,
        start: semStart,
        end: semEnd,
      });

      const today = new Date();
      let base = mondayOf(today);
      const semStartMonday = mondayOf(semStart);
      if (base < semStartMonday) base = semStartMonday;

      const clampedWeek = clampWeekStartWithinSemester(base, semStart, semEnd);
      setCurrentWeekStart(clampedWeek);
      setPreviewWeekStart(new Date(clampedWeek));

      // Generate lessons for entire semester
      let allLessons = [];

      // If patterns exist, generate from patterns
      if (patterns.length > 0) {
        allLessons = generateLessonsFromPatterns(patterns, semStart, semEnd, lecturerId);
      } else {
        // Otherwise, generate mock lessons for several weeks
        const weekStartDates = [];
        let weekDate = mondayOf(semStart);
        while (weekDate <= semEnd) {
          weekStartDates.push(new Date(weekDate));
          weekDate = addDays(weekDate, 7);
          if (weekStartDates.length >= 8) break; // Limit to first 8 weeks
        }

        weekStartDates.forEach(weekStart => {
          // Add lessons for Monday (weekday 2) and Friday (weekday 6)
          if (weekStart >= semStart && weekStart <= semEnd) {
            allLessons.push({
              date: toYMD(weekStart),
              weekday: 2, // Monday
              slot: 1,
              room: 'E101',
              lecturer: 'Ms. Tran Thi B'
            });

            const fridayDate = addDays(weekStart, 4);
            if (fridayDate <= semEnd) {
              allLessons.push({
                date: toYMD(fridayDate),
                weekday: 6, // Friday
                slot: 3,
                room: 'LAB-A1',
                lecturer: 'Mr. Nguyen Van A'
              });
            }
          }
        });
      }

      setLessons(allLessons);
    }

    setSubjectName(classId.includes('PRJ') ? 'Project Management' : 'Japanese Language');
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

  const handleSave = () => {
    if (!semester.id || !classId) {
      alert('Pick semester & class');
      return;
    }
    if (patterns.length === 0) {
      alert('Add at least 1 pattern');
      return;
    }
    if (!lecturerId) {
      alert('Pick lecturer');
      return;
    }

    console.log('Saving:', {
      semester_id: semester.id,
      class_id: classId,
      patterns: patterns,
      lecturer_id: lecturerId,
    });

    alert('Saved (mock - no backend connection)');
  };

  const renderCalendar = (weekStart, isPreview = false) => {
    const calendarData = Array(8).fill(null).map((_, slotIdx) => {
      const slot = slotIdx + 1;
      const dayCells = Array(5).fill(null).map((_, dayIdx) => {
        const weekdayNum = dayIdx + 2; // Mon=2, Tue=3, etc.

        if (isPreview) {
          const patternMatch = patterns.find(p => p.weekday === weekdayNum && p.slot === slot);
          if (patternMatch) {
            return (
              <td key={dayIdx}>
                <div>{patternMatch.room}{lecturerId ? ` | ${lecturerId}` : ''}</div>
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

              // Match both weekday and slot
              const matchesWeekday = lessonWeekday === weekdayNum;
              const matchesSlot = l.slot === slot;

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
        <tr key={slotIdx}>
          <th>Slot {slot}</th>
          {dayCells}
        </tr>
      );
    });

    return calendarData;
  };

  const weekdayMap = { 2: 'Mon', 3: 'Tue', 4: 'Wed', 5: 'Thu', 6: 'Fri' };

  return (
    <div className="create-schedule-app">
      <aside className="create-schedule-sidebar">
        <div className="create-schedule-brand">
          <span className="create-schedule-pill">FJAP</span>
          <b>Admin / Scheduling</b>
        </div>
        <div className="create-schedule-muted" style={{ fontSize: '12px' }}>
          Static mock screen with light JS; theme based on your reference.
        </div>
        <div className="create-schedule-nav-title">Steps</div>
        <nav className="create-schedule-nav">
          <div className="create-schedule-nav-item create-schedule-active">0) Catalog Setup</div>
          <div className="create-schedule-nav-item">1) Create Classes</div>
          <div className="create-schedule-nav-item">2) Assign Lecturer</div>
          <div className="create-schedule-nav-item">3) Build Timetable</div>
        </nav>
      </aside>

      <div className="create-schedule-main-wrapper">
        <header className="create-schedule-header">
          <h1>Class Scheduling (1 class = 1 subject)</h1>
          <div className="create-schedule-steps">
            <span className="create-schedule-step create-schedule-done">0 Catalogs</span>
            <span className="create-schedule-step create-schedule-done">1 Create Classes</span>
            <span className="create-schedule-step create-schedule-current">2 Assign Lecturer</span>
            <span className="create-schedule-step">3 Timetable</span>
          </div>
        </header>

        <main className="create-schedule-main">
          {/* FILTERS / PICKERS */}
          <div className="create-schedule-grid create-schedule-cols-2">
            <PickSemesterAndClass
              semesterId={semesterId}
              classId={classId}
              subjectName={subjectName}
              semesters={semesters}
              classes={classes}
              onSemesterChange={setSemesterId}
              onClassChange={setClassId}
              onLoadClass={handleLoadClass}
            />
            <LecturerSelector
              lecturerId={lecturerId}
              onLecturerChange={setLecturerId}
            />
          </div>

          {/* CATALOG SNAPSHOTS */}
          <div className="create-schedule-grid create-schedule-cols-3" style={{ marginTop: '16px' }}>
            <SemestersTable data={semesterData} />
            <RoomsTable data={roomData} />
            <TimeslotsTable data={timeslots} />
          </div>

          {/* STEP 2: Patterns */}
          <div className="create-schedule-grid create-schedule-cols-2" style={{ marginTop: '16px' }}>
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
            <HolidaysTable data={holidays} semesterName={semesterId} />
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
          <SaveButton onSave={handleSave} />
        </main>
      </div>
    </div>
  );
};

export default CreateSchedule;
