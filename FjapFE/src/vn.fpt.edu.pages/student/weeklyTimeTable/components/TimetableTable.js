import React, { useMemo } from "react";
import { Table } from "antd";
import ClassChip from "./ClassChip";

export default function TimetableTable({ week, cellMap, slots, weekdayHeaders, loading }) {
    const columns = useMemo(() => {
        const cols = [
            { title: "SLOT", dataIndex: "slotLabel", key: "slotLabel", width: 160, fixed: "left", render: v => <strong>{v}</strong> },
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
                    const slotId = record._slotId;
                    const key = `${slotId}|${idx + 1}`;
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
        return slots.map((slot, idx) => ({
            key: `slot-${slot.id ?? idx + 1}`,
            _slotId: slot.id ?? idx + 1,
            slotLabel: slot.label ?? `Slot ${slot.id ?? idx + 1}`,
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
            loading={loading}
        />
    );
}