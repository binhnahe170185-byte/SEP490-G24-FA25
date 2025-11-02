import React from 'react';
import '../CreateSchedule.css';

const RoomsTable = ({ data = [] }) => {
  return (
    <div className="create-schedule-card">
      <h3>Rooms</h3>
      <table>
        <thead>
          <tr>
            <th>Room</th>
            <th>Capacity</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          {data.map(r => (
            <tr key={r.room}>
              <td>{r.room}</td>
              <td>{r.capacity}</td>
              <td>{r.type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RoomsTable;

