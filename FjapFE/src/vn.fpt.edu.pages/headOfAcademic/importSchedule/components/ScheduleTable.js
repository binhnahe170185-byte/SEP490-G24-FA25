import React, { useMemo } from 'react';
import { Table, Tag, Tooltip, Select, InputNumber } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { normalizeString } from '../utils/helpers';

export default function ScheduleTable({
	previewRows,
	onUpdateRow,
	selectedSemesterId,
	classesBySemester,
	rooms,
	lecturers,
	subjects,
}) {
	// Get available class names for current semester
	const availableClassNames = useMemo(() => {
		const sid = Number(selectedSemesterId);
		const list = sid ? classesBySemester[sid] || [] : [];
		return list.map((c) => c.className).filter(Boolean);
	}, [classesBySemester, selectedSemesterId]);

	// Get available lecturer codes
	const availableLecturerCodes = useMemo(() => {
		return lecturers.map((l) => l.lecturerCode).filter(Boolean);
	}, [lecturers]);

	// Get available subject codes
	const availableSubjectCodes = useMemo(() => {
		return subjects.map((s) => s.subjectCode).filter(Boolean);
	}, [subjects]);

	const columns = [
		{ title: '#', dataIndex: 'key', width: 60, render: (_, __, idx) => idx + 1, fixed: 'left' },
		{
			title: 'Class',
			dataIndex: 'className',
			width: 150,
			render: (text, record) => (
				<Select
					value={text || undefined}
					onChange={(value) => onUpdateRow(record.key, 'className', value)}
					showSearch
					allowClear
					style={{ width: '100%' }}
					placeholder="className"
					optionFilterProp="children"
					filterOption={(input, option) =>
						(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
					}
					options={availableClassNames.map((name) => ({
						value: name,
						label: name,
					}))}
				/>
			),
		},
		{
			title: 'Subject',
			dataIndex: 'subject',
			width: 150,
			render: (text, record) => (
				<Select
					value={text || undefined}
					onChange={(value) => onUpdateRow(record.key, 'subject', value)}
					showSearch
					allowClear
					style={{ width: '100%' }}
					placeholder="Subject code"
					optionFilterProp="children"
					filterOption={(input, option) =>
						(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
					}
					options={availableSubjectCodes.map((code) => ({
						value: code,
						label: code,
					}))}
				/>
			),
		},
		{
			title: 'Lecturer',
			dataIndex: 'lecturer',
			width: 150,
			render: (text, record) => (
				<Select
					value={text || undefined}
					onChange={(value) => onUpdateRow(record.key, 'lecturer', value)}
					showSearch
					allowClear
					style={{ width: '100%' }}
					placeholder="lecturer code"
					optionFilterProp="children"
					filterOption={(input, option) =>
						(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
					}
					options={availableLecturerCodes.map((code) => ({
						value: code,
						label: code,
					}))}
				/>
			),
		},
		{
			title: 'DayOfWeek',
			dataIndex: 'dayOfWeek',
			width: 120,
			render: (text, record) => (
				<Select
					value={text || undefined}
					onChange={(value) => onUpdateRow(record.key, 'dayOfWeek', value)}
					allowClear
					style={{ width: '100%' }}
					placeholder="DayOfWeek"
					options={[
						{ value: 2, label: 'Monday' },
                        { value: 3, label: 'Tuesday' },
                        { value: 4, label: 'Wednesday' },
                        { value: 5, label: 'Thursday' },
                        { value: 6, label: 'Friday' },
                        { value: 7, label: 'Saturday' },
                        { value: 8, label: 'Sunday' },

					]}
				/>
			),
		},
		{
			title: 'Slot',
			dataIndex: 'slot',
			width: 100,
			render: (text, record) => (
				<InputNumber
					value={text || null}
					onChange={(value) => onUpdateRow(record.key, 'slot', value)}
					min={1}
					style={{ width: '100%' }}
					placeholder="slot"
				/>
			),
		},
		{
			title: 'Room',
			dataIndex: 'roomName',
			width: 120,
			render: (text, record) => (
				<Select
					value={text || undefined}
					onChange={(value) => onUpdateRow(record.key, 'roomName', value)}
					showSearch
					allowClear
					style={{ width: '100%' }}
					placeholder="roomName"
					optionFilterProp="children"
					filterOption={(input, option) =>
						(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
					}
					options={rooms.map((r) => ({
						value: r.label,
						label: r.label,
					}))}
				/>
			),
		},
		{
			title: 'Status',
			key: 'mapping',
			width: 160,
			render: (_, r) =>
				r.validMapping ? (
					<Tag color="green">OK</Tag>
				) : (
					<Tooltip title="Have problem in Class/Room/Slot/DayOfWeek/Lecturer">
						<Tag color="red">Missing</Tag>
					</Tooltip>
				),
		},
		{
			title: 'Conflict',
			key: 'conflict',
			width: 120,
			render: (_, r) =>
				r.duplicateInFile ? (
					<Tag color="orange" icon={<ExclamationCircleOutlined />}>
						Potential dup
					</Tag>
				) : (
					<Tag>None</Tag>
				),
		},
	];

	return (
		<Table
			columns={columns}
			dataSource={previewRows}
			rowKey="key"
			pagination={{ pageSize: 10 }}
			size="small"
			scroll={{ x: true }}
		/>
	);
}

