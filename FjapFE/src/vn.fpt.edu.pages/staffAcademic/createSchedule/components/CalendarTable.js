import React from 'react';
import {
  Card,
  Space,
  Typography,
  Empty,
} from 'antd';
import FilterBar from './FilterBar';
import '../CreateSchedule.css';

const CalendarTable = ({
  title,
  weekStart,
  weekRange,
  onPrevWeek,
  onNextWeek,
  renderCalendar,
  // New props for FilterBar
  year,
  onYearChange,
  weekNumber,
  onWeekChange,
  weekLabel,
}) => {
  const { columns = [], dataSource = [] } = (renderCalendar && renderCalendar()) || {};

  return (
    <Card
      className="create-schedule-card"
      title={
        <Space size="middle" style={{ width: '100%', justifyContent: 'flex-start' }}>
          <Typography.Text strong>{title}</Typography.Text>
          <FilterBar
            year={year}
            onYearChange={onYearChange}
            weekNumber={weekNumber}
            onWeekChange={onWeekChange}
            onPrev={onPrevWeek}
            onNext={onNextWeek}
            weekLabel={weekLabel}
          />
        </Space>
      }
    >
      {(!columns || columns.length === 0 || !dataSource || dataSource.length === 0) ? (
        <Empty description="No timetable data" />
      ) : (
        <div className="calendar-grid-wrapper">
          <div className="calendar-grid">
            <div className="calendar-grid-header">
              <div className="calendar-grid-slot-head">Slot / Day</div>
              {columns
                .filter((col) => col.dataIndex && col.dataIndex !== 'slotLabel')
                .map((col) => (
                  <div key={col.key || col.dataIndex} className="calendar-grid-day-head">
                    {col.title}
                  </div>
                ))}
            </div>
            <div className="calendar-grid-body">
              {dataSource.map((row) => (
                <div key={row.key} className="calendar-grid-row">
                  <div className="calendar-grid-slot-cell">{row.slotLabel}</div>
                  {columns
                    .filter((col) => col.dataIndex && col.dataIndex !== 'slotLabel')
                    .map((col) => (
                      <div
                        key={`${row.key}-${col.dataIndex}`}
                        className="calendar-grid-day-cell"
                      >
                        {row[col.dataIndex]}
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default CalendarTable;

