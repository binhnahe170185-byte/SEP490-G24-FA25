import React, { useState, useEffect } from 'react';
import '../CreateSchedule.css';
import { api } from '../../../../vn.fpt.edu.api/http';
import SubjectList from '../../../../vn.fpt.edu.api/SubjectList';

const PickSemesterAndClass = ({
  semesterId,
  classId,
  subjectCode,
  subjectName,
  semesters = [],
  classes = [],
  onSemesterChange,
  onClassChange,
  onSubjectChange,
  onLoadClass
}) => {
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [semesterOptions, setSemesterOptions] = useState([]);
  const [allClassesBySemester, setAllClassesBySemester] = useState({}); // { semesterId: [classes] }
  const [subjectOptions, setSubjectOptions] = useState([]); // [{ value: subjectCode, label: "CODE - Name" }]

  // Load semesters and classes grouped by semester from single API
  useEffect(() => {
    const fetchScheduleOptions = async () => {
      try {
        setLoadingOptions(true);
        const response = await api.get('/api/staffAcademic/classes/schedule-options');
        const data = response.data?.data || response.data;
        
        if (data) {
          // Format semesters
          if (data.semesters && Array.isArray(data.semesters)) {
            const formattedSemesters = data.semesters.map(sem => {
              const id = sem.id || sem.semesterId;
              const name = sem.name || '';
              const startDate = sem.startDate || '';
              const endDate = sem.endDate || '';
              
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
            setSemesterOptions(formattedSemesters);
          }

          // Store classes grouped by semester
          if (data.classesBySemester) {
            // Convert keys to numbers for easier lookup
            const grouped = {};
            Object.keys(data.classesBySemester).forEach(semId => {
              const classes = data.classesBySemester[semId];
              grouped[parseInt(semId)] = classes.map(cls => ({
                value: cls.class_id || cls.classId,
                label: cls.class_name || cls.className
              }));
            });
            setAllClassesBySemester(grouped);
          }
        }
      } catch (error) {
        console.error('Failed to load schedule options:', error);
        setSemesterOptions([]);
        setAllClassesBySemester({});
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchScheduleOptions();
  }, []);

  // Load subjects for dropdown
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoadingSubjects(true);
        console.log('PickSemesterAndClass - Fetching subjects...');
        const subjects = await SubjectList.getDropdownOptionsForStaffAcademic();
        console.log('PickSemesterAndClass - Received subjects:', subjects);
        
        if (Array.isArray(subjects) && subjects.length > 0) {
          const formattedSubjects = subjects.map(subject => {
            const code = subject.subjectCode || subject.code || '';
            const name = subject.subjectName || subject.name || '';
            return {
              value: code,
              label: code && name ? `${code} - ${name}` : code || name || 'Unknown',
              subjectId: subject.subjectId || subject.id || null,
              subjectCode: code,
              subjectName: name
            };
          });
          setSubjectOptions(formattedSubjects);
          console.log('PickSemesterAndClass - Formatted subjects:', formattedSubjects.length, 'items');
        } else if (Array.isArray(subjects)) {
          console.warn('PickSemesterAndClass - Subjects array is empty');
          setSubjectOptions([]);
        } else {
          console.warn('PickSemesterAndClass - Unexpected subjects format:', subjects);
          setSubjectOptions([]);
        }
      } catch (error) {
        console.error('PickSemesterAndClass - Failed to load subjects:', error);
        console.error('PickSemesterAndClass - Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        setSubjectOptions([]);
        // Show alert to user
        alert('Failed to load subjects. Please refresh the page or contact support.');
      } finally {
        setLoadingSubjects(false);
      }
    };

    fetchSubjects();
  }, []);

  // Get classes for selected semester
  const displayClasses = semesterId 
    ? (allClassesBySemester[parseInt(semesterId)] || [])
    : [];

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
  return (
    <div className="create-schedule-card">
      <h3>Pick Semester & Class</h3>
      <div className="create-schedule-row">
        <div>
          <label htmlFor="semester_id">Semester</label>
          <select
            id="semester_id"
            value={semesterId}
            onChange={(e) => {
              onSemesterChange(e.target.value);
              // Reset class selection when semester changes
              onClassChange('');
            }}
            required
            disabled={loadingOptions}
          >
            <option value="">-- Select --</option>
            {semesterOptions.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          {loadingOptions && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>Loading...</span>}
        </div>
        <div>
          <label htmlFor="class_id">Class</label>
          <select
            id="class_id"
            value={classId}
            onChange={(e) => onClassChange(e.target.value)}
            required
            disabled={loadingOptions || !semesterId || displayClasses.length === 0}
          >
            <option value="">-- Select --</option>
            {displayClasses.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {!semesterId && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>Select semester first</span>}
          {semesterId && displayClasses.length === 0 && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>No classes for this semester</span>}
        </div>
        <div>
          <label htmlFor="subject_code">Subject</label>
          <select
            id="subject_code"
            value={subjectCode || ''}
            onChange={(e) => {
              console.log('PickSemesterAndClass - Subject changed:', e.target.value);
              const selectedSubject = subjectOptions.find(s => s.value === e.target.value);
              console.log('PickSemesterAndClass - Selected subject:', selectedSubject);
              if (onSubjectChange) {
                if (selectedSubject) {
                  onSubjectChange(selectedSubject.subjectCode, selectedSubject.subjectName);
                } else {
                  // Clear selection
                  onSubjectChange('', '');
                }
              }
            }}
            required
            disabled={loadingSubjects}
            style={{ 
              width: '100%',
              padding: '6px 8px',
              fontSize: '14px',
              border: '1px solid #d9d9d9',
              borderRadius: '4px'
            }}
          >
            <option value="">-- Select Subject --</option>
            {subjectOptions.length === 0 && !loadingSubjects && (
              <option value="" disabled>No subjects available</option>
            )}
            {subjectOptions.map(subject => (
              <option key={subject.value} value={subject.value}>
                {subject.label}
              </option>
            ))}
          </select>
          {loadingSubjects && (
            <span style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>
              Loading subjects...
            </span>
          )}
          {!loadingSubjects && subjectOptions.length === 0 && (
            <span style={{ marginLeft: '8px', fontSize: '12px', color: '#ff4d4f' }}>
              No subjects available
            </span>
          )}
          {!loadingSubjects && subjectOptions.length > 0 && (
            <span style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>
              {subjectOptions.length} subject(s) available
            </span>
          )}
          {subjectName && subjectCode && (
            <div style={{ marginTop: '4px', fontSize: '12px', color: '#52c41a', fontWeight: '500' }}>
              Selected: {subjectCode} - {subjectName}
            </div>
          )}
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

