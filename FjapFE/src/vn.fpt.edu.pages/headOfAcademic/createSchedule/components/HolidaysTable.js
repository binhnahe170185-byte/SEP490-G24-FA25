import React from 'react';
import '../CreateSchedule.css';

const HolidaysTable = ({ data = [], semesterName = '' }) => {
  return (
    <div className="create-schedule-card">
      <h3>Holidays {semesterName && `(${semesterName})`}</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          {data.map((h, idx) => (
            <tr key={idx}>
              <td>{h.date}</td>
              <td>{h.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default HolidaysTable;

