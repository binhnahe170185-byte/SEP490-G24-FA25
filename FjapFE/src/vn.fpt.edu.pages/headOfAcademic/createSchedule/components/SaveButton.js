import React from 'react';
import '../CreateSchedule.css';

const SaveButton = ({ onSave, saving = false }) => {
  const handleClick = (e) => {
    console.log('SaveButton clicked!', { saving, onSave: typeof onSave });
    if (onSave && typeof onSave === 'function') {
      onSave(e);
    } else {
      console.error('onSave is not a function!', onSave);
    }
  };

  return (
    <div className="create-schedule-card" style={{ marginTop: '16px' }}>
      <div className="create-schedule-toolbar">
        <button 
          className="create-schedule-btn create-schedule-primary" 
          onClick={handleClick}
          disabled={saving}
          type="button"
        >
          {saving ? 'Đang lưu...' : 'Save timetable'}
        </button>
        <span className="create-schedule-muted">
          Backend expands by semester (Mon–Fri), applies lecturer to all lessons.
        </span>
      </div>
    </div>
  );
};

export default SaveButton;

