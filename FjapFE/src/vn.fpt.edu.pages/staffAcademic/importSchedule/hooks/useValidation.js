import { useMemo } from 'react';
import { normalizeString, getEmailPrefix } from '../utils/helpers';

export function useValidation({
	selectedSemesterId,
	classesBySemester,
	rooms,
	timeslots,
	lecturers,
}) {
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
		const map = {};
		// Timeslots are ordered by StartTime, so index + 1 represents slot number
		timeslots.forEach((t, idx) => {
			const slotNum = idx + 1; // Slot 1, 2, 3, ... based on order
			map[slotNum] = t.timeId;
		});
		return map;
	}, [timeslots]);

	const lecturerEmailPrefixToId = useMemo(() => {
		const map = {};
		lecturers.forEach((l) => {
			// Map from email prefix (part before @) to lecturerId
			if (l.emailPrefix) {
				map[normalizeString(l.emailPrefix)] = l.lecturerId;
			}
			// Also support mapping from lecturerCode for backward compatibility
			if (l.lecturerCode) {
				map[normalizeString(l.lecturerCode)] = l.lecturerId;
			}
		});
		return map;
	}, [lecturers]);

	// Function to re-validate and detect conflicts for all rows
	const revalidateRows = useMemo(() => {
		return (rows) => {
			// Debug: Log lookup data availability
			console.log('Validation - Lookup data:', {
				classesCount: Object.keys(classNameToId).length,
				roomsCount: Object.keys(roomNameToId).length,
				timeslotsCount: Object.keys(slotNumberToTimeId).length,
				lecturersCount: Object.keys(lecturerEmailPrefixToId).length,
				slotNumberToTimeIdMap: slotNumberToTimeId,
			});

			// Detect duplicates (full match: className + dayOfWeek + slot + roomName)
			const keyCount = {};
			rows.forEach((r) => {
				const key = [
					normalizeString(r.className),
					r.dayOfWeek,
					r.slot,
					normalizeString(r.roomName),
				].join('|');
				keyCount[key] = (keyCount[key] || 0) + 1;
			});

			// Detect conflicts: same DayOfWeek + Slot (regardless of class/room)
			const daySlotKeyCount = {};
			rows.forEach((r) => {
				// Only check if both dayOfWeek and slot are valid
				if (r.dayOfWeek != null && r.slot != null) {
					const daySlotKey = `${r.dayOfWeek}|${r.slot}`;
					daySlotKeyCount[daySlotKey] = (daySlotKeyCount[daySlotKey] || 0) + 1;
				}
			});

			// Re-validate each row
			return rows.map((r) => {
				const normalizedClassName = normalizeString(r.className);
				const normalizedRoomName = normalizeString(r.roomName);
				// Normalize lecturer: if it contains @, extract prefix; otherwise use as is
				const lecturerInput = normalizeString(r.lecturer);
				const normalizedLecturer = lecturerInput.includes('@')
					? getEmailPrefix(lecturerInput)
					: lecturerInput;

				const classId = classNameToId[normalizedClassName];
				const roomId = roomNameToId[normalizedRoomName];
				const timeId = r.slot != null ? slotNumberToTimeId[r.slot] : undefined;
				const lecturerId = lecturerEmailPrefixToId[normalizedLecturer];

				const duplicateInFile =
					keyCount[
					[
						normalizedClassName,
						r.dayOfWeek,
						r.slot,
						normalizedRoomName,
					].join('|')
					] > 1;

				// Check conflict: same DayOfWeek + Slot (regardless of class/room)
				const daySlotConflict = r.dayOfWeek != null && r.slot != null
					? daySlotKeyCount[`${r.dayOfWeek}|${r.slot}`] > 1
					: false;

				// Debug missing mappings
				const missingFields = [];
				if (!classId) missingFields.push(`Class: "${normalizedClassName}"`);
				if (!roomId) missingFields.push(`Room: "${normalizedRoomName}"`);
				if (!timeId && r.slot != null) missingFields.push(`Slot: ${r.slot}`);
				if (!r.dayOfWeek) missingFields.push(`DayOfWeek: ${r.dayOfWeek}`);
				if (!lecturerId) missingFields.push(`Lecturer: "${normalizedLecturer}"`);

				if (missingFields.length > 0) {
					console.log(`Row missing mappings: ${missingFields.join(', ')}`);
				}

				// validMapping: all fields valid AND no conflicts
				const hasValidFields =
					Boolean(classId) &&
					Boolean(roomId) &&
					Boolean(timeId) &&
					Boolean(r.dayOfWeek) &&
					Boolean(lecturerId);

				return {
					...r,
					classId,
					roomId,
					timeId,
					lecturerId,
					validMapping: hasValidFields && !daySlotConflict && !duplicateInFile,
					duplicateInFile,
					daySlotConflict, // Conflict when same DayOfWeek + Slot
				};
			});
		};
	}, [classNameToId, roomNameToId, slotNumberToTimeId, lecturerEmailPrefixToId]);

	return {
		classNameToId,
		roomNameToId,
		slotNumberToTimeId,
		lecturerEmailPrefixToId,
		revalidateRows,
	};
}

