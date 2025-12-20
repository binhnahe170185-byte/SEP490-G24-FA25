import React, { useEffect, useMemo, useState } from 'react';
import { Card, Typography, Space, Tag, Table, Spin, Empty, Button, Row, Col } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../../login/AuthContext';
import { api } from '../../../vn.fpt.edu.api/http';

const { Title, Text } = Typography;

export default function AttendancePage() {
  const { user } = useAuth();
  const studentId = Number(user?.studentId || user?.id); // fallback

  const [loading, setLoading] = useState(false);
  const [semesters, setSemesters] = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState(null);

  const [subjects, setSubjects] = useState([]); // [{subjectId, subjectCode, subjectName, className, lessons: []}]
  const [activeSubjectId, setActiveSubjectId] = useState(null);

  const activeSubject = useMemo(
    () => subjects.find(s => s.subjectId === activeSubjectId),
    [subjects, activeSubjectId]
  );

  // Calculate attendance statistics
  const attendanceStats = useMemo(() => {
    if (!activeSubject?.lessons || activeSubject.lessons.length === 0) {
      return { total: 0, present: 0, absent: 0, upcoming: 0 };
    }

    const lessons = activeSubject.lessons;
    const total = lessons.length;
    let present = 0;
    let absent = 0;
    let upcoming = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    lessons.forEach(lesson => {
      const status = (lesson.status || '').toLowerCase();
      const lessonDate = lesson.date ? new Date(lesson.date) : null;

      if (lessonDate) {
        lessonDate.setHours(0, 0, 0, 0);
      }

      if (status === 'present' || status === 'late' || status === 'excused') {
        present++;
      } else if (status === 'absent') {
        absent++;
      } else if (!status || status === 'not yet' || (lessonDate && lessonDate > today)) {
        upcoming++;
      } else {
        // Default to upcoming if status is unknown
        upcoming++;
      }
    });

    return { total, present, absent, upcoming };
  }, [activeSubject]);

  useEffect(() => {
    if (!studentId) return;
    const loadSemesters = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/Students/${studentId}/semesters`);
        const data = res?.data?.data || res?.data || [];
        setSemesters(data);
        if (data.length > 0) {
          setSelectedSemesterId(data[0].semesterId || data[0].id);
        }
      } catch (e) {
        console.error('Failed to load semesters', e);
        setSemesters([]);
      } finally {
        setLoading(false);
      }
    };
    loadSemesters();
  }, [studentId]);

  useEffect(() => {
    if (!studentId || !selectedSemesterId) return;
    const loadAttendance = async () => {
      try {
        setLoading(true);
        // 1) Load subjects list
        const subRes = await api.get(`/api/Students/${studentId}/semesters/${selectedSemesterId}/attendance/subjects`);
        const subjectsData = subRes?.data?.data || subRes?.data || [];
        setSubjects(subjectsData);
        if (subjectsData.length > 0) {
          const firstSubjectId = subjectsData[0].subjectId;
          setActiveSubjectId(firstSubjectId);
          // 2) Load lessons for first subject
          const lesRes = await api.get(`/api/Students/${studentId}/semesters/${selectedSemesterId}/attendance/subjects/${firstSubjectId}/lessons`);
          const lessons = lesRes?.data?.data || lesRes?.data || [];
          setSubjects((prev) => prev.map(s => s.subjectId === firstSubjectId ? { ...s, lessons } : s));
        }
      } catch (e) {
        console.error('Failed to load attendance', e);
        setSubjects([]);
        setActiveSubjectId(null);
      } finally {
        setLoading(false);
      }
    };
    loadAttendance();
  }, [studentId, selectedSemesterId]);

  // When user changes active subject, load its lessons if not loaded
  useEffect(() => {
    const loadLessons = async () => {
      if (!studentId || !selectedSemesterId || !activeSubjectId) return;
      const current = subjects.find(s => s.subjectId === activeSubjectId);
      if (!current || (current.lessons && current.lessons.length > 0)) return;
      try {
        setLoading(true);
        const lesRes = await api.get(`/api/Students/${studentId}/semesters/${selectedSemesterId}/attendance/subjects/${activeSubjectId}/lessons`);
        const lessons = lesRes?.data?.data || lesRes?.data || [];
        setSubjects((prev) => prev.map(s => s.subjectId === activeSubjectId ? { ...s, lessons } : s));
      } catch (e) {
        console.error('Failed to load lessons for subject', activeSubjectId, e);
      } finally {
        setLoading(false);
      }
    };
    loadLessons();
  }, [activeSubjectId, selectedSemesterId, studentId]);

  const columns = [
    { title: 'Date', dataIndex: 'date', key: 'date', width: 140 },
    {
      title: 'Time',
      key: 'time',
      width: 160,
      render: (_, record) => {
        // Try multiple possible field names for time
        const timeSlot = record.timeSlot || record.time_slot || record.TimeSlot;
        const timeId = record.timeId || record.time_id || record.TimeId;
        const time = record.time;
        const startTime = time?.startTime || time?.start_time || record.startTime || record.start_time;
        const endTime = time?.endTime || time?.end_time || record.endTime || record.end_time;

        // Priority: timeSlot > formatted time range > timeId > "N/A"
        if (timeSlot) {
          return timeSlot;
        }
        if (startTime && endTime) {
          return `${startTime} - ${endTime}`;
        }
        if (timeId) {
          return `Slot ${timeId}`;
        }
        return '-';
      },
    },
    { title: 'Lecturer', dataIndex: 'lectureCode', key: 'lectureCode', width: 120 },
    { title: 'Room', dataIndex: 'roomName', key: 'roomName', width: 120 },
    {
      title: 'Status',
      key: 'status',
      render: (_, r) => {
        const status = (r.status || '').toLowerCase();
        const map = {
          present: { color: 'green', text: 'Present' },
          absent: { color: 'red', text: 'Absent' },
          late: { color: 'orange', text: 'Late' },
          excused: { color: 'blue', text: 'Excused' },
          'not yet': { color: 'default', text: 'Not Yet' },
        };
        const meta = map[status] || { color: 'default', text: r.status || '' };
        return <Tag color={meta.color}>{meta.text}</Tag>;
      },
    },
  ];

  return (
    <div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 1400 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Title level={3} style={{ margin: 0 }}>Attendance Report</Title>
            <div style={{ width: '100%', overflowX: 'auto', padding: '4px 0' }}>
              <Space size="middle">
                {semesters.map((s) => {
                  const sid = Number(s.semesterId || s.id);
                  const label = s.name || s.semesterName || s.semesterCode || '';
                  // Try to split into "Term Year" if possible
                  const match = typeof label === 'string' ? label.match(/^(\w+)\s+(\d{4})$/i) : null;
                  const term = match ? match[1] : (s.term || 'Semester');
                  const year = match ? match[2] : (s.year || '');
                  const active = selectedSemesterId === sid;
                  return (
                    <Button
                      key={String(sid)}
                      type={active ? 'primary' : 'default'}
                      onClick={() => setSelectedSemesterId(sid)}
                      style={{ minWidth: 116, height: 72, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <div style={{ fontWeight: 700 }}>{year || (typeof label === 'string' ? label : sid)}</div>
                      <div style={{ opacity: 0.9 }}>{term}</div>
                    </Button>
                  );
                })}
              </Space>
            </div>
          </Space>

          <Card>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
            ) : subjects.length === 0 ? (
              <Empty description="No Data" />
            ) : (
              <Space align="start" size="large" style={{ width: '100%' }}>
                <div style={{ width: 400, minWidth: 320 }}>
                  <Card
                    title={
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>Select subject</div>
                        <div style={{ fontSize: 12, color: "#8c8c8c", fontWeight: 400 }}>
                          {semesters.find(s => (s.semesterId || s.id) === selectedSemesterId)?.name || ''}
                        </div>
                      </div>
                    }
                    style={{ height: "fit-content" }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {subjects.map((item) => (
                        <div
                          key={item.subjectId}
                          onClick={() => setActiveSubjectId(item.subjectId)}
                          style={{
                            padding: 16,
                            border:
                              activeSubjectId === item.subjectId
                                ? "2px solid #1890ff"
                                : "1px solid #d9d9d9",
                            borderRadius: 8,
                            cursor: "pointer",
                            backgroundColor:
                              activeSubjectId === item.subjectId ? "#e6f7ff" : "white",
                            transition: "all 0.3s",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <Tag color="blue" style={{ margin: 0 }}>
                              {item.subjectCode}
                            </Tag>
                          </div>
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>
                            {item.subjectName}
                          </div>
                          <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                            <div>👥 {item.className}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                <div style={{ flex: 1 }}>
                  <Card
                    size="small"
                    title={
                      activeSubject ? (
                        <Space>
                          <Text strong>{activeSubject.subjectName}</Text>
                          <Tag>{activeSubject.subjectCode}</Tag>
                          <Tag color="default">{activeSubject.className}</Tag>
                        </Space>
                      ) : 'Chi tiết điểm danh'
                    }
                  >
                    <Table
                      columns={columns}
                      dataSource={(activeSubject?.lessons || []).map((l, idx) => ({ key: l.lessonId || idx, ...l }))}
                      pagination={false}
                      size="middle"
                    />

                    {/* Attendance Statistics */}
                    {activeSubject && attendanceStats.total > 0 && (
                      <div style={{ marginTop: 24 }}>
                        <Title level={5} style={{ marginBottom: 12, fontSize: 14 }}>Attendance rates</Title>
                        <Row gutter={16}>
                          <Col xs={24} sm={8}>
                            <Card
                              style={{
                                backgroundColor: '#f6ffed',
                                border: '1px solid #b7eb8f',
                                borderRadius: 8,
                              }}
                              bodyStyle={{ padding: 12 }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div
                                    style={{
                                      width: 36,
                                      height: 36,
                                      borderRadius: '50%',
                                      backgroundColor: '#52c41a',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <CheckCircleOutlined style={{ fontSize: 18, color: 'white' }} />
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>Present</div>
                                    <div style={{ fontSize: 12, color: '#666' }}>
                                      {attendanceStats.present} / {attendanceStats.total}
                                    </div>
                                  </div>
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#52c41a' }}>
                                  {Math.round((attendanceStats.present / attendanceStats.total) * 100)}%
                                </div>
                              </div>
                            </Card>
                          </Col>
                          <Col xs={24} sm={8}>
                            <Card
                              style={{
                                backgroundColor: '#fff1f0',
                                border: '1px solid #ffccc7',
                                borderRadius: 8,
                              }}
                              bodyStyle={{ padding: 12 }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div
                                    style={{
                                      width: 36,
                                      height: 36,
                                      borderRadius: '50%',
                                      backgroundColor: '#ff4d4f',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <CloseCircleOutlined style={{ fontSize: 18, color: 'white' }} />
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>Absent</div>
                                    <div style={{ fontSize: 12, color: '#666' }}>
                                      {attendanceStats.absent} / {attendanceStats.total}
                                    </div>
                                  </div>
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#ff4d4f' }}>
                                  {Math.round((attendanceStats.absent / attendanceStats.total) * 100)}%
                                </div>
                              </div>
                            </Card>
                          </Col>
                          <Col xs={24} sm={8}>
                            <Card
                              style={{
                                backgroundColor: '#fafafa',
                                border: '1px solid #d9d9d9',
                                borderRadius: 8,
                              }}
                              bodyStyle={{ padding: 12 }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div
                                    style={{
                                      width: 36,
                                      height: 36,
                                      borderRadius: '50%',
                                      backgroundColor: '#8c8c8c',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <ClockCircleOutlined style={{ fontSize: 18, color: 'white' }} />
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>Upcoming</div>
                                    <div style={{ fontSize: 12, color: '#666' }}>
                                      {attendanceStats.upcoming} / {attendanceStats.total}
                                    </div>
                                  </div>
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#8c8c8c' }}>
                                  {Math.round((attendanceStats.upcoming / attendanceStats.total) * 100)}%
                                </div>
                              </div>
                            </Card>
                          </Col>
                        </Row>
                      </div>
                    )}
                  </Card>
                </div>
              </Space>
            )}
          </Card>
        </Space>
      </div>
    </div>
  );
}




