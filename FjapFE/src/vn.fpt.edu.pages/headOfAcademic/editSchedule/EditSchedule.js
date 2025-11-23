import React, { useState, useEffect, useMemo, useRef } from 'react';
import './EditSchedule.css';
import CalendarTable from '../createSchedule/components/CalendarTable';
import PickSemesterAndClass from '../createSchedule/components/PickSemesterAndClass';
import LecturerSelector from '../createSchedule/components/LecturerSelector';
import SaveButton from '../createSchedule/components/SaveButton';
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
  Button,
} from 'antd';
import {
  CalendarOutlined,
  BookOutlined,
  UserOutlined,
  DeleteOutlined,
  EditOutlined,
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

  const [loadedLessons, setLoadedLessons] = useState([]); // Lessons từ API (tất cả lịch học của class)
  const [currentWeekStart, setCurrentWeekStart] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const [semester, setSemester] = useState({ id: null, start: null, end: null });

  // State for API data
  const [semesterData, setSemesterData] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [timeslots, setTimeslots] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classStudents, setClassStudents] = useState([]);

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
    return `Week ${toYMD(weekStart)} → ${toYMD(addDays(weekStart, 6))}`;
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
        const roomsResponse = await RoomApi.getRooms({ pageSize: 100 });
        const roomsList = roomsResponse.items || [];
        const formattedRooms = roomsList.map(room => ({
          value: String(room.roomId),
          label: room.roomName
        }));
        setRooms(formattedRooms);

        // Fetch timeslots
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

  // Sync semester.id when semesterId changes
  useEffect(() => {
    if (semesterId && semesterId !== semester.id) {
      const semData = semesterData.find(s => s.code === semesterId || String(s.code) === String(semesterId));
      if (semData) {
        setSemester({
          id: semesterId,
          start: fromYMD(semData.start),
          end: fromYMD(semData.end)
        });
      } else if (semesterId) {
        setSemester(prev => ({
          ...prev,
          id: semesterId
        }));
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
    if (data && data.schedule) {
      const { schedule, semesterId: semId, classId: clsId, semesterOptions: semOpt, subjectCode: subCode, subjectName: subName } = data;

      // Tính toán semester start/end
      let semStart, semEnd;
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

      // Set week start
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

      // Convert schedule data từ API sang format cho calendar
      const convertedLessons = schedule.map(lesson => {
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
            if (match) {
              dateStr = match[1];
            } else {
              dateStr = lesson.date;
            }
          }
        }

        const lessonDate = fromYMD(dateStr);
        const dayOfWeek = lessonDate.getDay();
        const weekday = dayOfWeek === 0 ? 8 : dayOfWeek + 1;

        const slot = lesson.timeId || 1;
        const roomName = lesson.roomName || '';
        const room = rooms.find(r => r.label === roomName);
        const roomId = room ? room.value : null;

        return {
          lessonId: lesson.lessonId || lesson.id,
          date: dateStr,
          weekday: weekday,
          slot: slot,
          room: roomName,
          roomId: roomId,
          lecturer: lesson.lecturerCode || '',
          subjectCode: lesson.subjectCode || '',
          subjectName: lesson.subjectName || '',
          className: lesson.className || '',
          startTime: lesson.startTime || '',
          endTime: lesson.endTime || '',
          timeId: lesson.timeId,
          lectureId: lesson.lectureId || lesson.lecturerId,
          isLoaded: true
        };
      });

      setLoadedLessons(convertedLessons);

      const firstSubjectCode = subCode || schedule[0]?.subjectCode || '';
      const firstSubjectName = subName || schedule[0]?.subjectName || '';
      const firstClassName = schedule[0]?.className || '';

      if (firstSubjectCode) {
        setSubjectCode(firstSubjectCode);
      }
      if (firstSubjectName) {
        setSubjectName(firstSubjectName);
      }
      if (firstClassName) {
        setClassName(firstClassName);
      }

      setSemesterId(semId);
      setClassId(clsId);
      fetchClassStudents(clsId);
      return;
    }

    console.warn('handleLoadClass: No schedule data received from API');
  };

  const handleLessonClick = (lesson) => {
    if (lesson && lesson.isLoaded) {
      setSelectedLesson(lesson);
      setEditModalVisible(true);
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!lessonId) return;

    confirm({
      title: 'Delete Lesson',
      content: 'Are you sure you want to delete this lesson? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setSaving(true);
          await ClassList.deleteLesson(lessonId);
          
          // Remove lesson from loadedLessons
          setLoadedLessons(prev => prev.filter(l => l.lessonId !== lessonId));
          
          api.success({
            message: 'Success',
            description: 'Lesson deleted successfully',
            placement: 'bottomRight',
            duration: 3,
          });
          
          setEditModalVisible(false);
          setSelectedLesson(null);
        } catch (error) {
          console.error('Error deleting lesson:', error);
          api.error({
            message: 'Error',
            description: error?.response?.data?.message || 'Failed to delete lesson',
            placement: 'bottomRight',
            duration: 5,
          });
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const handleUpdateLesson = async (lessonId, updatedData) => {
    try {
      setSaving(true);
      await ClassList.updateLesson(lessonId, updatedData);
      
      // Update lesson in loadedLessons
      setLoadedLessons(prev => prev.map(l => {
        if (l.lessonId === lessonId) {
          // Update room name if roomId changed
          const room = rooms.find(r => r.value === String(updatedData.roomId));
          return {
            ...l,
            ...updatedData,
            room: room ? room.label : l.room,
            roomId: String(updatedData.roomId),
          };
        }
        return l;
      }));
      
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
        description: error?.response?.data?.message || 'Failed to update lesson',
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

    const slotsToRender = timeslots.length > 0
      ? timeslots.map(ts => ({ timeId: ts.timeId, label: `Slot ${ts.timeId}` }))
      : Array.from({ length: 8 }, (_, i) => ({ timeId: i + 1, label: `Slot ${i + 1}` }));

    const holidayLookup = holidays.reduce((acc, holiday) => {
      if (holiday.date) {
        acc[holiday.date] = holiday.name || holiday.holidayName || holiday.reason || holiday.description || 'Holiday';
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

        const cellContents = [];
        let cellStyle = {};
        const classNames = [];

        if (holidayName) {
          classNames.push('holiday-cell');
        }

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
            color: cellStyle.color || '#f57f17'
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
        <Layout.Content className="edit-schedule-main" style={{ padding: '40px', textAlign: 'center' }}>
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

          <Row gutter={[16, 16]} style={{ display: 'flex', alignItems: 'stretch' }}>
            <Col xs={24} xl={16} style={{ display: 'flex' }}>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                <PickSemesterAndClass
                  semesterId={semesterId}
                  classId={classId}
                  onSemesterChange={setSemesterId}
                  onClassChange={setClassId}
                  onLoadClass={handleLoadClass}
                />
              </div>
            </Col>
            <Col xs={24} xl={8} style={{ display: 'flex' }}>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                <LecturerSelector
                  lecturerId={lecturerId}
                  lecturerCode={lecturerCode}
                  onLecturerChange={(id, code) => {
                    setLecturerId(id);
                    setLecturerCode(code || '');
                  }}
                  subjectCode={subjectCode}
                  subjectName={subjectName}
                />
              </div>
            </Col>
          </Row>

          <CalendarTable
            title="Class Timetable"
            weekStart={currentWeekStart}
            weekRange={currentWeekStart ? getWeekRange(currentWeekStart) : 'Week'}
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
        onCancel={() => {
          setEditModalVisible(false);
          setSelectedLesson(null);
        }}
        saving={saving}
      />
    </Layout>
  );
};

export default EditSchedule;

