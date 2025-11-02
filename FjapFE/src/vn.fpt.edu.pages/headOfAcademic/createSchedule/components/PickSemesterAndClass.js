import React, { useState, useEffect } from 'react';
import '../CreateSchedule.css';
import { api } from '../../../../vn.fpt.edu.api/http';

const PickSemesterAndClass = ({
  semesterId,
  classId,
  subjectName,
  semesters = [],
  classes = [],
  onSemesterChange,
  onClassChange,
  onLoadClass
}) => {
  const [loadingSemesters, setLoadingSemesters] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [semesterOptions, setSemesterOptions] = useState([]);
  const [classOptions, setClassOptions] = useState([]);

  // Load semesters from API
  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        setLoadingSemesters(true);
        const response = await api.get('/api/semester/options');
        const data = response.data?.data || response.data;
        
        if (data && Array.isArray(data)) {
          const formatted = data.map(sem => {
            // Handle both formats: new format (id, name, startDate, endDate) and old format (semester_id, semester_name)
            const id = sem.id || sem.semesterId || sem.semester_id;
            const name = sem.name || sem.semester_name;
            const startDate = sem.startDate || '';
            const endDate = sem.endDate || '';
            
            // Build label with date range if available
            const label = startDate && endDate 
              ? `${name} (${startDate} → ${endDate})`
              : name || 'Unknown Semester';
            
            return {
              value: id,
              label: label,
              startDate: startDate,
              endDate: endDate
            };
          });
          setSemesterOptions(formatted);
        }
      } catch (error) {
        console.error('Failed to load semesters:', error);
        setSemesterOptions([]);
      } finally {
        setLoadingSemesters(false);
      }
    };

    fetchSemesters();
  }, []);

  // Load classes from API when semester is selected
  useEffect(() => {
    const fetchClasses = async () => {
      if (!semesterId) {
        setClassOptions([]);
        return;
      }

      try {
        setLoadingClasses(true);
        const response = await api.get('/api/staffAcademic/classes/active');
        const data = response.data?.data || response.data;
        
        if (data && Array.isArray(data)) {
          const formatted = data.map(cls => ({
            value: cls.class_id || cls.classId,
            label: cls.class_name || cls.className
          }));
          setClassOptions(formatted);
        }
      } catch (error) {
        console.error('Failed to load classes:', error);
        setClassOptions([]);
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchClasses();
  }, [semesterId]);

  const handleLoadClass = async () => {
    if (!semesterId) {
      alert('Please select a semester');
      return;
    }
    if (!classId) {
      alert('Please select a class');
      return;
    }

    try {
      setLoadingSchedule(true);
      // Gọi API schedule với semesterId và classId
      const response = await api.get('/api/staffAcademic/classes/schedule', {
        params: {
          semesterId: parseInt(semesterId),
          classId: parseInt(classId)
        }
      });
      
      const scheduleData = response.data?.data || response.data || [];
      
      // Gọi callback onLoadClass với schedule data
      if (onLoadClass) {
        onLoadClass({
          semesterId: parseInt(semesterId),
          classId: parseInt(classId),
          schedule: scheduleData,
          semesterOptions: semesterOptions.find(s => s.value === semesterId)
        });
      }
    } catch (error) {
      console.error('Failed to load schedule:', error);
      alert('Failed to load class schedule. Please try again.');
    } finally {
      setLoadingSchedule(false);
    }
  };

  // Use API data if available, otherwise fallback to props
  const displaySemesters = semesterOptions.length > 0 ? semesterOptions : semesters;
  const displayClasses = classOptions.length > 0 ? classOptions : classes;
  return (
    <div className="create-schedule-card">
      <h3>Pick Semester & Class</h3>
      <div className="create-schedule-row">
        <div>
          <label htmlFor="semester_id">Semester</label>
          <select
            id="semester_id"
            value={semesterId}
            onChange={(e) => onSemesterChange(e.target.value)}
            required
            disabled={loadingSemesters}
          >
            <option value="">-- Select --</option>
            {displaySemesters.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          {loadingSemesters && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>Loading...</span>}
        </div>
        <div>
          <label htmlFor="class_id">Class</label>
          <select
            id="class_id"
            value={classId}
            onChange={(e) => onClassChange(e.target.value)}
            required
            disabled={loadingClasses || !semesterId}
          >
            <option value="">-- Select --</option>
            {displayClasses.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {loadingClasses && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>Loading...</span>}
        </div>
        <div>
          <label>Subject</label>
          <input
            id="subject_name"
            type="text"
            value={subjectName}
            placeholder="Will be loaded"
            readOnly
          />
        </div>
      </div>
      <div style={{ marginTop: '10px' }} className="create-schedule-toolbar">
        <button 
          className="create-schedule-btn" 
          onClick={handleLoadClass}
          disabled={loadingSchedule || !semesterId || !classId}
        >
          {loadingSchedule ? 'Loading...' : 'Load Class'}
        </button>
        <span className="create-schedule-muted">After loading, see timetable below.</span>
      </div>
    </div>
  );
};

export default PickSemesterAndClass;

