import React, { useMemo, useState } from "react";
import dayjsLib from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { Button, Select, Divider, Card, Typography } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import "./WeeklyTimetable.css";

dayjsLib.extend(isoWeek);
const dayjs = (d) => dayjsLib(d);

const STATUS = {
  pending: { color: "#3b82f6", text: "Chưa học" },
  done: { color: "#22c55e", text: "Đã học" },
  absent: { color: "#ef4444", text: "Vắng mặt" },
};

const SLOTS = ["Slot 1", "Slot 2", "Slot 3", "Slot 4", "Slot 5", "Slot 6"];
const WEEKDAY_HEADERS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const MOCK_ITEMS = [
  {
    code: "JD326",
    time: "12:50-15:10",
    room: "DE-337",
    status: "done",
    slot: 4,
    weekday: 1,
    date: "2025-10-01",
  },
  {
    code: "PRM392",
    time: "12:50-15:10",
    room: "DE-227",
    status: "done",
    slot: 4,
    weekday: 2,
    date: "2025-10-01",
  },
  {
    code: "VNR202",
    time: "15:20-17:40",
    room: "AL-401",
    status: "absent",
    slot: 4,
    weekday: 3,
    date: "2025-10-12",
  },
  {
    code: "JD326",
    time: "12:50-15:10",
    room: "DE-337",
    status: "done",
    slot: 4,
    weekday: 4,
    date: "2025-10-03",
  },
  {
    code: "VNR202",
    time: "15:20-17:40",
    room: "AL-401",
    status: "pending",
    slot: 5,
    weekday: 1,
    date: "2025-10-30",
  },
  {
    code: "JD326",
    time: "12:50-15:10",
    room: "DE-337",
    status: "pending",
    slot: 5,
    weekday: 2,
    date: "2025-10-01",
  },
  {
    code: "JD326",
    time: "15:20-17:40",
    room: "AL-401",
    status: "pending",
    slot: 5,
    weekday: 3,
    date: "2025-10-02",
  },
  {
    code: "PRM392",
    time: "15:20-17:40",
    room: "AL-401",
    status: "done",
    slot: 5,
    weekday: 4,
    date: "2025-10-03",
  },
];

function ClassChip({ code, time, room, status }) {
  const s = STATUS[status] || STATUS.pending;
  return (
    <Card
      size="small"
      bordered
      style={{
        borderColor: s.color,
        marginBottom: 4,
        background: "#fafcff",
      }}
      bodyStyle={{ padding: 8 }}
    >
      <Typography.Text strong>{code}</Typography.Text>
      <div style={{ fontSize: 12 }}>
        <span>🕒 {time}</span> <span>🏫 {room}</span>
      </div>
      <div style={{ color: s.color, fontSize: 12 }}>{s.text}</div>
    </Card>
  );
}

export default function WeeklyTimetable(props) {
  const [anchorDate, setAnchorDate] = useState(dayjs().isoWeekday(1));
  const [year, setYear] = useState(anchorDate.year());
  const [weekNumber, setWeekNumber] = useState(anchorDate.isoWeek());
  const data = props.items || MOCK_ITEMS;

  // Tính toán tuần hiện tại
  const week = useMemo(() => {
    const start = dayjs(anchorDate).year(year).isoWeek(weekNumber).isoWeekday(1);
    const end = start.add(6, "day");
    const days = Array.from({ length: 7 }, (_, i) => start.add(i, "day"));
    return { start, end, days };
  }, [anchorDate, year, weekNumber]);

  // Lọc các item trong tuần
  const weekItems = useMemo(() => {
    const startStr = week.start.startOf("day");
    const endStr = week.end.endOf("day");
    return data.filter((it) => {
      const d = dayjs(it.date);
      return (
        d.isAfter(startStr.subtract(1, "ms")) && d.isBefore(endStr.add(1, "ms"))
      );
    });
  }, [data, week.start, week.end]);

  // Map cell
  const cellMap = useMemo(() => {
    const map = new Map();
    for (const it of weekItems) {
      const key = `${it.slot}|${it.weekday}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    }
    return map;
  }, [weekItems]);

  // Năm và tuần
  const yearOptions = Array.from(
    { length: 6 },
    (_, i) => dayjs().year() - 1 + i
  ).map((y) => ({
    value: y,
    label: String(y),
  }));

  const weekOptions = useMemo(() => {
    // Tạo tuần từ 1 đến 52 cho năm hiện tại
    const weeks = [];
    for (let i = 1; i <= 52; i++) {
      const start = dayjs().year(year).isoWeek(i).isoWeekday(1);
      const end = start.add(6, "day");
      weeks.push({
        value: i,
        label: `${start.format("DD/MM")} - ${end.format("DD/MM")}`,
      });
    }
    return weeks;
  }, [year]);

  // Chuyển tuần/năm
  const handleYearChange = (y) => {
    setYear(y);
    setAnchorDate((d) => dayjs(d).year(y).isoWeek(weekNumber));
  };
  const handleWeekChange = (w) => {
    setWeekNumber(w);
    setAnchorDate((d) => dayjs(d).year(year).isoWeek(w));
  };

  const goPrevWeek = () => {
    setAnchorDate((d) => {
      const newDate = dayjs(d).subtract(1, "week");
      setWeekNumber(newDate.isoWeek());
      return newDate;
    });
  };
  const goNextWeek = () => {
    setAnchorDate((d) => {
      const newDate = dayjs(d).add(1, "week");
      setWeekNumber(newDate.isoWeek());
      return newDate;
    });
  };



  return (
    <div className="weekly-container">
      {/* Header */}
      <div className="weekly-header">
        <Typography.Title level={4} className="weekly-title">
          Weekly timetable
        </Typography.Title>
        <div className="weekly-controls">
          <Select style={{ width: 100 }} value={year} options={yearOptions} onChange={handleYearChange} />
          <Button icon={<LeftOutlined />} onClick={goPrevWeek} />
          <Select
            style={{ width: 160 }}
            value={weekNumber}
            options={weekOptions}
            onChange={handleWeekChange}
          />
          <Button icon={<RightOutlined />} onClick={goNextWeek} />
        </div>
      </div>
      <Divider style={{ margin: "12px 0" }} />

      <div className="weekly-grid">
        {/* Header row */}
        <div className="cell header-cell">SLOT</div>
        {week.days.map((d, idx) => (
          <div key={idx} className="cell header-cell">
            <div>{WEEKDAY_HEADERS[idx]}</div>
            <div className="day-label">{d.format("DD/MM")}</div>
          </div>
        ))}

        {/* Body rows */}
        {SLOTS.map((slotLabel, rowIdx) => (
          <React.Fragment key={rowIdx}>
            <div className="cell slot-cell">{slotLabel}</div>
            {week.days.map((_, wdIdx) => {
              const key = `${rowIdx + 1}|${wdIdx + 1}`;
              const items = cellMap.get(key) || [];
              return (
                <div key={wdIdx} className="cell">
                  {items.map((it, i) => (
                    <ClassChip
                      key={i}
                      code={it.code}
                      time={it.time}
                      room={it.room}
                      status={it.status}
                    />
                  ))}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Legend */}
      <div className="weekly-legend">
        <span>
          <i className="legend-dot pending" />
          {STATUS.pending.text}
        </span>
        <span>
          <i className="legend-dot done" />
          {STATUS.done.text}
        </span>
        <span>
          <i className="legend-dot absent" />
          {STATUS.absent.text}
        </span>
      </div>
    </div>
  );
}