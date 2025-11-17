import React, { useMemo, useState } from 'react';
import {
	Card,
	Typography,
	Space,
	Button,
	message,
	Divider,
} from 'antd';
import {
	FileExcelOutlined,
	SaveOutlined,
} from '@ant-design/icons';
import { Form } from 'antd';
import { api } from '../../../vn.fpt.edu.api/http';
import { useLookups } from './hooks/useLookups';
import { useValidation } from './hooks/useValidation';
import UploadSection from './components/UploadSection';
import ScheduleTable from './components/ScheduleTable';
import { normalizeString, toNumber, splitSlots } from './utils/helpers';

const { Title } = Typography;

export default function ImportSchedule() {
	const [form] = Form.useForm();
	const [msg, ctx] = message.useMessage();
	const [saving, setSaving] = useState(false);
	const [previewRows, setPreviewRows] = useState([]);
	const [rawRows, setRawRows] = useState([]);

	// Load lookups
	const {
		loading: loadingLookups,
		semesters,
		classesBySemester,
		rooms,
		timeslots,
		lecturers,
		subjects,
	} = useLookups();

	const selectedSemesterId = Form.useWatch('semesterId', form);

	// Validation hooks
	const { revalidateRows } = useValidation({
		selectedSemesterId,
		classesBySemester,
		rooms,
		timeslots,
		lecturers,
	});

	// Function to update a single row
	const updateRow = (rowKey, field, value) => {
		const updatedRows = previewRows.map((r) => {
			if (r.key === rowKey) {
				const updated = { ...r };
				// Handle null/undefined from Select clear
				if (value === null || value === undefined) {
					updated[field] = '';
				} else {
					updated[field] = value;
				}
				// Normalize string fields
				if (field === 'className' || field === 'roomName' || field === 'lecturer' || field === 'subject') {
					updated[field] = normalizeString(updated[field] || '');
				}
				return updated;
			}
			return r;
		});
		const revalidated = revalidateRows(updatedRows);
		setPreviewRows(revalidated);
	};

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

			// Add keys and validate
			const withKeys = expanded.map((r, i) => ({
				key: `${i}-${r._row}`,
				...r,
			}));

			const withFlags = revalidateRows(withKeys);

			setPreviewRows(withFlags);
			msg.success(`Đã đọc ${rows.length} hàng, tạo ${withFlags.length} dòng (mở rộng slot).`);
		} catch (e) {
			console.error(e);
			msg.error('Không đọc được file Excel.');
		}
		return false; // Prevent default upload
	};

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
		// Group by classId + lecturerId because backend requires lecturerId
		const byGroup = {};
		previewRows
			.filter((r) => r.validMapping)
			.forEach((r) => {
				const cid = r.classId;
				const lid = r.lecturerId;
				const key = `${cid}|${lid}`;
				if (!byGroup[key]) byGroup[key] = [];
				byGroup[key].push(r);
			});
		const semesterIdNum = Number(selectedSemesterId);

		// Collapse rows into patterns per class
		const payloads = Object.entries(byGroup).map(([groupKey, rows]) => {
			const [classIdStr, lecturerIdStr] = groupKey.split('|');
			const patterns = rows.map((r) => ({
				weekday: r.dayOfWeek, // 2..7
				timeId: r.timeId,
				roomId: r.roomId,
			}));
			return {
				classId: Number(classIdStr),
				semesterId: semesterIdNum,
				lecturerId: Number(lecturerIdStr),
				patterns,
				_meta: {
					className: rows[0]?.className || `Class ${classIdStr}`,
					lecturerCode: rows[0]?.lecturer || '',
				},
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
						TimeId: x.timeId,
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
							Import Schedule Form Excel
						</Title>
					</Space>
				
					<UploadSection
						form={form}
						selectedSemesterId={selectedSemesterId}
						selectedSemesterName={selectedSemesterName}
						semesters={semesters}
						loadingLookups={loadingLookups}
						onUpload={handleUpload}
						onDownloadTemplate={handleDownloadTemplate}
						onClear={handleClear}
					/>

					{previewRows.length > 0 && (
						<>
							<Divider />
							
							<ScheduleTable
								previewRows={previewRows}
								onUpdateRow={updateRow}
								selectedSemesterId={selectedSemesterId}
								classesBySemester={classesBySemester}
								rooms={rooms}
								lecturers={lecturers}
								subjects={subjects}
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
