import React from 'react';
import '../CreateSchedule.css';

const WeeklyPatterns = ({
  weekday,
  slotId,
  roomId,
  patterns = [],
  weekdays = [],
  slots = [],
  rooms = [],
  weekdayMap = {},
  onWeekdayChange,
  onSlotChange,
  onRoomChange,
  onAddPattern,
  onRemovePattern
}) => {
  return (
    <div className="create-schedule-card">
      <h3>Weekly Patterns</h3>
      <div className="create-schedule-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div>
          <label htmlFor="weekday">Weekday</label>
          <select
            id="weekday"
            value={weekday}
            onChange={(e) => onWeekdayChange(e.target.value)}
          >
            <option value="">--</option>
            {weekdays.map(w => (
              <option key={w.value} value={w.value}>{w.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="slot_id">Slot</label>
          <select
            id="slot_id"
            value={slotId}
            onChange={(e) => onSlotChange(e.target.value)}
          >
            <option value="">--</option>
            {slots.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="room_id">Room</label>
          <select
            id="room_id"
            value={roomId}
            onChange={(e) => onRoomChange(e.target.value)}
          >
            <option value="">--</option>
            {rooms.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <div style={{ alignSelf: 'end' }}>
          <button className="create-schedule-btn" onClick={onAddPattern}>
            Add pattern
          </button>
        </div>
      </div>
      <div className="create-schedule-stack" style={{ marginTop: '10px' }}>
        <div className="create-schedule-sub">Pending patterns</div>
        <ol id="pattern-list" style={{ margin: '0 0 0 18px' }}>
          {patterns.map((p, idx) => (
            <li key={idx}>
              {weekdayMap[p.weekday]} — Slot {p.slot} — Room {p.room}{' '}
              <button className="create-schedule-btn" onClick={() => onRemovePattern(idx)}>
                Remove
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default WeeklyPatterns;

