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
import { normalizeString, toNumber, splitSlots, splitDayOfWeek, getEmailPrefix } from './utils/helpers';

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

	// Function to update a single row (may expand if DayOfWeek or Slot has multiple values)
	const updateRow = (rowKey, field, value) => {
		const currentRow = previewRows.find((r) => r.key === rowKey);
		if (!currentRow) return;

		// Check if we need to expand (DayOfWeek or Slot with comma-separated values)
		const valueStr = value != null ? String(value) : '';
		const hasMultipleDayOfWeek = field === 'dayOfWeek' && valueStr.includes(',');
		const hasMultipleSlot = field === 'slot' && valueStr.includes(',');

		// Check if the other field also has multiple values (stored as string in the row)
		const otherFieldValue = field === 'dayOfWeek'
			? (currentRow.slot != null ? String(currentRow.slot) : '')
			: (currentRow.dayOfWeek != null ? String(currentRow.dayOfWeek) : '');
		const hasMultipleOtherField = otherFieldValue.includes(',');

		// If updating DayOfWeek or Slot with multiple values, expand the row
		if (hasMultipleDayOfWeek || hasMultipleSlot) {
			const updatedRow = { ...currentRow };

			// Update the field
			if (value === null || value === undefined) {
				updatedRow[field] = '';
			} else {
				updatedRow[field] = value;
			}

			// Get current values - check both the updated field and the other field
			const currentDayOfWeek = hasMultipleDayOfWeek
				? valueStr
				: (hasMultipleOtherField && field === 'slot' ? otherFieldValue : (updatedRow.dayOfWeek != null ? String(updatedRow.dayOfWeek) : ''));
			const currentSlot = hasMultipleSlot
				? valueStr
				: (hasMultipleOtherField && field === 'dayOfWeek' ? otherFieldValue : (updatedRow.slot != null ? String(updatedRow.slot) : ''));

			// Parse and expand
			const dayOfWeeks = splitDayOfWeek(currentDayOfWeek);
			const slots = splitSlots(currentSlot);

			// Validate length if both have multiple values
			if (dayOfWeeks.length > 0 && slots.length > 0 && dayOfWeeks.length !== slots.length) {
				msg.warning(
					`Row ${currentRow._row || 'this'}: The number of slots (${slots.length}) does not match the number of days of week (${dayOfWeeks.length}). Please ensure they are equal.`,
					5
				);

			}

			// Remove the original row and add expanded rows
			const otherRows = previewRows.filter((r) => r.key !== rowKey);
			const expandedRows = [];

			if (dayOfWeeks.length > 0 && slots.length > 0) {
				// Map by index - if lengths differ, warn but still expand
				if (dayOfWeeks.length === slots.length) {
					// Same length, map by index
					for (let i = 0; i < dayOfWeeks.length; i++) {
						expandedRows.push({
							...updatedRow,
							key: `${rowKey}-expanded-${i}`,
							slot: slots[i],
							dayOfWeek: dayOfWeeks[i],
						});
					}
				} else {
					// Different lengths, use max and fill with last value
					const maxLength = Math.max(dayOfWeeks.length, slots.length);
					for (let i = 0; i < maxLength; i++) {
						expandedRows.push({
							...updatedRow,
							key: `${rowKey}-expanded-${i}`,
							slot: slots[i] ?? slots[slots.length - 1],
							dayOfWeek: dayOfWeeks[i] ?? dayOfWeeks[dayOfWeeks.length - 1],
							_hasLengthMismatch: true, // Flag for warning
						});
					}
				}
			} else if (dayOfWeeks.length > 0) {
				dayOfWeeks.forEach((d, i) => {
					expandedRows.push({
						...updatedRow,
						key: `${rowKey}-expanded-${i}`,
						dayOfWeek: d,
					});
				});
			} else if (slots.length > 0) {
				slots.forEach((s, i) => {
					expandedRows.push({
						...updatedRow,
						key: `${rowKey}-expanded-${i}`,
						slot: s,
					});
				});
			} else {
				expandedRows.push(updatedRow);
			}

			// Generate new keys for all rows
			const allRows = [...otherRows, ...expandedRows];
			const withKeys = allRows.map((r, i) => ({
				...r,
				key: r.key || `row-${i}-${r._row || i}`,
			}));

			const revalidated = revalidateRows(withKeys);
			setPreviewRows(revalidated);
			return;
		}

		// Normal update (single value)
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
				if (field === 'className' || field === 'roomName') {
					updated[field] = normalizeString(updated[field] || '');
				} else if (field === 'lecturer') {
					// For lecturer, extract email prefix if it contains @
					const lecturerValue = updated[field] || '';
					updated[field] = lecturerValue.includes('@')
						? getEmailPrefix(lecturerValue)
						: normalizeString(lecturerValue);
				} else if (field === 'dayOfWeek') {
					// Keep as string if it contains comma, otherwise convert to number
					if (value && String(value).includes(',')) {
						updated[field] = String(value);
					} else {
						const num = toNumber(value);
						updated[field] = num !== null ? num : (value || null);
					}
				} else if (field === 'slot') {
					// Keep as string if it contains comma, otherwise convert to number
					if (value && String(value).includes(',')) {
						updated[field] = String(value);
					} else {
						updated[field] = value != null ? Number(value) : null;
					}
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
				msg.error('Please select a semester before importing.');
				return false;
			}

			const realFile = file?.originFileObj || file;
			const XLSX = await import('xlsx');
			const buf = await realFile.arrayBuffer();
			const wb = XLSX.read(buf, { type: 'array' });
			const sheet = wb.Sheets[wb.SheetNames[0]];
			const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });

			// Expect columns: Class | Lecturer | Slot | DayOfWeek | room
			const rows = json.map((r, idx) => {
				const lecturerRaw = normalizeString(r.Lecturer || r.lecturer || r['Lecture']);
				// Extract email prefix if lecturer field contains email
				const lecturer = lecturerRaw.includes('@') ? getEmailPrefix(lecturerRaw) : lecturerRaw;
				return {
					_row: idx + 2,
					className: normalizeString(r.Class || r.class || r['Class'] || r['Class Name']),
					lecturer: lecturer,
					slotCell: normalizeString(r.Slot || r.slot || r['Slot']),
					dayOfWeekCell: normalizeString(r.DayOfWeek || r['Day Of Week'] || r['Thứ'] || ''),
					roomName: normalizeString(r.room || r.Room || r['Phòng']),
				};
			});

			setRawRows(rows);

			// Expand rows by slot and DayOfWeek, mapping them by index
			const expanded = [];
			const validationErrors = [];
			rows.forEach((r) => {
				const slots = splitSlots(r.slotCell);
				const dayOfWeeks = splitDayOfWeek(r.dayOfWeekCell);

				// If both have values, validate they have the same length
				if (slots.length > 0 && dayOfWeeks.length > 0) {
					if (slots.length !== dayOfWeeks.length) {
						validationErrors.push(
							`Row ${r._row}: Slot has ${slots.length} values but DayOfWeek has ${dayOfWeeks.length} values. Please ensure they have the same count.`
						);
						// Still expand but warn user
						const maxLength = Math.max(slots.length, dayOfWeeks.length);
						for (let i = 0; i < maxLength; i++) {
							expanded.push({
								...r,
								slot: slots[i] ?? slots[slots.length - 1], // Use last slot if index exceeds
								dayOfWeek: dayOfWeeks[i] ?? dayOfWeeks[dayOfWeeks.length - 1], // Use last day if index exceeds
								_hasLengthMismatch: true, // Flag for warning
							});
						}
					} else {
						// Same length, map by index
						for (let i = 0; i < slots.length; i++) {
							expanded.push({
								...r,
								slot: slots[i],
								dayOfWeek: dayOfWeeks[i],
							});
						}
					}
				} else if (slots.length > 0) {
					// Only slots, no DayOfWeek
					slots.forEach((s) => expanded.push({ ...r, slot: s, dayOfWeek: null }));
				} else if (dayOfWeeks.length > 0) {
					// Only DayOfWeek, no slots
					dayOfWeeks.forEach((d) => expanded.push({ ...r, slot: null, dayOfWeek: d }));
				} else {
					// Neither
					expanded.push({ ...r, slot: null, dayOfWeek: null });
				}
			});

			// Show validation errors if any
			if (validationErrors.length > 0) {
				msg.warning(
					`Warning: ${validationErrors.length} row(s) have mismatched counts between Slot and DayOfWeek. Please review.`,
					5
				);
				console.warn('Validation errors:', validationErrors);
			}

			// Add keys and validate
			const withKeys = expanded.map((r, i) => ({
				key: `${i}-${r._row}`,
				...r,
			}));

			const withFlags = revalidateRows(withKeys);

			setPreviewRows(withFlags);
			msg.success(`Read ${rows.length} rows, expanded into ${withFlags.length} row(s).`);
		} catch (e) {
			console.error(e);
			msg.error('Failed to read the Excel file.');
		}
		return false; // Prevent default upload
	};

	const handleClear = () => {
		setRawRows([]);
		setPreviewRows([]);
	};

	const handleDeleteRow = (rowKey) => {
		const updatedRows = previewRows.filter((r) => r.key !== rowKey);
		// Revalidate remaining rows after deletion
		const revalidated = revalidateRows(updatedRows);
		setPreviewRows(revalidated);
	};

	const handleDownloadTemplate = async () => {
		try {
			// Fetch the template file from Assets folder
			const templatePath = require('./Assets/Template Schedule.xlsx');
			const response = await fetch(templatePath);
			const blob = await response.blob();

			// Create a download link
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = 'ScheduleImportTemplate.xlsx';
			document.body.appendChild(link);
			link.click();

			// Clean up
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);

			msg.success('Template downloaded successfully');
		} catch (e) {
			console.error(e);
			msg.error('Failed to download template. Please try again.');
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

		// Collapse rows into patterns per class and detect duplicates
		const payloads = Object.entries(byGroup).map(([groupKey, rows]) => {
			const [classIdStr, lecturerIdStr] = groupKey.split('|');
			const patterns = [];
			const patternSet = new Set(); // Track unique patterns
			const duplicatePatterns = [];

			rows.forEach((r) => {
				const patternKey = `${r.dayOfWeek}|${r.timeId}|${r.roomId}`;
				if (patternSet.has(patternKey)) {
					duplicatePatterns.push({
						weekday: r.dayOfWeek,
						timeId: r.timeId,
						roomId: r.roomId,
					});
				} else {
					patternSet.add(patternKey);
					patterns.push({
						weekday: r.dayOfWeek, // 2..8
						timeId: r.timeId,
						roomId: r.roomId,
					});
				}
			});

			return {
				classId: Number(classIdStr),
				semesterId: semesterIdNum,
				lecturerId: Number(lecturerIdStr),
				patterns,
				duplicatePatterns, // Store duplicates for warning
				_meta: {
					className: rows[0]?.className || `Class ${classIdStr}`,
					lecturerCode: rows[0]?.lecturer || '',
				},
			};
		});
		return payloads;
	};

	// Helper function to generate dates for a pattern in semester
	const generateDatesForPattern = (weekday, startDate, endDate) => {
		// weekday: 2=Mon, 3=Tue, ..., 7=Sat, 8=Sun
		// Convert to C# DayOfWeek: Mon=1, Tue=2, ..., Sat=6, Sun=0
		const targetDayOfWeek = weekday === 8 ? 0 : weekday - 1;

		const dates = [];
		const start = new Date(startDate);
		const end = new Date(endDate);

		// Find first occurrence of target weekday
		const startDayOfWeek = start.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
		let daysToAdd = targetDayOfWeek - startDayOfWeek;
		if (daysToAdd < 0) daysToAdd += 7;

		let currentDate = new Date(start);
		currentDate.setDate(start.getDate() + daysToAdd);

		// Generate all dates matching the weekday pattern
		while (currentDate <= end) {
			dates.push(new Date(currentDate));
			currentDate.setDate(currentDate.getDate() + 7); // Next week
		}

		return dates;
	};

	// Check conflicts with existing schedule in database
	const checkConflicts = async (payloads) => {
		const selectedSemester = semesters.find(
			(s) => Number(s.semesterId || s.id) === Number(selectedSemesterId)
		);
		if (!selectedSemester || !selectedSemester.startDate || !selectedSemester.endDate) {
			return { hasConflicts: false, conflicts: [] };
		}

		const conflicts = [];
		const startDate = new Date(selectedSemester.startDate);
		const endDate = new Date(selectedSemester.endDate);

		// Check each payload's patterns
		for (const payload of payloads) {
			for (const pattern of payload.patterns) {
				// Generate dates for this pattern
				const dates = generateDatesForPattern(pattern.weekday, startDate, endDate);

				// Check first few dates (sample check) to detect conflicts early
				// Limit to first 4 weeks to avoid too many API calls
				const sampleDates = dates.slice(0, 4);

				for (const date of sampleDates) {
					try {
						const dateStr = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
						const response = await api.post('/api/staffAcademic/classes/schedule/availability', {
							Date: dateStr,
							TimeId: pattern.timeId,
							ClassId: payload.classId,
							RoomId: pattern.roomId,
							LecturerId: payload.lecturerId,
						});

						const availability = response?.data?.data;
						if (availability) {
							if (availability.IsClassBusy || availability.IsRoomBusy || availability.IsLecturerBusy) {
								const conflictTypes = [];
								if (availability.IsClassBusy) conflictTypes.push('Class already has schedule');
								if (availability.IsRoomBusy) conflictTypes.push('Room is in use');
								if (availability.IsLecturerBusy) conflictTypes.push('Lecturer already has schedule');

								conflicts.push({
									className: payload._meta.className,
									date: dateStr,
									weekday: pattern.weekday,
									timeId: pattern.timeId,
									roomId: pattern.roomId,
									types: conflictTypes,
								});
							}
						}
					} catch (e) {
						console.warn('Error checking availability:', e);
						// Continue checking other dates even if one fails
					}
				}
			}
		}

		return {
			hasConflicts: conflicts.length > 0,
			conflicts,
		};
	};

	const handleSave = async () => {
		if (!selectedSemesterId) {
			msg.error('Please select Semester');
			return;
		}
		if (previewRows.length === 0) {
			msg.error('There is no data to save');
			return;
		}
		const invalid = previewRows.filter((r) => !r.validMapping);
		if (invalid.length > 0) {
			msg.error('Some rows have problem');
			return;
		}

		const payloads = buildPayloadsByClass();
		if (payloads.length === 0) {
			msg.warning('No valid Class to save');
			return;
		}

		// Check for duplicate patterns within same class+lecturer
		const duplicateWarnings = [];
		payloads.forEach((p) => {
			if (p.duplicatePatterns && p.duplicatePatterns.length > 0) {
				duplicateWarnings.push({
					className: p._meta.className,
					count: p.duplicatePatterns.length,
					patterns: p.duplicatePatterns,
				});
			}
		});

		if (duplicateWarnings.length > 0) {
			const warningMsg = duplicateWarnings
				.map((w) => `${w.className}: ${w.count} pattern(s) Duplicated`)
				.join('; ');
			msg.warning(`Warning: ${warningMsg}. Duplicate patterns will only be generated once`, 5);
		}

		// Check conflicts with existing schedule
		setSaving(true);
		msg.loading('Checking for conflicts with the existing schedule...', 0);
		const conflictCheck = await checkConflicts(payloads);
		msg.destroy(); // Remove loading message

		if (conflictCheck.hasConflicts) {
			const conflictDetails = conflictCheck.conflicts
				.map((c) => `${c.className} (${c.date}): ${c.types.join(', ')}`)
				.join('\n');
			msg.error(
				`Detected ${conflictCheck.conflicts.length} conflict(s) with the existing schedule:\n${conflictDetails}`,
				10
			);
			setSaving(false);
			return;
		}

		// Proceed with saving
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
		if (ok) msg.success(`Saved successfully for ${ok} class(es).`);
		if (fail)
			msg.warning(
				`${fail} class(es) failed to save. Please check for schedule/room/slot conflicts and try again.`
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
								onDeleteRow={handleDeleteRow}
								selectedSemesterId={selectedSemesterId}
								classesBySemester={classesBySemester}
								rooms={rooms}
								lecturers={lecturers}
								timeslots={timeslots}
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
