import React from 'react';
import '../CreateSchedule.css';

const SemestersTable = ({ data = [] }) => {
  return (
    <div className="create-schedule-card">
      <h3>Semesters</h3>
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Start</th>
            <th>End</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map(s => (
            <tr key={s.code}>
              <td>{s.code}</td>
              <td>{s.start}</td>
              <td>{s.end}</td>
              <td>{s.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SemestersTable;

