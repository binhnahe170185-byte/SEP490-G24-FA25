import React from 'react';
import '../CreateSchedule.css';

const SaveButton = ({ onSave }) => {
  return (
    <div className="create-schedule-card" style={{ marginTop: '16px' }}>
      <div className="create-schedule-toolbar">
        <button className="create-schedule-btn create-schedule-primary" onClick={onSave}>
          Save timetable
        </button>
        <span className="create-schedule-muted">
          Backend expands by semester (Mon–Fri), applies lecturer to all lessons.
        </span>
      </div>
    </div>
  );
};

export default SaveButton;

