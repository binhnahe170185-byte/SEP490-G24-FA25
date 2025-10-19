import React, { useMemo, useState } from "react";
import dayjsLib from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { Divider, Typography } from "antd";
import FilterBar from "./components/FilterBar";
import TimetableTable from "./components/TimetableTable";
import Legend from "./components/Legend";
import "./WeeklyTimetable.css";

dayjsLib.extend(isoWeek);
const dayjs = (d) => dayjsLib(d);

const STATUS = {
  pending: { color: "#3b82f6", text: "Not Yet" },
  done: { color: "#22c55e", text: "Present" },
  absent: { color: "#ef4444", text: "Absent" },
};

const SLOTS = ["Slot 0", "Slot 1", "Slot 2", "Slot 3", "Slot 4", "Slot 5", "Slot 6", "Slot 7", "Slot 8", "Slot 9", "Slot 10", "Slot 11", "Slot 12"];
const WEEKDAY_HEADERS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

// mock data kept here for demo; in real app pass items via props or API
const MOCK_ITEMS = [
  { code: "JD326", time: "12:50-15:10", room: "DE-337", status: "done", slot: 4, weekday: 1, date: "2025-10-19" },
  { code: "PRM392", time: "12:50-15:10", room: "DE-227", status: "done", slot: 4, weekday: 2, date: "2025-10-19" },
  { code: "VNR202", time: "15:20-17:40", room: "AL-401", status: "absent", slot: 4, weekday: 3, date: "2025-10-19" },
  { code: "SEP490", time: "18:00-20:20", room: "DE-C202", status: "done", slot: 5, weekday: 5, date: "2025-10-19" },
];

export default function WeeklyTimetable({ items }) {
  const data = items || MOCK_ITEMS;
  const [anchorDate, setAnchorDate] = useState(dayjs().isoWeekday(1));
  const [year, setYear] = useState(anchorDate.year());
  const [weekNumber, setWeekNumber] = useState(anchorDate.isoWeek());

  const week = useMemo(() => {
    const start = dayjs(anchorDate).year(year).isoWeek(weekNumber).isoWeekday(1);
    const end = start.add(6, "day");
    const days = Array.from({ length: 7 }, (_, i) => start.add(i, "day"));
    return { start, end, days };
  }, [anchorDate, year, weekNumber]);

  const weekItems = useMemo(() => {
    const startStr = week.start.startOf("day");
    const endStr = week.end.endOf("day");
    return data.filter((it) => {
      const d = dayjs(it.date);
      return d.isAfter(startStr.subtract(1, "ms")) && d.isBefore(endStr.add(1, "ms"));
    });
  }, [data, week.start, week.end]);

  const cellMap = useMemo(() => {
    const map = new Map();
    for (const it of weekItems) {
      const key = `${it.slot}|${it.weekday}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    }
    return map;
  }, [weekItems]);

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

  const weekLabel = `${week.start.format("DD/MM")} - ${week.end.format("DD/MM")}`;

  return (
    <div className="weekly-page-wrapper">
      <div className="weekly-container">
        <div className="weekly-header">
          <Typography.Title level={4} className="weekly-title" style={{ margin: 0 }}>
            Weekly timetable
          </Typography.Title>
          <FilterBar
            year={year}
            onYearChange={setYear}
            weekNumber={weekNumber}
            onWeekChange={setWeekNumber}
            onPrev={goPrevWeek}
            onNext={goNextWeek}
            weekLabel={weekLabel}
          />
        </div>

        <Divider style={{ margin: "12px 0" }} />

        <TimetableTable
          week={week}
          cellMap={cellMap}
          slots={SLOTS}
          weekdayHeaders={WEEKDAY_HEADERS}
        />

        <Legend status={STATUS} />
      </div>
    </div>
  );
}