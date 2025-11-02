import React from 'react';
import '../CreateSchedule.css';

const TimeslotsTable = ({ data = [] }) => {
  return (
    <div className="create-schedule-card">
      <h3>Timeslots (Mon–Fri)</h3>
      <table>
        <thead>
          <tr>
            <th>Slot</th>
            <th>Start</th>
            <th>End</th>
          </tr>
        </thead>
        <tbody>
          {data.map(t => (
            <tr key={t.slot}>
              <td>{t.slot}</td>
              <td>{t.start}</td>
              <td>{t.end}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TimeslotsTable;

