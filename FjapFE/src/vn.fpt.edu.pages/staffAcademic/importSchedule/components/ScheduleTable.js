import React, { useMemo } from 'react';
import { Table, Tag, Tooltip, Select, Input } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { normalizeString, getEmailPrefix, splitDayOfWeek } from '../utils/helpers';

export default function ScheduleTable({
	previewRows,
	onUpdateRow,
	selectedSemesterId,
	classesBySemester,
	rooms,
	lecturers,
	timeslots,
}) {
	// Get available class names for current semester
	const availableClassNames = useMemo(() => {
		const sid = Number(selectedSemesterId);
		const list = sid ? classesBySemester[sid] || [] : [];
		return list.map((c) => c.className).filter(Boolean);
	}, [classesBySemester, selectedSemesterId]);

	// Get available lecturer email prefixes (part before @)
	const availableLecturerEmailPrefixes = useMemo(() => {
		return lecturers
			.map((l) => l.emailPrefix || getEmailPrefix(l.email))
			.filter(Boolean)
			.filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
	}, [lecturers]);

	// Get available slot options from timeslots
	const slotOptions = useMemo(() => {
		if (!timeslots || timeslots.length === 0) return [];
		// Timeslots are ordered by StartTime, so index + 1 represents slot number
		return timeslots.map((ts, idx) => {
			const slotNumber = idx + 1;
			const startTime = ts.startTime || '';
			const endTime = ts.endTime || '';
			return {
				value: slotNumber,
				label: `Slot ${slotNumber}${startTime && endTime ? ` (${startTime}-${endTime})` : ''}`,
			};
		});
	}, [timeslots]);

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
			title: 'Lecturer',
			dataIndex: 'lecturer',
			width: 200,
			render: (text, record) => {
				// Normalize value: if text contains @, extract prefix; otherwise use as is
				const normalizedValue = text && text.includes('@')
					? getEmailPrefix(text)
					: text;
				return (
					<Select
						value={normalizedValue || undefined}
						onChange={(value) => onUpdateRow(record.key, 'lecturer', value)}
						showSearch
						allowClear
						style={{ width: '100%' }}
						placeholder="Lecturer email prefix"
						optionFilterProp="children"
						filterOption={(input, option) =>
							(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
						}
						options={availableLecturerEmailPrefixes.map((prefix) => ({
							value: prefix,
							label: prefix,
						}))}
					/>
				);
			},
		},
		{
			title: 'DayOfWeek',
			dataIndex: 'dayOfWeek',
			width: 150,
			render: (text, record) => {
				const dayOfWeekOptions = [
					{ value: 2, label: 'Monday' },
					{ value: 3, label: 'Tuesday' },
					{ value: 4, label: 'Wednesday' },
					{ value: 5, label: 'Thursday' },
					{ value: 6, label: 'Friday' },
					{ value: 7, label: 'Saturday' },
					{ value: 8, label: 'Sunday' },
				];

				// Check if value is a string with comma (multiple values)
				const isMultiple = typeof text === 'string' && text.includes(',');
				const currentValue = text != null ? (typeof text === 'number' ? text : String(text)) : undefined;

				// If multiple values, show Input; otherwise show Select
				if (isMultiple) {
					return (
						<Input
							value={String(text)}
							onChange={(e) => {
								const value = e.target.value;
								onUpdateRow(record.key, 'dayOfWeek', value || null);
							}}
							placeholder="DayOfWeek (e.g., 2,3)"
							style={{ width: '100%' }}
						/>
					);
				}

				return (
					<Select
						value={currentValue}
						onChange={(value) => {
							onUpdateRow(record.key, 'dayOfWeek', value);
						}}
						allowClear
						showSearch
						style={{ width: '100%' }}
						placeholder="DayOfWeek"
						optionFilterProp="label"
						filterOption={(input, option) =>
							(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
						}
						options={dayOfWeekOptions}
					/>
				);
			},
		},
		{
			title: 'Slot',
			dataIndex: 'slot',
			width: 150,
			render: (text, record) => {
				// Check if value is a string with comma (multiple values)
				const isMultiple = typeof text === 'string' && text.includes(',');
				const currentValue = text != null ? (typeof text === 'number' ? text : String(text)) : undefined;

				// If multiple values, show Input; otherwise show Select
				if (isMultiple) {
					return (
						<Input
							value={String(text)}
							onChange={(e) => {
								const value = e.target.value;
								onUpdateRow(record.key, 'slot', value || null);
							}}
							placeholder="Slot (e.g., 2,3)"
							style={{ width: '100%' }}
						/>
					);
				}

				return (
					<Select
						value={currentValue}
						onChange={(value) => {
							onUpdateRow(record.key, 'slot', value);
						}}
						allowClear
						showSearch
						style={{ width: '100%' }}
						placeholder="Select slot"
						optionFilterProp="label"
						filterOption={(input, option) =>
							(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
						}
						options={slotOptions}
					/>
				);
			},
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

