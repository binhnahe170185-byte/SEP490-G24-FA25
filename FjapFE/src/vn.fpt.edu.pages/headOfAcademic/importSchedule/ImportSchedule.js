import React, { useMemo, useState, useEffect } from 'react';
import {
	Card,
	Typography,
	Space,
	Upload,
	Button,
	Table,
	Tag,
	Form,
	Select,
	message,
	Alert,
	Row,
	Col,
	Divider,
	Tooltip,
} from 'antd';
import {
	FileExcelOutlined,
	UploadOutlined,
	SaveOutlined,
	CheckCircleOutlined,
		DownloadOutlined,
	ExclamationCircleOutlined,
	ReloadOutlined,
} from '@ant-design/icons';
import { api } from '../../../vn.fpt.edu.api/http';
import RoomApi from '../../../vn.fpt.edu.api/Room';
import TimeslotApi from '../../../vn.fpt.edu.api/Timeslot';

const { Title, Text } = Typography;
const { Option } = Select;

// Helpers
const normalizeString = (s) => (s || '').toString().trim();
const toNumber = (v) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
};
const splitSlots = (slotCell) =>
	normalizeString(slotCell)
		.replace(/\s+/g, '')
		.split(',')
		.filter(Boolean)
		.map((s) => toNumber(s))
		.filter((n) => n !== null);

// Core component
export default function ImportSchedule() {
	const [form] = Form.useForm();
	const [msg, ctx] = message.useMessage();
	const [loadingLookups, setLoadingLookups] = useState(false);
	const [saving, setSaving] = useState(false);
	const [previewRows, setPreviewRows] = useState([]);
	const [rawRows, setRawRows] = useState([]);

	// Lookups
	const [semesters, setSemesters] = useState([]);
	const [classesBySemester, setClassesBySemester] = useState({});
	const [rooms, setRooms] = useState([]); // {value,label}
	const [timeslots, setTimeslots] = useState([]); // {timeId,startTime,endTime,slotNumber?}

	const selectedSemesterId = Form.useWatch('semesterId', form);

	useEffect(() => {
		loadLookups();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const loadLookups = async () => {
		setLoadingLookups(true);
		try {
			// Semesters and classes grouped for schedule (same API used by CreateSchedule picker)
			const scheduleOptions = await api.get('/api/staffAcademic/classes/schedule-options');
			const data = scheduleOptions?.data?.data || scheduleOptions?.data || {};
			setSemesters(data.semesters || []);
			setClassesBySemester(data.classesBySemester || {});

			// Rooms
			const roomRes = await RoomApi.getRooms({ pageSize: 500 });
			const roomItems = roomRes.items || [];
			setRooms(
				roomItems.map((r) => ({
					value: String(r.roomId),
					label: r.roomName,
				}))
			);

			// Timeslots
			const ts = await TimeslotApi.getTimeslots();
			setTimeslots(ts || []);
		} catch (e) {
			console.error('Lookup load failed:', e);
			msg.error('Failed to load options');
		} finally {
			setLoadingLookups(false);
		}
	};

	// Map helpers
	const classNameToId = useMemo(() => {
		const sid = Number(selectedSemesterId);
		const list = sid ? classesBySemester[sid] || [] : [];
		const map = {};
		list.forEach((c) => {
			map[normalizeString(c.className)] = c.classId;
		});
		return map;
	}, [classesBySemester, selectedSemesterId]);

	const roomNameToId = useMemo(() => {
		const map = {};
		rooms.forEach((r) => {
			map[normalizeString(r.label)] = Number(r.value);
		});
		return map;
	}, [rooms]);

	const slotNumberToTimeId = useMemo(() => {
		// Try best-effort mapping: if backend timeslot has sequential "timeId" matching slot number, use that.
		// Otherwise, try a "slotNumber" property if present; fallback to index order.
		const map = {};
		timeslots.forEach((t, idx) => {
			const slotNum = toNumber(t.slotNumber) ?? toNumber(t.timeId) ?? idx + 1;
			map[slotNum] = t.timeId;
		});
		return map;
	}, [timeslots]);

	// Excel parsing
	const handleUpload = async (file) => {
		try {
			if (!selectedSemesterId) {
				msg.error('Vui lòng chọn Semester trước khi import');
				return false;
			}

			const realFile = file?.originFileObj || file;
			const XLSX = await import('xlsx');
			const buf = await realFile.arrayBuffer();
			const wb = XLSX.read(buf, { type: 'array' });
			const sheet = wb.Sheets[wb.SheetNames[0]];
			const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });

			// Expect columns: Class | Subject | Lecturer | Slot | DayOfWeek | room
			const rows = json.map((r, idx) => ({
				_row: idx + 2,
				className: normalizeString(r.Class || r.class || r['Lớp'] || r['Class Name']),
				subject: normalizeString(r.Subject || r.subject || r['Môn'] || r['Subject Name']),
				lecturer: normalizeString(r.Lecturer || r.lecturer || r['Giảng viên']),
				slotCell: normalizeString(r.Slot || r.slot || r['Tiết']),
				dayOfWeek: toNumber(r.DayOfWeek || r['Day Of Week'] || r['Thứ']),
				roomName: normalizeString(r.room || r.Room || r['Phòng']),
			}));

			setRawRows(rows);

			// Expand rows by slot list
			const expanded = [];
			rows.forEach((r) => {
				const slots = splitSlots(r.slotCell);
				if (slots.length === 0) {
					expanded.push({ ...r, slot: null });
				} else {
					slots.forEach((s) => expanded.push({ ...r, slot: s }));
				}
			});

			// Detect duplicates within the imported file
			const keyCount = {};
			expanded.forEach((r) => {
				const key = [
					normalizeString(r.className),
					r.dayOfWeek,
					r.slot,
					normalizeString(r.roomName),
				].join('|');
				keyCount[key] = (keyCount[key] || 0) + 1;
			});

			const withFlags = expanded.map((r, i) => {
				const classId = classNameToId[normalizeString(r.className)];
				const roomId = roomNameToId[normalizeString(r.roomName)];
				const timeId = slotNumberToTimeId[r.slot];
				const duplicateInFile =
					keyCount[
						[
							normalizeString(r.className),
							r.dayOfWeek,
							r.slot,
							normalizeString(r.roomName),
						].join('|')
					] > 1;
				return {
					key: `${i}-${r._row}`,
					...r,
					classId,
					roomId,
					timeId,
					validMapping:
						Boolean(classId) && Boolean(roomId) && Boolean(timeId) && Boolean(r.dayOfWeek),
					duplicateInFile,
				};
			});

			setPreviewRows(withFlags);
			msg.success(`Đã đọc ${rows.length} hàng, tạo ${withFlags.length} dòng (mở rộng slot).`);
		} catch (e) {
			console.error(e);
			msg.error('Không đọc được file Excel.');
		}
		return false; // Prevent default upload
	};


	const columns = [
		{ title: '#', dataIndex: 'key', width: 60, render: (_, __, idx) => idx + 1, fixed: 'left' },
		{ title: 'Class', dataIndex: 'className' },
		{ title: 'Subject', dataIndex: 'subject' },
		{ title: 'Lecturer', dataIndex: 'lecturer' },
		{ title: 'DayOfWeek', dataIndex: 'dayOfWeek', width: 100 },
		{ title: 'Slot', dataIndex: 'slot', width: 80 },
		{ title: 'Room', dataIndex: 'roomName' },
		{
			title: 'Mapping',
			key: 'mapping',
			width: 160,
			render: (_, r) =>
				r.validMapping ? (
					<Tag color="green">OK</Tag>
				) : (
					<Tooltip title="Không map được Class/Room/Slot/DayOfWeek">
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

	const handleClear = () => {
		setRawRows([]);
		setPreviewRows([]);
	};

	const handleDownloadTemplate = async () => {
		try {
			const XLSX = (await import('xlsx')).default;
			const wb = XLSX.utils.book_new();

			// Template sheet with headers and sample rows
			const header = ['Class', 'Subject', 'Lecturer', 'Slot', 'DayOfWeek', 'room'];
			const sample = [
				['N1-SE1', 'Nhật1', 'AnhNN1', '2,4', 2, '101'],
				['N1-SE2', 'Nhật2', 'AnhNN2', '1,3', 3, '102'],
			];
			const wsTemplate = XLSX.utils.aoa_to_sheet([header, ...sample]);
			XLSX.utils.book_append_sheet(wb, wsTemplate, 'Schedule');

			// Instructions sheet
			const instructions = [
				['Instructions'],
				['- Required columns: Class, Subject, Lecturer, Slot, DayOfWeek, room'],
				['- Slot can contain multiple values separated by comma, e.g. "2,4"'],
				['- DayOfWeek uses numbers (e.g. 2=Mon, 3=Tue, ...).'],
				['- Class and room must match existing names in the system.'],
			];
			const wsInfo = XLSX.utils.aoa_to_sheet(instructions);
			XLSX.utils.book_append_sheet(wb, wsInfo, 'Instructions');

			XLSX.writeFile(wb, 'ScheduleImportTemplate.xlsx');
		} catch (e) {
			console.error(e);
			msg.error('Không tạo được template. Vui lòng thử lại.');
		}
	};

	const buildPayloadsByClass = () => {
		// Group by classId + lecturer (text) because backend requires lecturerId; we only pass patterns now.
		const byClass = {};
		previewRows
			.filter((r) => r.validMapping)
			.forEach((r) => {
				const cid = r.classId;
				if (!byClass[cid]) byClass[cid] = [];
				byClass[cid].push(r);
			});
		const semesterIdNum = Number(selectedSemesterId);

		// Collapse rows into patterns per class
		const payloads = Object.entries(byClass).map(([classIdStr, rows]) => {
			const patterns = rows.map((r) => ({
				weekday: r.dayOfWeek, // 2..7
				slotId: r.timeId,
				roomId: r.roomId,
			}));
			// We do not have lecturerId from Excel mapping reliably; set 0 to let backend validate
			return {
				classId: Number(classIdStr),
				semesterId: semesterIdNum,
				lecturerId: 0,
				patterns,
				_meta: { className: rows[0]?.className || `Class ${classIdStr}` },
			};
		});
		return payloads;
	};

	const handleSave = async () => {
		if (!selectedSemesterId) {
			msg.error('Vui lòng chọn Semester');
			return;
		}
		if (previewRows.length === 0) {
			msg.error('Chưa có dữ liệu để lưu');
			return;
		}
		const invalid = previewRows.filter((r) => !r.validMapping);
		if (invalid.length > 0) {
			msg.error('Một số dòng chưa map được dữ liệu (Class/Room/Slot/Day).');
			return;
		}

		const payloads = buildPayloadsByClass();
		if (payloads.length === 0) {
			msg.warning('Không có group hợp lệ để lưu.');
			return;
		}

		setSaving(true);
		const results = [];
		for (const p of payloads) {
			try {
				const res = await api.post('/api/staffAcademic/classes/schedule', {
					SemesterId: p.semesterId,
					ClassId: p.classId,
					LecturerId: p.lecturerId,
					Patterns: p.patterns.map((x) => ({
						Weekday: x.weekday,
						SlotId: x.slotId,
						RoomId: x.roomId,
					})),
				});
				results.push({
					className: p._meta.className,
					success: true,
					message:
						res?.data?.message ||
						`Created ${res?.data?.data?.lessonsCreated ?? ''} lessons`,
				});
			} catch (e) {
				const status = e?.response?.status;
				const msgText =
					e?.response?.data?.message ||
					(status === 409 ? 'Conflict detected when creating schedule' : e.message);
				results.push({ className: p._meta.className, success: false, message: msgText });
			}
		}
		setSaving(false);

		const ok = results.filter((r) => r.success).length;
		const fail = results.length - ok;
		if (ok) msg.success(`Lưu thành công ${ok} lớp`);
		if (fail)
			msg.warning(
				`${fail} lớp lỗi khi lưu. Kiểm tra trùng lịch/room/slot và thử lại.`
			);
	};

	const selectedSemesterName = useMemo(() => {
		const s = semesters.find((x) => Number(x.semesterId || x.id) === Number(selectedSemesterId));
		return s?.name || s?.semesterCode || '';
	}, [semesters, selectedSemesterId]);

	return (
		<div style={{ width: '100%' }}>
			{ctx}
			<Card style={{ borderRadius: 12 }}>
				<Space direction="vertical" style={{ width: '100%' }} size="middle">
					<Space align="center">
						<FileExcelOutlined style={{ fontSize: 26, color: '#2f54eb' }} />
						<Title level={3} style={{ margin: 0 }}>
							Import Schedule từ Excel
						</Title>
					</Space>
					<Text type="secondary">
						Chọn Semester, tải file có cột: Class, Subject, Lecturer, Slot, DayOfWeek, room. Ô
						Slot có thể chứa nhiều giá trị, ví dụ "2,4" sẽ sinh 2 dòng.
					</Text>

					<Form layout="vertical" form={form}>
						<Row gutter={16}>
							<Col xs={24} sm={12} md={8}>
								<Form.Item
									label="Semester"
									name="semesterId"
									rules={[{ required: true, message: 'Vui lòng chọn Semester' }]}
								>
									<Select
										placeholder="Chọn semester"
										loading={loadingLookups}
										showSearch
										optionFilterProp="children"
									>
										{semesters.map((s) => (
											<Option
												key={String(s.semesterId || s.id)}
												value={Number(s.semesterId || s.id)}
											>
												{s.name}
											</Option>
										))}
									</Select>
								</Form.Item>
							</Col>
							<Col xs={24} sm={12} md={16} style={{ display: 'flex', alignItems: 'flex-end' }}>
								<Space wrap>
									<Upload.Dragger
										name="file"
										accept=".xlsx,.xls"
										beforeUpload={handleUpload}
										showUploadList={false}
										disabled={!selectedSemesterId}
										style={{ minWidth: 320 }}
									>
										<p className="ant-upload-drag-icon" style={{ marginBottom: 8 }}>
											<UploadOutlined style={{ fontSize: 32, color: '#1890ff' }} />
										</p>
										<p className="ant-upload-text" style={{ margin: 0 }}>
											Kéo thả hoặc bấm để chọn file Excel
										</p>
										<p className="ant-upload-hint" style={{ margin: 0 }}>
											{selectedSemesterId
												? `Semester: ${selectedSemesterName}`
												: 'Hãy chọn Semester trước'}
										</p>
									</Upload.Dragger>
									<Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
										Download Template
									</Button>
									<Button icon={<ReloadOutlined />} onClick={handleClear}>
										Clear
									</Button>
								</Space>
							</Col>
						</Row>
					</Form>

					{previewRows.length > 0 && (
						<>
							<Divider />
							<Alert
								type="info"
								showIcon
								message={
									<span>
										Tổng: <b>{rawRows.length}</b> hàng gốc — Sau khi mở rộng:{" "}
										<b>{previewRows.length}</b> dòng
									</span>
								}
								description="Cột 'Mapping' phải OK trước khi lưu. 'Conflict' cảnh báo trùng trong file, xung đột với dữ liệu hiện có sẽ được backend kiểm tra khi lưu."
							/>
							<Table
								columns={columns}
								dataSource={previewRows}
								rowKey="key"
								pagination={{ pageSize: 10 }}
								size="small"
								scroll={{ x: true }}
							/>
							<Space style={{ justifyContent: 'flex-end', width: '100%' }}>
								<Button
									type="primary"
									icon={<SaveOutlined />}
									onClick={handleSave}
									loading={saving}
								>
									Validate & Save
								</Button>
							</Space>
						</>
					)}
				</Space>
			</Card>
		</div>
	);
}


