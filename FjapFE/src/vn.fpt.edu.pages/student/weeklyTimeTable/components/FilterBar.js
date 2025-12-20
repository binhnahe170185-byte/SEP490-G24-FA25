import React, { useMemo } from "react";
import { Select, Button } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import dayjsLib from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
dayjsLib.extend(isoWeek);
const dayjs = (d) => dayjsLib(d);

export default function FilterBar({ year, onYearChange, weekNumber, onWeekChange, onPrev, onNext, weekLabel }) {
    const yearOptions = useMemo(() => {
        return Array.from({ length: 6 }, (_, i) => dayjs().year() - 1 + i).map(y => ({ value: y, label: String(y) }));
    }, []);

    const weekOptions = useMemo(() => {
        const weeks = [];
        // Calculate the actual number of weeks in the year (can be 52 or 53)
        // Try week 53 - if it belongs to the same year, the year has 53 weeks
        const week53Date = dayjs().year(year).isoWeek(53).isoWeekday(1);
        const weeksInYear = week53Date.year() === year ? 53 : 52;
        
        for (let i = 1; i <= weeksInYear; i++) {
            const start = dayjs().year(year).isoWeek(i).isoWeekday(1);
            const end = start.add(6, "day");
            // Show actual dates even if week extends to next year
            // Format: "DD/MM - DD/MM" (end date will show correct date even if it's in next year)
            const startLabel = start.format("DD/MM");
            const endLabel = end.format("DD/MM");
            weeks.push({ value: i, label: `${startLabel} - ${endLabel}` });
        }
        return weeks;
    }, [year]);

    return (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Select style={{ width: 100 }} value={year} options={yearOptions} onChange={onYearChange} />
            <Button icon={<LeftOutlined />} onClick={onPrev} />
            <Select style={{ width: 220 }} value={weekNumber} options={weekOptions} onChange={onWeekChange} />
            <Button icon={<RightOutlined />} onClick={onNext} />
        </div>
    );
}