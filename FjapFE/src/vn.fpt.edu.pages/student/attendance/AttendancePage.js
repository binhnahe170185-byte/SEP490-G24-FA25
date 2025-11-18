import React, { useEffect, useMemo, useState } from 'react';
import { Card, Typography, Space, Select, List, Tag, Table, Spin, Empty, Button } from 'antd';
import { useAuth } from '../../login/AuthContext';
import { api } from '../../../vn.fpt.edu.api/http';

const { Title, Text } = Typography;
const { Option } = Select;

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
          const lesRes = await api.get(`/api/Students/${studentId}/semesters/${selectedSemesterId}/attendance/subjects/${firstSubjectId}`);
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
        const lesRes = await api.get(`/api/Students/${studentId}/semesters/${selectedSemesterId}/attendance/subjects/${activeSubjectId}`);
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
    { title: 'Time', dataIndex: 'timeSlot', key: 'timeSlot', width: 160 },
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
        };
        const meta = map[status] || { color: 'default', text: r.status || '' };
        return <Tag color={meta.color}>{meta.text}</Tag>;
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
          <Space align="baseline">
            <Title level={3} style={{ margin: 0 }}>Attendance Report</Title>
            <Text type="secondary">{/* subtitle if needed */}</Text>
          </Space>
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
              <div style={{ width: 320, minWidth: 280 }}>
                <Card size="small" title={<Text strong>Select course</Text>}>
                  <List
                    itemLayout="horizontal"
                    dataSource={subjects}
                    renderItem={item => (
                      <List.Item
                        style={{
                          cursor: 'pointer',
                          background: activeSubjectId === item.subjectId ? '#f0f5ff' : undefined,
                          borderRadius: 8,
                          padding: 8,
                        }}
                        onClick={() => setActiveSubjectId(item.subjectId)}
                      >
                        <List.Item.Meta
                          title={<Text strong>{item.subjectName} ({item.subjectCode})</Text>}
                          description={<Text type="secondary">{item.className}</Text>}
                        />
                      </List.Item>
                    )}
                  />
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
                </Card>
              </div>
            </Space>
          )}
        </Card>
      </Space>
    </div>
  );
}




