import React from 'react';
import '../CreateSchedule.css';

const CalendarTable = ({ 
  title, 
  weekStart, 
  weekRange, 
  onPrevWeek, 
  onNextWeek, 
  renderCalendar 
}) => {
  return (
    <div className="create-schedule-card">
      <h3>{title}</h3>
      <div className="create-schedule-calendar-head">
        <button className="create-schedule-btn" onClick={onPrevWeek}>◀ Prev</button>
        <b>{weekRange || 'Week'}</b>
        <button className="create-schedule-btn" onClick={onNextWeek}>Next ▶</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Slot / Day</th>
            <th>Mon</th>
            <th>Tue</th>
            <th>Wed</th>
            <th>Thu</th>
            <th>Fri</th>
          </tr>
        </thead>
        <tbody>
          {renderCalendar()}
        </tbody>
      </table>
    </div>
  );
};

export default CalendarTable;

