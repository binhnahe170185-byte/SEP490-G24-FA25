import React, { useMemo } from 'react';
import { Select, Button } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import dayjsLib from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
dayjsLib.extend(isoWeek);
const dayjs = (d) => dayjsLib(d);

export default function FilterBar({ year, onYearChange, weekNumber, onWeekChange, onPrev, onNext, weekLabel }) {
  const yearOptions = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => dayjs().year() - 1 + i).map(y => ({
      value: y,
      label: String(y)
    }));
  }, []);

  const weekOptions = useMemo(() => {
    const weeks = [];
    // Tính số tuần ISO tối đa trong năm (có thể là 52 hoặc 53)
    // Theo chuẩn ISO, dùng ngày 28/12 của năm đó để xác định số tuần trong năm
    const maxIsoWeek = dayjs(`${year}-12-28`).isoWeek();
    for (let i = 1; i <= maxIsoWeek; i++) {
      const start = dayjs().year(year).isoWeek(i).isoWeekday(1);
      const end = start.add(6, 'day');
      weeks.push({
        value: i,
        // Hiển thị khoảng ngày, kể cả với tuần 53
        label: `${start.format('DD/MM')} - ${end.format('DD/MM')}`
      });
    }
    return weeks;
  }, [year]);

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Select
        style={{ width: 100 }}
        value={year}
        options={yearOptions}
        onChange={onYearChange}
      />
      <Button icon={<LeftOutlined />} onClick={onPrev} />
      <Select
        style={{ width: 220 }}
        value={weekNumber}
        options={weekOptions}
        onChange={onWeekChange}
      />
      <Button icon={<RightOutlined />} onClick={onNext} />
    </div>
  );
}

