import React, { useMemo, useState } from "react";
import dayjsLib from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { Button, Select, Divider } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import "./WeeklyTimetable.css";

dayjsLib.extend(isoWeek);
const h = React.createElement;
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
    date: "2025-10-30",
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

function ClassChip(props) {
  const s = STATUS[props.status] || STATUS.pending;
  return h(
    "div",
    { className: "class-chip", style: { borderColor: s.color } },
    h("div", { className: "class-code" }, props.code),
    h("div", { className: "class-meta" }, [
      h("span", null, "🕒 " + props.time),
      h("span", null, "🏫 " + props.room),
    ])
  );
}

export default function WeeklyTimetable(props) {
  const [anchorDate, setAnchorDate] = useState(dayjs().isoWeekday(1));
  const [year, setYear] = useState(anchorDate.year());
  const data = props.items || MOCK_ITEMS;

  const week = useMemo(() => {
    const start = dayjs(anchorDate).year(year).isoWeekday(1);
    const end = start.add(6, "day");
    const days = Array.from({ length: 7 }, (_, i) => start.add(i, "day"));
    return { start, end, days };
  }, [anchorDate, year]);

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

  const cellMap = useMemo(() => {
    const map = new Map();
    for (const it of weekItems) {
      const key = `${it.slot}|${it.weekday}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    }
    return map;
  }, [weekItems]);

  const yearOptions = Array.from(
    { length: 6 },
    (_, i) => dayjs().year() - 1 + i
  ).map((y) => ({
    value: y,
    label: String(y),
  }));

  const goPrevWeek = () => setAnchorDate((d) => dayjs(d).subtract(1, "week"));
  const goNextWeek = () => setAnchorDate((d) => dayjs(d).add(1, "week"));
  const weekLabel = `${week.start.format("DD/MM")} - ${week.end.format(
    "DD/MM"
  )}`;

  return h(
    "div",
    { className: "weekly-container" },
    // Header
    h(
      "div",
      { className: "weekly-header" },
      h("div", { className: "weekly-title" }, "Thời khóa biểu từng tuần"),
      h(
        "div",
        { className: "weekly-controls" },
        h(Select, {
          style: { width: 100 },
          value: year,
          options: yearOptions,
          onChange: setYear,
        }),
        h(Button, { icon: h(LeftOutlined), onClick: goPrevWeek }),
        h("div", { className: "week-label" }, weekLabel),
        h(Button, { icon: h(RightOutlined), onClick: goNextWeek })
      )
    ),
    h(Divider, { style: { margin: "12px 0" } }),

    // Grid header
    h(
      "div",
      { className: "weekly-grid weekly-grid-header" },
      h("div", { className: "cell header-cell" }, "SLOT"),
      ...week.days.map((d, idx) =>
        h(
          "div",
          { key: idx, className: "cell header-cell" },
          h("div", null, WEEKDAY_HEADERS[idx]),
          h("div", { className: "day-label" }, d.format("DD/MM"))
        )
      )
    ),

    // Grid body
    h(
      "div",
      { className: "weekly-grid" },
      ...SLOTS.flatMap((slotLabel, rowIdx) => {
        const row = [];
        row.push(
          h(
            "div",
            { key: "slot-" + rowIdx, className: "cell slot-cell" },
            slotLabel
          )
        );
        for (let wd = 1; wd <= 7; wd++) {
          const key = `${rowIdx + 1}|${wd}`;
          const items = cellMap.get(key) || [];
          row.push(
            h(
              "div",
              { key: "c-" + rowIdx + "-" + wd, className: "cell" },
              items.map((it, i) =>
                h(ClassChip, {
                  key: i,
                  code: it.code,
                  time: it.time,
                  room: it.room,
                  status: it.status,
                })
              )
            )
          );
        }
        return row;
      })
    ),

    // Legend
    h(
      "div",
      { className: "weekly-legend" },
      h(
        "span",
        null,
        h("i", { className: "legend-dot pending" }),
        STATUS.pending.text
      ),
      h(
        "span",
        null,
        h("i", { className: "legend-dot done" }),
        STATUS.done.text
      ),
      h(
        "span",
        null,
        h("i", { className: "legend-dot absent" }),
        STATUS.absent.text
      )
    )
  );
}
