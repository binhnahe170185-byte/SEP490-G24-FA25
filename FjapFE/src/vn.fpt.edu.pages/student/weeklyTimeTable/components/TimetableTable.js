import React, { useMemo } from "react";
import { Table } from "antd";
import ClassChip from "./ClassChip";

export default function TimetableTable({ week, cellMap, slots, weekdayHeaders }) {
    const columns = useMemo(() => {
        const cols = [
            { title: "SLOT", dataIndex: "slotLabel", key: "slotLabel", width: 120, fixed: "left", render: v => <strong>{v}</strong> },
        ];
        week.days.forEach((d, idx) => {
            cols.push({
                title: (
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontWeight: 600 }}>{weekdayHeaders[idx]}</div>
                        <div style={{ fontSize: 12 }}>{d.format("DD/MM")}</div>
                    </div>
                ),
                dataIndex: `day${idx}`,
                key: `day${idx}`,
                render: (_, record) => {
                    const slotIdx = record._slotIndex;
                    const key = `${slotIdx + 1}|${idx + 1}`;
                    const items = cellMap.get(key) || [];
                    if (!items.length) return null;
                    return (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {items.map((it, i) => <ClassChip key={i} item={it} />)}
                        </div>
                    );
                },
            });
        });
        return cols;
    }, [week.days, cellMap, weekdayHeaders]);

    const dataSource = useMemo(() => {
        return slots.map((label, idx) => ({
            key: `slot-${idx + 1}`,
            _slotIndex: idx,
            slotLabel: label,
            ...Array.from({ length: 7 }).reduce((acc, _, i) => ({ ...acc, [`day${i}`]: null }), {}),
        }));
    }, [slots]);

    return (
        <Table
            columns={columns}
            dataSource={dataSource}
            pagination={false}
            bordered
            rowKey="key"
            scroll={{ x: "max-content" }}
            size="middle"
        />
    );
}