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
    for (let i = 1; i <= 52; i++) {
      const start = dayjs().year(year).isoWeek(i).isoWeekday(1);
      const end = start.add(6, 'day');
      weeks.push({ 
        value: i, 
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

