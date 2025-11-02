import React, { useState, useEffect } from 'react';
import '../CreateSchedule.css';
import { api } from '../../../../vn.fpt.edu.api/http';

const LecturerSelector = ({
  lecturerId,
  onLecturerChange
}) => {
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLecturers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get('/api/Lecturers');
        const data = response.data?.data || [];

        // Map API response to format { value: lecturerId, label: lecturerCode }
        const mappedLecturers = data.map(lecturer => ({
          value: String(lecturer.lecturerId),
          label: lecturer.lecturerCode
        }));

        setLecturers(mappedLecturers);
      } catch (err) {
        console.error('Failed to fetch lecturers:', err);
        setError('Failed to load lecturers. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchLecturers();
  }, []);

  const selectedLecturer = lecturers.find(l => l.value === lecturerId);

  return (
    <div className="create-schedule-card">
      <h3>Assign Lecturer</h3>
      <div className="create-schedule-row" style={{ gridTemplateColumns: '2fr 1fr', alignItems: 'end' }}>
        <div>
          <label htmlFor="lecturer_id">Choose lecturer</label>
          <select
            id="lecturer_id"
            value={lecturerId}
            onChange={(e) => onLecturerChange(e.target.value)}
            required
            disabled={loading}
          >
            <option value="">Lecturer Code</option>
            {lecturers.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
          {loading && <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>Loading...</small>}
          {error && <small style={{ color: '#d32f2f', display: 'block', marginTop: '4px' }}>{error}</small>}
        </div>
      </div>
    </div>
  );
};

export default LecturerSelector;

